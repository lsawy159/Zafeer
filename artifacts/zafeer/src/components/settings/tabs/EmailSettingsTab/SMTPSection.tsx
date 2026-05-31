import { AlertTriangle, Clock, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import type { useEmailSettings } from './useEmailSettings'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
type NotificationMethod = 'in_app' | 'email' | 'all'
type Ctx = ReturnType<typeof useEmailSettings>

interface Props {
  adminEmail: Ctx['adminEmail']
  setAdminEmail: Ctx['setAdminEmail']
  notificationMethods: Ctx['notificationMethods']
  setNotificationMethods: Ctx['setNotificationMethods']
  quietHoursStart: Ctx['quietHoursStart']
  setQuietHoursStart: Ctx['setQuietHoursStart']
  quietHoursEnd: Ctx['quietHoursEnd']
  setQuietHoursEnd: Ctx['setQuietHoursEnd']
  adminEmailError: Ctx['adminEmailError']
  setAdminEmailError: Ctx['setAdminEmailError']
  isLoadingEmailSettings: Ctx['isLoadingEmailSettings']
  isSavingEmailSettings: Ctx['isSavingEmailSettings']
  saveEmailSettings: Ctx['saveEmailSettings']
}

export function SMTPSection({
  adminEmail, setAdminEmail,
  notificationMethods, setNotificationMethods,
  quietHoursStart, setQuietHoursStart,
  quietHoursEnd, setQuietHoursEnd,
  adminEmailError, setAdminEmailError,
  isLoadingEmailSettings, isSavingEmailSettings,
  saveEmailSettings,
}: Props) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">الإعدادات الأساسية للبريد</h2>
            <p className="text-xs text-foreground-tertiary">
              إيميل المسؤول وطريقة الإرسال وساعات الصمت
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={saveEmailSettings}
          disabled={isSavingEmailSettings}
          size="sm"
          className="shrink-0"
        >
          {isSavingEmailSettings ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
          حفظ الإعدادات
        </Button>
      </div>

      {isLoadingEmailSettings ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {!adminEmail && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  إيميل المسؤول غير مضبوط
                </p>
                <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-500">
                  لن تصل الإشعارات اليومية ولا تقارير CSV بالبريد. أدخل إيميل المسؤول في الحقل أدناه.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground-secondary">إيميل المسؤول</label>
              <Input
                type="email"
                value={adminEmail}
                onChange={(e) => {
                  setAdminEmail(e.target.value)
                  if (adminEmailError) setAdminEmailError(null)
                }}
                onBlur={() => {
                  const trimmed = adminEmail.trim()
                  if (trimmed && !EMAIL_REGEX.test(trimmed)) {
                    setAdminEmailError('البريد الإلكتروني غير صالح')
                  } else {
                    setAdminEmailError(null)
                  }
                }}
                placeholder="admin@example.com"
                dir="ltr"
              />
              {adminEmailError && <p className="text-xs text-red-600">{adminEmailError}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground-secondary">طريقة الإرسال التلقائي</label>
              <select
                value={notificationMethods}
                onChange={(e) => setNotificationMethods(e.target.value as NotificationMethod)}
                className="app-input h-10 w-full text-sm"
              >
                <option value="in_app">داخل التطبيق فقط</option>
                <option value="email">بريد إلكتروني فقط</option>
                <option value="all">الاثنان معاً</option>
              </select>
              <p className="text-[11px] text-foreground-tertiary">
                ضبط 'داخل التطبيق فقط' يوقف إرسال الإيميلات التلقائية
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground-secondary">بداية ساعات الصمت</label>
              <Input type="time" value={quietHoursStart} onChange={(e) => setQuietHoursStart(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground-secondary">نهاية ساعات الصمت</label>
              <Input type="time" value={quietHoursEnd} onChange={(e) => setQuietHoursEnd(e.target.value)} />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
