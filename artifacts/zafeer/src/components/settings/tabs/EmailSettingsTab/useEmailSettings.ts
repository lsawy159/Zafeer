import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { usePermissions } from '@/utils/permissions'
import { logger } from '@/utils/logger'
import {
  DEFAULT_EXPIRED_INCLUSION,
  getExpiredInclusionSettings,
  saveExpiredInclusionSettings,
  type ExpiredInclusionSettings,
} from '@/utils/expiredInclusionSettings'
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


const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMAIL_SETTINGS_KEYS = [
  'admin_email',
  'notification_methods',
  'quiet_hours_start',
  'quiet_hours_end',
  'notification_recipients',
] as const

type NotificationMethod = 'in_app' | 'email' | 'all'

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


export function useEmailSettings() {
  const { canEdit } = usePermissions()
  const canEditEmail = canEdit('emailSettings')
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
  const [backupEmailModalTarget, setBackupEmailModalTarget] = useState<BackupRecord | null>(null)

  const [csvSending, setCsvSending] = useState(false)
  const [csvSendMsg, setCsvSendMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [expiredSettings, setExpiredSettings] = useState<ExpiredInclusionSettings>(
    DEFAULT_EXPIRED_INCLUSION
  )

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void Promise.all([loadEmailSettings(), loadRecentBackups()])
  }, [])

  useEffect(() => {
    void getExpiredInclusionSettings().then(setExpiredSettings)
  }, [])

  function handleExpiredInclusionChange(
    key: keyof ExpiredInclusionSettings,
    checked: boolean
  ) {
    if (!canEditEmail) return
    setExpiredSettings((current) => {
      const next = { ...current, [key]: checked }
      void saveExpiredInclusionSettings(next).catch((error) => {
        logger.error('[EmailSettingsTab] save expired inclusion settings error:', error)
        toast.error('فشل حفظ إعدادات تضمين المنتهي')
      })
      return next
    })
  }

  async function saveEmailSettings() {
    if (!canEditEmail) {
      toast.error('ليس لديك صلاحية تعديل إعدادات البريد')
      return
    }
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

      try {
        await supabase.from('activity_log').insert({
          entity_type: 'email_settings',
          action: 'تحديث إعدادات البريد',
          details: { changed_count: rows.length },
        })
      } catch { /* non-blocking */ }

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
    if (!canEditEmail) return
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
    if (!canEditEmail) return
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
    if (!canEditEmail) return
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
    if (!canEditEmail) {
      toast.error('ليس لديك صلاحية إرسال التقرير')
      return
    }
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


  return {
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
    handleExpiredInclusionChange,
    resetAddRecipientForm,
  }
}
