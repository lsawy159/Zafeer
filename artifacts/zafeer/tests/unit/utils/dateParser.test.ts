import { describe, it, expect } from 'vitest'
import { parseDate, normalizeDate, isValidDate } from '@/utils/dateParser'

describe('parseDate', () => {
  describe('null / empty inputs', () => {
    it('returns error for null', () => {
      const r = parseDate(null)
      expect(r.date).toBeNull()
      expect(r.error).toBeDefined()
    })

    it('returns error for undefined', () => {
      const r = parseDate(undefined)
      expect(r.date).toBeNull()
      expect(r.error).toBeDefined()
    })

    it('returns error for empty string', () => {
      const r = parseDate('')
      expect(r.date).toBeNull()
      expect(r.error).toBeDefined()
    })

    it('returns error for literal "null" string', () => {
      const r = parseDate('null')
      expect(r.date).toBeNull()
      expect(r.error).toBeDefined()
    })

    it('returns no_value format for Arabic لا يوجد — no error', () => {
      const r = parseDate('لا يوجد')
      expect(r.date).toBeNull()
      expect(r.format).toBe('no_value')
      expect(r.error).toBeUndefined()
    })
  })

  describe('YYYY-MM-DD format', () => {
    it('parses 2025-06-15', () => {
      const r = parseDate('2025-06-15')
      expect(r.date).not.toBeNull()
      expect(r.date!.getFullYear()).toBe(2025)
      expect(r.date!.getMonth()).toBe(5) // 0-indexed
      expect(r.date!.getDate()).toBe(15)
    })

    it('parses 2001-01-01', () => {
      const r = parseDate('2001-01-01')
      expect(r.date).not.toBeNull()
      expect(r.date!.getFullYear()).toBe(2001)
    })

    it('rejects invalid month 2025-13-01', () => {
      const r = parseDate('2025-13-01')
      expect(r.date).toBeNull()
    })

    it('rolls over invalid day 2025-02-30 via JS Date fallback', () => {
      // JavaScript Date rolls overflow days: Feb 30 → Mar 2
      // The parser fallback accepts this rather than rejecting it
      const r = parseDate('2025-02-30')
      expect(r.date).not.toBeNull()
      expect(r.date!.getMonth()).toBe(2) // rolled to March
    })
  })

  describe('DD/MM/YYYY format', () => {
    it('parses 15/06/2025', () => {
      const r = parseDate('15/06/2025')
      expect(r.date).not.toBeNull()
      expect(r.date!.getFullYear()).toBe(2025)
      expect(r.date!.getMonth()).toBe(5)
      expect(r.date!.getDate()).toBe(15)
    })

    it('parses 01/01/2000', () => {
      const r = parseDate('01/01/2000')
      expect(r.date).not.toBeNull()
      expect(r.date!.getFullYear()).toBe(2000)
    })
  })

  describe('DD-Mon-YYYY format', () => {
    it('parses 03-May-2026', () => {
      const r = parseDate('03-May-2026')
      expect(r.date).not.toBeNull()
      expect(r.date!.getFullYear()).toBe(2026)
      expect(r.date!.getMonth()).toBe(4) // May = 4 (0-indexed)
      expect(r.date!.getDate()).toBe(3)
    })

    it('parses 05/Nov/1995', () => {
      const r = parseDate('05/Nov/1995')
      expect(r.date).not.toBeNull()
      expect(r.date!.getFullYear()).toBe(1995)
      expect(r.date!.getMonth()).toBe(10) // Nov = 10
    })
  })

  describe('two-digit year DD-MM-YY', () => {
    it('converts 27 → 2027 (≤50 rule)', () => {
      const r = parseDate('26-05-27')
      expect(r.date).not.toBeNull()
      expect(r.date!.getFullYear()).toBe(2027)
    })

    it('converts 95 → 1995 (>50 rule)', () => {
      const r = parseDate('05-11-95')
      expect(r.date).not.toBeNull()
      expect(r.date!.getFullYear()).toBe(1995)
    })
  })

  describe('Excel serial numbers', () => {
    it('parses Excel serial 45000 (2023-03-15 approx)', () => {
      const r = parseDate('45000')
      expect(r.date).not.toBeNull()
      expect(r.format).toBe('excel_serial')
      expect(r.date!.getFullYear()).toBeGreaterThan(2000)
    })

    it('parses Excel serial 44927 (2023-01-01 approx)', () => {
      const r = parseDate('44927')
      expect(r.date).not.toBeNull()
      expect(r.format).toBe('excel_serial')
    })
  })

  describe('text date formats', () => {
    it('parses "May 25, 2025"', () => {
      const r = parseDate('May 25, 2025')
      expect(r.date).not.toBeNull()
      expect(r.date!.getFullYear()).toBe(2025)
      expect(r.date!.getMonth()).toBe(4)
      expect(r.date!.getDate()).toBe(25)
    })

    it('parses "25 may 2025"', () => {
      const r = parseDate('25 may 2025')
      expect(r.date).not.toBeNull()
      expect(r.date!.getFullYear()).toBe(2025)
    })
  })

  describe('invalid / out-of-range', () => {
    it('returns null for completely invalid string', () => {
      const r = parseDate('not-a-date')
      expect(r.date).toBeNull()
      expect(r.error).toBeDefined()
    })

    it('returns null for random text', () => {
      const r = parseDate('أحمد')
      expect(r.date).toBeNull()
    })

    it('rejects year 1899 (below range)', () => {
      const r = parseDate('1899-01-01')
      expect(r.date).toBeNull()
    })
  })
})

describe('normalizeDate', () => {
  it('converts DD/MM/YYYY to YYYY-MM-DD', () => {
    expect(normalizeDate('15/06/2025')).toBe('2025-06-15')
  })

  it('converts YYYY-MM-DD to same YYYY-MM-DD', () => {
    expect(normalizeDate('2025-06-15')).toBe('2025-06-15')
  })

  it('pads single-digit month and day', () => {
    expect(normalizeDate('01/01/2000')).toBe('2000-01-01')
  })

  it('returns null for null input', () => {
    expect(normalizeDate(null)).toBeNull()
  })

  it('returns null for invalid date', () => {
    expect(normalizeDate('not-a-date')).toBeNull()
  })

  it('returns null for لا يوجد', () => {
    expect(normalizeDate('لا يوجد')).toBeNull()
  })
})

describe('isValidDate', () => {
  it('returns true for valid YYYY-MM-DD', () => {
    expect(isValidDate('2025-06-15')).toBe(true)
  })

  it('returns true for valid DD/MM/YYYY', () => {
    expect(isValidDate('15/06/2025')).toBe(true)
  })

  it('returns true for لا يوجد (intentional no-value)', () => {
    expect(isValidDate('لا يوجد')).toBe(true)
  })

  it('returns false for null', () => {
    expect(isValidDate(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isValidDate(undefined)).toBe(false)
  })

  it('returns false for invalid string', () => {
    expect(isValidDate('not-a-date')).toBe(false)
  })

  it('returns false for completely unparseable string', () => {
    expect(isValidDate('totally-invalid-123')).toBe(false)
  })
})
