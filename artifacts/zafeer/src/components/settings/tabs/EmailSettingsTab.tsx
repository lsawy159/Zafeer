import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Switch } from '@/components/ui/switch'
import { SendEmailModal } from '@/components/settings/backup/SendEmailModal'
import type { BackupRecord } from '@/lib/backupService'
import {
  createSectionLoadState,
  type SettingsSectionLoadState,
} from '@/components/settings/tabs/settingsSectionState'
import {
  safeParseConfig,
  createDefaultConfig,
  type NotificationRecipientsConfig,
  type AdditionalRecipient,
} from '@/lib/notificationTypes'
import {
  AlertTriangle,
  Bell,
  Clock,
  Loader2,
  Lock,
  Mail,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from 'lucide-react'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMAIL_SETTINGS_KEYS = [
  'admin_email',
  'notification_methods',
  'quiet_hours_start',
  'quiet_hours_end',
  'notification_recipients',
] as const

type NotificationMethod = 'in_app' | 'email' | 'all'

type QueueStats = {
  pending: number
  sent: number
  failed: number
}

function parseSettingValue(raw: unknown): string {
  if (raw == null) return ''

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (typeof parsed === 'string') return parsed
      if (parsed == null) return ''
      return String(parsed)
    } catch {
      return raw
    }
  }

  return String(raw)
}

function formatBackupType(type: string): string {
  switch (type) {
    case 'full':
      return 'نسخة كاملة'
    case 'scheduled':
      return 'نسخة تلقائية'
    case 'pre-restore-snapshot':
      return 'Snapshot وقائي'
    default:
      return type
  }
}

function formatBackupSize(bytes: number): string {
  return `${bytes.toLocaleString('ar-SA')} بايت`
}

function RecipientPermissionToggle({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  disabled: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-surface-secondary/40 px-3 py-2">
      <span className="text-xs text-foreground-secondary">{label}</span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  )
}

export function EmailSettingsTab() {
  const [adminEmail, setAdminEmail] = useState('')
  const [notificationMethods, setNotificationMethods] = useState<NotificationMethod>('in_app')
  const [quietHoursStart, setQuietHoursStart] = useState('22:00')
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00')
  const [adminEmailError, setAdminEmailError] = useState<string | null>(null)
  const [isLoadingEmailSettings, setIsLoadingEmailSettings] = useState(true)
  const [isSavingEmailSettings, setIsSavingEmailSettings] = useState(false)

  const [recipientsConfig, setRecipientsConfig] = useState<NotificationRecipientsConfig | null>(
    null
  )
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(true)
  const [isSavingRecipients, setIsSavingRecipients] = useState(false)
  const [showAddRecipientForm, setShowAddRecipientForm] = useState(false)
  const [newRecipientEmail, setNewRecipientEmail] = useState('')
  const [newRecipientExpiryAlerts, setNewRecipientExpiryAlerts] = useState(false)
  const [newRecipientBackupNotifications, setNewRecipientBackupNotifications] = useState(false)
  const [newRecipientDailyDigest, setNewRecipientDailyDigest] = useState(false)
  const [newRecipientError, setNewRecipientError] = useState<string | null>(null)

  const [recentBackups, setRecentBackups] = useState<BackupRecord[]>([])
  const [recentBackupsState, setRecentBackupsState] = useState<SettingsSectionLoadState>(
    createSectionLoadState('recentBackups', 'loading')
  )
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null)
  const [queueStatsLoading, setQueueStatsLoading] = useState(false)
  const [queueStatsError, setQueueStatsError] = useState(true)
  const [backupEmailModalTarget, setBackupEmailModalTarget] = useState<BackupRecord | null>(null)

  const [csvSending, setCsvSending] = useState(false)
  const [csvSendMsg, setCsvSendMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const loadEmailSettings = async () => {
    setIsLoadingEmailSettings(true)
    setIsLoadingRecipients(true)
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [...EMAIL_SETTINGS_KEYS])

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      const rows = data ?? []
      const byKey = new Map(rows.map((row: { setting_key: string; setting_value: unknown }) => [row.setting_key, row.setting_value]))

      setAdminEmail(parseSettingValue(byKey.get('admin_email')))
      setNotificationMethods((parseSettingValue(byKey.get('notification_methods')) || 'in_app') as NotificationMethod)
      setQuietHoursStart(parseSettingValue(byKey.get('quiet_hours_start')) || '22:00')
      setQuietHoursEnd(parseSettingValue(byKey.get('quiet_hours_end')) || '08:00')

      const recipientsValue = byKey.get('notification_recipients')
      setRecipientsConfig(
        recipientsValue
          ? safeParseConfig(recipientsValue as string | Record<string, unknown> | null | undefined)
          : createDefaultConfig()
      )
    } catch (error) {
      logger.error('[EmailSettingsTab] load email settings error:', error)
      toast.error('فشل تحميل إعدادات البريد')
      setRecipientsConfig(createDefaultConfig())
    } finally {
      setIsLoadingEmailSettings(false)
      setIsLoadingRecipients(false)
    }
  }

  const loadRecentBackups = async () => {
    setRecentBackupsState(createSectionLoadState('recentBackups', 'loading'))
    try {
      const { data, error } = await supabase
        .from('backup_history')
        .select('id, backup_type, started_at, completed_at, file_size, status')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(10)

      if (error) {
        throw error
      }

      setRecentBackups((data ?? []) as BackupRecord[])
      setRecentBackupsState(createSectionLoadState('recentBackups', 'ready'))
    } catch (error) {
      logger.error('[EmailSettingsTab] load recent backups error:', error)
      setRecentBackups([])
      setRecentBackupsState(
        createSectionLoadState('recentBackups', 'degraded', {
          userMessage: 'تعذر تحميل سجل النسخ الاحتياطية',
          diagnosticClass: 'actionable_failure',
        })
      )
    }
  }

  const loadQueueStats = async () => {
    setQueueStatsLoading(false)
    setQueueStatsError(true)
    setQueueStats(null)
  }

  useEffect(() => {
    void Promise.all([loadEmailSettings(), loadRecentBackups()])
    void loadQueueStats()
  }, [])

  async function saveEmailSettings() {
    setAdminEmailError(null)

    const trimmedEmail = adminEmail.trim()
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      setAdminEmailError('البريد الإلكتروني غير صالح')
      toast.error('فشل الحفظ')
      return
    }

    setIsSavingEmailSettings(true)
    try {
      const rows = [
        { setting_key: 'admin_email', setting_value: JSON.stringify(trimmedEmail) },
        { setting_key: 'notification_methods', setting_value: JSON.stringify(notificationMethods) },
        { setting_key: 'quiet_hours_start', setting_value: JSON.stringify(quietHoursStart) },
        { setting_key: 'quiet_hours_end', setting_value: JSON.stringify(quietHoursEnd) },
      ]

      const { error } = await supabase.from('system_settings').upsert(rows, { onConflict: 'setting_key' })
      if (error) throw error

      toast.success('تم حفظ الإعدادات')
    } catch (error) {
      logger.error('[EmailSettingsTab] save email settings error:', error)
      toast.error('فشل الحفظ')
    } finally {
      setIsSavingEmailSettings(false)
    }
  }

  async function saveRecipientsConfig(
    config: NotificationRecipientsConfig,
    options?: {
      successMessage?: string
      errorMessage?: string
    }
  ): Promise<boolean> {
    setIsSavingRecipients(true)
    try {
      const payload: NotificationRecipientsConfig = {
        ...config,
        last_modified: new Date().toISOString(),
      }

      const { error } = await supabase.from('system_settings').upsert(
        {
          setting_key: 'notification_recipients',
          setting_value: JSON.stringify(payload),
        },
        { onConflict: 'setting_key' }
      )

      if (error) throw error

      setRecipientsConfig(payload)
      toast.success(options?.successMessage ?? 'تم الحفظ')
      return true
    } catch (error) {
      logger.error('[EmailSettingsTab] save recipients config error:', error)
      toast.error(options?.errorMessage ?? 'فشل الحفظ — حاول مرة أخرى')
      return false
    } finally {
      setIsSavingRecipients(false)
    }
  }

  async function handleRecipientPermissionChange(
    recipientId: string,
    key: 'expiryAlerts' | 'backupNotifications' | 'dailyDigest',
    checked: boolean
  ) {
    if (!recipientsConfig) return

    const nextConfig: NotificationRecipientsConfig = {
      ...recipientsConfig,
      additional_recipients: recipientsConfig.additional_recipients.map((recipient) =>
        recipient.id === recipientId ? { ...recipient, [key]: checked } : recipient
      ),
    }

    await saveRecipientsConfig(nextConfig, {
      successMessage: 'تم التحديث',
      errorMessage: 'فشل التحديث',
    })
  }

  async function handleDeleteRecipient(recipientId: string) {
    if (!recipientsConfig) return

    const nextConfig: NotificationRecipientsConfig = {
      ...recipientsConfig,
      additional_recipients: recipientsConfig.additional_recipients.filter(
        (recipient) => recipient.id !== recipientId
      ),
    }

    await saveRecipientsConfig(nextConfig, {
      successMessage: 'تم حذف المستلم',
      errorMessage: 'فشل الحذف',
    })
  }

  function resetAddRecipientForm() {
    setNewRecipientEmail('')
    setNewRecipientExpiryAlerts(false)
    setNewRecipientBackupNotifications(false)
    setNewRecipientDailyDigest(false)
    setNewRecipientError(null)
    setShowAddRecipientForm(false)
  }

  async function handleAddRecipient() {
    if (!recipientsConfig) return

    const trimmedEmail = newRecipientEmail.trim().toLowerCase()
    setNewRecipientError(null)

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setNewRecipientError('بريد إلكتروني غير صالح')
      return
    }

    const alreadyExists =
      trimmedEmail === recipientsConfig.primary_admin.trim().toLowerCase() ||
      recipientsConfig.additional_recipients.some(
        (recipient) => recipient.email.trim().toLowerCase() === trimmedEmail
      )

    if (alreadyExists) {
      setNewRecipientError('هذا البريد مضاف مسبقاً')
      return
    }

    const nextRecipient: AdditionalRecipient = {
      id: crypto.randomUUID(),
      email: trimmedEmail,
      expiryAlerts: newRecipientExpiryAlerts,
      backupNotifications: newRecipientBackupNotifications,
      dailyDigest: newRecipientDailyDigest,
      added_at: new Date().toISOString(),
      added_by: 'admin',
    }

    const nextConfig: NotificationRecipientsConfig = {
      ...recipientsConfig,
      additional_recipients: [...recipientsConfig.additional_recipients, nextRecipient],
    }

    const saved = await saveRecipientsConfig(nextConfig, {
      successMessage: 'تمت إضافة المستلم',
      errorMessage: 'فشل الحفظ — حاول مرة أخرى',
    })

    if (saved) {
      resetAddRecipientForm()
    }
  }

  async function handleSendCsvReport() {
    setCsvSending(true)
    setCsvSendMsg(null)
    try {
      const { data, error } = await supabase.functions.invoke('send-alert-report')
      if (error) {
        let serverMsg: string | undefined
        try {
          const body = await (error as unknown as { context: Response }).context.json()
          serverMsg = body?.error as string | undefined
        } catch {
          // context not JSON-parseable
        }

        const is413 = serverMsg?.includes('35MB') || serverMsg?.includes('حجم')
        if (is413) {
          setCsvSendMsg({
            ok: false,
            text: 'حجم التقرير يتجاوز الحد المسموح (35MB) — قلّص نطاق التقرير.',
          })
        } else {
          setCsvSendMsg({ ok: false, text: serverMsg ?? 'خطأ غير متوقع' })
        }
        return
      }

      if (data?.error === 'no_admin_email') {
        setCsvSendMsg({
          ok: false,
          text: 'إيميل المسؤول غير مضبوط — احفظ الإيميل أولاً ثم أعد المحاولة.',
        })
      } else if (data?.email_sent === false) {
        setCsvSendMsg({
          ok: true,
          text: 'لا توجد تنبيهات نشطة حالياً — لم يُرسل تقرير.',
        })
      } else {
        setCsvSendMsg({ ok: true, text: 'تم إرسال التقرير بنجاح.' })
      }
    } catch (error) {
      logger.error('[EmailSettingsTab] send csv report error:', error)
      setCsvSendMsg({
        ok: false,
        text: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      })
    } finally {
      setCsvSending(false)
    }
  }

  const isBusy = isLoadingEmailSettings || isSavingEmailSettings || isSavingRecipients

  return (
    <div className="space-y-6" dir="rtl">
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                الإعدادات الأساسية للبريد
              </h2>
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
                    لن تصل الإشعارات اليومية ولا تقارير CSV بالبريد. أدخل إيميل المسؤول في الحقل
                    أدناه.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground-secondary">
                  إيميل المسؤول
                </label>
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
                {adminEmailError && (
                  <p className="text-xs text-red-600">{adminEmailError}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground-secondary">
                  طريقة الإرسال التلقائي
                </label>
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
                <label className="text-xs font-medium text-foreground-secondary">
                  بداية ساعات الصمت
                </label>
                <Input
                  type="time"
                  value={quietHoursStart}
                  onChange={(e) => setQuietHoursStart(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground-secondary">
                  نهاية ساعات الصمت
                </label>
                <Input
                  type="time"
                  value={quietHoursEnd}
                  onChange={(e) => setQuietHoursEnd(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">مستلمو الإيميلات</h2>
              <p className="text-xs text-foreground-tertiary">
                primary_admin ثابت، وباقي المستلمين يمكن تعديل صلاحياتهم
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowAddRecipientForm((prev) => !prev)}
            disabled={isBusy}
          >
            <Plus className="h-4 w-4" />
            {showAddRecipientForm ? 'إغلاق' : 'إضافة مستلم'}
          </Button>
        </div>

        {isLoadingRecipients ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/70 bg-surface-secondary/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">primary_admin</h3>
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="h-3 w-3" />
                      مقفول
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-foreground-secondary" dir="ltr">
                    {recipientsConfig?.primary_admin || 'غير مضبوط'}
                  </p>
                </div>
              </div>
            </div>

            {showAddRecipientForm && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="space-y-1.5 lg:col-span-2">
                    <label className="text-xs font-medium text-foreground-secondary">
                      البريد الإلكتروني
                    </label>
                    <Input
                      type="email"
                      value={newRecipientEmail}
                      onChange={(e) => {
                        setNewRecipientEmail(e.target.value)
                        if (newRecipientError) setNewRecipientError(null)
                      }}
                      placeholder="name@example.com"
                      dir="ltr"
                    />
                    {newRecipientError && (
                      <p className="text-xs text-red-600">{newRecipientError}</p>
                    )}
                  </div>

                  <RecipientPermissionToggle
                    label="تنبيهات انتهاء الصلاحية"
                    checked={newRecipientExpiryAlerts}
                    disabled={isBusy}
                    onCheckedChange={setNewRecipientExpiryAlerts}
                  />
                  <RecipientPermissionToggle
                    label="النسخ الاحتياطية"
                    checked={newRecipientBackupNotifications}
                    disabled={isBusy}
                    onCheckedChange={setNewRecipientBackupNotifications}
                  />
                  <RecipientPermissionToggle
                    label="الملخص اليومي"
                    checked={newRecipientDailyDigest}
                    disabled={isBusy}
                    onCheckedChange={setNewRecipientDailyDigest}
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={resetAddRecipientForm}>
                    إلغاء
                  </Button>
                  <Button type="button" size="sm" onClick={handleAddRecipient} disabled={isBusy}>
                    {isSavingRecipients ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    إضافة
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {(recipientsConfig?.additional_recipients ?? []).length === 0 ? (
                <p className="text-sm text-foreground-tertiary">لا يوجد مستلمون إضافيون حالياً</p>
              ) : (
                recipientsConfig?.additional_recipients.map((recipient) => (
                  <div
                    key={recipient.id}
                    className="rounded-xl border border-border/70 bg-surface-secondary/30 p-4 space-y-4"
                  >
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-medium text-foreground" dir="ltr">
                          {recipient.email}
                        </p>
                        <p className="text-xs text-foreground-tertiary">
                          تمت الإضافة: {new Date(recipient.added_at).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleDeleteRecipient(recipient.id)}
                        disabled={isBusy}
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                      <RecipientPermissionToggle
                        label="تنبيهات انتهاء الصلاحية"
                        checked={recipient.expiryAlerts}
                        disabled={isBusy}
                        onCheckedChange={(checked) =>
                          void handleRecipientPermissionChange(recipient.id, 'expiryAlerts', checked)
                        }
                      />
                      <RecipientPermissionToggle
                        label="النسخ الاحتياطية"
                        checked={recipient.backupNotifications}
                        disabled={isBusy}
                        onCheckedChange={(checked) =>
                          void handleRecipientPermissionChange(
                            recipient.id,
                            'backupNotifications',
                            checked
                          )
                        }
                      />
                      <RecipientPermissionToggle
                        label="الملخص اليومي"
                        checked={recipient.dailyDigest}
                        disabled={isBusy}
                        onCheckedChange={(checked) =>
                          void handleRecipientPermissionChange(recipient.id, 'dailyDigest', checked)
                        }
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                إرسال النسخة الاحتياطية بالبريد
              </h2>
              <p className="text-xs text-foreground-tertiary">
                آخر 10 نسخ مكتملة مع زر إرسال مباشر
              </p>
            </div>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={loadRecentBackups}>
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
        </div>

        {recentBackupsState.status === 'loading' ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : recentBackupsState.status === 'degraded' ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {recentBackupsState.userMessage ?? 'تعذر تحميل سجل النسخ الاحتياطية'}
            </p>
          </div>
        ) : recentBackups.length === 0 ? (
          <p className="text-sm text-foreground-tertiary">لا توجد نسخ احتياطية مكتملة</p>
        ) : (
          <div className="space-y-3">
            {recentBackups.map((backup) => (
              <div
                key={backup.id}
                className="flex flex-col gap-3 rounded-xl border border-border/70 bg-surface-secondary/30 p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-foreground">
                      {formatBackupType(backup.backup_type)}
                    </h3>
                    <Badge variant="outline">{backup.status}</Badge>
                  </div>
                  <p className="text-sm text-foreground-secondary">
                    {backup.completed_at
                      ? new Date(backup.completed_at).toLocaleDateString('ar-SA')
                      : new Date(backup.started_at).toLocaleDateString('ar-SA')}
                  </p>
                  <p className="text-xs text-foreground-tertiary">
                    {formatBackupSize(backup.file_size)}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setBackupEmailModalTarget(backup)}
                >
                  <Mail className="h-4 w-4" />
                  إرسال بالبريد
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">إرسال تقرير التنبيهات</h2>
              <p className="text-xs text-foreground-tertiary">
                يولد CSV ويرسله إلى المسؤول مباشرة
              </p>
            </div>
          </div>
          <Button type="button" onClick={handleSendCsvReport} disabled={csvSending} size="sm">
            {csvSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            إرسال الآن
          </Button>
        </div>
        {csvSendMsg && (
          <p className={`text-sm font-medium ${csvSendMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
            {csvSendMsg.text}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">حالة طابور الإيميلات</h2>
              <p className="text-xs text-foreground-tertiary">
                pending / sent / failed
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={loadQueueStats}
            disabled={queueStatsError === true && !queueStatsLoading}
          >
            <RefreshCw className={`h-4 w-4 ${queueStatsLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>

        {queueStatsLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : queueStatsError ? (
          <p className="text-sm text-foreground-tertiary">تعذّر قراءة حالة الطابور</p>
        ) : queueStats ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-surface-secondary/30 p-4">
              <p className="text-xs text-foreground-tertiary">قيد الانتظار</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{queueStats.pending}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-surface-secondary/30 p-4">
              <p className="text-xs text-foreground-tertiary">مُرسل</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{queueStats.sent}</p>
            </div>
            <div
              className={`rounded-xl border p-4 ${
                queueStats.failed > 0
                  ? 'border-amber-500/30 bg-amber-500/10'
                  : 'border-border/70 bg-surface-secondary/30'
              }`}
            >
              <p className="text-xs text-foreground-tertiary">فشل</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{queueStats.failed}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground-tertiary">تعذّر قراءة حالة الطابور</p>
        )}
      </section>

      {backupEmailModalTarget && (
        <SendEmailModal
          backupId={backupEmailModalTarget.id}
          backupDate={
            backupEmailModalTarget.completed_at
              ? new Date(backupEmailModalTarget.completed_at).toLocaleDateString('ar-SA')
              : undefined
          }
          onClose={() => setBackupEmailModalTarget(null)}
        />
      )}
    </div>
  )
}
