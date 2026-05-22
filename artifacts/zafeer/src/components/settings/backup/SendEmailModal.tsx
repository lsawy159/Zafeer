import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, X } from 'lucide-react'
import { sendBackupByEmail } from '@/lib/backupService'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Props {
  backupId: string
  backupDate?: string
  onClose: () => void
}

export function SendEmailModal({ backupId, backupDate, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => sendBackupByEmail(backupId, email),
    onSuccess: () => {
      toast.success('تم إرسال النسخة الاحتياطية بنجاح')
      onClose()
    },
  })

  const is413 = mutation.error instanceof Error &&
    mutation.error.message.includes('حجم الملف')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setValidationError(null)
    mutation.reset()

    if (!email.trim()) {
      setValidationError('يرجى إدخال البريد الإلكتروني')
      return
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setValidationError('البريد الإلكتروني غير صالح')
      return
    }

    mutation.mutate()
  }

  function handleEmailChange(val: string) {
    setEmail(val)
    if (validationError) setValidationError(null)
    if (mutation.isError) mutation.reset()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-800">
            إرسال النسخة الاحتياطية بالبريد
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {backupDate && (
          <p className="text-sm text-neutral-500">النسخة: {backupDate}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email input */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-700">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="example@email.com"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                validationError ? 'border-red-400' : 'border-neutral-300'
              }`}
              disabled={mutation.isPending}
              dir="ltr"
            />
            {validationError && (
              <p className="text-xs text-red-600">{validationError}</p>
            )}
          </div>

          {/* Server error */}
          {mutation.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
              <p className="text-sm text-red-700">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : 'حدث خطأ أثناء الإرسال'}
              </p>
              {is413 ? (
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); onClose() }}
                  className="text-xs text-blue-600 underline"
                >
                  تحميل النسخة يدوياً من القائمة
                </a>
              ) : (
                <button
                  type="submit"
                  className="text-xs text-blue-600 underline"
                >
                  حاول مرة أخرى
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="app-button-primary text-sm py-2 px-5 gap-2 flex items-center"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                'إرسال'
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="app-button-secondary text-sm py-2 px-5"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
