import { describe, it, expect } from 'vitest'
import {
  getLineStatus,
  getPayrollBucketType,
  lineMatchesBucket,
  getBucketForObligationType,
} from '@/hooks/usePayrollEntries/usePayrollEntriesCalculations'

// ─── getLineStatus ────────────────────────────────────────────────────────────

describe('getLineStatus', () => {
  it('amountPaid = 0 → unpaid', () => {
    expect(getLineStatus(100, 0)).toBe('unpaid')
  })

  it('amountPaid < 0 → unpaid', () => {
    expect(getLineStatus(100, -50)).toBe('unpaid')
  })

  it('amountPaid === amountDue → paid', () => {
    expect(getLineStatus(100, 100)).toBe('paid')
  })

  it('amountPaid > amountDue → paid (overpaid)', () => {
    expect(getLineStatus(100, 150)).toBe('paid')
  })

  it('0 < amountPaid < amountDue → partial', () => {
    expect(getLineStatus(100, 50)).toBe('partial')
  })

  it('amountPaid = 1 (minimum partial) → partial', () => {
    expect(getLineStatus(100, 1)).toBe('partial')
  })

  it('amountPaid = amountDue - 1 (maximum partial) → partial', () => {
    expect(getLineStatus(100, 99)).toBe('partial')
  })

  it('amountDue = 0, amountPaid = 0 → unpaid (paid-zero treated as unpaid)', () => {
    // 0 <= 0 → unpaid branch fires first
    expect(getLineStatus(0, 0)).toBe('unpaid')
  })
})

// ─── getPayrollBucketType ─────────────────────────────────────────────────────

describe('getPayrollBucketType', () => {
  it('transfer_renewal → transfer', () => {
    expect(getPayrollBucketType('transfer_renewal')).toBe('transfer')
  })

  it('penalty → penalty', () => {
    expect(getPayrollBucketType('penalty')).toBe('penalty')
  })

  it('advance → advance', () => {
    expect(getPayrollBucketType('advance')).toBe('advance')
  })

  it('other → other', () => {
    expect(getPayrollBucketType('other')).toBe('other')
  })
})

// ─── lineMatchesBucket ────────────────────────────────────────────────────────

describe('lineMatchesBucket', () => {
  // transfer_renewal bucket accepts both transfer and renewal types
  it('transfer + transfer_renewal → true', () => {
    expect(lineMatchesBucket('transfer', 'transfer_renewal')).toBe(true)
  })

  it('renewal + transfer_renewal → true', () => {
    expect(lineMatchesBucket('renewal', 'transfer_renewal')).toBe(true)
  })

  it('penalty + transfer_renewal → false', () => {
    expect(lineMatchesBucket('penalty', 'transfer_renewal')).toBe(false)
  })

  it('advance + transfer_renewal → false', () => {
    expect(lineMatchesBucket('advance', 'transfer_renewal')).toBe(false)
  })

  // exact-match buckets
  it('penalty + penalty → true', () => {
    expect(lineMatchesBucket('penalty', 'penalty')).toBe(true)
  })

  it('transfer + penalty → false', () => {
    expect(lineMatchesBucket('transfer', 'penalty')).toBe(false)
  })

  it('advance + advance → true', () => {
    expect(lineMatchesBucket('advance', 'advance')).toBe(true)
  })

  it('other + other → true', () => {
    expect(lineMatchesBucket('other', 'other')).toBe(true)
  })

  it('penalty + advance → false', () => {
    expect(lineMatchesBucket('penalty', 'advance')).toBe(false)
  })
})

// ─── getBucketForObligationType ───────────────────────────────────────────────

describe('getBucketForObligationType', () => {
  it('transfer → transfer_renewal', () => {
    expect(getBucketForObligationType('transfer')).toBe('transfer_renewal')
  })

  it('renewal → transfer_renewal', () => {
    expect(getBucketForObligationType('renewal')).toBe('transfer_renewal')
  })

  it('penalty → penalty', () => {
    expect(getBucketForObligationType('penalty')).toBe('penalty')
  })

  it('advance → advance', () => {
    expect(getBucketForObligationType('advance')).toBe('advance')
  })

  it('other → other', () => {
    expect(getBucketForObligationType('other')).toBe('other')
  })

  // round-trip: getBucketForObligationType → lineMatchesBucket
  it('round-trip: penalty type matches its derived bucket', () => {
    const bucket = getBucketForObligationType('penalty')
    expect(lineMatchesBucket('penalty', bucket)).toBe(true)
  })

  it('round-trip: advance type matches its derived bucket', () => {
    const bucket = getBucketForObligationType('advance')
    expect(lineMatchesBucket('advance', bucket)).toBe(true)
  })

  it('round-trip: transfer and renewal both match transfer_renewal bucket', () => {
    const bucket = getBucketForObligationType('transfer')
    expect(lineMatchesBucket('transfer', bucket)).toBe(true)
    expect(lineMatchesBucket('renewal', bucket)).toBe(true)
  })
})
