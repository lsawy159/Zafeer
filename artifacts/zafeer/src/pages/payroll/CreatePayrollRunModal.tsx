import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  Loader2,
  Plus,
  X,
} from 'lucide-react'
import { PayrollInputMode, PayrollScopeType } from '@/lib/supabase'
import { roundPayrollAmount } from '@/utils/payrollMath'
import { type PayrollRunSeedRow } from './payrollTypes'

interface Props {
  show: boolean
  payrollForm: {
    payroll_month: string
    scope_type: PayrollScopeType
    scope_id: string
    input_mode: PayrollInputMode
    notes: string
  }
  scopeOptions: Array<{ id: string; name: string }>
  newPayrollRunRows: PayrollRunSeedRow[]
  selectedNewPayrollRunRows: PayrollRunSeedRow[]
  allNewPayrollRunRowsSelected: boolean
  payrollRunSeedEmployeesLoading: boolean
  seedEmployeeIds: Set<string>
  normalizedPayrollFormMonth: string | undefined
  createPayrollRunPending: boolean
  upsertPayrollEntryPending: boolean
  outlineCompactButtonClass: string
  successCompactButtonClass: string
  getPayrollRunDisplayName: (scopeType: PayrollScopeType, scopeId: string, payrollMonth: string) => string
  onSetPayrollForm: (updater: (current: Props['payrollForm']) => Props['payrollForm']) => void
  onToggleSelectAll: (checked: boolean) => void
  onUpdateRow: (employeeId: string, field: keyof PayrollRunSeedRow, value: unknown) => void
  onClose: () => void
  onSubmit: () => void
}

export default function CreatePayrollRunModal({
  show,
  payrollForm,
  scopeOptions,
  newPayrollRunRows,
  selectedNewPayrollRunRows,
  allNewPayrollRunRowsSelected,
  payrollRunSeedEmployeesLoading,
  seedEmployeeIds,
  normalizedPayrollFormMonth,
  createPayrollRunPending,
  upsertPayrollEntryPending,
  outlineCompactButtonClass,
  successCompactButtonClass,
  getPayrollRunDisplayName,
  onSetPayrollForm,
  onToggleSelectAll,
  onUpdateRow,
  onClose,
  onSubmit,
}: Props) {
  if (!show) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-surface-secondary-950/55 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!createPayrollRunPending && !upsertPayrollEntryPending) {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-7xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border-200 bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border-200 bg-surface px-5 py-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">إضافة مسير جديد</h2>
            <p className="mt-1 text-sm text-foreground-secondary">
              اختر المشروع أو المؤسسة، وسيتم تحميل موظفي النطاق تلقائيًا مع الراتب
              الحالي والأقساط المستحقة لهذا الشهر.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={createPayrollRunPending || upsertPayrollEntryPending}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-200 text-foreground-tertiary hover:bg-surface-secondary-50 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground-secondary">
                شهر الرواتب
              </label>
              <input
                type="month"
                value={payrollForm.payroll_month}
                onChange={(e) =>
                  onSetPayrollForm((current) => ({ ...current, payroll_month: e.target.value }))
                }
                className="w-full rounded-xl border border-border-300 bg-surface px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground-secondary">
                نوع المسير
              </label>
              <select
                value={payrollForm.scope_type}
                onChange={(e) =>
                  onSetPayrollForm((current) => ({
                    ...current,
                    scope_type: e.target.value as PayrollScopeType,
                    scope_id: '',
                  }))
                }
                className="w-full rounded-xl border border-border-300 bg-surface px-3 py-2 text-sm"
              >
                <option value="company">مسير لمؤسسة</option>
                <option value="project">مسير لمشروع</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground-secondary">
                {payrollForm.scope_type === 'project' ? 'اختر المشروع' : 'اختر المؤسسة'}
              </label>
              <select
                value={payrollForm.scope_id}
                onChange={(e) =>
                  onSetPayrollForm((current) => ({ ...current, scope_id: e.target.value }))
                }
                className="w-full rounded-xl border border-border-300 bg-surface px-3 py-2 text-sm"
              >
                <option value="">اختر...</option>
                {scopeOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground-secondary">
                طريقة الإدخال
              </label>
              <select
                value={payrollForm.input_mode}
                onChange={(e) =>
                  onSetPayrollForm((current) => ({
                    ...current,
                    input_mode: e.target.value as PayrollInputMode,
                  }))
                }
                className="w-full rounded-xl border border-border-300 bg-surface px-3 py-2 text-sm"
              >
                <option value="manual">يدوي</option>
                <option value="excel">Excel</option>
                <option value="mixed">مختلط</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            {payrollForm.scope_id ? (
              <>
                سيتم إنشاء:{' '}
                <strong>
                  {getPayrollRunDisplayName(
                    payrollForm.scope_type,
                    payrollForm.scope_id,
                    payrollForm.payroll_month
                  )}
                </strong>
                {' — '}الموظفون يظهرون مرة واحدة فقط بناءً على رقم الإقامة.
              </>
            ) : (
              'اختر الشهر والنطاق أولاً ليتم تحميل قائمة الموظفين تلقائيًا.'
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground-secondary">
              ملاحظات المسير
            </label>
            <textarea
              value={payrollForm.notes}
              onChange={(e) =>
                onSetPayrollForm((current) => ({ ...current, notes: e.target.value }))
              }
              rows={2}
              className="w-full rounded-xl border border-border-300 bg-surface px-3 py-2 text-sm resize-none"
              placeholder="اختياري"
            />
          </div>

          <div className="rounded-2xl border border-border-200 overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-border-200 bg-surface-secondary-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-semibold text-foreground">موظفو المسير</div>
                <div className="mt-1 text-sm text-foreground-secondary">
                  الموظفون المعروضون مرتبطون بنفس المشروع أو المؤسسة، والراتب والأقساط
                  محمّلة تلقائيًا وقابلة للتعديل قبل الإنشاء.
                </div>
              </div>
              {newPayrollRunRows.length > 0 && (
                <label className="inline-flex items-center gap-2 text-sm text-foreground-secondary">
                  <input
                    type="checkbox"
                    checked={allNewPayrollRunRowsSelected}
                    onChange={(e) => onToggleSelectAll(e.target.checked)}
                    className="rounded border-border-300"
                  />
                  تحديد الكل
                </label>
              )}
            </div>

            {!payrollForm.scope_id || !normalizedPayrollFormMonth ? (
              <div className="px-4 py-10 text-center text-sm text-foreground-tertiary">
                اختر الشهر والنطاق لعرض الموظفين.
              </div>
            ) : payrollRunSeedEmployeesLoading ? (
              <div className="px-4 py-10 text-center text-sm text-foreground-tertiary">
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                جاري تحميل موظفي المسير...
              </div>
            ) : newPayrollRunRows.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-foreground-tertiary">
                لا يوجد موظفون داخل هذا النطاق حاليًا.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1380px] text-sm">
                  <thead className="bg-surface-secondary-50">
                    <tr>
                      <th className="px-3 py-3 text-right">اختيار</th>
                      <th className="px-3 py-3 text-right">الموظف</th>
                      <th className="px-3 py-3 text-right">الإقامة</th>
                      <th className="px-3 py-3 text-right">الراتب</th>
                      <th className="px-3 py-3 text-right">الأجر اليومي</th>
                      <th className="px-3 py-3 text-right">الحضور</th>
                      <th className="px-3 py-3 text-right">الإجازات</th>
                      <th className="px-3 py-3 text-right">نقل/تجديد</th>
                      <th className="px-3 py-3 text-right">جزاءات</th>
                      <th className="px-3 py-3 text-right">سلفة</th>
                      <th className="px-3 py-3 text-right">أخرى</th>
                      <th className="px-3 py-3 text-right">إجمالي الاستقطاعات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-100">
                    {newPayrollRunRows.map((row) => {
                      const rowDailyRate = roundPayrollAmount(row.basic_salary_snapshot / 30)
                      const rowTotalDeductions =
                        row.transfer_renewal_amount +
                        row.penalty_amount +
                        row.advance_amount +
                        row.other_amount

                      return (
                        <tr
                          key={row.employee_id}
                          className={row.included ? 'bg-surface' : 'bg-surface-secondary-50/70'}
                        >
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={row.included}
                              onChange={(e) =>
                                onUpdateRow(row.employee_id, 'included', e.target.checked)
                              }
                              className="rounded border-border-300"
                            />
                          </td>
                          <td className="px-3 py-3 font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              {row.employee_name}
                              {!payrollRunSeedEmployeesLoading &&
                                !seedEmployeeIds.has(row.employee_id) && (
                                  <span
                                    title="هذا الموظف غير موجود في النطاق المحدد حاليًا"
                                    className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                    خارج النطاق
                                  </span>
                                )}
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono text-foreground-secondary">
                            {row.residence_number}
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.basic_salary_snapshot}
                              onChange={(e) =>
                                onUpdateRow(
                                  row.employee_id,
                                  'basic_salary_snapshot',
                                  Number(e.target.value) || 0
                                )
                              }
                              className="w-28 rounded-lg border border-border-300 bg-surface px-2 py-1.5"
                            />
                          </td>
                          <td className="px-3 py-3 text-foreground-secondary">
                            {rowDailyRate.toLocaleString('en-US')}
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={row.attendance_days}
                              onChange={(e) =>
                                onUpdateRow(
                                  row.employee_id,
                                  'attendance_days',
                                  Number(e.target.value) || 0
                                )
                              }
                              className="w-20 rounded-lg border border-border-300 bg-surface px-2 py-1.5"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={row.paid_leave_days}
                              onChange={(e) =>
                                onUpdateRow(
                                  row.employee_id,
                                  'paid_leave_days',
                                  Number(e.target.value) || 0
                                )
                              }
                              className="w-20 rounded-lg border border-border-300 bg-surface px-2 py-1.5"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.transfer_renewal_amount}
                              onChange={(e) =>
                                onUpdateRow(
                                  row.employee_id,
                                  'transfer_renewal_amount',
                                  Number(e.target.value) || 0
                                )
                              }
                              className="w-24 rounded-lg border border-border-300 bg-surface px-2 py-1.5"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.penalty_amount}
                              onChange={(e) =>
                                onUpdateRow(
                                  row.employee_id,
                                  'penalty_amount',
                                  Number(e.target.value) || 0
                                )
                              }
                              className="w-24 rounded-lg border border-border-300 bg-surface px-2 py-1.5"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.advance_amount}
                              onChange={(e) =>
                                onUpdateRow(
                                  row.employee_id,
                                  'advance_amount',
                                  Number(e.target.value) || 0
                                )
                              }
                              className="w-24 rounded-lg border border-border-300 bg-surface px-2 py-1.5"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.other_amount}
                              onChange={(e) =>
                                onUpdateRow(
                                  row.employee_id,
                                  'other_amount',
                                  Number(e.target.value) || 0
                                )
                              }
                              className="w-24 rounded-lg border border-border-300 bg-surface px-2 py-1.5"
                            />
                          </td>
                          <td className="px-3 py-3 font-semibold text-red-600">
                            {rowTotalDeductions.toLocaleString('en-US')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border-200 px-5 py-4">
          <div className="text-sm text-foreground-secondary">
            المحددون: <strong>{selectedNewPayrollRunRows.length}</strong> من أصل{' '}
            <strong>{newPayrollRunRows.length}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={outlineCompactButtonClass}
              disabled={createPayrollRunPending || upsertPayrollEntryPending}
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className={successCompactButtonClass}
              disabled={createPayrollRunPending || upsertPayrollEntryPending}
            >
              {createPayrollRunPending || upsertPayrollEntryPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              إنشاء المسير
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
