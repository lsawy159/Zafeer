import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getStatusText,
  getStatusDescription,
  getStatusIcon,
  getStatusCategory,
  getStatusColorForFilters,
  getShortStatusText,
  calculateCommercialRegStats,
} from '@/utils/commercialRegistration'

// ─── getStatusText ────────────────────────────────────────────────────────────

describe('getStatusText', () => {
  it('days = -1 → منتهي (منذ يوم)', () => {
    expect(getStatusText(-1)).toBe('منتهي (منذ يوم)')
  })

  it('days = -5 → منتهي (منذ 5 يوم)', () => {
    expect(getStatusText(-5)).toBe('منتهي (منذ 5 يوم)')
  })

  it('days = 0 → ينتهي اليوم', () => {
    expect(getStatusText(0)).toBe('ينتهي اليوم')
  })

  it('days = 1 → باقي يوم واحد', () => {
    expect(getStatusText(1)).toBe('باقي يوم واحد')
  })

  it('days = 15 → باقي 15 يوم', () => {
    expect(getStatusText(15)).toContain('15')
  })

  it('days = 30 → باقي 30 يوم', () => {
    expect(getStatusText(30)).toContain('30')
  })

  it('days = 31 → ساري', () => {
    expect(getStatusText(31)).toContain('ساري')
  })

  it('days = 90 → ساري', () => {
    expect(getStatusText(90)).toContain('ساري')
  })
})

// ─── getStatusDescription ─────────────────────────────────────────────────────

describe('getStatusDescription', () => {
  it('days = -1 → منتهي منذ يوم واحد', () => {
    expect(getStatusDescription(-1)).toBe('منتهي منذ يوم واحد')
  })

  it('days = -7 → منتهي منذ 7 يوم', () => {
    expect(getStatusDescription(-7)).toBe('منتهي منذ 7 يوم')
  })

  it('days = 0 → ينتهي اليوم', () => {
    expect(getStatusDescription(0)).toContain('اليوم')
  })

  it('days = 1 → غداً', () => {
    expect(getStatusDescription(1)).toContain('غداً')
  })

  it('days = 5 → خلال أسبوع', () => {
    expect(getStatusDescription(5)).toContain('أسبوع')
  })

  it('days = 20 → خلال شهر', () => {
    expect(getStatusDescription(20)).toContain('شهر')
  })

  it('days = 50 → خلال شهرين', () => {
    expect(getStatusDescription(50)).toContain('شهرين')
  })

  it('days = 100 → ساري', () => {
    expect(getStatusDescription(100)).toContain('ساري')
  })
})

// ─── getStatusIcon ────────────────────────────────────────────────────────────

describe('getStatusIcon', () => {
  it('expired → ❌', () => expect(getStatusIcon(-1)).toBe('❌'))
  it('≤ 30 days → ⚠️', () => expect(getStatusIcon(15)).toBe('⚠️'))
  it('0 days → ⚠️', () => expect(getStatusIcon(0)).toBe('⚠️'))
  it('30 days → ⚠️', () => expect(getStatusIcon(30)).toBe('⚠️'))
  it('31-60 days → 🟡', () => expect(getStatusIcon(45)).toBe('🟡'))
  it('> 60 days → ✅', () => expect(getStatusIcon(61)).toBe('✅'))
})

// ─── getStatusCategory ────────────────────────────────────────────────────────

describe('getStatusCategory', () => {
  it('days = -1 → expired', () => expect(getStatusCategory(-1)).toBe('expired'))
  it('days = 0 → expired (≤ 30)', () => expect(getStatusCategory(0)).toBe('expired'))
  it('days = 30 → expired (≤ 30)', () => expect(getStatusCategory(30)).toBe('expired'))
  it('days = 31 → expiring_soon', () => expect(getStatusCategory(31)).toBe('expiring_soon'))
  it('days = 60 → expiring_soon', () => expect(getStatusCategory(60)).toBe('expiring_soon'))
  it('days = 61 → valid', () => expect(getStatusCategory(61)).toBe('valid'))
  it('days = 365 → valid', () => expect(getStatusCategory(365)).toBe('valid'))
})

// ─── getStatusColorForFilters ─────────────────────────────────────────────────

describe('getStatusColorForFilters', () => {
  it('expired → red classes', () => {
    expect(getStatusColorForFilters(-5)).toContain('red')
  })

  it('≤ 30 → red classes', () => {
    expect(getStatusColorForFilters(15)).toContain('red')
  })

  it('31-60 → yellow classes', () => {
    expect(getStatusColorForFilters(45)).toContain('yellow')
  })

  it('> 60 → blue classes', () => {
    expect(getStatusColorForFilters(90)).toContain('blue')
  })
})

// ─── getShortStatusText ───────────────────────────────────────────────────────

describe('getShortStatusText', () => {
  it('days = -1 → منتهي (1 يوم)', () => {
    expect(getShortStatusText(-1)).toBe('منتهي (1 يوم)')
  })

  it('days = -3 → منتهي (3 يوم)', () => {
    expect(getShortStatusText(-3)).toContain('منتهي')
    expect(getShortStatusText(-3)).toContain('3')
  })

  it('days = 1 → ينتهي غداً', () => {
    expect(getShortStatusText(1)).toBe('ينتهي غداً')
  })

  it('days = 15 → باقي 15 يوم', () => {
    expect(getShortStatusText(15)).toContain('15')
  })

  it('days = 45 → ساري (45 يوم)', () => {
    expect(getShortStatusText(45)).toContain('45')
    expect(getShortStatusText(45)).toContain('ساري')
  })

  it('days = 90 → ساري (90+ يوم)', () => {
    expect(getShortStatusText(90)).toContain('90')
    expect(getShortStatusText(90)).toContain('ساري')
  })
})

// ─── calculateCommercialRegStats ─────────────────────────────────────────────
// uses calculateDaysRemaining(date) which uses new Date() → fake timers needed

describe('calculateCommercialRegStats', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('empty array → all zeros', () => {
    const stats = calculateCommercialRegStats([])
    expect(stats.total).toBe(0)
    expect(stats.expired).toBe(0)
    expect(stats.valid).toBe(0)
    expect(stats.percentageValid).toBe(0)
  })

  it('company with null expiry → skipped (not counted in any category)', () => {
    const stats = calculateCommercialRegStats([{ commercial_registration_expiry: null }])
    expect(stats.total).toBe(1)
    expect(stats.expired + stats.expiringSoon + stats.valid).toBe(0)
  })

  it('expired company (days < 0) → expired', () => {
    const stats = calculateCommercialRegStats([{ commercial_registration_expiry: '2026-01-10' }])
    expect(stats.expired).toBe(1)
  })

  it('≤ 30 days remaining → expired bucket (category "expired" includes < 30 days)', () => {
    const stats = calculateCommercialRegStats([{ commercial_registration_expiry: '2026-01-25' }])
    // 10 days remaining → ≤30 → getStatusCategory returns 'expired'
    expect(stats.expired).toBe(1)
  })

  it('31-60 days → expiringSoon', () => {
    const stats = calculateCommercialRegStats([{ commercial_registration_expiry: '2026-02-28' }])
    // ~44 days → expiring_soon
    expect(stats.expiringSoon).toBe(1)
  })

  it('>60 days → valid', () => {
    const stats = calculateCommercialRegStats([{ commercial_registration_expiry: '2026-06-01' }])
    expect(stats.valid).toBe(1)
  })

  it('calculates percentages correctly', () => {
    const companies = [
      { commercial_registration_expiry: '2026-06-01' }, // valid
      { commercial_registration_expiry: '2026-06-01' }, // valid
      { commercial_registration_expiry: '2026-01-10' }, // expired
      { commercial_registration_expiry: '2026-01-10' }, // expired
    ]
    const stats = calculateCommercialRegStats(companies)
    expect(stats.total).toBe(4)
    expect(stats.valid).toBe(2)
    expect(stats.expired).toBe(2)
    expect(stats.percentageValid).toBe(50)
    expect(stats.percentageExpired).toBe(50)
  })
})
