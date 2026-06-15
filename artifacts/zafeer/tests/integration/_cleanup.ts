import type { SupabaseClient } from '@supabase/supabase-js'

export async function deleteByPrefix(
  client: SupabaseClient,
  table: string,
  column: string,
  prefix: string
): Promise<void> {
  const { error } = await client
    .from(table)
    .delete()
    .like(column, `${prefix}%`)

  if (error) {
    console.warn(`[cleanup] ${table}.${column} LIKE '${prefix}%': ${error.message}`)
  }
}

export async function restoreSettings(
  client: SupabaseClient,
  key: string,
  original: unknown
): Promise<void> {
  const { error } = await client
    .from('system_settings')
    .upsert({ setting_key: key, setting_value: original }, { onConflict: 'setting_key' })

  if (error) {
    console.warn(`[restoreSettings] key=${key}: ${error.message}`)
  }
}
