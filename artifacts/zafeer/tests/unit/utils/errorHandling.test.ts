import { describe, it, expect } from 'vitest'
import {
  getErrorMessage,
  getErrorStatus,
  getInputValue,
  isSupabaseError,
  hasErrorStatus,
} from '@/utils/errorHandling'

// ─── getErrorMessage ──────────────────────────────────────────────────────────

describe('getErrorMessage', () => {
  it('native Error → returns message', () => {
    expect(getErrorMessage(new Error('something failed'))).toBe('something failed')
  })

  it('object with message → returns message', () => {
    expect(getErrorMessage({ message: 'db error' })).toBe('db error')
  })

  it('object with error (no message) → returns error field', () => {
    expect(getErrorMessage({ error: 'forbidden' })).toBe('forbidden')
  })

  it('object with both message and error → message wins', () => {
    expect(getErrorMessage({ message: 'msg', error: 'err' })).toBe('msg')
  })

  it('empty object → fallback arabic message', () => {
    expect(getErrorMessage({})).toContain('خطأ')
  })

  it('null → fallback (String(null) = "null")', () => {
    expect(getErrorMessage(null)).toBeTruthy()
  })

  it('string error → returns the string', () => {
    expect(getErrorMessage('timeout')).toBe('timeout')
  })

  it('number error → returns string form', () => {
    expect(getErrorMessage(500)).toBe('500')
  })

  it('undefined → fallback', () => {
    expect(getErrorMessage(undefined)).toBeTruthy()
  })
})

// ─── getErrorStatus ───────────────────────────────────────────────────────────

describe('getErrorStatus', () => {
  it('object with status → returns status', () => {
    expect(getErrorStatus({ status: 404 })).toBe(404)
  })

  it('object with statusCode → returns statusCode', () => {
    expect(getErrorStatus({ statusCode: 401 })).toBe(401)
  })

  it('status takes precedence over statusCode', () => {
    expect(getErrorStatus({ status: 404, statusCode: 401 })).toBe(404)
  })

  it('Error object (no status) → undefined', () => {
    expect(getErrorStatus(new Error('x'))).toBeUndefined()
  })

  it('null → undefined', () => {
    expect(getErrorStatus(null)).toBeUndefined()
  })

  it('string → undefined', () => {
    expect(getErrorStatus('error')).toBeUndefined()
  })

  it('empty object → undefined (0 is falsy)', () => {
    expect(getErrorStatus({})).toBeUndefined()
  })
})

// ─── getInputValue ────────────────────────────────────────────────────────────

describe('getInputValue', () => {
  it('string → returned as-is', () => {
    expect(getInputValue('hello')).toBe('hello')
  })

  it('number → string', () => {
    expect(getInputValue(42)).toBe('42')
  })

  it('null → empty string', () => {
    expect(getInputValue(null)).toBe('')
  })

  it('undefined → empty string', () => {
    expect(getInputValue(undefined)).toBe('')
  })

  it('boolean true → empty string (not suitable for input)', () => {
    expect(getInputValue(true)).toBe('')
  })

  it('boolean false → empty string', () => {
    expect(getInputValue(false)).toBe('')
  })

  it('0 → "0"', () => {
    expect(getInputValue(0)).toBe('0')
  })
})

// ─── isSupabaseError ──────────────────────────────────────────────────────────

describe('isSupabaseError', () => {
  it('object with message → true', () => {
    expect(isSupabaseError({ message: 'error' })).toBe(true)
  })

  it('object with error field → true', () => {
    expect(isSupabaseError({ error: 'bad request' })).toBe(true)
  })

  it('null → false', () => {
    expect(isSupabaseError(null)).toBe(false)
  })

  it('string → false', () => {
    expect(isSupabaseError('error string')).toBe(false)
  })

  it('empty object → false', () => {
    expect(isSupabaseError({})).toBe(false)
  })

  it('native Error → true (has message)', () => {
    expect(isSupabaseError(new Error('x'))).toBe(true)
  })
})

// ─── hasErrorStatus ───────────────────────────────────────────────────────────

describe('hasErrorStatus', () => {
  it('matches status 404', () => {
    expect(hasErrorStatus({ status: 404 }, 404)).toBe(true)
  })

  it('does not match different status', () => {
    expect(hasErrorStatus({ status: 404 }, 500)).toBe(false)
  })

  it('matches statusCode', () => {
    expect(hasErrorStatus({ statusCode: 401 }, 401)).toBe(true)
  })

  it('null error → false', () => {
    expect(hasErrorStatus(null, 404)).toBe(false)
  })
})
