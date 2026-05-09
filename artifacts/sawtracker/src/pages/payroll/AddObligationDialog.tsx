import { createPortal } from 'react-dom'
import { X, CheckCircle, AlertTriangle, Plus, Loader2 } from 'lucide-react'

interface SimpleEmployee {
  id: string | number
  name: string
  residence_number?: string | number | null
}

interface AddObligationForm {
  obligation_type: 'transfer' | 'renewal' | 'penalty' | 'advance' | 'other'
  total_amount: number
  installment_count: number
  start_month: string
  notes: string
}

interface AddObligationDialogProps {
  show: boolean
  addObligationEmployeeSearch: string
  addObligationSelectedEmployeeId: string
  addObligationForm: AddObligationForm
  addObligationStartMonthConflict: boolean
  checkingAddObligationMonth: boolean
  dialogEmployeeOptions: SimpleEmployee[]
  isCreatingPending: boolean
  outlineCompactButtonClass: string
  primaryCompactButtonClass: string
  onClose: () => void
  onSetEmployeeSearch: (v: string) => void
  onSetSelectedEmployeeId: (id: string) => void
  onSetForm: (updater: (f: AddObligationForm) => AddObligationForm) => void
  onSubmit: () => void
}

export default function AddObligationDialog({
  show,
  addObligationEmployeeSearch,
  addObligationSelectedEmployeeId,
  addObligationForm,
  addObligationStartMonthConflict,
  checkingAddObligationMonth,
  dialogEmployeeOptions,
  isCreatingPending,
  outlineCompactButtonClass,
  primaryCompactButtonClass,
  onClose,
  onSetEmployeeSearch,
  onSetSelectedEmployeeId,
  onSetForm,
  onSubmit,
}: AddObligationDialogProps) {
  if (!show) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-surface-secondary-950/55 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!isCreatingPending) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-border-200 bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border-200 px-5 py-4">
          <h2 className="text-lg font-bold text-foreground">إضافة التزام جديد</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-200 text-foreground-tertiary hover:bg-surface-secondary-50 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {/* Employee search */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground-secondary">
              البحث عن موظف (الاسم أو رقم الإقامة)
            </label>
            <input
              type="text"
              value={addObligationEmployeeSearch}
              onChange={(e) => {
                onSetEmployeeSearch(e.target.value)
                onSetSelectedEmployeeId('')
              }}
              placeholder="اكتب الاسم أو رقم الإقامة..."
              className="w-full rounded-xl border border-border-300 bg-surface px-3 py-2 text-sm"
            />
            {addObligationEmployeeSearch && !addObligationSelectedEmployeeId && (
              <div className="mt-1 max-h-44 overflow-y-auto rounded-xl border border-border-200 bg-surface shadow-lg">
                {dialogEmployeeOptions.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-foreground-tertiary">لا توجد نتائج</p>
                ) : (
                  dialogEmployeeOptions.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => {
                        onSetSelectedEmployeeId(emp.id as string)
                        onSetEmployeeSearch(
                          `${emp.name} — ${emp.residence_number}`
                        )
                      }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-surface-secondary-50 text-right"
                    >
                      <span className="font-medium">{emp.name}</span>
                      <span className="font-mono text-foreground-tertiary text-xs">
                        {emp.residence_number}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
            {addObligationSelectedEmployeeId && (
              <p className="mt-1 text-xs text-green-700 font-medium flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" />
                تم اختيار الموظف
              </p>
            )}
          </div>

          {/* Obligation type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground-secondary">
              نوع الالتزام
            </label>
            <select
              value={addObligationForm.obligation_type}
              onChange={(e) =>
                onSetForm((f) => ({
                  ...f,
                  obligation_type: e.target.value as AddObligationForm['obligation_type'],
                }))
              }
              className="w-full rounded-xl border border-border-300 bg-surface px-3 py-2 text-sm"
            >
              <option value="advance">سلفة</option>
              <option value="transfer">نقل كفالة</option>
              <option value="renewal">تجديد</option>
              <option value="penalty">غرامة / جزاء</option>
              <option value="other">أخرى</option>
            </select>
          </div>

          {/* Amount + installments */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground-secondary">
                قيمة الالتزام الكلية
              </label>
              <input
                type="number"
                min={0}
                value={addObligationForm.total_amount || ''}
                onChange={(e) =>
                  onSetForm((f) => ({
                    ...f,
                    total_amount: Number(e.target.value) || 0,
                  }))
                }
                className="w-full rounded-xl border border-border-300 bg-surface px-3 py-2 text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground-secondary">
                عدد أشهر الأقساط
              </label>
              <input
                type="number"
                min={1}
                value={addObligationForm.installment_count || ''}
                onChange={(e) =>
                  onSetForm((f) => ({
                    ...f,
                    installment_count: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
                className="w-full rounded-xl border border-border-300 bg-surface px-3 py-2 text-sm"
                placeholder="1"
              />
            </div>
          </div>

          {/* Start month */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground-secondary">
              شهر بداية أول قسط
            </label>
            <input
              type="month"
              value={addObligationForm.start_month}
              onChange={(e) =>
                onSetForm((f) => ({ ...f, start_month: e.target.value }))
              }
              className="w-full rounded-xl border border-border-300 bg-surface px-3 py-2 text-sm"
            />
          </div>

          {/* Finalized payroll conflict warning */}
          {addObligationStartMonthConflict && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
              <div className="flex items-start gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
                <div>
                  <p className="font-semibold">لا يمكن بدء الأقساط في هذا الشهر</p>
                  <p className="mt-1 text-amber-700">
                    تم اعتماد مسير شهر{' '}
                    <strong>
                      {new Date(`${addObligationForm.start_month}-02`).toLocaleDateString('ar-SA', {
                        year: 'numeric',
                        month: 'long',
                      })}
                    </strong>{' '}
                    لهذا الموظف بالفعل. اختر شهرًا لاحقًا أو عدّل المسير المعتمد أولاً.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          {addObligationForm.total_amount > 0 && addObligationForm.installment_count > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              قسط شهري تقريبي:{' '}
              <strong>
                {(
                  addObligationForm.total_amount / addObligationForm.installment_count
                ).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </strong>{' '}
              × {addObligationForm.installment_count} شهر
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground-secondary">
              ملاحظات (اختياري)
            </label>
            <textarea
              value={addObligationForm.notes}
              onChange={(e) =>
                onSetForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={2}
              className="w-full rounded-xl border border-border-300 bg-surface px-3 py-2 text-sm resize-none"
              placeholder="أي ملاحظات إضافية..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className={outlineCompactButtonClass}
            disabled={isCreatingPending}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className={primaryCompactButtonClass}
            disabled={isCreatingPending || !addObligationSelectedEmployeeId || addObligationStartMonthConflict || checkingAddObligationMonth}
          >
            {isCreatingPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            إضافة الالتزام
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
