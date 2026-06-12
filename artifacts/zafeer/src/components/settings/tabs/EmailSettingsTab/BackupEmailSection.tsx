import { useState } from 'react'
import { Mail, RefreshCw, Send, X } from 'lucide-react'
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
  return `${bytes.toLocaleString('en-US')} بايت`
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
  const [open, setOpen] = useState(false)

  const handleOpen = () => {
    loadRecentBackups()
    setOpen(true)
  }

  return (
    <>
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">إرسال النسخة الاحتياطية بالبريد</h2>
              <p className="text-xs text-foreground-tertiary">آخر 10 نسخ مكتملة مع زر إرسال مباشر</p>
            </div>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={handleOpen}>
            <Mail className="h-4 w-4" />
            عرض النسخ
          </Button>
        </div>
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-xl"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold text-foreground">النسخ الاحتياطية</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { loadRecentBackups() }}
                >
                  <RefreshCw className="h-4 w-4" />
                  تحديث
                </Button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-foreground-tertiary hover:bg-surface-secondary transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-[60vh] overflow-y-auto p-5">
              {recentBackupsState.status === 'loading' ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : recentBackupsState.status === 'degraded' ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    {recentBackupsState.userMessage ?? 'تعذر تحميل سجل النسخ الاحتياطية'}
                  </p>
                </div>
              ) : recentBackups.length === 0 ? (
                <p className="py-8 text-center text-sm text-foreground-tertiary">لا توجد نسخ احتياطية مكتملة</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="pb-2 text-right text-xs font-medium text-foreground-tertiary">النوع</th>
                      <th className="pb-2 text-right text-xs font-medium text-foreground-tertiary">التاريخ</th>
                      <th className="pb-2 text-right text-xs font-medium text-foreground-tertiary">الحجم</th>
                      <th className="pb-2 text-right text-xs font-medium text-foreground-tertiary">الحالة</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {recentBackups.map((backup) => (
                      <tr key={backup.id} className="hover:bg-surface-secondary/40 transition-colors">
                        <td className="py-3 font-medium text-foreground">{formatBackupType(backup.backup_type)}</td>
                        <td className="py-3 text-foreground-secondary">
                          {backup.completed_at
                            ? new Date(backup.completed_at).toLocaleDateString('ar-SA')
                            : new Date(backup.started_at).toLocaleDateString('ar-SA')}
                        </td>
                        <td className="py-3 text-xs text-foreground-tertiary">{formatBackupSize(backup.file_size)}</td>
                        <td className="py-3">
                          <Badge variant="outline">{backup.status}</Badge>
                        </td>
                        <td className="py-3 text-left">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => { setBackupEmailModalTarget(backup); setOpen(false) }}
                          >
                            <Mail className="h-3.5 w-3.5" />
                            إرسال
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
