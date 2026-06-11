import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useUpdatePayrollRunMonth } from '@/hooks/usePayrollRuns'

interface EditPayrollMonthModalProps {
  runId: string
  currentMonth: string
  open: boolean
  onClose: () => void
}

export default function EditPayrollMonthModal({
  runId,
  currentMonth,
  open,
  onClose,
}: EditPayrollMonthModalProps) {
  const mutation = useUpdatePayrollRunMonth()
  // currentMonth is YYYY-MM-DD — convert to YYYY-MM for the input
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.slice(0, 7))

  const currentMonthYM = currentMonth.slice(0, 7)
  const isSame = selectedMonth === currentMonthYM || !selectedMonth

  const handleSubmit = async () => {
    if (isSame) return
    try {
      await mutation.mutateAsync({ runId, newMonth: `${selectedMonth}-01` })
      toast.success('تم تغيير الشهر بنجاح')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ أثناء تغيير الشهر')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !mutation.isPending) onClose() }}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>تعديل شهر المسير</DialogTitle>
          <DialogDescription>
            اختر الشهر الجديد. سيتم إعادة حساب الأقساط تلقائياً لكل موظف.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-secondary">
              اختر الشهر الجديد
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-xl border border-border-200 bg-surface px-3 py-2 text-sm"
              disabled={mutation.isPending}
            />
          </div>
          {isSame && selectedMonth && (
            <p className="text-xs text-amber-600">الشهر هو نفسه الحالي</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSame || mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="ml-1 h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              'حفظ'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
