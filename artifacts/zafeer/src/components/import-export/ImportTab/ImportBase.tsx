import { CheckCircle, FileUp, XCircle } from 'lucide-react'
import { ImportDropZone } from './ImportDropZone'
import { ImportValidationPanel } from './ImportValidationPanel'
import ImportPreviewModal from './ImportPreviewModal'
import { useImportBase } from './useImportBase'

interface ImportBaseProps {
  initialImportType?: 'employees' | 'companies'
  onImportSuccess?: () => void
  isInModal?: boolean
  hideTypeSelector?: boolean
}

export function ImportBase(props: ImportBaseProps = {}) {
  const ctx = useImportBase(props)
  const {
    file,
    validating,
    validationResults,
    importResult,
    importType, setImportType,
    setCurrentPage,
    columnValidationError,
    setSelectedRows,
    setShouldDeleteBeforeImport,
    activeScopeIndices, blockingErrorCount, warningRowCountInScope, errorRowCount,
    isInModal, hideTypeSelector,
    handleFileChange, handleDrop, handleDragOver, handleCancel,
    validateData,
  } = ctx

  return (
    <div className="space-y-6">
      <ImportDropZone
        importType={importType}
        setImportType={setImportType}
        setCurrentPage={setCurrentPage}
        setSelectedRows={setSelectedRows}
        setShouldDeleteBeforeImport={setShouldDeleteBeforeImport}
        handleFileChange={handleFileChange}
        handleDrop={handleDrop}
        handleDragOver={handleDragOver}
        isInModal={isInModal}
        hideTypeSelector={hideTypeSelector}
      />

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
                  <><span className="animate-spin text-xs">⏳</span><span>جارٍ التحقق...</span></>
                ) : (
                  <><CheckCircle className="w-4 h-4" /><span>التحقق من البيانات</span></>
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

      <ImportValidationPanel
        validationResults={validationResults}
        columnValidationError={columnValidationError}
        importType={importType}
        activeScopeIndices={activeScopeIndices}
        blockingErrorCount={blockingErrorCount}
        warningRowCountInScope={warningRowCountInScope}
        errorRowCount={errorRowCount}
      />

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

      <ImportPreviewModal {...ctx} />
    </div>
  )
}
