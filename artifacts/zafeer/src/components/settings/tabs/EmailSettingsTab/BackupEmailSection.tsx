import { Mail, RefreshCw, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import type { BackupRecord } from '@/lib/backupService'
import type { SettingsSectionLoadState } from '@/components/settings/tabs/settingsSectionState'
import type { useEmailSettings } from './useEmailSettings'

function formatBackupType(type: string): string {
  switch (type) {
    case 'full': return 'نسخة كاملة'
    case 'scheduled': return 'نسخة تلقائية'
    case 'pre-restore-snapshot': return 'Snapshot وقائي'
    default: return type
  }
}

function formatBackupSize(bytes: number): string {
  return `${bytes.toLocaleString('ar-SA')} بايت`
}

type Ctx = ReturnType<typeof useEmailSettings>

interface Props {
  recentBackups: BackupRecord[]
  recentBackupsState: SettingsSectionLoadState
  setBackupEmailModalTarget: Ctx['setBackupEmailModalTarget']
  loadRecentBackups: Ctx['loadRecentBackups']
}

export function BackupEmailSection({
  recentBackups, recentBackupsState, setBackupEmailModalTarget, loadRecentBackups,
}: Props) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Send className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">إرسال النسخة الاحتياطية بالبريد</h2>
            <p className="text-xs text-foreground-tertiary">آخر 10 نسخ مكتملة مع زر إرسال مباشر</p>
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
                  <h3 className="font-medium text-foreground">{formatBackupType(backup.backup_type)}</h3>
                  <Badge variant="outline">{backup.status}</Badge>
                </div>
                <p className="text-sm text-foreground-secondary">
                  {backup.completed_at
                    ? new Date(backup.completed_at).toLocaleDateString('ar-SA')
                    : new Date(backup.started_at).toLocaleDateString('ar-SA')}
                </p>
                <p className="text-xs text-foreground-tertiary">{formatBackupSize(backup.file_size)}</p>
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
  )
}
