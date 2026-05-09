import type { PayrollObligationBreakdown } from '@/utils/payrollObligationBuckets'
import type { PayrollEntry } from '@/lib/supabase'
import type { ScopedPayrollEmployee } from '@/hooks/usePayroll'

export interface PayrollExportRow {
  'اسم الموظف': string
  'رقم الإقامة': number
  المؤسسة: string
  المشروع: string
  'إجمالي الراتب': number
  'صافي الراتب': number
  'قسط رسوم نقل وتجديد': number
  'قسط جزاءات وغرامات': number
  'قسط سلفة': number
  'قسط أخرى': number
  'إجمالي الاستقطاعات': number
  'أيام الحضور': number
  'الإجازات المدفوعة': number
  الحالة: string
  ملاحظات: string
}

export interface PayrollSearchRow extends PayrollEntry {
  payroll_month_label: string
  payroll_run_status: string
  project_label: string
  company_label: string
  residence_label: string
  deduction_breakdown: PayrollObligationBreakdown
  total_deductions: number
  obligation_total: number
  obligation_paid: number
  obligation_remaining: number
}

export interface ObligationInsightRow {
  employee_id: string
  employee_name: string
  residence_number: string
  project_name: string
  due_month: string
  amount_due: number
  amount_paid: number
}

export interface PayrollExcelRow {
  residence_number: string
  attendance_days: number
  paid_leave_days: number
  overtime_amount: number
  transfer_renewal_amount: number
  penalty_amount: number
  advance_amount: number
  other_amount: number
  deductions_amount: number
  installment_deducted_amount: number
  overtime_notes: string
  deductions_notes: string
  notes: string
}

export interface PayrollExcelPreviewRow extends PayrollExcelRow {
  row_number: number
  employee_id: string
  employee_name: string
  company_name?: string | null
  project_name?: string | null
  basic_salary_snapshot: number
  daily_rate_snapshot: number
  gross_amount: number
  net_amount: number
}

export interface DaysImportPreviewRow {
  row_number: number
  iqama: string
  employee_name_from_file: string
  attendance_days: number
  paid_leave_days: number
  entry_id: string
  employee_name_snapshot: string
  old_attendance_days: number
  old_paid_leave_days: number
  old_gross: number
  old_net: number
  new_gross: number
  new_net: number
  basic_salary_snapshot: number
  overtime_amount: number
  deductions_amount: number
  installment_deducted_amount: number
}

export interface ObligationImportRow {
  row_number: number
  employee_name_from_file: string
  residence_number: string
  notes: string
  employee_id: string | null
  employee_name: string | null
  selected: boolean
  // Per-type config: amount + installments + start_month
  advance_amount: number
  advance_installments: number
  advance_start_month: string
  transfer_amount: number
  transfer_installments: number
  transfer_start_month: string
  renewal_amount: number
  renewal_installments: number
  renewal_start_month: string
  penalty_amount: number
  penalty_installments: number
  penalty_start_month: string
  other_amount: number
  other_installments: number
  other_start_month: string
}

export interface PayrollRunSeedRow {
  employee_id: string
  employee_name: string
  residence_number: string
  included: boolean
  attendance_days: number
  paid_leave_days: number
  basic_salary_snapshot: number
  overtime_amount: number
  transfer_renewal_amount: number
  penalty_amount: number
  advance_amount: number
  other_amount: number
  overtime_notes: string
  deductions_notes: string
  notes: string
}

export const EMPTY_SCOPED_EMPLOYEES: ScopedPayrollEmployee[] = []

export const PAYROLL_EXCEL_HEADERS = {
  residence_number: ['رقم الإقامة', 'رقم الاقامة', 'residence_number', 'residence number'],
  attendance_days: ['أيام الحضور', 'ايام الحضور', 'attendance_days', 'attendance days'],
  paid_leave_days: ['الإجازات المدفوعة', 'الاجازات المدفوعة', 'paid_leave_days', 'paid leave days'],
  overtime_amount: ['الإضافي', 'الاضافي', 'overtime_amount', 'overtime amount'],
  transfer_renewal_amount: [
    'قسط رسوم نقل وتجديد',
    'رسوم نقل وتجديد',
    'transfer_renewal_amount',
    'transfer renewal amount',
  ],
  penalty_amount: ['قسط جزاءات وغرامات', 'جزاءات وغرامات', 'penalty_amount', 'penalty amount'],
  advance_amount: ['قسط سلفة', 'سلفة', 'advance_amount', 'advance amount'],
  other_amount: ['قسط أخرى', 'أخرى', 'other_amount', 'other amount'],
  deductions_amount: ['الخصومات', 'الحسومات', 'deductions_amount', 'deductions amount'],
  installment_deducted_amount: [
    'خصم الأقساط',
    'خصم الاقساط',
    'installment_deducted_amount',
    'installment deducted amount',
  ],
  overtime_notes: ['ملاحظات الإضافي', 'ملاحظات الاضافي', 'overtime_notes', 'overtime notes'],
  deductions_notes: [
    'ملاحظات الخصومات',
    'ملاحظات الحسومات',
    'deductions_notes',
    'deductions notes',
  ],
  notes: ['ملاحظات', 'notes'],
} as const

export const REQUIRED_PAYROLL_EXCEL_FIELDS: Array<keyof typeof PAYROLL_EXCEL_HEADERS> = [
  'residence_number',
]

export const DAYS_IMPORT_HEADERS = {
  iqama: [
    'رقم الإقامة', 'رقم الاقامة', 'الإقامة', 'الاقامة',
    'iqama', 'residence_number', 'residence number',
  ],
  employee_name: [
    'اسم الموظف', 'الموظف', 'الاسم', 'اسم',
    'name', 'employee_name', 'employee name', 'employee',
  ],
  attendance_days: [
    'عدد أيام الحضور', 'عدد ايام الحضور', 'أيام الحضور', 'ايام الحضور',
    'حضور', 'number of days present', 'days present', 'attendance_days', 'attendance days',
  ],
  paid_leave_days: [
    'الاجازات المدفوعة', 'الإجازات المدفوعة',
    'عدد أيام الإجازة', 'عدد ايام الاجازة', 'أيام الإجازة', 'ايام الاجازة',
    'أيام الغياب', 'ايام الغياب', 'غياب', 'إجازة', 'اجازة',
    'number of dayoff days', 'number of day-off days', 'days off', 'day off',
    'day_off', 'paid_leave_days', 'paid leave days',
  ],
} as const

export const OBLIGATION_IMPORT_HEADERS = {
  employee_name: ['اسم الموظف', 'الموظف', 'الاسم', 'اسم', 'name', 'employee_name', 'employee name'],
  residence_number: ['رقم الإقامة', 'رقم الاقامة', 'الإقامة', 'الاقامة', 'iqama', 'residence_number', 'residence number'],
  advance_amount: ['سلفة', 'سلف', 'advance', 'advance_amount', 'قسط سلفة'],
  transfer_amount: ['نقل كفالة', 'نقل', 'transfer', 'transfer_amount', 'كفالة', 'رسوم نقل'],
  renewal_amount: ['تجديد', 'renewal', 'renewal_amount', 'رسوم تجديد'],
  penalty_amount: ['غرامة', 'غرامات', 'جزاءات', 'penalty', 'penalty_amount'],
  other_amount: ['أخرى', 'أخر', 'other', 'other_amount'],
  notes: ['ملاحظات', 'notes', 'note'],
} as const
