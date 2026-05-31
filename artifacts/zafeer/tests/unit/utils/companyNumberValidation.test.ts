import { describe, it, expect } from 'vitest'
import {
  isNoValue,
  normalizeNoValue,
  validateUnifiedNumber,
  validateLaborSubscription,
  validateCompanyNumbers,
  NO_VALUE_TEXT,
} from '@/utils/companyNumberValidation'

// ─── isNoValue ────────────────────────────────────────────────────────────────

describe('isNoValue', () => {
  it('returns true for لا يوجد', () => {
    expect(isNoValue(NO_VALUE_TEXT)).toBe(true)
  })

  it('returns true for لا يوجد with spaces', () => {
    expect(isNoValue('  لا يوجد  ')).toBe(true)
  })

  it('returns false for null', () => {
    expect(isNoValue(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isNoValue(undefined)).toBe(false)
  })

  it('returns false for valid number string', () => {
    expect(isNoValue('7001234567')).toBe(false)
  })

  it('returns false for 0', () => {
    expect(isNoValue(0)).toBe(false)
  })
})

// ─── normalizeNoValue ─────────────────────────────────────────────────────────

describe('normalizeNoValue', () => {
  it('returns null for لا يوجد', () => {
    expect(normalizeNoValue(NO_VALUE_TEXT)).toBeNull()
  })

  it('returns null for null', () => {
    expect(normalizeNoValue(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(normalizeNoValue(undefined)).toBeNull()
  })

  it('returns value unchanged for valid input', () => {
    expect(normalizeNoValue('7001234567')).toBe('7001234567')
    expect(normalizeNoValue(7001234567)).toBe(7001234567)
  })
})

// ─── validateUnifiedNumber ────────────────────────────────────────────────────

describe('validateUnifiedNumber', () => {
  it('accepts valid 10-digit number starting with 7', () => {
    expect(validateUnifiedNumber('7001234567').valid).toBe(true)
  })

  it('accepts valid number as integer', () => {
    expect(validateUnifiedNumber(7001234567).valid).toBe(true)
  })

  it('accepts لا يوجد as valid', () => {
    expect(validateUnifiedNumber(NO_VALUE_TEXT).valid).toBe(true)
  })

  it('rejects null — required field', () => {
    expect(validateUnifiedNumber(null).valid).toBe(false)
  })

  it('rejects undefined', () => {
    expect(validateUnifiedNumber(undefined).valid).toBe(false)
  })

  it('rejects empty string', () => {
    expect(validateUnifiedNumber('').valid).toBe(false)
  })

  it('rejects number not starting with 7', () => {
    const r = validateUnifiedNumber('1001234567')
    expect(r.valid).toBe(false)
    expect(r.error).toContain('7')
  })

  it('rejects 9-digit number', () => {
    const r = validateUnifiedNumber('700123456')
    expect(r.valid).toBe(false)
    expect(r.error).toContain('10')
  })

  it('rejects 11-digit number', () => {
    const r = validateUnifiedNumber('70012345678')
    expect(r.valid).toBe(false)
    expect(r.error).toContain('10')
  })

  it('rejects non-numeric characters', () => {
    const r = validateUnifiedNumber('700ABC3456')
    expect(r.valid).toBe(false)
  })
})

// ─── validateLaborSubscription ────────────────────────────────────────────────

describe('validateLaborSubscription', () => {
  it('accepts valid format 13-XXXXXXX', () => {
    expect(validateLaborSubscription('13-4084802').valid).toBe(true)
  })

  it('accepts لا يوجد as valid', () => {
    expect(validateLaborSubscription(NO_VALUE_TEXT).valid).toBe(true)
  })

  it('accepts empty/null (optional field)', () => {
    expect(validateLaborSubscription(null).valid).toBe(true)
    expect(validateLaborSubscription(undefined).valid).toBe(true)
    expect(validateLaborSubscription('').valid).toBe(true)
  })

  it('rejects number not starting with 13', () => {
    const r = validateLaborSubscription('14-4084802')
    expect(r.valid).toBe(false)
    expect(r.error).toContain('13')
  })

  it('rejects number without dash', () => {
    const r = validateLaborSubscription('134084802')
    expect(r.valid).toBe(false)
  })

  it('rejects second part shorter than 7 digits', () => {
    const r = validateLaborSubscription('13-408480')
    expect(r.valid).toBe(false)
    expect(r.error).toContain('7')
  })

  it('rejects second part longer than 7 digits', () => {
    const r = validateLaborSubscription('13-40848021')
    expect(r.valid).toBe(false)
  })

  it('rejects multiple dashes', () => {
    const r = validateLaborSubscription('13-408-802')
    expect(r.valid).toBe(false)
  })
})

// ─── validateCompanyNumbers ────────────────────────────────────────────────────

describe('validateCompanyNumbers', () => {
  it('returns isValid true when both valid', () => {
    const r = validateCompanyNumbers('7001234567', '13-4084802')
    expect(r.isValid).toBe(true)
    expect(r.unifiedNumber.valid).toBe(true)
    expect(r.laborSubscription.valid).toBe(true)
  })

  it('returns isValid false when unified invalid', () => {
    const r = validateCompanyNumbers('1001234567', '13-4084802')
    expect(r.isValid).toBe(false)
    expect(r.unifiedNumber.valid).toBe(false)
  })

  it('returns isValid false when labor invalid', () => {
    const r = validateCompanyNumbers('7001234567', '14-4084802')
    expect(r.isValid).toBe(false)
    expect(r.laborSubscription.valid).toBe(false)
  })

  it('both لا يوجد → isValid true', () => {
    const r = validateCompanyNumbers(NO_VALUE_TEXT, NO_VALUE_TEXT)
    expect(r.isValid).toBe(true)
  })

  it('empty labor + valid unified → isValid true (labor is optional)', () => {
    const r = validateCompanyNumbers('7001234567', null)
    expect(r.isValid).toBe(true)
  })
})
