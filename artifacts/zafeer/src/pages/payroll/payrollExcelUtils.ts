import { normalizePayrollObligationBreakdown } from '@/utils/payrollObligationBuckets'
import type { ScopedPayrollEmployee } from '@/hooks/usePayroll'
import type { PayrollRunSeedRow } from './payrollTypes'

const ARABIC_MONTH_NAMES: Record<string, number> = {
  يناير: 1, فبراير: 2, مارس: 3, أبريل: 4, مايو: 5, يونيو: 6,
  يوليو: 7, أغسطس: 8, سبتمبر: 9, أكتوبر: 10, نوفمبر: 11, ديسمبر: 12,
}

const ENGLISH_MONTH_NAMES: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
  april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, october: 10, oct: 10,
  november: 11, nov: 11, december: 12, dec: 12,
}

export function parseObligationStartMonth(raw: unknown, fallback: string): string {
  const s = String(raw ?? '').trim()
  if (!s) return fallback

  if (/^\d{4}-\d{2}$/.test(s)) return s

  const mmYYYY = s.match(/^(\d{1,2})[/-](\d{4})$/)
  if (mmYYYY) {
    const m = parseInt(mmYYYY[1], 10)
    const y = mmYYYY[2]
    if (m >= 1 && m <= 12) return `${y}-${String(m).padStart(2, '0')}`
  }

  const monthYear = s.match(/^([^\d\s/-]+)[\s-]+(\d{4})$/i)
  if (monthYear) {
    const monthStr = monthYear[1].toLowerCase()
    const year = monthYear[2]
    const m = ENGLISH_MONTH_NAMES[monthStr] ?? ARABIC_MONTH_NAMES[monthStr]
    if (m) return `${year}-${String(m).padStart(2, '0')}`
  }

  const yearMonth = s.match(/^(\d{4})[\s/-]+([^\d\s/-]+)$/i)
  if (yearMonth) {
    const year = yearMonth[1]
    const monthStr = yearMonth[2].toLowerCase()
    const m = ENGLISH_MONTH_NAMES[monthStr] ?? ARABIC_MONTH_NAMES[monthStr]
    if (m) return `${year}-${String(m).padStart(2, '0')}`
  }

  return fallback
}

export function normalizePayrollExcelHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[​-‍﻿]/g, '')
}

export function normalizeResidenceNumber(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '')
}

export function toNumericPayrollValue(value: unknown): number {
  const normalizedValue = typeof value === 'string' ? value.replace(/,/g, '').trim() : value
  const numericValue = Number(normalizedValue)
  return Number.isFinite(numericValue) ? numericValue : 0
}

export function buildPayrollRunSeedRow(employee: ScopedPayrollEmployee): PayrollRunSeedRow {
  const suggestedBreakdown = normalizePayrollObligationBreakdown(
    employee.suggested_deduction_breakdown
  )

  return {
    employee_id: employee.id,
    employee_name: employee.name,
    residence_number: normalizeResidenceNumber(employee.residence_number),
    included: true,
    attendance_days: 30,
    paid_leave_days: 0,
    basic_salary_snapshot: Number(employee.salary || 0),
    overtime_amount: 0,
    transfer_renewal_amount: suggestedBreakdown.transfer_renewal,
    penalty_amount: suggestedBreakdown.penalty,
    advance_amount: suggestedBreakdown.advance,
    other_amount: suggestedBreakdown.other,
    overtime_notes: '',
    deductions_notes: '',
    notes: '',
  }
}
