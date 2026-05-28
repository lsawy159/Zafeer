import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { BellOff, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { useSnoozedAlerts } from '@/hooks/useSnoozedAlerts'

interface AlertSnoozeModalProps {
  alertId: string
  alertTitle: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type SnoozeMode = '7-days' | '30-days' | 'date' | 'defer'

function endOfDayIsoFromDate(dateValue: string) {
  return new Date(`${dateValue}T23:59:59.999`).toISOString()
}

function futureDateInput(days: number) {
  const future = new Date()
  future.setDate(future.getDate() + days)
  return future.toISOString().slice(0, 10)
}

export function AlertSnoozeModal({
  alertId,
  alertTitle,
  open,
  onClose,
  onSuccess,
}: AlertSnoozeModalProps) {
  const { snoozeAlert } = useSnoozedAlerts()
  const [mode, setMode] = useState<SnoozeMode>('7-days')
  const [specificDate, setSpecificDate] = useState('')
  const [saving, setSaving] = useState(false)

  const minDate = useMemo(() => futureDateInput(1), [])

  const handleSave = async () => {
    const computedDate =
      mode === '7-days'
        ? futureDateInput(7)
        : mode === '30-days'
          ? futureDateInput(30)
          : mode === 'date'
            ? specificDate
            : ''

    if (mode === 'date' && !specificDate) {
      toast.error('اختر تاريخ التأجيل')
      return
    }

    setSaving(true)
    try {
      await snoozeAlert({
        alertId,
        snoozedUntil: mode === 'defer' ? null : new Date(endOfDayIsoFromDate(computedDate)),
        isDeferred: mode === 'defer',
      })
      toast.success(
        mode === 'defer'
          ? 'تم تأجيل التنبيه حتى يفعَّل يدوياً'
          : `تم تأجيل التنبيه حتى ${computedDate}`
      )
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل تأجيل التنبيه')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Clock className="h-5 w-5 text-primary" />
            تأجيل التنبيه
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm font-medium text-foreground">{alertTitle}</p>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-surface-secondary-50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              name="snooze-mode"
              value="7-days"
              checked={mode === '7-days'}
              onChange={() => setMode('7-days')}
              className="mt-0.5 accent-primary"
            />
            <div>
              <p className="font-medium text-foreground">7 أيام</p>
              <p className="text-xs text-foreground-tertiary">يعود التنبيه تلقائياً بعد أسبوع</p>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-surface-secondary-50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              name="snooze-mode"
              value="30-days"
              checked={mode === '30-days'}
              onChange={() => setMode('30-days')}
              className="mt-0.5 accent-primary"
            />
            <div>
              <p className="font-medium text-foreground">30 يوماً</p>
              <p className="text-xs text-foreground-tertiary">تأجيل أطول لوقت لاحق</p>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-surface-secondary-50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              name="snooze-mode"
              value="date"
              checked={mode === 'date'}
              onChange={() => setMode('date')}
              className="mt-0.5 accent-primary"
            />
            <div className="flex-1">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <Calendar className="h-4 w-4" />
                حتى تاريخ محدد
              </p>
              {mode === 'date' && (
                <Input
                  type="date"
                  value={specificDate}
                  min={minDate}
                  onChange={(event) => setSpecificDate(event.target.value)}
                  className="mt-2"
                />
              )}
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-surface-secondary-50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              name="snooze-mode"
              value="defer"
              checked={mode === 'defer'}
              onChange={() => setMode('defer')}
              className="mt-0.5 accent-primary"
            />
            <div>
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <BellOff className="h-4 w-4" />
                تعطيل حتى يفعَّل يدوياً
              </p>
              <p className="mt-0.5 text-xs text-foreground-tertiary">
                لا يعود التنبيه حتى يتم إلغاؤه يدوياً
              </p>
            </div>
          </label>
        </div>

        <DialogFooter className="flex-row-reverse gap-2">
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? 'جارٍ...' : 'تأكيد التأجيل'}
          </Button>
          <Button variant="secondary" onClick={onClose} size="sm">
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
