import { AlertCircle } from 'lucide-react'
import { Employee, Company } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'

export function BulkDeleteModal({
  selectedCount,
  selectedEmployees,
  onConfirm,
  onCancel,
  isDeleting = false,
}: {
  selectedCount: number
  selectedEmployees: (Employee & { company: Company })[]
  onConfirm: () => void
  onCancel: () => void
  isDeleting?: boolean
}) {
  const handleConfirm = () => {
    if (!isDeleting) {
      onConfirm()
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
        className="bg-surface rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900">تأكيد حذف الموظفين</h3>
              <p className="text-sm text-neutral-600">هذا الإجراء لا يمكن التراجع عنه</p>
            </div>
          </div>
          <p className="text-neutral-700 mb-4">
            هل أنت متأكد من حذف <strong>{selectedCount} موظف</strong>؟
            <br />
            <span className="text-sm text-red-600 mt-2 block">
              سيتم حذف جميع بيانات هؤلاء الموظفين نهائياً
            </span>
          </p>
          {isDeleting && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-info-700">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium">جاري حذف الموظفين، يرجى الانتظار...</span>
              </div>
            </div>
          )}
          <div className="max-h-60 overflow-y-auto border border-neutral-200 rounded-lg p-4 mb-4">
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
          <div className="flex gap-3">
            <Button
              onClick={handleConfirm}
              disabled={isDeleting}
              className="flex-1"
              variant="destructive"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  جاري الحذف...
                </>
              ) : (
                `نعم، احذف (${selectedCount})`
              )}
            </Button>
            <Button
              onClick={handleCancel}
              disabled={isDeleting}
              className="flex-1"
              variant="secondary"
            >
              إلغاء
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
