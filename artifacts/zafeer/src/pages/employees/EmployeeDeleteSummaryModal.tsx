import { useState } from 'react'
import { AlertTriangle, FileText, Lock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { type ObligationHeaderInfo } from '@/components/employees/CascadeDeleteModal'
import { type DeletePreviewData, type ObligationDeleteChoice, type BulkDeletePreviewData } from '../Employees'

interface EmployeeInfo {
  id: string
  name: string
  company?: string
}

interface SingleDeleteProps {
  isBulk: false
  employees: [EmployeeInfo]
  preview: DeletePreviewData | null
}

interface BulkDeleteProps {
  isBulk: true
  employees: EmployeeInfo[]
  preview: BulkDeletePreviewData | null
}

type EmployeeDeleteSummaryModalProps = (SingleDeleteProps | BulkDeleteProps) & {
  open: boolean
  loadingPreview: boolean
  loading: boolean
  onConfirm: (choice: ObligationDeleteChoice) => void
  onCancel: () => void
}

function getObligationTypeLabel(type: string): string {
  switch (type) {
    case 'advance': return 'سلفة'
    case 'transfer': return 'نقل كفالة'
    case 'renewal': return 'تجديد'
    case 'penalty': return 'غرامة'
    default: return 'التزام آخر'
  }
}

function getStatusLabel(status: string): { label: string; className: string } {
  switch (status) {
    case 'active': return { label: 'نشط', className: 'bg-green-100 text-green-700' }
    case 'draft': return { label: 'مسودة', className: 'bg-gray-100 text-neutral-600' }
    case 'cancelled': return { label: 'ملغى', className: 'bg-red-100 text-red-700' }
    case 'completed': return { label: 'مكتمل', className: 'bg-blue-100 text-blue-700' }
    default: return { label: status, className: 'bg-gray-100 text-neutral-600' }
  }
}

function formatAmount(amount: number, currency: string): string {
  return `${Number(amount).toLocaleString('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency || 'ريال'}`
}

function ObligationsList({ obligations }: { obligations: ObligationHeaderInfo[] }) {
  if (obligations.length === 0) return null
  return (
    <div className="space-y-1 max-h-52 overflow-y-auto">
      {obligations.map((obl) => {
        const statusInfo = getStatusLabel(obl.status)
        return (
          <div key={obl.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-200">
            <FileText className="w-4 h-4 text-neutral-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-800 truncate">
                {obl.title || getObligationTypeLabel(obl.obligation_type)}
              </p>
              <p className="text-xs text-neutral-500">
                {getObligationTypeLabel(obl.obligation_type)} • {formatAmount(obl.total_amount, obl.currency_code)}
              </p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function EmployeeDeleteSummaryModal(props: EmployeeDeleteSummaryModalProps) {
  const { open, loadingPreview, loading, onConfirm, onCancel } = props
  const [choice, setChoice] = useState<ObligationDeleteChoice>('keep')

  if (!open) return null

  const employeeName = props.employees[0]?.name
  const obligationHeaders: ObligationHeaderInfo[] = props.preview?.obligationHeaders ?? []
  const payrollCount = props.isBulk
    ? (props.preview as BulkDeletePreviewData | null)?.totalPayrollEntries ?? 0
    : (props.preview as DeletePreviewData | null)?.payrollEntryCount ?? 0
  const extractCount = props.isBulk
    ? (props.preview as BulkDeletePreviewData | null)?.totalExtractLines ?? 0
    : (props.preview as DeletePreviewData | null)?.extractLineCount ?? 0

  const hasKeptRecords = payrollCount > 0 || extractCount > 0
  const hasObligations = obligationHeaders.length > 0

  return (
    <div
      className="fixed inset-0 z-[200] overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-[2px]"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="bg-surface rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-3 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900">
                {props.isBulk
                  ? `تأكيد حذف ${props.employees.length} موظفين`
                  : `تأكيد حذف الموظف: ${employeeName}`}
              </h3>
              <p className="text-sm text-neutral-500">هذا الإجراء لا يمكن التراجع عنه</p>
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
                    {payrollCount > 0 && (
                      <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-green-200">
                        <span className="text-lg font-bold text-green-700">{payrollCount.toLocaleString('ar-SA')}</span>
                        <span className="text-sm text-green-700">مسيرة راتب</span>
                      </div>
                    )}
                    {extractCount > 0 && (
                      <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-green-200">
                        <span className="text-lg font-bold text-green-700">{extractCount.toLocaleString('ar-SA')}</span>
                        <span className="text-sm text-green-700">مستخلص</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* قسم الالتزامات */}
              {hasObligations && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-amber-800">
                      الالتزامات ({obligationHeaders.length})
                    </span>
                  </div>

                  {/* خيارات الالتزامات */}
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-3 cursor-pointer bg-white rounded-lg px-3 py-2.5 border border-amber-200 hover:bg-amber-50/50 transition-colors">
                      <input
                        type="radio"
                        name="obligation-choice"
                        value="keep"
                        checked={choice === 'keep'}
                        onChange={() => setChoice('keep')}
                        className="h-4 w-4 text-amber-600"
                      />
                      <div>
                        <span className="text-sm font-medium text-neutral-800">إبقاء الالتزامات</span>
                        <p className="text-xs text-neutral-500">تبقى مرئية في قائمة الالتزامات مع تمييز الموظف كمغادر</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer bg-white rounded-lg px-3 py-2.5 border border-red-200 hover:bg-red-50/50 transition-colors">
                      <input
                        type="radio"
                        name="obligation-choice"
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

                  <ObligationsList obligations={obligationHeaders.slice(0, 20)} />
                  {obligationHeaders.length > 20 && (
                    <p className="text-xs text-neutral-500 text-center">
                      +{obligationHeaders.length - 20} التزام إضافي
                    </p>
                  )}
                </div>
              )}

              {/* رسالة تأكيد للحالة البسيطة (لا التزامات ولا سجلات) */}
              {!hasKeptRecords && !hasObligations && (
                <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-4 text-sm text-neutral-700">
                  لا توجد سجلات مرتبطة بهذا الموظف. سيتم الحذف مباشرة.
                </div>
              )}

              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
                ⚠️ هذا الإجراء لا يمكن التراجع عنه. سيتم حذف {props.isBulk ? 'الموظفين المحددين' : 'الموظف'} نهائياً.
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-200 flex gap-3 flex-shrink-0">
          <Button
            onClick={() => onConfirm(choice)}
            disabled={loading || loadingPreview}
            variant="destructive"
            className="flex-1"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                جاري الحذف...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                تأكيد الحذف
              </>
            )}
          </Button>
          <Button onClick={onCancel} disabled={loading} variant="secondary" className="flex-1">
            إلغاء
          </Button>
        </div>
      </div>
    </div>
  )
}
