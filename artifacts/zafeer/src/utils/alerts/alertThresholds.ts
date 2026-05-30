import { supabase } from '../../lib/supabase'
import { logger } from '../logger'

const DEFAULT_THRESHOLDS = {
  residence_urgent_days: 7,
  residence_high_days: 15,
  residence_medium_days: 30,
  contract_urgent_days: 7,
  contract_high_days: 15,
  contract_medium_days: 30,
  commercial_reg_urgent_days: 7,
  commercial_reg_high_days: 15,
  commercial_reg_medium_days: 30,
  health_insurance_urgent_days: 30,
  health_insurance_high_days: 45,
  health_insurance_medium_days: 60,
  power_subscription_urgent_days: 7,
  power_subscription_high_days: 15,
  power_subscription_medium_days: 30,
  moqeem_subscription_urgent_days: 7,
  moqeem_subscription_high_days: 15,
  moqeem_subscription_medium_days: 30,
}

let thresholdsCache: typeof DEFAULT_THRESHOLDS | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000

export function invalidateNotificationThresholdsCache() {
  thresholdsCache = null
  cacheTimestamp = 0
}

export async function getNotificationThresholds() {
  if (import.meta.env.MODE === 'test') {
    return DEFAULT_THRESHOLDS
  }

  const now = Date.now()
  if (thresholdsCache && now - cacheTimestamp < CACHE_TTL) {
    return thresholdsCache
  }

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'notification_thresholds')
      .maybeSingle()

    if (error || !data || !data.setting_value) {
      logger.debug('Using default notification thresholds')
      thresholdsCache = DEFAULT_THRESHOLDS
      cacheTimestamp = now
      return DEFAULT_THRESHOLDS
    }

    const mergedThresholds = { ...DEFAULT_THRESHOLDS, ...data.setting_value }
    thresholdsCache = mergedThresholds
    cacheTimestamp = now
    return mergedThresholds
  } catch (error) {
    console.error('Error loading notification thresholds:', error)
    thresholdsCache = DEFAULT_THRESHOLDS
    cacheTimestamp = now
    return DEFAULT_THRESHOLDS
  }
}
