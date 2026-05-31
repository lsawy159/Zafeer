import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  checkContractExpiry,
  checkResidenceExpiry,
  checkHealthInsuranceExpiry,
  checkHiredWorkerContractExpiry,
} from '@/utils/employeeAlerts/employeeExpiryChecks'
import type { Employee } from '@/lib/supabase'

vi.mock('@/utils/employeeAlerts/employeeAlertThresholds', () => ({
  getEmployeeNotificationThresholdsPublic: vi.fn().mockResolvedValue({
    contract_urgent_days: 7,
    contract_high_days: 15,
    contract_medium_days: 30,
    residence_urgent_days: 7,
    residence_high_days: 15,
    residence_medium_days: 30,
    health_insurance_urgent_days: 30,
    health_insurance_high_days: 45,
    health_insurance_medium_days: 60,
    hired_worker_contract_urgent_days: 7,
    hired_worker_contract_high_days: 15,
    hired_worker_contract_medium_days: 30,
  }),
  DEFAULT_EMPLOYEE_THRESHOLDS: {},
  invalidateEmployeeNotificationThresholdsCache: vi.fn(),
  EmployeeAlert: undefined,
}))
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'e1',
    company_id: 'c1',
    name: 'محمد علي',
    profession: 'مهندس',
    nationality: 'سعودي',
    birth_date: '1990-01-01',
    phone: '0500000000',
    residence_number: 1234567890,
    joining_date: '2023-01-01',
    residence_expiry: '2027-01-01',
    ...overrides,
  }
}

// system time: 2026-01-15 UTC midnight
// date reference points (days from today):
//   -5  → 2026-01-10  (expired)
//    5  → 2026-01-20  (urgent ≤7)
//   10  → 2026-01-25  (high ≤15)
//   25  → 2026-02-09  (medium ≤30)
//   35  → 2026-02-19  (beyond 30 → null)
//   25  → 2026-02-09  (urgent ≤30 for health_insurance)
//   45  → 2026-03-01  (high ≤45 for health_insurance)
//   60  → 2026-03-16  (medium ≤60 for health_insurance)
//   61  → 2026-03-17  (beyond 60 → null for health_insurance)
const SYSTEM_DATE = new Date('2026-01-15T00:00:00.000Z')

describe('employeeExpiryChecks', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(SYSTEM_DATE)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ─── checkContractExpiry ────────────────────────────────────────────────────

  describe('checkContractExpiry', () => {
    it('returns null when no contract_expiry', async () => {
      const result = await checkContractExpiry(makeEmployee())
      expect(result).toBeNull()
    })

    it('returns null when expiry > 30 days', async () => {
      const result = await checkContractExpiry(
        makeEmployee({ contract_expiry: '2026-02-19' }),
      )
      expect(result).toBeNull()
    })

    it('returns urgent + expired title when daysRemaining < 0', async () => {
      const result = await checkContractExpiry(
        makeEmployee({ contract_expiry: '2026-01-10' }),
      )
      expect(result).not.toBeNull()
      expect(result!.priority).toBe('urgent')
      expect(result!.title).toBe('عقد منتهي')
      expect(result!.days_remaining).toBe(-5)
      expect(result!.message).toContain('منذ 5 يوم')
      expect(result!.message).toContain('محمد علي')
    })

    it('returns urgent when daysRemaining <= 7', async () => {
      const result = await checkContractExpiry(
        makeEmployee({ contract_expiry: '2026-01-20' }),
      )
      expect(result!.priority).toBe('urgent')
      expect(result!.title).toBe('انتهاء عقد')
      expect(result!.days_remaining).toBe(5)
    })

    it('returns high when daysRemaining <= 15', async () => {
      const result = await checkContractExpiry(
        makeEmployee({ contract_expiry: '2026-01-25' }),
      )
      expect(result!.priority).toBe('high')
    })

    it('returns medium when daysRemaining <= 30', async () => {
      const result = await checkContractExpiry(
        makeEmployee({ contract_expiry: '2026-02-09' }),
      )
      expect(result!.priority).toBe('medium')
    })

    it('returns correct id, type, and employee snapshot', async () => {
      const result = await checkContractExpiry(
        makeEmployee({ contract_expiry: '2026-01-25' }),
      )
      expect(result!.id).toBe('contract_e1_2026-01-25')
      expect(result!.type).toBe('contract_expiry')
      expect(result!.employee.id).toBe('e1')
      expect(result!.employee.name).toBe('محمد علي')
      expect(result!.expiry_date).toBe('2026-01-25')
    })
  })

  // ─── checkResidenceExpiry ───────────────────────────────────────────────────

  describe('checkResidenceExpiry', () => {
    it('returns null when expiry > 30 days', async () => {
      const result = await checkResidenceExpiry(
        makeEmployee({ residence_expiry: '2026-02-19' }),
      )
      expect(result).toBeNull()
    })

    it('returns urgent + expired title when daysRemaining < 0', async () => {
      const result = await checkResidenceExpiry(
        makeEmployee({ residence_expiry: '2026-01-10' }),
      )
      expect(result).not.toBeNull()
      expect(result!.priority).toBe('urgent')
      expect(result!.title).toBe('إقامة منتهية الصلاحية')
      expect(result!.days_remaining).toBe(-5)
      expect(result!.message).toContain('منذ 5 يوم')
    })

    it('returns urgent when daysRemaining <= 7', async () => {
      const result = await checkResidenceExpiry(
        makeEmployee({ residence_expiry: '2026-01-20' }),
      )
      expect(result!.priority).toBe('urgent')
      expect(result!.type).toBe('residence_expiry')
    })

    it('returns high when daysRemaining <= 15', async () => {
      const result = await checkResidenceExpiry(
        makeEmployee({ residence_expiry: '2026-01-25' }),
      )
      expect(result!.priority).toBe('high')
    })

    it('returns medium when daysRemaining <= 30', async () => {
      const result = await checkResidenceExpiry(
        makeEmployee({ residence_expiry: '2026-02-09' }),
      )
      expect(result!.priority).toBe('medium')
    })

    it('correct id format', async () => {
      const result = await checkResidenceExpiry(
        makeEmployee({ residence_expiry: '2026-01-25' }),
      )
      expect(result!.id).toBe('residence_e1_2026-01-25')
    })
  })

  // ─── checkHealthInsuranceExpiry ─────────────────────────────────────────────

  describe('checkHealthInsuranceExpiry', () => {
    it('returns null when no health_insurance_expiry', async () => {
      const result = await checkHealthInsuranceExpiry(makeEmployee())
      expect(result).toBeNull()
    })

    it('returns null when expiry > 60 days', async () => {
      // 2026-03-17 = +61 days
      const result = await checkHealthInsuranceExpiry(
        makeEmployee({ health_insurance_expiry: '2026-03-17' }),
      )
      expect(result).toBeNull()
    })

    it('returns urgent + expired title when daysRemaining < 0', async () => {
      const result = await checkHealthInsuranceExpiry(
        makeEmployee({ health_insurance_expiry: '2026-01-10' }),
      )
      expect(result).not.toBeNull()
      expect(result!.priority).toBe('urgent')
      expect(result!.title).toBe('التأمين الصحي منتهي')
      expect(result!.type).toBe('health_insurance_expiry')
      expect(result!.message).toContain('منذ 5 يوم')
    })

    it('returns urgent when daysRemaining <= 30 (urgent threshold)', async () => {
      // 2026-02-09 = +25 days, health_insurance_urgent_days = 30
      const result = await checkHealthInsuranceExpiry(
        makeEmployee({ health_insurance_expiry: '2026-02-09' }),
      )
      expect(result!.priority).toBe('urgent')
      expect(result!.title).toBe('التأمين الصحي عاجل')
    })

    it('returns high when daysRemaining <= 45', async () => {
      // 2026-03-01 = +45 days
      const result = await checkHealthInsuranceExpiry(
        makeEmployee({ health_insurance_expiry: '2026-03-01' }),
      )
      expect(result!.priority).toBe('high')
    })

    it('returns medium when daysRemaining <= 60', async () => {
      // 2026-03-16 = +60 days
      const result = await checkHealthInsuranceExpiry(
        makeEmployee({ health_insurance_expiry: '2026-03-16' }),
      )
      expect(result!.priority).toBe('medium')
    })
  })

  // ─── checkHiredWorkerContractExpiry ─────────────────────────────────────────

  describe('checkHiredWorkerContractExpiry', () => {
    it('returns null when no hired_worker_contract_expiry', async () => {
      const result = await checkHiredWorkerContractExpiry(makeEmployee())
      expect(result).toBeNull()
    })

    it('returns null when expiry > 30 days', async () => {
      const result = await checkHiredWorkerContractExpiry(
        makeEmployee({ hired_worker_contract_expiry: '2026-02-19' }),
      )
      expect(result).toBeNull()
    })

    it('returns urgent + expired title when daysRemaining < 0', async () => {
      const result = await checkHiredWorkerContractExpiry(
        makeEmployee({ hired_worker_contract_expiry: '2026-01-10' }),
      )
      expect(result).not.toBeNull()
      expect(result!.priority).toBe('urgent')
      expect(result!.title).toBe('عقد أجير منتهي')
      expect(result!.type).toBe('hired_worker_contract_expiry')
      expect(result!.message).toContain('منذ 5 يوم')
    })

    it('returns urgent when daysRemaining <= 7', async () => {
      const result = await checkHiredWorkerContractExpiry(
        makeEmployee({ hired_worker_contract_expiry: '2026-01-20' }),
      )
      expect(result!.priority).toBe('urgent')
      expect(result!.title).toBe('انتهاء عقد أجير')
    })

    it('returns high when daysRemaining <= 15', async () => {
      const result = await checkHiredWorkerContractExpiry(
        makeEmployee({ hired_worker_contract_expiry: '2026-01-25' }),
      )
      expect(result!.priority).toBe('high')
    })

    it('returns medium when daysRemaining <= 30', async () => {
      const result = await checkHiredWorkerContractExpiry(
        makeEmployee({ hired_worker_contract_expiry: '2026-02-09' }),
      )
      expect(result!.priority).toBe('medium')
    })

    it('correct id format', async () => {
      const result = await checkHiredWorkerContractExpiry(
        makeEmployee({ hired_worker_contract_expiry: '2026-01-25' }),
      )
      expect(result!.id).toBe('hired_worker_contract_e1_2026-01-25')
      expect(result!.expiry_date).toBe('2026-01-25')
    })
  })
})
