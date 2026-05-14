import { normalizePayrollObligationBreakdown } from '@/utils/payrollObligationBuckets'
import type { ScopedPayrollEmployee } from '@/hooks/usePayroll'
import type { PayrollRunSeedRow } from './payrollTypes'

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
