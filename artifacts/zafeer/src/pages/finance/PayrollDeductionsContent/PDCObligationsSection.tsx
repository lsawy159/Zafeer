import { createPortal } from 'react-dom'
import {
  CheckCircle, Download, Eye, FileUp, Loader2,
  RefreshCw, Search, Trash2, UserPlus, Users, X,
} from 'lucide-react'
import { MultiSelectDropdown } from '@/components/ui/MultiSelectDropdown'
import {
  compactButtonBaseClass,
  outlineCompactButtonClass,
  primaryCompactButtonClass,
  successCompactButtonClass,
} from '../../payroll/payrollStyles'
import { DeletedEmployeeObligationsSection } from '../DeletedEmployeeObligationsSection'
import type { usePayrollDeductionsContent } from './usePayrollDeductionsContent'

type Ctx = ReturnType<typeof usePayrollDeductionsContent>

export default function PDCObligationsSection(ctx: Ctx) {
  const {
    filteredObligationsSummary,
    obligationsLoading, refetchObligations,
    obligationsSearchQuery, setObligationsSearchQuery,
    obligationsProjectFilter, setObligationsProjectFilter,
    obligationsTypeFilter, setObligationsTypeFilter,
    obligationsDateFrom, setObligationsDateFrom,
    obligationsDateTo, setObligationsDateTo,
    setShowAddObligationDialog,
    setShowObligationImportDialog,
    setObligationImportStep,
    setShowBulkPenaltyDialog,
    setShowExportObligationsDialog,
    editingDetailPlanId, setEditingDetailPlanId,
    editDetailPlanForm, setEditDetailPlanForm,
    deletingDetailPlanId, setDeletingDetailPlanId,
    detailObligationPlans,
    handleOpenObligationDetail,
    handleUpdateDetailPlan, handleDeleteDetailPlan,
    updateObligationPlan, deleteObligationPlan,
    canEdit, canCreate, canExport,
    projects,
    // import dialog
    setObligationImportHeaderError,
    setObligationImportFileName,
    setObligationImportRows,
    // bulk penalty
    setBulkPenaltySearch, setBulkPenaltySelectedIds,
    setBulkPenaltyAmount, setBulkPenaltyMonth, setBulkPenaltyNotes,
    // export obligations
    exportingObligations,
  } = ctx

  return (
    <>
          <div className="space-y-5 mb-6">
            {/* Header bar */}
            <div className="rounded-2xl border border-border-200 bg-surface p-4 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">قائمة الالتزامات والاستقطاعات</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    ملخص جميع الالتزامات النشطة على الموظفين — تعديل القيمة هنا يُحدِّث خطة
                    الالتزام مباشرة.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void refetchObligations()}
                    className={outlineCompactButtonClass}
                    disabled={obligationsLoading}
                  >
                    {obligationsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    تحديث
                  </button>
                  {(canCreate('payroll') || canEdit('payroll')) && (
                    <button
                      type="button"
                      onClick={() => setShowAddObligationDialog(true)}
                      className={primaryCompactButtonClass}
                    >
                      <UserPlus className="h-4 w-4" />
                      إضافة التزام
                    </button>
                  )}
                  {canEdit('payroll') && (
                    <button
                      type="button"
                      onClick={() => {
                        setObligationImportStep('upload')
                        setObligationImportHeaderError(null)
                        setObligationImportFileName('')
                        setObligationImportRows([])
                        setShowObligationImportDialog(true)
                      }}
                      className={`${compactButtonBaseClass} bg-blue-600 text-white hover:bg-blue-700`}
                    >
                      <FileUp className="h-4 w-4" />
                      استيراد الالتزامات
                    </button>
                  )}
                  {canEdit('payroll') && (
                    <button
                      type="button"
                      onClick={() => {
                        setBulkPenaltySearch('')
                        setBulkPenaltySelectedIds(new Set())
                        setBulkPenaltyAmount(0)
                        setBulkPenaltyMonth(new Date().toISOString().slice(0, 7))
                        setBulkPenaltyNotes('')
                        setShowBulkPenaltyDialog(true)
                      }}
                      className={`${compactButtonBaseClass} bg-orange-600 text-white hover:bg-orange-700`}
                    >
                      <Users className="h-4 w-4" />
                      غرامة جماعية
                    </button>
                  )}
                  {canExport('payroll') && (
                    <button
                      type="button"
                      onClick={() => setShowExportObligationsDialog(true)}
                      disabled={exportingObligations || filteredObligationsSummary.length === 0}
                      className={successCompactButtonClass}
                    >
                      {exportingObligations ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      تصدير Excel
                    </button>
                  )}
                </div>
              </div>

              {/* بحث وفلاتر */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {/* بحث نصي */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                    بحث
                  </label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
                    <input
                      type="text"
                      value={obligationsSearchQuery}
                      onChange={(e) => setObligationsSearchQuery(e.target.value)}
                      placeholder="الاسم أو رقم الإقامة أو المشروع"
                      className="w-full rounded-xl border border-border-300 bg-surface py-2 pr-9 pl-3 text-sm"
                    />
                  </div>
                </div>

                {/* فلتر المشروع */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                    المشروع
                  </label>
                  <select
                    value={obligationsProjectFilter}
                    onChange={(e) => setObligationsProjectFilter(e.target.value)}
                    className="w-full rounded-xl border border-border-300 bg-surface py-2 px-3 text-sm"
                  >
                    <option value="">جميع المشاريع</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* فلتر نوع الالتزام */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                    نوع الالتزام
                  </label>
                  <MultiSelectDropdown
                    options={[
                      { value: 'advance', label: 'سلف' },
                      { value: 'transfer', label: 'نقل كفالة' },
                      { value: 'renewal', label: 'تجديد' },
                      { value: 'penalty', label: 'جزاءات' },
                      { value: 'other', label: 'أخرى' },
                    ]}
                    selected={obligationsTypeFilter}
                    onChange={(values) =>
                      setObligationsTypeFilter(
                        values.filter(
                          (_v): _v is 'transfer' | 'renewal' | 'penalty' | 'advance' | 'other' => true
                        )
                      )
                    }
                    placeholder="جميع الأنواع"
                  />
                </div>

                {/* فلتر من شهر */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                    من شهر
                  </label>
                  <input
                    type="month"
                    value={obligationsDateFrom}
                    onChange={(e) => setObligationsDateFrom(e.target.value)}
                    className="w-full rounded-xl border border-border-300 bg-surface py-2 px-3 text-sm"
                  />
                </div>

                {/* فلتر إلى شهر */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                    إلى شهر
                  </label>
                  <input
                    type="month"
                    value={obligationsDateTo}
                    onChange={(e) => setObligationsDateTo(e.target.value)}
                    className="w-full rounded-xl border border-border-300 bg-surface py-2 px-3 text-sm"
                  />
                </div>

                {/* زر إعادة ضبط الفلاتر */}
                <div className="flex items-end">
                  {(obligationsSearchQuery || obligationsProjectFilter || obligationsTypeFilter.length > 0 || obligationsDateFrom || obligationsDateTo) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setObligationsSearchQuery('')
                        setObligationsProjectFilter('')
                        setObligationsTypeFilter([])
                        setObligationsDateFrom('')
                        setObligationsDateTo('')
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border-300 bg-surface px-3 py-2 text-sm text-foreground-secondary hover:bg-surface-secondary-50 transition"
                    >
                      <X className="h-4 w-4" />
                      مسح الفلاتر
                    </button>
                  ) : null}
                </div>
              </div>

              {/* بطاقات الإجماليات — تُحدَّث بالفلاتر */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border-200 bg-surface p-3">
                  <p className="text-xs text-foreground-tertiary mb-1">عدد الموظفين</p>
                  <p className="text-xl font-bold text-foreground">
                    {filteredObligationsSummary.length}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-700 mb-1">إجمالي الالتزامات</p>
                  <p className="text-xl font-bold text-emerald-800">
                    {filteredObligationsSummary
                      .reduce((s, r) => s + r.total_amount, 0)
                      .toLocaleString('en-US')}
                    <span className="text-xs font-normal mr-1 text-emerald-600">ر.س</span>
                  </p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <p className="text-xs text-blue-700 mb-1">المدفوع</p>
                  <p className="text-xl font-bold text-blue-800">
                    {filteredObligationsSummary
                      .reduce((s, r) => s + r.total_paid, 0)
                      .toLocaleString('en-US')}
                    <span className="text-xs font-normal mr-1 text-blue-600">ر.س</span>
                  </p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-xs text-red-700 mb-1">إجمالي المتبقي</p>
                  <p className="text-xl font-bold text-red-700">
                    {filteredObligationsSummary
                      .reduce((s, r) => s + r.total_remaining, 0)
                      .toLocaleString('en-US')}
                    <span className="text-xs font-normal mr-1 text-red-500">ر.س</span>
                  </p>
                </div>
              </div>

              {/* Table */}
              {obligationsLoading ? (
                <div className="py-10 text-center text-sm text-foreground-tertiary">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
                  جاري تحميل بيانات الالتزامات...
                </div>
              ) : filteredObligationsSummary.length === 0 ? (
                <div className="rounded-xl border border-border-200 bg-surface-secondary-50 py-10 text-center text-sm text-foreground-tertiary">
                  لا توجد التزامات نشطة حالياً.
                </div>
              ) : (
                <>
                <div className="overflow-x-auto rounded-xl border border-border-200">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-secondary-50">
                      <tr>
                        <th className="px-4 py-3 text-right font-semibold">الموظف</th>
                        <th className="px-4 py-3 text-right font-semibold">رقم الإقامة</th>
                        <th className="px-4 py-3 text-right font-semibold">المشروع</th>
                        <th className="px-4 py-3 text-right font-semibold">المؤسسة</th>
                        <th className="px-4 py-3 text-right font-semibold">نقل كفالة</th>
                        <th className="px-4 py-3 text-right font-semibold">تجديد</th>
                        <th className="px-4 py-3 text-right font-semibold">جزاءات</th>
                        <th className="px-4 py-3 text-right font-semibold">سلف</th>
                        <th className="px-4 py-3 text-right font-semibold">أخرى</th>
                        <th className="px-4 py-3 text-right font-semibold text-red-700">
                          إجمالي المتبقي
                        </th>
                        <th className="px-4 py-3 text-center font-semibold">تعديل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-100">
                      {filteredObligationsSummary.map((row) => (
                        <tr
                          key={row.employee_id}
                          className="hover:bg-surface-secondary-50 transition"
                        >
                          <td className="px-4 py-3 font-medium text-foreground">
                            {row.employee_name}
                          </td>
                          <td className="px-4 py-3 font-mono text-foreground-secondary">
                            {row.residence_number}
                          </td>
                          <td className="px-4 py-3 text-foreground-secondary">
                            {row.project_name || '—'}
                          </td>
                          <td className="px-4 py-3 text-foreground-secondary">
                            {row.company_name || '—'}
                          </td>
                          <td className="px-4 py-3">
                            {row.transfer_remaining > 0 ? (
                              <span className="text-amber-700 font-medium">
                                {row.transfer_remaining.toLocaleString('en-US')}
                              </span>
                            ) : (
                              <span className="text-foreground-tertiary">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.renewal_remaining > 0 ? (
                              <span className="text-amber-700 font-medium">
                                {row.renewal_remaining.toLocaleString('en-US')}
                              </span>
                            ) : (
                              <span className="text-foreground-tertiary">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.penalty_remaining > 0 ? (
                              <span className="text-rose-600 font-medium">
                                {row.penalty_remaining.toLocaleString('en-US')}
                              </span>
                            ) : (
                              <span className="text-foreground-tertiary">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.advance_remaining > 0 ? (
                              <span className="text-blue-700 font-medium">
                                {row.advance_remaining.toLocaleString('en-US')}
                              </span>
                            ) : (
                              <span className="text-foreground-tertiary">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.other_remaining > 0 ? (
                              <span className="text-violet-700 font-medium">
                                {row.other_remaining.toLocaleString('en-US')}
                              </span>
                            ) : (
                              <span className="text-foreground-tertiary">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold text-red-600">
                            {row.total_remaining.toLocaleString('en-US')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenObligationDetail(row.employee_id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              تفاصيل
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-surface-secondary-50 border-t border-border-200 font-semibold">
                      <tr>
                        <td className="px-4 py-3" colSpan={4}>
                          الإجمالي ({filteredObligationsSummary.length} موظف)
                        </td>
                        <td className="px-4 py-3 text-amber-700 whitespace-nowrap">
                          {filteredObligationsSummary
                            .reduce((s, r) => s + r.transfer_remaining, 0)
                            .toLocaleString('en-US')}
                        </td>
                        <td className="px-4 py-3 text-amber-700 whitespace-nowrap">
                          {filteredObligationsSummary
                            .reduce((s, r) => s + r.renewal_remaining, 0)
                            .toLocaleString('en-US')}
                        </td>
                        <td className="px-4 py-3 text-rose-600 whitespace-nowrap">
                          {filteredObligationsSummary
                            .reduce((s, r) => s + r.penalty_remaining, 0)
                            .toLocaleString('en-US')}
                        </td>
                        <td className="px-4 py-3 text-blue-700 whitespace-nowrap">
                          {filteredObligationsSummary
                            .reduce((s, r) => s + r.advance_remaining, 0)
                            .toLocaleString('en-US')}
                        </td>
                        <td className="px-4 py-3 text-violet-700 whitespace-nowrap">
                          {filteredObligationsSummary
                            .reduce((s, r) => s + r.other_remaining, 0)
                            .toLocaleString('en-US')}
                        </td>
                        <td className="px-4 py-3 text-red-600 whitespace-nowrap">
                          {filteredObligationsSummary
                            .reduce((s, r) => s + r.total_remaining, 0)
                            .toLocaleString('en-US')}
                        </td>
                        <td className="px-4 py-3" />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* شريط الإجماليات الثلاثي أسفل الجدول */}
                <div className="mt-3 rounded-xl border border-border-200 bg-surface-secondary-50 overflow-hidden">
                  <div className="grid grid-cols-3 divide-x divide-x-reverse divide-border-200">
                    <div className="px-5 py-3 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground-secondary">إجمالي المبالغ</span>
                      <span className="text-base font-bold text-emerald-700">
                        {filteredObligationsSummary.reduce((s, r) => s + r.total_amount, 0).toLocaleString('en-US')}
                        <span className="text-xs font-normal mr-1 text-emerald-600">ر.س</span>
                      </span>
                    </div>
                    <div className="px-5 py-3 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground-secondary">المدفوع</span>
                      <span className="text-base font-bold text-blue-700">
                        {filteredObligationsSummary.reduce((s, r) => s + r.total_paid, 0).toLocaleString('en-US')}
                        <span className="text-xs font-normal mr-1 text-blue-600">ر.س</span>
                      </span>
                    </div>
                    <div className="px-5 py-3 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground-secondary">إجمالي المتبقي</span>
                      <span className="text-base font-bold text-red-600">
                        {filteredObligationsSummary.reduce((s, r) => s + r.total_remaining, 0).toLocaleString('en-US')}
                        <span className="text-xs font-normal mr-1 text-red-500">ر.س</span>
                      </span>
                    </div>
                  </div>
                </div>
                </>
              )}
            </div>
            <DeletedEmployeeObligationsSection />
          </div>

      {/* ═══ Edit Obligation Plan Portal ═══ */}
        {editingDetailPlanId && createPortal(
          <div
            className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
            dir="rtl"
            onClick={() => { if (!updateObligationPlan.isPending) setEditingDetailPlanId(null) }}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border-200 bg-surface shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-border-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">تعديل الالتزام</h2>
                  <p className="text-sm text-foreground-secondary mt-0.5">
                    تغيير المبلغ يعيد توزيع الأقساط غير المسددة تلقائيًا
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingDetailPlanId(null)}
                  disabled={updateObligationPlan.isPending}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-200 text-foreground-tertiary hover:bg-surface-secondary-50 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground-secondary">
                      نوع الالتزام
                    </label>
                    <select
                      value={editDetailPlanForm.obligation_type}
                      onChange={(e) =>
                        setEditDetailPlanForm((f) => ({
                          ...f,
                          obligation_type: e.target.value as typeof f.obligation_type,
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
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground-secondary">
                      المبلغ الإجمالي (ر.س)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={editDetailPlanForm.total_amount || ''}
                      onChange={(e) =>
                        setEditDetailPlanForm((f) => ({
                          ...f,
                          total_amount: Number(e.target.value) || 0,
                        }))
                      }
                      className="w-full rounded-xl border border-border-300 bg-surface px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-sm font-medium text-foreground-secondary">
                      اسم / وصف الالتزام
                    </label>
                    <input
                      type="text"
                      value={editDetailPlanForm.title}
                      onChange={(e) =>
                        setEditDetailPlanForm((f) => ({ ...f, title: e.target.value }))
                      }
                      className="w-full rounded-xl border border-border-300 bg-surface px-3 py-2 text-sm"
                      placeholder="مثال: سلفة رمضان 2026"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-sm font-medium text-foreground-secondary">
                      ملاحظات (اختياري)
                    </label>
                    <textarea
                      rows={2}
                      value={editDetailPlanForm.notes}
                      onChange={(e) =>
                        setEditDetailPlanForm((f) => ({ ...f, notes: e.target.value }))
                      }
                      className="w-full rounded-xl border border-border-300 bg-surface px-3 py-2 text-sm resize-none"
                      placeholder="أي توضيح إضافي"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-border-200 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setEditingDetailPlanId(null)}
                  disabled={updateObligationPlan.isPending}
                  className="rounded-xl border border-border-300 px-4 py-2 text-sm text-foreground-secondary hover:bg-surface-secondary-50 transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => void handleUpdateDetailPlan()}
                  disabled={updateObligationPlan.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-60"
                >
                  {updateObligationPlan.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  {updateObligationPlan.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ══ Delete Obligation Plan Confirmation ══════════════════════════════ */}

      {/* ═══ Delete Obligation Plan Portal ═══ */}
        {deletingDetailPlanId && createPortal(
          <div
            className="fixed inset-0 z-[165] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
            dir="rtl"
            onClick={() => { if (!deleteObligationPlan.isPending) setDeletingDetailPlanId(null) }}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-sm rounded-2xl border border-border-200 bg-surface shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-border-200 px-5 py-4">
                <h2 className="text-lg font-bold text-foreground">تأكيد حذف الالتزام</h2>
              </div>
              <div className="space-y-3 p-5">
                {(() => {
                  const plan = detailObligationPlans.find((p) => p.id === deletingDetailPlanId)
                  return plan ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm">
                      <p className="font-semibold text-red-800">{plan.title}</p>
                      <p className="mt-0.5 text-red-700">
                        إجمالي {Number(plan.total_amount).toLocaleString('en-US')} ر.س ·{' '}
                        {plan.lines.filter((l) => l.line_status !== 'paid').length} قسط غير مسدد
                      </p>
                    </div>
                  ) : null
                })()}
                <p className="text-sm text-foreground-secondary">
                  سيتم إلغاء هذا الالتزام وجميع أقساطه غير المسددة. لا يمكن التراجع عن هذه العملية.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-border-200 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setDeletingDetailPlanId(null)}
                  disabled={deleteObligationPlan.isPending}
                  className="rounded-xl border border-border-300 px-4 py-2 text-sm text-foreground-secondary hover:bg-surface-secondary-50 transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteDetailPlan()}
                  disabled={deleteObligationPlan.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-60"
                >
                  {deleteObligationPlan.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {deleteObligationPlan.isPending ? 'جاري الحذف...' : 'حذف الالتزام'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

    </>
  )
}
