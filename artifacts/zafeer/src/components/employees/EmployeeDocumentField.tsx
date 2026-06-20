import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FileText, ImagePlus, Loader2, Trash2, CheckCircle2 } from 'lucide-react'
import { validateEmployeeDocFile, type EmployeeDocMeta } from '@/lib/employeeDocFile'
import { useDeleteEmployeeDoc, useUploadEmployeeDoc } from '@/hooks/useEmployeeDocFile'

interface Props {
  meta: EmployeeDocMeta
  employeeId: string
  currentPath: string | null | undefined
  disabled?: boolean
  isDeleted?: boolean
  onPathChange?: (newPath: string | null) => void   // وضع فوري
  onFileReady?: (file: File) => void                 // وضع مؤجّل (بدون thumbnail)
  hasPendingFile?: boolean
}

export function EmployeeDocumentField({
  meta,
  employeeId,
  currentPath,
  disabled = false,
  isDeleted = false,
  onPathChange,
  onFileReady,
  hasPendingFile = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const upload = useUploadEmployeeDoc(meta)
  const deleteFile = useDeleteEmployeeDoc(meta)

  const isPending = upload.isPending || deleteFile.isPending
  const isDisabled = disabled || isDeleted || isPending

  function processFile(file: File) {
    setValidationError(null)
    const result = validateEmployeeDocFile(file)
    if (!result.ok) {
      setValidationError(result.messageAr)
      return
    }

    if (onFileReady) {
      // وضع مؤجّل: لا رفع الآن — PDF وصورة كلاهما يُمرَّران مباشرة بدون اقتصاص
      onFileReady(file)
    } else {
      upload.mutate(
        { employeeId, file, oldPath: currentPath ?? undefined },
        { onSuccess: (newPath) => onPathChange?.(newPath) },
      )
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    processFile(file)
    e.target.value = ''
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (isDisabled) return
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    if (isDisabled) return
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
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

  const dropZoneLabel = isPending
    ? 'جاري الرفع...'
    : hasPendingFile
      ? 'ملف جديد جاهز — سيُرفع عند الحفظ'
      : isDragOver
        ? 'أفلت الملف هنا'
        : currentPath || hasPendingFile
          ? 'اسحب ملفاً للاستبدال أو انقر هنا'
          : 'اسحب الملف هنا أو انقر للاختيار'

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        ملف {meta.labelAr}
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
        <div className="space-y-2">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isDisabled && fileInputRef.current?.click()}
            className={[
              'relative flex flex-col items-center justify-center gap-2',
              'rounded-xl border-2 border-dashed py-6 px-4 text-center',
              'transition-all duration-150 select-none',
              isDisabled
                ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50'
                : hasPendingFile
                  ? 'border-green-400 bg-green-50 cursor-pointer'
                  : isDragOver
                    ? 'border-blue-400 bg-blue-50 cursor-copy scale-[1.01]'
                    : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-white cursor-pointer',
            ].join(' ')}
          >
            {isPending ? (
              <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
            ) : hasPendingFile ? (
              <CheckCircle2 className="w-7 h-7 text-green-500" />
            ) : (
              <ImagePlus className={`w-7 h-7 ${isDragOver ? 'text-blue-500' : 'text-slate-350'}`} />
            )}

            <div className="pointer-events-none">
              <p className={`text-sm font-medium ${hasPendingFile ? 'text-green-700' : 'text-slate-700'}`}>
                {dropZoneLabel}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                JPG · PNG · WebP · PDF — حد أقصى 500 KB
              </p>
            </div>
          </div>

          {/* Delete button — only when there's a saved file (not pending) */}
          {currentPath && !isPending && !hasPendingFile && (
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

      {validationError && (
        <p className="mt-1.5 text-xs text-red-600">{validationError}</p>
      )}

      {/* Delete confirm dialog */}
      {showDeleteConfirm && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-neutral-900 mb-2">حذف ملف {meta.labelAr}</h3>
            <p className="text-sm text-neutral-600 mb-4">
              هل أنت متأكد من حذف ملف {meta.labelAr}؟ لا يمكن التراجع عن هذا الإجراء.
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
        </div>,
        document.body,
      )}
    </div>
  )
}
