import { useState } from 'react'
import { createPortal } from 'react-dom'
import { User, FileText, X, ZoomIn } from 'lucide-react'
import { isLegacyExternalUrl, residenceKindFromPath } from '@/lib/residenceFile'
import { useResidenceSignedUrl } from '@/hooks/useResidenceFile'

interface Props {
  /** المسار الكامل لملف الإقامة (للـ fallback إذا لم يوجد thumbnail) */
  path: string | null | undefined
  /** مسار الصورة المقتطعة كـ thumbnail للبروفايل */
  thumbnailPath?: string | null
  /** رابط preview محلي مؤقت (blob URL) يسبق الرفع في وضع التعديل */
  previewUrl?: string | null
}

export function ResidenceProfilePhoto({ path, thumbnailPath, previewUrl }: Props) {
  const [zoomOpen, setZoomOpen] = useState(false)

  // الأولوية: previewUrl (محلي) → thumbnailPath → path الأصلي
  const effectivePath = thumbnailPath || path

  const { data: signedUrl, isLoading } = useResidenceSignedUrl(
    !previewUrl ? effectivePath : null,
  )

  const displayUrl = previewUrl ?? signedUrl
  const kindPath = thumbnailPath || path
  const kind = kindPath && !isLegacyExternalUrl(kindPath)
    ? residenceKindFromPath(kindPath)
    : null

  if (!path && !thumbnailPath && !previewUrl) {
    return (
      <div className="w-[360px] h-36 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 flex-shrink-0">
        <User className="w-10 h-10 text-slate-300" />
      </div>
    )
  }

  if (!previewUrl && isLoading) {
    return (
      <div className="w-[360px] h-36 rounded-xl bg-slate-200 animate-pulse flex-shrink-0" />
    )
  }

  if (kind === 'pdf' || (kind === null && !previewUrl)) {
    return (
      <div className="w-[360px] h-36 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-1.5 flex-shrink-0">
        <FileText className="w-9 h-9 text-red-400" />
        <span className="text-xs text-slate-400">ملف PDF</span>
      </div>
    )
  }

  if (!displayUrl) return null

  return (
    <>
      <div
        className="relative w-[360px] h-36 rounded-xl overflow-hidden border-2 border-white shadow-md ring-1 ring-slate-200 flex-shrink-0 group cursor-zoom-in"
        onClick={() => setZoomOpen(true)}
      >
        <img
          src={displayUrl}
          alt="صورة الموظف من الإقامة"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <ZoomIn className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
        </div>
      </div>

      {zoomOpen && createPortal(
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85"
          onClick={() => setZoomOpen(false)}
        >
          <button
            type="button"
            className="absolute top-4 left-4 rounded-full bg-black/30 p-2 text-white hover:bg-black/50"
            onClick={() => setZoomOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={displayUrl}
            alt="صورة الموظف مكبّرة"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body,
      )}
    </>
  )
}
