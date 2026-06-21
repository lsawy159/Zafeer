import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** نمط الخطر للعمليات المدمّرة (حذف...) — زر أحمر */
  danger?: boolean
  loading?: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

/**
 * نافذة تأكيد داخلية موحّدة لكل النظام.
 * تستبدل window.confirm — كل رسائل التأكيد يجب أن تكون داخل النظام (RTL، عربي، تصميم موحّد).
 * تُعرض عبر portal بـ z-[220] لتظهر فوق أي modal آخر.
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null

  const modal = (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={loading ? undefined : onCancel}
    >
      <div className="app-modal-surface max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-full ${danger ? 'bg-red-100' : 'bg-violet-100'}`}>
              <AlertTriangle className={`w-6 h-6 ${danger ? 'text-red-600' : 'text-violet-600'}`} />
            </div>
            <h3 className="text-xl font-bold text-neutral-900">{title}</h3>
          </div>

          <p className="text-neutral-700 mb-6">{message}</p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="app-button-secondary flex-1 justify-center"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`${danger ? 'app-button-danger' : 'app-button-primary'} flex-1 justify-center`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
