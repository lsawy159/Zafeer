import { describe, it, expect } from 'vitest'
import {
  calcAmount,
  validateAttendanceDays,
  normalizeAttendanceRow,
  matchAttendanceToEmployees,
  ATTENDANCE_TEMPLATE_COLUMNS,
  type AttendanceRow,
  type EmployeeForMatching,
  type RateForMatching,
} from '@/utils/extractCalculations'

// ─── calcAmount ────────────────────────────────────────────────────────────────

describe('calcAmount', () => {
  it('full month returns monthly rate', () => {
    expect(calcAmount(3000, 30, 30)).toBe(3000)
  })

  it('half month returns half rate', () => {
    expect(calcAmount(3000, 30, 15)).toBe(1500)
  })

  it('zero attendance returns 0', () => {
    expect(calcAmount(3000, 30, 0)).toBe(0)
  })

  it('zero totalDaysInMonth returns 0 — division guard', () => {
    expect(calcAmount(3000, 0, 15)).toBe(0)
  })

  it('negative totalDaysInMonth returns 0 — division guard', () => {
    expect(calcAmount(3000, -1, 15)).toBe(0)
  })

  it('rounds to 2 decimal places (halala)', () => {
    // 3001 / 30 * 10 = 1000.3333... → 1000.33
    expect(calcAmount(3001, 30, 10)).toBe(1000.33)
  })

  it('rounds correctly for 28-day month', () => {
    const result = calcAmount(2800, 28, 14)
    expect(result).toBe(1400)
  })

  it('rounds correctly for 31-day month', () => {
    // 3100 / 31 * 31 = 3100 exactly
    expect(calcAmount(3100, 31, 31)).toBe(3100)
  })

  it('non-round division rounds correctly (SAR precision)', () => {
    // 1000 / 31 * 1 = 32.258... → 32.26
    expect(calcAmount(1000, 31, 1)).toBe(32.26)
  })

  it('zero monthly rate returns 0', () => {
    expect(calcAmount(0, 30, 25)).toBe(0)
  })

  it('amount never exceeds monthly rate', () => {
    const result = calcAmount(5000, 30, 30)
    expect(result).toBeLessThanOrEqual(5000)
  })
})

// ─── validateAttendanceDays ────────────────────────────────────────────────────

describe('validateAttendanceDays', () => {
  it('0 days is valid (absent full month)', () => {
    expect(validateAttendanceDays(0, 30)).toBe(true)
  })

  it('full month days is valid', () => {
    expect(validateAttendanceDays(30, 30)).toBe(true)
  })

  it('partial days is valid', () => {
    expect(validateAttendanceDays(15, 30)).toBe(true)
  })

  it('days > totalDaysInMonth is invalid', () => {
    expect(validateAttendanceDays(31, 30)).toBe(false)
  })

  it('negative days is invalid', () => {
    expect(validateAttendanceDays(-1, 30)).toBe(false)
  })

  it('fractional days is invalid (1.5 not integer)', () => {
    expect(validateAttendanceDays(1.5, 30)).toBe(false)
  })

  it('0.0 is valid (is integer)', () => {
    expect(validateAttendanceDays(0.0, 30)).toBe(true)
  })

  it('29-day month boundary', () => {
    expect(validateAttendanceDays(29, 29)).toBe(true)
    expect(validateAttendanceDays(30, 29)).toBe(false)
  })

  it('31-day month boundary', () => {
    expect(validateAttendanceDays(31, 31)).toBe(true)
    expect(validateAttendanceDays(32, 31)).toBe(false)
  })
})

// ─── normalizeAttendanceRow ────────────────────────────────────────────────────

const COL = ATTENDANCE_TEMPLATE_COLUMNS

describe('normalizeAttendanceRow', () => {
  it('parses valid row correctly', () => {
    const row = normalizeAttendanceRow({
      [COL.residenceNumber]: 12345678,
      [COL.attendanceDays]: 25,
      [COL.employeeName]: 'أحمد محمد',
    })
    expect(row).not.toBeNull()
    expect(row!.residenceNumber).toBe(12345678)
    expect(row!.attendanceDays).toBe(25)
    expect(row!.employeeName).toBe('أحمد محمد')
  })

  it('trims whitespace from employee name', () => {
    const row = normalizeAttendanceRow({
      [COL.residenceNumber]: 12345678,
      [COL.attendanceDays]: 20,
      [COL.employeeName]: '  علي حسن  ',
    })
    expect(row!.employeeName).toBe('علي حسن')
  })

  it('returns null for missing residence number', () => {
    const row = normalizeAttendanceRow({
      [COL.attendanceDays]: 20,
      [COL.employeeName]: 'موظف',
    })
    expect(row).toBeNull()
  })

  it('returns null for zero residence number', () => {
    const row = normalizeAttendanceRow({
      [COL.residenceNumber]: 0,
      [COL.attendanceDays]: 20,
      [COL.employeeName]: 'موظف',
    })
    expect(row).toBeNull()
  })

  it('returns null for negative residence number', () => {
    const row = normalizeAttendanceRow({
      [COL.residenceNumber]: -1,
      [COL.attendanceDays]: 20,
      [COL.employeeName]: 'موظف',
    })
    expect(row).toBeNull()
  })

  it('returns null for non-numeric residence number', () => {
    const row = normalizeAttendanceRow({
      [COL.residenceNumber]: 'ABC',
      [COL.attendanceDays]: 20,
      [COL.employeeName]: 'موظف',
    })
    expect(row).toBeNull()
  })

  it('returns null for NaN attendance days', () => {
    const row = normalizeAttendanceRow({
      [COL.residenceNumber]: 12345678,
      [COL.attendanceDays]: 'غير صحيح',
      [COL.employeeName]: 'موظف',
    })
    expect(row).toBeNull()
  })

  it('accepts 0 attendance days (valid — fully absent)', () => {
    const row = normalizeAttendanceRow({
      [COL.residenceNumber]: 12345678,
      [COL.attendanceDays]: 0,
      [COL.employeeName]: 'موظف',
    })
    expect(row).not.toBeNull()
    expect(row!.attendanceDays).toBe(0)
  })

  it('uses empty string when name is missing', () => {
    const row = normalizeAttendanceRow({
      [COL.residenceNumber]: 12345678,
      [COL.attendanceDays]: 10,
    })
    expect(row).not.toBeNull()
    expect(row!.employeeName).toBe('')
  })

  // سلوك مسجَّل: الأرقام الهندية-العربية (٢٥) تعطي NaN → null
  it('Arabic-Indic digits in attendance days return null (current behavior)', () => {
    const row = normalizeAttendanceRow({
      [COL.residenceNumber]: 12345678,
      [COL.attendanceDays]: '٢٥',
      [COL.employeeName]: 'موظف',
    })
    expect(row).toBeNull()
  })

  it('numeric strings parse correctly', () => {
    const row = normalizeAttendanceRow({
      [COL.residenceNumber]: '12345678',
      [COL.attendanceDays]: '25',
      [COL.employeeName]: 'موظف',
    })
    expect(row).not.toBeNull()
    expect(row!.residenceNumber).toBe(12345678)
    expect(row!.attendanceDays).toBe(25)
  })
})

// ─── matchAttendanceToEmployees ────────────────────────────────────────────────

const makeEmployee = (
  overrides: Partial<EmployeeForMatching> = {}
): EmployeeForMatching => ({
  id: 'emp-1',
  name: 'أحمد محمد',
  residence_number: 12345678,
  profession: 'نجار',
  ...overrides,
})

const makeRate = (overrides: Partial<RateForMatching> = {}): RateForMatching => ({
  profession: 'نجار',
  monthly_rate: 3000,
  ...overrides,
})

const makeRow = (overrides: Partial<AttendanceRow> = {}): AttendanceRow => ({
  residenceNumber: 12345678,
  employeeName: 'أحمد محمد',
  attendanceDays: 25,
  ...overrides,
})

describe('matchAttendanceToEmployees', () => {
  it('matches employee correctly and calculates amount', () => {
    const results = matchAttendanceToEmployees(
      [makeRow()],
      [makeEmployee()],
      [makeRate()],
      30
    )
    expect(results).toHaveLength(1)
    const r = results[0]
    expect(r.matchStatus).toBe('matched')
    expect(r.employeeId).toBe('emp-1')
    expect(r.monthlyRate).toBe(3000)
    expect(r.amount).toBe(calcAmount(3000, 30, 25))
  })

  it('unknown residence → status unknown, amount 0', () => {
    const results = matchAttendanceToEmployees(
      [makeRow({ residenceNumber: 99999999 })],
      [makeEmployee()],
      [makeRate()],
      30
    )
    expect(results[0].matchStatus).toBe('unknown')
    expect(results[0].amount).toBe(0)
    expect(results[0].employeeId).toBe('')
  })

  // سلوك مسجَّل: profession غير موجود في rates → monthlyRate = 0، status = 'matched' (لا تحذير)
  it('profession not in rates → monthlyRate 0, status still matched (silent zero-pay — documented behavior)', () => {
    const results = matchAttendanceToEmployees(
      [makeRow()],
      [makeEmployee({ profession: 'مهنة غير موجودة' })],
      [makeRate()],
      30
    )
    expect(results[0].matchStatus).toBe('matched')
    expect(results[0].monthlyRate).toBe(0)
    expect(results[0].amount).toBe(0)
  })

  it('invalid attendance days (days > total) → status invalid_days', () => {
    const results = matchAttendanceToEmployees(
      [makeRow({ attendanceDays: 35 })],
      [makeEmployee()],
      [makeRate()],
      30
    )
    expect(results[0].matchStatus).toBe('invalid_days')
  })

  it('fractional attendance days → status invalid_days', () => {
    const results = matchAttendanceToEmployees(
      [makeRow({ attendanceDays: 15.5 })],
      [makeEmployee()],
      [makeRate()],
      30
    )
    expect(results[0].matchStatus).toBe('invalid_days')
  })

  it('profession matching is case-insensitive', () => {
    const results = matchAttendanceToEmployees(
      [makeRow()],
      [makeEmployee({ profession: 'نجار' })],
      [makeRate({ profession: 'نجار' })],
      30
    )
    expect(results[0].monthlyRate).toBe(3000)
    expect(results[0].matchStatus).toBe('matched')
  })

  it('profession matching trims whitespace', () => {
    const results = matchAttendanceToEmployees(
      [makeRow()],
      [makeEmployee({ profession: '  نجار  ' })],
      [makeRate({ profession: 'نجار' })],
      30
    )
    expect(results[0].monthlyRate).toBe(3000)
  })

  it('empty rows array returns empty result', () => {
    expect(matchAttendanceToEmployees([], [makeEmployee()], [makeRate()], 30)).toEqual([])
  })

  it('handles multiple rows and employees', () => {
    const rows: AttendanceRow[] = [
      makeRow({ residenceNumber: 111, attendanceDays: 30 }),
      makeRow({ residenceNumber: 222, attendanceDays: 15 }),
      makeRow({ residenceNumber: 999, attendanceDays: 10 }), // unknown
    ]
    const employees: EmployeeForMatching[] = [
      makeEmployee({ id: 'e1', residence_number: 111, profession: 'نجار' }),
      makeEmployee({ id: 'e2', residence_number: 222, profession: 'كهربائي' }),
    ]
    const rates: RateForMatching[] = [
      makeRate({ profession: 'نجار', monthly_rate: 3000 }),
      makeRate({ profession: 'كهربائي', monthly_rate: 4000 }),
    ]

    const results = matchAttendanceToEmployees(rows, employees, rates, 30)
    expect(results).toHaveLength(3)

    expect(results[0].employeeId).toBe('e1')
    expect(results[0].amount).toBe(calcAmount(3000, 30, 30))
    expect(results[0].matchStatus).toBe('matched')

    expect(results[1].employeeId).toBe('e2')
    expect(results[1].amount).toBe(calcAmount(4000, 30, 15))
    expect(results[1].matchStatus).toBe('matched')

    expect(results[2].matchStatus).toBe('unknown')
    expect(results[2].amount).toBe(0)
  })

  it('employee with null profession gets rate 0', () => {
    const results = matchAttendanceToEmployees(
      [makeRow()],
      [makeEmployee({ profession: null })],
      [makeRate()],
      30
    )
    expect(results[0].monthlyRate).toBe(0)
    expect(results[0].profession).toBe('')
  })

  it('31-day month calculation is correct', () => {
    const results = matchAttendanceToEmployees(
      [makeRow({ attendanceDays: 31 })],
      [makeEmployee()],
      [makeRate({ monthly_rate: 3100 })],
      31
    )
    expect(results[0].matchStatus).toBe('matched')
    expect(results[0].amount).toBe(3100)
  })

  it('employee without residence_number is excluded from index', () => {
    const results = matchAttendanceToEmployees(
      [makeRow({ residenceNumber: 12345678 })],
      [makeEmployee({ residence_number: 0 as unknown as number })],
      [makeRate()],
      30
    )
    // Employee with falsy residence not indexed → row becomes unknown
    expect(results[0].matchStatus).toBe('unknown')
  })
})
