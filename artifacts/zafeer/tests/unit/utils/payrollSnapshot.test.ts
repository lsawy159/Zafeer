import { describe, it, expect } from 'vitest'
import {
  comparePayrollSnapshots,
  hasPayrollDrift,
  type PayrollSnapshot,
} from '@/utils/payrollSnapshot'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeSnapshot(
  runId: string,
  entries: PayrollSnapshot['entries'] = []
): PayrollSnapshot {
  const gross = entries.reduce((s, e) => s + e.gross_amount, 0)
  const net = entries.reduce((s, e) => s + e.net_amount, 0)
  const installment = entries.reduce((s, e) => s + e.installment_deducted_amount, 0)
  return {
    timestamp: '2026-01-15T00:00:00.000Z',
    runId,
    entries,
    totals: {
      employees_count: entries.length,
      gross_total: gross,
      net_total: net,
      installment_total: installment,
    },
  }
}

function makeEntry(
  employeeId: string,
  overrides: Partial<PayrollSnapshot['entries'][0]> = {}
): PayrollSnapshot['entries'][0] {
  return {
    employee_id: employeeId,
    gross_amount: 3000,
    net_amount: 2500,
    installment_deducted_amount: 500,
    entry_status: 'pending',
    ...overrides,
  }
}

// ─── comparePayrollSnapshots ──────────────────────────────────────────────────

describe('comparePayrollSnapshots', () => {
  it('identical snapshots → no diff', () => {
    const entry = makeEntry('e1')
    const snap = makeSnapshot('run1', [entry])
    const diff = comparePayrollSnapshots(snap, snap)

    expect(diff.added).toHaveLength(0)
    expect(diff.removed).toHaveLength(0)
    expect(diff.modified).toHaveLength(0)
  })

  it('new employee in after → appears in added', () => {
    const before = makeSnapshot('run1', [makeEntry('e1')])
    const after = makeSnapshot('run1', [makeEntry('e1'), makeEntry('e2')])

    const diff = comparePayrollSnapshots(before, after)
    expect(diff.added).toHaveLength(1)
    expect(diff.added[0].employee_id).toBe('e2')
    expect(diff.removed).toHaveLength(0)
  })

  it('employee missing from after → appears in removed', () => {
    const before = makeSnapshot('run1', [makeEntry('e1'), makeEntry('e2')])
    const after = makeSnapshot('run1', [makeEntry('e1')])

    const diff = comparePayrollSnapshots(before, after)
    expect(diff.removed).toHaveLength(1)
    expect(diff.removed[0].employee_id).toBe('e2')
    expect(diff.added).toHaveLength(0)
  })

  it('gross_amount changed > 0.01 → detected in modified', () => {
    const before = makeSnapshot('run1', [makeEntry('e1', { gross_amount: 3000 })])
    const after = makeSnapshot('run1', [makeEntry('e1', { gross_amount: 3100 })])

    const diff = comparePayrollSnapshots(before, after)
    expect(diff.modified).toHaveLength(1)
    expect(diff.modified[0]).toMatchObject({
      employee_id: 'e1',
      field: 'gross_amount',
      old_value: 3000,
      new_value: 3100,
    })
  })

  it('change ≤ 0.01 (rounding tolerance) → NOT detected as modified', () => {
    const before = makeSnapshot('run1', [makeEntry('e1', { gross_amount: 3000.00 })])
    const after = makeSnapshot('run1', [makeEntry('e1', { gross_amount: 3000.005 })])

    const diff = comparePayrollSnapshots(before, after)
    expect(diff.modified).toHaveLength(0)
  })

  it('net_amount changed → detected', () => {
    const before = makeSnapshot('run1', [makeEntry('e1', { net_amount: 2500 })])
    const after = makeSnapshot('run1', [makeEntry('e1', { net_amount: 2400 })])

    const diff = comparePayrollSnapshots(before, after)
    expect(diff.modified.some((m) => m.field === 'net_amount')).toBe(true)
  })

  it('entry_status changed (string) → detected', () => {
    const before = makeSnapshot('run1', [makeEntry('e1', { entry_status: 'pending' })])
    const after = makeSnapshot('run1', [makeEntry('e1', { entry_status: 'approved' })])

    const diff = comparePayrollSnapshots(before, after)
    expect(diff.modified.some((m) => m.field === 'entry_status')).toBe(true)
  })

  it('totals_diff reflects counts and absolute amount diff', () => {
    const before = makeSnapshot('run1', [makeEntry('e1', { gross_amount: 3000, net_amount: 2500 })])
    const after = makeSnapshot('run1', [
      makeEntry('e1', { gross_amount: 3000, net_amount: 2500 }),
      makeEntry('e2', { gross_amount: 2000, net_amount: 1800 }),
    ])
    const diff = comparePayrollSnapshots(before, after)

    expect(diff.totals_diff.employees_count).toBe(1) // +1 employee
    expect(diff.totals_diff.gross_total).toBe(2000)  // |5000 - 3000|
    expect(diff.totals_diff.net_total).toBe(1800)
  })

  it('empty snapshots → no diff', () => {
    const before = makeSnapshot('run1', [])
    const after = makeSnapshot('run1', [])
    const diff = comparePayrollSnapshots(before, after)

    expect(diff.added).toHaveLength(0)
    expect(diff.removed).toHaveLength(0)
    expect(diff.modified).toHaveLength(0)
    expect(diff.totals_diff.employees_count).toBe(0)
  })

  it('multiple modifications on same employee counted separately by field', () => {
    const before = makeSnapshot('run1', [
      makeEntry('e1', { gross_amount: 3000, net_amount: 2500, installment_deducted_amount: 500 }),
    ])
    const after = makeSnapshot('run1', [
      makeEntry('e1', { gross_amount: 3200, net_amount: 2700, installment_deducted_amount: 500 }),
    ])
    const diff = comparePayrollSnapshots(before, after)

    expect(diff.modified.filter((m) => m.employee_id === 'e1')).toHaveLength(2)
  })
})

// ─── hasPayrollDrift ──────────────────────────────────────────────────────────

describe('hasPayrollDrift', () => {
  const noDrift = {
    added: [],
    removed: [],
    modified: [],
    totals_diff: { employees_count: 0, gross_total: 0, net_total: 0, installment_total: 0 },
  }

  it('no changes → false', () => {
    expect(hasPayrollDrift(noDrift)).toBe(false)
  })

  it('added entry → true', () => {
    expect(hasPayrollDrift({ ...noDrift, added: [makeEntry('e1')] })).toBe(true)
  })

  it('removed entry → true', () => {
    expect(hasPayrollDrift({ ...noDrift, removed: [makeEntry('e1')] })).toBe(true)
  })

  it('modified entry → true', () => {
    expect(hasPayrollDrift({
      ...noDrift,
      modified: [{ employee_id: 'e1', field: 'gross_amount', old_value: 3000, new_value: 3100 }],
    })).toBe(true)
  })

  it('employees_count diff ≠ 0 → true', () => {
    expect(hasPayrollDrift({
      ...noDrift,
      totals_diff: { ...noDrift.totals_diff, employees_count: 1 },
    })).toBe(true)
  })

  it('gross_total diff > 0.01 → true', () => {
    expect(hasPayrollDrift({
      ...noDrift,
      totals_diff: { ...noDrift.totals_diff, gross_total: 0.05 },
    })).toBe(true)
  })

  it('gross_total diff ≤ 0.01 → false (rounding noise ignored)', () => {
    expect(hasPayrollDrift({
      ...noDrift,
      totals_diff: { ...noDrift.totals_diff, gross_total: 0.005 },
    })).toBe(false)
  })
})
