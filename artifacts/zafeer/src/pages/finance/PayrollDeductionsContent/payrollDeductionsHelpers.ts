import type { PayrollEntry, PayrollInputMode, PayrollRun, PayrollScopeType } from '@/lib/supabase'
import type { PayrollExportRow, PayrollSearchRow } from '../../payroll/payrollTypes'
import type { PayrollObligationBreakdown } from '@/utils/payrollObligationBuckets'
import type { loadXlsx } from '@/utils/lazyXlsx'
import {
  EMPTY_PAYROLL_OBLIGATION_BREAKDOWN,
  getPayrollObligationBreakdownTotal,
  normalizePayrollObligationBreakdown,
} from '@/utils/payrollObligationBuckets'
import { calculatePayrollTotals, roundPayrollAmount } from '@/utils/payrollMath'

// ─── status/scope label helpers ────────────────────────────────────────────

export function getPayrollStatusText(status: string): string {
  switch (status) {
    case 'draft': return 'مسودة'
    case 'processing': return 'قيد المعالجة'
    case 'finalized': return 'نهائي'
    case 'cancelled': return 'ملغي'
    case 'calculated': return 'محسوب'
    case 'paid': return 'مدفوع'
    default: return status
  }
}

export function getPayrollInputModeText(inputMode: PayrollInputMode): string {
  switch (inputMode) {
    case 'manual': return 'يدوي'
    case 'excel': return 'Excel'
    case 'mixed': return 'مختلط'
    default: return inputMode
  }
}

export function formatPayrollMonthLabel(monthValue: string): string {
  const normalizedMonth = monthValue.slice(0, 7)
  const parsedDate = new Date(`${normalizedMonth}-01T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) return normalizedMonth
  return new Intl.DateTimeFormat('ar', { month: 'long', year: 'numeric' }).format(parsedDate)
}

export function sanitizePayrollFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '_')
}

export function getPayrollScopeName(
  scopeType: PayrollScopeType,
  scopeId: string,
  companies: Array<{ id: string; name: string }>,
  projects: Array<{ id: string; name: string }>
): string {
  if (scopeType === 'company') {
    return companies.find((c) => c.id === scopeId)?.name ?? 'مؤسسة غير معروفة'
  }
  return projects.find((p) => p.id === scopeId)?.name ?? 'مشروع غير معروف'
}

export function getPayrollRunDisplayName(
  scopeType: PayrollScopeType,
  scopeId: string,
  payrollMonth: string,
  companies: Array<{ id: string; name: string }>,
  projects: Array<{ id: string; name: string }>
): string {
  const scopeName = getPayrollScopeName(scopeType, scopeId, companies, projects)
  const monthLabel = formatPayrollMonthLabel(payrollMonth)
  return scopeType === 'project'
    ? `مسير شهر ${monthLabel} لمشروع ${scopeName}`
    : `مسير شهر ${monthLabel} لمؤسسة ${scopeName}`
}

// ─── sort helper ───────────────────────────────────────────────────────────

export function getSortableValue(
  row: PayrollSearchRow,
  sortField: 'employee_name' | 'residence' | 'project' | 'month' | 'status' | 'deductions' | 'remaining' | 'net_amount'
): string | number | undefined {
  switch (sortField) {
    case 'employee_name': return row.employee_name_snapshot
    case 'residence': return row.residence_label
    case 'project': return row.project_label
    case 'month': return row.payroll_month_label
    case 'status': return row.payroll_run_status
    case 'deductions': return row.total_deductions
    case 'remaining': return row.obligation_remaining
    case 'net_amount': return row.net_amount
  }
}

// ─── obligation label helpers ──────────────────────────────────────────────

export function obligationTypeLabel(type: string): string {
  const map: Record<string, string> = {
    advance: 'سلفة',
    transfer: 'نقل كفالة',
    renewal: 'تجديد',
    penalty: 'غرامة',
    other: 'التزام آخر',
  }
  return map[type] ?? type
}

export function lineStatusLabel(status: string): { text: string; color: string } {
  const map: Record<string, { text: string; color: string }> = {
    paid: { text: 'مدفوع', color: '#15803d' },
    unpaid: { text: 'غير مدفوع', color: '#dc2626' },
    partial: { text: 'مدفوع جزئيًا', color: '#d97706' },
    skipped: { text: 'متجاوز', color: '#6b7280' },
  }
  return map[status] ?? { text: status, color: '#0f172a' }
}

// ─── export helpers ────────────────────────────────────────────────────────

export function buildPayrollExportRows(
  entries: PayrollEntry[],
  run: Pick<PayrollRun, 'scope_type' | 'scope_id' | 'status'>,
  breakdownByEntryId: Map<string, PayrollObligationBreakdown>,
  companies: Array<{ id: string; name: string }>,
  projects: Array<{ id: string; name: string }>
): PayrollExportRow[] {
  return entries.map((entry: PayrollEntry) => {
    const breakdown = normalizePayrollObligationBreakdown(
      breakdownByEntryId.get(entry.id) ?? {
        ...EMPTY_PAYROLL_OBLIGATION_BREAKDOWN,
        penalty: Number(entry.deductions_amount || 0),
        advance: Number(entry.installment_deducted_amount || 0),
      }
    )
    const totalDeductions = getPayrollObligationBreakdownTotal(breakdown)
    const normalizedTotals = calculatePayrollTotals(
      Number(entry.basic_salary_snapshot || 0),
      Number(entry.attendance_days || 0),
      Number(entry.paid_leave_days || 0),
      Number(entry.overtime_amount || 0),
      totalDeductions
    )
    return {
      'اسم الموظف': entry.employee_name_snapshot,
      'رقم الإقامة': entry.residence_number_snapshot,
      المؤسسة:
        entry.company_name_snapshot ||
        (run.scope_type === 'company'
          ? getPayrollScopeName(run.scope_type, run.scope_id, companies, projects)
          : '-'),
      المشروع:
        entry.project_name_snapshot ||
        (run.scope_type === 'project'
          ? getPayrollScopeName(run.scope_type, run.scope_id, companies, projects)
          : '-'),
      'إجمالي الراتب': normalizedTotals.grossAmount,
      'صافي الراتب': normalizedTotals.netAmount,
      'قسط رسوم نقل وتجديد': breakdown.transfer_renewal,
      'قسط جزاءات وغرامات': breakdown.penalty,
      'قسط سلفة': breakdown.advance,
      'قسط أخرى': breakdown.other,
      'إجمالي الاستقطاعات': totalDeductions,
      'أيام الحضور': entry.attendance_days,
      'الإجازات المدفوعة': entry.paid_leave_days,
      الحالة: getPayrollStatusText(entry.entry_status),
      ملاحظات: entry.notes || '',
    }
  })
}

export function buildPayrollExportWorkbook(
  XLSX: Awaited<ReturnType<typeof loadXlsx>>,
  run: PayrollRun,
  entries: PayrollEntry[],
  breakdownByEntryId: Map<string, PayrollObligationBreakdown>,
  companies: Array<{ id: string; name: string }>,
  projects: Array<{ id: string; name: string }>
) {
  const rows = buildPayrollExportRows(entries, run, breakdownByEntryId, companies, projects)
  const scopeName = getPayrollScopeName(run.scope_type, run.scope_id, companies, projects)
  const runTitle = getPayrollRunDisplayName(run.scope_type, run.scope_id, run.payroll_month, companies, projects)
  const monthLabel = formatPayrollMonthLabel(run.payroll_month)
  const totalGross = rows.reduce(
    (sum, row) => roundPayrollAmount(sum + Number(row['إجمالي الراتب'] || 0)),
    0
  )
  const totalNet = rows.reduce(
    (sum, row) => roundPayrollAmount(sum + Number(row['صافي الراتب'] || 0)),
    0
  )
  const headers = [
    'اسم الموظف', 'رقم الإقامة', 'المؤسسة', 'المشروع',
    'إجمالي الراتب', 'صافي الراتب', 'قسط رسوم نقل وتجديد', 'قسط جزاءات وغرامات',
    'قسط سلفة', 'قسط أخرى', 'إجمالي الاستقطاعات', 'أيام الحضور',
    'الإجازات المدفوعة', 'الحالة', 'ملاحظات',
  ]
  const dataRows = rows.map((row) =>
    headers.map((header) => row[header as keyof PayrollExportRow])
  )

  const worksheet = XLSX.utils.aoa_to_sheet([
    [runTitle],
    [`تاريخ التصدير: ${new Date().toLocaleString('ar-EG')}`],
    [],
    ['الشهر', monthLabel, 'النطاق', scopeName, 'الحالة', getPayrollStatusText(run.status)],
    [
      'طريقة الإدخال',
      getPayrollInputModeText(run.input_mode),
      'عدد الموظفين',
      String(rows.length),
      'صافي المسير',
      totalNet.toLocaleString('en-US'),
    ],
    ['إجمالي المسير', totalGross.toLocaleString('en-US')],
    [],
    headers,
    ...dataRows,
  ])

  worksheet['!cols'] = [
    { wch: 22 }, { wch: 16 }, { wch: 20 }, { wch: 20 },
    { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 18 },
    { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 12 },
    { wch: 16 }, { wch: 12 }, { wch: 26 },
  ]
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } },
  ]
  worksheet['!autofilter'] = {
    ref: `A8:O${Math.max(8, dataRows.length + 8)}`,
  }

  const styledCells = ['A1', 'A2', 'A8', 'B8', 'C8', 'D8', 'E8', 'F8', 'G8', 'H8', 'I8', 'J8', 'K8', 'L8', 'M8', 'N8', 'O8']
  styledCells.forEach((cellAddress) => {
    const cell = worksheet[cellAddress]
    if (!cell) return
    ;(cell as { s?: unknown }).s = {
      alignment: { horizontal: 'center', vertical: 'center' },
      font: { bold: true },
    }
  })

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll Report')
  return workbook
}
