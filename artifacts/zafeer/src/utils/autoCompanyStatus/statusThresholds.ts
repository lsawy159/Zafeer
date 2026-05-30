import { supabase } from '../../lib/supabase'
import { logger } from '../logger'

export const DEFAULT_STATUS_THRESHOLDS = {
  commercial_reg_urgent_days: 7,
  commercial_reg_high_days: 15,
  commercial_reg_medium_days: 30,
  power_subscription_urgent_days: 7,
  power_subscription_high_days: 15,
  power_subscription_medium_days: 30,
  moqeem_subscription_urgent_days: 7,
  moqeem_subscription_high_days: 15,
  moqeem_subscription_medium_days: 30,
}

let statusThresholdsCache: typeof DEFAULT_STATUS_THRESHOLDS | null = null
let statusCacheTimestamp: number = 0
const STATUS_CACHE_TTL = 5 * 60 * 1000

export function invalidateStatusThresholdsCache() {
  statusThresholdsCache = null
  statusCacheTimestamp = 0
}

export async function getStatusThresholds() {
  const now = Date.now()
  if (statusThresholdsCache && now - statusCacheTimestamp < STATUS_CACHE_TTL) {
    return statusThresholdsCache
  }

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'notification_thresholds')
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data?.setting_value) {
      logger.debug('Using default notification thresholds for company status')
      statusThresholdsCache = DEFAULT_STATUS_THRESHOLDS
      statusCacheTimestamp = now
      return DEFAULT_STATUS_THRESHOLDS
    }

    const mergedThresholds = { ...DEFAULT_STATUS_THRESHOLDS, ...data.setting_value }
    statusThresholdsCache = mergedThresholds
    statusCacheTimestamp = now
    return mergedThresholds
  } catch (error) {
    console.error('Error loading status thresholds:', error)
    statusThresholdsCache = DEFAULT_STATUS_THRESHOLDS
    statusCacheTimestamp = now
    return DEFAULT_STATUS_THRESHOLDS
  }
}

// Exported so sibling sub-files can use it synchronously
export function getStatusThresholdsSync(): typeof DEFAULT_STATUS_THRESHOLDS {
  return statusThresholdsCache || DEFAULT_STATUS_THRESHOLDS
}
