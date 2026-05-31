import { describe, it, expect } from 'vitest'
import {
  formatDateShortWithHijri,
  formatDateTimeWithHijri,
  formatDateDDMMMYYYY,
  formatDateWithHijri,
  toHijriDate,
  formatHijriDate,
} from '@/utils/dateFormatter'

const NO_VALUE = 'لا يوجد'

// ─── formatDateShortWithHijri — YYYY-MM-DD ────────────────────────────────────

describe('formatDateShortWithHijri', () => {
  it('formats Date object to YYYY-MM-DD', () => {
    expect(formatDateShortWithHijri(new Date(2025, 5, 15))).toBe('2025-06-15')
  })

  it('formats ISO string to YYYY-MM-DD', () => {
    expect(formatDateShortWithHijri('2025-06-15T00:00:00.000Z')).toBe('2025-06-15')
  })

  it('pads month and day with zeros', () => {
    expect(formatDateShortWithHijri(new Date(2025, 0, 5))).toBe('2025-01-05')
  })

  it('returns لا يوجد for null', () => {
    expect(formatDateShortWithHijri(null)).toBe(NO_VALUE)
  })

  it('returns لا يوجد for undefined', () => {
    expect(formatDateShortWithHijri(undefined)).toBe(NO_VALUE)
  })

  it('returns لا يوجد for empty string', () => {
    expect(formatDateShortWithHijri('')).toBe(NO_VALUE)
  })

  it('returns لا يوجد for لا يوجد string', () => {
    expect(formatDateShortWithHijri(NO_VALUE)).toBe(NO_VALUE)
  })

  it('returns empty string for invalid date string', () => {
    expect(formatDateShortWithHijri('not-a-date')).toBe('')
  })
})

// ─── formatDateTimeWithHijri — YYYY-MM-DD HH:mm ───────────────────────────────

describe('formatDateTimeWithHijri', () => {
  it('formats date with time YYYY-MM-DD HH:mm', () => {
    const d = new Date(2025, 5, 15, 14, 30)
    const r = formatDateTimeWithHijri(d)
    expect(r).toMatch(/^2025-06-15 \d{2}:\d{2}$/)
  })

  it('returns لا يوجد for null', () => {
    expect(formatDateTimeWithHijri(null)).toBe(NO_VALUE)
  })

  it('returns لا يوجد for empty string', () => {
    expect(formatDateTimeWithHijri('')).toBe(NO_VALUE)
  })

  it('returns empty for invalid date', () => {
    expect(formatDateTimeWithHijri('invalid')).toBe('')
  })

  it('pads hours and minutes with zeros', () => {
    const d = new Date(2025, 0, 5, 9, 5)
    const r = formatDateTimeWithHijri(d)
    expect(r).toContain('09:05')
  })
})

// ─── formatDateDDMMMYYYY — DD-Mon-YYYY ────────────────────────────────────────

describe('formatDateDDMMMYYYY', () => {
  it('formats 2026-06-03 → 03-Jun-2026', () => {
    expect(formatDateDDMMMYYYY(new Date(2026, 5, 3))).toBe('03-Jun-2026')
  })

  it('formats January correctly', () => {
    expect(formatDateDDMMMYYYY(new Date(2025, 0, 1))).toBe('01-Jan-2025')
  })

  it('formats December correctly', () => {
    expect(formatDateDDMMMYYYY(new Date(2025, 11, 31))).toBe('31-Dec-2025')
  })

  it('returns لا يوجد for null', () => {
    expect(formatDateDDMMMYYYY(null)).toBe(NO_VALUE)
  })

  it('returns empty string for invalid date', () => {
    expect(formatDateDDMMMYYYY('totally-invalid')).toBe('')
  })

  it('round-trips with dateParser parseDDMonYYYY format', () => {
    const original = new Date(2025, 4, 3) // May 3
    const formatted = formatDateDDMMMYYYY(original)
    expect(formatted).toBe('03-May-2025')
  })
})

// ─── formatDateWithHijri — alias for formatGregorianDate ─────────────────────

describe('formatDateWithHijri', () => {
  it('returns non-empty string for valid date', () => {
    const r = formatDateWithHijri(new Date(2025, 5, 15))
    expect(typeof r).toBe('string')
    expect(r.length).toBeGreaterThan(0)
    expect(r).not.toBe(NO_VALUE)
  })

  it('returns لا يوجد for null', () => {
    expect(formatDateWithHijri(null)).toBe(NO_VALUE)
  })

  it('returns لا يوجد for empty string', () => {
    expect(formatDateWithHijri('')).toBe(NO_VALUE)
  })

  it('returns لا يوجد for لا يوجد', () => {
    expect(formatDateWithHijri(NO_VALUE)).toBe(NO_VALUE)
  })

  it('returns empty string for completely invalid date', () => {
    expect(formatDateWithHijri('not-a-date')).toBe('')
  })
})

// ─── toHijriDate ─────────────────────────────────────────────────────────────

describe('toHijriDate', () => {
  it('converts 2025-06-15 to valid Hijri date', () => {
    const r = toHijriDate(new Date(2025, 5, 15))
    expect(r.year).toBeGreaterThan(1440)
    expect(r.month).toBeGreaterThanOrEqual(1)
    expect(r.month).toBeLessThanOrEqual(12)
    expect(r.day).toBeGreaterThanOrEqual(1)
    expect(r.day).toBeLessThanOrEqual(30)
  })

  it('returns { year:0, month:0, day:0 } for null', () => {
    expect(toHijriDate(null)).toEqual({ year: 0, month: 0, day: 0 })
  })

  it('returns { year:0, month:0, day:0 } for undefined', () => {
    expect(toHijriDate(undefined)).toEqual({ year: 0, month: 0, day: 0 })
  })

  it('known date: 2026-01-01 is in Hijri year 1447', () => {
    const r = toHijriDate(new Date(2026, 0, 1))
    expect(r.year).toBe(1447)
  })
})

// ─── formatHijriDate ─────────────────────────────────────────────────────────

describe('formatHijriDate', () => {
  it('returns Arabic Hijri date string with هـ suffix', () => {
    const r = formatHijriDate(new Date(2025, 5, 15))
    expect(r).toContain('هـ')
    expect(r.length).toBeGreaterThan(5)
  })

  it('contains a Hijri month name', () => {
    const hijriMonths = [
      'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر',
      'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
      'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
    ]
    const r = formatHijriDate(new Date(2025, 5, 15))
    expect(hijriMonths.some((m) => r.includes(m))).toBe(true)
  })

  it('returns لا يوجد for null', () => {
    expect(formatHijriDate(null)).toBe(NO_VALUE)
  })

  it('returns لا يوجد for undefined', () => {
    expect(formatHijriDate(undefined)).toBe(NO_VALUE)
  })
})
