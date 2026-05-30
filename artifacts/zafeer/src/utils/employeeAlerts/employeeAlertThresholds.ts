import { supabase } from '../../lib/supabase'
import { logger } from '../logger'

export interface EmployeeAlert {
  id: string
  type:
    | 'contract_expiry'
    | 'residence_expiry'
    | 'health_insurance_expiry'
    | 'hired_worker_contract_expiry'
  priority: 'urgent' | 'high' | 'medium' | 'low'
  title: string
  message: string
  employee: {
    id: string
    name: string
    profession: string
    nationality: string
    company_id: string
  }
  company: {
    id: string
    name: string
    commercial_registration_number?: string
    unified_number?: number
  }
  expiry_date?: string
  days_remaining?: number
  action_required: string
  created_at: string
}

export const DEFAULT_EMPLOYEE_THRESHOLDS = {
  residence_urgent_days: 7,
  residence_high_days: 15,
  residence_medium_days: 30,
  contract_urgent_days: 7,
  contract_high_days: 15,
  contract_medium_days: 30,
  health_insurance_urgent_days: 30,
  health_insurance_high_days: 45,
  health_insurance_medium_days: 60,
  hired_worker_contract_urgent_days: 7,
  hired_worker_contract_high_days: 15,
  hired_worker_contract_medium_days: 30,
}

export type EmployeeNotificationThresholds = typeof DEFAULT_EMPLOYEE_THRESHOLDS

let employeeThresholdsCache: typeof DEFAULT_EMPLOYEE_THRESHOLDS | null = null
let employeeCacheTimestamp: number = 0
const EMPLOYEE_CACHE_TTL = 5 * 60 * 1000

export function invalidateEmployeeNotificationThresholdsCache() {
  employeeThresholdsCache = null
  employeeCacheTimestamp = 0
}

async function getEmployeeNotificationThresholds(): Promise<EmployeeNotificationThresholds> {
  const now = Date.now()
  if (employeeThresholdsCache && now - employeeCacheTimestamp < EMPLOYEE_CACHE_TTL) {
    return employeeThresholdsCache
  }

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'notification_thresholds')
      .maybeSingle()

    if (error || !data || !data.setting_value) {
      logger.debug('Using default employee notification thresholds')
      employeeThresholdsCache = DEFAULT_EMPLOYEE_THRESHOLDS
      employeeCacheTimestamp = now
      return DEFAULT_EMPLOYEE_THRESHOLDS
    }

    const mergedThresholds = { ...DEFAULT_EMPLOYEE_THRESHOLDS, ...data.setting_value }
    employeeThresholdsCache = mergedThresholds
    employeeCacheTimestamp = now
    return mergedThresholds
  } catch (error) {
    console.error('Error loading employee notification thresholds:', error)
    employeeThresholdsCache = DEFAULT_EMPLOYEE_THRESHOLDS
    employeeCacheTimestamp = now
    return DEFAULT_EMPLOYEE_THRESHOLDS
  }
}

export async function getEmployeeNotificationThresholdsPublic(): Promise<EmployeeNotificationThresholds> {
  return getEmployeeNotificationThresholds()
}
