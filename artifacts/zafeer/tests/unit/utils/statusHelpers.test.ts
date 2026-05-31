import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  calculateDaysRemaining,
  getStatusColorLevel,
  getStatusColor,
} from '@/utils/statusHelpers'

// Fix "today" at 2026-01-15 for deterministic date math
const TODAY = new Date('2026-01-15T12:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(TODAY)
})

afterEach(() => {
  vi.useRealTimers()
})

// ─── calculateDaysRemaining ───────────────────────────────────────────────────

describe('calculateDaysRemaining', () => {
  it('returns 0 for null', () => {
    expect(calculateDaysRemaining(null)).toBe(0)
  })

  it('returns 0 for undefined', () => {
    expect(calculateDaysRemaining(undefined)).toBe(0)
  })

  it('returns 0 for invalid string', () => {
    expect(calculateDaysRemaining('not-a-date')).toBe(0)
  })

  it('returns 0 for empty string', () => {
    expect(calculateDaysRemaining('')).toBe(0)
  })

  it('returns 0 for same day', () => {
    expect(calculateDaysRemaining('2026-01-15')).toBe(0)
  })

  it('returns 1 for tomorrow', () => {
    expect(calculateDaysRemaining('2026-01-16')).toBe(1)
  })

  it('returns 7 for +7 days', () => {
    expect(calculateDaysRemaining('2026-01-22')).toBe(7)
  })

  it('returns 30 for +30 days', () => {
    expect(calculateDaysRemaining('2026-02-14')).toBe(30)
  })

  it('returns 31 for +31 days', () => {
    expect(calculateDaysRemaining('2026-02-15')).toBe(31)
  })

  it('returns -1 for yesterday', () => {
    expect(calculateDaysRemaining('2026-01-14')).toBe(-1)
  })

  it('returns -30 for 30 days ago', () => {
    expect(calculateDaysRemaining('2025-12-16')).toBe(-30)
  })

  it('accepts Date object — future', () => {
    const future = new Date('2026-01-22T00:00:00.000Z')
    expect(calculateDaysRemaining(future)).toBe(7)
  })

  it('accepts Date object — past', () => {
    const past = new Date('2026-01-08T00:00:00.000Z')
    expect(calculateDaysRemaining(past)).toBe(-7)
  })
})

// ─── getStatusColorLevel ──────────────────────────────────────────────────────

describe('getStatusColorLevel', () => {
  it('returns ok for null', () => {
    expect(getStatusColorLevel(null)).toBe('ok')
  })

  it('returns ok for undefined', () => {
    expect(getStatusColorLevel(undefined)).toBe('ok')
  })

  it('returns expired for -1', () => {
    expect(getStatusColorLevel(-1)).toBe('expired')
  })

  it('returns expired for -100', () => {
    expect(getStatusColorLevel(-100)).toBe('expired')
  })

  it('returns critical for 0', () => {
    expect(getStatusColorLevel(0)).toBe('critical')
  })

  it('returns critical for 7', () => {
    expect(getStatusColorLevel(7)).toBe('critical')
  })

  it('returns warning for 8', () => {
    expect(getStatusColorLevel(8)).toBe('warning')
  })

  it('returns warning for 30', () => {
    expect(getStatusColorLevel(30)).toBe('warning')
  })

  it('returns ok for 31', () => {
    expect(getStatusColorLevel(31)).toBe('ok')
  })

  it('returns ok for 100', () => {
    expect(getStatusColorLevel(100)).toBe('ok')
  })
})

// ─── getStatusColor ───────────────────────────────────────────────────────────

describe('getStatusColor', () => {
  it('expired → red classes', () => {
    const color = getStatusColor(-5)
    expect(color.backgroundColor).toBe('bg-red-50')
    expect(color.textColor).toBe('text-red-700')
    expect(color.borderColor).toBe('border-red-200')
  })

  it('critical → same red classes as expired', () => {
    const color = getStatusColor(3)
    expect(color.backgroundColor).toBe('bg-red-50')
    expect(color.textColor).toBe('text-red-700')
    expect(color.borderColor).toBe('border-red-200')
  })

  it('warning → yellow classes', () => {
    const color = getStatusColor(15)
    expect(color.backgroundColor).toBe('bg-yellow-50')
    expect(color.textColor).toBe('text-yellow-700')
    expect(color.borderColor).toBe('border-yellow-200')
  })

  it('ok (60 days) → green classes', () => {
    const color = getStatusColor(60)
    expect(color.backgroundColor).toBe('bg-green-50')
    expect(color.textColor).toBe('text-green-700')
    expect(color.borderColor).toBe('border-green-200')
  })

  it('null → green classes (no expiry = safe)', () => {
    const color = getStatusColor(null)
    expect(color.backgroundColor).toBe('bg-green-50')
    expect(color.textColor).toBe('text-green-700')
    expect(color.borderColor).toBe('border-green-200')
  })

  it('undefined → green classes', () => {
    const color = getStatusColor(undefined)
    expect(color.backgroundColor).toBe('bg-green-50')
  })

  it('returns object with exactly 3 keys', () => {
    const color = getStatusColor(10)
    const keys = Object.keys(color)
    expect(keys).toHaveLength(3)
    expect(keys).toContain('backgroundColor')
    expect(keys).toContain('textColor')
    expect(keys).toContain('borderColor')
  })

  it('boundary day 0 → red (critical)', () => {
    const color = getStatusColor(0)
    expect(color.backgroundColor).toBe('bg-red-50')
  })

  it('boundary day 31 → green (ok)', () => {
    const color = getStatusColor(31)
    expect(color.backgroundColor).toBe('bg-green-50')
  })
})
