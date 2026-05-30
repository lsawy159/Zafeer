import { calculateDaysRemaining } from '../statusHelpers'
import { DEFAULT_STATUS_THRESHOLDS, getStatusThresholdsSync } from './statusThresholds'
import { calculateUnifiedStatus } from './unifiedStatus'

export const calculateCommercialRegistrationStatus = (
  expiryDate: string | null | undefined,
  thresholds?: typeof DEFAULT_STATUS_THRESHOLDS
): {
  status: 'غير محدد' | 'منتهي' | 'طارئ' | 'عاجل' | 'متوسط' | 'ساري'
  daysRemaining: number
  color: { backgroundColor: string; textColor: string; borderColor: string }
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
} => {
  if (!expiryDate) {
    return {
      status: 'غير محدد',
      daysRemaining: 0,
      color: { backgroundColor: 'bg-neutral-50', textColor: 'text-neutral-600', borderColor: 'border-neutral-200' },
      description: 'تاريخ انتهاء السجل التجاري غير محدد',
      priority: 'low',
    }
  }

  const statusThresholds = thresholds || getStatusThresholdsSync()
  const daysRemaining = calculateDaysRemaining(expiryDate)
  const result = calculateUnifiedStatus(
    daysRemaining,
    statusThresholds.commercial_reg_urgent_days,
    statusThresholds.commercial_reg_high_days,
    statusThresholds.commercial_reg_medium_days,
    'السجل التجاري'
  )

  return { ...result, daysRemaining }
}

export interface CommercialRegStats {
  total: number
  expired: number
  urgent: number
  high: number
  medium: number
  valid: number
  notSpecified: number
  percentageValid: number
  percentageExpired: number
  percentageUrgent: number
  percentageHigh: number
  percentageMedium: number
  percentageNotSpecified: number
}

export const calculateCommercialRegStats = (
  companies: Array<{ commercial_registration_expiry: string | null }>
): CommercialRegStats => {
  const stats = {
    total: companies.length,
    expired: 0, urgent: 0, high: 0, medium: 0, valid: 0, notSpecified: 0,
    percentageValid: 0, percentageExpired: 0, percentageUrgent: 0,
    percentageHigh: 0, percentageMedium: 0, percentageNotSpecified: 0,
  }

  companies.forEach((company) => {
    const statusInfo = calculateCommercialRegistrationStatus(company.commercial_registration_expiry)
    switch (statusInfo.status) {
      case 'منتهي': stats.expired++; break
      case 'طارئ': stats.urgent++; break
      case 'عاجل': stats.high++; break
      case 'متوسط': stats.medium++; break
      case 'ساري': stats.valid++; break
      case 'غير محدد': stats.notSpecified++; break
    }
  })

  if (stats.total > 0) {
    stats.percentageValid = Math.round((stats.valid / stats.total) * 100)
    stats.percentageExpired = Math.round((stats.expired / stats.total) * 100)
    stats.percentageUrgent = Math.round((stats.urgent / stats.total) * 100)
    stats.percentageHigh = Math.round((stats.high / stats.total) * 100)
    stats.percentageMedium = Math.round((stats.medium / stats.total) * 100)
    stats.percentageNotSpecified = Math.round((stats.notSpecified / stats.total) * 100)
  }

  return stats
}
