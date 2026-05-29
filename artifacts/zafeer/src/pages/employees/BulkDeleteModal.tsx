import { useState } from 'react'
import { AlertCircle, FileText, Lock, Trash2 } from 'lucide-react'
import { Employee, Company } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { type BulkDeletePreviewData, type ObligationDeleteChoice } from '../Employees'

function getObligationTypeLabel(type: string): string {
  switch (type) {
    case 'advance': return 'سلفة'
    case 'transfer': return 'نقل كفالة'
    case 'renewal': return 'تجديد'
    case 'penalty': return 'غرامة'
    default: return 'التزام آخر'
  }
}

function formatAmount(amount: number, currency: string): string {
  return `${Number(amount).toLocaleString('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency || 'ريال'}`
}

export function BulkDeleteModal({
  selectedCount,
  selectedEmployees,
  preview,
  loadingPreview,
  onConfirm,
  onCancel,
  isDeleting = false,
}: {
  selectedCount: number
  selectedEmployees: (Employee & { company: Company })[]
  preview: BulkDeletePreviewData | null
  loadingPreview: boolean
  onConfirm: (choice: ObligationDeleteChoice) => void
  onCancel: () => void
  isDeleting?: boolean
}) {
  const [choice, setChoice] = useState<ObligationDeleteChoice>('keep')

  const obligationHeaders = preview?.obligationHeaders ?? []
  const hasObligations = obligationHeaders.length > 0
  const hasKeptRecords = (preview?.totalPayrollEntries ?? 0) > 0 || (preview?.totalExtractLines ?? 0) > 0

  const handleConfirm = () => {
    if (!isDeleting && !loadingPreview) {
      onConfirm(choice)
    }
  }

  const handleCancel = () => {
    if (!isDeleting) {
      onCancel()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
      onClick={handleCancel}
    >
      <div
        className="bg-surface rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-3 rounded-lg flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900">تأكيد حذف {selectedCount} موظفين</h3>
              <p className="text-sm text-neutral-600">هذا الإجراء لا يمكن التراجع عنه</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {loadingPreview ? (
            <div className="flex items-center justify-center py-8 gap-3 text-neutral-500">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-neutral-400" />
              <span className="text-sm">جاري فحص السجلات المرتبطة...</span>
            </div>
          ) : (
            <>
              {/* قسم "سيتم الاحتفاظ بها" */}
              {hasKeptRecords && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-800">سيتم الاحتفاظ بها تلقائياً</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {(preview?.totalPayrollEntries ?? 0) > 0 && (
                      <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-green-200">
                        <span className="text-lg font-bold text-green-700">{preview!.totalPayrollEntries.toLocaleString('ar-SA')}</span>
                        <span className="text-sm text-green-700">مسيرة راتب</span>
                      </div>
                    )}
                    {(preview?.totalExtractLines ?? 0) > 0 && (
                      <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-green-200">
                        <span className="text-lg font-bold text-green-700">{preview!.totalExtractLines.toLocaleString('ar-SA')}</span>
                        <span className="text-sm text-green-700">مستخلص</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* قسم الالتزامات */}
              {hasObligations && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <span className="text-sm font-semibold text-amber-800">
                    الالتزامات ({obligationHeaders.length})
                  </span>

                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-3 cursor-pointer bg-white rounded-lg px-3 py-2.5 border border-amber-200 hover:bg-amber-50/50 transition-colors">
                      <input
                        type="radio"
                        name="bulk-obligation-choice"
                        value="keep"
                        checked={choice === 'keep'}
                        onChange={() => setChoice('keep')}
                        className="h-4 w-4 text-amber-600"
                      />
                      <div>
                        <span className="text-sm font-medium text-neutral-800">إبقاء الالتزامات</span>
                        <p className="text-xs text-neutral-500">تبقى مرئية في قائمة الالتزامات مع تمييز الموظفين كمغادرين</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer bg-white rounded-lg px-3 py-2.5 border border-red-200 hover:bg-red-50/50 transition-colors">
                      <input
                        type="radio"
                        name="bulk-obligation-choice"
                        value="delete"
                        checked={choice === 'delete'}
                        onChange={() => setChoice('delete')}
                        className="h-4 w-4 text-red-600"
                      />
                      <div>
                        <span className="text-sm font-medium text-red-700">حذف الالتزامات</span>
                        <p className="text-xs text-neutral-500">لا يمكن التراجع عن هذا الإجراء</p>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {obligationHeaders.slice(0, 15).map((obl) => (
                      <div key={obl.id} className="flex items-center gap-2 px-3 py-1.5 rounded bg-white border border-neutral-200">
                        <FileText className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                        <span className="text-xs text-neutral-700 truncate flex-1">
                          {obl.title || getObligationTypeLabel(obl.obligation_type)} — {formatAmount(obl.total_amount, obl.currency_code)}
                        </span>
                      </div>
                    ))}
                    {obligationHeaders.length > 15 && (
                      <p className="text-xs text-neutral-500 text-center pt-1">
                        +{obligationHeaders.length - 15} التزام إضافي
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* قائمة الموظفين المحددين */}
          <div className="max-h-44 overflow-y-auto border border-neutral-200 rounded-lg p-3">
            <p className="text-sm font-medium text-neutral-700 mb-2">الموظفون المحددون:</p>
            <ul className="space-y-1">
              {selectedEmployees.slice(0, 50).map((emp) => (
                <li key={emp.id} className="text-sm text-neutral-600">
                  • {emp.name} {emp.company?.name && `(${emp.company.name})`}
                </li>
              ))}
              {selectedEmployees.length > 50 && (
                <li className="text-sm text-neutral-500 italic">
                  ... و {selectedEmployees.length - 50} موظف آخر
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
            ⚠️ هذا الإجراء لا يمكن التراجع عنه. سيتم حذف {selectedCount} موظفين نهائياً.
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-200 flex gap-3 flex-shrink-0">
          <Button
            onClick={handleConfirm}
            disabled={isDeleting || loadingPreview}
            className="flex-1"
            variant="destructive"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                جاري الحذف...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                تأكيد الحذف ({selectedCount})
              </>
            )}
          </Button>
          <Button onClick={handleCancel} disabled={isDeleting} className="flex-1" variant="secondary">
            إلغاء
          </Button>
        </div>
      </div>
    </div>
  )
}
