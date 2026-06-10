import { createPortal } from 'react-dom'
import {
  AlertTriangle, BarChart3, Calendar, CheckCircle, CreditCard, Download,
  Eye, FileUp, Loader2, Plus, ReceiptText, RefreshCw, Trash2, Wallet, X,
} from 'lucide-react'
import {
  outlineCompactButtonClass,
  primaryCompactButtonClass,
  successCompactButtonClass,
  indigoCompactButtonClass,
  slateCompactButtonClass,
  warningCompactButtonClass,
  orangeCompactButtonClass,
  dangerCompactButtonClass,
  payrollFieldInputClass,
  payrollReadonlyFieldClass,
  payrollRunSectionClass,
  payrollRunStatCardClass,
  payrollRunListCardClass,
} from '../../payroll/payrollStyles'
import {
  normalizePayrollObligationBreakdown,
  EMPTY_PAYROLL_OBLIGATION_BREAKDOWN,
} from '@/utils/payrollObligationBuckets'
import type { usePayrollDeductionsContent } from './usePayrollDeductionsContent'

type Ctx = ReturnType<typeof usePayrollDeductionsContent>

export default function PDCRunsSection(ctx: Ctx) {
  const {
    hideTabBar, activePageTab,
    showRunsBlock,
    selectedPayrollRun, selectedPayrollRunEditable,
    selectedPayrollRunId,
    showPayrollRunDetailsModal,
    showPayrollRunForm,
    showPayrollEntryForm, setShowPayrollEntryForm,
    payrollRunDeleteConfirmOpen, setPayrollRunDeleteConfirmOpen,
    filteredPayrollRunList, payrollRunStatsRows, payrollRunCardsStats,
    payrollRunStatsMonth, setPayrollRunStatsMonth,
    payrollRunStatsRunId, setPayrollRunStatsRunId,
    payrollEntries, payrollEntriesLoading,
    payrollSlips, payrollSlipEntryIds,
    setSelectedPayrollSlipEntryId,
    payrollEntryForm, setPayrollEntryForm,
    scopedPayrollEmployees, scopedEmployeesLoading, selectedPayrollEmployee,
    groupedDeductionsTotal, dailyRate, grossAmount, netAmount,
    payrollEntryBreakdownById, payrollExcelInputRef, daysExcelInputRef, payrollEntryFormRef,
    importingPayrollExcel, confirmingPayrollExcelImport,
    payrollImportErrors, payrollImportHeaderError, payrollImportPreviewRows, payrollImportFileName,
    importingDaysExcel, confirmingDaysImport, daysImportPreviewRows, daysImportFileName, daysImportErrors,
    selectedPayrollExportRunIds, exportingSelectedPayrollRuns,
    allExportablePayrollRunsSelected,
    paymentMethodFilter, setPaymentMethodFilter,
    canDelete, canCreate, canExport, isAdmin,
    updatePayrollRunStatus, deletePayrollRun, upsertPayrollEntry,
    getRunDisplayName, getPayrollStatusText, getPayrollInputModeText, formatPayrollMonthLabel,
    handleTogglePayrollRunForm, handleRefreshPayrollData,
    handleOpenPayrollEntryForm, handleSelectPayrollRun,
    handleClosePayrollRunDetailsModal,
    handleEditPayrollEntry, handleDeletePayrollRun, handleConfirmDeletePayrollRun,
    handleUpsertPayrollEntry, handleUpdatePayrollRunStatus,
    handleTogglePayrollRunExportSelection, handleToggleSelectAllPayrollRuns, handleExportSelectedPayrollRuns,
    handleOpenPayrollExcelImport, handleConfirmPayrollExcelImport, handleClearPayrollImportPreview,
    handleDownloadDaysTemplate, handleOpenDaysExcelImport, handleClearDaysImport,
    handleDaysExcelFile, handleConfirmDaysImport, handlePayrollExcelImport,
    exportPayrollToExcel, exportPayrollByPaymentMethod,
    downloadPayrollTemplate,
    payrollRunsLoading,
    setPayrollImportErrors,
    payrollRunList,
  } = ctx


  const renderSelectedPayrollRunDetails = () => {
    if (!selectedPayrollRun) {
      return null
    }

    return (
      <div className="space-y-5">
        <div className="overflow-hidden rounded-[28px] border border-sky-200/70 bg-gradient-to-br from-white via-sky-50/50 to-indigo-50/40 shadow-[0_20px_60px_-34px_rgba(14,116,144,0.42)]">
        <div className="flex items-center justify-between gap-3 border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-indigo-50 px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-sky-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                عرض المسير
              </span>
              <span className="inline-flex items-center rounded-full border border-border-200 bg-surface px-2.5 py-1 text-[11px] font-medium text-foreground-secondary">
                {selectedPayrollRun.entry_count} موظف
              </span>
            </div>
            <div className="mt-2 text-lg font-bold text-foreground">تفاصيل المسير</div>
            <div className="text-sm text-foreground-secondary mt-1">
              {getRunDisplayName(
                selectedPayrollRun.scope_type,
                selectedPayrollRun.scope_id,
                selectedPayrollRun.payroll_month
              )}{' '}
              • {selectedPayrollRun.entry_count} موظف
            </div>
            <div className="text-xs text-foreground-tertiary mt-1">
              قسائم الرواتب المولدة: {payrollSlips.length} • طريقة الإدخال:{' '}
              {getPayrollInputModeText(selectedPayrollRun.input_mode)}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${selectedPayrollRun.status === 'finalized' ? 'bg-green-100 text-green-700' : selectedPayrollRun.status === 'draft' ? 'bg-orange-100 text-orange-700' : selectedPayrollRun.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}
              >
                حالة المسير: {getPayrollStatusText(selectedPayrollRun.status)}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                الإدخال: {getPayrollInputModeText(selectedPayrollRun.input_mode)}
              </span>
              {selectedPayrollRunEditable &&
                scopedPayrollEmployees.length === 0 &&
                !scopedEmployeesLoading && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    لا يوجد موظفون ضمن هذا النطاق حاليًا
                  </span>
                )}
            </div>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap items-center justify-end gap-2 max-w-2xl">
              <input
                ref={payrollExcelInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handlePayrollExcelImport}
              />
              <input
                ref={daysExcelInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleDaysExcelFile}
              />
              <button
                type="button"
                onClick={handleRefreshPayrollData}
                className={outlineCompactButtonClass}
              >
                <RefreshCw className="w-4 h-4" />
                تحديث المسير
              </button>
              <button
                onClick={() => {
                  if (showPayrollEntryForm) {
                    setShowPayrollEntryForm(false)
                    return
                  }
                  handleOpenPayrollEntryForm()
                }}
                className={`${primaryCompactButtonClass} disabled:bg-surface-secondary-200 disabled:text-foreground-tertiary disabled:border disabled:border-border-200`}
                disabled={
                  !selectedPayrollRunEditable ||
                  scopedEmployeesLoading ||
                  scopedPayrollEmployees.length === 0
                }
                title={
                  selectedPayrollRun.status === 'cancelled'
                    ? 'هذا المسير ملغي ويجب إعادة فتحه أولًا'
                    : scopedPayrollEmployees.length === 0
                      ? 'لا يوجد موظفون داخل نطاق المسير الحالي'
                      : undefined
                }
              >
                <Plus className="w-4 h-4" />
                {showPayrollEntryForm ? 'إخفاء النموذج' : 'إدخال راتب يدوي'}
              </button>
              {selectedPayrollRunEditable && (
                <button
                  type="button"
                  onClick={downloadPayrollTemplate}
                  className={slateCompactButtonClass}
                >
                  <Download className="w-4 h-4" />
                  قالب Excel
                </button>
              )}
              {canExport('payroll') && payrollEntries.length > 0 && (
                <button
                  type="button"
                  onClick={exportPayrollToExcel}
                  className={`${successCompactButtonClass} bg-emerald-600 hover:bg-emerald-700`}
                >
                  <Download className="w-4 h-4" />
                  تصدير كشف المسير
                </button>
              )}
              {selectedPayrollRunEditable && (
                <button
                  type="button"
                  onClick={handleOpenPayrollExcelImport}
                  className={indigoCompactButtonClass}
                  disabled={
                    importingPayrollExcel ||
                    confirmingPayrollExcelImport ||
                    scopedPayrollEmployees.length === 0
                  }
                  title="استيراد بيانات الرواتب الكاملة: الراتب، الإضافي، الخصومات، والأيام"
                >
                  {importingPayrollExcel ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileUp className="w-4 h-4" />
                  )}
                  استيراد بيانات الرواتب
                </button>
              )}
              {selectedPayrollRunEditable && isAdmin && (
                <button
                  type="button"
                  onClick={handleDownloadDaysTemplate}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                  title="تحميل نموذج Excel جاهز لاستيراد الأيام — يحتوي على أسماء الموظفين وأرقام الإقامة"
                >
                  <Download className="w-4 h-4" />
                  نموذج الأيام
                </button>
              )}
              {selectedPayrollRunEditable && isAdmin && (
                <button
                  type="button"
                  onClick={handleOpenDaysExcelImport}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-800 shadow-sm transition hover:bg-teal-100 disabled:opacity-50"
                  disabled={importingDaysExcel || confirmingDaysImport}
                  title="استيراد أيام الحضور والإجازات المدفوعة فقط — يحدّث الأيام ويعيد احتساب الراتب"
                >
                  {importingDaysExcel ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileUp className="w-4 h-4" />
                  )}
                  استيراد الأيام
                </button>
              )}
              {selectedPayrollRunEditable && (
                <button
                  onClick={() => handleUpdatePayrollRunStatus('finalized')}
                  className={successCompactButtonClass}
                  disabled={updatePayrollRunStatus.isPending}
                >
                  {updatePayrollRunStatus.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ReceiptText className="w-4 h-4" />
                  )}
                  اعتماد المسير
                </button>
              )}
              {selectedPayrollRun.status === 'finalized' && (
                <button
                  onClick={() => handleUpdatePayrollRunStatus('draft')}
                  className={orangeCompactButtonClass}
                  disabled={updatePayrollRunStatus.isPending}
                >
                  {updatePayrollRunStatus.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  إعادة إلى مسودة
                </button>
              )}
              {selectedPayrollRun.status === 'cancelled' && (
                <button
                  onClick={() => handleUpdatePayrollRunStatus('draft')}
                  className={warningCompactButtonClass}
                  disabled={updatePayrollRunStatus.isPending}
                >
                  {updatePayrollRunStatus.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  إعادة فتح المسير
                </button>
              )}
              {selectedPayrollRun.status === 'cancelled' && canDelete('payroll') && (
                <button
                  onClick={handleDeletePayrollRun}
                  className={dangerCompactButtonClass}
                  disabled={deletePayrollRun.isPending}
                >
                  {deletePayrollRun.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  حذف المسير
                </button>
              )}
              {selectedPayrollRun.status !== 'cancelled' && (
                <button
                  onClick={() => handleUpdatePayrollRunStatus('cancelled')}
                  className={dangerCompactButtonClass}
                  disabled={updatePayrollRunStatus.isPending}
                >
                  {updatePayrollRunStatus.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  إلغاء المسير
                </button>
              )}
            </div>
          )}
        </div>
        </div>

        {selectedPayrollRun && showPayrollEntryForm && isAdmin && (
          <div
            ref={payrollEntryFormRef}
            className="rounded-[24px] border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50/60 p-4 md:p-5 space-y-4 shadow-sm"
          >
            <div className="rounded-2xl border border-sky-200 bg-white/85 px-4 py-3 text-sm text-foreground-secondary shadow-sm">
              أدخل راتب الموظف يدويًا داخل المسير الحالي. إذا كان لهذا الموظف مدخل سابق في
              نفس المسير، فالحفظ سيقوم بالتحديث بدل إنشاء سجل مكرر.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 rounded-[24px] border border-white/80 bg-white/70 p-4 shadow-inner">
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-2">الموظف</label>
                <select
                  value={payrollEntryForm.employee_id}
                  onChange={(e) => {
                    const employee = scopedPayrollEmployees.find((item) => item.id === e.target.value)
                    const nextBreakdown =
                      employee?.suggested_deduction_breakdown ?? normalizePayrollObligationBreakdown()
                    setPayrollEntryForm((current) => ({
                      ...current,
                      employee_id: e.target.value,
                      basic_salary_snapshot: Number(employee?.salary || 0),
                      transfer_renewal_amount: nextBreakdown.transfer_renewal,
                      penalty_amount: nextBreakdown.penalty,
                      advance_amount: nextBreakdown.advance,
                      other_amount: nextBreakdown.other,
                      deductions_amount: nextBreakdown.penalty + nextBreakdown.other,
                      installment_deducted_amount:
                        nextBreakdown.transfer_renewal + nextBreakdown.advance,
                    }))
                  }}
                  className={payrollFieldInputClass}
                  disabled={scopedEmployeesLoading}
                >
                  <option value="">اختر...</option>
                  {scopedPayrollEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} - {employee.residence_number}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-2">أيام الحضور</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={payrollEntryForm.attendance_days}
                  onChange={(e) =>
                    setPayrollEntryForm((current) => ({
                      ...current,
                      attendance_days: Number(e.target.value) || 0,
                    }))
                  }
                  className={payrollFieldInputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-2">
                  الإجازات المدفوعة
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={payrollEntryForm.paid_leave_days}
                  onChange={(e) =>
                    setPayrollEntryForm((current) => ({
                      ...current,
                      paid_leave_days: Number(e.target.value) || 0,
                    }))
                  }
                  className={payrollFieldInputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-2">الراتب الأساسي</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payrollEntryForm.basic_salary_snapshot}
                  onChange={(e) =>
                    setPayrollEntryForm((current) => ({
                      ...current,
                      basic_salary_snapshot: Number(e.target.value) || 0,
                    }))
                  }
                  className={payrollFieldInputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-2">الإضافي</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payrollEntryForm.overtime_amount}
                  onChange={(e) =>
                    setPayrollEntryForm((current) => ({
                      ...current,
                      overtime_amount: Number(e.target.value) || 0,
                    }))
                  }
                  className={payrollFieldInputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-2">
                  قسط رسوم نقل وتجديد
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payrollEntryForm.transfer_renewal_amount}
                  onChange={(e) =>
                    setPayrollEntryForm((current) => ({
                      ...current,
                      transfer_renewal_amount: Number(e.target.value) || 0,
                    }))
                  }
                  className={payrollFieldInputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-2">
                  قسط جزاءات وغرامات
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payrollEntryForm.penalty_amount}
                  onChange={(e) =>
                    setPayrollEntryForm((current) => ({
                      ...current,
                      penalty_amount: Number(e.target.value) || 0,
                    }))
                  }
                  className={payrollFieldInputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-2">قسط سلفة</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payrollEntryForm.advance_amount}
                  onChange={(e) =>
                    setPayrollEntryForm((current) => ({
                      ...current,
                      advance_amount: Number(e.target.value) || 0,
                    }))
                  }
                  className={payrollFieldInputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-2">قسط أخرى</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payrollEntryForm.other_amount}
                  onChange={(e) =>
                    setPayrollEntryForm((current) => ({
                      ...current,
                      other_amount: Number(e.target.value) || 0,
                    }))
                  }
                  className={payrollFieldInputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-2">الأجر اليومي</label>
                <div className={payrollReadonlyFieldClass}>
                  {dailyRate.toLocaleString('en-US')}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-2">ملاحظات الإضافي</label>
                <input
                  type="text"
                  value={payrollEntryForm.overtime_notes}
                  onChange={(e) =>
                    setPayrollEntryForm((current) => ({
                      ...current,
                      overtime_notes: e.target.value,
                    }))
                  }
                  className={payrollFieldInputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-2">
                  ملاحظات الاستقطاعات
                </label>
                <input
                  type="text"
                  value={payrollEntryForm.deductions_notes}
                  onChange={(e) =>
                    setPayrollEntryForm((current) => ({
                      ...current,
                      deductions_notes: e.target.value,
                    }))
                  }
                  className={payrollFieldInputClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground-secondary mb-2">ملاحظات عامة</label>
                <input
                  type="text"
                  value={payrollEntryForm.notes}
                  onChange={(e) =>
                    setPayrollEntryForm((current) => ({
                      ...current,
                      notes: e.target.value,
                    }))
                  }
                  className={payrollFieldInputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border-200 bg-white/80 p-4 shadow-sm">
                <div className="text-sm text-foreground-tertiary mb-1">إجمالي الراتب</div>
                <div className="text-xl font-bold text-foreground">{grossAmount.toLocaleString('en-US')}</div>
              </div>
              <div className="rounded-2xl border border-red-100 bg-red-50/70 p-4 shadow-sm">
                <div className="text-sm text-red-500 mb-1">إجمالي الاستقطاعات</div>
                <div className="text-xl font-bold text-red-600">
                  {groupedDeductionsTotal.toLocaleString('en-US')}
                </div>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 shadow-sm">
                <div className="text-sm text-sky-600 mb-1">الصافي</div>
                <div className={`text-xl font-bold ${netAmount < 0 ? 'text-red-600' : 'text-blue-700'}`}>
                  {netAmount.toLocaleString('en-US')}
                </div>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 shadow-sm">
                <div className="text-sm text-amber-600 mb-1">اقتراح الأقساط</div>
                <div className="text-xl font-bold text-orange-600">
                  {(selectedPayrollEmployee?.suggested_installment_amount ?? 0).toLocaleString('en-US')}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowPayrollEntryForm(false)}
                className={outlineCompactButtonClass}
                disabled={upsertPayrollEntry.isPending}
              >
                إلغاء
              </button>
              <button
                onClick={handleUpsertPayrollEntry}
                className={successCompactButtonClass}
                disabled={upsertPayrollEntry.isPending}
              >
                {upsertPayrollEntry.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ReceiptText className="w-4 h-4" />
                )}
                حفظ راتب الموظف
              </button>
            </div>
          </div>
        )}

        {!selectedPayrollRun ? (
          <div className="rounded-[24px] border border-dashed border-border-300 bg-surface-secondary-50 px-6 py-10 text-center text-foreground-tertiary">
            اختر مسيرًا لعرض التفاصيل.
          </div>
        ) : payrollEntriesLoading ? (
          <div className="rounded-[24px] border border-border-200 bg-surface-secondary-50 px-6 py-10 text-center text-foreground-tertiary">
            جاري تحميل كشف الرواتب...
          </div>
        ) : payrollEntries.length === 0 ? (
          <div className="rounded-[24px] border border-border-200 bg-gradient-to-br from-surface-secondary-50 via-surface to-surface p-8">
            <div className="max-w-lg mx-auto text-center space-y-4">
              <div
                className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center ${selectedPayrollRun.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}
              >
                {selectedPayrollRun.status === 'cancelled' ? (
                  <AlertTriangle className="w-7 h-7" />
                ) : (
                  <Wallet className="w-7 h-7" />
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {selectedPayrollRun.status === 'cancelled'
                    ? 'هذا المسير ملغي حاليًا'
                    : 'المسير المحدد جاهز لإدخال الرواتب'}
                </h3>
                <p className="text-sm text-foreground-secondary">
                  {selectedPayrollRun.status === 'cancelled'
                    ? 'هذا المسير ملغي حاليًا، لذلك لا يمكن إدخال رواتب أو استيراد بيانات بداخله حتى إعادة فتحه.'
                    : 'أنت الآن داخل تفاصيل هذا المسير. لا توجد مدخلات رواتب بعد، ويمكنك إضافة أول راتب يدويًا أو استيراد كشف كامل من Excel.'}
                </p>
              </div>
              {selectedPayrollRun.status !== 'cancelled' && (
                <div className="rounded-xl border border-border-200 bg-surface px-4 py-3 text-right">
                  <div className="text-sm font-semibold text-foreground mb-2">للبدء السريع:</div>
                  <div className="space-y-1 text-sm text-foreground-secondary">
                    <p>1. اضغط على زر إدخال راتب يدوي لإضافة راتب أول موظف داخل هذا المسير.</p>
                    <p>2. أو اضغط على "استيراد بيانات الرواتب" إذا كان لديك كشف Excel جاهز بالرواتب والخصومات.</p>
                    <p>3. أو نزّل "نموذج الأيام" وعدّل الأيام فقط ثم ارفعه عبر "استيراد الأيام".</p>
                    <p>3. بعد الحفظ سيظهر الموظف في جدول تفاصيل المسير أسفل هذا القسم.</p>
                  </div>
                </div>
              )}
              {selectedPayrollRunEditable && isAdmin && scopedPayrollEmployees.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenPayrollEntryForm}
                    className={primaryCompactButtonClass}
                  >
                    <Plus className="w-4 h-4" />
                    إدخال راتب يدوي
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenPayrollExcelImport}
                    className={indigoCompactButtonClass}
                    disabled={
                      importingPayrollExcel ||
                      confirmingPayrollExcelImport ||
                      scopedPayrollEmployees.length === 0
                    }
                    title="استيراد بيانات الرواتب الكاملة: الراتب، الإضافي، الخصومات، والأيام"
                  >
                    <FileUp className="w-4 h-4" />
                    استيراد بيانات الرواتب
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadDaysTemplate}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                    title="تحميل نموذج Excel جاهز لاستيراد الأيام — يحتوي على أسماء الموظفين وأرقام الإقامة"
                  >
                    <Download className="w-4 h-4" />
                    نموذج الأيام
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenDaysExcelImport}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-800 shadow-sm transition hover:bg-teal-100 disabled:opacity-50"
                    disabled={importingDaysExcel || confirmingDaysImport}
                    title="استيراد أيام الحضور والإجازات المدفوعة فقط — يحدّث الأيام ويعيد احتساب الراتب"
                  >
                    {importingDaysExcel ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileUp className="w-4 h-4" />
                    )}
                    استيراد الأيام
                  </button>
                </div>
              )}
              {selectedPayrollRunEditable &&
                isAdmin &&
                scopedPayrollEmployees.length === 0 &&
                !scopedEmployeesLoading && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    لا يوجد موظفون داخل نطاق هذا المسير حاليًا، لذلك تم تعطيل الإدخال
                    اليدوي والاستيراد حتى إضافة موظفين لهذا النطاق أولًا.
                  </div>
                )}
              <div className="text-xs text-foreground-tertiary">
                الموظفون المتاحون داخل نطاق هذا المسير: {scopedPayrollEmployees.length}
              </div>
            </div>
          </div>
        ) : (() => {
          const bankEntries = payrollEntries.filter((e) => Boolean(e.bank_account_snapshot))
          const cashEntries = payrollEntries.filter((e) => !e.bank_account_snapshot)
          const displayedEntries =
            paymentMethodFilter.length === 0
              ? payrollEntries
              : payrollEntries.filter((entry) =>
                  paymentMethodFilter.includes(entry.bank_account_snapshot ? 'bank' : 'cash')
                )
          const bankNet = bankEntries.reduce((s, e) => s + Number(e.net_amount || 0), 0)
          const cashNet = cashEntries.reduce((s, e) => s + Number(e.net_amount || 0), 0)

          const viewTotals = displayedEntries.reduce(
            (acc, e) => {
              const bd = normalizePayrollObligationBreakdown(
                payrollEntryBreakdownById.get(e.id) ?? {
                  ...EMPTY_PAYROLL_OBLIGATION_BREAKDOWN,
                  penalty: Number(e.deductions_amount || 0),
                  advance: Number(e.installment_deducted_amount || 0),
                }
              )
              return {
                gross:    acc.gross    + Number(e.gross_amount || 0),
                transfer: acc.transfer + bd.transfer_renewal,
                penalty:  acc.penalty  + bd.penalty,
                advance:  acc.advance  + bd.advance,
                other:    acc.other    + bd.other,
                net:      acc.net      + Number(e.net_amount || 0),
              }
            },
            { gross: 0, transfer: 0, penalty: 0, advance: 0, other: 0, net: 0 }
          )

          return (
          <div className="space-y-3">
            {/* Payment split summary + filter */}
            <div className="rounded-[20px] border border-border-200 bg-gradient-to-l from-sky-50/60 via-white to-indigo-50/40 p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex flex-wrap gap-3">
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
                    <span className="font-semibold text-blue-700">{bankEntries.length}</span>
                    <span className="text-blue-600 mr-1">موظف تحويل بنكي</span>
                    <span className="text-blue-500 text-xs mr-1">({bankNet.toLocaleString('en-US')} ر.س)</span>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                    <span className="font-semibold text-amber-700">{cashEntries.length}</span>
                    <span className="text-amber-600 mr-1">موظف كاش</span>
                    <span className="text-amber-500 text-xs mr-1">({cashNet.toLocaleString('en-US')} ر.س)</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Filter buttons */}
                  <div className="flex rounded-xl border border-border-200 overflow-hidden text-xs font-medium">
                    {(['all', 'bank', 'cash'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          if (m === 'all') {
                            setPaymentMethodFilter([])
                            return
                          }
                          setPaymentMethodFilter((current) =>
                            current.includes(m)
                              ? current.filter((item) => item !== m)
                              : [...current, m]
                          )
                        }}
                        className={`px-3 py-2 transition ${m === 'all'
                          ? paymentMethodFilter.length === 0
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-foreground-secondary hover:bg-surface-secondary-50'
                          : paymentMethodFilter.includes(m)
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-foreground-secondary hover:bg-surface-secondary-50'}`}
                      >
                        {m === 'all' ? 'الكل' : m === 'bank' ? 'تحويل بنكي' : 'كاش'}
                      </button>
                    ))}
                  </div>
                  {/* Split export buttons */}
                  {canExport('payroll') && (
                    <>
                      <button
                        type="button"
                        onClick={() => exportPayrollByPaymentMethod('bank')}
                        disabled={bankEntries.length === 0}
                        className={`${outlineCompactButtonClass} border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-40`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        تصدير بنكي
                      </button>
                      <button
                        type="button"
                        onClick={() => exportPayrollByPaymentMethod('cash')}
                        disabled={cashEntries.length === 0}
                        className={`${outlineCompactButtonClass} border-amber-200 text-amber-700 hover:bg-amber-50 disabled:opacity-40`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        تصدير كاش
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

          <div className="overflow-hidden rounded-[24px] border border-border-200 bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-secondary-50/90">
                <tr>
                  <th className="px-4 py-3 text-right">الموظف</th>
                  <th className="px-4 py-3 text-right">طريقة الصرف</th>
                  <th className="px-4 py-3 text-right">الإقامة</th>
                  <th className="px-4 py-3 text-right">إجمالي</th>
                  <th className="px-4 py-3 text-right">نقل/تجديد</th>
                  <th className="px-4 py-3 text-right">جزاءات</th>
                  <th className="px-4 py-3 text-right">سلفة</th>
                  <th className="px-4 py-3 text-right">أخرى</th>
                  <th className="px-4 py-3 text-right">الصافي</th>
                  <th className="px-4 py-3 text-right">الحالة</th>
                  <th className="px-4 py-3 text-right">الإجراءات</th>
                  <th className="px-4 py-3 text-right">القسيمة</th>
                </tr>
              </thead>
              <tbody>
                {displayedEntries.map((entry) => {
                  const rowBreakdown = normalizePayrollObligationBreakdown(
                    payrollEntryBreakdownById.get(entry.id) ?? {
                      ...EMPTY_PAYROLL_OBLIGATION_BREAKDOWN,
                      penalty: Number(entry.deductions_amount || 0),
                      advance: Number(entry.installment_deducted_amount || 0),
                    }
                  )

                  return (
                    <tr key={entry.id} className="border-t border-border-100 transition hover:bg-sky-50/40">
                      <td className="px-4 py-3 font-medium text-gray-900">{entry.employee_name_snapshot}</td>
                      <td className="px-4 py-3">
                        {entry.bank_account_snapshot ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                            <CreditCard className="w-3 h-3" />
                            بنكي
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            كاش
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{entry.residence_number_snapshot}</td>
                      <td className="px-4 py-3">{entry.gross_amount.toLocaleString('en-US')}</td>
                      <td className="px-4 py-3">{rowBreakdown.transfer_renewal.toLocaleString('en-US')}</td>
                      <td className="px-4 py-3">{rowBreakdown.penalty.toLocaleString('en-US')}</td>
                      <td className="px-4 py-3">{rowBreakdown.advance.toLocaleString('en-US')}</td>
                      <td className="px-4 py-3">{rowBreakdown.other.toLocaleString('en-US')}</td>
                      <td className="px-4 py-3 font-semibold text-blue-700">{entry.net_amount.toLocaleString('en-US')}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border border-border-200">
                          {getPayrollStatusText(entry.entry_status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {selectedPayrollRunEditable && isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleEditPayrollEntry(entry)}
                            className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition"
                          >
                            تعديل
                          </button>
                        ) : (
                          <span className="text-xs text-foreground-tertiary">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {payrollSlipEntryIds.has(entry.id) ? (
                          <button
                            type="button"
                            onClick={() => setSelectedPayrollSlipEntryId(entry.id)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border bg-green-100 text-green-700 border-green-200 hover:bg-green-200 transition"
                          >
                            <Eye className="w-3 h-3" />
                            عرض القسيمة
                          </button>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs border bg-gray-100 text-gray-600 border-border-200">
                            غير مولدة
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border-200 bg-surface-secondary-50 font-semibold text-sm">
                  <td className="px-4 py-3 text-foreground">المجموع</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3">{viewTotals.gross.toLocaleString('en-US')}</td>
                  <td className="px-4 py-3">{viewTotals.transfer.toLocaleString('en-US')}</td>
                  <td className="px-4 py-3">{viewTotals.penalty.toLocaleString('en-US')}</td>
                  <td className="px-4 py-3">{viewTotals.advance.toLocaleString('en-US')}</td>
                  <td className="px-4 py-3">{viewTotals.other.toLocaleString('en-US')}</td>
                  <td className="px-4 py-3 text-blue-700">{viewTotals.net.toLocaleString('en-US')}</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
          </div>
          </div>
        )
        })()}

        {selectedPayrollRun && selectedPayrollRunEditable && (
          <div className="rounded-[24px] border border-border-200 bg-gradient-to-br from-surface-secondary-50 via-surface to-surface px-4 py-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="lg:max-w-sm">
                <h3 className="font-semibold text-foreground mb-1">استيراد الرواتب من Excel</h3>
                <p className="text-sm text-foreground-secondary">
                  ابدأ بالقالب الجاهز، ثم ارفع الملف وراجع الصفوف قبل الاعتماد النهائي داخل نفس
                  المسير.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-1">
                <div className="rounded-xl border border-border-200 bg-white/80 px-3 py-2 text-sm text-foreground-secondary shadow-sm">
                  1. نزّل القالب وأبقِ رقم الإقامة موجودًا في كل صف.
                </div>
                <div className="rounded-xl border border-border-200 bg-white/80 px-3 py-2 text-sm text-foreground-secondary shadow-sm">
                  2. اترك أي عمود غير متوفر فارغًا وسيتم اعتباره صفرًا أو ملاحظة فارغة.
                </div>
                <div className="rounded-xl border border-border-200 bg-white/80 px-3 py-2 text-sm text-foreground-secondary shadow-sm">
                  3. راجع المعاينة قبل الاعتماد لتجنب إدخال بيانات غير مطابقة.
                </div>
              </div>
            </div>
          </div>
        )}

        {payrollImportPreviewRows.length > 0 && (
          <div className="rounded-[24px] border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50/60 px-4 py-4 space-y-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="font-semibold text-blue-900">معاينة استيراد الرواتب</h3>
                <p className="text-sm text-blue-700 mt-1">
                  الملف: {payrollImportFileName || 'Excel'} • الصفوف الجاهزة للاعتماد:{' '}
                  {payrollImportPreviewRows.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearPayrollImportPreview}
                  className={outlineCompactButtonClass}
                  disabled={confirmingPayrollExcelImport}
                >
                  إلغاء المعاينة
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayrollExcelImport}
                  className={primaryCompactButtonClass}
                  disabled={confirmingPayrollExcelImport}
                >
                  {confirmingPayrollExcelImport ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  اعتماد الاستيراد
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-blue-200 bg-surface shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-4 py-3 text-right">الصف</th>
                    <th className="px-4 py-3 text-right">الموظف</th>
                    <th className="px-4 py-3 text-right">الإقامة</th>
                    <th className="px-4 py-3 text-right">الحضور</th>
                    <th className="px-4 py-3 text-right">الإضافي</th>
                    <th className="px-4 py-3 text-right">الخصومات</th>
                    <th className="px-4 py-3 text-right">الأقساط</th>
                    <th className="px-4 py-3 text-right">الإجمالي</th>
                    <th className="px-4 py-3 text-right">الصافي</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollImportPreviewRows.map((row) => (
                    <tr key={`${row.employee_id}-${row.row_number}`} className="border-t border-blue-100 hover:bg-blue-50/40">
                      <td className="px-4 py-3">{row.row_number}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.employee_name}</td>
                      <td className="px-4 py-3">{row.residence_number}</td>
                      <td className="px-4 py-3">{row.attendance_days}</td>
                      <td className="px-4 py-3">{row.overtime_amount.toLocaleString('en-US')}</td>
                      <td className="px-4 py-3">{row.deductions_amount.toLocaleString('en-US')}</td>
                      <td className="px-4 py-3">{row.installment_deducted_amount.toLocaleString('en-US')}</td>
                      <td className="px-4 py-3">{row.gross_amount.toLocaleString('en-US')}</td>
                      <td className="px-4 py-3 font-semibold text-blue-700">{row.net_amount.toLocaleString('en-US')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {payrollImportHeaderError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 shadow-sm">
            <h3 className="font-semibold text-amber-900 mb-2">مشكلة في رأس ملف Excel</h3>
            <p className="text-sm text-amber-800">{payrollImportHeaderError}</p>
          </div>
        )}

        {payrollImportErrors.length > 0 && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="font-semibold text-red-900">أخطاء استيراد الرواتب</h3>
                <p className="text-sm text-red-700 mt-1">
                  تم استيراد بعض الصفوف، لكن الصفوف التالية تحتاج تصحيحًا قبل إعادة الرفع.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayrollImportErrors([])}
                className={outlineCompactButtonClass}
              >
                إخفاء
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-2xl border border-red-200 bg-surface">
              <ul className="divide-y divide-red-100 text-sm text-red-800">
                {payrollImportErrors.map((error, index) => (
                  <li key={`${error}-${index}`} className="px-4 py-3">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {daysImportPreviewRows.length > 0 && (
          <div className="rounded-[24px] border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-emerald-50/60 px-4 py-4 space-y-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="font-semibold text-teal-900">معاينة استيراد الأيام</h3>
                <p className="text-sm text-teal-700 mt-1">
                  الملف: {daysImportFileName || 'Excel'} • الصفوف الجاهزة للتحديث:{' '}
                  {daysImportPreviewRows.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearDaysImport}
                  className={outlineCompactButtonClass}
                  disabled={confirmingDaysImport}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDaysImport}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-50"
                  disabled={confirmingDaysImport}
                >
                  {confirmingDaysImport ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  تأكيد التحديث
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-teal-200 bg-surface shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-teal-50">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium text-teal-800">الصف</th>
                    <th className="px-4 py-3 text-right font-medium text-teal-800">الموظف</th>
                    <th className="px-4 py-3 text-right font-medium text-teal-800">رقم الإقامة</th>
                    <th className="px-4 py-3 text-right font-medium text-teal-800">الحضور (قبل)</th>
                    <th className="px-4 py-3 text-right font-medium text-teal-800">الحضور (بعد)</th>
                    <th className="px-4 py-3 text-right font-medium text-teal-800">الإجازة (قبل)</th>
                    <th className="px-4 py-3 text-right font-medium text-teal-800">الإجازة (بعد)</th>
                    <th className="px-4 py-3 text-right font-medium text-teal-800">الإجمالي الجديد</th>
                    <th className="px-4 py-3 text-right font-medium text-teal-800">الصافي الجديد</th>
                  </tr>
                </thead>
                <tbody>
                  {daysImportPreviewRows.map((row) => (
                    <tr key={row.entry_id} className="border-t border-teal-100 hover:bg-teal-50/40 transition-colors">
                      <td className="px-4 py-3 text-foreground-secondary">{row.row_number}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{row.employee_name_snapshot}</td>
                      <td className="px-4 py-3 font-mono text-foreground-secondary">{row.iqama}</td>
                      <td className="px-4 py-3 text-foreground-secondary">{row.old_attendance_days}</td>
                      <td className={`px-4 py-3 font-semibold ${row.attendance_days !== row.old_attendance_days ? 'text-teal-700' : 'text-foreground-secondary'}`}>
                        {row.attendance_days}
                      </td>
                      <td className="px-4 py-3 text-foreground-secondary">{row.old_paid_leave_days}</td>
                      <td className={`px-4 py-3 font-semibold ${row.paid_leave_days !== row.old_paid_leave_days ? 'text-teal-700' : 'text-foreground-secondary'}`}>
                        {row.paid_leave_days}
                      </td>
                      <td className="px-4 py-3 text-foreground">{row.new_gross.toLocaleString('en-US')}</td>
                      <td className="px-4 py-3 font-semibold text-teal-800">{row.new_net.toLocaleString('en-US')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {daysImportErrors.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-800 mb-2">
                  صفوف لم يُعثر لها على إدخال راتب مطابق ({daysImportErrors.length}):
                </p>
                <ul className="max-h-32 overflow-y-auto divide-y divide-amber-100 text-sm text-amber-700">
                  {daysImportErrors.map((err, i) => (
                    <li key={i} className="py-1">{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }


  return (
    <>
      {/* ════ Runs Tab Block ════ */}
        {showRunsBlock && (
        <div className={!hideTabBar && activePageTab !== 'runs' ? 'hidden' : ''}>
          <div className="space-y-6">
            <div className={`${payrollRunSectionClass} p-4 md:p-5 space-y-5`}>
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 rounded-2xl border border-white/70 bg-gradient-to-l from-surface-secondary-50 via-surface to-surface px-4 py-4 shadow-sm">
                <div>
                  <h2 className="text-xl font-bold text-foreground">إحصائيات مسيرات الرواتب</h2>
                  <p className="text-sm text-foreground-secondary">
                    اختر شهرًا أو مسيرًا محددًا وستتغير الكروت مباشرة.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full lg:w-auto lg:min-w-[760px] rounded-2xl border border-border-200 bg-white/80 p-3 shadow-sm">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground-secondary">
                      فلتر الشهر
                    </label>
                    <input
                      type="month"
                      value={payrollRunStatsMonth}
                      onChange={(e) => setPayrollRunStatsMonth(e.target.value)}
                      className={payrollFieldInputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground-secondary">
                      فلتر المسير
                    </label>
                    <select
                      value={payrollRunStatsRunId}
                      onChange={(e) => setPayrollRunStatsRunId(e.target.value)}
                      className={payrollFieldInputClass}
                    >
                      <option value="">كل المسيرات</option>
                      {payrollRunList.map((run) => (
                        <option key={run.id} value={run.id}>
                          {getRunDisplayName(
                            run.scope_type,
                            run.scope_id,
                            run.payroll_month
                          )}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        setPayrollRunStatsMonth('')
                        setPayrollRunStatsRunId('')
                      }}
                      className="w-full rounded-xl border border-border-300 bg-white px-3 py-2.5 text-sm font-medium text-foreground-secondary shadow-sm transition hover:bg-surface-secondary-50"
                    >
                      إعادة ضبط الفلتر
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className={payrollRunStatCardClass}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground-tertiary mb-1">المسيرات داخل الفلتر</p>
                      <p className="text-2xl font-bold text-foreground">
                        {filteredPayrollRunList.length}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface-secondary-50 p-3 text-foreground shadow-sm border border-border-200">
                      <Wallet className="w-6 h-6" />
                    </div>
                  </div>
                </div>
                <div className={payrollRunStatCardClass}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground-tertiary mb-1">الموظفون داخل الفلتر</p>
                      <p className="text-2xl font-bold text-sky-700">
                        {payrollRunCardsStats.employees}
                      </p>
                    </div>
                    <div className="bg-sky-100 p-3 rounded-lg">
                      <BarChart3 className="w-6 h-6 text-sky-600" />
                    </div>
                  </div>
                </div>
                <div className={payrollRunStatCardClass}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground-tertiary mb-1">إجمالي الرواتب</p>
                      <p className="text-2xl font-bold text-foreground">
                        {payrollRunCardsStats.gross.toLocaleString('en-US')}
                      </p>
                    </div>
                    <div className="bg-indigo-100 p-3 rounded-lg">
                      <ReceiptText className="w-6 h-6 text-indigo-600" />
                    </div>
                  </div>
                </div>
                <div className={payrollRunStatCardClass}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground-tertiary mb-1">إجمالي الالتزامات</p>
                      <p className="text-2xl font-bold text-red-600">
                        {payrollRunCardsStats.totalObligations.toLocaleString('en-US')}
                      </p>
                    </div>
                    <div className="bg-red-100 p-3 rounded-lg">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </div>
                <div className={payrollRunStatCardClass}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground-tertiary mb-1">رسوم نقل وتجديد</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {payrollRunCardsStats.transferRenewal.toLocaleString('en-US')}
                      </p>
                    </div>
                    <div className="bg-amber-100 p-3 rounded-lg">
                      <Calendar className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                </div>
                <div className={payrollRunStatCardClass}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground-tertiary mb-1">جزاءات وغرامات</p>
                      <p className="text-2xl font-bold text-rose-600">
                        {payrollRunCardsStats.penalty.toLocaleString('en-US')}
                      </p>
                    </div>
                    <div className="bg-rose-100 p-3 rounded-lg">
                      <AlertTriangle className="w-6 h-6 text-rose-600" />
                    </div>
                  </div>
                </div>
                <div className={payrollRunStatCardClass}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground-tertiary mb-1">سلف</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {payrollRunCardsStats.advance.toLocaleString('en-US')}
                      </p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <Wallet className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>
                <div className={payrollRunStatCardClass}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-foreground-tertiary mb-1">أخرى</p>
                      <p className="text-2xl font-bold text-violet-700">
                        {payrollRunCardsStats.other.toLocaleString('en-US')}
                      </p>
                    </div>
                    <div className="bg-violet-100 p-3 rounded-lg">
                      <Plus className="w-6 h-6 text-violet-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${payrollRunSectionClass} p-4 md:p-5 space-y-5`}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl border border-white/70 bg-gradient-to-l from-surface-secondary-50 via-surface to-surface px-4 py-4 shadow-sm">
                <div>
                  <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 mb-2">
                    إدارة المسيرات
                  </div>
                  <h2 className="text-xl font-bold text-foreground">مسيرات الرواتب</h2>
                  <p className="text-sm text-foreground-secondary">
                    أنشئ مسيرًا جديدًا لمؤسسة أو مشروع، ثم راجع كشف الموظفين المرتبط به
                  </p>
                </div>
                {canCreate('payroll') && (
                  <button
                    onClick={handleTogglePayrollRunForm}
                    className={primaryCompactButtonClass}
                  >
                    <Plus className="w-4 h-4" />
                    {showPayrollRunForm ? 'إخفاء النموذج' : 'مسير جديد'}
                  </button>
                )}
              </div>

              <div className="overflow-hidden rounded-[26px] border border-border-200 bg-surface shadow-[0_20px_45px_-36px_rgba(15,23,42,0.52)]">
                  <div className="border-b border-border-200 bg-gradient-to-l from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 md:px-6 md:py-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="text-base font-bold text-foreground">قائمة المسيرات</div>
                        <div className="mt-1 text-sm text-foreground-secondary">
                          {payrollRunStatsRows.length} مدخل رواتب داخل النطاق الحالي
                        </div>
                      </div>
                      {canExport('payroll') && filteredPayrollRunList.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="inline-flex items-center gap-2 text-xs text-foreground-secondary bg-white border border-border-200 rounded-xl px-3 py-2 shadow-sm">
                            <input
                              type="checkbox"
                              aria-label="تحديد جميع المسيرات"
                              checked={allExportablePayrollRunsSelected}
                              onChange={(e) => handleToggleSelectAllPayrollRuns(e.target.checked)}
                              className="rounded border-border-300"
                            />
                            تحديد جميع المسيرات القابلة للتصدير
                          </label>
                          <button
                            type="button"
                            onClick={handleExportSelectedPayrollRuns}
                            disabled={
                              selectedPayrollExportRunIds.length === 0 ||
                              exportingSelectedPayrollRuns
                            }
                            className={`${successCompactButtonClass} bg-emerald-600 hover:bg-emerald-700`}
                          >
                            {exportingSelectedPayrollRuns ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                            تصدير المسيرات المحددة
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="max-h-[62vh] overflow-y-auto">
                    {payrollRunsLoading ? (
                      <div className="p-8 text-center text-foreground-tertiary">
                        جاري تحميل مسيرات الرواتب...
                      </div>
                    ) : filteredPayrollRunList.length === 0 ? (
                      <div className="p-8 text-center text-foreground-tertiary">
                        لا توجد مسيرات مطابقة للفلاتر الحالية.
                      </div>
                    ) : (
                      filteredPayrollRunList.map((run) => (
                        <div
                          key={run.id}
                          className={`border-b border-border-100/90 p-3 transition-colors duration-200 hover:bg-sky-50/30 md:p-4 ${showPayrollRunDetailsModal && selectedPayrollRunId === run.id ? 'bg-blue-50/40' : ''}`}
                        >
                          <div
                            className={`${payrollRunListCardClass} group transition-all duration-300 ${showPayrollRunDetailsModal && selectedPayrollRunId === run.id ? 'border-sky-200 bg-gradient-to-br from-white via-sky-50/60 to-indigo-50/40 border-r-4 border-r-sky-500 shadow-[0_18px_38px_-28px_rgba(14,116,144,0.38)]' : 'hover:border-sky-100 hover:shadow-[0_16px_36px_-30px_rgba(59,130,246,0.5)]'}`}
                          >
                            <div className="flex items-start gap-3">
                              {canExport('payroll') && (
                                <label className="mt-1 inline-flex items-center">
                                  <input
                                    type="checkbox"
                                    aria-label={`تحديد مسير ${getRunDisplayName(run.scope_type, run.scope_id, run.payroll_month)}`}
                                    checked={selectedPayrollExportRunIds.includes(run.id)}
                                    disabled={run.entry_count === 0}
                                    onChange={(event) =>
                                      handleTogglePayrollRunExportSelection(
                                        run.id,
                                        event.target.checked
                                      )
                                    }
                                    className="rounded border-border-300"
                                  />
                                </label>
                              )}
                              <div className="flex-1 text-right">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                  <div>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <span className="text-base font-bold text-foreground">
                                        {formatPayrollMonthLabel(run.payroll_month)}
                                      </span>
                                      <span
                                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm ${run.status === 'finalized' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : run.status === 'draft' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-border-200 bg-surface-secondary-50 text-foreground-secondary'}`}
                                      >
                                        {getPayrollStatusText(run.status)}
                                      </span>
                                    </div>
                                    {showPayrollRunDetailsModal && selectedPayrollRunId === run.id && (
                                      <div className="text-xs font-medium text-blue-700 mb-2">
                                        المسير المفتوح الآن
                                      </div>
                                    )}
                                    <div className="text-sm font-semibold text-foreground-secondary">
                                      {getRunDisplayName(
                                        run.scope_type,
                                        run.scope_id,
                                        run.payroll_month
                                      )}
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                      <span className="inline-flex items-center rounded-full border border-border-200 bg-white px-2.5 py-1 text-foreground-secondary shadow-sm">
                                        طريقة الإدخال: {getPayrollInputModeText(run.input_mode)}
                                      </span>
                                      <span className="inline-flex items-center rounded-full border border-border-200 bg-white px-2.5 py-1 text-foreground-secondary shadow-sm">
                                        {run.entry_count} موظف
                                      </span>
                                      <span className="inline-flex items-center rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 font-semibold text-sky-700 shadow-sm">
                                        صافي {run.total_net_amount.toLocaleString('en-US')}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 self-start">
                                    {showPayrollRunDetailsModal && selectedPayrollRunId === run.id && (
                                      <span className="inline-flex items-center rounded-full border border-sky-200 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-sky-700 shadow-sm">
                                        مفتوح الآن
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (showPayrollRunDetailsModal && selectedPayrollRunId === run.id) {
                                          handleClosePayrollRunDetailsModal()
                                          return
                                        }
                                        handleSelectPayrollRun(run.id)
                                      }}
                                      className={`${outlineCompactButtonClass} rounded-xl border-sky-100 bg-white shadow-sm hover:bg-sky-50 hover:border-sky-200 hover:text-sky-700 group-hover:border-sky-200`}
                                    >
                                      <Eye className="w-4 h-4" />
                                      {showPayrollRunDetailsModal && selectedPayrollRunId === run.id
                                        ? 'إخفاء المسير'
                                        : 'عرض المسير'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      ))
                    )}
                  </div>
              </div>
            </div>
          </div>

        </div>
        )}

      {/* ════ Portals ════ */}
        {showPayrollRunDetailsModal && selectedPayrollRun && createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-surface-secondary-950/65 p-3 backdrop-blur-md md:p-4"
            onClick={() => {
              if (
                !updatePayrollRunStatus.isPending &&
                !deletePayrollRun.isPending &&
                !upsertPayrollEntry.isPending &&
                !confirmingPayrollExcelImport
              ) {
                handleClosePayrollRunDetailsModal()
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="app-modal-surface w-full max-w-7xl max-h-[94vh] overflow-y-auto border border-sky-100 shadow-[0_32px_100px_-38px_rgba(15,23,42,0.58)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="app-modal-header sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-indigo-50 px-5 py-4 md:px-6 md:py-5">
                <div>
                  <div className="inline-flex items-center rounded-full border border-sky-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-sky-700 mb-2">
                    كشف المسير
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">عرض المسير</h2>
                  <p className="mt-1 text-sm text-foreground-secondary max-w-3xl">
                    {getRunDisplayName(
                      selectedPayrollRun.scope_type,
                      selectedPayrollRun.scope_id,
                      selectedPayrollRun.payroll_month
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClosePayrollRunDetailsModal}
                  disabled={
                    updatePayrollRunStatus.isPending ||
                    deletePayrollRun.isPending ||
                    upsertPayrollEntry.isPending ||
                    confirmingPayrollExcelImport
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-200 bg-white/90 text-foreground-tertiary shadow-sm hover:bg-surface-secondary-50 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="bg-gradient-to-b from-surface-secondary-50/70 to-surface p-4 md:p-5">
                {renderSelectedPayrollRunDetails()}
              </div>
            </div>
          </div>,
          document.body
        )}

        {payrollRunDeleteConfirmOpen && selectedPayrollRun && createPortal(
          <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-surface-secondary-950/55 p-4 backdrop-blur-sm"
            onClick={() => {
              if (!deletePayrollRun.isPending) {
                setPayrollRunDeleteConfirmOpen(false)
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-md rounded-2xl border border-border-200 bg-surface shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-border-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">تأكيد حذف المسير</h2>
                  <p className="mt-1 text-sm text-foreground-secondary">
                    {getRunDisplayName(
                      selectedPayrollRun.scope_type,
                      selectedPayrollRun.scope_id,
                      selectedPayrollRun.payroll_month
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPayrollRunDeleteConfirmOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-200 text-foreground-tertiary transition hover:bg-surface-secondary-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3 px-5 py-4">
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  سيتم حذف هذا المسير وكل الرواتب المرتبطة به نهائيًا.
                </div>
                <p className="text-sm text-foreground-secondary">إذا كنت متأكدًا، اضغط على تأكيد الحذف.</p>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-border-200 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setPayrollRunDeleteConfirmOpen(false)}
                  className={outlineCompactButtonClass}
                  disabled={deletePayrollRun.isPending}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeletePayrollRun}
                  className={dangerCompactButtonClass}
                  disabled={deletePayrollRun.isPending}
                >
                  {deletePayrollRun.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  تأكيد الحذف
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
