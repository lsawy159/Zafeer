import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { Resend } from 'https://esm.sh/resend@4.0.0'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// FK-ordered for safe restore (INSERT forward, DELETE reverse)
const TABLES_TO_EXPORT = [
  'users',
  'system_settings',
  'companies',
  'projects',
  'employees',
  'employee_leaves',
  'project_job_title_rates',
  'saved_searches',
  'notifications',
  'read_alerts',
  'snoozed_alerts',
  'employee_obligation_headers',
  'employee_obligation_lines',
  'transfer_procedures',
  'payroll_runs',
  'payroll_entries',
  'payroll_entry_project_allocations',
  'payroll_entry_components',
  'payroll_slips',
  'extract_invoices',
  'extract_invoice_lines',
] as const

const BUCKET = 'backups'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// JWT decode without verification — Supabase Edge Runtime validates JWT before reaching here
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

async function gzipString(input: string): Promise<Uint8Array> {
  const stream = new Blob([new TextEncoder().encode(input)])
    .stream()
    .pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function formatDateUTC(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i]
}

function buildScheduledEmailHtml(date: string, fileSize: number, signedUrl: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>نسخة احتياطية تلقائية — زفير</title></head>
<body style="font-family:Tahoma,Arial,sans-serif;direction:rtl;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:32px;">
    <h2 style="color:#111827;margin:0 0 8px;">نسخة احتياطية تلقائية — زفير</h2>
    <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">اكتملت النسخة الاحتياطية المجدولة بنجاح.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:10px 0;color:#6b7280;width:40%;">التاريخ</td>
        <td style="padding:10px 0;color:#111827;font-weight:500;">${date}</td>
      </tr>
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:10px 0;color:#6b7280;">النوع</td>
        <td style="padding:10px 0;color:#111827;font-weight:500;">نسخة تلقائية</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#6b7280;">الحجم</td>
        <td style="padding:10px 0;color:#111827;font-weight:500;">${formatBytes(fileSize)}</td>
      </tr>
    </table>
    <a href="${signedUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;margin-bottom:16px;">
      تحميل ملف النسخة (JSON)
    </a>
    <p style="color:#dc2626;font-size:13px;margin:8px 0 0;">⚠️ هذا الرابط صالح لمدة 7 أيام فقط.</p>
  </div>
</body>
</html>`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Server misconfigured: missing env vars' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  const userId = extractUserIdFromJwt(authHeader)

  let backupType = 'full'
  let skipLock = false
  try {
    const body = await req.json().catch(() => ({}))
    if (body && typeof body.backup_type === 'string') backupType = body.backup_type
    if (body && typeof body.skip_lock === 'boolean') skipLock = body.skip_lock
  } catch { /* ignore */ }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Admin check: only admin role can trigger backup
  if (userId) {
    const { data: userRow, error: userErr } = await admin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (userErr || !userRow || userRow.role !== 'admin') {
      return jsonResponse({ error: 'Forbidden: admin role required' }, 403)
    }
  }
  // No userId = scheduled trigger (pg_cron/system) — allow through

  // Advisory lock: prevent concurrent backup/restore (skip when called internally from restore-backup)
  let lockAcquired = false
  if (!skipLock) {
    const { data: locked, error: lockErr } = await admin.rpc('try_backup_lock')
    if (lockErr) {
      return jsonResponse({ error: 'Failed to acquire backup lock', details: lockErr.message }, 500)
    }
    if (!locked) {
      return jsonResponse({ error: 'عملية نسخ أو استعادة جارية' }, 409)
    }
    lockAcquired = true
  }

  // Insert in_progress record first
  const { data: historyRow, error: insertError } = await admin
    .from('backup_history')
    .insert({
      backup_type: backupType,
      triggered_by: userId,
      status: 'in_progress',
      tables_included: [...TABLES_TO_EXPORT],
    })
    .select()
    .single()

  if (insertError || !historyRow) {
    if (lockAcquired) await admin.rpc('release_backup_lock')
    return jsonResponse(
      { error: 'Failed to create backup record', details: insertError?.message },
      500,
    )
  }

  const backupId: string = historyRow.id

  try {
    // Export all tables and track record counts
    const dump: Record<string, unknown[]> = {}
    const tableRecordCounts: Record<string, number> = {}

    for (const table of TABLES_TO_EXPORT) {
      const { data, error } = await admin.from(table).select('*')
      if (error) throw new Error(`Export failed for ${table}: ${error.message}`)
      dump[table] = data ?? []
      tableRecordCounts[table] = dump[table].length
    }

    const rawJson = JSON.stringify({
      version: 2,
      created_at: new Date().toISOString(),
      backup_type: backupType,
      triggered_by: userId,
      table_record_counts: tableRecordCounts,
      tables: dump,
    })

    const rawSize = new TextEncoder().encode(rawJson).byteLength
    const gzipped = await gzipString(rawJson)
    const gzSize = gzipped.byteLength
    const ratio = rawSize > 0 ? gzSize / rawSize : null

    const filePath = `backups/${backupId}.json.gz`

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(filePath, gzipped, { contentType: 'application/gzip', upsert: false })

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

    const { data: updated, error: updateError } = await admin
      .from('backup_history')
      .update({
        status: 'completed',
        file_path: filePath,
        file_size: gzSize,
        compression_ratio: ratio,
        completed_at: new Date().toISOString(),
        table_record_counts: tableRecordCounts,
      })
      .eq('id', backupId)
      .select()
      .single()

    if (updateError) throw new Error(`Failed to finalize backup record: ${updateError.message}`)

    // Auto-email notification for scheduled backups
    if (backupType === 'scheduled') {
      try {
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
        const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev'

        if (RESEND_API_KEY) {
          const { data: settingsRows } = await admin
            .from('system_settings')
            .select('setting_key, setting_value')
            .in('setting_key', ['backup_email_notifications_enabled', 'backup_email_recipients'])

          const sm: Record<string, unknown> = {}
          for (const row of settingsRows ?? []) sm[row.setting_key] = row.setting_value

          const notifyEnabled =
            sm['backup_email_notifications_enabled'] === true ||
            sm['backup_email_notifications_enabled'] === 'true'

          if (notifyEnabled) {
            const raw = sm['backup_email_recipients']
            let recipients: string[] = []
            if (Array.isArray(raw)) {
              recipients = raw.filter((r): r is string => typeof r === 'string' && EMAIL_REGEX.test(r))
            } else if (typeof raw === 'string') {
              try {
                const parsed = JSON.parse(raw)
                if (Array.isArray(parsed)) {
                  recipients = parsed.filter((r): r is string => typeof r === 'string' && EMAIL_REGEX.test(r))
                }
              } catch { /* malformed JSON */ }
            }

            if (recipients.length > 0) {
              const { data: signedData } = await admin.storage
                .from(BUCKET)
                .createSignedUrl(filePath, 604800) // 7 days

              const signedUrl = signedData?.signedUrl ?? ''
              const date = formatDateUTC(new Date().toISOString())
              const html = buildScheduledEmailHtml(date, gzSize, signedUrl)
              const resend = new Resend(RESEND_API_KEY)

              await Promise.allSettled(
                recipients.map((to) =>
                  resend.emails.send({
                    from: FROM_EMAIL,
                    to,
                    subject: `نسخة احتياطية تلقائية — زفير | ${date}`,
                    html,
                  }),
                ),
              )
            }
          }
        }
      } catch { /* email failure must NOT mark backup as failed */ }
    }

    return jsonResponse({ success: true, backup: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await admin
      .from('backup_history')
      .update({ status: 'failed', error_message: message, completed_at: new Date().toISOString() })
      .eq('id', backupId)
    return jsonResponse({ success: false, error: message, backup_id: backupId }, 500)
  } finally {
    if (lockAcquired) await admin.rpc('release_backup_lock')
  }
})
