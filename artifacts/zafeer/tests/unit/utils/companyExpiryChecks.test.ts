import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  checkCommercialRegistrationExpiry,
  checkPowerSubscriptionExpiry,
  checkMoqeemSubscriptionExpiry,
} from '@/utils/alerts/companyExpiryChecks'
import type { Company } from '@/lib/supabase'

vi.mock('@/utils/alerts/alertThresholds', () => ({
  getNotificationThresholds: vi.fn().mockResolvedValue({
    commercial_reg_urgent_days: 7,
    commercial_reg_high_days: 15,
    commercial_reg_medium_days: 30,
    power_subscription_urgent_days: 7,
    power_subscription_high_days: 15,
    power_subscription_medium_days: 30,
    moqeem_subscription_urgent_days: 7,
    moqeem_subscription_high_days: 15,
    moqeem_subscription_medium_days: 30,
  }),
}))
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
vi.mock('@/components/alerts/AlertCard', () => ({}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 'c1',
    name: 'شركة الاختبار',
    unified_number: 1234567,
    labor_subscription_number: 'L001',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

// system time: 2026-01-15 UTC midnight
// date reference points (days from today):
//   -5  → 2026-01-10  (expired)
//    0  → 2026-01-15  (today)
//    1  → 2026-01-16  (tomorrow)
//    5  → 2026-01-20  (urgent ≤7)
//   10  → 2026-01-25  (high ≤15)
//   25  → 2026-02-09  (medium ≤30)
//   35  → 2026-02-19  (beyond medium → null)
const SYSTEM_DATE = new Date('2026-01-15T00:00:00.000Z')

describe('companyExpiryChecks', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(SYSTEM_DATE)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ─── checkCommercialRegistrationExpiry ──────────────────────────────────────

  describe('checkCommercialRegistrationExpiry', () => {
    it('returns null when no commercial_registration_expiry', async () => {
      const result = await checkCommercialRegistrationExpiry(makeCompany())
      expect(result).toBeNull()
    })

    it('returns null when expiry > 30 days away', async () => {
      const result = await checkCommercialRegistrationExpiry(
        makeCompany({ commercial_registration_expiry: '2026-02-19' }),
      )
      expect(result).toBeNull()
    })

    it('returns urgent + expired message when daysRemaining < 0', async () => {
      const result = await checkCommercialRegistrationExpiry(
        makeCompany({ commercial_registration_expiry: '2026-01-10' }),
      )
      expect(result).not.toBeNull()
      expect(result!.priority).toBe('urgent')
      expect(result!.days_remaining).toBe(-5)
      expect(result!.message).toContain('منذ 5 يوم')
      expect(result!.message).toContain('شركة الاختبار')
    })

    it('returns urgent + today message when daysRemaining = 0', async () => {
      const result = await checkCommercialRegistrationExpiry(
        makeCompany({ commercial_registration_expiry: '2026-01-15' }),
      )
      expect(result).not.toBeNull()
      expect(result!.priority).toBe('urgent')
      expect(result!.days_remaining).toBe(0)
      expect(result!.message).toContain('اليوم')
    })

    it('returns urgent + tomorrow message when daysRemaining = 1', async () => {
      const result = await checkCommercialRegistrationExpiry(
        makeCompany({ commercial_registration_expiry: '2026-01-16' }),
      )
      expect(result).not.toBeNull()
      expect(result!.priority).toBe('urgent')
      expect(result!.days_remaining).toBe(1)
      expect(result!.message).toContain('غداً')
    })

    it('returns urgent + urgentUpcoming message when daysRemaining <= 7', async () => {
      const result = await checkCommercialRegistrationExpiry(
        makeCompany({ commercial_registration_expiry: '2026-01-20' }),
      )
      expect(result).not.toBeNull()
      expect(result!.priority).toBe('urgent')
      expect(result!.days_remaining).toBe(5)
      expect(result!.message).toContain('5 أيام')
    })

    it('returns high + highUpcoming message when daysRemaining <= 15', async () => {
      const result = await checkCommercialRegistrationExpiry(
        makeCompany({ commercial_registration_expiry: '2026-01-25' }),
      )
      expect(result).not.toBeNull()
      expect(result!.priority).toBe('high')
      expect(result!.days_remaining).toBe(10)
      expect(result!.message).toContain('10 يوم')
    })

    it('returns medium + upcoming message when daysRemaining <= 30', async () => {
      const result = await checkCommercialRegistrationExpiry(
        makeCompany({ commercial_registration_expiry: '2026-02-09' }),
      )
      expect(result).not.toBeNull()
      expect(result!.priority).toBe('medium')
      expect(result!.days_remaining).toBe(25)
    })

    it('returns correct id, type, and company snapshot', async () => {
      const result = await checkCommercialRegistrationExpiry(
        makeCompany({ commercial_registration_expiry: '2026-01-25' }),
      )
      expect(result!.id).toBe('commercial_c1_2026-01-25')
      expect(result!.type).toBe('commercial_registration_expiry')
      expect(result!.title).toBe('انتهاء صلاحية السجل التجاري')
      expect(result!.company.id).toBe('c1')
      expect(result!.company.name).toBe('شركة الاختبار')
    })
  })

  // ─── checkPowerSubscriptionExpiry ───────────────────────────────────────────

  describe('checkPowerSubscriptionExpiry', () => {
    it('returns null when no ending_subscription_power_date', async () => {
      const result = await checkPowerSubscriptionExpiry(makeCompany())
      expect(result).toBeNull()
    })

    it('returns null when expiry > 30 days', async () => {
      const result = await checkPowerSubscriptionExpiry(
        makeCompany({ ending_subscription_power_date: '2026-02-19' }),
      )
      expect(result).toBeNull()
    })

    it('returns urgent when expired', async () => {
      const result = await checkPowerSubscriptionExpiry(
        makeCompany({ ending_subscription_power_date: '2026-01-10' }),
      )
      expect(result!.priority).toBe('urgent')
      expect(result!.type).toBe('power_subscription_expiry')
      expect(result!.id).toBe('power_c1_2026-01-10')
      expect(result!.message).toContain('منذ 5 يوم')
    })

    it('returns urgent when daysRemaining <= 7', async () => {
      const result = await checkPowerSubscriptionExpiry(
        makeCompany({ ending_subscription_power_date: '2026-01-20' }),
      )
      expect(result!.priority).toBe('urgent')
    })

    it('returns high when daysRemaining <= 15', async () => {
      const result = await checkPowerSubscriptionExpiry(
        makeCompany({ ending_subscription_power_date: '2026-01-25' }),
      )
      expect(result!.priority).toBe('high')
    })

    it('returns medium when daysRemaining <= 30', async () => {
      const result = await checkPowerSubscriptionExpiry(
        makeCompany({ ending_subscription_power_date: '2026-02-09' }),
      )
      expect(result!.priority).toBe('medium')
    })
  })

  // ─── checkMoqeemSubscriptionExpiry ──────────────────────────────────────────

  describe('checkMoqeemSubscriptionExpiry', () => {
    it('returns null when no ending_subscription_moqeem_date', async () => {
      const result = await checkMoqeemSubscriptionExpiry(makeCompany())
      expect(result).toBeNull()
    })

    it('returns null when expiry > 30 days', async () => {
      const result = await checkMoqeemSubscriptionExpiry(
        makeCompany({ ending_subscription_moqeem_date: '2026-02-19' }),
      )
      expect(result).toBeNull()
    })

    it('returns urgent when expired', async () => {
      const result = await checkMoqeemSubscriptionExpiry(
        makeCompany({ ending_subscription_moqeem_date: '2026-01-10' }),
      )
      expect(result!.priority).toBe('urgent')
      expect(result!.type).toBe('moqeem_subscription_expiry')
      expect(result!.id).toBe('moqeem_c1_2026-01-10')
      expect(result!.message).toContain('منذ 5 يوم')
    })

    it('returns urgent when daysRemaining <= 7', async () => {
      const result = await checkMoqeemSubscriptionExpiry(
        makeCompany({ ending_subscription_moqeem_date: '2026-01-20' }),
      )
      expect(result!.priority).toBe('urgent')
    })

    it('returns high when daysRemaining <= 15', async () => {
      const result = await checkMoqeemSubscriptionExpiry(
        makeCompany({ ending_subscription_moqeem_date: '2026-01-25' }),
      )
      expect(result!.priority).toBe('high')
    })

    it('returns medium when daysRemaining <= 30', async () => {
      const result = await checkMoqeemSubscriptionExpiry(
        makeCompany({ ending_subscription_moqeem_date: '2026-02-09' }),
      )
      expect(result!.priority).toBe('medium')
    })
  })
})
