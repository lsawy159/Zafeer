import { Bell, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import type { useEmailSettings } from './useEmailSettings'

type Ctx = ReturnType<typeof useEmailSettings>

interface Props {
  queueStats: Ctx['queueStats']
  queueStatsLoading: Ctx['queueStatsLoading']
  queueStatsError: Ctx['queueStatsError']
  loadQueueStats: Ctx['loadQueueStats']
}

export function QueueStatsSection({ queueStats, queueStatsLoading, queueStatsError, loadQueueStats }: Props) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">حالة طابور الإيميلات</h2>
            <p className="text-xs text-foreground-tertiary">pending / sent / failed</p>
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
  )
}
