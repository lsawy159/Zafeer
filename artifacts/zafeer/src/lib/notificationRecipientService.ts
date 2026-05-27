/**
 * Safe notification recipients getter.
 */

import { supabase } from '@/lib/supabase'
import { getRecipientsForNotificationType, safeParseConfig } from '@/lib/notificationTypes'
import { logger } from '@/utils/logger'

interface GetRecipientsOptions {
  notificationType: 'expiryAlerts' | 'backupNotifications' | 'dailyDigest'
  timeout?: number
  includeLogging?: boolean
}

export async function getNotificationRecipients(options: GetRecipientsOptions): Promise<string[]> {
  const { notificationType, timeout = 5000, includeLogging = true } = options

  if (includeLogging) {
    logger.debug(`[getNotificationRecipients] Fetching recipients for: ${notificationType}`)
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Database query timeout after ${timeout}ms`))
      }, timeout)

      return () => clearTimeout(timer)
    })

    const fetchPromise = (async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'notification_recipients')
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          if (includeLogging) {
            logger.debug(
              '[getNotificationRecipients] notification_recipients missing, using defaults'
            )
          }
          return null
        }
        throw error
      }

      return data?.setting_value ?? null
    })()

    const configJson = await Promise.race([fetchPromise, timeoutPromise])
    const config = safeParseConfig(configJson)
    const recipients = getRecipientsForNotificationType(config, notificationType)

    if (includeLogging) {
      logger.debug(
        `[getNotificationRecipients] Got ${recipients.length} recipient(s) for ${notificationType}: ${recipients.join(', ')}`
      )
    }

    return recipients
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)

    logger.error(
      `[getNotificationRecipients] Error fetching recipients for ${notificationType}: ${errorMessage}`
    )

    return []
  }
}

export async function checkNotificationHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'error'
  primaryAdmin: string
  recipientCount: number
  lastChecked: string
  warnings: string[]
}> {
  const warnings: string[] = []

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'notification_recipients')
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    const config = safeParseConfig(data?.setting_value as string | null)
    const recipients = getRecipientsForNotificationType(config, 'expiryAlerts')

    return {
      status: warnings.length === 0 ? 'healthy' : 'degraded',
      primaryAdmin: '',
      recipientCount: recipients.length,
      lastChecked: new Date().toISOString(),
      warnings,
    }
  } catch (err) {
    logger.error(
      `[checkNotificationHealth] Error: ${err instanceof Error ? err.message : String(err)}`
    )
    return {
      status: 'error',
      primaryAdmin: '',
      recipientCount: 0,
      lastChecked: new Date().toISOString(),
      warnings: ['Error checking notification system', err instanceof Error ? err.message : String(err)],
    }
  }
}
