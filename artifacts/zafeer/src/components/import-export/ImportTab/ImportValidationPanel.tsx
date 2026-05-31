import { AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { EMPLOYEE_COLUMNS_ORDER, COMPANY_COLUMNS_ORDER } from './importTypes'
import type { useImportBase } from './useImportBase'

type Ctx = ReturnType<typeof useImportBase>

interface Props {
  validationResults: Ctx['validationResults']
  columnValidationError: Ctx['columnValidationError']
  importType: Ctx['importType']
  activeScopeIndices: Ctx['activeScopeIndices']
  blockingErrorCount: Ctx['blockingErrorCount']
  warningRowCountInScope: Ctx['warningRowCountInScope']
  errorRowCount: Ctx['errorRowCount']
}

export function ImportValidationPanel({
  validationResults, columnValidationError, importType,
  activeScopeIndices, blockingErrorCount, warningRowCountInScope, errorRowCount,
}: Props) {
  return (
    <>
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
                  <strong className="font-semibold">نصيحة:</strong> يمكنك التمرير على أي خلية
                  ملونة لعرض تفاصيل الخطأ أو التحذير. التحذيرات ستُستورد، والصفوف ذات الأخطاء غير
                  المحددة سيتم تجاهلها. للتعارض مع بيانات النظام اختر إبقاء السجل الحالي أو استبداله.
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Column Validation Error */}
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
                <strong>يرجى تصحيح ملف Excel ليحتوي على الأعمدة المطلوبة فقط - بدون نقص أو زيادة.</strong>
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
                        <li key={index} className="text-red-800 font-medium">{col}</li>
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
                        <li key={index} className="text-warning-800 font-medium">{col}</li>
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
                  {importType === 'employees' ? EMPLOYEE_COLUMNS_ORDER.length : COMPANY_COLUMNS_ORDER.length}{' '}
                  عمود):
                </h5>
                <div className="bg-neutral-50 rounded p-4 border border-neutral-200">
                  <p className="text-xs text-neutral-600 mb-3 font-medium">
                    📋 يجب أن يحتوي ملف Excel على هذه الأعمدة فقط - بنفس الترتيب والأسماء:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {(importType === 'employees' ? EMPLOYEE_COLUMNS_ORDER : COMPANY_COLUMNS_ORDER).map(
                      (col, index) => (
                        <div key={index} className="flex items-center gap-2 bg-white p-2 rounded border border-neutral-200">
                          <span className="text-neutral-600 font-mono text-xs bg-neutral-100 px-2 py-1 rounded">
                            {index + 1}
                          </span>
                          <span className="text-neutral-800 font-medium text-sm">{col}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-xs text-blue-800 flex items-start gap-2">
                    <span className="text-base flex-shrink-0">💡</span>
                    <span>
                      <strong>نصيحة:</strong> افتح ملف Excel، احذف الأعمدة الإضافية، وتأكد من أن أسماء
                      الأعمدة تطابق القائمة أعلاه تماماً (بما في ذلك المسافات والرموز). يمكنك تحميل
                      القالب الصحيح من قسم "التصدير" لضمان التطابق.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
