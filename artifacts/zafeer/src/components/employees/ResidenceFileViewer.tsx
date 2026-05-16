import { useState } from 'react'
import { FileText, ExternalLink, X } from 'lucide-react'
import { isLegacyExternalUrl, residenceKindFromPath } from '@/lib/residenceFile'
import { useResidenceSignedUrl } from '@/hooks/useResidenceFile'

interface Props {
  path: string | null | undefined
}

export function ResidenceFileViewer({ path }: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)

  const { data: url, isLoading } = useResidenceSignedUrl(path)

  if (!path || isLoading || !url) return null

  const isLegacy = isLegacyExternalUrl(path)
  const kind = isLegacy ? null : residenceKindFromPath(path)

  // رابط خارجي قديم
  if (isLegacy || kind === null) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 underline"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        عرض ملف الإقامة
      </a>
    )
  }

  if (kind === 'image') {
    return (
      <>
        <div
          className="mt-2 cursor-pointer"
          onClick={() => setLightboxOpen(true)}
          title="انقر للتكبير"
        >
          <img
            src={url}
            alt="صورة الإقامة"
            className="h-20 w-auto rounded-lg border border-slate-200 object-cover hover:opacity-90 transition-opacity"
          />
          <p className="mt-1 text-xs text-slate-500">انقر للتكبير</p>
        </div>

        {lightboxOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              type="button"
              className="absolute top-4 left-4 text-white hover:text-slate-300"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={url}
              alt="صورة الإقامة"
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    )
  }

  // PDF
  return (
    <>
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setPdfViewerOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <FileText className="w-4 h-4 text-red-500" />
          عرض ملف الإقامة (PDF)
        </button>
      </div>

      {pdfViewerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80" dir="rtl">
          <div className="flex items-center justify-between bg-white px-4 py-3 shadow">
            <span className="text-sm font-medium text-neutral-800">ملف الإقامة</span>
            <button
              type="button"
              onClick={() => setPdfViewerOpen(false)}
              className="rounded p-1 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <iframe
            src={url}
            title="ملف الإقامة PDF"
            className="flex-1 w-full border-0"
          />
        </div>
      )}
    </>
  )
}
