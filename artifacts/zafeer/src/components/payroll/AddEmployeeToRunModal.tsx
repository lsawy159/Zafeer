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
import { useScopedPayrollEmployees } from '@/hooks/usePayrollEntries'
import { useAddPayrollRunEmployee } from '@/hooks/usePayrollRuns'
import type { PayrollScopeType } from '@/lib/supabase'

interface AddEmployeeToRunModalProps {
  runId: string
  payrollMonth: string
  scopeType: PayrollScopeType
  scopeId: string
  existingEmployeeIds: string[]
  open: boolean
  onClose: () => void
}

export default function AddEmployeeToRunModal({
  runId,
  payrollMonth,
  scopeType,
  scopeId,
  existingEmployeeIds,
  open,
  onClose,
}: AddEmployeeToRunModalProps) {
  const mutation = useAddPayrollRunEmployee()
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [search, setSearch] = useState('')

  const { data: allEmployees = [], isLoading } = useScopedPayrollEmployees(
    scopeType,
    scopeId,
    payrollMonth
  )

  const availableEmployees = allEmployees.filter(
    (e) => !existingEmployeeIds.includes(e.id)
  )

  const filteredEmployees = search
    ? availableEmployees.filter(
        (e) =>
          e.name.includes(search) ||
          String(e.residence_number ?? '').includes(search)
      )
    : availableEmployees

  const handleAdd = async () => {
    if (!selectedEmployeeId) return
    try {
      await mutation.mutateAsync({ runId, employeeId: selectedEmployeeId })
      toast.success('تمت إضافة الموظف للمسير')
      setSelectedEmployeeId('')
      setSearch('')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ أثناء إضافة الموظف')
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !mutation.isPending) {
      setSelectedEmployeeId('')
      setSearch('')
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>إضافة موظف للمسير</DialogTitle>
          <DialogDescription>
            اختر موظفاً من نطاق المسير لإضافته. سيتم احتساب الراتب والأقساط تلقائياً.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : availableEmployees.length === 0 ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              لا يوجد موظفون آخرون في هذا النطاق
            </p>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                  بحث عن موظف
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="الاسم أو رقم الإقامة..."
                  className="w-full rounded-xl border border-border-200 bg-surface px-3 py-2 text-sm"
                  disabled={mutation.isPending}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground-secondary">
                  الموظف
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full rounded-xl border border-border-200 bg-surface px-3 py-2 text-sm"
                  disabled={mutation.isPending}
                  size={Math.min(filteredEmployees.length + 1, 8)}
                >
                  <option value="">اختر موظفاً...</option>
                  {filteredEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.residence_number}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button
            type="button"
            onClick={() => void handleAdd()}
            disabled={!selectedEmployeeId || mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="ml-1 h-4 w-4 animate-spin" />
                جاري الإضافة...
              </>
            ) : (
              'إضافة'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={mutation.isPending}
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
