import type { BackupRecord } from '@/lib/backupService'
import { supabase } from '@/lib/supabase'

const BOM = '﻿'

function buildCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return BOM
  const headers = Object.keys(rows[0])
  const escape = (val: unknown): string => {
    if (val == null) return ''
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"'
    }
    return str
  }
  const header = BOM + headers.join(',')
  const body = rows.map(row => headers.map(h => escape(row[h])).join(','))
  return [header, ...body].join('\r\n')
}

export async function downloadBackupAsCsv(backup: BackupRecord): Promise<void> {
  if (!backup.file_path) throw new Error('مسار ملف النسخة غير موجود')

  // Get signed URL
  const { data: signedData, error: signedErr } = await supabase.storage
    .from('backups')
    .createSignedUrl(backup.file_path, 3600)

  if (signedErr || !signedData?.signedUrl) {
    throw new Error('فشل الحصول على رابط ملف النسخة')
  }

  // Fetch and decompress
  const response = await fetch(signedData.signedUrl)
  if (!response.ok) throw new Error(`فشل تحميل ملف النسخة: ${response.status}`)
  if (!response.body) throw new Error('الملف فارغ')

  const decompressed = response.body.pipeThrough(new DecompressionStream('gzip'))
  const archive = await new Response(decompressed).json() as {
    tables?: Record<string, Record<string, unknown>[]>
  }

  if (!archive?.tables) throw new Error('تنسيق ملف النسخة غير صحيح')

  // Dynamic import JSZip to avoid bundle bloat
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()

  for (const [tableName, rows] of Object.entries(archive.tables)) {
    const csv = buildCsv(rows as Record<string, unknown>[])
    zip.file(`${tableName}.csv`, csv)
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `backup-${backup.id}-csv.zip`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
