import { useState } from 'react'
import { toast } from 'sonner'
import { Trash2, Plus, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { calcAmount, validateAttendanceDays, type MatchedEmployee } from '@/utils/extractCalculations'
import { useCreateExtract } from '@/hooks/useExtracts'
import { useJobTitleRates } from '@/hooks/useJobTitleRates'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface StepPreviewExportProps {
  projectId: string
  periodMonth: string
  totalDaysInMonth: number
  initialRows: MatchedEmployee[]
}

interface EditableRow extends MatchedEmployee {
  _key: string
}

export default function StepPreviewExport({
  projectId,
  periodMonth,
  totalDaysInMonth,
  initialRows,
}: StepPreviewExportProps) {
  const [rows, setRows] = useState<EditableRow[]>(() =>
    initialRows
      .filter((r) => r.matchStatus === 'matched')
      .map((r, i) => ({ ...r, _key: `init-${i}` }))
  )
  const [showAddForm, setShowAddForm] = useState(false)
  const [addEmployeeId, setAddEmployeeId] = useState('')
  const [addDays, setAddDays] = useState<string>('')

  const createExtract = useCreateExtract()
  const { data: rates = [] } = useJobTitleRates(projectId)

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

  const existingEmployeeIds = new Set(rows.map((r) => r.employeeId).filter(Boolean))
  const availableEmployees = employees.filter((e) => !existingEmployeeIds.has(e.id))

  const rateByProfession = new Map(
    rates.map((r) => [r.profession.trim().toLowerCase(), Number(r.monthly_rate)])
  )

  const updateDays = (key: string, raw: string) => {
    const days = Number(raw)
    setRows((prev) =>
      prev.map((r) => {
        if (r._key !== key) return r
        const valid = validateAttendanceDays(days, totalDaysInMonth)
        const newAmount = valid ? calcAmount(r.monthlyRate, totalDaysInMonth, days) : r.amount
        return { ...r, attendanceDays: days, amount: newAmount }
      })
    )
  }

  const deleteRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r._key !== key))
  }

  const confirmAddLine = () => {
    const emp = employees.find((e) => e.id === addEmployeeId)
    if (!emp) return

    const profession = emp.profession?.trim() ?? ''
    const monthlyRate = rateByProfession.get(profession.toLowerCase()) ?? 0

    if (!monthlyRate) {
      toast.error(`لا يوجد سعر لمهنة "${profession || '—'}" — أضف السعر أولاً`)
      return
    }

    const days = Number(addDays)
    if (!validateAttendanceDays(days, totalDaysInMonth)) {
      toast.error(`أيام الحضور يجب أن تكون بين 0 و ${totalDaysInMonth}`)
      return
    }

    const newRow: EditableRow = {
      _key: `manual-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      residenceNumber: emp.residence_number ?? 0,
      profession,
      monthlyRate,
      attendanceDays: days,
      totalDaysInMonth,
      amount: calcAmount(monthlyRate, totalDaysInMonth, days),
      matchStatus: 'matched',
    }

    setRows((prev) => [...prev, newRow])
    setShowAddForm(false)
    setAddEmployeeId('')
    setAddDays('')
  }

  const handleCreate = () => {
    const invalidRows = rows.filter((r) => !validateAttendanceDays(r.attendanceDays, totalDaysInMonth))
    if (invalidRows.length > 0) {
      toast.error('يوجد أيام حضور غير صالحة — راجع الجدول')
      return
    }
    if (rows.length === 0) {
      toast.error('لا يوجد موظفون في المستخلص')
      return
    }

    createExtract.mutate({
      projectId,
      periodMonth,
      totalDays: totalDaysInMonth,
      lines: rows,
    })
  }

  const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0)

  const selectedEmp = employees.find((e) => e.id === addEmployeeId)
  const selectedProfession = selectedEmp?.profession?.trim() ?? ''
  const selectedRate = rateByProfession.get(selectedProfession.toLowerCase()) ?? 0

  return (
    <div className="space-y-4" dir="rtl">
      <p className="text-sm text-slate-600">راجع بيانات المستخلص قبل الإنشاء — يمكن تعديل أيام الحضور وإضافة سطور يدوية</p>

      {/* جدول المراجعة */}
      <div className="overflow-y-auto max-h-72 rounded-lg border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="py-2 px-2 text-right text-slate-600 font-medium">الاسم</th>
              <th className="py-2 px-2 text-right text-slate-600 font-medium">المهنة</th>
              <th className="py-2 px-2 text-center text-slate-600 font-medium">السعر الشهري</th>
              <th className="py-2 px-2 text-center text-slate-600 font-medium">الأيام</th>
              <th className="py-2 px-2 text-right text-slate-600 font-medium">المستحق (ريال)</th>
              <th className="py-2 px-1 w-7" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const daysInvalid = !validateAttendanceDays(row.attendanceDays, totalDaysInMonth)
              return (
                <tr key={row._key} className={`border-t border-slate-100 ${daysInvalid ? 'bg-red-50' : ''}`}>
                  <td className="py-1.5 px-2 text-slate-700">{row.employeeName}</td>
                  <td className="py-1.5 px-2 text-slate-500">{row.profession || '—'}</td>
                  <td className="py-1.5 px-2 text-center font-mono text-slate-600">
                    {row.monthlyRate.toLocaleString('en-US')}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <Input
                      type="number"
                      value={row.attendanceDays}
                      onChange={(e) => updateDays(row._key, e.target.value)}
                      min={0}
                      max={totalDaysInMonth}
                      className={`h-6 w-14 text-center text-xs mx-auto ${daysInvalid ? 'border-red-400' : ''}`}
                    />
                  </td>
                  <td className={`py-1.5 px-2 font-mono ${daysInvalid ? 'text-red-600' : 'text-slate-700'}`}>
                    {daysInvalid ? '—' : row.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1.5 px-1">
                    <button
                      onClick={() => deleteRow(row._key)}
                      className="text-slate-400 hover:text-red-500 transition"
                      title="حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              )
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">لا يوجد موظفون — أضف سطوراً يدوية</td>
              </tr>
            )}

            {/* صف الإجماليات */}
            {rows.length > 0 && (
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-medium">
                <td className="py-2 px-2 text-slate-700" colSpan={2}>{rows.length} موظف</td>
                <td />
                <td className="py-2 px-2 text-center text-slate-600 text-xs">
                  {rows.reduce((s, r) => s + r.attendanceDays, 0)} يوم
                </td>
                <td className="py-2 px-2 font-mono text-slate-800">
                  {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ريال
                </td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* إضافة سطر يدوي */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          disabled={availableEmployees.length === 0}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="h-3.5 w-3.5" />
          إضافة سطر يدوي
          {availableEmployees.length === 0 && ' (جميع الموظفين مُضافون)'}
        </button>
      ) : (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
          <p className="text-xs font-medium text-slate-700">إضافة موظف يدوياً</p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">الموظف</label>
              <select
                value={addEmployeeId}
                onChange={(e) => setAddEmployeeId(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">— اختر موظفاً —</option>
                {availableEmployees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="text-xs text-slate-500 mb-1 block">الأيام</label>
              <Input
                type="number"
                value={addDays}
                onChange={(e) => setAddDays(e.target.value)}
                min={0}
                max={totalDaysInMonth}
                placeholder={String(totalDaysInMonth)}
                className="h-8 text-center text-xs"
              />
            </div>
          </div>

          {addEmployeeId && (
            <div className="text-xs text-slate-500">
              المهنة: <span className="text-slate-700">{selectedProfession || '—'}</span>
              {' | '}
              السعر: {' '}
              {selectedRate ? (
                <span className="text-slate-700 font-mono">{selectedRate.toLocaleString('en-US')} ريال/شهر</span>
              ) : (
                <span className="text-red-600 flex items-center gap-1 inline-flex">
                  <AlertTriangle className="h-3 w-3" />بلا سعر — لن يمكن الإضافة
                </span>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={confirmAddLine}
              disabled={!addEmployeeId || !selectedRate}
              className="px-3 py-1.5 text-xs bg-primary text-white rounded-md hover:bg-primary/90 transition disabled:opacity-50"
            >
              إضافة
            </button>
            <button
              onClick={() => { setShowAddForm(false); setAddEmployeeId(''); setAddDays('') }}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-md hover:bg-slate-50 transition"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* إنشاء مسودة */}
      <button
        onClick={handleCreate}
        disabled={createExtract.isPending || rows.length === 0}
        className="w-full py-2 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition disabled:opacity-50"
      >
        {createExtract.isPending ? 'جاري الإنشاء...' : 'إنشاء مسودة المستخلص'}
      </button>

      <p className="text-xs text-slate-400 text-center">
        التصدير الفعلي يتم بعد مراجعة المستخلص في صفحة التفاصيل
      </p>
    </div>
  )
}
