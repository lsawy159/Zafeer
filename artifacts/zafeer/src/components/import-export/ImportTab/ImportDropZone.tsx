import { AlertCircle, FileUp, Upload, XCircle } from 'lucide-react'
import type { useImportBase } from './useImportBase'

type Ctx = ReturnType<typeof useImportBase>

interface Props {
  importType: Ctx['importType']
  setImportType: Ctx['setImportType']
  setCurrentPage: Ctx['setCurrentPage']
  setSelectedRows: Ctx['setSelectedRows']
  setShouldDeleteBeforeImport: Ctx['setShouldDeleteBeforeImport']
  handleFileChange: Ctx['handleFileChange']
  handleDrop: Ctx['handleDrop']
  handleDragOver: Ctx['handleDragOver']
  isInModal: Ctx['isInModal']
  hideTypeSelector: Ctx['hideTypeSelector']
}

export function ImportDropZone({
  importType, setImportType, setCurrentPage, setSelectedRows, setShouldDeleteBeforeImport,
  handleFileChange, handleDrop, handleDragOver, isInModal, hideTypeSelector,
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left: Import Type + File Upload */}
      <div className="space-y-4">
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
          <label htmlFor="file-upload" className="app-button-primary cursor-pointer px-4 py-2 text-sm">
            <FileUp className="w-4 h-4" />
            اختيار ملف Excel
          </label>
        </div>
      </div>

      {/* Right: Color Legend */}
      <div className="border-2 border-neutral-300 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-3 py-2 border-b border-neutral-200">
          <h5 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
            <span>🎨</span>
            دلالة الألوان في الجدول:
          </h5>
        </div>
        <div className="px-3 py-3 bg-white">
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-start gap-2 p-2 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-red-800 mb-0.5 text-xs">خلفية حمراء - خطأ</div>
                <p className="text-[10px] text-red-700 leading-tight">
                  حقول مطلوبة أو غير صحيحة. يجب إصلاحها قبل الاستيراد.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-yellow-800 mb-0.5 text-xs">خلفية صفراء - تحذير</div>
                <p className="text-[10px] text-yellow-700 leading-tight">
                  بيانات قد تحتاج مراجعة. لا تمنع الاستيراد.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-white border-l-4 border-neutral-300 rounded-lg">
              <div className="w-4 h-4 flex-shrink-0 mt-0.5 flex items-center justify-center">
                <span className="text-red-600 font-bold text-xs">!</span>
              </div>
              <div className="flex-1">
                <div className="font-bold text-neutral-800 mb-0.5 text-xs">حقل فارغ</div>
                <p className="text-[10px] text-neutral-700 leading-tight">
                  يظهر النص "<span className="font-bold text-red-600">غير موجود</span>" بخط أحمر Bold بدون خلفية.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
