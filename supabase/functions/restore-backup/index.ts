import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const BUCKET = 'backups'
const CHUNK_SIZE = 500
const MAX_PRE_RESTORE_SNAPSHOTS = 10

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

function classifyError(err: unknown): { type: string; message_ar: string } {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('ECONNRESET'))
    return { type: 'network', message_ar: 'انقطع الاتصال أثناء الاستعادة. تحقق من الإنترنت وحاول مجدداً.' }
  if (msg.includes('timeout') || msg.includes('57014'))
    return { type: 'timeout', message_ar: 'استغرقت العملية وقتاً أطول من المتوقع. البيانات كبيرة الحجم.' }
  if (msg.includes('parse') || msg.includes('JSON') || msg.includes('invalid'))
    return { type: 'corrupt_file', message_ar: 'ملف النسخة الاحتياطية تالف أو غير مكتمل. اختر نسخة أخرى.' }
  if (msg.includes('column') || msg.includes('schema') || msg.includes('42703'))
    return { type: 'schema_mismatch', message_ar: 'بنية قاعدة البيانات تغيّرت منذ إنشاء هذه النسخة.' }
  if (msg.includes('storage') || msg.includes('quota') || msg.includes('space'))
    return { type: 'storage_full', message_ar: 'مساحة التخزين ممتلئة. لم يُنشأ الـ snapshot الوقائي — أُلغيت الاستعادة.' }
  if (msg.includes('permission') || msg.includes('UNAUTHORIZED') || msg.includes('42501'))
    return { type: 'unauthorized', message_ar: 'لا تملك صلاحية الاستعادة. تواصل مع مسؤول النظام.' }
  if (msg.includes('foreign key') || msg.includes('23503') || msg.includes('PREFLIGHT_FK'))
    return { type: 'data_conflict', message_ar: 'بيانات النسخة غير متوافقة مع النظام الحالي (تعارض في مراجع البيانات). تم إلغاء الاستعادة — البيانات لم تتغير.' }
  if (msg.includes('ADMIN_NOT_IN_BACKUP'))
    return { type: 'admin_not_in_backup', message_ar: 'حسابك غير موجود في هذه النسخة. اختر نسخة أحدث من تاريخ إنشاء حسابك.' }
  if (msg.includes('INCOMPLETE_CHUNKS'))
    return { type: 'upload_incomplete', message_ar: 'فشل رفع بيانات النسخة بالكامل. تحقق من الاتصال وحاول مجدداً.' }
  if (msg.includes('missing_staging') || msg.includes('RESTORE_STAGING_NOT_FOUND'))
    return { type: 'missing_staging', message_ar: 'لم يتم العثور على بيانات staging لهذه الاستعادة.' }
  if (msg.includes('invalid_restore_history') || msg.includes('RESTORE_HISTORY_NOT_FOUND'))
    return { type: 'invalid_restore_history', message_ar: 'سجل الاستعادة مفقود.' }
  if (msg.includes('restore_failed'))
    return { type: 'restore_failed', message_ar: 'فشلت عملية الاستعادة داخل القاعدة. راجع سجل الحالة.' }
  if (msg.includes('CONCURRENT_OPERATION') || msg.includes('55P03'))
    return { type: 'concurrent_op', message_ar: 'عملية نسخ أو استعادة أخرى جارية. انتظر انتهاءها وحاول مجدداً.' }
  if (msg.includes('unauthorized') || msg.includes('AUTH_REQUIRED') || msg.includes('ADMIN_ROLE_REQUIRED'))
    return { type: 'unauthorized', message_ar: 'لا تملك صلاحية الاستعادة.' }
  return { type: 'unexpected', message_ar: `حدث خطأ غير متوقع في النظام. الكود: ${msg.slice(0, 80)}` }
}

async function gzipString(input: string): Promise<Uint8Array> {
  const stream = new Blob([new TextEncoder().encode(input)])
    .stream()
    .pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

// Inline snapshot creation — does NOT acquire advisory lock (called from within restore context)
async function createSnapshot(
  admin: ReturnType<typeof createClient>,
  triggeredBy: string,
): Promise<{ snapshotId: string; filePath: string }> {
  const { data: snapRow, error: snapInsertErr } = await admin
    .from('backup_history')
    .insert({
      backup_type: 'pre-restore-snapshot',
      triggered_by: triggeredBy,
      status: 'in_progress',
      tables_included: [...TABLES_TO_EXPORT],
    })
    .select('id')
    .single()

  if (snapInsertErr || !snapRow) {
    throw new Error(`Failed to create snapshot record: ${snapInsertErr?.message}`)
  }

  const snapshotId: string = snapRow.id
  const dump: Record<string, unknown[]> = {}
  const tableRecordCounts: Record<string, number> = {}

  for (const table of TABLES_TO_EXPORT) {
    const { data, error } = await admin.from(table).select('*')
    if (error) throw new Error(`Snapshot export failed for ${table}: ${error.message}`)
    dump[table] = data ?? []
    tableRecordCounts[table] = dump[table].length
  }

  const rawJson = JSON.stringify({
    version: 2,
    created_at: new Date().toISOString(),
    backup_type: 'pre-restore-snapshot',
    triggered_by: triggeredBy,
    table_record_counts: tableRecordCounts,
    tables: dump,
  })

  const gzipped = await gzipString(rawJson)
  const gzSize = gzipped.byteLength
  const ratio = new TextEncoder().encode(rawJson).byteLength > 0
    ? gzSize / new TextEncoder().encode(rawJson).byteLength
    : null

  const filePath = `backups/${snapshotId}.json.gz`

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(filePath, gzipped, { contentType: 'application/gzip', upsert: false })

  if (uploadError) throw new Error(`Snapshot upload failed: ${uploadError.message}`)

  await admin
    .from('backup_history')
    .update({
      status: 'completed',
      file_path: filePath,
      file_size: gzSize,
      compression_ratio: ratio,
      completed_at: new Date().toISOString(),
      table_record_counts: tableRecordCounts,
    })
    .eq('id', snapshotId)

  return { snapshotId, filePath }
}

// Keep only MAX_PRE_RESTORE_SNAPSHOTS, deleting oldest excess ones (Storage + DB)
async function pruneOldSnapshots(admin: ReturnType<typeof createClient>): Promise<void> {
  const { data: snapshots, error } = await admin
    .from('backup_history')
    .select('id, file_path')
    .eq('backup_type', 'pre-restore-snapshot')
    .order('started_at', { ascending: true })

  if (error || !snapshots || snapshots.length <= MAX_PRE_RESTORE_SNAPSHOTS) return

  const toDelete = snapshots.slice(0, snapshots.length - MAX_PRE_RESTORE_SNAPSHOTS)
  const storagePaths = toDelete
    .map((s: { file_path: string | null }) => s.file_path)
    .filter((p: string | null): p is string => Boolean(p))

  if (storagePaths.length > 0) {
    await admin.storage.from(BUCKET).remove(storagePaths)
  }

  const ids = toDelete.map((s: { id: string }) => s.id)
  await admin.from('backup_history').delete().in('id', ids)
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
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
    return jsonResponse({ error: 'Server misconfigured: missing env vars' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  const userId = extractUserIdFromJwt(authHeader)
  if (!userId) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  let backup_id: string
  let confirm_date: string
  let confirm_word: string
  try {
    const body = await req.json()
    backup_id = body.backup_id
    confirm_date = body.confirm_date
    confirm_word = body.confirm_word
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400)
  }

  if (!backup_id || !confirm_date || !confirm_word) {
    return jsonResponse({ error: 'Missing required fields' }, 400)
  }

  // Verify confirmation word
  if (confirm_word !== 'استعادة') {
    return jsonResponse({ error: 'كلمة التأكيد غير صحيحة' }, 400)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader! } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Admin check
  const { data: userRow, error: userErr } = await admin
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (userErr || !userRow || userRow.role !== 'admin') {
    return jsonResponse({ error: 'Forbidden: admin role required' }, 403)
  }

  // Fetch backup record
  const { data: backup, error: backupErr } = await admin
    .from('backup_history')
    .select('id, started_at, file_path, status')
    .eq('id', backup_id)
    .single()

  if (backupErr || !backup) {
    return jsonResponse({ error: 'النسخة الاحتياطية غير موجودة' }, 404)
  }

  if (backup.status !== 'completed') {
    return jsonResponse({ error: 'النسخة الاحتياطية غير مكتملة' }, 400)
  }

  if (!backup.file_path) {
    return jsonResponse({ error: 'مسار ملف النسخة غير موجود' }, 400)
  }

  // Verify confirm_date matches backup date (dd/MM/yyyy format)
  const backupDate = new Date(backup.started_at)
  const day = String(backupDate.getUTCDate()).padStart(2, '0')
  const month = String(backupDate.getUTCMonth() + 1).padStart(2, '0')
  const year = backupDate.getUTCFullYear()
  const expectedDate = `${day}/${month}/${year}`

  if (confirm_date !== expectedDate) {
    return jsonResponse({
      error: `تاريخ التأكيد غير صحيح. التاريخ المتوقع: ${expectedDate}`,
    }, 400)
  }

  // Create restore_history record
  const { data: restoreRow, error: restoreInsertErr } = await admin
    .from('restore_history')
    .insert({
      backup_id,
      executed_by: userId,
      status: 'creating_snapshot',
    })
    .select('id')
    .single()

  if (restoreInsertErr || !restoreRow) {
    return jsonResponse({ error: 'Failed to create restore record' }, 500)
  }

  const restoreId: string = restoreRow.id
  let lockAcquired = false

  const updateStatus = (status: string, extra: Record<string, unknown> = {}) =>
    admin.from('restore_history').update({ status, ...extra }).eq('id', restoreId)

  const stopMaintenance = () =>
    admin.from('system_settings').upsert(
      { setting_key: 'maintenance_mode', setting_value: { enabled: false }, maintenance_until: null },
      { onConflict: 'setting_key' },
    )

  // Activate maintenance_mode immediately with 15-minute expiry
  await admin.from('system_settings').upsert(
    {
      setting_key: 'maintenance_mode',
      setting_value: { enabled: true, started_at: new Date().toISOString(), executor_id: userId },
      maintenance_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    },
    { onConflict: 'setting_key' },
  )

  let snapshotId: string | undefined
  let sessionId: string | undefined

  try {
    const { data: locked, error: lockErr } = await userClient.rpc('try_backup_lock')
    if (lockErr) {
      throw new Error(`Failed to acquire restore lock: ${lockErr.message}`)
    }
    if (!locked) {
      await updateStatus('failed', {
        completed_at: new Date().toISOString(),
        error_message: 'CONCURRENT_OPERATION',
      })
      return jsonResponse({
        success: false,
        restore_id: restoreId,
        error_type: 'concurrent_op',
        error_message_ar: 'عملية استعادة أخرى جارية. انتظر انتهائها وحاول مجدداً.',
      }, 409)
    }
    lockAcquired = true
    // Create pre-restore snapshot (inline — no HTTP call to avoid advisory lock conflict)
    const snapshot = await createSnapshot(admin, userId)
    snapshotId = snapshot.snapshotId

    await admin
      .from('restore_history')
      .update({ snapshot_id: snapshotId, status: 'reading_file' })
      .eq('id', restoreId)

    // Prune excess snapshots AFTER new one created (keep last 10)
    await pruneOldSnapshots(admin)

    // Read backup file from Storage
    const { data: signedUrlData, error: signedUrlErr } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(backup.file_path, 3600)

    if (signedUrlErr || !signedUrlData?.signedUrl) {
      throw new Error(`Failed to create signed URL: ${signedUrlErr?.message}`)
    }

    const fileResponse = await fetch(signedUrlData.signedUrl)
    if (!fileResponse.ok) throw new Error(`Failed to fetch backup file: ${fileResponse.status}`)
    if (!fileResponse.body) throw new Error('Backup file response has no body')

    const decompressed = fileResponse.body.pipeThrough(new DecompressionStream('gzip'))
    const archive = await new Response(decompressed).json()

    if (!archive?.tables || typeof archive.tables !== 'object') {
      throw new Error('invalid backup archive format')
    }

    // Stage data
    await updateStatus('staging_data')
    sessionId = crypto.randomUUID()

    const stagingRows: Array<{
      session_id: string
      table_name: string
      data: unknown[]
      chunk_index: number
      chunk_total: number
    }> = []

    for (const table of TABLES_TO_EXPORT) {
      const rows: unknown[] = Array.isArray(archive.tables[table]) ? archive.tables[table] : []
      const chunkTotal = Math.max(1, Math.ceil(rows.length / CHUNK_SIZE))
      for (let i = 0; i < chunkTotal; i++) {
        stagingRows.push({
          session_id: sessionId,
          table_name: table,
          data: rows.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
          chunk_index: i,
          chunk_total: chunkTotal,
        })
      }
    }

    // Insert staging rows in batches of 5
    const BATCH_SIZE = 5
    for (let i = 0; i < stagingRows.length; i += BATCH_SIZE) {
      const batch = stagingRows.slice(i, i + BATCH_SIZE)
      const { error: stageErr } = await admin.from('restore_staging').insert(batch)
      if (stageErr) throw new Error(`Staging insert failed: ${stageErr.message}`)
    }

    // Execute restore using USER JWT client (auth.uid() must return userId inside RPC)
    await updateStatus('restoring_data')
    const { data: rpcData, error: rpcErr } = await userClient.rpc('admin_restore_backup', {
      p_session_id: sessionId,
      p_restore_history_id: restoreId,
    })

    if (rpcErr) throw new Error(rpcErr.message)
    if (!rpcData?.success) {
      throw new Error(
        `${rpcData?.error_type ?? 'restore_failed'}: ${rpcData?.error_message ?? 'RESTORE_FAILED'}`,
      )
    }

    // Success
    await stopMaintenance()
    await admin
      .from('restore_history')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        tables_restored: rpcData?.tables_restored ?? TABLES_TO_EXPORT.length,
        records_restored: rpcData?.records_restored ?? null,
      })
      .eq('id', restoreId)

    return jsonResponse({ success: true, restore_id: restoreId, snapshot_id: snapshotId })
  } catch (err) {
    const { type, message_ar } = classifyError(err)

    await stopMaintenance()
    await admin
      .from('restore_history')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: err instanceof Error ? err.message : String(err),
      })
      .eq('id', restoreId)

    return jsonResponse({
      success: false,
      restore_id: restoreId,
      snapshot_id: snapshotId,
      error_type: type,
      error_message_ar: message_ar,
    }, 500)
  } finally {
    // Always clean up staging data
    if (sessionId) {
      await admin.from('restore_staging').delete().eq('session_id', sessionId)
    }
    if (lockAcquired) {
      await userClient.rpc('release_backup_lock')
    }
  }
})
