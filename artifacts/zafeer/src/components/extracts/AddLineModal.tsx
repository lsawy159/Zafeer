import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useJobTitleRates } from '@/hooks/useJobTitleRates'
import { useAddExtractLine } from '@/hooks/useExtractLines'
import type { ExtractInvoiceLine } from '@/hooks/useExtracts'

interface AddLineModalProps {
  invoiceId: string
  projectId: string
  totalDaysInMonth: number
  existingLines: ExtractInvoiceLine[]
  onClose: () => void
}

export default function AddLineModal({
  invoiceId,
  projectId,
  totalDaysInMonth,
  existingLines,
  onClose,
}: AddLineModalProps) {
  const [employeeId, setEmployeeId] = useState('')
  const [days, setDays] = useState<string>('')

  const addLine = useAddExtractLine(invoiceId, projectId, totalDaysInMonth)

  const { data: employees = [] } = useQuery({
    queryKey: ['projectEmployeesActive', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, profession, residence_number')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('name')
      if (error) throw error
      return (data ?? []) as { id: string; name: string; profession: string | null; residence_number: number | null }[]
    },
    enabled: !!projectId,
  })

  const { data: rates = [] } = useJobTitleRates(projectId)

  const existingEmployeeIds = new Set(
    existingLines.map((l) => l.employee_id).filter(Boolean)
  )
  const available = employees.filter((e) => !existingEmployeeIds.has(e.id))

  const selectedEmp = employees.find((e) => e.id === employeeId)
  const selectedProfession = selectedEmp?.profession?.trim() ?? ''
  const rateByProfession = new Map(
    rates.map((r) => [r.profession.trim().toLowerCase(), Number(r.monthly_rate)])
  )
  const selectedRate = rateByProfession.get(selectedProfession.toLowerCase()) ?? 0

  const daysNum = Number(days)
  const daysValid = days !== '' && Number.isInteger(daysNum) && daysNum >= 0 && daysNum <= totalDaysInMonth

  const canSubmit = !!employeeId && selectedRate > 0 && daysValid && !addLine.isPending

  const handleSubmit = () => {
    if (!canSubmit) return
    addLine.mutate(
      { employeeId, attendanceDays: daysNum },
      {
        onSuccess: () => {
          toast.success('تمت إضافة السطر')
          onClose()
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'فشلت الإضافة')
        },
      }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">إضافة سطر يدوي</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">الموظف</label>
            {available.length === 0 ? (
              <p className="text-sm text-slate-500 py-2">جميع موظفي المشروع موجودون في المستخلص</p>
            ) : (
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">— اختر موظفاً —</option>
                {available.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            )}
          </div>

          {employeeId && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">المهنة:</span>
                <span>{selectedProfession || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">السعر الشهري:</span>
                {selectedRate ? (
                  <span className="font-mono">{selectedRate.toLocaleString('ar-SA')} ريال</span>
                ) : (
                  <span className="text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    بلا سعر
                  </span>
                )}
              </div>
            </div>
          )}

          {employeeId && !selectedRate && (
            <p className="text-xs text-red-600">
              مهنة هذا الموظف ليس لها سعر في المشروع — أضف السعر أولاً من تفاصيل المشروع
            </p>
          )}

          <div>
            <label className="text-xs text-slate-500 mb-1 block">
              أيام الحضور (0 — {totalDaysInMonth})
            </label>
            <Input
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              min={0}
              max={totalDaysInMonth}
              className="h-9 w-32 text-center"
              placeholder={String(totalDaysInMonth)}
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
          >
            {addLine.isPending ? 'جاري الإضافة...' : 'إضافة'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}
