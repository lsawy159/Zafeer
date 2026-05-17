import { useState } from 'react'
import { createPortal } from 'react-dom'
import { FileText, ExternalLink, X, Download } from 'lucide-react'
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
  const fileName = path.split('/').pop() ?? 'iqama-file'

  async function handleDownload() {
    try {
      const response = await fetch(url!)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)
    } catch {
      // fallback: open in new tab
      window.open(url ?? undefined, '_blank', 'noopener,noreferrer')
    }
  }

  if (isLegacy || kind === null) {
    return (
      <div className="mt-2 flex gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          عرض
        </a>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          تحميل
        </button>
      </div>
    )
  }

  if (kind === 'image') {
    return (
      <>
        <div className="mt-2">
          <div
            className="cursor-pointer"
            onClick={() => setLightboxOpen(true)}
            title="انقر للتكبير وعرض الإقامة كاملة"
          >
            <img
              src={url}
              alt="صورة الإقامة"
              className="h-20 w-auto rounded-lg border border-slate-200 object-cover hover:opacity-90 transition-opacity"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              عرض
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              تحميل
            </button>
          </div>
        </div>

        {lightboxOpen && createPortal(
          <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85"
            onClick={() => setLightboxOpen(false)}
          >
            <div className="absolute top-4 left-4 flex gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDownload() }}
                className="rounded-full bg-black/30 p-2 text-white hover:bg-black/50"
                title="تحميل الإقامة"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="rounded-full bg-black/30 p-2 text-white hover:bg-black/50"
                onClick={() => setLightboxOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={url}
              alt="صورة الإقامة كاملة"
              className="max-h-[92vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body,
        )}
      </>
    )
  }

  // PDF
  return (
    <>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => setPdfViewerOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <FileText className="w-4 h-4 text-red-500" />
          عرض PDF
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <Download className="w-4 h-4" />
          تحميل
        </button>
      </div>

      {pdfViewerOpen && createPortal(
        <div className="fixed inset-0 z-[300] flex flex-col bg-black/80" dir="rtl">
          <div className="flex items-center justify-between bg-white px-4 py-3 shadow flex-shrink-0">
            <span className="text-sm font-medium text-neutral-800">ملف الإقامة</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                تحميل
              </button>
              <button
                type="button"
                onClick={() => setPdfViewerOpen(false)}
                className="rounded p-1 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <iframe
            src={url}
            title="ملف الإقامة PDF"
            className="flex-1 w-full border-0"
          />
        </div>,
        document.body,
      )}
    </>
  )
}
