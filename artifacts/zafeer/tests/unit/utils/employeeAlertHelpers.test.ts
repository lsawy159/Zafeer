import { describe, it, expect, vi } from 'vitest'
import type { EmployeeAlert } from '@/utils/employeeAlerts/employeeAlertThresholds'
import type { Company } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/utils/employeeAlerts/employeeAlertThresholds', () => ({
  DEFAULT_EMPLOYEE_THRESHOLDS: {},
  invalidateEmployeeNotificationThresholdsCache: vi.fn(),
}))
vi.mock('@/utils/employeeAlerts/employeeExpiryChecks', () => ({
  checkContractExpiry: vi.fn(),
  checkResidenceExpiry: vi.fn(),
  checkHealthInsuranceExpiry: vi.fn(),
  checkHiredWorkerContractExpiry: vi.fn(),
}))

import {
  enrichEmployeeAlertsWithCompanyData,
  filterEmployeeAlertsByPriority,
  filterEmployeeAlertsByType,
  getEmployeeAlertsStats,
  getUrgentEmployeeAlerts,
  getExpiredEmployeeAlerts,
} from '@/utils/employeeAlerts/employeeAlertHelpers'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeAlert(
  overrides: Partial<EmployeeAlert> & { empId?: string; empCompanyId?: string } = {}
): EmployeeAlert {
  const { empId, empCompanyId, ...rest } = overrides
  return {
    id: 'al1',
    type: 'contract_expiry',
    priority: 'medium',
    title: 'تنبيه',
    message: 'رسالة',
    employee: {
      id: empId ?? 'e1',
      name: 'موظف',
      profession: 'مهندس',
      nationality: 'Saudi',
      company_id: empCompanyId ?? 'c1',
    },
    company: { id: 'c1', name: 'شركة أ' },
    action_required: 'اتخذ إجراء',
    created_at: '2026-01-15T00:00:00Z',
    ...rest,
  }
}

function makeCompany(id: string, extras: Partial<Company> = {}): Company {
  return {
    id,
    name: `شركة-${id}`,
    commercial_registration_expiry: '2027-01-01',
    unified_number: 12345,
    ...extras,
  } as unknown as Company
}

// ─── enrichEmployeeAlertsWithCompanyData ──────────────────────────────────────

describe('enrichEmployeeAlertsWithCompanyData', () => {
  it('enriches alert with matching company data', () => {
    const alert = makeAlert({ empCompanyId: 'c1' })
    const company = makeCompany('c1', { name: 'الشركة الكبرى', unified_number: 99 })

    const result = enrichEmployeeAlertsWithCompanyData([alert], [company])

    expect(result[0].company.name).toBe('الشركة الكبرى')
    expect(result[0].company.unified_number).toBe(99)
    expect(result[0].company.id).toBe('c1')
  })

  it('no matching company → keeps original alert unchanged', () => {
    const alert = makeAlert({ empCompanyId: 'c-unknown' })
    const result = enrichEmployeeAlertsWithCompanyData([alert], [makeCompany('c-other')])
    expect(result[0]).toEqual(alert)
  })

  it('multiple alerts — each enriched independently', () => {
    const alerts = [
      makeAlert({ id: 'a1', empId: 'e1', empCompanyId: 'c1' }),
      makeAlert({ id: 'a2', empId: 'e2', empCompanyId: 'c2' }),
    ]
    const companies = [makeCompany('c1', { name: 'شركة 1' }), makeCompany('c2', { name: 'شركة 2' })]

    const result = enrichEmployeeAlertsWithCompanyData(alerts, companies)

    expect(result[0].company.name).toBe('شركة 1')
    expect(result[1].company.name).toBe('شركة 2')
  })

  it('empty alerts → empty result', () => {
    expect(enrichEmployeeAlertsWithCompanyData([], [makeCompany('c1')])).toHaveLength(0)
  })
})

// ─── filterEmployeeAlertsByPriority ──────────────────────────────────────────

describe('filterEmployeeAlertsByPriority', () => {
  it('empty priorities → returns all alerts', () => {
    const alerts = [makeAlert({ priority: 'urgent' }), makeAlert({ priority: 'low' })]
    expect(filterEmployeeAlertsByPriority(alerts, [])).toHaveLength(2)
  })

  it('filter by urgent', () => {
    const alerts = [makeAlert({ id: 'u', priority: 'urgent' }), makeAlert({ id: 'm', priority: 'medium' })]
    const result = filterEmployeeAlertsByPriority(alerts, ['urgent'])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('u')
  })

  it('filter by multiple priorities', () => {
    const alerts = [
      makeAlert({ priority: 'urgent' }),
      makeAlert({ priority: 'high' }),
      makeAlert({ priority: 'low' }),
    ]
    expect(filterEmployeeAlertsByPriority(alerts, ['urgent', 'high'])).toHaveLength(2)
  })

  it('no match → empty array', () => {
    expect(filterEmployeeAlertsByPriority([makeAlert({ priority: 'low' })], ['urgent'])).toHaveLength(0)
  })
})

// ─── filterEmployeeAlertsByType ───────────────────────────────────────────────

describe('filterEmployeeAlertsByType', () => {
  it('filter contract_expiry', () => {
    const alerts = [
      makeAlert({ id: 'c', type: 'contract_expiry' }),
      makeAlert({ id: 'r', type: 'residence_expiry' }),
    ]
    const result = filterEmployeeAlertsByType(alerts, 'contract_expiry')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('c')
  })

  it('filter residence_expiry', () => {
    const alerts = [
      makeAlert({ type: 'contract_expiry' }),
      makeAlert({ id: 'r1', type: 'residence_expiry' }),
      makeAlert({ id: 'r2', type: 'residence_expiry' }),
    ]
    expect(filterEmployeeAlertsByType(alerts, 'residence_expiry')).toHaveLength(2)
  })

  it('no match → empty array', () => {
    expect(
      filterEmployeeAlertsByType([makeAlert({ type: 'contract_expiry' })], 'health_insurance_expiry')
    ).toHaveLength(0)
  })
})

// ─── getEmployeeAlertsStats ───────────────────────────────────────────────────

describe('getEmployeeAlertsStats', () => {
  it('empty → all zeros', () => {
    const stats = getEmployeeAlertsStats([])
    expect(stats.total).toBe(0)
    expect(stats.totalAlerts).toBe(0)
    expect(stats.urgent).toBe(0)
  })

  it('total = unique employees, totalAlerts = raw count', () => {
    // 2 alerts from same employee
    const alerts = [
      makeAlert({ id: 'a1', empId: 'e1', priority: 'urgent' }),
      makeAlert({ id: 'a2', empId: 'e1', priority: 'low' }),
    ]
    const stats = getEmployeeAlertsStats(alerts)
    expect(stats.totalAlerts).toBe(2)
    expect(stats.total).toBe(1)
  })

  it('per-employee max priority: low + urgent same employee → counted as urgent', () => {
    const alerts = [
      makeAlert({ id: 'a1', empId: 'e1', priority: 'low' }),
      makeAlert({ id: 'a2', empId: 'e1', priority: 'urgent' }),
    ]
    const stats = getEmployeeAlertsStats(alerts)
    expect(stats.urgent).toBe(1)
    expect(stats.low).toBe(0)
  })

  it('two employees with different priorities counted separately', () => {
    const alerts = [
      makeAlert({ id: 'a1', empId: 'e1', priority: 'high' }),
      makeAlert({ id: 'a2', empId: 'e2', priority: 'medium' }),
    ]
    const stats = getEmployeeAlertsStats(alerts)
    expect(stats.total).toBe(2)
    expect(stats.high).toBe(1)
    expect(stats.medium).toBe(1)
  })

  it('type breakdown counts', () => {
    const alerts = [
      makeAlert({ type: 'contract_expiry', empId: 'e1' }),
      makeAlert({ type: 'contract_expiry', empId: 'e2' }),
      makeAlert({ type: 'residence_expiry', empId: 'e3' }),
      makeAlert({ type: 'health_insurance_expiry', empId: 'e4' }),
      makeAlert({ type: 'hired_worker_contract_expiry', empId: 'e5' }),
    ]
    const stats = getEmployeeAlertsStats(alerts)
    expect(stats.contractAlerts).toBe(2)
    expect(stats.residenceAlerts).toBe(1)
    expect(stats.healthInsuranceAlerts).toBe(1)
    expect(stats.hiredWorkerContractAlerts).toBe(1)
  })
})

// ─── getUrgentEmployeeAlerts ─────────────────────────────────────────────────

describe('getUrgentEmployeeAlerts', () => {
  it('includes urgent and high, excludes medium and low', () => {
    const alerts = [
      makeAlert({ id: 'u', priority: 'urgent' }),
      makeAlert({ id: 'h', priority: 'high' }),
      makeAlert({ id: 'm', priority: 'medium' }),
      makeAlert({ id: 'l', priority: 'low' }),
    ]
    const result = getUrgentEmployeeAlerts(alerts)
    const ids = result.map((a) => a.id)
    expect(ids).toContain('u')
    expect(ids).toContain('h')
    expect(ids).not.toContain('m')
    expect(ids).not.toContain('l')
  })
})

// ─── getExpiredEmployeeAlerts ─────────────────────────────────────────────────

describe('getExpiredEmployeeAlerts', () => {
  it('days_remaining < 0 → included', () => {
    const result = getExpiredEmployeeAlerts([makeAlert({ days_remaining: -1 })])
    expect(result).toHaveLength(1)
  })

  it('days_remaining === 0 → NOT included', () => {
    expect(getExpiredEmployeeAlerts([makeAlert({ days_remaining: 0 })])).toHaveLength(0)
  })

  it('days_remaining undefined → NOT included', () => {
    expect(getExpiredEmployeeAlerts([makeAlert({ days_remaining: undefined })])).toHaveLength(0)
  })
})
