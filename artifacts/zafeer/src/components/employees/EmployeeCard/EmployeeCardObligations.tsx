import {
  AlertTriangle,
  CreditCard,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { Employee, Company, ObligationType } from '@/lib/supabase'
import { formatDateShortWithHijri } from '@/utils/dateFormatter'
import { HijriDateDisplay } from '@/components/ui/HijriDateDisplay'
import { getPayrollObligationBucketLabel } from '@/utils/payrollObligationBuckets'
import { formatMoney, OBLIGATION_TYPE_LABELS } from './useEmployeeCardLogic'
import type { EmployeeObligationPlan } from '@/hooks/useEmployeeObligations'

type ObligationBucket = 'transfer_renewal' | 'penalty' | 'advance' | 'other'

interface EmployeeCardObligationsProps {
  employee: Employee & { company: Company }
  canEdit: (resource: string) => boolean

  // Financial overlay state
  showFinancialOverlay: boolean
  setShowFinancialOverlay: (v: boolean) => void
  isLoadingObligations: boolean
  hasObligationsError: boolean
  obligationPlans: EmployeeObligationPlan[]
  activeObligationPlans: EmployeeObligationPlan[]
  allObligationLines: ReturnType<typeof Array.prototype.flatMap>
  openObligationLines: { amount_due: number; amount_paid: number }[]
  recentObligationLines: {
    id: string
    title: string
    due_month: string
    line_status: string
    amount_due: number
    amount_paid: number
    currency_code: string
    notes?: string | null
  }[]
  remainingObligationAmount: number
  paidObligationAmount: number
  obligationBucketSummary: Record<ObligationBucket, { total: number; paid: number; remaining: number }>
  editingObligationLineId: string | null
  obligationPaymentForm: { amount_paid: number; notes: string }
  setObligationPaymentForm: (v: { amount_paid: number; notes: string }) => void
  updateObligationLinePayment: { isPending: boolean }
  handleOpenEditPlan: (plan: EmployeeObligationPlan) => void
  setDeletingPlanId: (v: string | null) => void
  startEditingObligationLine: (lineId: string, amountPaid: number, notes?: string | null) => void
  handleSaveObligationPayment: (lineId: string, amountDue: number) => Promise<void>
  setEditingObligationLineId: (v: string | null) => void
  onAddObligation: () => void

  // Add obligation modal
  showObligationForm: boolean
  setShowObligationForm: (v: boolean) => void
  obligationForm: {
    obligation_type: ObligationType
    total_amount: number
    start_month: string
    installment_count: number
    notes: string
  }
  setObligationForm: (v: {
    obligation_type: ObligationType
    total_amount: number
    start_month: string
    installment_count: number
    notes: string
  }) => void
  installmentPreview: number[]
  startMonthConflict: boolean
  checkingStartMonth: boolean
  createEmployeeObligationPlan: { isPending: boolean }
  handleCreateObligationPlan: () => Promise<void>

  // Edit obligation modal
  editingPlanId: string | null
  setEditingPlanId: (v: string | null) => void
  editPlanForm: { obligation_type: ObligationType; title: string; total_amount: number; notes: string }
  setEditPlanForm: (v: { obligation_type: ObligationType; title: string; total_amount: number; notes: string }) => void
  updateObligationPlan: { isPending: boolean }
  handleUpdatePlan: () => Promise<void>

  // Delete obligation modal
  deletingPlanId: string | null
  setDeletingPlanId2: (v: string | null) => void
  deleteObligationPlan: { isPending: boolean }
  handleDeletePlan: () => Promise<void>
}

export function EmployeeCardObligations({
  canEdit,
  showFinancialOverlay,
  setShowFinancialOverlay,
  isLoadingObligations,
  hasObligationsError,
  obligationPlans,
  activeObligationPlans,
  openObligationLines,
  recentObligationLines,
  remainingObligationAmount,
  paidObligationAmount,
  obligationBucketSummary,
  editingObligationLineId,
  obligationPaymentForm,
  setObligationPaymentForm,
  updateObligationLinePayment,
  handleOpenEditPlan,
  setDeletingPlanId,
  startEditingObligationLine,
  handleSaveObligationPayment,
  setEditingObligationLineId,
  onAddObligation,
  showObligationForm,
  setShowObligationForm,
  obligationForm,
  setObligationForm,
  installmentPreview,
  startMonthConflict,
  checkingStartMonth,
  createEmployeeObligationPlan,
  handleCreateObligationPlan,
  editingPlanId,
  setEditingPlanId,
  editPlanForm,
  setEditPlanForm,
  updateObligationPlan,
  handleUpdatePlan,
  deletingPlanId,
  setDeletingPlanId2,
  deleteObligationPlan,
  handleDeletePlan,
}: EmployeeCardObligationsProps) {
  return (
    <>
      {/* ── Financial Overlay ──────────────────────────────────────────────── */}
      {showFinancialOverlay && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setShowFinancialOverlay(false)}
        >
          <div
            className="app-modal-surface relative isolate max-w-5xl max-h-[90vh] w-full overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border border-neutral-200 rounded-xl p-5 bg-neutral-50">
              <div className="flex flex-wrap items-start gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">الالتزامات المالية</h3>
                  <p className="text-sm text-neutral-600">ملخص الأقساط والخطط المفتوحة لهذا الموظف</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
                  <div className="text-sm text-neutral-500 whitespace-nowrap">
                    {isLoadingObligations ? 'جاري التحميل...' : `${activeObligationPlans.length} خطة نشطة / مسودة`}
                  </div>
                  {canEdit('employees') && (
                    <button
                      type="button"
                      onClick={onAddObligation}
                      className="app-button-primary px-4 py-2 text-sm whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      إضافة التزام
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowFinancialOverlay(false)}
                    className="app-button-secondary px-3 py-2 text-sm"
                  >
                    <X className="w-4 h-4" />
                    إغلاق
                  </button>
                </div>
              </div>

              {hasObligationsError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  تعذر تحميل بيانات الالتزامات المالية حالياً.
                </div>
              ) : isLoadingObligations ? (
                <div className="rounded-lg border border-neutral-200 bg-white px-4 py-6 text-center text-sm text-neutral-500">
                  جاري تحميل الالتزامات المالية...
                </div>
              ) : obligationPlans.length === 0 ? (
                <div className="rounded-lg border border-neutral-200 bg-white px-4 py-6 text-center text-sm text-neutral-500">
                  لا توجد التزامات مالية مسجلة لهذا الموظف بعد.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-white border border-neutral-200 p-4">
                      <div className="text-sm text-neutral-500 mb-1">إجمالي الخطط</div>
                      <div className="text-2xl font-bold text-neutral-900">{obligationPlans.length}</div>
                    </div>
                    <div className="rounded-lg bg-white border border-neutral-200 p-4">
                      <div className="text-sm text-neutral-500 mb-1">الأقساط المفتوحة</div>
                      <div className="text-2xl font-bold text-warning-600">{openObligationLines.length}</div>
                    </div>
                    <div className="rounded-lg bg-white border border-neutral-200 p-4">
                      <div className="text-sm text-neutral-500 mb-1">ما تم سداده</div>
                      <div className="text-2xl font-bold text-success-600">{formatMoney(paidObligationAmount)} SAR</div>
                    </div>
                    <div className="rounded-lg bg-white border border-neutral-200 p-4">
                      <div className="text-sm text-neutral-500 mb-1">المتبقي للسداد</div>
                      <div className="text-2xl font-bold text-blue-700">{formatMoney(remainingObligationAmount)} SAR</div>
                    </div>
                  </div>

                  {/* Bucket summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    {Object.entries(obligationBucketSummary).map(([bucketKey, bucketValue]) => (
                      <div key={bucketKey} className="rounded-lg border border-neutral-200 bg-white p-4">
                        <div className="text-sm text-neutral-500 mb-1">
                          {getPayrollObligationBucketLabel(bucketKey as ObligationBucket)}
                        </div>
                        <div className="text-lg font-bold text-slate-900">{formatMoney(bucketValue.remaining)} SAR</div>
                        <div className="mt-1 text-xs text-neutral-500">
                          المدفوع: {formatMoney(bucketValue.paid)} / الإجمالي: {formatMoney(bucketValue.total)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Per-plan cards */}
                  {activeObligationPlans.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-neutral-600 px-1">الخطط النشطة</h4>
                      {activeObligationPlans.map((plan) => {
                        const planPaid = plan.lines.reduce((s, l) => s + Number(l.amount_paid || 0), 0)
                        const planRemaining = Number(plan.total_amount) - planPaid
                        return (
                          <div
                            key={plan.id}
                            className="rounded-lg border border-neutral-200 bg-white px-4 py-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-neutral-900 text-sm">{plan.title}</span>
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] text-blue-700">
                                  {OBLIGATION_TYPE_LABELS[plan.obligation_type] ?? plan.obligation_type}
                                </span>
                                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
                                  {plan.installment_count} قسط
                                </span>
                              </div>
                              <div className="text-xs text-neutral-500 mt-0.5">
                                إجمالي: {formatMoney(Number(plan.total_amount))} · مدفوع: {formatMoney(planPaid)} · متبقي: {formatMoney(planRemaining)} SAR
                              </div>
                            </div>
                            {canEdit('employees') && (
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPlan(plan)}
                                  title="تعديل الالتزام"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingPlanId(plan.id)}
                                  title="حذف الالتزام"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Installment lines */}
                  <div className="space-y-3">
                    {recentObligationLines.map((line, index) => (
                      <div key={line.id} className="rounded-lg border border-neutral-200 bg-white p-4 space-y-3">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="font-medium text-neutral-900">{line.title}</div>
                              <span
                                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                                  line.line_status === 'paid'
                                    ? 'bg-green-100 text-success-700'
                                    : line.line_status === 'partial'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {line.line_status === 'paid' ? 'مسدد' : line.line_status === 'partial' ? 'مسدد جزئيًا' : 'مفتوح'}
                              </span>
                            </div>
                            <div className="text-sm text-neutral-500">
                              القسط رقم {index + 1} • موعد السداد{' '}
                              <HijriDateDisplay date={line.due_month}>
                                {formatDateShortWithHijri(line.due_month)}
                              </HijriDateDisplay>
                            </div>
                          </div>
                          <div className="text-sm md:text-left">
                            <div className="font-semibold text-neutral-900">
                              {formatMoney(Math.max(line.amount_due - line.amount_paid, 0))} {line.currency_code}
                            </div>
                            <div className="text-neutral-500">
                              مدفوع: {formatMoney(line.amount_paid)} من {formatMoney(line.amount_due)}
                            </div>
                          </div>
                        </div>

                        {canEdit('employees') && (
                          <div className="flex flex-col gap-3 border-t border-neutral-100 pt-3">
                            {editingObligationLineId === line.id ? (
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">إجمالي المدفوع حتى الآن</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max={line.amount_due}
                                      step="0.01"
                                      value={obligationPaymentForm.amount_paid}
                                      onChange={(e) => setObligationPaymentForm({ ...obligationPaymentForm, amount_paid: Number(e.target.value) || 0 })}
                                      className="app-input"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">ملاحظات السداد</label>
                                    <input
                                      type="text"
                                      value={obligationPaymentForm.notes}
                                      onChange={(e) => setObligationPaymentForm({ ...obligationPaymentForm, notes: e.target.value })}
                                      className="app-input"
                                      placeholder="اختياري"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center justify-end gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setEditingObligationLineId(null)}
                                    className="app-button-secondary px-3 py-2 text-sm"
                                    disabled={updateObligationLinePayment.isPending}
                                  >
                                    إلغاء
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveObligationPayment(line.id, line.amount_due)}
                                    className="app-button-primary px-3 py-2 text-sm"
                                    disabled={updateObligationLinePayment.isPending}
                                  >
                                    {updateObligationLinePayment.isPending ? (
                                      <><Loader2 className="w-4 h-4 animate-spin" />جاري الحفظ...</>
                                    ) : (
                                      <><Save className="w-4 h-4" />حفظ السداد</>
                                    )}
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => startEditingObligationLine(line.id, line.amount_paid, line.notes)}
                                  className="app-button-secondary px-3 py-2 text-sm"
                                >
                                  <CreditCard className="w-4 h-4" />
                                  تسجيل سداد
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {recentObligationLines.length < (openObligationLines.length + (recentObligationLines.filter(l => l.line_status === 'paid').length)) && (
                      <div className="text-sm text-neutral-500 text-center pt-1">
                        يوجد أقساط إضافية غير ظاهرة في هذا الملخص.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Obligation Modal ─────────────────────────────────────────── */}
      {showObligationForm && canEdit('employees') && (
        <div
          className="fixed inset-0 z-[155] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
          dir="rtl"
          onClick={() => { if (!createEmployeeObligationPlan.isPending) setShowObligationForm(false) }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="app-modal-surface w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="app-modal-header flex items-center justify-between gap-3 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">إنشاء خطة التزام جديدة</h3>
                <p className="text-sm text-foreground-secondary mt-0.5">ستُنشأ الأقساط تلقائيًا وتظهر في الملخص فور الحفظ</p>
              </div>
              <button
                type="button"
                onClick={() => setShowObligationForm(false)}
                disabled={createEmployeeObligationPlan.isPending}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-200 text-foreground-tertiary hover:bg-surface-secondary-50 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">نوع الالتزام</label>
                  <select
                    value={obligationForm.obligation_type}
                    onChange={(e) => setObligationForm({ ...obligationForm, obligation_type: e.target.value as ObligationType })}
                    className="app-input"
                  >
                    <option value="advance">سلفة</option>
                    <option value="transfer">نقل كفالة</option>
                    <option value="renewal">تجديد</option>
                    <option value="penalty">غرامة</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">إجمالي المبلغ (ر.س)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={obligationForm.total_amount}
                    onChange={(e) => setObligationForm({ ...obligationForm, total_amount: Number(e.target.value) || 0 })}
                    className="app-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">شهر البداية</label>
                  <input
                    type="month"
                    value={obligationForm.start_month}
                    onChange={(e) => setObligationForm({ ...obligationForm, start_month: e.target.value })}
                    className="app-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">عدد الأقساط (شهر)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={obligationForm.installment_count}
                    onChange={(e) => setObligationForm({ ...obligationForm, installment_count: Number(e.target.value) || 1 })}
                    className="app-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">القسط الشهري التقريبي</label>
                  <div className="app-input bg-surface-secondary-50 text-foreground-secondary select-none">
                    {installmentPreview.length > 0 ? `${formatMoney(installmentPreview[0])} ر.س` : '—'}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">ملاحظات (اختياري)</label>
                  <textarea
                    rows={3}
                    value={obligationForm.notes}
                    onChange={(e) => setObligationForm({ ...obligationForm, notes: e.target.value })}
                    className="app-input min-h-[80px] resize-none"
                    placeholder="أي توضيح إضافي عن هذا الالتزام"
                  />
                </div>
              </div>

              {installmentPreview.length > 0 && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  سيتم إنشاء <strong>{obligationForm.installment_count}</strong> قسط — أول 3 أقساط:{' '}
                  <strong>{installmentPreview.slice(0, 3).map((v) => formatMoney(v)).join(' ، ')}</strong>
                  {installmentPreview.length > 3 ? ' ...' : ''}
                </div>
              )}

              {startMonthConflict && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                  <div className="flex items-start gap-2 text-amber-800">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
                    <div>
                      <p className="font-semibold">لا يمكن بدء الأقساط في هذا الشهر</p>
                      <p className="mt-1 text-amber-700">
                        تم اعتماد مسير شهر{' '}
                        <strong>
                          {new Date(`${obligationForm.start_month}-02`).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' })}
                        </strong>{' '}
                        لهذا الموظف بالفعل. اختر شهرًا لاحقًا أو عدّل المسير المعتمد أولاً.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="app-modal-footer flex items-center justify-end gap-2 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowObligationForm(false)}
                disabled={createEmployeeObligationPlan.isPending}
                className="px-4 py-2 rounded-xl border border-border-300 text-sm text-foreground-secondary hover:bg-surface-secondary-50 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleCreateObligationPlan}
                disabled={createEmployeeObligationPlan.isPending || startMonthConflict || checkingStartMonth}
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition disabled:opacity-60"
              >
                {createEmployeeObligationPlan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {createEmployeeObligationPlan.isPending ? 'جاري الإنشاء...' : 'حفظ الخطة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Obligation Plan Modal ───────────────────────────────────────── */}
      {editingPlanId && (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
          dir="rtl"
          onClick={() => { if (!updateObligationPlan.isPending) setEditingPlanId(null) }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="app-modal-surface w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="app-modal-header flex items-center justify-between gap-3 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">تعديل الالتزام</h3>
                <p className="text-sm text-foreground-secondary mt-0.5">تغيير المبلغ يعيد توزيع الأقساط غير المسددة تلقائيًا</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlanId(null)}
                disabled={updateObligationPlan.isPending}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-200 text-foreground-tertiary hover:bg-surface-secondary-50 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">نوع الالتزام</label>
                  <select
                    value={editPlanForm.obligation_type}
                    onChange={(e) => setEditPlanForm({ ...editPlanForm, obligation_type: e.target.value as ObligationType })}
                    className="app-input"
                  >
                    <option value="advance">سلفة</option>
                    <option value="transfer">نقل كفالة</option>
                    <option value="renewal">تجديد</option>
                    <option value="penalty">غرامة</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">المبلغ الإجمالي (ر.س)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPlanForm.total_amount}
                    onChange={(e) => setEditPlanForm({ ...editPlanForm, total_amount: Number(e.target.value) || 0 })}
                    className="app-input"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">اسم / وصف الالتزام</label>
                  <input
                    type="text"
                    value={editPlanForm.title}
                    onChange={(e) => setEditPlanForm({ ...editPlanForm, title: e.target.value })}
                    className="app-input"
                    placeholder="مثال: سلفة رمضان 2026"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">ملاحظات (اختياري)</label>
                  <textarea
                    rows={2}
                    value={editPlanForm.notes}
                    onChange={(e) => setEditPlanForm({ ...editPlanForm, notes: e.target.value })}
                    className="app-input min-h-[60px] resize-none"
                    placeholder="أي توضيح إضافي"
                  />
                </div>
              </div>
            </div>
            <div className="app-modal-footer flex items-center justify-end gap-2 px-5 py-4">
              <button
                type="button"
                onClick={() => setEditingPlanId(null)}
                disabled={updateObligationPlan.isPending}
                className="px-4 py-2 rounded-xl border border-border-300 text-sm text-foreground-secondary hover:bg-surface-secondary-50 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => void handleUpdatePlan()}
                disabled={updateObligationPlan.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-60"
              >
                {updateObligationPlan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {updateObligationPlan.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Obligation Plan Confirmation ──────────────────────────────── */}
      {deletingPlanId && (
        <div
          className="fixed inset-0 z-[165] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
          dir="rtl"
          onClick={() => { if (!deleteObligationPlan.isPending) setDeletingPlanId2(null) }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="app-modal-surface w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="app-modal-header px-5 py-4">
              <h3 className="text-lg font-bold text-foreground">تأكيد حذف الالتزام</h3>
            </div>
            <div className="p-5 space-y-3">
              {(() => {
                const plan = obligationPlans.find((p) => p.id === deletingPlanId)
                return plan ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm">
                    <p className="font-semibold text-red-800">{plan.title}</p>
                    <p className="mt-0.5 text-red-700">
                      إجمالي {formatMoney(Number(plan.total_amount))} ر.س ·{' '}
                      {plan.lines.filter((l) => l.line_status !== 'paid').length} قسط غير مسدد
                    </p>
                  </div>
                ) : null
              })()}
              <p className="text-sm text-foreground-secondary">
                سيتم إلغاء هذا الالتزام وجميع أقساطه غير المسددة. لا يمكن التراجع عن هذه العملية.
              </p>
            </div>
            <div className="app-modal-footer flex items-center justify-end gap-2 px-5 py-4">
              <button
                type="button"
                onClick={() => setDeletingPlanId2(null)}
                disabled={deleteObligationPlan.isPending}
                className="px-4 py-2 rounded-xl border border-border-300 text-sm text-foreground-secondary hover:bg-surface-secondary-50 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => void handleDeletePlan()}
                disabled={deleteObligationPlan.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-60"
              >
                {deleteObligationPlan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleteObligationPlan.isPending ? 'جاري الحذف...' : 'حذف الالتزام'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
