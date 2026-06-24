import { describe, it, expect } from 'vitest'
import { validatePassword, DEFAULT_PASSWORD_POLICY, type PasswordPolicy } from '@/utils/passwordPolicy'

describe('validatePassword — default policy', () => {
  it('accepts strong valid password', () => {
    const r = validatePassword('StrongPass1!')
    expect(r.valid).toBe(true)
    expect(r.errors).toHaveLength(0)
  })

  it('rejects password shorter than 8 chars', () => {
    const r = validatePassword('Abc1!')
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes('8'))).toBe(true)
  })

  it('rejects password without uppercase', () => {
    const r = validatePassword('password1!')
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes('كبير'))).toBe(true)
  })

  it('rejects password without lowercase', () => {
    const r = validatePassword('PASSWORD1!')
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes('صغير'))).toBe(true)
  })

  it('rejects password without digit', () => {
    const r = validatePassword('Password!')
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes('رقم'))).toBe(true)
  })

  it('rejects password without symbol', () => {
    const r = validatePassword('Password1')
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes('رمز'))).toBe(true)
  })

  it('collects multiple errors at once', () => {
    const r = validatePassword('abc') // short, no upper, no digit, no symbol
    expect(r.valid).toBe(false)
    expect(r.errors.length).toBeGreaterThan(1)
  })

  it('accepts password with special symbols', () => {
    const symbols = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-']
    for (const sym of symbols) {
      const r = validatePassword(`StrongPass1${sym}`)
      expect(r.valid).toBe(true)
    }
  })

  it('exactly 8 chars with all requirements passes', () => {
    expect(validatePassword('Abcde1!x').valid).toBe(true)
  })
})

describe('validatePassword — Finding C regression (misleading "8 chars" message)', () => {
  // Owner repro: a 9-char password of digits + symbol but NO letters was rejected
  // by Supabase Auth, then mis-reported as a length problem ("8 أحرف على الأقل").
  // The validator must (a) reject it, and (b) NOT cite length — it is long enough.
  it('rejects digits+symbol with no letters, and the error is complexity not length', () => {
    const r = validatePassword('10203040@') // length 9 — long enough
    expect(r.valid).toBe(false)
    // No error mentions the length requirement, because length passes
    expect(r.errors.some((e) => e.includes('8 أحرف'))).toBe(false)
    // The real failures are missing uppercase + lowercase letters
    expect(r.errors.some((e) => e.includes('كبير'))).toBe(true)
    expect(r.errors.some((e) => e.includes('صغير'))).toBe(true)
  })

  it('first surfaced error for the owner password is the uppercase requirement, not length', () => {
    const r = validatePassword('10203040@')
    expect(r.errors[0]).not.toContain('8 أحرف')
    expect(r.errors[0]).toContain('كبير')
  })
})

describe('validatePassword — custom policy', () => {
  const relaxed: PasswordPolicy = {
    minLength: 4,
    requireUpper: false,
    requireLower: false,
    requireDigit: false,
    requireSymbol: false,
  }

  it('accepts any 4+ char password under relaxed policy', () => {
    expect(validatePassword('abcd', relaxed).valid).toBe(true)
  })

  it('rejects 3-char password under relaxed policy', () => {
    expect(validatePassword('abc', relaxed).valid).toBe(false)
  })

  const strictLength: PasswordPolicy = { ...DEFAULT_PASSWORD_POLICY, minLength: 16 }

  it('enforces custom min length', () => {
    const r = validatePassword('StrongPass1!', strictLength)
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes('16'))).toBe(true)
  })
})
