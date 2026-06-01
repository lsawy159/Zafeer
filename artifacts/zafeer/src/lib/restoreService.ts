import { supabase } from '@/lib/supabase'

export interface RestoreResult {
  success: boolean
  restore_id?: string
  snapshot_id?: string
  error_type?: string
  error_message_ar?: string
}

export interface RestoreHistoryRecord {
  id: string
  backup_id: string
  executed_by: string
  snapshot_id: string | null
  status: 'pending' | 'creating_snapshot' | 'reading_file' | 'staging_data' | 'restoring_data' | 'completed' | 'failed'
  started_at: string
  completed_at: string | null
  tables_restored: number | null
  records_restored: number | null
  error_message: string | null
  notes: string | null
}

export async function triggerRestore(
  backupId: string,
  confirmDate: string,
  confirmWord: string,
): Promise<RestoreResult> {
  const { data, error } = await supabase.functions.invoke('restore-backup', {
    body: {
      backup_id: backupId,
      confirm_date: confirmDate,
      confirm_word: confirmWord,
    },
  })

  if (error) throw error

  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String(data.error))
  }

  const result = data as RestoreResult
  try {
    // قراءة بيانات النسخة الاحتياطية الأصلية للحصول على عدد السجلات
    const { data: backupRecord } = await supabase
      .from('backup_history')
      .select('started_at, table_record_counts')
      .eq('id', backupId)
      .maybeSingle()
    await supabase.from('activity_log').insert({
      entity_type: 'backup',
      action: 'استعادة نسخة احتياطية',
      details: {
        timestamp: new Date().toISOString(),
        total_employees: (backupRecord as { table_record_counts?: Record<string, number> } | null)?.table_record_counts?.['employees'] ?? 0,
        total_companies: (backupRecord as { table_record_counts?: Record<string, number> } | null)?.table_record_counts?.['companies'] ?? 0,
      },
    })
  } catch { /* non-blocking */ }
  return result
}

export async function fetchRestoreHistory(): Promise<RestoreHistoryRecord[]> {
  const { data, error } = await supabase
    .from('restore_history')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return (data ?? []) as RestoreHistoryRecord[]
}

export async function checkMaintenanceActive(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_maintenance_active')
  if (error) return false
  return Boolean(data)
}

export async function getRestoreHistoryEntry(restoreId: string): Promise<RestoreHistoryRecord | null> {
  const { data, error } = await supabase
    .from('restore_history')
    .select('*')
    .eq('id', restoreId)
    .single()

  if (error) return null
  return data as RestoreHistoryRecord
}
