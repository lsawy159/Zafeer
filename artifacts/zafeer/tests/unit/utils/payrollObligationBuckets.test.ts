import { describe, it, expect } from 'vitest'
import {
  normalizePayrollObligationBreakdown,
  getPayrollObligationBucketFromType,
  getPayrollObligationBucketLabel,
  getPayrollComponentCode,
  getPayrollComponentBucket,
  getPayrollObligationBreakdownTotal,
  EMPTY_PAYROLL_OBLIGATION_BREAKDOWN,
  PAYROLL_OBLIGATION_BUCKET_LABELS,
} from '@/utils/payrollObligationBuckets'

// ─── normalizePayrollObligationBreakdown ───────────────────────────────────────

describe('normalizePayrollObligationBreakdown', () => {
  it('returns full object from complete input', () => {
    const r = normalizePayrollObligationBreakdown({
      transfer_renewal: 500,
      penalty: 100,
      advance: 200,
      other: 50,
    })
    expect(r).toEqual({ transfer_renewal: 500, penalty: 100, advance: 200, other: 50 })
  })

  it('fills missing fields with 0', () => {
    const r = normalizePayrollObligationBreakdown({ transfer_renewal: 300 })
    expect(r.penalty).toBe(0)
    expect(r.advance).toBe(0)
    expect(r.other).toBe(0)
    expect(r.transfer_renewal).toBe(300)
  })

  it('returns all zeros for null', () => {
    expect(normalizePayrollObligationBreakdown(null)).toEqual(EMPTY_PAYROLL_OBLIGATION_BREAKDOWN)
  })

  it('returns all zeros for undefined', () => {
    expect(normalizePayrollObligationBreakdown(undefined)).toEqual(EMPTY_PAYROLL_OBLIGATION_BREAKDOWN)
  })

  it('returns all zeros for empty object', () => {
    expect(normalizePayrollObligationBreakdown({})).toEqual(EMPTY_PAYROLL_OBLIGATION_BREAKDOWN)
  })

  it('coerces string numbers to numbers', () => {
    const r = normalizePayrollObligationBreakdown({ transfer_renewal: '150' as unknown as number })
    expect(r.transfer_renewal).toBe(150)
  })
})

// ─── getPayrollObligationBucketFromType ────────────────────────────────────────

describe('getPayrollObligationBucketFromType', () => {
  it('maps transfer → transfer_renewal', () => {
    expect(getPayrollObligationBucketFromType('transfer')).toBe('transfer_renewal')
  })

  it('maps renewal → transfer_renewal', () => {
    expect(getPayrollObligationBucketFromType('renewal')).toBe('transfer_renewal')
  })

  it('maps penalty → penalty', () => {
    expect(getPayrollObligationBucketFromType('penalty')).toBe('penalty')
  })

  it('maps advance → advance', () => {
    expect(getPayrollObligationBucketFromType('advance')).toBe('advance')
  })

  it('maps other → other', () => {
    expect(getPayrollObligationBucketFromType('other')).toBe('other')
  })

  it('maps unknown type → other (default)', () => {
    expect(getPayrollObligationBucketFromType('unknown_type' as never)).toBe('other')
  })
})

// ─── getPayrollObligationBucketLabel ──────────────────────────────────────────

describe('getPayrollObligationBucketLabel', () => {
  it('returns Arabic label for each bucket', () => {
    expect(getPayrollObligationBucketLabel('transfer_renewal')).toBe(
      PAYROLL_OBLIGATION_BUCKET_LABELS.transfer_renewal
    )
    expect(getPayrollObligationBucketLabel('penalty')).toBe(
      PAYROLL_OBLIGATION_BUCKET_LABELS.penalty
    )
    expect(getPayrollObligationBucketLabel('advance')).toBe(
      PAYROLL_OBLIGATION_BUCKET_LABELS.advance
    )
    expect(getPayrollObligationBucketLabel('other')).toBe(PAYROLL_OBLIGATION_BUCKET_LABELS.other)
  })

  it('all labels are non-empty Arabic strings', () => {
    for (const key of Object.keys(PAYROLL_OBLIGATION_BUCKET_LABELS) as (keyof typeof PAYROLL_OBLIGATION_BUCKET_LABELS)[]) {
      expect(getPayrollObligationBucketLabel(key).length).toBeGreaterThan(0)
    }
  })
})

// ─── getPayrollComponentCode ──────────────────────────────────────────────────

describe('getPayrollComponentCode', () => {
  it('returns TRANSFER_RENEWAL for transfer_renewal', () => {
    expect(getPayrollComponentCode('transfer_renewal')).toBe('TRANSFER_RENEWAL')
  })

  it('returns PENALTY for penalty', () => {
    expect(getPayrollComponentCode('penalty')).toBe('PENALTY')
  })

  it('returns ADVANCE for advance', () => {
    expect(getPayrollComponentCode('advance')).toBe('ADVANCE')
  })

  it('returns OTHER for other', () => {
    expect(getPayrollComponentCode('other')).toBe('OTHER')
  })
})

// ─── getPayrollComponentBucket ────────────────────────────────────────────────

describe('getPayrollComponentBucket', () => {
  it('maps TRANSFER_RENEWAL → transfer_renewal', () => {
    expect(getPayrollComponentBucket('TRANSFER_RENEWAL')).toBe('transfer_renewal')
  })

  it('maps PENALTY → penalty', () => {
    expect(getPayrollComponentBucket('PENALTY')).toBe('penalty')
  })

  it('maps ADVANCE → advance', () => {
    expect(getPayrollComponentBucket('ADVANCE')).toBe('advance')
  })

  it('maps OTHER → other', () => {
    expect(getPayrollComponentBucket('OTHER')).toBe('other')
  })

  it('returns null for unknown code', () => {
    expect(getPayrollComponentBucket('UNKNOWN')).toBeNull()
  })

  it('returns null for null input', () => {
    expect(getPayrollComponentBucket(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(getPayrollComponentBucket(undefined)).toBeNull()
  })
})

// ─── Round-trip: code → bucket → code ────────────────────────────────────────

describe('round-trip code ↔ bucket', () => {
  const buckets = ['transfer_renewal', 'penalty', 'advance', 'other'] as const

  it('getPayrollComponentBucket(getPayrollComponentCode(x)) === x for all buckets', () => {
    for (const bucket of buckets) {
      const code = getPayrollComponentCode(bucket)
      expect(getPayrollComponentBucket(code)).toBe(bucket)
    }
  })
})

// ─── getPayrollObligationBreakdownTotal ───────────────────────────────────────

describe('getPayrollObligationBreakdownTotal', () => {
  it('sums all buckets correctly', () => {
    expect(
      getPayrollObligationBreakdownTotal({
        transfer_renewal: 500,
        penalty: 100,
        advance: 200,
        other: 50,
      })
    ).toBe(850)
  })

  it('returns 0 for null', () => {
    expect(getPayrollObligationBreakdownTotal(null)).toBe(0)
  })

  it('returns 0 for undefined', () => {
    expect(getPayrollObligationBreakdownTotal(undefined)).toBe(0)
  })

  it('returns 0 for empty object', () => {
    expect(getPayrollObligationBreakdownTotal({})).toBe(0)
  })

  it('handles partial input correctly', () => {
    expect(getPayrollObligationBreakdownTotal({ penalty: 300 })).toBe(300)
  })

  it('total equals sum of all individual buckets', () => {
    const breakdown = { transfer_renewal: 1000, penalty: 250, advance: 750, other: 0 }
    const total = getPayrollObligationBreakdownTotal(breakdown)
    const manual = breakdown.transfer_renewal + breakdown.penalty + breakdown.advance + breakdown.other
    expect(total).toBe(manual)
  })
})
