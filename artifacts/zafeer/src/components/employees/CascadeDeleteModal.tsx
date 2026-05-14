import { AlertTriangle, Trash2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface ObligationHeaderInfo {
  id: string
  employee_id: string
  obligation_type: string
  title: string
  total_amount: number
  currency_code: string
  status: string
}

interface EmployeeInfo {
  id: string
  name: string
  company?: string
}

interface CascadeDeleteModalProps {
  open: boolean
  isBulk: boolean
  employees: EmployeeInfo[]
  obligations: ObligationHeaderInfo[]
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}

function getObligationTypeLabel(type: string): string {
  switch (type) {
    case 'advance':
      return 'سلفة'
    case 'transfer':
      return 'نقل كفالة'
    case 'renewal':
      return 'تجديد'
    case 'penalty':
      return 'غرامة'
    case 'other':
    default:
      return 'التزام آخر'
  }
}

function getStatusLabel(status: string): { label: string; className: string } {
  switch (status) {
    case 'active':
      return { label: 'نشط', className: 'bg-green-100 text-success-700' }
    case 'draft':
      return { label: 'مسودة', className: 'bg-gray-100 text-neutral-600' }
    case 'cancelled':
      return { label: 'ملغى', className: 'bg-red-100 text-red-700' }
    case 'completed':
      return { label: 'مكتمل', className: 'bg-blue-100 text-info-700' }
    default:
      return { label: status, className: 'bg-gray-100 text-neutral-600' }
  }
}

function formatAmount(amount: number, currency: string): string {
  return `${Number(amount).toLocaleString('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency || 'ريال'}`
}

export default function CascadeDeleteModal({
  open,
  isBulk,
  employees,
  obligations,
  loading,
  onConfirm,
  onCancel,
}: CascadeDeleteModalProps) {
  if (!open) return null

  const employeeMap = new Map(employees.map((e) => [e.id, e]))

  const obligationsByEmployee = new Map<string, ObligationHeaderInfo[]>()
  for (const obl of obligations) {
    const existing = obligationsByEmployee.get(obl.employee_id) ?? []
    existing.push(obl)
    obligationsByEmployee.set(obl.employee_id, existing)
  }

  const employeesWithObligs = employees.filter((e) => obligationsByEmployee.has(e.id))
  const employeesWithoutObligs = employees.filter((e) => !obligationsByEmployee.has(e.id))
  const totalObligations = obligations.length

  return (
    <div
      className="fixed inset-0 z-[110] overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-[2px]"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="bg-surface rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-neutral-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-3 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900">
                تنبيه: يوجد سجلات مرتبطة
              </h3>
              <p className="text-sm text-neutral-500">
                {isBulk
                  ? `${employeesWithObligs.length} موظف لديهم ${totalObligations} التزام مرتبط`
                  : `الموظف لديه ${totalObligations} التزام مرتبط`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          <p className="text-sm text-neutral-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            لإتمام الحذف، يجب حذف الالتزامات المرتبطة أولاً. هل تريد حذف الموظف
            {isBulk ? 'ين' : ''} مع جميع السجلات التالية؟
          </p>

          <div className="space-y-3">
            {employeesWithObligs.map((emp) => {
              const empObligs = obligationsByEmployee.get(emp.id) ?? []
              return (
                <div key={emp.id} className="border border-neutral-200 rounded-lg overflow-hidden">
                  <div className="bg-neutral-50 px-4 py-2 flex items-center gap-2 border-b border-neutral-200">
                    <div className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0" />
                    <span className="font-semibold text-sm text-neutral-800">{emp.name}</span>
                    {emp.company && (
                      <span className="text-xs text-neutral-500">({emp.company})</span>
                    )}
                    <span className="mr-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                      {empObligs.length} التزام
                    </span>
                  </div>
                  <ul className="divide-y divide-neutral-100">
                    {empObligs.map((obl) => {
                      const statusInfo = getStatusLabel(obl.status)
                      return (
                        <li key={obl.id} className="px-4 py-2.5 flex items-center gap-3">
                          <FileText className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-800 truncate">
                              {obl.title || getObligationTypeLabel(obl.obligation_type)}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {getObligationTypeLabel(obl.obligation_type)} •{' '}
                              {formatAmount(obl.total_amount, obl.currency_code)}
                            </p>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusInfo.className}`}
                          >
                            {statusInfo.label}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>

          {isBulk && employeesWithoutObligs.length > 0 && (
            <div className="border border-neutral-200 rounded-lg p-3">
              <p className="text-xs font-medium text-neutral-600 mb-1">
                موظفون بدون التزامات (سيتم حذفهم مباشرة):
              </p>
              <div className="flex flex-wrap gap-1">
                {employeesWithoutObligs.slice(0, 20).map((emp) => (
                  <span
                    key={emp.id}
                    className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full"
                  >
                    {emp.name}
                  </span>
                ))}
                {employeesWithoutObligs.length > 20 && (
                  <span className="text-xs text-neutral-500">
                    +{employeesWithoutObligs.length - 20} آخرين
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 font-medium">
            ⚠️ هذا الإجراء لا يمكن التراجع عنه. سيتم حذف الموظف
            {isBulk ? 'ين' : ''} وجميع الالتزامات المرتبطة نهائياً.
          </div>
        </div>

        <div className="p-6 border-t border-neutral-200 flex gap-3 flex-shrink-0">
          <Button
            onClick={onConfirm}
            disabled={loading}
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
                حذف {isBulk ? 'الموظفين' : 'الموظف'} والسجلات المرتبطة
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
