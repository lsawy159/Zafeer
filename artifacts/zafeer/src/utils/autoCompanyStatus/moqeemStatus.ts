import { calculateDaysRemaining } from '../statusHelpers'
import { DEFAULT_STATUS_THRESHOLDS, getStatusThresholdsSync } from './statusThresholds'
import { calculateUnifiedStatus } from './unifiedStatus'
import { CommercialRegStats, calculateCommercialRegistrationStatus, calculateCommercialRegStats } from './commercialRegStatus'
import { PowerStats, calculatePowerSubscriptionStatus, calculatePowerStats } from './powerStatus'

export const calculateMoqeemSubscriptionStatus = (
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
      description: 'تاريخ انتهاء اشتراك مقيم غير محدد',
      priority: 'low',
    }
  }

  const statusThresholds = thresholds || getStatusThresholdsSync()
  const daysRemaining = calculateDaysRemaining(expiryDate)
  const result = calculateUnifiedStatus(
    daysRemaining,
    statusThresholds.moqeem_subscription_urgent_days,
    statusThresholds.moqeem_subscription_high_days,
    statusThresholds.moqeem_subscription_medium_days,
    'اشتراك مقيم'
  )

  return { ...result, daysRemaining }
}

export interface MoqeemStats {
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

export const calculateMoqeemStats = (
  companies: Array<{ ending_subscription_moqeem_date: string | null }>
): MoqeemStats => {
  const stats = {
    total: companies.length,
    expired: 0, urgent: 0, high: 0, medium: 0, valid: 0, notSpecified: 0,
    percentageValid: 0, percentageExpired: 0, percentageUrgent: 0,
    percentageHigh: 0, percentageMedium: 0, percentageNotSpecified: 0,
  }

  companies.forEach((company) => {
    const statusInfo = calculateMoqeemSubscriptionStatus(company.ending_subscription_moqeem_date)
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

export interface CompanyStatusStats {
  totalCompanies: number
  commercialRegStats: CommercialRegStats
  powerStats: PowerStats
  moqeemStats: MoqeemStats
  totalValid: number
  totalMedium: number
  totalUrgent: number
  totalHigh: number
  totalExpired: number
  totalValidPercentage: number
  totalMediumPercentage: number
  totalUrgentPercentage: number
  totalHighPercentage: number
  totalExpiredPercentage: number
  totalCriticalAlerts: number
  totalMediumAlerts: number
}

export const calculateCompanyStatusStats = (
  companies: Array<{
    id: string
    name: string
    commercial_registration_expiry: string | null
    ending_subscription_power_date?: string | null
    ending_subscription_moqeem_date?: string | null
  }>
): CompanyStatusStats => {
  const commercialRegStats = calculateCommercialRegStats(
    companies.map((c) => ({ commercial_registration_expiry: c.commercial_registration_expiry }))
  )
  const powerStats = calculatePowerStats(
    companies.map((c) => ({ ending_subscription_power_date: c.ending_subscription_power_date ?? null }))
  )
  const moqeemStats = calculateMoqeemStats(
    companies.map((c) => ({ ending_subscription_moqeem_date: c.ending_subscription_moqeem_date ?? null }))
  )

  let totalCriticalAlerts = 0
  let totalMediumAlerts = 0
  let totalValid = 0
  let totalMedium = 0
  let totalUrgent = 0
  let totalHigh = 0
  let totalExpired = 0

  companies.forEach((company) => {
    const commercialStatus = calculateCommercialRegistrationStatus(company.commercial_registration_expiry)
    const powerStatus = calculatePowerSubscriptionStatus(company.ending_subscription_power_date)
    const moqeemStatus = calculateMoqeemSubscriptionStatus(company.ending_subscription_moqeem_date)

    if (
      commercialStatus.priority === 'urgent' ||
      powerStatus.priority === 'urgent' ||
      moqeemStatus.priority === 'urgent'
    ) {
      totalCriticalAlerts++
    }

    if (
      commercialStatus.priority === 'medium' ||
      powerStatus.priority === 'medium' ||
      moqeemStatus.priority === 'medium'
    ) {
      totalMediumAlerts++
    }

    const allStatuses = [commercialStatus, powerStatus, moqeemStatus]
    const priorities = allStatuses.map((s) => s.priority)
    const statuses = allStatuses.map((s) => s.status)

    if (statuses.includes('منتهي')) {
      totalExpired++
    } else if (priorities.includes('urgent')) {
      totalUrgent++
    } else if (priorities.includes('high')) {
      totalHigh++
    } else if (priorities.includes('medium')) {
      totalMedium++
    } else {
      totalValid++
    }
  })

  const totalCompanies = companies.length
  return {
    totalCompanies,
    commercialRegStats,
    powerStats,
    moqeemStats,
    totalValid,
    totalMedium,
    totalUrgent,
    totalHigh,
    totalExpired,
    totalValidPercentage: totalCompanies > 0 ? Math.round((totalValid / totalCompanies) * 100) : 0,
    totalMediumPercentage: totalCompanies > 0 ? Math.round((totalMedium / totalCompanies) * 100) : 0,
    totalUrgentPercentage: totalCompanies > 0 ? Math.round((totalUrgent / totalCompanies) * 100) : 0,
    totalHighPercentage: totalCompanies > 0 ? Math.round((totalHigh / totalCompanies) * 100) : 0,
    totalExpiredPercentage: totalCompanies > 0 ? Math.round((totalExpired / totalCompanies) * 100) : 0,
    totalCriticalAlerts,
    totalMediumAlerts,
  }
}
