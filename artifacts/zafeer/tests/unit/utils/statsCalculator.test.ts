import { describe, it, expect } from 'vitest'
import {
  classifyCompany,
  classifyEmployee,
  calculateCompanyMissingData,
  calculateEmployeeMissingDocs,
  predicates,
} from '@/utils/statsCalculator'
import type { StatsCompanyRow, StatsEmployeeRow } from '@/types/statsTypes'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TODAY = new Date('2026-01-15T00:00:00.000Z')

function makeCompany(overrides: Partial<StatsCompanyRow> = {}): StatsCompanyRow {
  return {
    id: 'c1',
    name: 'شركة',
    commercial_registration_expiry: '2027-01-15',
    ending_subscription_power_date: '2027-01-15',
    ending_subscription_moqeem_date: '2027-01-15',
    labor_subscription_number: 'LAB-001',
    social_insurance_number: 'SOC-001',
    ...overrides,
  }
}

function makeEmployee(overrides: Partial<StatsEmployeeRow> = {}): StatsEmployeeRow {
  return {
    id: 'e1',
    name: 'موظف',
    residence_expiry: '2027-01-15',
    contract_expiry: '2027-01-15',
    hired_worker_contract_expiry: '2027-01-15',
    health_insurance_expiry: '2027-01-15',
    salary: 3000,
    profession: 'مهندس',
    bank_account: 'SA1234',
    residence_image_url: 'https://bucket/file.jpg',
    company_unified_number: 12345,
    is_deleted: false,
    ...overrides,
  }
}

// ─── classifyCompany ──────────────────────────────────────────────────────────

describe('classifyCompany', () => {
  it('all dates present and future → healthy', () => {
    expect(classifyCompany(makeCompany(), TODAY)).toBe('healthy')
  })

  it('commercial_registration_expiry missing (null) → missing', () => {
    expect(classifyCompany(makeCompany({ commercial_registration_expiry: null }), TODAY)).toBe('missing')
  })

  it('commercial_registration_expiry empty string → missing', () => {
    expect(classifyCompany(makeCompany({ commercial_registration_expiry: '' }), TODAY)).toBe('missing')
  })

  it('power date missing → missing (even if others are valid)', () => {
    expect(classifyCompany(makeCompany({ ending_subscription_power_date: null }), TODAY)).toBe('missing')
  })

  it('moqeem date missing → missing', () => {
    expect(classifyCompany(makeCompany({ ending_subscription_moqeem_date: undefined }), TODAY)).toBe('missing')
  })

  it('commercial reg expired → damaged', () => {
    expect(classifyCompany(makeCompany({ commercial_registration_expiry: '2026-01-14' }), TODAY)).toBe('damaged')
  })

  it('power subscription expired → damaged', () => {
    expect(classifyCompany(makeCompany({ ending_subscription_power_date: '2025-12-01' }), TODAY)).toBe('damaged')
  })

  it('missing takes priority over expired (both missing and expired) → missing', () => {
    // commercial missing, power expired
    expect(classifyCompany(makeCompany({
      commercial_registration_expiry: null,
      ending_subscription_power_date: '2025-01-01',
    }), TODAY)).toBe('missing')
  })
})

// ─── classifyEmployee ─────────────────────────────────────────────────────────

describe('classifyEmployee', () => {
  it('all dates present and future → healthy', () => {
    expect(classifyEmployee(makeEmployee(), TODAY)).toBe('healthy')
  })

  it('residence_expiry null → missing', () => {
    expect(classifyEmployee(makeEmployee({ residence_expiry: null }), TODAY)).toBe('missing')
  })

  it('contract_expiry empty → missing', () => {
    expect(classifyEmployee(makeEmployee({ contract_expiry: '' }), TODAY)).toBe('missing')
  })

  it('health_insurance expired → damaged', () => {
    expect(classifyEmployee(makeEmployee({ health_insurance_expiry: '2026-01-10' }), TODAY)).toBe('damaged')
  })

  it('hired_worker_contract expired → damaged', () => {
    expect(classifyEmployee(makeEmployee({ hired_worker_contract_expiry: '2025-06-01' }), TODAY)).toBe('damaged')
  })

  it('missing takes priority over damaged', () => {
    expect(classifyEmployee(makeEmployee({
      residence_expiry: null,
      contract_expiry: '2020-01-01', // expired too
    }), TODAY)).toBe('missing')
  })
})

// ─── calculateCompanyMissingData ──────────────────────────────────────────────

describe('calculateCompanyMissingData', () => {
  it('empty array → all zeros', () => {
    const result = calculateCompanyMissingData([])
    expect(result.commercial_reg).toBe(0)
    expect(result.any_missing).toBe(0)
  })

  it('fully complete company → no missing', () => {
    const result = calculateCompanyMissingData([makeCompany()])
    expect(result.commercial_reg).toBe(0)
    expect(result.power_subscription).toBe(0)
    expect(result.moqeem_subscription).toBe(0)
    expect(result.labor_subscription).toBe(0)
    expect(result.social_insurance).toBe(0)
    expect(result.any_missing).toBe(0)
  })

  it('company with null commercial_reg → commercial_reg=1, any_missing=1', () => {
    const result = calculateCompanyMissingData([makeCompany({ commercial_registration_expiry: null })])
    expect(result.commercial_reg).toBe(1)
    expect(result.any_missing).toBe(1)
  })

  it('company with empty labor_subscription_number → labor_subscription=1', () => {
    const result = calculateCompanyMissingData([makeCompany({ labor_subscription_number: '' })])
    expect(result.labor_subscription).toBe(1)
    expect(result.any_missing).toBe(1)
  })

  it('company missing multiple fields → any_missing=1 (counted once per company)', () => {
    const result = calculateCompanyMissingData([makeCompany({
      commercial_registration_expiry: null,
      ending_subscription_power_date: null,
    })])
    expect(result.commercial_reg).toBe(1)
    expect(result.power_subscription).toBe(1)
    expect(result.any_missing).toBe(1) // same company, counted once
  })

  it('2 companies each missing different field → any_missing=2', () => {
    const result = calculateCompanyMissingData([
      makeCompany({ commercial_registration_expiry: null }),
      makeCompany({ social_insurance_number: null }),
    ])
    expect(result.any_missing).toBe(2)
  })
})

// ─── calculateEmployeeMissingDocs ─────────────────────────────────────────────

describe('calculateEmployeeMissingDocs', () => {
  it('empty array → all zeros', () => {
    const result = calculateEmployeeMissingDocs([])
    expect(result.residence).toBe(0)
    expect(result.salary).toBe(0)
  })

  it('fully complete active employee → no missing', () => {
    const result = calculateEmployeeMissingDocs([makeEmployee()])
    expect(result.residence).toBe(0)
    expect(result.contract).toBe(0)
    expect(result.health_insurance).toBe(0)
    expect(result.salary).toBe(0)
    expect(result.profession).toBe(0)
  })

  it('is_deleted=true → skipped entirely', () => {
    const result = calculateEmployeeMissingDocs([makeEmployee({
      is_deleted: true,
      residence_expiry: null,
      salary: 0,
    })])
    expect(result.residence).toBe(0)
    expect(result.salary).toBe(0)
  })

  it('salary = 0 → counted as missing', () => {
    expect(calculateEmployeeMissingDocs([makeEmployee({ salary: 0 })]).salary).toBe(1)
  })

  it('salary = null → counted as missing', () => {
    expect(calculateEmployeeMissingDocs([makeEmployee({ salary: null })]).salary).toBe(1)
  })

  it('residence_expiry null → counted as missing', () => {
    expect(calculateEmployeeMissingDocs([makeEmployee({ residence_expiry: null })]).residence).toBe(1)
  })

  it('empty bank_account → counted as missing', () => {
    expect(calculateEmployeeMissingDocs([makeEmployee({ bank_account: '' })]).bank_account).toBe(1)
  })

  it('company_unified_number null → counted', () => {
    expect(calculateEmployeeMissingDocs([makeEmployee({ company_unified_number: null })]).company_unified_number).toBe(1)
  })

  it('mixes active and deleted employees', () => {
    const result = calculateEmployeeMissingDocs([
      makeEmployee({ is_deleted: false, residence_expiry: null }),
      makeEmployee({ is_deleted: true, residence_expiry: null }), // skipped
    ])
    expect(result.residence).toBe(1) // only active counted
  })
})

// ─── predicates ───────────────────────────────────────────────────────────────

describe('predicates', () => {
  it('isMissingCommercialReg: true when null', () => {
    expect(predicates.isMissingCommercialReg(makeCompany({ commercial_registration_expiry: null }))).toBe(true)
  })

  it('isMissingCommercialReg: false when set', () => {
    expect(predicates.isMissingCommercialReg(makeCompany())).toBe(false)
  })

  it('isMissingSalary: true when salary=0', () => {
    expect(predicates.isMissingSalary(makeEmployee({ salary: 0 }))).toBe(true)
  })

  it('isMissingSalary: false for deleted employee', () => {
    expect(predicates.isMissingSalary(makeEmployee({ salary: 0, is_deleted: true }))).toBe(false)
  })

  it('isMissingResidenceDate: true for null expiry on active employee', () => {
    expect(predicates.isMissingResidenceDate(makeEmployee({ residence_expiry: null }))).toBe(true)
  })

  it('isMissingProfession: true for empty profession', () => {
    expect(predicates.isMissingProfession(makeEmployee({ profession: '' }))).toBe(true)
  })
})
