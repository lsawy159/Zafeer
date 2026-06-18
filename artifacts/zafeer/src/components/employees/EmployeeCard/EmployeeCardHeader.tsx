import { CreditCard, FileText, History, RotateCcw, X } from 'lucide-react'
import { Employee, Company } from '@/lib/supabase'

interface EmployeeCardHeaderProps {
  employee: Employee & { company: Company }
  isEditMode: boolean
  canEdit: (resource: string) => boolean
  onClose: () => void
  onEdit: () => void
  onCancel: () => void
  onHistoryOpen: () => void
  onFinancialOpen: () => void
}

export function EmployeeCardHeader({
  employee,
  isEditMode,
  canEdit,
  onClose,
  onEdit,
  onCancel,
  onHistoryOpen,
  onFinancialOpen,
}: EmployeeCardHeaderProps) {
  return (
    <div
      className={`sticky top-0 z-30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b p-6 backdrop-blur-md ${
        isEditMode
          ? 'border-warning-200 bg-warning-50 text-warning-900'
          : 'border-neutral-200 bg-white/95 text-neutral-900'
      }`}
    >
      <div className="min-w-0 sm:flex-1">
        <h2 className="text-2xl font-bold line-clamp-2 break-words">{employee.name}</h2>
        <p className={`mt-1 ${isEditMode ? 'text-warning-700' : 'text-neutral-600'}`}>
          {employee.profession} - {employee?.company?.name ?? 'غير محدد'}
        </p>
        {isEditMode && (
          <p className="text-sm mt-1 text-warning-700">
            وضع التعديل نشط - يمكنك تعديل البيانات أدناه
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
        {!isEditMode && (
          <>
            <button
              type="button"
              onClick={onHistoryOpen}
              className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-100 hover:border-violet-300"
            >
              <History className="w-4 h-4" />
              سجل المشاريع
            </button>
            <button
              type="button"
              onClick={onFinancialOpen}
              className="flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-100 hover:border-primary-300"
            >
              <CreditCard className="w-4 h-4" />
              الالتزامات المالية
            </button>
          </>
        )}
        {isEditMode ? (
          <button
            onClick={onCancel}
            className="flex items-center gap-2 rounded-xl border border-warning-200 bg-white px-4 py-2 font-medium text-warning-900 transition hover:bg-warning-100"
          >
            <RotateCcw className="w-4 h-4" />
            إلغاء التعديل
          </button>
        ) : (
          canEdit('employees') && (
            <button
              onClick={onEdit}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 font-medium text-neutral-800 transition hover:bg-neutral-50"
            >
              <FileText className="w-4 h-4" />
              تعديل
            </button>
          )
        )}
        <button onClick={onClose} className="rounded-xl p-2 transition hover:bg-black/5">
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}
