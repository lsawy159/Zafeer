import { AlertCircle, CheckCircle, FileUp, Upload, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { parseDate } from '@/utils/dateParser'
import { formatDateDDMMMYYYY } from '@/utils/dateFormatter'
import DeleteConfirmationModal from '../DeleteConfirmationModal'
import type { useImportBase } from './useImportBase'

type Ctx = ReturnType<typeof useImportBase>

export default function ImportPreviewModal(ctx: Ctx) {
  const {
    showPreviewModal, previewData, columnValidationError,
    validationResults, validationFilter,
    currentPage, setCurrentPage,
    rowsPerPage,
    activeScopeIndices, blockingErrorCount, warningRowCountInScope, errorRowCount, warningRowCount,
    selectedRows, selectedRowsErrorCount,
    isAllSelected, isSomeSelected,
    importing, isDeleting, isImportCancelled,
    showConfirmDialog, setShowConfirmDialog,
    pendingImport, setPendingImport,
    importProgress, deleteProgress,
    shouldDeleteBeforeImport, setShouldDeleteBeforeImport,
    deleteMode, setDeleteMode,
    dbConflicts, conflictResolution,
    importType,
    errorCount,
    getRowIssues, getOrderedColumns, getCellErrors, isCellEmpty,
    toggleRowSelection, toggleSelectAll, updateConflictChoice,
    handleFilterChange, exportValidationReport,
    importData, cancelImport,
    setShowPreviewModal,
  } = ctx

  if (!showPreviewModal || previewData.length === 0 || columnValidationError) return null

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
              <p className="text-sm text-neutral-600 mt-0.5">تحقق من البيانات قبل الاستيراد</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs bg-white px-3 py-2 rounded-lg border border-neutral-200 shadow-sm">
              <span className="font-semibold text-neutral-800">
                إجمالي الصفوف ضمن النطاق الحالي: {activeScopeIndices.length}
              </span>
              <span className="text-red-600 font-semibold">صفوف بها أخطاء مانعة: {blockingErrorCount}</span>
              <span className="text-yellow-600 font-semibold">صفوف بها تحذيرات: {warningRowCountInScope}</span>
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
                  <span className="text-red-600 font-semibold">صفوف بها أخطاء مانعة: {blockingErrorCount}</span>
                  <span className="text-yellow-600 font-semibold">صفوف بها تحذيرات: {warningRowCountInScope}</span>
                </div>
              </div>
              <div className="px-5 py-4 bg-white">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-neutral-700 leading-relaxed flex items-start gap-2">
                    <span className="text-base">💡</span>
                    <span>
                      <strong className="font-semibold">نصيحة:</strong> يمكنك التمرير على أي خلية
                      ملونة لعرض تفاصيل الخطأ أو التحذير. التحذيرات ستُستورد، والصفوف ذات الأخطاء
                      غير المحددة سيتم تجاهلها. للتعارض مع بيانات النظام اختر إبقاء السجل الحالي أو
                      استبداله.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Preview Data Table */}
          <div className="border-2 border-neutral-300 rounded-xl overflow-hidden shadow-lg w-full" style={{ maxWidth: '100%' }}>
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
            <div className="relative w-full bg-neutral-50" style={{ maxWidth: '100%', overflow: 'hidden' }}>
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(95vh - 500px)', width: '100%', maxWidth: '100%' }}>
                <table className="text-[11px] w-full" style={{ tableLayout: 'fixed', borderCollapse: 'collapse', width: '100%', maxWidth: '100%' }}>
                  <thead className="sticky top-0 z-[1] bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-neutral-300">
                    <tr>
                      <th className="px-0.5 py-1 text-center font-semibold text-neutral-800 whitespace-nowrap bg-neutral-200 text-[11px]" style={{ width: '2%' }}>
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={(input) => { if (input) input.indeterminate = isSomeSelected }}
                          onChange={toggleSelectAll}
                          className="w-3 h-3 cursor-pointer"
                        />
                      </th>
                      <th className="px-0.5 py-1 text-center font-semibold text-neutral-800 whitespace-nowrap bg-neutral-200 text-[11px]" style={{ width: '3%' }}>رقم الصف</th>
                      <th className="px-0.5 py-1 text-center font-semibold text-neutral-800 whitespace-nowrap bg-neutral-200 text-[11px]" style={{ width: '6%' }}>الحالة</th>
                      {columns.map((key, index) => {
                        let columnWidth = '4%'
                        if (key === 'الاسم') columnWidth = '6%'
                        else if (key === 'المهنة') columnWidth = '5%'
                        else if (key === 'الجنسية') columnWidth = '3%'
                        else if (key === 'رقم الإقامة') columnWidth = '4%'
                        else if (key === 'رقم الجواز') columnWidth = '4%'
                        else if (key === 'رقم الهاتف') columnWidth = '4%'
                        else if (key === 'الحساب البنكي') columnWidth = '5%'
                        else if (key === 'الراتب') columnWidth = '4%'
                        else if (key === 'المشروع') columnWidth = '6%'
                        else if (key === 'الرقم الموحد') columnWidth = '4%'
                        else if (key.includes('تاريخ')) columnWidth = '6%'
                        else if (key === 'الملاحظات') columnWidth = '6%'
                        const isDateColumn = key.includes('تاريخ')
                        return (
                          <th
                            key={index}
                            className={`px-0.5 py-1 font-semibold text-neutral-800 whitespace-nowrap text-[11px] ${isDateColumn ? 'text-left' : 'text-right'}`}
                            style={{ width: columnWidth, ...(isDateColumn ? { direction: 'ltr' } : {}) }}
                          >
                            {key}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map(({ row, index: originalIndex, status }, localRowIndex) => {
                      const excelRowNumber = originalIndex + 2
                      const isEven = localRowIndex % 2 === 0
                      const isConflictRow = dbConflicts.has(originalIndex)
                      const conflictChoice = conflictResolution.get(originalIndex)
                      return (
                        <tr key={originalIndex} className={`border-b border-neutral-200 transition-colors ${isEven ? 'bg-white' : 'bg-neutral-50'} hover:bg-blue-100`}>
                          <td className="px-0.5 py-0.5 text-center text-[11px]" style={{ backgroundColor: isEven ? '#ffffff' : '#f9fafb' }}>
                            <input type="checkbox" checked={selectedRows.has(originalIndex)} onChange={() => toggleRowSelection(originalIndex)} className="w-3 h-3 cursor-pointer" />
                          </td>
                          <td className="px-0.5 py-0.5 text-center font-semibold text-neutral-700 text-[11px]" style={{ backgroundColor: isEven ? '#ffffff' : '#f9fafb' }}>
                            {excelRowNumber}
                          </td>
                          <td className="px-0.5 py-0.5 text-center text-[11px]" style={{ backgroundColor: isEven ? '#ffffff' : '#f9fafb' }}>
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
                                isConflictRow && !conflictChoice ? 'الرجاء اختيار إبقاء السجل الحالي أو استبداله' : null,
                              ].filter(Boolean).join(' • ')}
                            >
                              {status.hasError ? 'خطأ' : status.hasWarning ? 'تحذير' : 'سليم'}
                            </span>
                            {isConflictRow && (
                              <div className="mt-1 flex items-center gap-2 justify-center text-[10px] text-neutral-700">
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input type="radio" name={`conflict-${originalIndex}`} value="keep" checked={conflictChoice === 'keep'} onChange={() => updateConflictChoice(originalIndex, 'keep')} className="w-3 h-3" />
                                  <span>إبقاء</span>
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input type="radio" name={`conflict-${originalIndex}`} value="replace" checked={conflictChoice === 'replace'} onChange={() => updateConflictChoice(originalIndex, 'replace')} className="w-3 h-3" />
                                  <span>استبدال</span>
                                </label>
                              </div>
                            )}
                          </td>
                          {columns.map((key, colIndex) => {
                            const value = row[key]
                            const isEmpty = isCellEmpty(value)
                            const cellErrors = getCellErrors(originalIndex, key)
                            const hasError = cellErrors.some((e) => e.severity === 'error')
                            const hasWarning = cellErrors.some((e) => e.severity === 'warning')
                            const isDateField = key.includes('تاريخ')

                            let cellClassName = `px-0.5 py-0.5 text-[11px] overflow-hidden `
                            if (hasError) cellClassName += 'bg-red-100 text-red-900 border-l-2 border-red-500 font-medium'
                            else if (hasWarning) cellClassName += 'bg-yellow-50 text-yellow-900 border-l-2 border-yellow-500'
                            else cellClassName += 'text-neutral-800'

                            const fullValue = value?.toString() || ''
                            let displayValue = isEmpty ? (importType === 'companies' ? 'فارغ' : 'غير موجود') : fullValue
                            let parsedDate: Date | null = null
                            let dateParseError: string | undefined = undefined

                            if (isDateField && !isEmpty && fullValue) {
                              const cleanedValue = fullValue.trim().replace(/^\.\.\.+/, '').replace(/\.\.\.+$/, '').trim()
                              let dateResult = parseDate(cleanedValue)
                              if (!dateResult.date && cleanedValue !== fullValue.trim()) dateResult = parseDate(fullValue.trim())
                              if (!dateResult.date) {
                                const fullyCleaned = fullValue.trim().replace(/\.\.\./g, '').trim()
                                if (fullyCleaned && fullyCleaned !== cleanedValue) dateResult = parseDate(fullyCleaned)
                              }
                              if (dateResult.date) {
                                parsedDate = dateResult.date
                                displayValue = formatDateDDMMMYYYY(dateResult.date)
                              } else {
                                dateParseError = dateResult.error
                                displayValue = fullValue.trim().replace(/^\.\.\.+/, '').replace(/\.\.\.+$/, '') || fullValue
                              }
                            }

                            if (displayValue && !isEmpty && !isDateField) {
                              let maxLength = 10
                              if (key === 'الحساب البنكي') maxLength = 10
                              else if (key === 'المشروع') maxLength = 12
                              else if (key === 'الملاحظات') maxLength = 10
                              else if (key === 'الاسم') maxLength = 15
                              else if (key === 'المهنة') maxLength = 12
                              else if (key === 'الجنسية') maxLength = 8
                              else if (key === 'رقم الإقامة') maxLength = 10
                              else if (key === 'رقم الجواز') maxLength = 11
                              else if (key === 'رقم الهاتف') maxLength = 10
                              else if (key === 'الرقم الموحد') maxLength = 10
                              if (displayValue.length > maxLength) displayValue = displayValue.substring(0, maxLength) + '...'
                            }

                            const errorMessages = cellErrors.map((e) => e.message).join(' • ')
                            let tooltipText = fullValue
                            if (isDateField && !isEmpty) {
                              if (parsedDate) tooltipText = `الأصل: ${fullValue}\nالمحلل: ${formatDateDDMMMYYYY(parsedDate)}`
                              else if (dateParseError) tooltipText = `القيمة: ${fullValue}\nخطأ: ${dateParseError}`
                            }
                            if (errorMessages) tooltipText = errorMessages + (tooltipText !== fullValue ? `\n${tooltipText}` : '')

                            const isEmptyWithNoError = isEmpty && !hasError

                            return (
                              <td
                                key={colIndex}
                                className={cellClassName}
                                title={tooltipText}
                                style={
                                  isDateField
                                    ? { minWidth: 'fit-content', width: 'auto', whiteSpace: 'nowrap', overflow: 'visible', textOverflow: 'clip', textAlign: 'left', direction: 'ltr' }
                                    : { maxWidth: '100%', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                                }
                              >
                                <div className={`flex items-center gap-0.5 ${isDateField ? 'overflow-visible justify-start' : 'overflow-hidden'}`}>
                                  {hasError && <XCircle className="w-2.5 h-2.5 text-red-600 flex-shrink-0" />}
                                  {hasWarning && !hasError && <AlertCircle className="w-2.5 h-2.5 text-yellow-600 flex-shrink-0" />}
                                  <span
                                    className={`${isDateField ? 'whitespace-nowrap overflow-visible' : 'truncate'} ${hasError ? 'font-semibold' : isEmptyWithNoError ? 'font-bold text-red-600' : ''}`}
                                    style={isDateField ? { overflow: 'visible', textOverflow: 'clip', direction: 'ltr', textAlign: 'left' } : {}}
                                    title={tooltipText}
                                  >
                                    {displayValue}
                                  </span>
                                </div>
                                {cellErrors.length > 0 && (
                                  <div className="mt-0.5 text-[9px] opacity-75 leading-tight truncate" title={errorMessages}>
                                    {errorMessages.length > 15 ? errorMessages.substring(0, 15) + '...' : errorMessages}
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
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
                  <button onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={safeCurrentPage === 1} className="px-4 py-2 text-sm border-2 border-neutral-300 rounded-lg hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors disabled:border-neutral-200">
                    ← السابق
                  </button>
                  <span className="px-4 py-2 text-sm text-neutral-800 font-semibold bg-white border-2 border-neutral-300 rounded-lg">
                    {safeCurrentPage} / {totalPages}
                  </span>
                  <button onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={safeCurrentPage === totalPages} className="px-4 py-2 text-sm border-2 border-neutral-300 rounded-lg hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors disabled:border-neutral-200">
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
                <label htmlFor="delete-before-import-modal" className="flex-1 cursor-pointer">
                  <span className="font-medium text-neutral-900">حذف البيانات الموجودة قبل الاستيراد</span>
                  <p className="text-xs text-neutral-600 mt-1">سيتم حذف البيانات الموجودة في النظام قبل إضافة البيانات المستوردة</p>
                </label>
              </div>
              {shouldDeleteBeforeImport && (
                <div className="ml-7 space-y-2">
                  <div className="flex items-center gap-3">
                    <input type="radio" id="delete-all-modal" name="delete-mode-modal" value="all" checked={deleteMode === 'all'} onChange={(e) => setDeleteMode(e.target.value as 'all' | 'matching')} className="w-4 h-4 cursor-pointer" />
                    <label htmlFor="delete-all-modal" className="cursor-pointer text-sm text-neutral-700">
                      حذف جميع البيانات ({importType === 'companies' ? 'جميع المؤسسات' : 'جميع الموظفين'})
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="radio" id="delete-matching-modal" name="delete-mode-modal" value="matching" checked={deleteMode === 'matching'} onChange={(e) => setDeleteMode(e.target.value as 'all' | 'matching')} className="w-4 h-4 cursor-pointer" />
                    <label htmlFor="delete-matching-modal" className="cursor-pointer text-sm text-neutral-700">
                      حذف البيانات المطابقة فقط ({importType === 'companies' ? 'المؤسسات بنفس الرقم الموحد' : 'الموظفين بنفس رقم الإقامة'})
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
                  const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف'
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

          {/* Import Button + Progress */}
          <div className={`flex flex-col items-center gap-4 border-2 rounded-xl p-6 shadow-lg ${errorCount === 0 ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
            {blockingErrorCount > 0 ? (
              <div className="flex flex-col items-center gap-2 mb-2 text-center">
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="w-5 h-5" />
                  <span className="font-bold text-base">لا يمكن الاستيراد</span>
                </div>
                <p className="text-sm text-red-700">
                  يوجد {blockingErrorCount} صف به أخطاء مانعة ضمن نطاق الاستيراد الحالي. يمكنك إلغاء تحديد
                  الصفوف الخاطئة أو إصلاحها قبل المتابعة. التحذيرات لا تمنع الاستيراد.
                </p>
              </div>
            ) : (
              <div className="text-base text-neutral-700 font-medium text-center">
                {selectedRows.size > 0 ? (
                  <>سيتم استيراد{' '}<span className="font-bold text-success-700">{selectedRows.size}</span>{' '}صف محدد (التحذيرات ستُستورد)</>
                ) : (
                  <>سيتم استيراد جميع الصفوف (<span className="font-bold text-success-700">{previewData.length}</span>{' '}صف) (التحذيرات ستُستورد)</>
                )}
              </div>
            )}

            {/* Delete Progress */}
            {isDeleting && (
              <div className="w-full mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                    <span className="text-sm font-semibold text-red-900">جاري الحذف...</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {deleteProgress.total > 0 && (
                      <span className="text-sm font-bold text-red-700">{deleteProgress.current} / {deleteProgress.total}</span>
                    )}
                  </div>
                </div>
                {deleteProgress.total > 0 ? (
                  <>
                    <div className="bg-neutral-200 rounded-full h-6 overflow-hidden shadow-inner mb-2">
                      <div
                        className="h-full rounded-full transition-all duration-300 ease-out flex items-center justify-center relative bg-gradient-to-r from-red-500 via-red-600 to-orange-500"
                        style={{ width: `${Math.min((deleteProgress.current / deleteProgress.total) * 100, 100)}%` }}
                      >
                        {deleteProgress.current > 0 && (
                          <span className="text-xs font-bold text-white px-2 z-10">
                            {Math.round((deleteProgress.current / deleteProgress.total) * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-center text-sm text-neutral-700">
                      جارٍ حذف <span className="font-bold text-red-700">{deleteProgress.current}</span>{' '}
                      من <span className="font-bold text-red-700">{deleteProgress.total}</span>{' '}
                      {importType === 'employees' ? 'موظف' : 'مؤسسة'}...
                    </div>
                  </>
                ) : (
                  <div className="text-center text-sm text-neutral-600">جاري تحضير عملية الحذف...</div>
                )}
              </div>
            )}

            {/* Import Progress */}
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
                      <span className="text-sm font-bold text-blue-700">{importProgress.current} / {importProgress.total}</span>
                    )}
                    {!isImportCancelled && (
                      <button onClick={cancelImport} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors flex items-center gap-2">
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
                        className={`h-full rounded-full transition-all duration-300 ease-out flex items-center justify-center relative ${isImportCancelled ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-blue-500 via-blue-600 to-emerald-500'}`}
                        style={{ width: `${Math.min((importProgress.current / importProgress.total) * 100, 100)}%` }}
                      >
                        {importProgress.current > 0 && (
                          <span className="text-xs font-bold text-white px-2 z-10">
                            {Math.round((importProgress.current / importProgress.total) * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-center text-sm text-neutral-700">
                      {isImportCancelled ? (
                        <span className="text-red-700 font-semibold">جاري إلغاء الاستيراد وحذف السجلات المضافة...</span>
                      ) : (
                        <>
                          جارٍ استيراد <span className="font-bold text-blue-700">{importProgress.current}</span>{' '}
                          من <span className="font-bold text-blue-700">{importProgress.total}</span>{' '}
                          {importType === 'employees' ? 'موظف' : 'مؤسسة'}...
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center text-sm text-neutral-600">
                    {isImportCancelled ? 'جاري إلغاء الاستيراد...' : 'جاري تحضير البيانات للاستيراد...'}
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
                <><span className="animate-spin">🗑️</span><span>جاري الحذف...</span></>
              ) : importing ? (
                <><span className="animate-spin">⏳</span><span>جارٍ الاستيراد...</span></>
              ) : (
                <span>استيراد البيانات</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
