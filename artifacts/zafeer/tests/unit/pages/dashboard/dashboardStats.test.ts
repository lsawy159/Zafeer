import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { calculateDashboardStats, calculateFiveCategories } from '@/pages/dashboard/dashboardStats'

describe('dashboardStats', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-31T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('classifies expiry dates into the expected five categories', () => {
    const today = new Date('2026-05-31T12:00:00.000Z')
    const thresholds = { urgent: 7, high: 30, medium: 60 }

    expect(calculateFiveCategories('2026-05-30', today, thresholds)).toEqual({
      expired: 1,
      urgent: 0,
      high: 0,
      medium: 0,
      valid: 0,
    })

    expect(calculateFiveCategories('2026-06-05', today, thresholds)).toEqual({
      expired: 0,
      urgent: 1,
      high: 0,
      medium: 0,
      valid: 0,
    })

    expect(calculateFiveCategories('2026-06-20', today, thresholds)).toEqual({
      expired: 0,
      urgent: 0,
      high: 1,
      medium: 0,
      valid: 0,
    })

    expect(calculateFiveCategories('2026-07-15', today, thresholds)).toEqual({
      expired: 0,
      urgent: 0,
      high: 0,
      medium: 1,
      valid: 0,
    })

    expect(calculateFiveCategories('2026-09-15', today, thresholds)).toEqual({
      expired: 0,
      urgent: 0,
      high: 0,
      medium: 0,
      valid: 1,
    })
  })

  it('aggregates dashboard utilization and alert buckets correctly', () => {
    const employees = [
      {
        id: 1,
        company_id: 1,
        contract_expiry: '2026-05-30',
        residence_expiry: '2026-06-02',
        health_insurance_expiry: '2026-06-15',
        hired_worker_contract_expiry: '2026-07-10',
      },
      {
        id: 2,
        company_id: 1,
        contract_expiry: '2026-06-05',
        residence_expiry: '2026-07-10',
        health_insurance_expiry: '2026-09-01',
        hired_worker_contract_expiry: null,
      },
      {
        id: 3,
        company_id: 2,
        contract_expiry: '2026-08-15',
        residence_expiry: null,
        health_insurance_expiry: '2026-06-04',
        hired_worker_contract_expiry: '2026-06-01',
      },
    ] as const

    const companies = [
      {
        id: 1,
        max_employees: 2,
        commercial_registration_expiry: '2026-05-29',
        ending_subscription_power_date: '2026-06-03',
        ending_subscription_moqeem_date: '2026-08-01',
      },
      {
        id: 2,
        max_employees: 5,
        commercial_registration_expiry: '2026-06-20',
        ending_subscription_power_date: '2026-07-20',
        ending_subscription_moqeem_date: null,
      },
    ] as const

    const companyThresholds = {
      commercial_reg_urgent_days: 7,
      commercial_reg_high_days: 30,
      commercial_reg_medium_days: 60,
      power_subscription_urgent_days: 7,
      power_subscription_high_days: 30,
      power_subscription_medium_days: 60,
      moqeem_subscription_urgent_days: 7,
      moqeem_subscription_high_days: 30,
      moqeem_subscription_medium_days: 60,
    }

    const employeeThresholds = {
      contract_urgent_days: 7,
      contract_high_days: 30,
      contract_medium_days: 60,
      residence_urgent_days: 7,
      residence_high_days: 30,
      residence_medium_days: 60,
      health_insurance_urgent_days: 7,
      health_insurance_high_days: 30,
      health_insurance_medium_days: 60,
      hired_worker_contract_urgent_days: 7,
      hired_worker_contract_high_days: 30,
      hired_worker_contract_medium_days: 60,
    }

    const stats = calculateDashboardStats(
      employees as never,
      companies as never,
      companyThresholds,
      employeeThresholds
    )

    expect(stats.totalEmployees).toBe(3)
    expect(stats.totalCompanies).toBe(2)
    expect(stats.fullCompanies).toBe(1)
    expect(stats.companiesWithFewSlots).toBe(1)
    expect(stats.totalAvailableSlots).toBe(4)
    expect(stats.totalContractSlots).toBe(7)
    expect(stats.avgEmployeesPerCompany).toBe(2)
    expect(stats.utilizationRate).toBe(43)

    expect(stats.expiredContracts).toBe(1)
    expect(stats.urgentContracts).toBe(1)
    expect(stats.validContracts).toBe(1)

    expect(stats.urgentResidences).toBe(1)
    expect(stats.mediumResidences).toBe(1)

    expect(stats.urgentInsurance).toBe(1)
    expect(stats.highInsurance).toBe(1)
    expect(stats.validInsurance).toBe(1)

    expect(stats.urgentHiredWorkerContracts).toBe(1)
    expect(stats.mediumHiredWorkerContracts).toBe(1)

    expect(stats.expiredCommercialReg).toBe(1)
    expect(stats.highCommercialReg).toBe(1)
    expect(stats.urgentPower).toBe(1)
    expect(stats.mediumPower).toBe(1)
    expect(stats.validMoqeem).toBe(1)
  })
})
