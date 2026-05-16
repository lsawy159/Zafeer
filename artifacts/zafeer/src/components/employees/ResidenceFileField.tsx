import { useRef, useState } from 'react'
import { FileText, Loader2, Trash2, Upload } from 'lucide-react'
import { validateResidenceFile } from '@/lib/residenceFile'
import { useDeleteResidenceFile, useUploadResidenceFile } from '@/hooks/useResidenceFile'

interface Props {
  employeeId: string
  currentPath: string | null | undefined
  disabled?: boolean
  isDeleted?: boolean
  onPathChange?: (newPath: string | null) => void
}

export function ResidenceFileField({
  employeeId,
  currentPath,
  disabled = false,
  isDeleted = false,
  onPathChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const upload = useUploadResidenceFile()
  const deleteFile = useDeleteResidenceFile()

  const isPending = upload.isPending || deleteFile.isPending
  const isDisabled = disabled || isDeleted || isPending

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setValidationError(null)

    const result = validateResidenceFile(file)
    if (!result.ok) {
      setValidationError(result.messageAr)
      e.target.value = ''
      return
    }

    upload.mutate(
      { employeeId, file, oldPath: currentPath ?? undefined },
      {
        onSuccess: (newPath) => {
          onPathChange?.(newPath)
        },
      },
    )
    e.target.value = ''
  }

  async function handleDelete() {
    if (!currentPath) return
    deleteFile.mutate(
      { employeeId, path: currentPath },
      {
        onSuccess: () => {
          setShowDeleteConfirm(false)
          onPathChange?.(null)
        },
      },
    )
  }

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        ملف الإقامة
      </label>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileChange}
        disabled={isDisabled}
      />

      {isDeleted ? (
        <p className="text-sm text-slate-400">موظف محذوف — لا يمكن رفع ملف</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {/* زر الرفع / الاستبدال */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isDisabled}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {currentPath ? 'استبدال الملف' : 'إضافة ملف الإقامة'}
          </button>

          {/* زر الحذف */}
          {currentPath && !isPending && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDisabled}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              حذف الملف
            </button>
          )}
        </div>
      )}

      {/* رسالة خطأ التحقق */}
      {validationError && (
        <p className="mt-1.5 text-xs text-red-600">{validationError}</p>
      )}

      {/* نافذة تأكيد الحذف */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-neutral-900 mb-2">حذف ملف الإقامة</h3>
            <p className="text-sm text-neutral-600 mb-4">
              هل أنت متأكد من حذف ملف الإقامة؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteFile.isPending}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteFile.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteFile.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
