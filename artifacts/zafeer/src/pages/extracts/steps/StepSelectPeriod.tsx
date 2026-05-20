import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { useExtracts } from '@/hooks/useExtracts'

interface StepSelectPeriodProps {
  projectId: string
  periodMonth: string | null        // 'YYYY-MM-01'
  totalDays: number | null
  onSelect: (periodMonth: string, totalDays: number) => void
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export default function StepSelectPeriod({
  projectId,
  periodMonth,
  totalDays,
  onSelect,
}: StepSelectPeriodProps) {
  const now = new Date()
  const [year, setYear] = useState(periodMonth ? parseInt(periodMonth.slice(0, 4)) : now.getFullYear())
  const [month, setMonth] = useState(periodMonth ? parseInt(periodMonth.slice(5, 7)) : now.getMonth() + 1)
  const [daysOverride, setDaysOverride] = useState<number>(
    totalDays ?? getDaysInMonth(year, month)
  )

  const { data: allExtracts = [] } = useExtracts()

  const selectedPeriod = `${year}-${String(month).padStart(2, '0')}-01`
  const autoCalcDays = getDaysInMonth(year, month)

  const existingVersions = allExtracts.filter(
    (e) => e.project_id === projectId && e.period_month === selectedPeriod
  )

  useEffect(() => {
    setDaysOverride(getDaysInMonth(year, month))
  }, [year, month])

  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ]

  const handleConfirm = () => {
    onSelect(selectedPeriod, daysOverride)
  }

  return (
    <div className="space-y-4" dir="rtl">
      <p className="text-sm text-slate-600">اختر شهر المستخلص وتأكيد عدد أيامه</p>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-slate-500 mb-1 block">الشهر</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {months.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div className="w-28">
          <label className="text-xs text-slate-500 mb-1 block">السنة</label>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-9 text-center"
            min={2020}
            max={2100}
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-500 mb-1 block">
          عدد أيام الشهر (محسوب تلقائياً: {autoCalcDays})
        </label>
        <Input
          type="number"
          value={daysOverride}
          onChange={(e) => setDaysOverride(Number(e.target.value))}
          min={1}
          max={31}
          className="h-9 w-24 text-center"
        />
        <p className="text-xs text-slate-400 mt-1">يمكن تعديله للشهور ذات الأيام الجزئية</p>
      </div>

      {existingVersions.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">يوجد {existingVersions.length} مستخلص سابق لهذا الشهر</p>
            <p className="text-xs mt-0.5">المتابعة ستنشئ نسخة جديدة (v{existingVersions.length + 1})</p>
          </div>
        </div>
      )}

      <div className="pt-2">
        <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700">
          <span className="font-medium">الفترة المختارة: </span>
          {months[month - 1]} {year} — {daysOverride} يوم
        </div>
      </div>

      <button
        onClick={handleConfirm}
        disabled={daysOverride <= 0 || daysOverride > 31}
        className="w-full py-2 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition disabled:opacity-50"
      >
        تأكيد الفترة
      </button>
    </div>
  )
}
