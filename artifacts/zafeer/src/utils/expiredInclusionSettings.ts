import { supabase } from '../lib/supabase'

export interface ExpiredInclusionSettings {
  include_in_alerts: boolean
  include_in_notifications: boolean
  include_in_daily_email: boolean
  include_in_notification_emails: boolean
}

export const DEFAULT_EXPIRED_INCLUSION: ExpiredInclusionSettings = {
  include_in_alerts: true,
  include_in_notifications: true,
  include_in_daily_email: true,
  include_in_notification_emails: true,
}

const SETTING_KEY = 'expired_inclusion_settings'

function normalizeExpiredInclusionSettings(
  value: unknown
): ExpiredInclusionSettings | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<ExpiredInclusionSettings>

  return {
    include_in_alerts: candidate.include_in_alerts ?? DEFAULT_EXPIRED_INCLUSION.include_in_alerts,
    include_in_notifications:
      candidate.include_in_notifications ?? DEFAULT_EXPIRED_INCLUSION.include_in_notifications,
    include_in_daily_email:
      candidate.include_in_daily_email ?? DEFAULT_EXPIRED_INCLUSION.include_in_daily_email,
    include_in_notification_emails:
      candidate.include_in_notification_emails ??
      DEFAULT_EXPIRED_INCLUSION.include_in_notification_emails,
  }
}

export async function getExpiredInclusionSettings(): Promise<ExpiredInclusionSettings> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', SETTING_KEY)
      .maybeSingle()

    if (error || !data?.setting_value) {
      return DEFAULT_EXPIRED_INCLUSION
    }

    const normalized = normalizeExpiredInclusionSettings(data.setting_value)
    return normalized ?? DEFAULT_EXPIRED_INCLUSION
  } catch {
    return DEFAULT_EXPIRED_INCLUSION
  }
}

export async function saveExpiredInclusionSettings(
  settings: ExpiredInclusionSettings
): Promise<void> {
  const { error } = await supabase.from('system_settings').upsert(
    {
      setting_key: SETTING_KEY,
      setting_value: settings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'setting_key' }
  )

  if (error) {
    throw error
  }
}
