import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  calculateInsuranceDaysRemaining,
  getInsuranceStatusColor,
  getInsuranceStatusText,
  getInsuranceStatusDescription,
  getInsuranceStatusIcon,
} from '@/utils/insuranceSubscription'

const TODAY = new Date('2026-01-15T00:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(TODAY)
})

afterEach(() => {
  vi.useRealTimers()
})

// ─── calculateInsuranceDaysRemaining ──────────────────────────────────────────

describe('calculateInsuranceDaysRemaining', () => {
  it('null → 0', () => expect(calculateInsuranceDaysRemaining(null)).toBe(0))
  it('undefined → 0', () => expect(calculateInsuranceDaysRemaining(undefined)).toBe(0))
  it('invalid string → 0', () => expect(calculateInsuranceDaysRemaining('not-a-date')).toBe(0))

  it('same day → 0', () => expect(calculateInsuranceDaysRemaining('2026-01-15')).toBe(0))
  it('tomorrow → 1', () => expect(calculateInsuranceDaysRemaining('2026-01-16')).toBe(1))
  it('+30 days', () => expect(calculateInsuranceDaysRemaining('2026-02-14')).toBe(30))
  it('+60 days', () => expect(calculateInsuranceDaysRemaining('2026-03-16')).toBe(60))
  it('yesterday → -1', () => expect(calculateInsuranceDaysRemaining('2026-01-14')).toBe(-1))
  it('past -30 days', () => expect(calculateInsuranceDaysRemaining('2025-12-16')).toBe(-30))

  it('accepts Date object', () => {
    expect(calculateInsuranceDaysRemaining(new Date('2026-01-22T00:00:00.000Z'))).toBe(7)
  })
})

// ─── getInsuranceStatusColor ──────────────────────────────────────────────────

describe('getInsuranceStatusColor', () => {
  it('days < 0 → red', () => {
    const c = getInsuranceStatusColor(-5)
    expect(c.backgroundColor).toContain('red')
    expect(c.textColor).toContain('red')
  })

  it('days = 0 → red (< 30)', () => {
    const c = getInsuranceStatusColor(0)
    expect(c.backgroundColor).toContain('red')
  })

  it('days = 29 → red (< 30)', () => {
    expect(getInsuranceStatusColor(29).backgroundColor).toContain('red')
  })

  it('days = 30 → yellow (≥ 30, ≤ 60)', () => {
    expect(getInsuranceStatusColor(30).backgroundColor).toContain('yellow')
  })

  it('days = 60 → yellow (≤ 60)', () => {
    expect(getInsuranceStatusColor(60).backgroundColor).toContain('yellow')
  })

  it('days = 61 → blue (> 60)', () => {
    expect(getInsuranceStatusColor(61).backgroundColor).toContain('blue')
  })

  it('returns object with 3 color keys', () => {
    const c = getInsuranceStatusColor(100)
    expect(c).toHaveProperty('backgroundColor')
    expect(c).toHaveProperty('textColor')
    expect(c).toHaveProperty('borderColor')
  })
})

// ─── getInsuranceStatusText ───────────────────────────────────────────────────

describe('getInsuranceStatusText', () => {
  it('days = -1 → منتهي (منذ يوم)', () => {
    expect(getInsuranceStatusText(-1)).toBe('منتهي (منذ يوم)')
  })

  it('days = -7 → منتهي (منذ 7 يوم)', () => {
    expect(getInsuranceStatusText(-7)).toContain('7')
    expect(getInsuranceStatusText(-7)).toContain('منتهي')
  })

  it('days = 0 → ينتهي اليوم', () => {
    expect(getInsuranceStatusText(0)).toBe('ينتهي اليوم')
  })

  it('days = 1 → باقي يوم واحد', () => {
    expect(getInsuranceStatusText(1)).toBe('باقي يوم واحد')
  })

  it('days = 20 → باقي 20 يوم', () => {
    expect(getInsuranceStatusText(20)).toContain('20')
  })

  it('days = 45 → ساري', () => {
    expect(getInsuranceStatusText(45)).toContain('ساري')
  })

  it('days = 90 → ساري', () => {
    expect(getInsuranceStatusText(90)).toContain('ساري')
  })
})

// ─── getInsuranceStatusDescription ───────────────────────────────────────────

describe('getInsuranceStatusDescription', () => {
  it('days = -1 → منتهي منذ يوم واحد', () => {
    expect(getInsuranceStatusDescription(-1)).toBe('منتهي منذ يوم واحد')
  })

  it('days = 0 → ينتهي اليوم', () => {
    expect(getInsuranceStatusDescription(0)).toContain('اليوم')
  })

  it('days = 1 → غداً', () => {
    expect(getInsuranceStatusDescription(1)).toContain('غداً')
  })

  it('days = 5 → خلال أسبوع', () => {
    expect(getInsuranceStatusDescription(5)).toContain('أسبوع')
  })

  it('days = 20 → خلال شهر', () => {
    expect(getInsuranceStatusDescription(20)).toContain('شهر')
  })

  it('days = 50 → خلال شهرين', () => {
    expect(getInsuranceStatusDescription(50)).toContain('شهرين')
  })

  it('days = 100 → ساري', () => {
    expect(getInsuranceStatusDescription(100)).toContain('ساري')
  })
})

// ─── getInsuranceStatusIcon ───────────────────────────────────────────────────

describe('getInsuranceStatusIcon', () => {
  it('days < 0 → ❌', () => expect(getInsuranceStatusIcon(-1)).toBe('❌'))
  it('days = 0 → ⚠️', () => expect(getInsuranceStatusIcon(0)).toBe('⚠️'))
  it('days = 30 → ⚠️', () => expect(getInsuranceStatusIcon(30)).toBe('⚠️'))
  it('days = 31 → 🟡', () => expect(getInsuranceStatusIcon(31)).toBe('🟡'))
  it('days = 60 → 🟡', () => expect(getInsuranceStatusIcon(60)).toBe('🟡'))
  it('days = 61 → ✅', () => expect(getInsuranceStatusIcon(61)).toBe('✅'))
})
