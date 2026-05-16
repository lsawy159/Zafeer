import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Loader2 } from 'lucide-react'

interface Props {
  src: string
  mimeType: string
  onConfirm: (blob: Blob) => void
  onCancel: () => void
}

export function ResidenceCropModal({ src, mimeType, onConfirm, onCancel }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [crop, setCrop] = useState<Crop>({ unit: '%', x: 10, y: 10, width: 80, height: 80 })
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)
  const [processing, setProcessing] = useState(false)

  async function handleConfirm() {
    if (!imgRef.current || !completedCrop || completedCrop.width === 0) return
    setProcessing(true)

    const img = imgRef.current
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) { setProcessing(false); return }

    const scaleX = img.naturalWidth / img.width
    const scaleY = img.naturalHeight / img.height

    canvas.width = Math.round(completedCrop.width * scaleX)
    canvas.height = Math.round(completedCrop.height * scaleY)

    ctx.drawImage(
      img,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0, 0,
      canvas.width,
      canvas.height,
    )

    const outputMime = mimeType === 'image/png' ? 'image/png' : 'image/jpeg'
    canvas.toBlob(
      (blob) => {
        setProcessing(false)
        if (blob) onConfirm(blob)
      },
      outputMime,
      0.92,
    )
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4"
      dir="rtl"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <h3 className="text-base font-semibold text-neutral-900">اختر منطقة الاقتصاص</h3>
          <p className="text-sm text-neutral-500 mt-0.5">
            حدد الجزء الذي تريد عرضه كصورة الموظف — اسحب الإطار لضبط المنطقة
          </p>
        </div>

        <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-4">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            minWidth={20}
            minHeight={20}
          >
            <img
              ref={imgRef}
              src={src}
              alt="صورة الإقامة للاقتصاص"
              className="max-h-[55vh] max-w-full object-contain"
            />
          </ReactCrop>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={processing || !completedCrop || completedCrop.width === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {processing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            تأكيد الاقتصاص
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
