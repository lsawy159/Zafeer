import {
  CheckCircle,
  Loader2,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'
import { type EmployeeObligationPlan } from '@/hooks/useEmployeeObligations'
import { type AllObligationsSummaryRow } from '@/hooks/useEmployeeObligations'

interface ObligationPaymentForm {
  amount_paid: number
  notes: string
}

interface Props {
  obligationDetailEmployeeId: string | null
  allObligationsSummary: AllObligationsSummaryRow[]
  detailObligationPlans: EmployeeObligationPlan[]
  detailObligationsLoading: boolean
  editingObligationLineId: string | null
  obligationPaymentForm: ObligationPaymentForm
  updateObligationLinePaymentPending: boolean
  outlineCompactButtonClass: string
  successCompactButtonClass: string
  canEditEmployees: boolean
  onClose: () => void
  onOpenEditDetailPlan: (plan: EmployeeObligationPlan) => void
  onSetDeletingDetailPlanId: (id: string) => void
  onStartEditObligationLine: (lineId: string, amountPaid: number, notes: string | null | undefined) => void
  onSetEditingObligationLineId: (id: string | null) => void
  onSetObligationPaymentForm: (updater: (f: ObligationPaymentForm) => ObligationPaymentForm) => void
  onSaveObligationLinePayment: (lineId: string, amountDue: number) => void
}

export default function ObligationDetailModal({
  obligationDetailEmployeeId,
  allObligationsSummary,
  detailObligationPlans,
  detailObligationsLoading,
  editingObligationLineId,
  obligationPaymentForm,
  updateObligationLinePaymentPending,
  outlineCompactButtonClass,
  successCompactButtonClass,
  canEditEmployees,
  onClose,
  onOpenEditDetailPlan,
  onSetDeletingDetailPlanId,
  onStartEditObligationLine,
  onSetEditingObligationLineId,
  onSetObligationPaymentForm,
  onSaveObligationLinePayment,
}: Props) {
  if (!obligationDetailEmployeeId) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-secondary-950/55 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!editingObligationLineId) {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border-200 bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border-200 bg-surface px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              التزامات الموظف
            </h2>
            <p className="text-sm text-foreground-secondary mt-0.5">
              {allObligationsSummary.find(r => r.employee_id === obligationDetailEmployeeId)?.employee_name ?? ''}
              {' — '}
              {allObligationsSummary.find(r => r.employee_id === obligationDetailEmployeeId)?.residence_number ?? ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-200 text-foreground-tertiary hover:bg-surface-secondary-50 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {detailObligationsLoading ? (
            <div className="py-10 text-center text-sm text-foreground-tertiary">
              <Loader2 className="mx-auto h-5 w-5 animate-spin mb-2" />
              جاري تحميل الالتزامات...
            </div>
          ) : detailObligationPlans.filter(p => p.status === 'active' || p.status === 'draft').length === 0 ? (
            <div className="py-10 text-center text-sm text-foreground-tertiary">
              لا توجد التزامات نشطة لهذا الموظف.
            </div>
          ) : (
            detailObligationPlans
              .filter(p => p.status === 'active' || p.status === 'draft')
              .map(plan => {
                const planRemaining = plan.lines.reduce(
                  (s, l) => s + Math.max(l.amount_due - l.amount_paid, 0),
                  0
                )
                const planPaid = plan.lines.reduce(
                  (s, l) => s + Number(l.amount_paid || 0),
                  0
                )
                return (
                  <div
                    key={plan.id}
                    className="rounded-xl border border-border-200 bg-surface overflow-hidden"
                  >
                    {/* Plan header */}
                    <div className="flex items-center justify-between gap-3 bg-surface-secondary-50 px-4 py-3 border-b border-border-100">
                      <div>
                        <span className="font-semibold text-foreground">{plan.title}</span>
                        <span className="mr-2 text-xs rounded-full px-2 py-0.5 bg-blue-100 text-blue-700">
                          {plan.installment_count} قسط
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-foreground-secondary">
                          مدفوع:{' '}
                          <strong className="text-green-700">
                            {planPaid.toLocaleString('en-US')}
                          </strong>
                          {' / '}متبقي:{' '}
                          <strong className="text-red-600">
                            {planRemaining.toLocaleString('en-US')}
                          </strong>
                        </div>
                        {canEditEmployees && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenEditDetailPlan(plan)}
                              title="تعديل الالتزام"
                              className="inline-flex h-6 w-6 items-center justify-center rounded border border-border-200 text-foreground-tertiary hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onSetDeletingDetailPlanId(plan.id)}
                              title="حذف الالتزام"
                              className="inline-flex h-6 w-6 items-center justify-center rounded border border-border-200 text-foreground-tertiary hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Lines */}
                    <div className="divide-y divide-border-100">
                      {plan.lines
                        .filter(l => l.line_status === 'unpaid' || l.line_status === 'partial')
                        .map(line => {
                          const remaining = Math.max(line.amount_due - line.amount_paid, 0)
                          const isEditing = editingObligationLineId === line.id
                          return (
                            <div key={line.id} className="px-4 py-3 space-y-3">
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-foreground-secondary">
                                    {line.due_month.slice(0, 7)}
                                  </span>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                      line.line_status === 'partial'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-blue-100 text-blue-700'
                                    }`}
                                  >
                                    {line.line_status === 'partial' ? 'جزئي' : 'مفتوح'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                  <span className="text-foreground-tertiary">
                                    المستحق: {line.amount_due.toLocaleString('en-US')}
                                  </span>
                                  <span className="text-green-700">
                                    مدفوع: {line.amount_paid.toLocaleString('en-US')}
                                  </span>
                                  <span className="font-semibold text-red-600">
                                    متبقي: {remaining.toLocaleString('en-US')}
                                  </span>
                                  {!isEditing && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onStartEditObligationLine(
                                          line.id,
                                          line.amount_paid,
                                          line.notes
                                        )
                                      }
                                      className="inline-flex items-center gap-1 rounded-lg border border-border-200 bg-surface px-2.5 py-1 text-xs font-medium text-foreground-secondary hover:bg-surface-secondary-50 transition"
                                    >
                                      تعديل
                                    </button>
                                  )}
                                </div>
                              </div>

                              {isEditing && (
                                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                                        إجمالي المدفوع حتى الآن
                                      </label>
                                      <input
                                        type="number"
                                        min={0}
                                        max={line.amount_due}
                                        step="0.01"
                                        value={obligationPaymentForm.amount_paid}
                                        onChange={e =>
                                          onSetObligationPaymentForm(f => ({
                                            ...f,
                                            amount_paid: Number(e.target.value) || 0,
                                          }))
                                        }
                                        className="w-full rounded-lg border border-border-300 bg-surface px-3 py-2 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                                        ملاحظات
                                      </label>
                                      <input
                                        type="text"
                                        value={obligationPaymentForm.notes}
                                        onChange={e =>
                                          onSetObligationPaymentForm(f => ({
                                            ...f,
                                            notes: e.target.value,
                                          }))
                                        }
                                        className="w-full rounded-lg border border-border-300 bg-surface px-3 py-2 text-sm"
                                        placeholder="اختياري"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => onSetEditingObligationLineId(null)}
                                      className={outlineCompactButtonClass}
                                      disabled={updateObligationLinePaymentPending}
                                    >
                                      إلغاء
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onSaveObligationLinePayment(line.id, line.amount_due)
                                      }
                                      className={successCompactButtonClass}
                                      disabled={updateObligationLinePaymentPending}
                                    >
                                      {updateObligationLinePaymentPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <CheckCircle className="h-4 w-4" />
                                      )}
                                      حفظ
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )
              })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className={outlineCompactButtonClass}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  )
}
