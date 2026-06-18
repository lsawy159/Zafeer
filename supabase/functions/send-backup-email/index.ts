import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import JSZip from 'https://esm.sh/jszip@3.10.1'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_ZIP_BYTES = 25 * 1024 * 1024 // 25MB raw

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function extractUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = payload.length % 4
    if (pad) payload += '='.repeat(4 - pad)
    const decoded = JSON.parse(atob(payload))
    return typeof decoded.sub === 'string' ? decoded.sub : null
  } catch {
    return null
  }
}

async function gunzipBytes(compressed: Uint8Array): Promise<string> {
  const ds = new DecompressionStream('gzip')
  const writer = ds.writable.getWriter()
  const reader = ds.readable.getReader()
  writer.write(compressed)
  writer.close()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const total = chunks.reduce((acc, c) => acc + c.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return new TextDecoder().decode(out)
}

function arrayToCsv(rows: Record<string, unknown>[]): string {
  if (!rows || rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  // UTF-8 BOM for Arabic Excel support
  const BOM = '﻿'
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }
  const lines = [
    headers.map(escape).join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ]
  return BOM + lines.join('\r\n')
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i]
}

function backupTypeAr(type: string): string {
  switch (type) {
    case 'full': return 'نسخة كاملة (يدوي)'
    case 'scheduled': return 'نسخة تلقائية'
    case 'pre-restore-snapshot': return 'Snapshot وقائي'
    default: return type
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev'

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Server misconfigured: missing Supabase env vars' }, 500)
  }
  if (!RESEND_API_KEY) {
    return jsonResponse({ error: 'Server misconfigured: missing RESEND_API_KEY' }, 500)
  }

  // Auth
  const authHeader = req.headers.get('Authorization')
  const userId = extractUserIdFromJwt(authHeader)
  if (!userId) return jsonResponse({ error: 'غير مصرح' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verify admin role
  const { data: userRow, error: userErr } = await admin
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (userErr || !userRow || userRow.role !== 'admin') {
    return jsonResponse({ error: 'صلاحية المدير مطلوبة' }, 403)
  }

  // Parse + validate body
  let body: { backup_id?: unknown; recipient_email?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'بيانات غير صالحة: JSON غير قابل للقراءة' }, 400)
  }

  const { backup_id, recipient_email } = body

  if (typeof backup_id !== 'string' || !UUID_REGEX.test(backup_id)) {
    return jsonResponse({ error: 'بيانات غير صالحة: backup_id يجب أن يكون UUID صحيح' }, 400)
  }
  if (typeof recipient_email !== 'string' || !EMAIL_REGEX.test(recipient_email)) {
    return jsonResponse({ error: 'بيانات غير صالحة: البريد الإلكتروني غير صالح' }, 400)
  }

  // Fetch backup record
  const { data: backup, error: backupErr } = await admin
    .from('backup_history')
    .select('id, file_path, file_size, backup_type, completed_at, status')
    .eq('id', backup_id)
    .single()

  if (backupErr || !backup) {
    return jsonResponse({ error: 'النسخة الاحتياطية غير موجودة أو لم تكتمل بعد' }, 404)
  }
  if (backup.status !== 'completed') {
    return jsonResponse({ error: 'النسخة الاحتياطية غير موجودة أو لم تكتمل بعد' }, 404)
  }

  // Generate Signed URL for JSON.gz (24h)
  const { data: signedData, error: signedErr } = await admin.storage
    .from('backups')
    .createSignedUrl(backup.file_path, 86400)

  if (signedErr || !signedData?.signedUrl) {
    return jsonResponse({ error: 'فشل إنشاء رابط التحميل: ' + (signedErr?.message ?? 'unknown') }, 500)
  }
  const signedUrl = signedData.signedUrl

  // Download + decompress backup file
  const { data: fileData, error: fileErr } = await admin.storage
    .from('backups')
    .download(backup.file_path)

  if (fileErr || !fileData) {
    return jsonResponse({ error: 'فشل تحميل ملف النسخة: ' + (fileErr?.message ?? 'unknown') }, 500)
  }

  let backupJson: { tables?: Record<string, Record<string, unknown>[]> }
  try {
    const compressed = new Uint8Array(await fileData.arrayBuffer())
    const jsonStr = await gunzipBytes(compressed)
    backupJson = JSON.parse(jsonStr)
  } catch (err) {
    return jsonResponse({ error: 'فشل قراءة ملف النسخة: ' + String(err) }, 500)
  }

  // Generate CSV ZIP (in-memory only — NOT uploaded to Storage)
  // CSV is for human reading: exclude soft-deleted rows (is_deleted=true)
  const SOFT_DELETE_TABLES = new Set(['employees', 'projects'])
  const zip = new JSZip()
  const tables = backupJson.tables ?? {}
  for (const [tableName, rows] of Object.entries(tables)) {
    let filtered = rows as Record<string, unknown>[]
    if (SOFT_DELETE_TABLES.has(tableName)) {
      filtered = filtered.filter((row) => !row.is_deleted)
    }
    const csv = arrayToCsv(filtered)
    zip.file(`${tableName}.csv`, csv)
  }

  const zipBuffer = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })

  if (zipBuffer.byteLength > MAX_ZIP_BYTES) {
    return jsonResponse({
      error: 'حجم الملف كبير جداً للإرسال كمرفق، حاول تحميله يدوياً',
    }, 413)
  }

  // Build email
  const backupDate = backup.completed_at ? formatDate(backup.completed_at) : '—'
  const backupIdShort = backup_id.slice(0, 8)
  const zipFilename = `backup-${backupDate.replace(/\//g, '-')}-${backupIdShort}.zip`
  let zipBinary = ''
  const chunkSize = 8192
  for (let i = 0; i < zipBuffer.length; i += chunkSize) {
    zipBinary += String.fromCharCode(...zipBuffer.subarray(i, i + chunkSize))
  }
  const zipBase64 = btoa(zipBinary)

  const htmlBody = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>نسخة احتياطية — زفير</title>
</head>
<body style="font-family: Tahoma, Arial, sans-serif; direction: rtl; background: #f9fafb; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 32px;">
    <h2 style="color: #111827; margin: 0 0 8px;">نسخة احتياطية — زفير</h2>
    <p style="color: #6b7280; margin: 0 0 24px; font-size: 14px;">تم إرسال هذا البريد تلقائياً من نظام زفير.</p>

    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px 0; color: #6b7280; width: 40%;">التاريخ</td>
        <td style="padding: 10px 0; color: #111827; font-weight: 500;">${backupDate}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px 0; color: #6b7280;">النوع</td>
        <td style="padding: 10px 0; color: #111827; font-weight: 500;">${backupTypeAr(backup.backup_type)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; color: #6b7280;">الحجم</td>
        <td style="padding: 10px 0; color: #111827; font-weight: 500;">${formatBytes(backup.file_size)}</td>
      </tr>
    </table>

    <a href="${signedUrl}"
       style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none;
              padding: 12px 24px; border-radius: 8px; font-size: 15px; font-weight: 600; margin-bottom: 16px;">
      تحميل ملف النسخة (JSON)
    </a>

    <p style="color: #dc2626; font-size: 13px; margin: 0 0 24px;">
      ⚠️ هذا الرابط صالح لمدة 24 ساعة فقط.
    </p>

    <p style="color: #6b7280; font-size: 13px; margin: 0;">
      يحتوي هذا البريد أيضاً على مرفق ZIP يضم جميع جداول النسخة بصيغة CSV.
    </p>
  </div>
</body>
</html>`

  const resend = new Resend(RESEND_API_KEY)

  const { error: sendErr } = await resend.emails.send({
    from: FROM_EMAIL,
    to: recipient_email,
    subject: `نسخة احتياطية — زفير | ${backupDate}`,
    html: htmlBody,
    attachments: [
      {
        filename: zipFilename,
        content: zipBase64,
      },
    ],
  })

  if (sendErr) {
    return jsonResponse({ error: 'فشل إرسال البريد: ' + String((sendErr as { message?: string }).message ?? sendErr) }, 500)
  }

  return jsonResponse({ success: true, message: 'تم إرسال النسخة الاحتياطية بنجاح' })
})
