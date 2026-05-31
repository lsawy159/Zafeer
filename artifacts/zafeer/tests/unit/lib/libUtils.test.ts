import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cn, calculateDaysRemaining, getStatusColor } from '@/lib/utils'

// ─── cn (Tailwind class merge) ────────────────────────────────────────────────

describe('cn', () => {
  it('joins simple classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('empty → empty string', () => {
    expect(cn()).toBe('')
  })

  it('conditional object: true → included', () => {
    expect(cn('base', { active: true })).toBe('base active')
  })

  it('conditional object: false → excluded', () => {
    expect(cn('base', { active: false })).toBe('base')
  })

  it('tailwind-merge: conflicting classes → last wins', () => {
    // p-4 and p-2 conflict → p-2 wins (last)
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('tailwind-merge: non-conflicting classes both kept', () => {
    const result = cn('px-4', 'py-2')
    expect(result).toContain('px-4')
    expect(result).toContain('py-2')
  })

  it('falsy values ignored', () => {
    expect(cn('foo', undefined, null, false, 'bar')).toBe('foo bar')
  })

  it('array input', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })
})

// ─── calculateDaysRemaining (deprecated) ─────────────────────────────────────

describe('calculateDaysRemaining (deprecated)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('future date → positive', () => {
    expect(calculateDaysRemaining('2026-01-22')).toBe(7)
  })

  it('past date → negative', () => {
    expect(calculateDaysRemaining('2026-01-08')).toBe(-7)
  })
})

// ─── getStatusColor (deprecated) ─────────────────────────────────────────────

describe('getStatusColor (deprecated)', () => {
  it('days < 0 → red classes', () => {
    expect(getStatusColor(-1)).toContain('red')
  })

  it('days = 0 → orange (≤ 30)', () => {
    expect(getStatusColor(0)).toContain('orange')
  })

  it('days = 30 → orange', () => {
    expect(getStatusColor(30)).toContain('orange')
  })

  it('days = 31 → green', () => {
    expect(getStatusColor(31)).toContain('green')
  })

  it('days = 365 → green', () => {
    expect(getStatusColor(365)).toContain('green')
  })
})
