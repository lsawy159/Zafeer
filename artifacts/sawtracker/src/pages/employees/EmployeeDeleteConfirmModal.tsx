import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface EmployeeDeleteConfirmModalProps {
  employeeName: string | undefined
  onConfirm: () => void
  onCancel: () => void
}

export function EmployeeDeleteConfirmModal({
  employeeName,
  onConfirm,
  onCancel,
}: EmployeeDeleteConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-surface rounded-xl shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900">تأكيد حذف الموظف</h3>
              <p className="text-sm text-neutral-600">هذا الإجراء لا يمكن التراجع عنه</p>
            </div>
          </div>
          <p className="text-neutral-700 mb-6">
            هل أنت متأكد من حذف الموظف "<strong>{employeeName}</strong>"؟
            <br />
            <span className="text-sm text-red-600 mt-2 block">
              سيتم حذف جميع بيانات هذا الموظف نهائياً
            </span>
          </p>
          <div className="flex gap-3">
            <Button onClick={onConfirm} className="flex-1" variant="destructive">
              نعم، احذف
            </Button>
            <Button onClick={onCancel} className="flex-1" variant="secondary">
              إلغاء
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
