import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useJobTitleRates } from '@/hooks/useJobTitleRates'

interface StepReviewEmployeesProps {
  projectId: string
  onProceed: () => void
  onGoToRates: () => void
}

export default function StepReviewEmployees({
  projectId,
  onProceed,
  onGoToRates,
}: StepReviewEmployeesProps) {
  const { data: employees = [], isLoading: empLoading } = useQuery({
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

  const { data: rates = [], isLoading: ratesLoading } = useJobTitleRates(projectId)

  const rateByProfession = new Map(
    rates.map((r) => [r.profession.trim().toLowerCase(), r.monthly_rate])
  )

  const analyzed = employees.map((emp) => {
    const profession = emp.profession?.trim() ?? null
    const hasResidence = !!emp.residence_number
    const hasProfession = !!profession
    const hasRate = profession ? rateByProfession.has(profession.toLowerCase()) : false

    let status: 'ok' | 'no_rate' | 'no_profession' | 'no_residence'
    if (!hasResidence) status = 'no_residence'
    else if (!hasProfession) status = 'no_profession'
    else if (!hasRate) status = 'no_rate'
    else status = 'ok'

    return { ...emp, profession, hasResidence, hasProfession, hasRate, status }
  })

  const problems = analyzed.filter((e) => e.status !== 'ok')
  const hasBlockingIssues = analyzed.some((e) => e.status === 'no_residence')

  if (empLoading || ratesLoading) {
    return <div className="py-8 text-center text-slate-500">جاري التحميل...</div>
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {employees.length} موظف نشط في المشروع
        </p>
        {problems.some((p) => p.status === 'no_rate') && (
          <button
            onClick={onGoToRates}
            className="text-xs text-primary underline hover:no-underline"
          >
            اذهب لأسعار المهن
          </button>
        )}
      </div>

      {/* جدول الموظفين */}
      <div className="overflow-y-auto max-h-72 rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="py-2 px-3 text-right font-medium text-slate-600">الاسم</th>
              <th className="py-2 px-3 text-right font-medium text-slate-600">المهنة</th>
              <th className="py-2 px-3 text-center font-medium text-slate-600">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {analyzed.map((emp) => (
              <tr key={emp.id} className="border-t border-slate-100">
                <td className="py-2 px-3 text-slate-700">{emp.name}</td>
                <td className="py-2 px-3 text-slate-600">{emp.profession ?? '—'}</td>
                <td className="py-2 px-3 text-center">
                  {emp.status === 'ok' && <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />}
                  {emp.status === 'no_rate' && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                      <AlertTriangle className="h-3.5 w-3.5" />بلا سعر
                    </span>
                  )}
                  {emp.status === 'no_profession' && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                      <AlertTriangle className="h-3.5 w-3.5" />بلا مهنة
                    </span>
                  )}
                  {emp.status === 'no_residence' && (
                    <span className="inline-flex items-center gap-1 text-xs text-red-600">
                      <XCircle className="h-3.5 w-3.5" />بلا إقامة
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* تحذيرات */}
      {problems.length > 0 && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-lg">
          {problems.filter((p) => p.status === 'no_rate' || p.status === 'no_profession').length > 0 && (
            <p>⚠️ موظفون بلا سعر/مهنة سيُسجَّلون برسوم صفر في المستخلص</p>
          )}
          {problems.filter((p) => p.status === 'no_residence').length > 0 && (
            <p>✗ موظفون بلا رقم إقامة لن يظهروا في مطابقة ملف الحضور</p>
          )}
        </div>
      )}

      <button
        onClick={onProceed}
        disabled={hasBlockingIssues && employees.length === 0}
        className="w-full py-2 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition disabled:opacity-50"
      >
        التالي — رفع ملف الحضور
      </button>
    </div>
  )
}
