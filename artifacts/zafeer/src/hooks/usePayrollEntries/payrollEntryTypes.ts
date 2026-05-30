import {
  Employee,
  ObligationType,
  PayrollEntry,
  PayrollRun,
} from '@/lib/supabase'
import {
  PayrollObligationBreakdown,
} from '@/utils/payrollObligationBuckets'

// ─── Exported types ────────────────────────────────────────────────────────────

export interface ScopedPayrollEmployee extends Omit<Employee, 'company' | 'project'> {
  company?: { name?: string | null } | null
  project?: { name?: string | null } | null
  suggested_installment_amount: number
  suggested_deduction_breakdown: PayrollObligationBreakdown
}

export interface UpsertPayrollEntryInput {
  payroll_run_id: string
  payroll_run_status?: PayrollRun['status']
  payroll_month: string
  employee_id: string
  residence_number_snapshot: number
  employee_name_snapshot: string
  company_name_snapshot?: string | null
  project_name_snapshot?: string | null
  basic_salary_snapshot: number
  daily_rate_snapshot: number
  attendance_days: number
  paid_leave_days: number
  overtime_amount: number
  overtime_notes?: string | null
  deductions_amount: number
  deductions_notes?: string | null
  installment_deducted_amount: number
  deduction_breakdown?: Partial<PayrollObligationBreakdown>
  gross_amount: number
  net_amount: number
  entry_status?: PayrollEntry['entry_status']
  notes?: string | null
}

export interface PayrollSlipSummary {
  id: string
  payroll_entry_id: string
  slip_number: string
  snapshot_data: Record<string, unknown>
  generated_at?: string | null
  template_version: string
}

// ─── Internal types (used by fetch functions) ─────────────────────────────────

export interface PayrollInstallmentComponentRow {
  id?: string
  amount: number
  source_line_id?: string | null
  component_code?: string | null
  payroll_entry_id?: string | null
}

export interface ObligationLineAllocationRow {
  id: string
  header_id: string
  amount_due: number
  amount_paid: number
  payroll_entry_id?: string | null
  line_status?: 'unpaid' | 'partial' | 'paid' | 'rescheduled' | 'cancelled'
}

export interface ObligationHeaderRow {
  id: string
  obligation_type: ObligationType
  title: string
  currency_code: string
  notes?: string | null
}

export interface PayrollEntryComponentRow {
  payroll_entry_id: string
  component_type: 'earning' | 'deduction' | 'installment'
  component_code: string
  amount: number
  notes?: string | null
  source_line_id?: string | null
  sort_order: number
}
