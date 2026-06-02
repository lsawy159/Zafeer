import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { differenceInDays } from 'date-fns'
import { supabase } from '../lib/supabase'
import { getStatusThresholds, DEFAULT_STATUS_THRESHOLDS } from '../utils/autoCompanyStatus'
import {
  getEmployeeNotificationThresholdsPublic,
  DEFAULT_EMPLOYEE_THRESHOLDS,
} from '../utils/employeeAlerts'
import {
  getExpiredInclusionSettings,
  DEFAULT_EXPIRED_INCLUSION,
} from '../utils/expiredInclusionSettings'

export interface AlertsStats {
  total: number
  urgent: number
  companyAlerts: number
  companyUrgent: number
  employeeAlerts: number
  employeeUrgent: number
  commercialRegAlerts: number
  contractAlerts: number
  residenceAlerts: number
}

function isUrgentOrHigh(
  expiryDate: string | null | undefined,
  today: Date,
  urgentDays: number,
  highDays: number,
  includeExpired = true
): boolean {
  if (!expiryDate) return false
  const expiry = new Date(expiryDate)
  const todayNorm = new Date(today)
  todayNorm.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)
  const diff = differenceInDays(expiry, todayNorm)
  if (!includeExpired && diff < 0) return false
  return diff < 0 || diff <= urgentDays || diff <= highDays
}

function companyAlertId(prefix: 'commercial' | 'power' | 'moqeem', companyId: string, expiry: string | null | undefined) {
  return `${prefix}_${companyId}_${expiry ?? ''}`
}

function employeeAlertId(
  prefix: 'contract' | 'residence' | 'health_insurance' | 'hired_worker_contract',
  employeeId: string,
  expiry: string | null | undefined
) {
  return `${prefix}_${employeeId}_${expiry ?? ''}`
}

async function fetchAlertsStatsQuery(): Promise<AlertsStats> {
  const empty: AlertsStats = {
    total: 0,
    urgent: 0,
    companyAlerts: 0,
    companyUrgent: 0,
    employeeAlerts: 0,
    employeeUrgent: 0,
    commercialRegAlerts: 0,
    contractAlerts: 0,
    residenceAlerts: 0,
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return empty

    const { data: snoozedRows, error: snoozedError } = await supabase
      .from('snoozed_alerts')
      .select('alert_id,snoozed_until,is_deferred')
      .eq('user_id', user.id)

    if (snoozedError) throw snoozedError

    const now = new Date()
    const snoozedIds = new Set(
      (snoozedRows ?? [])
        .filter(
          (row) =>
            row.is_deferred === true || (!!row.snoozed_until && new Date(row.snoozed_until) > now)
        )
        .map((row) => row.alert_id)
    )

    const [companiesResult, employeesResult, companyThresholds, employeeThresholds, expiredSettings] =
      await Promise.all([
        supabase
          .from('companies')
          .select(
            'id,commercial_registration_expiry,ending_subscription_power_date,ending_subscription_moqeem_date'
          ),
        supabase
          .from('employees')
          .select(
            'id,contract_expiry,residence_expiry,health_insurance_expiry,hired_worker_contract_expiry'
          )
          .eq('is_deleted', false),
        getStatusThresholds().catch(() => DEFAULT_STATUS_THRESHOLDS),
        getEmployeeNotificationThresholdsPublic().catch(() => DEFAULT_EMPLOYEE_THRESHOLDS),
        getExpiredInclusionSettings().catch(() => DEFAULT_EXPIRED_INCLUSION),
      ])

    const includeExpired = expiredSettings.include_in_alerts

    if (companiesResult.error) throw companiesResult.error
    if (employeesResult.error) throw employeesResult.error

    const companies = companiesResult.data || []
    const employees = employeesResult.data || []
    const today = new Date()

    let companyUrgent = 0
    let commercialRegAlerts = 0

    companies.forEach((company) => {
      const crAlert = isUrgentOrHigh(
        company.commercial_registration_expiry,
        today,
        companyThresholds.commercial_reg_urgent_days,
        companyThresholds.commercial_reg_high_days,
        includeExpired
      )
      const pwAlert = isUrgentOrHigh(
        company.ending_subscription_power_date,
        today,
        companyThresholds.power_subscription_urgent_days,
        companyThresholds.power_subscription_high_days,
        includeExpired
      )
      const mqAlert = isUrgentOrHigh(
        company.ending_subscription_moqeem_date,
        today,
        companyThresholds.moqeem_subscription_urgent_days,
        companyThresholds.moqeem_subscription_high_days,
        includeExpired
      )

      const crId = companyAlertId('commercial', company.id, company.commercial_registration_expiry)
      const pwId = companyAlertId('power', company.id, company.ending_subscription_power_date)
      const mqId = companyAlertId('moqeem', company.id, company.ending_subscription_moqeem_date)

      if (crAlert && !snoozedIds.has(crId)) commercialRegAlerts++
      if ((crAlert && !snoozedIds.has(crId)) || (pwAlert && !snoozedIds.has(pwId)) || (mqAlert && !snoozedIds.has(mqId))) {
        companyUrgent++
      }
    })

    let employeeUrgent = 0
    let contractAlerts = 0
    let residenceAlerts = 0

    const hwUrgentDays =
      employeeThresholds.hired_worker_contract_urgent_days ?? employeeThresholds.contract_urgent_days
    const hwHighDays =
      employeeThresholds.hired_worker_contract_high_days ?? employeeThresholds.contract_high_days

    employees.forEach((emp) => {
      const ctAlert = isUrgentOrHigh(
        emp.contract_expiry,
        today,
        employeeThresholds.contract_urgent_days,
        employeeThresholds.contract_high_days,
        includeExpired
      )
      const rsAlert = isUrgentOrHigh(
        emp.residence_expiry,
        today,
        employeeThresholds.residence_urgent_days,
        employeeThresholds.residence_high_days,
        includeExpired
      )
      const hiAlert = isUrgentOrHigh(
        emp.health_insurance_expiry,
        today,
        employeeThresholds.health_insurance_urgent_days,
        employeeThresholds.health_insurance_high_days,
        includeExpired
      )
      const hwAlert = isUrgentOrHigh(
        emp.hired_worker_contract_expiry,
        today,
        hwUrgentDays,
        hwHighDays,
        includeExpired
      )

      const ctId = employeeAlertId('contract', emp.id, emp.contract_expiry)
      const rsId = employeeAlertId('residence', emp.id, emp.residence_expiry)
      const hiId = employeeAlertId('health_insurance', emp.id, emp.health_insurance_expiry)
      const hwId = employeeAlertId('hired_worker_contract', emp.id, emp.hired_worker_contract_expiry)

      if (ctAlert && !snoozedIds.has(ctId)) contractAlerts++
      if (rsAlert && !snoozedIds.has(rsId)) residenceAlerts++
      if (
        (ctAlert && !snoozedIds.has(ctId)) ||
        (rsAlert && !snoozedIds.has(rsId)) ||
        (hiAlert && !snoozedIds.has(hiId)) ||
        (hwAlert && !snoozedIds.has(hwId))
      ) {
        employeeUrgent++
      }
    })

    const total = companyUrgent + employeeUrgent

    return {
      total,
      urgent: total,
      companyAlerts: companyUrgent,
      companyUrgent,
      employeeAlerts: employeeUrgent,
      employeeUrgent,
      commercialRegAlerts,
      contractAlerts,
      residenceAlerts,
    }
  } catch (error) {
    console.error('خطأ في جلب إحصائيات التنبيهات:', error)
    throw error
  }
}

export function useAlertsStats() {
  const queryClient = useQueryClient()

  const { data: alertsStats = {
    total: 0,
    urgent: 0,
    companyAlerts: 0,
    companyUrgent: 0,
    employeeAlerts: 0,
    employeeUrgent: 0,
    commercialRegAlerts: 0,
    contractAlerts: 0,
    residenceAlerts: 0,
  }, isLoading: loading } = useQuery<AlertsStats>({
    queryKey: ['alerts-stats'],
    queryFn: fetchAlertsStatsQuery,
    staleTime: 30 * 1000,
    refetchInterval: 2 * 60 * 1000,
    retry: 2,
  })

  const refreshStats = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['alerts-stats'] })
  }, [queryClient])

  const markAlertAsRead = useCallback(
    async (alertId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('read_alerts')
        .insert({ user_id: user.id, alert_id: alertId })
        .select()

      refreshStats()
    },
    [refreshStats]
  )

  return {
    alertsStats,
    loading,
    refreshStats,
    markAlertAsRead,
  }
}
