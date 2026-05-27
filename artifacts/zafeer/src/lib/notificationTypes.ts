import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/utils/logger'

/**
 * @deprecated Use getAdminEmail() instead - reads from system_settings key admin_email
 * Kept for compatibility with older code paths.
 */
export const PRIMARY_ADMIN_EMAIL = ''

/**
 * Read admin_email from system_settings.
 * Returns null when the value is missing, empty, or malformed.
 */
export async function getAdminEmail(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'admin_email')
    .single()

  if (error || !data) {
    return null
  }

  const email = typeof data.setting_value === 'string'
    ? data.setting_value
    : String(data.setting_value ?? '')

  const trimmedEmail = email.trim()
  if (!trimmedEmail) {
    return null
  }

  if (!trimmedEmail.includes('@')) {
    logger.warn('[getAdminEmail] admin_email invalid, skipping send')
    return null
  }

  return trimmedEmail
}

export interface AdditionalRecipient {
  id: string
  email: string
  expiryAlerts: boolean
  backupNotifications: boolean
  dailyDigest: boolean
  added_at: string
  added_by: string
}

export interface NotificationRecipientsConfig {
  primary_admin: string
  primary_admin_locked: boolean
  additional_recipients: AdditionalRecipient[]
  version: string
  last_modified: string
}

export function createDefaultConfig(): NotificationRecipientsConfig {
  return {
    primary_admin: '',
    primary_admin_locked: true,
    additional_recipients: [],
    version: '1.0',
    last_modified: new Date().toISOString(),
  }
}

export function validateConfig(data: unknown): {
  valid: boolean
  config: NotificationRecipientsConfig
  error?: string
} {
  try {
    if (!data || typeof data !== 'object') {
      logger.warn('Invalid notification config: not an object')
      return {
        valid: false,
        config: createDefaultConfig(),
        error: 'Configuration is not an object',
      }
    }

    const obj = data as Record<string, unknown>

    if (typeof obj.primary_admin === 'string') {
      const primaryAdmin = obj.primary_admin.trim()
      if (primaryAdmin && !primaryAdmin.includes('@')) {
        logger.warn(`Invalid primary_admin: ${obj.primary_admin}`)
        obj.primary_admin = ''
      } else {
        obj.primary_admin = primaryAdmin
      }
    } else {
      obj.primary_admin = ''
    }

    if (typeof obj.primary_admin_locked !== 'boolean') {
      obj.primary_admin_locked = true
    }

    if (!Array.isArray(obj.additional_recipients)) {
      logger.warn('additional_recipients is not an array, setting to []')
      obj.additional_recipients = []
    } else {
      obj.additional_recipients = (obj.additional_recipients as unknown[]).filter((r) => {
        if (typeof r !== 'object' || r === null) return false
        const recipient = r as Record<string, unknown>
        return (
          typeof recipient.email === 'string' &&
          recipient.email.includes('@') &&
          typeof recipient.expiryAlerts === 'boolean' &&
          typeof recipient.backupNotifications === 'boolean' &&
          typeof recipient.dailyDigest === 'boolean'
        )
      })
    }

    if (typeof obj.version !== 'string') {
      obj.version = '1.0'
    }

    if (typeof obj.last_modified !== 'string') {
      obj.last_modified = new Date().toISOString()
    }

    const config = obj as unknown as NotificationRecipientsConfig
    return { valid: true, config }
  } catch (err) {
    logger.error(
      `Error validating notification config: ${err instanceof Error ? err.message : String(err)}`
    )
    return {
      valid: false,
      config: createDefaultConfig(),
      error: `Validation error: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}

/**
 * Build recipient list for a specific notification type.
 */
export function getRecipientsForNotificationType(
  config: NotificationRecipientsConfig,
  notificationType: 'expiryAlerts' | 'backupNotifications' | 'dailyDigest'
): string[] {
  const recipients = new Set<string>()

  if (config.primary_admin && config.primary_admin.includes('@')) {
    recipients.add(config.primary_admin)
  }

  try {
    const key = notificationType as keyof Omit<
      AdditionalRecipient,
      'id' | 'email' | 'added_at' | 'added_by'
    >

    config.additional_recipients.forEach((recipient) => {
      if (recipient[key] === true && recipient.email && recipient.email.includes('@')) {
        recipients.add(recipient.email)
      }
    })
  } catch (err) {
    logger.error(
      `Error filtering recipients for ${notificationType}: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  return Array.from(recipients)
}

/**
 * Safe JSON parse with fallback.
 */
export function safeParseConfig(
  rawValue: string | Record<string, unknown> | null | undefined
): NotificationRecipientsConfig {
  if (!rawValue) {
    return createDefaultConfig()
  }

  try {
    let parsed: unknown = rawValue

    if (typeof rawValue === 'string') {
      parsed = JSON.parse(rawValue)

      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed)
      }
    }

    const { valid, config, error } = validateConfig(parsed)

    if (!valid) {
      logger.warn(`Config validation failed: ${error}, using defaults`)
      return createDefaultConfig()
    }

    return config
  } catch (err) {
    logger.error(
      `Failed to parse notification config JSON: ${err instanceof Error ? err.message : String(err)}`
    )
    logger.warn('Falling back to default notification config')
    return createDefaultConfig()
  }
}

export function createSampleConfig(): NotificationRecipientsConfig {
  return {
    primary_admin: '',
    primary_admin_locked: true,
    additional_recipients: [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'admin2@company.com',
        expiryAlerts: true,
        backupNotifications: true,
        dailyDigest: false,
        added_at: '2026-02-03T10:00:00Z',
        added_by: 'system',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'admin3@company.com',
        expiryAlerts: false,
        backupNotifications: true,
        dailyDigest: true,
        added_at: '2026-02-03T11:00:00Z',
        added_by: 'system',
      },
    ],
    version: '1.0',
    last_modified: new Date().toISOString(),
  }
}
