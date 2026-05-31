import { describe, it, expect } from 'vitest'
import { calculateUnifiedStatus } from '@/utils/autoCompanyStatus/unifiedStatus'
import {
  calculateCommercialRegistrationStatus,
  calculateCommercialRegStats,
} from '@/utils/autoCompanyStatus/commercialRegStatus'
import {
  calculatePowerSubscriptionStatus,
  calculatePowerStats,
} from '@/utils/autoCompanyStatus/powerStatus'
import {
  calculateMoqeemSubscriptionStatus,
  calculateMoqeemStats,
  calculateCompanyStatusStats,
} from '@/utils/autoCompanyStatus/moqeemStatus'
import { DEFAULT_STATUS_THRESHOLDS } from '@/utils/autoCompanyStatus/statusThresholds'

// دالة مساعدة: تاريخ نسبي من اليوم
function dateFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const T = DEFAULT_STATUS_THRESHOLDS // urgent=7, high=15, medium=30

// ─── calculateUnifiedStatus (core logic) ─────────────────────────────────────

describe('calculateUnifiedStatus — حدود التصنيف', () => {
  it('daysRemaining = -1 → منتهي (انتهى منذ يوم)', () => {
    const r = calculateUnifiedStatus(-1, T.commercial_reg_urgent_days, T.commercial_reg_high_days, T.commercial_reg_medium_days, 'السجل')
    expect(r.status).toBe('منتهي')
    expect(r.priority).toBe('urgent')
  })

  it('daysRemaining = -30 → منتهي (انتهى منذ شهر)', () => {
    const r = calculateUnifiedStatus(-30, 7, 15, 30, 'السجل')
    expect(r.status).toBe('منتهي')
    expect(r.priority).toBe('urgent')
  })

  it('daysRemaining = 0 → طارئ (ينتهي اليوم)', () => {
    const r = calculateUnifiedStatus(0, 7, 15, 30, 'السجل')
    expect(r.status).toBe('طارئ')
    expect(r.priority).toBe('urgent')
    expect(r.description).toContain('اليوم')
  })

  it('daysRemaining = 1 → طارئ (ينتهي غداً)', () => {
    const r = calculateUnifiedStatus(1, 7, 15, 30, 'السجل')
    expect(r.status).toBe('طارئ')
    expect(r.description).toContain('غداً')
  })

  it('daysRemaining = 7 (= urgentDays) → طارئ', () => {
    const r = calculateUnifiedStatus(7, 7, 15, 30, 'السجل')
    expect(r.status).toBe('طارئ')
    expect(r.priority).toBe('urgent')
  })

  it('daysRemaining = 8 (> urgent, ≤ high) → عاجل', () => {
    const r = calculateUnifiedStatus(8, 7, 15, 30, 'السجل')
    expect(r.status).toBe('عاجل')
    expect(r.priority).toBe('high')
  })

  it('daysRemaining = 15 (= highDays) → عاجل', () => {
    const r = calculateUnifiedStatus(15, 7, 15, 30, 'السجل')
    expect(r.status).toBe('عاجل')
    expect(r.priority).toBe('high')
  })

  it('daysRemaining = 16 (> high, ≤ medium) → متوسط', () => {
    const r = calculateUnifiedStatus(16, 7, 15, 30, 'السجل')
    expect(r.status).toBe('متوسط')
    expect(r.priority).toBe('medium')
  })

  it('daysRemaining = 30 (= mediumDays) → متوسط', () => {
    const r = calculateUnifiedStatus(30, 7, 15, 30, 'السجل')
    expect(r.status).toBe('متوسط')
    expect(r.priority).toBe('medium')
  })

  it('daysRemaining = 31 (> medium) → ساري', () => {
    const r = calculateUnifiedStatus(31, 7, 15, 30, 'السجل')
    expect(r.status).toBe('ساري')
    expect(r.priority).toBe('low')
  })

  it('daysRemaining = 365 → ساري', () => {
    const r = calculateUnifiedStatus(365, 7, 15, 30, 'السجل')
    expect(r.status).toBe('ساري')
    expect(r.priority).toBe('low')
  })

  it('الوصف يحتوي على اسم العنصر', () => {
    const r = calculateUnifiedStatus(5, 7, 15, 30, 'مقيم')
    expect(r.description).toContain('مقيم')
  })

  it('الألوان محددة لكل حالة', () => {
    const expired = calculateUnifiedStatus(-1, 7, 15, 30, 'x')
    const valid = calculateUnifiedStatus(60, 7, 15, 30, 'x')
    expect(expired.color.backgroundColor).toContain('red')
    expect(valid.color.backgroundColor).toContain('green')
  })
})

// ─── calculateCommercialRegistrationStatus ────────────────────────────────────

describe('calculateCommercialRegistrationStatus', () => {
  it('null → غير محدد', () => {
    const r = calculateCommercialRegistrationStatus(null, T)
    expect(r.status).toBe('غير محدد')
    expect(r.priority).toBe('low')
  })

  it('undefined → غير محدد', () => {
    expect(calculateCommercialRegistrationStatus(undefined, T).status).toBe('غير محدد')
  })

  it('منتهي منذ أمس', () => {
    const r = calculateCommercialRegistrationStatus(dateFromNow(-1), T)
    expect(r.status).toBe('منتهي')
    expect(r.daysRemaining).toBeLessThan(0)
  })

  it('طارئ — خلال 5 أيام', () => {
    const r = calculateCommercialRegistrationStatus(dateFromNow(5), T)
    expect(r.status).toBe('طارئ')
  })

  it('ساري — خلال 90 يوم', () => {
    const r = calculateCommercialRegistrationStatus(dateFromNow(90), T)
    expect(r.status).toBe('ساري')
  })

  it('يقبل thresholds مخصصة', () => {
    const custom = { ...T, commercial_reg_medium_days: 60 }
    const r = calculateCommercialRegistrationStatus(dateFromNow(45), custom)
    expect(r.status).toBe('متوسط')
  })
})

// ─── calculatePowerSubscriptionStatus ────────────────────────────────────────

describe('calculatePowerSubscriptionStatus', () => {
  it('null → غير محدد', () => {
    expect(calculatePowerSubscriptionStatus(null, T).status).toBe('غير محدد')
  })

  it('منتهي منذ أسبوع', () => {
    const r = calculatePowerSubscriptionStatus(dateFromNow(-7), T)
    expect(r.status).toBe('منتهي')
  })

  it('ساري — خلال 60 يوم', () => {
    expect(calculatePowerSubscriptionStatus(dateFromNow(60), T).status).toBe('ساري')
  })
})

// ─── calculateMoqeemSubscriptionStatus ────────────────────────────────────────

describe('calculateMoqeemSubscriptionStatus', () => {
  it('null → غير محدد', () => {
    expect(calculateMoqeemSubscriptionStatus(null, T).status).toBe('غير محدد')
  })

  it('منتهي → urgent', () => {
    expect(calculateMoqeemSubscriptionStatus(dateFromNow(-3), T).priority).toBe('urgent')
  })

  it('ساري → low', () => {
    expect(calculateMoqeemSubscriptionStatus(dateFromNow(60), T).priority).toBe('low')
  })
})

// ─── calculateCommercialRegStats ──────────────────────────────────────────────

describe('calculateCommercialRegStats', () => {
  it('مصفوفة فارغة → كل الأرقام أصفار', () => {
    const s = calculateCommercialRegStats([])
    expect(s.total).toBe(0)
    expect(s.expired).toBe(0)
    expect(s.valid).toBe(0)
  })

  it('يُصنف منتهي + ساري بشكل صحيح', () => {
    const s = calculateCommercialRegStats([
      { commercial_registration_expiry: dateFromNow(-5) }, // منتهي
      { commercial_registration_expiry: dateFromNow(90) }, // ساري
      { commercial_registration_expiry: null },             // غير محدد
    ])
    expect(s.total).toBe(3)
    expect(s.expired).toBe(1)
    expect(s.valid).toBe(1)
    expect(s.notSpecified).toBe(1)
  })

  it('يحسب النسب المئوية', () => {
    const s = calculateCommercialRegStats([
      { commercial_registration_expiry: dateFromNow(90) },
      { commercial_registration_expiry: dateFromNow(90) },
    ])
    expect(s.percentageValid).toBe(100)
  })

  it('نسبة مئوية صفر لمصفوفة فارغة', () => {
    const s = calculateCommercialRegStats([])
    expect(s.percentageValid).toBe(0)
    expect(s.percentageExpired).toBe(0)
  })
})

// ─── calculateCompanyStatusStats ──────────────────────────────────────────────

describe('calculateCompanyStatusStats', () => {
  it('مصفوفة فارغة → كل الأرقام أصفار', () => {
    const s = calculateCompanyStatusStats([])
    expect(s.totalCompanies).toBe(0)
    expect(s.totalCriticalAlerts).toBe(0)
  })

  it('شركة منتهية السجل التجاري → تُحسب كـ expired', () => {
    const s = calculateCompanyStatusStats([
      {
        id: 'c1',
        name: 'شركة',
        commercial_registration_expiry: dateFromNow(-1),
      },
    ])
    expect(s.totalExpired).toBe(1)
  })

  it('شركة سارية → تُحسب كـ valid', () => {
    const s = calculateCompanyStatusStats([
      {
        id: 'c1',
        name: 'شركة',
        commercial_registration_expiry: dateFromNow(90),
        ending_subscription_power_date: dateFromNow(90),
        ending_subscription_moqeem_date: dateFromNow(90),
      },
    ])
    expect(s.totalValid).toBe(1)
    expect(s.totalExpired).toBe(0)
  })

  it('شركة طارئة في مقيم → تُحسب في totalCriticalAlerts', () => {
    const s = calculateCompanyStatusStats([
      {
        id: 'c1',
        name: 'شركة',
        commercial_registration_expiry: dateFromNow(90), // ساري
        ending_subscription_moqeem_date: dateFromNow(3), // طارئ
      },
    ])
    expect(s.totalCriticalAlerts).toBeGreaterThanOrEqual(1)
  })

  it('مجموع valid + urgent + high + medium + expired === totalCompanies', () => {
    const companies = [
      { id: '1', name: 'أ', commercial_registration_expiry: dateFromNow(-1) },
      { id: '2', name: 'ب', commercial_registration_expiry: dateFromNow(5) },
      { id: '3', name: 'ج', commercial_registration_expiry: dateFromNow(10) },
      { id: '4', name: 'د', commercial_registration_expiry: dateFromNow(20) },
      { id: '5', name: 'هـ', commercial_registration_expiry: dateFromNow(90) },
    ]
    const s = calculateCompanyStatusStats(companies)
    const total = s.totalExpired + s.totalUrgent + s.totalHigh + s.totalMedium + s.totalValid
    expect(total).toBe(s.totalCompanies)
  })
})

// ─── calculatePowerStats + calculateMoqeemStats ────────────────────────────────

describe('calculatePowerStats', () => {
  it('يُصنف شركة منتهية', () => {
    const s = calculatePowerStats([
      { ending_subscription_power_date: dateFromNow(-10) },
      { ending_subscription_power_date: dateFromNow(90) },
      { ending_subscription_power_date: null },
    ])
    expect(s.expired).toBe(1)
    expect(s.valid).toBe(1)
    expect(s.notSpecified).toBe(1)
  })
})

describe('calculateMoqeemStats', () => {
  it('يُصنف شركة ساريه', () => {
    const s = calculateMoqeemStats([
      { ending_subscription_moqeem_date: dateFromNow(60) },
    ])
    expect(s.valid).toBe(1)
    expect(s.percentageValid).toBe(100)
  })
})
