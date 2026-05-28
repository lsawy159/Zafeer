import { useState } from 'react'
import { toast } from 'sonner'
import { BellOff, Clock } from 'lucide-react'
import { supabase, type Notification } from '@/lib/supabase'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface DeferredNotificationModalProps {
  notification: Notification
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type SnoozeMode = 'date' | 'defer'

export function DeferredNotificationModal({
  notification,
  open,
  onClose,
  onSuccess,
}: DeferredNotificationModalProps) {
  const [mode, setMode] = useState<SnoozeMode>('date')
  const [snoozeDate, setSnoozeDate] = useState('')
  const [saving, setSaving] = useState(false)

  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]

  const handleSave = async () => {
    if (mode === 'date' && !snoozeDate) {
      toast.error('اختر تاريخ التأجيل')
      return
    }

    setSaving(true)
    try {
      const updates =
        mode === 'defer'
          ? { is_deferred: true, snoozed_until: null }
          : { snoozed_until: new Date(`${snoozeDate}T23:59:59.999`).toISOString(), is_deferred: false }

      const { error } = await supabase
        .from('notifications')
        .update(updates)
        .eq('id', notification.id)

      if (error) throw error

      toast.success(
        mode === 'defer'
          ? 'تم تعطيل الإشعار حتى يفعَّل يدوياً'
          : `تم التأجيل حتى ${snoozeDate}`
      )
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل التأجيل')
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
            تأجيل الإشعار
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 text-sm text-foreground-secondary">
          <p className="mb-4 font-medium text-foreground">{notification.title}</p>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer rounded-xl border p-3 transition-colors hover:bg-surface-secondary-50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input
                type="radio"
                name="snooze-mode"
                value="date"
                checked={mode === 'date'}
                onChange={() => setMode('date')}
                className="mt-0.5 accent-primary"
              />
              <div className="flex-1">
                <p className="font-medium text-foreground">تأجيل حتى تاريخ محدد</p>
                {mode === 'date' && (
                  <Input
                    type="date"
                    value={snoozeDate}
                    min={minDateStr}
                    onChange={(event) => setSnoozeDate(event.target.value)}
                    className="mt-2"
                  />
                )}
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer rounded-xl border p-3 transition-colors hover:bg-surface-secondary-50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
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
                  لن يظهر في القائمة النشطة ولن يرسل في الإشعار حتى إعادة التفعيل
                </p>
              </div>
            </label>
          </div>
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
