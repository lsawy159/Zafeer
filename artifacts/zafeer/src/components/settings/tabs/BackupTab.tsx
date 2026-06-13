import React, { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/utils/permissions'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDateWithHijri } from '@/utils/dateFormatter'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import {
  fetchBackupSettings,
  saveBackupSettings,
  triggerManualBackup,
  type BackupRecord,
  type BackupSettingsSaveResult,
  type BackupSettings,
} from '@/lib/backupService'
import { fetchRestoreHistory, type RestoreHistoryRecord } from '@/lib/restoreService'
import { BackupListItem } from '@/components/settings/backup/BackupListItem'
import { downloadBackupAsCsv } from '@/lib/csvExport'
import {
  Database,
  AlertTriangle,
  Loader2,
  Clock,
  CalendarClock,
  HardDrive,
  RotateCcw,
  Save,
  Shield,
  Play,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { formatBytes } from '@/utils/formatBytes'

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'يومي',
  weekly: 'أسبوعي',
  monthly: 'شهري',
}

const DAY_LABELS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

function formatNextRun(iso: string | null): string {
  if (!iso) return 'غير محدد'
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12: true,
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// ─── Schedule Settings Form ───────────────────────────────────────────────────

interface ScheduleFormProps {
  initial: BackupSettings
  onSaved: () => void
  canEdit: boolean
}

function ScheduleForm({ initial, onSaved, canEdit }: ScheduleFormProps) {
  const [form, setForm] = useState<BackupSettings>(initial)
  const [dirty, setDirty] = useState(false)
  const [saveStarted, setSaveStarted] = useState(false)

  const update = <K extends keyof BackupSettings>(k: K, v: BackupSettings[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }))
    setDirty(true)
  }

  const saveMutation = useMutation({
    mutationFn: () => saveBackupSettings(form),
    onSuccess: (result: BackupSettingsSaveResult) => {
      if (result.refreshStatus === 'skipped') {
        toast.success('تم حفظ إعدادات الجدولة')
      } else {
        toast.success('تم حفظ إعدادات الجدولة وتحديث موعد التشغيل التالي')
      }
      setDirty(false)
      setSaveStarted(false)
      onSaved()
    },
    onError: (err) => {
      logger.error('[BackupTab] save settings error:', err)
      const msg = err instanceof Error ? err.message : ((err as Record<string, unknown>)?.message as string | undefined) ?? String(err)
      toast.error('فشل حفظ الإعدادات: ' + msg)
      setSaveStarted(false)
    },
  })

  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <CalendarClock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">جدولة النسخ التلقائي</h4>
          <p className="text-xs text-foreground-tertiary">يُشغَّل تلقائياً بواسطة Supabase Scheduled Function</p>
        </div>
        {/* Enable toggle */}
        <button
          type="button"
          onClick={() => update('schedule_enabled', !form.schedule_enabled)}
          className={`mr-auto relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
            form.schedule_enabled ? 'bg-primary' : 'bg-neutral-300 dark:bg-neutral-600'
          }`}
          aria-checked={form.schedule_enabled}
          role="switch"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              form.schedule_enabled ? '-translate-x-6' : '-translate-x-1'
            }`}
          />
        </button>
      </div>

      {form.schedule_enabled && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Frequency */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground-secondary">
              التكرار
            </label>
            <select
              value={form.frequency}
              onChange={(e) => update('frequency', e.target.value as BackupSettings['frequency'])}
              className="app-input h-10 w-full text-sm"
            >
              <option value="daily">يومي</option>
              <option value="weekly">أسبوعي</option>
              <option value="monthly">شهري</option>
            </select>
          </div>

          {/* Hour */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground-secondary">
              وقت التشغيل
            </label>
            <select
              value={form.schedule_hour}
              onChange={(e) => update('schedule_hour', Number(e.target.value))}
              className="app-input h-10 w-full text-sm"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>

          {/* Day of week (weekly only) */}
          {form.frequency === 'weekly' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground-secondary">
                يوم الأسبوع
              </label>
              <select
                value={form.schedule_day}
                onChange={(e) => update('schedule_day', Number(e.target.value))}
                className="app-input h-10 w-full text-sm"
              >
                {DAY_LABELS.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Retention */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground-secondary">
              الاحتفاظ (يوم)
            </label>
            <select
              value={form.retention_days}
              onChange={(e) => update('retention_days', Number(e.target.value))}
              className="app-input h-10 w-full text-sm"
            >
              {[7, 14, 30, 60, 90, 180, 365].map((d) => (
                <option key={d} value={d}>{d} يوم</option>
              ))}
            </select>
          </div>

          {/* Delivery mode */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground-secondary">
              طريقة النسخ
            </label>
            <select
              value={form.delivery_mode}
              onChange={(e) =>
                update('delivery_mode', e.target.value as BackupSettings['delivery_mode'])
              }
              className="app-input h-10 w-full text-sm"
            >
              <option value="local_plus_email">محلي + إشعار Gmail</option>
              <option value="local_only">محلي فقط</option>
            </select>
          </div>

          {/* Email notifications toggle */}
          {form.delivery_mode === 'local_plus_email' && (
            <div className="sm:col-span-2 lg:col-span-2 rounded-lg border border-border/70 bg-surface-secondary/40 p-3">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-foreground-secondary">
                  إشعارات البريد
                </label>
                <button
                  type="button"
                  onClick={() =>
                    update('email_notifications_enabled', !form.email_notifications_enabled)
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                    form.email_notifications_enabled
                      ? 'bg-primary'
                      : 'bg-neutral-300 dark:bg-neutral-600'
                  }`}
                  aria-checked={form.email_notifications_enabled}
                  role="switch"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      form.email_notifications_enabled ? '-translate-x-6' : '-translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* email_recipients: Gmail for automated backup delivery — independent of system_settings.notification_recipients */}
              <label className="mt-3 mb-1.5 block text-xs font-medium text-foreground-secondary">
                مستقبلو Gmail (مفصولين بفاصلة)
              </label>
              <input
                type="text"
                value={form.email_recipients.join(', ')}
                onChange={(e) => {
                  const recipients = e.target.value
                    .split(',')
                    .map((item) => item.trim())
                    .filter((item) => item.length > 0)
                  update('email_recipients', recipients)
                }}
                placeholder="owner@gmail.com, ops@gmail.com"
                className="app-input h-10 w-full text-sm"
                disabled={!form.email_notifications_enabled}
              />
              <p className="mt-1 text-[11px] text-foreground-tertiary">
                يتم الإرسال بعد نجاح الحفظ المحلي للنسخة الاحتياطية فقط.
              </p>
            </div>
          )}
        </div>
      )}

      {dirty && canEdit && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setSaveStarted(true)
              saveMutation.mutate()
            }}
            disabled={saveMutation.isPending || saveStarted}
            className="flex items-center gap-2"
            size="sm"
          >
            {saveMutation.isPending || saveStarted ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            حفظ الإعدادات
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  accent?: 'green' | 'blue' | 'amber'
}) {
  const accents = {
    green: 'bg-success-50 text-success-600 dark:bg-success-900/20 dark:text-success-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  }
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg ${accent ? accents[accent] : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}>
        {icon}
      </div>
      <p className="text-xs text-foreground-tertiary">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-foreground-tertiary">{sub}</p>}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

const RESTORE_STATUS_AR: Record<string, string> = {
  pending: 'في الانتظار',
  creating_snapshot: 'إنشاء Snapshot',
  reading_file: 'قراءة الملف',
  staging_data: 'تحضير البيانات',
  restoring_data: 'استعادة البيانات',
  completed: 'مكتملة',
  failed: 'فشلت',
}

export function BackupTab(): React.JSX.Element {
  const { canEdit } = usePermissions()
  const canEditBackup = canEdit('backupSettings')
  const [csvDownloadingId, setCsvDownloadingId] = useState<string | null>(null)
  const [manualBackupStarted, setManualBackupStarted] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showRestoreHistory, setShowRestoreHistory] = useState(false)

  // Backup settings
  const {
    data: settings,
    isLoading: settingsLoading,
    refetch: refetchSettings,
  } = useQuery({
    queryKey: ['backup-settings'],
    queryFn: fetchBackupSettings,
    staleTime: 60_000,
  })

  // Backup history
  const {
    data: backups = [],
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['backup-history'],
    queryFn: async (): Promise<BackupRecord[]> => {
      const { data, error } = await supabase
        .from('backup_history')
        .select(
          'id, backup_type, triggered_by, file_path, file_size, compression_ratio, status, started_at, completed_at, error_message, tables_included, table_record_counts'
        )
        .order('started_at', { ascending: false })
        .limit(30)

      if (error) throw error
      return (data as BackupRecord[]) || []
    },
    refetchInterval: 30_000,
  })

  // Restore history
  const {
    data: restoreHistory = [],
    isLoading: restoreHistoryLoading,
    refetch: refetchRestoreHistory,
  } = useQuery({
    queryKey: ['restore-history'],
    queryFn: fetchRestoreHistory,
    staleTime: 30_000,
  })

  // Manual backup trigger
  const triggerMutation = useMutation({
    mutationFn: triggerManualBackup,
    onSuccess: () => {
      toast.success('تم بدء النسخة الاحتياطية بنجاح')
      refetchHistory()
      refetchSettings()
      setManualBackupStarted(false)
    },
    onError: (err) => {
      logger.error('[BackupTab] manual trigger error:', err)
      toast.error('فشل إنشاء النسخة الاحتياطية: ' + (err instanceof Error ? err.message : String(err)))
      setManualBackupStarted(false)
    },
  })

  const handleCsvDownload = async (backup: BackupRecord) => {
    setCsvDownloadingId(backup.id)
    try {
      await downloadBackupAsCsv(backup)
    } catch (err) {
      toast.error('فشل تحضير ملف CSV: ' + (err instanceof Error ? err.message : String(err)))
      logger.error('[BackupTab] CSV download error:', err)
    } finally {
      setCsvDownloadingId(null)
    }
  }

  const completedBackups = backups.filter((b) => b.status === 'completed')
  const lastBackup = completedBackups[0] ?? null
  const totalSize = completedBackups.reduce((sum, b) => sum + (b.file_size || 0), 0)

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Password Warning Banner ── */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-800">
          <span className="font-medium">ملاحظة:</span> كلمات المرور وجلسات الدخول خارج نطاق النسخة الاحتياطية. سيحتاج المستخدمون لإعادة تسجيل الدخول بعد أي استعادة.
        </p>
      </div>

      {/* ── Schedule Settings ── */}
      {settingsLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : settings ? (
        <ScheduleForm
          initial={settings}
          canEdit={canEditBackup}
          onSaved={() => {
            refetchSettings()
            refetchHistory()
          }}
        />
      ) : null}

      {/* ── Status Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="آخر نسخة احتياطية"
          value={lastBackup ? formatDateWithHijri(lastBackup.completed_at ?? lastBackup.started_at) : 'لا يوجد'}
          accent="green"
        />
        <StatCard
          icon={<CalendarClock className="h-4 w-4" />}
          label="الموعد القادم"
          value={settings?.schedule_enabled ? formatNextRun(settings.next_run_at) : 'معطّل'}
          sub={settings?.schedule_enabled ? FREQUENCY_LABELS[settings.frequency] : undefined}
          accent="blue"
        />
        <StatCard
          icon={<Database className="h-4 w-4" />}
          label="عدد النسخ"
          value={String(completedBackups.length)}
          sub="نسخة ناجحة"
          accent="amber"
        />
        <StatCard
          icon={<HardDrive className="h-4 w-4" />}
          label="الحجم الإجمالي"
          value={formatBytes(totalSize)}
          sub={`${settings?.retention_days ?? 30} يوم احتفاظ`}
        />
      </div>

      {/* ── Manual Trigger ── */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">نسخة احتياطية فورية</p>
              <p className="text-xs text-foreground-tertiary">
                نسخة كاملة لجميع بيانات النظام الآن
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              setManualBackupStarted(true)
              triggerMutation.mutate()
            }}
            disabled={triggerMutation.isPending || manualBackupStarted || !canEditBackup}
            className="flex items-center gap-2 min-w-[150px]"
            aria-label={triggerMutation.isPending ? 'جاري إنشاء النسخة' : 'إنشاء نسخة احتياطية الآن'}
          >
            {triggerMutation.isPending || manualBackupStarted ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري النسخ...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                تشغيل الآن
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Backup History (collapsible) ── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-secondary/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-foreground-secondary" />
            <span className="text-sm font-semibold text-foreground">سجل النسخ الاحتياطية</span>
            {!historyLoading && (
              <span className="text-xs text-foreground-tertiary">({backups.length} سجل)</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showHistory && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); refetchHistory() }}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-foreground-tertiary hover:bg-surface-secondary transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                تحديث
              </button>
            )}
            {showHistory ? (
              <ChevronUp className="h-4 w-4 text-foreground-tertiary" />
            ) : (
              <ChevronDown className="h-4 w-4 text-foreground-tertiary" />
            )}
          </div>
        </button>

        {showHistory && (
          <div className="border-t border-border p-4">
            {historyLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : backups.length === 0 ? (
              <EmptyState title="لا توجد نسخ احتياطية" />
            ) : (
              <div className="space-y-2">
                {backups.map((backup) => (
                  <BackupListItem
                    key={backup.id}
                    backup={backup}
                    onCsvDownload={handleCsvDownload}
                    csvDownloading={csvDownloadingId === backup.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Restore History (collapsible) ── */}
      {(restoreHistoryLoading || restoreHistory.length > 0) && (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <button
            type="button"
            onClick={() => setShowRestoreHistory((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-secondary/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-foreground-secondary" />
              <span className="text-sm font-semibold text-foreground">سجل عمليات الاستعادة</span>
              {!restoreHistoryLoading && (
                <span className="text-xs text-foreground-tertiary">({restoreHistory.length} سجل)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {showRestoreHistory && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); refetchRestoreHistory() }}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-foreground-tertiary hover:bg-surface-secondary transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  تحديث
                </button>
              )}
              {showRestoreHistory ? (
                <ChevronUp className="h-4 w-4 text-foreground-tertiary" />
              ) : (
                <ChevronDown className="h-4 w-4 text-foreground-tertiary" />
              )}
            </div>
          </button>

          {showRestoreHistory && (
            <div className="border-t border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                  <tr>
                    <th className="text-right p-3 font-medium text-neutral-600 text-xs">التاريخ</th>
                    <th className="text-right p-3 font-medium text-neutral-600 text-xs">النسخة المُستعادة</th>
                    <th className="text-right p-3 font-medium text-neutral-600 text-xs">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {restoreHistory.map((entry: RestoreHistoryRecord, idx) => (
                    <tr key={entry.id} className={idx % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-neutral-50 dark:bg-neutral-800/30'}>
                      <td className="p-3 text-neutral-600 text-xs">
                        {entry.started_at ? formatDateWithHijri(entry.started_at) : '—'}
                      </td>
                      <td className="p-3 text-neutral-600 text-xs font-mono">
                        {entry.backup_id.slice(0, 8)}...
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          entry.status === 'completed'
                            ? 'bg-green-50 text-green-700'
                            : entry.status === 'failed'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {RESTORE_STATUS_AR[entry.status] ?? entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
