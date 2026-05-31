import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import {
  DEFAULT_EXPIRED_INCLUSION,
  getExpiredInclusionSettings,
  saveExpiredInclusionSettings,
  type ExpiredInclusionSettings,
} from '@/utils/expiredInclusionSettings'
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
import { useEmailSettings } from './EmailSettingsTab/useEmailSettings'


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
  const {
    adminEmail, setAdminEmail,
    notificationMethods, setNotificationMethods,
    quietHoursStart, setQuietHoursStart,
    quietHoursEnd, setQuietHoursEnd,
    adminEmailError, setAdminEmailError,
    isLoadingEmailSettings, isSavingEmailSettings,
    recipientsConfig, setRecipientsConfig,
    isLoadingRecipients, isSavingRecipients,
    showAddRecipientForm, setShowAddRecipientForm,
    newRecipientEmail, setNewRecipientEmail,
    newRecipientExpiryAlerts, setNewRecipientExpiryAlerts,
    newRecipientBackupNotifications, setNewRecipientBackupNotifications,
    newRecipientDailyDigest, setNewRecipientDailyDigest,
    newRecipientError, setNewRecipientError,
    recentBackups, recentBackupsState,
    queueStats, queueStatsLoading, queueStatsError,
    backupEmailModalTarget, setBackupEmailModalTarget,
    csvSending, csvSendMsg,
    expiredSettings, setExpiredSettings,
    isBusy,
    loadEmailSettings,
    saveEmailSettings,
    saveRecipientsConfig,
    handleAddRecipient,
    handleDeleteRecipient,
    handleRecipientPermissionChange,
    handleSendCsvReport,
    loadRecentBackups,
    loadQueueStats,
    handleExpiredInclusionChange,
    resetAddRecipientForm,
  } = useEmailSettings()

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
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">تضمين المنتهي</h2>
              <p className="text-xs text-foreground-tertiary">
                تحكم في إظهار العناصر المنتهية داخل ملخص اليومي وإشعارات البريد الفردية.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            {
              key: 'include_in_daily_email' as const,
              label: 'تضمين المنتهي في الملخص اليومي',
            },
            {
              key: 'include_in_notification_emails' as const,
              label: 'تضمين المنتهي في إشعارات البريد الفردية',
            },
          ].map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-secondary/30 px-3.5 py-3"
            >
              <span className="text-sm text-foreground-secondary">{label}</span>
              <input
                type="checkbox"
                checked={expiredSettings[key]}
                onChange={(event) => handleExpiredInclusionChange(key, event.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </label>
          ))}
        </div>
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
