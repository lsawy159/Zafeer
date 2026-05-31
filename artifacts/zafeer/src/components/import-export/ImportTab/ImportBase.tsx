import { FileUp, AlertCircle, CheckCircle, XCircle, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { parseDate } from '@/utils/dateParser'
import { formatDateDDMMMYYYY } from '@/utils/dateFormatter'
import DeleteConfirmationModal from '../DeleteConfirmationModal'
import {
  ValidationError,
  ImportResult,
  EMPLOYEE_COLUMNS_ORDER,
  COMPANY_COLUMNS_ORDER,
} from './importTypes'
import { useImportBase } from './useImportBase'

interface ImportBaseProps {
  initialImportType?: 'employees' | 'companies'
  onImportSuccess?: () => void
  isInModal?: boolean
  hideTypeSelector?: boolean
}

export function ImportBase(props: ImportBaseProps = {}) {
  const {
    file, setFile,
    importing,
    validating,
    validationResults,
    previewData,
    importResult,
    importType, setImportType,
    currentPage, setCurrentPage,
    columnValidationError,
    selectedRows, setSelectedRows,
    shouldDeleteBeforeImport, setShouldDeleteBeforeImport,
    deleteMode, setDeleteMode,
    showConfirmDialog, setShowConfirmDialog,
    pendingImport,
    importProgress,
    deleteProgress,
    isDeleting,
    isImportCancelled,
    conflictResolution, setConflictResolution,
    dbConflicts,
    showPreviewModal, setShowPreviewModal,
    validationFilter,
    cancelImportRef,
    rowsPerPage,
    activeScopeIndices,
    errorCount,
    selectedRowsErrorCount,
    blockingErrorCount,
    warningRowCountInScope,
    errorRowCount,
    warningRowCount,
    visibleRowIndices,
    isAllSelected,
    isSomeSelected,
    isInModal,
    hideTypeSelector,
    handleFileChange,
    handleDrop,
    handleDragOver,
    handleCancel,
    validateData,
    importData,
    executeImport,
    cancelImport,
    handleFilterChange,
    exportValidationReport,
    toggleRowSelection,
    toggleSelectAll,
    updateConflictChoice,
    getRowIssues,
    getOrderedColumns,
    getCellErrors,
    isCellEmpty,
    setPendingImport,
  } = useImportBase(props)

  return (
    <div className="space-y-6">
      {/* Import Type Selection and Color Legend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column: Import Type Selection + File Upload */}
          <div className="space-y-4">
            {/* Import Type Selection - hidden when used inside parent with external selector */}
            {!isInModal && !hideTypeSelector && (
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                  نوع البيانات المراد استيرادها
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setImportType('employees')
                      setCurrentPage(1)
                      setSelectedRows(new Set())
                      setShouldDeleteBeforeImport(false)
                    }}
                    className={`flex-1 rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition ${
                      importType === 'employees'
                        ? 'border-primary bg-primary/15 text-slate-900'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    موظفين
                  </button>
                  <button
                    onClick={() => {
                      setImportType('companies')
                      setCurrentPage(1)
                      setSelectedRows(new Set())
                      setShouldDeleteBeforeImport(false)
                    }}
                    className={`flex-1 px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition ${
                      importType === 'companies'
                        ? 'border-green-600 bg-green-50 text-success-600'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    مؤسسات
                  </button>
                </div>
              </div>
            )}

            {/* File Upload Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="rounded-lg border-2 border-dashed border-neutral-300 p-4 text-center transition hover:border-primary"
            >
              <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-neutral-700 mb-1">اسحب وأفلت ملف Excel هنا</p>
              <p className="text-xs text-neutral-500 mb-3">أو انقر لتحديد ملف</p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="app-button-primary cursor-pointer px-4 py-2 text-sm"
              >
                <FileUp className="w-4 h-4" />
                اختيار ملف Excel
              </label>
            </div>
          </div>

          {/* Right Column: Color Legend - Always Visible */}
          <div className="border-2 border-neutral-300 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-3 py-2 border-b border-neutral-200">
              <h5 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                <span>🎨</span>
                دلالة الألوان في الجدول:
              </h5>
            </div>
            <div className="px-3 py-3 bg-white">
              <div className="grid grid-cols-1 gap-2">
                {/* Error Color Explanation */}
                <div className="flex items-start gap-2 p-2 bg-red-50 border-l-4 border-red-500 rounded-lg">
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold text-red-800 mb-0.5 text-xs">خلفية حمراء - خطأ</div>
                    <p className="text-[10px] text-red-700 leading-tight">
                      حقول مطلوبة أو غير صحيحة. يجب إصلاحها قبل الاستيراد.
                    </p>
                  </div>
                </div>

                {/* Warning Color Explanation */}
                <div className="flex items-start gap-2 p-2 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold text-yellow-800 mb-0.5 text-xs">
                      خلفية صفراء - تحذير
                    </div>
                    <p className="text-[10px] text-yellow-700 leading-tight">
                      بيانات قد تحتاج مراجعة. لا تمنع الاستيراد.
                    </p>
                  </div>
                </div>

                {/* Empty Cell Explanation */}
                <div className="flex items-start gap-2 p-2 bg-white border-l-4 border-neutral-300 rounded-lg">
                  <div className="w-4 h-4 flex-shrink-0 mt-0.5 flex items-center justify-center">
                    <span className="text-red-600 font-bold text-xs">!</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-neutral-800 mb-0.5 text-xs">حقل فارغ</div>
                    <p className="text-[10px] text-neutral-700 leading-tight">
                      يظهر النص "<span className="font-bold text-red-600">غير موجود</span>" بخط أحمر
                      Bold بدون خلفية.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Selected File */}
      {file && (
        <div className="app-info-block rounded-xl border-2 border-primary/30 p-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-slate-950 shadow-md">
                <FileUp className="w-4 h-4" />
              </div>
              <div>
                <div className="mb-0.5 text-sm font-bold text-slate-900">{file.name}</div>
                <div className="flex items-center gap-1 text-xs font-medium text-slate-700">
                  <span>📁</span>
                  <span>{(file.size / 1024).toFixed(2)} KB</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={validateData}
                disabled={validating}
                className="app-button-primary px-3 py-1.5 text-sm font-medium shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {validating ? (
                  <>
                    <span className="animate-spin text-xs">⏳</span>
                    <span>جارٍ التحقق...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>التحقق من البيانات</span>
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium text-sm shadow-md hover:shadow-lg flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>إلغاء</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Results Summary */}
      {validationResults.length > 0 && (
        <div className="border-2 border-neutral-300 rounded-xl overflow-hidden shadow-md">
          <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-5 py-4 border-b-2 border-neutral-300 flex items-center justify-between">
            <h4 className="font-bold text-neutral-900 text-lg flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-blue-600" />
              ملخص نتائج التحقق
            </h4>
            <div className="flex items-center gap-4">
              {errorRowCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-100 rounded-lg border-2 border-red-400">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-bold text-red-700">
                    {blockingErrorCount}{' '}
                    {blockingErrorCount === 1 ? 'صف به خطأ مانع' : 'صفوف بها أخطاء مانعة'}
                  </span>
                </div>
              )}
              {warningRowCountInScope > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 rounded-lg border-2 border-yellow-400">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <span className="font-bold text-yellow-700">
                    {warningRowCountInScope}{' '}
                    {warningRowCountInScope === 1 ? 'صف به تحذير' : 'صفوف بها تحذيرات'}
                  </span>
                </div>
              )}
              {blockingErrorCount === 0 && warningRowCountInScope === 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-lg border-2 border-green-400">
                  <CheckCircle className="w-5 h-5 text-success-600" />
                  <span className="font-bold text-success-700">جاهز للاستيراد</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-neutral-700 bg-white px-3 py-2 rounded-lg border border-neutral-200 shadow-sm">
              <span className="font-semibold text-neutral-900">
                إجمالي الصفوف ضمن النطاق الحالي: {activeScopeIndices.length}
              </span>
              <span className="text-red-600 font-semibold">
                صفوف بها أخطاء مانعة: {blockingErrorCount}
              </span>
              <span className="text-yellow-600 font-semibold">
                صفوف بها تحذيرات: {warningRowCountInScope}
              </span>
            </div>
          </div>
          <div className="px-5 py-4 bg-white">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-neutral-700 leading-relaxed flex items-start gap-2">
                <span className="text-base">💡</span>
                <span>
                  <strong className="font-semibold">نصيحة:</strong> يمكنك التمرير على أي خلية ملونة
                  لعرض تفاصيل الخطأ أو التحذير. التحذيرات ستُستورد، والصفوف ذات الأخطاء غير المحددة
                  سيتم تجاهلها. للتعارض مع بيانات النظام اختر إبقاء السجل الحالي أو استبداله.
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Column Validation Error Message */}
      {columnValidationError && (
        <div className="border-2 border-red-500 rounded-lg overflow-hidden bg-red-50">
          <div className="bg-red-600 px-4 py-3 border-b border-red-700">
            <div className="flex items-center gap-2">
              <XCircle className="w-6 h-6 text-white" />
              <h4 className="font-bold text-white text-lg">❌ أعمدة Excel غير متطابقة!</h4>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-white rounded-lg p-4 border border-red-200">
              <p className="text-red-800 font-medium mb-3">
                الأعمدة في ملف Excel لا تطابق الأعمدة المطلوبة من النظام.
              </p>
              <p className="text-red-700 text-sm mb-4">
                <strong>
                  يرجى تصحيح ملف Excel ليحتوي على الأعمدة المطلوبة فقط - بدون نقص أو زيادة.
                </strong>
              </p>

              {columnValidationError.missing.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    الأعمدة المفقودة ({columnValidationError.missing.length}) - يجب إضافتها:
                  </h5>
                  <div className="bg-red-100 rounded p-3 border-l-4 border-red-600">
                    <ul className="list-disc list-inside space-y-1">
                      {columnValidationError.missing.map((col, index) => (
                        <li key={index} className="text-red-800 font-medium">
                          {col}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs text-red-700 mt-2 font-semibold">
                    ⚠️ لا يمكن الاستيراد بدون هذه الأعمدة
                  </p>
                </div>
              )}

              {columnValidationError.extra.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-bold text-warning-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    الأعمدة الإضافية ({columnValidationError.extra.length}) - يجب حذفها:
                  </h5>
                  <div className="bg-orange-100 rounded p-3 border-l-4 border-orange-600">
                    <ul className="list-disc list-inside space-y-1">
                      {columnValidationError.extra.map((col, index) => (
                        <li key={index} className="text-warning-800 font-medium">
                          {col}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs text-warning-700 mt-2 font-semibold">
                    ⚠️ النظام يقبل الأعمدة المطلوبة فقط - يرجى حذف هذه الأعمدة من ملف Excel
                  </p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-red-200">
                <h5 className="font-bold text-neutral-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success-600" />
                  الأعمدة المطلوبة بالضبط (
                  {importType === 'employees'
                    ? EMPLOYEE_COLUMNS_ORDER.length
                    : COMPANY_COLUMNS_ORDER.length}{' '}
                  عمود):
                </h5>
                <div className="bg-neutral-50 rounded p-4 border border-neutral-200">
                  <p className="text-xs text-neutral-600 mb-3 font-medium">
                    📋 يجب أن يحتوي ملف Excel على هذه الأعمدة فقط - بنفس الترتيب والأسماء:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {(importType === 'employees'
                      ? EMPLOYEE_COLUMNS_ORDER
                      : COMPANY_COLUMNS_ORDER
                    ).map((col, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-white p-2 rounded border border-neutral-200"
                      >
                        <span className="text-neutral-600 font-mono text-xs bg-neutral-100 px-2 py-1 rounded">
                          {index + 1}
                        </span>
                        <span className="text-neutral-800 font-medium text-sm">{col}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-xs text-blue-800 flex items-start gap-2">
                    <span className="text-base flex-shrink-0">💡</span>
                    <span>
                      <strong>نصيحة:</strong> افتح ملف Excel، احذف الأعمدة الإضافية، وتأكد من أن
                      أسماء الأعمدة تطابق القائمة أعلاه تماماً (بما في ذلك المسافات والرموز). يمكنك
                      تحميل القالب الصحيح من قسم "التصدير" لضمان التطابق.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Data - Hidden, shown in modal instead */}
      {/* eslint-disable-next-line no-constant-binary-expression */}

      {/* Delete Options - Hidden, shown in modal instead */}
      {/* eslint-disable-next-line no-constant-binary-expression */}

      {/* Import Button - Hidden, shown in modal instead */}
      {/* eslint-disable-next-line no-constant-binary-expression */}

      {/* Import Result */}
      {importResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-8 h-8 text-success-600" />
            <h4 className="text-xl font-bold text-success-900">اكتملت عملية الاستيراد</h4>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-neutral-900">{importResult.total}</div>
              <div className="text-sm text-neutral-600">إجمالي السجلات</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-success-600">{importResult.success}</div>
              <div className="text-sm text-neutral-600">تم بنجاح</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{importResult.failed}</div>
              <div className="text-sm text-neutral-600">فشل</div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal &&
        previewData.length > 0 &&
        !columnValidationError &&
        (() => {
          const filteredRows = previewData
            .map((row, index) => ({ row, index, status: getRowIssues(index) }))
            .filter(({ status }) => {
              if (validationFilter === 'errors') return status.hasError
              if (validationFilter === 'warnings') return !status.hasError && status.hasWarning
              return true
            })

          const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage))
          const safeCurrentPage = Math.min(currentPage, totalPages)
          const startIndex = (safeCurrentPage - 1) * rowsPerPage
          const endIndex = startIndex + rowsPerPage
          const visibleRowCount = filteredRows.length
          const displayStart = visibleRowCount === 0 ? 0 : startIndex + 1
          const displayEnd = visibleRowCount === 0 ? 0 : Math.min(endIndex, visibleRowCount)
          const paginatedData = filteredRows.slice(startIndex, endIndex)
          const dataColumns = Object.keys(previewData[0])
          const columns = getOrderedColumns(dataColumns, previewData)

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
              <div className="app-modal-surface my-4 flex max-h-[95vh] w-full max-w-[95vw] flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="app-modal-header flex items-center justify-between border-b-2 border-neutral-200 bg-gradient-to-r from-slate-50 to-primary/10 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="app-icon-chip flex h-10 w-10 items-center justify-center">
                      <FileUp className="w-5 h-5 text-slate-900" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-neutral-900">
                        معاينة البيانات ({previewData.length} صف)
                      </h2>
                      <p className="text-sm text-neutral-600 mt-0.5">
                        تحقق من البيانات قبل الاستيراد
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-xs bg-white px-3 py-2 rounded-lg border border-neutral-200 shadow-sm">
                      <span className="font-semibold text-neutral-800">
                        إجمالي الصفوف ضمن النطاق الحالي: {activeScopeIndices.length}
                      </span>
                      <span className="text-red-600 font-semibold">
                        صفوف بها أخطاء مانعة: {blockingErrorCount}
                      </span>
                      <span className="text-yellow-600 font-semibold">
                        صفوف بها تحذيرات: {warningRowCountInScope}
                      </span>
                    </div>
                    <button
                      onClick={exportValidationReport}
                      className="flex items-center gap-2 px-3 py-2 bg-neutral-900 text-white rounded-lg text-xs font-semibold shadow-md hover:bg-black/80 transition"
                    >
                      <Upload className="w-4 h-4" />
                      <span>تصدير تقرير الأخطاء</span>
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      if (!isDeleting && !importing && !showConfirmDialog) {
                        setShowPreviewModal(false)
                      } else {
                        toast.warning('لا يمكن إغلاق النافذة أثناء عملية الحذف أو الاستيراد')
                      }
                    }}
                    disabled={isDeleting || importing || showConfirmDialog}
                    className={`p-2 rounded-lg transition-colors ${
                      isDeleting || importing || showConfirmDialog
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-neutral-100'
                    }`}
                    aria-label="إغلاق"
                  >
                    <XCircle className="w-6 h-6 text-neutral-600" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Validation Results Summary */}
                  {validationResults.length > 0 && (
                    <div className="border-2 border-neutral-300 rounded-xl overflow-hidden shadow-md">
                      <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-5 py-4 border-b-2 border-neutral-300 flex items-center justify-between">
                        <h4 className="font-bold text-neutral-900 text-lg flex items-center gap-2">
                          <CheckCircle className="w-6 h-6 text-blue-600" />
                          ملخص نتائج التحقق
                        </h4>
                        <div className="flex items-center gap-4">
                          {blockingErrorCount > 0 && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-red-100 rounded-lg border-2 border-red-400">
                              <XCircle className="w-5 h-5 text-red-600" />
                              <span className="font-bold text-red-700">
                                {blockingErrorCount}{' '}
                                {blockingErrorCount === 1
                                  ? 'صف به خطأ مانع'
                                  : 'صفوف بها أخطاء مانعة'}
                              </span>
                            </div>
                          )}
                          {warningRowCountInScope > 0 && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 rounded-lg border-2 border-yellow-400">
                              <AlertCircle className="w-5 h-5 text-yellow-600" />
                              <span className="font-bold text-yellow-700">
                                {warningRowCountInScope}{' '}
                                {warningRowCountInScope === 1
                                  ? 'صف به تحذير'
                                  : 'صفوف بها تحذيرات'}
                              </span>
                            </div>
                          )}
                          {blockingErrorCount === 0 && warningRowCountInScope === 0 && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-lg border-2 border-green-400">
                              <CheckCircle className="w-5 h-5 text-success-600" />
                              <span className="font-bold text-success-700">جاهز للاستيراد</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-neutral-700 bg-white px-3 py-2 rounded-lg border border-neutral-200 shadow-sm">
                          <span className="font-semibold text-neutral-900">
                            إجمالي الصفوف ضمن النطاق الحالي: {activeScopeIndices.length}
                          </span>
                          <span className="text-red-600 font-semibold">
                            صفوف بها أخطاء مانعة: {blockingErrorCount}
                          </span>
                          <span className="text-yellow-600 font-semibold">
                            صفوف بها تحذيرات: {warningRowCountInScope}
                          </span>
                        </div>
                      </div>
                      <div className="px-5 py-4 bg-white">
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                          <p className="text-xs text-neutral-700 leading-relaxed flex items-start gap-2">
                            <span className="text-base">💡</span>
                            <span>
                              <strong className="font-semibold">نصيحة:</strong> يمكنك التمرير على أي
                              خلية ملونة لعرض تفاصيل الخطأ أو التحذير. التحذيرات ستُستورد، والصفوف
                              ذات الأخطاء غير المحددة سيتم تجاهلها. للتعارض مع بيانات النظام اختر
                              إبقاء السجل الحالي أو استبداله.
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preview Data Table */}
                  <div
                    className="border-2 border-neutral-300 rounded-xl overflow-hidden shadow-lg w-full"
                    style={{ maxWidth: '100%' }}
                  >
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b-2 border-blue-200 flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-wrap">
                        <h4 className="font-bold text-neutral-900 text-base flex items-center gap-2">
                          <FileUp className="w-5 h-5 text-blue-600" />
                          جدول البيانات
                        </h4>
                        {selectedRows.size > 0 && (
                          <span className="px-3 py-1 text-xs text-blue-700 bg-blue-100 rounded-full font-semibold">
                            {selectedRows.size} صف محدد
                          </span>
                        )}
                        {selectedRows.size > 0 && (
                          <span className="px-3 py-1 text-xs text-red-700 bg-red-100 rounded-full font-semibold">
                            أخطاء في الصفوف المحددة: {selectedRowsErrorCount}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm text-neutral-700 font-medium bg-white px-3 py-1 rounded-lg border border-neutral-200">
                          الصفحة {safeCurrentPage} من {totalPages}
                        </div>
                        <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-neutral-200 shadow-sm">
                          <button
                            onClick={() => handleFilterChange('all')}
                            className={`app-toggle-button text-xs ${validationFilter === 'all' ? 'app-toggle-button-active' : ''}`}
                          >
                            عرض الكل
                          </button>
                          <button
                            onClick={() => handleFilterChange('errors')}
                            className={`px-2 py-1 text-xs rounded-md border font-semibold transition ${validationFilter === 'errors' ? 'bg-red-600 text-white border-red-600' : 'border-neutral-200 text-neutral-700 hover:border-neutral-300'}`}
                          >
                            الأخطاء فقط ({errorRowCount})
                          </button>
                          <button
                            onClick={() => handleFilterChange('warnings')}
                            className={`px-2 py-1 text-xs rounded-md border font-semibold transition ${validationFilter === 'warnings' ? 'bg-yellow-500 text-white border-yellow-500' : 'border-neutral-200 text-neutral-700 hover:border-neutral-300'}`}
                          >
                            التحذيرات فقط ({warningRowCount})
                          </button>
                        </div>
                      </div>
                    </div>
                    <div
                      className="relative w-full bg-neutral-50"
                      style={{ maxWidth: '100%', overflow: 'hidden' }}
                    >
                      <div
                        className="overflow-y-auto"
                        style={{
                          maxHeight: 'calc(95vh - 500px)',
                          width: '100%',
                          maxWidth: '100%',
                        }}
                      >
                        <table
                          className="text-[11px] w-full"
                          style={{
                            tableLayout: 'fixed',
                            borderCollapse: 'collapse',
                            width: '100%',
                            maxWidth: '100%',
                          }}
                        >
                          <thead className="sticky top-0 z-[1] bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-neutral-300">
                            <tr>
                              <th
                                className="px-0.5 py-1 text-center font-semibold text-neutral-800 whitespace-nowrap bg-neutral-200 text-[11px]"
                                style={{ width: '2%' }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isAllSelected}
                                  ref={(input) => {
                                    if (input) input.indeterminate = isSomeSelected
                                  }}
                                  onChange={toggleSelectAll}
                                  className="w-3 h-3 cursor-pointer"
                                />
                              </th>
                              <th
                                className="px-0.5 py-1 text-center font-semibold text-neutral-800 whitespace-nowrap bg-neutral-200 text-[11px]"
                                style={{ width: '3%' }}
                              >
                                رقم الصف
                              </th>
                              <th
                                className="px-0.5 py-1 text-center font-semibold text-neutral-800 whitespace-nowrap bg-neutral-200 text-[11px]"
                                style={{ width: '6%' }}
                              >
                                الحالة
                              </th>
                              {columns.map((key, index) => {
                                // تحديد عرض أصغر لكل عمود بناءً على نوعه لتتناسب مع الشاشة
                                let columnWidth = '4%' // العرض الافتراضي كنسبة مئوية

                                if (key === 'الاسم') columnWidth = '6%'
                                else if (key === 'المهنة') columnWidth = '5%'
                                else if (key === 'الجنسية')
                                  columnWidth = '3%' // تصغير عرض عمود الجنسية
                                else if (key === 'رقم الإقامة')
                                  columnWidth = '4%' // 10 أرقام
                                else if (key === 'رقم الجواز')
                                  columnWidth = '4%' // 9-10 أرقام + حرف
                                else if (key === 'رقم الهاتف')
                                  columnWidth = '4%' // 10 أرقام
                                else if (key === 'الحساب البنكي') columnWidth = '5%'
                                else if (key === 'الراتب') columnWidth = '4%'
                                else if (key === 'المشروع') columnWidth = '6%'
                                else if (key === 'الرقم الموحد')
                                  columnWidth = '4%' // 10 أرقام
                                else if (key.includes('تاريخ'))
                                  columnWidth = '6%' // زيادة العرض للتواريخ لعرضها بالكامل
                                else if (key === 'الملاحظات') columnWidth = '6%'

                                // تحديد ما إذا كان العمود حقل تاريخ
                                const isDateColumn = key.includes('تاريخ')

                                return (
                                  <th
                                    key={index}
                                    className={`px-0.5 py-1 font-semibold text-neutral-800 whitespace-nowrap text-[11px] ${
                                      isDateColumn ? 'text-left' : 'text-right'
                                    }`}
                                    style={{
                                      width: columnWidth,
                                      ...(isDateColumn ? { direction: 'ltr' } : {}),
                                    }}
                                  >
                                    {key}
                                  </th>
                                )
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedData.map(
                              ({ row, index: originalIndex, status }, localRowIndex) => {
                                const excelRowNumber = originalIndex + 2
                                const isEven = localRowIndex % 2 === 0
                                const isConflictRow = dbConflicts.has(originalIndex)
                                const conflictChoice = conflictResolution.get(originalIndex)
                                return (
                                  <tr
                                    key={originalIndex}
                                    className={`border-b border-neutral-200 transition-colors ${isEven ? 'bg-white' : 'bg-neutral-50'} hover:bg-blue-100`}
                                  >
                                    <td
                                      className="px-0.5 py-0.5 text-center text-[11px]"
                                      style={{ backgroundColor: isEven ? '#ffffff' : '#f9fafb' }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedRows.has(originalIndex)}
                                        onChange={() => toggleRowSelection(originalIndex)}
                                        className="w-3 h-3 cursor-pointer"
                                      />
                                    </td>
                                    <td
                                      className="px-0.5 py-0.5 text-center font-semibold text-neutral-700 text-[11px]"
                                      style={{ backgroundColor: isEven ? '#ffffff' : '#f9fafb' }}
                                    >
                                      {excelRowNumber}
                                    </td>
                                    <td
                                      className="px-0.5 py-0.5 text-center text-[11px]"
                                      style={{ backgroundColor: isEven ? '#ffffff' : '#f9fafb' }}
                                    >
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                                          status.hasError
                                            ? 'bg-red-50 text-red-700 border-red-200'
                                            : status.hasWarning
                                              ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                              : 'bg-green-50 text-success-700 border-green-200'
                                        }`}
                                        title={[
                                          ...status.rowValidation.map((issue) => issue.message),
                                          isConflictRow && !conflictChoice
                                            ? 'الرجاء اختيار إبقاء السجل الحالي أو استبداله'
                                            : null,
                                        ]
                                          .filter(Boolean)
                                          .join(' • ')}
                                      >
                                        {status.hasError
                                          ? 'خطأ'
                                          : status.hasWarning
                                            ? 'تحذير'
                                            : 'سليم'}
                                        {/* إزالة الرسالة "قرار مطلوب" لأن الخيار الافتراضي = "استبدال" */}
                                      </span>
                                      {isConflictRow && (
                                        <div className="mt-1 flex items-center gap-2 justify-center text-[10px] text-neutral-700">
                                          <label className="flex items-center gap-1 cursor-pointer">
                                            <input
                                              type="radio"
                                              name={`conflict-${originalIndex}`}
                                              value="keep"
                                              checked={conflictChoice === 'keep'}
                                              onChange={() =>
                                                updateConflictChoice(originalIndex, 'keep')
                                              }
                                              className="w-3 h-3"
                                            />
                                            <span>إبقاء</span>
                                          </label>
                                          <label className="flex items-center gap-1 cursor-pointer">
                                            <input
                                              type="radio"
                                              name={`conflict-${originalIndex}`}
                                              value="replace"
                                              checked={conflictChoice === 'replace'}
                                              onChange={() =>
                                                updateConflictChoice(originalIndex, 'replace')
                                              }
                                              className="w-3 h-3"
                                            />
                                            <span>استبدال</span>
                                          </label>
                                        </div>
                                      )}
                                    </td>
                                    {columns.map((key, colIndex) => {
                                      const value = row[key]
                                      const isEmpty = isCellEmpty(value)
                                      const cellErrors = getCellErrors(originalIndex, key)
                                      const hasError = cellErrors.some(
                                        (e) => e.severity === 'error'
                                      )
                                      const hasWarning = cellErrors.some(
                                        (e) => e.severity === 'warning'
                                      )

                                      // تحديد ما إذا كان الحقل حقل تاريخ
                                      const isDateField = key.includes('تاريخ')

                                      // الخلفية الحمراء فقط للحقول المطلوبة التي لديها خطأ (severity: error)
                                      let cellClassName = `px-0.5 py-0.5 text-[11px] overflow-hidden `
                                      if (hasError) {
                                        // خلفية حمراء فقط للحقول المطلوبة (التي تمنع الاستيراد)
                                        cellClassName +=
                                          'bg-red-100 text-red-900 border-l-2 border-red-500 font-medium'
                                      } else if (hasWarning) {
                                        cellClassName +=
                                          'bg-yellow-50 text-yellow-900 border-l-2 border-yellow-500'
                                      } else {
                                        // الحقول الفارغة العادية: لا خلفية حمراء - فقط نص أحمر Bold
                                        // الخلايا العادية تأخذ لون الصف
                                        cellClassName += 'text-neutral-800'
                                      }

                                      // الحصول على القيمة الأصلية مباشرة
                                      const fullValue = value?.toString() || ''

                                      // معالجة خاصة للتواريخ
                                      let displayValue = isEmpty
                                        ? importType === 'companies'
                                          ? 'فارغ'
                                          : 'غير موجود'
                                        : fullValue

                                      let parsedDate: Date | null = null
                                      let dateParseError: string | undefined = undefined

                                      // إذا كان الحقل تاريخ، محاولة تحليل التاريخ
                                      if (isDateField && !isEmpty && fullValue) {
                                        // تنظيف القيمة من "..." في البداية أو النهاية وأي مسافات
                                        const cleanedValue = fullValue
                                          .trim()
                                          .replace(/^\.\.\.+/, '') // إزالة "..." من البداية
                                          .replace(/\.\.\.+$/, '') // إزالة "..." من النهاية
                                          .trim()

                                        // محاولات متعددة لتحليل التاريخ
                                        let dateResult = parseDate(cleanedValue)

                                        // إذا فشل التحليل، حاول بالقيمة الأصلية الكاملة
                                        if (!dateResult.date && cleanedValue !== fullValue.trim()) {
                                          dateResult = parseDate(fullValue.trim())
                                        }

                                        // إذا فشل التحليل، حاول بعد إزالة جميع "..." من أي مكان
                                        if (!dateResult.date) {
                                          const fullyCleaned = fullValue
                                            .trim()
                                            .replace(/\.\.\./g, '')
                                            .trim()
                                          if (fullyCleaned && fullyCleaned !== cleanedValue) {
                                            dateResult = parseDate(fullyCleaned)
                                          }
                                        }

                                        if (dateResult.date) {
                                          parsedDate = dateResult.date
                                          // عرض التاريخ بصيغة dd-mmm-yyyy (مثل: 03-May-2026)
                                          displayValue = formatDateDDMMMYYYY(dateResult.date)
                                        } else {
                                          // فشل التحليل - عرض القيمة الأصلية الكاملة بدون truncate
                                          dateParseError = dateResult.error
                                          displayValue =
                                            fullValue
                                              .trim()
                                              .replace(/^\.\.\.+/, '')
                                              .replace(/\.\.\.+$/, '') || fullValue
                                        }
                                      }

                                      // تطبيق truncate على النصوص الطويلة
                                      // ملاحظة: أعمدة التواريخ لا يتم قطعها أبداً - تُعرض بالكامل
                                      if (displayValue && !isEmpty && !isDateField) {
                                        let maxLength = 10 // الطول الافتراضي
                                        if (key === 'الحساب البنكي') maxLength = 10
                                        else if (key === 'المشروع') maxLength = 12
                                        else if (key === 'الملاحظات') maxLength = 10
                                        else if (key === 'الاسم') maxLength = 15
                                        else if (key === 'المهنة') maxLength = 12
                                        else if (key === 'الجنسية')
                                          maxLength = 8 // تصغير عرض عمود الجنسية
                                        else if (key === 'رقم الإقامة')
                                          maxLength = 10 // 10 أرقام
                                        else if (key === 'رقم الجواز')
                                          maxLength = 11 // 9-10 أرقام + حرف
                                        else if (key === 'رقم الهاتف')
                                          maxLength = 10 // 10 أرقام
                                        else if (key === 'الرقم الموحد') maxLength = 10 // 10 أرقام

                                        if (displayValue.length > maxLength) {
                                          displayValue =
                                            displayValue.substring(0, maxLength) + '...'
                                        }
                                      }
                                      // التواريخ (المحللة أو غير المحللة) تُعرض بالكامل بدون truncate

                                      // جمع رسائل الأخطاء والتحذيرات
                                      const errorMessages = cellErrors
                                        .map((e) => e.message)
                                        .join(' • ')

                                      // إعداد tooltip للتواريخ
                                      let tooltipText = fullValue
                                      if (isDateField && !isEmpty) {
                                        if (parsedDate) {
                                          // إذا تم تحليل التاريخ بنجاح، عرض القيمة الأصلية والتاريخ المحلل
                                          tooltipText = `الأصل: ${fullValue}\nالمحلل: ${formatDateDDMMMYYYY(parsedDate)}`
                                        } else if (dateParseError) {
                                          // إذا فشل التحليل، عرض القيمة الأصلية ورسالة الخطأ
                                          tooltipText = `القيمة: ${fullValue}\nخطأ: ${dateParseError}`
                                        }
                                      }
                                      if (errorMessages) {
                                        tooltipText =
                                          errorMessages +
                                          (tooltipText !== fullValue ? `\n${tooltipText}` : '')
                                      }

                                      // تحديد تنسيق الحقل الفارغ (بدون خلفية حمراء، فقط نص أحمر Bold)
                                      const isEmptyWithNoError = isEmpty && !hasError

                                      return (
                                        <td
                                          key={colIndex}
                                          className={cellClassName}
                                          title={tooltipText}
                                          style={{
                                            // أعمدة التواريخ: عرض كامل بدون truncate مع محاذاة يسار واتجاه LTR
                                            ...(isDateField
                                              ? {
                                                  minWidth: 'fit-content',
                                                  width: 'auto',
                                                  whiteSpace: 'nowrap',
                                                  overflow: 'visible',
                                                  textOverflow: 'clip',
                                                  textAlign: 'left', // محاذاة يسار
                                                  direction: 'ltr', // اتجاه من اليسار إلى اليمين
                                                }
                                              : {
                                                  maxWidth: '100%',
                                                  textOverflow: 'ellipsis',
                                                  whiteSpace: 'nowrap',
                                                }),
                                          }}
                                        >
                                          <div
                                            className={`flex items-center gap-0.5 ${isDateField ? 'overflow-visible justify-start' : 'overflow-hidden'}`}
                                          >
                                            {hasError && (
                                              <XCircle className="w-2.5 h-2.5 text-red-600 flex-shrink-0" />
                                            )}
                                            {hasWarning && !hasError && (
                                              <AlertCircle className="w-2.5 h-2.5 text-yellow-600 flex-shrink-0" />
                                            )}
                                            <span
                                              className={`${isDateField ? 'whitespace-nowrap overflow-visible' : 'truncate'} ${
                                                hasError
                                                  ? 'font-semibold'
                                                  : isEmptyWithNoError
                                                    ? 'font-bold text-red-600'
                                                    : ''
                                              }`}
                                              style={
                                                isDateField
                                                  ? {
                                                      overflow: 'visible',
                                                      textOverflow: 'clip',
                                                      direction: 'ltr', // اتجاه من اليسار إلى اليمين
                                                      textAlign: 'left', // محاذاة يسار
                                                    }
                                                  : {}
                                              }
                                              title={tooltipText}
                                            >
                                              {displayValue}
                                            </span>
                                          </div>
                                          {cellErrors.length > 0 && (
                                            <div
                                              className="mt-0.5 text-[9px] opacity-75 leading-tight truncate"
                                              title={errorMessages}
                                            >
                                              {errorMessages.length > 15
                                                ? errorMessages.substring(0, 15) + '...'
                                                : errorMessages}
                                            </div>
                                          )}
                                        </td>
                                      )
                                    })}
                                  </tr>
                                )
                              }
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {totalPages > 1 && (
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-t-2 border-neutral-300 flex items-center justify-between">
                        <div className="text-sm text-neutral-700 font-medium">
                          عرض <span className="font-bold text-blue-600">{displayStart}</span> -{' '}
                          <span className="font-bold text-blue-600">{displayEnd}</span> من{' '}
                          <span className="font-bold text-neutral-900">{visibleRowCount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={safeCurrentPage === 1}
                            className="px-4 py-2 text-sm border-2 border-neutral-300 rounded-lg hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors disabled:border-neutral-200"
                          >
                            ← السابق
                          </button>
                          <span className="px-4 py-2 text-sm text-neutral-800 font-semibold bg-white border-2 border-neutral-300 rounded-lg">
                            {safeCurrentPage} / {totalPages}
                          </span>
                          <button
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={safeCurrentPage === totalPages}
                            className="px-4 py-2 text-sm border-2 border-neutral-300 rounded-lg hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors disabled:border-neutral-200"
                          >
                            التالي →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Delete Options */}
                  {errorCount === 0 && (
                    <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50">
                      <div className="flex items-start gap-3 mb-4">
                        <input
                          type="checkbox"
                          id="delete-before-import-modal"
                          checked={shouldDeleteBeforeImport}
                          onChange={(e) => setShouldDeleteBeforeImport(e.target.checked)}
                          className="mt-1 w-4 h-4 cursor-pointer"
                        />
                        <label
                          htmlFor="delete-before-import-modal"
                          className="flex-1 cursor-pointer"
                        >
                          <span className="font-medium text-neutral-900">
                            حذف البيانات الموجودة قبل الاستيراد
                          </span>
                          <p className="text-xs text-neutral-600 mt-1">
                            سيتم حذف البيانات الموجودة في النظام قبل إضافة البيانات المستوردة
                          </p>
                        </label>
                      </div>

                      {shouldDeleteBeforeImport && (
                        <div className="ml-7 space-y-2">
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              id="delete-all-modal"
                              name="delete-mode-modal"
                              value="all"
                              checked={deleteMode === 'all'}
                              onChange={(e) => setDeleteMode(e.target.value as 'all' | 'matching')}
                              className="w-4 h-4 cursor-pointer"
                            />
                            <label
                              htmlFor="delete-all-modal"
                              className="cursor-pointer text-sm text-neutral-700"
                            >
                              حذف جميع البيانات (
                              {importType === 'companies' ? 'جميع المؤسسات' : 'جميع الموظفين'})
                            </label>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              id="delete-matching-modal"
                              name="delete-mode-modal"
                              value="matching"
                              checked={deleteMode === 'matching'}
                              onChange={(e) => setDeleteMode(e.target.value as 'all' | 'matching')}
                              className="w-4 h-4 cursor-pointer"
                            />
                            <label
                              htmlFor="delete-matching-modal"
                              className="cursor-pointer text-sm text-neutral-700"
                            >
                              حذف البيانات المطابقة فقط (
                              {importType === 'companies'
                                ? 'المؤسسات بنفس الرقم الموحد'
                                : 'الموظفين بنفس رقم الإقامة'}
                              )
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Delete Confirmation Modal */}
                  <DeleteConfirmationModal
                    isOpen={showConfirmDialog}
                    onClose={() => {
                      setShowConfirmDialog(false)
                      setPendingImport(null)
                    }}
                    onConfirm={async () => {
                      logger.debug('🔄 Confirm delete button clicked')
                      if (pendingImport) {
                        logger.debug('🔄 Calling pendingImport callback')
                        try {
                          await pendingImport()
                          logger.debug('✅ pendingImport callback completed')
                        } catch (error) {
                          console.error('❌ Error executing pendingImport:', error)
                          const errorMessage =
                            error instanceof Error ? error.message : 'خطأ غير معروف'
                          toast.error(`فشل العملية: ${errorMessage}`)
                        }
                      } else {
                        console.error('❌ pendingImport is null!')
                        toast.error('خطأ: لم يتم تهيئة عملية الحذف بشكل صحيح')
                      }
                    }}
                    deleteMode={deleteMode}
                    importType={importType}
                    selectedRowsCount={selectedRows.size}
                    totalRowsCount={previewData.length}
                  />

                  {/* Import Button */}
                  <div
                    className={`flex flex-col items-center gap-4 border-2 rounded-xl p-6 shadow-lg ${
                      errorCount === 0
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
                        : 'bg-red-50 border-red-300'
                    }`}
                  >
                    {blockingErrorCount > 0 ? (
                      <div className="flex flex-col items-center gap-2 mb-2 text-center">
                        <div className="flex items-center gap-2 text-red-700">
                          <XCircle className="w-5 h-5" />
                          <span className="font-bold text-base">لا يمكن الاستيراد</span>
                        </div>
                        <p className="text-sm text-red-700">
                          يوجد {blockingErrorCount} صف به أخطاء مانعة ضمن نطاق الاستيراد الحالي.
                          يمكنك إلغاء تحديد الصفوف الخاطئة أو إصلاحها قبل المتابعة. التحذيرات لا
                          تمنع الاستيراد.
                        </p>
                      </div>
                    ) : (
                      <div className="text-base text-neutral-700 font-medium text-center">
                        {selectedRows.size > 0 ? (
                          <>
                            سيتم استيراد{' '}
                            <span className="font-bold text-success-700">{selectedRows.size}</span>{' '}
                            صف محدد (التحذيرات ستُستورد)
                          </>
                        ) : (
                          <>
                            سيتم استيراد جميع الصفوف (
                            <span className="font-bold text-success-700">{previewData.length}</span>{' '}
                            صف) (التحذيرات ستُستورد)
                          </>
                        )}
                      </div>
                    )}
                    {/* شريط التقدم أثناء الحذف */}
                    {isDeleting && (
                      <div className="w-full mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                            <span className="text-sm font-semibold text-red-900">
                              جاري الحذف...
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {deleteProgress.total > 0 && (
                              <span className="text-sm font-bold text-red-700">
                                {deleteProgress.current} / {deleteProgress.total}
                              </span>
                            )}
                          </div>
                        </div>
                        {deleteProgress.total > 0 ? (
                          <>
                            <div className="bg-neutral-200 rounded-full h-6 overflow-hidden shadow-inner mb-2">
                              <div
                                className="h-full rounded-full transition-all duration-300 ease-out flex items-center justify-center relative bg-gradient-to-r from-red-500 via-red-600 to-orange-500"
                                style={{
                                  width: `${Math.min((deleteProgress.current / deleteProgress.total) * 100, 100)}%`,
                                }}
                              >
                                {deleteProgress.current > 0 && (
                                  <span className="text-xs font-bold text-white px-2 z-10">
                                    {Math.round(
                                      (deleteProgress.current / deleteProgress.total) * 100
                                    )}
                                    %
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-center text-sm text-neutral-700">
                              جارٍ حذف{' '}
                              <span className="font-bold text-red-700">
                                {deleteProgress.current}
                              </span>{' '}
                              من{' '}
                              <span className="font-bold text-red-700">{deleteProgress.total}</span>{' '}
                              {importType === 'employees' ? 'موظف' : 'مؤسسة'}...
                            </div>
                          </>
                        ) : (
                          <div className="text-center text-sm text-neutral-600">
                            جاري تحضير عملية الحذف...
                          </div>
                        )}
                      </div>
                    )}

                    {/* شريط التقدم أثناء الاستيراد */}
                    {importing && (
                      <div className="w-full mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                            <span className="text-sm font-semibold text-blue-900">
                              {isImportCancelled ? 'جاري إلغاء الاستيراد...' : 'جاري الاستيراد...'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {importProgress.total > 0 && (
                              <span className="text-sm font-bold text-blue-700">
                                {importProgress.current} / {importProgress.total}
                              </span>
                            )}
                            {!isImportCancelled && (
                              <button
                                onClick={cancelImport}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
                              >
                                <XCircle className="w-4 h-4" />
                                إلغاء الاستيراد
                              </button>
                            )}
                          </div>
                        </div>
                        {importProgress.total > 0 ? (
                          <>
                            <div className="bg-neutral-200 rounded-full h-6 overflow-hidden shadow-inner mb-2">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ease-out flex items-center justify-center relative ${
                                  isImportCancelled
                                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                                    : 'bg-gradient-to-r from-blue-500 via-blue-600 to-emerald-500'
                                }`}
                                style={{
                                  width: `${Math.min((importProgress.current / importProgress.total) * 100, 100)}%`,
                                }}
                              >
                                {importProgress.current > 0 && (
                                  <span className="text-xs font-bold text-white px-2 z-10">
                                    {Math.round(
                                      (importProgress.current / importProgress.total) * 100
                                    )}
                                    %
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-center text-sm text-neutral-700">
                              {isImportCancelled ? (
                                <span className="text-red-700 font-semibold">
                                  جاري إلغاء الاستيراد وحذف السجلات المضافة...
                                </span>
                              ) : (
                                <>
                                  جارٍ استيراد{' '}
                                  <span className="font-bold text-blue-700">
                                    {importProgress.current}
                                  </span>{' '}
                                  من{' '}
                                  <span className="font-bold text-blue-700">
                                    {importProgress.total}
                                  </span>{' '}
                                  {importType === 'employees' ? 'موظف' : 'مؤسسة'}...
                                </>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="text-center text-sm text-neutral-600">
                            {isImportCancelled
                              ? 'جاري إلغاء الاستيراد...'
                              : 'جاري تحضير البيانات للاستيراد...'}
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={importData}
                      disabled={importing || isDeleting || blockingErrorCount > 0}
                      className={`flex items-center gap-3 px-10 py-4 rounded-xl text-lg font-bold transition-all shadow-xl hover:shadow-2xl transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed ${
                        errorCount === 0
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
                          : 'bg-neutral-400 text-white cursor-not-allowed opacity-50'
                      }`}
                    >
                      <FileUp className="w-7 h-7" />
                      {isDeleting ? (
                        <>
                          <span className="animate-spin">🗑️</span>
                          <span>جاري الحذف...</span>
                        </>
                      ) : importing ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          <span>جارٍ الاستيراد...</span>
                        </>
                      ) : (
                        <span>استيراد البيانات</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
    </div>
  )
}
