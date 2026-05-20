import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TABLES_TO_EXPORT = [
  'employees',
  'companies',
  'projects',
  'transfer_procedures',
  'employee_obligation_headers',
  'employee_obligation_lines',
  'payroll_runs',
  'payroll_entries',
  'payroll_entry_components',
  'payroll_slips',
  'notifications',
  'saved_searches',
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

  const userId = extractUserIdFromJwt(req.headers.get('Authorization'))

  let backupType = 'full'
  try {
    const body = await req.json().catch(() => ({}))
    if (body && typeof body.backup_type === 'string') backupType = body.backup_type
  } catch { /* ignore */ }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

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
    return jsonResponse(
      { error: 'Failed to create backup record', details: insertError?.message },
      500,
    )
  }

  const backupId: string = historyRow.id

  try {
    // Export all tables
    const dump: Record<string, unknown[]> = {}
    for (const table of TABLES_TO_EXPORT) {
      const { data, error } = await admin.from(table).select('*')
      if (error) throw new Error(`Export failed for ${table}: ${error.message}`)
      dump[table] = data ?? []
    }

    const rawJson = JSON.stringify({
      version: 1,
      created_at: new Date().toISOString(),
      backup_type: backupType,
      triggered_by: userId,
      tables: dump,
    })

    const rawSize = new TextEncoder().encode(rawJson).byteLength
    const gzipped = await gzipString(rawJson)
    const gzSize = gzipped.byteLength
    const ratio = rawSize > 0 ? gzSize / rawSize : null

    const now = new Date()
    const filePath = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${backupId}.json.gz`

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
      })
      .eq('id', backupId)
      .select()
      .single()

    if (updateError) throw new Error(`Failed to finalize backup record: ${updateError.message}`)

    return jsonResponse({ success: true, backup: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await admin
      .from('backup_history')
      .update({ status: 'failed', error_message: message, completed_at: new Date().toISOString() })
      .eq('id', backupId)
    return jsonResponse({ success: false, error: message, backup_id: backupId }, 500)
  }
})
