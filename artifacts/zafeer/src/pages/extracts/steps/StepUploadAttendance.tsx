import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Upload, Download, AlertTriangle, Table } from 'lucide-react'
import { saveAs } from 'file-saver'
import { loadXlsx } from '@/utils/lazyXlsx'
import { Input } from '@/components/ui/Input'
import {
  ATTENDANCE_TEMPLATE_COLUMNS,
  normalizeAttendanceRow,
  matchAttendanceToEmployees,
  validateAttendanceDays,
  calcAmount,
  type AttendanceRow,
  type MatchedEmployee,
} from '@/utils/extractCalculations'
import AttendanceMatchSummary from '@/pages/extracts/components/AttendanceMatchSummary'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useJobTitleRates } from '@/hooks/useJobTitleRates'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB

type Mode = 'excel' | 'manual'

interface StepUploadAttendanceProps {
  projectId: string
  projectName: string
  totalDaysInMonth: number
  onMatchComplete: (rows: MatchedEmployee[]) => void
}

export default function StepUploadAttendance({
  projectId,
  projectName,
  totalDaysInMonth,
  onMatchComplete,
}: StepUploadAttendanceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<Mode>('excel')
  const [matchResult, setMatchResult] = useState<MatchedEmployee[] | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [manualDays, setManualDays] = useState<Record<string, string>>({})

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

  const rateByProfession = new Map(
    rates.map((r) => [r.profession.trim().toLowerCase(), Number(r.monthly_rate)])
  )

  // ——— Excel mode ———

  const downloadTemplate = async () => {
    const xlsx = await loadXlsx()
    const headers = [
      ATTENDANCE_TEMPLATE_COLUMNS.residenceNumber,
      ATTENDANCE_TEMPLATE_COLUMNS.employeeName,
      ATTENDANCE_TEMPLATE_COLUMNS.attendanceDays,
    ]
    const rows = employees.map((emp) => [emp.residence_number ?? '', emp.name, ''])
    const ws = xlsx.utils.aoa_to_sheet([headers, ...rows])
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, 'حضور')
    const buf = xlsx.write(wb, { type: 'array', bookType: 'xlsx' })
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `قالب-حضور-${projectName}.xlsx`)
    toast.success('تم تحميل القالب')
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      toast.error('حجم الملف يتجاوز 20 ميغابايت')
      e.target.value = ''
      return
    }

    setIsParsing(true)
    try {
      const xlsx = await loadXlsx()
      const buf = await file.arrayBuffer()
      const wb = xlsx.read(buf)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rawRows = xlsx.utils.sheet_to_json(ws) as Record<string, unknown>[]

      const parsed: AttendanceRow[] = rawRows
        .map(normalizeAttendanceRow)
        .filter((r): r is AttendanceRow => r !== null)

      if (parsed.length === 0) {
        toast.error('الملف فارغ أو لا يحتوي بيانات صالحة')
        e.target.value = ''
        return
      }

      const empForMatch = employees.map((emp) => ({
        id: emp.id,
        name: emp.name,
        residence_number: emp.residence_number ?? 0,
        profession: emp.profession,
      }))
      const ratesForMatch = rates.map((r) => ({ profession: r.profession, monthly_rate: r.monthly_rate }))
      const result = matchAttendanceToEmployees(parsed, empForMatch, ratesForMatch, totalDaysInMonth)
      setMatchResult(result)
      toast.success(`تم معالجة ${parsed.length} صف`)
    } catch {
      toast.error('فشل قراءة الملف — تأكد من أنه ملف Excel صالح')
    } finally {
      setIsParsing(false)
      e.target.value = ''
    }
  }

  // ——— Manual mode ———

  const handleManualDayChange = (empId: string, val: string) => {
    setManualDays((prev) => ({ ...prev, [empId]: val }))
    setMatchResult(null)
  }

  const handleManualConfirm = () => {
    const empForMatch = employees.map((emp) => ({
      id: emp.id,
      name: emp.name,
      residence_number: emp.residence_number ?? 0,
      profession: emp.profession,
    }))
    const ratesForMatch = rates.map((r) => ({ profession: r.profession, monthly_rate: r.monthly_rate }))

    const rows: AttendanceRow[] = employees
      .filter((emp) => emp.residence_number)
      .map((emp) => {
        const raw = manualDays[emp.id]
        const days = raw !== undefined && raw !== '' ? Number(raw) : totalDaysInMonth
        return {
          residenceNumber: emp.residence_number!,
          employeeName: emp.name,
          attendanceDays: days,
        }
      })

    if (rows.length === 0) {
      toast.error('لا يوجد موظفون بأرقام إقامة')
      return
    }

    const result = matchAttendanceToEmployees(rows, empForMatch, ratesForMatch, totalDaysInMonth)
    setMatchResult(result)
  }

  // ——— Shared ———

  const hasInvalidDays = matchResult?.some((r) => r.matchStatus === 'invalid_days') ?? false
  const canProceed = matchResult !== null && !hasInvalidDays

  return (
    <div className="space-y-4" dir="rtl">
      <p className="text-sm text-slate-600">أدخل بيانات الحضور عبر رفع ملف Excel أو الإدخال اليدوي</p>

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          onClick={() => { setMode('excel'); setMatchResult(null) }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
            mode === 'excel' ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Upload className="h-4 w-4" />
          رفع ملف Excel
        </button>
        <button
          onClick={() => { setMode('manual'); setMatchResult(null) }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
            mode === 'manual' ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Table className="h-4 w-4" />
          إدخال يدوي
        </button>
      </div>

      {/* Excel mode */}
      {mode === 'excel' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition"
            >
              <Download className="h-4 w-4" />
              تحميل قالب الحضور
            </button>
            <span className="text-xs text-slate-400">{employees.length} موظف في القالب</span>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              {isParsing ? 'جاري المعالجة...' : 'رفع ملف الحضور'}
            </button>
            <p className="text-xs text-slate-400 mt-1">الحد الأقصى: 20 ميغابايت | xlsx, xls</p>
          </div>
        </div>
      )}

      {/* Manual mode */}
      {mode === 'manual' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            أدخل عدد أيام الحضور لكل موظف — القيمة الافتراضية هي عدد أيام الشهر ({totalDaysInMonth})
          </p>

          <div className="overflow-y-auto max-h-72 rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="py-2 px-3 text-right font-medium text-slate-600">الموظف</th>
                  <th className="py-2 px-3 text-right font-medium text-slate-600">المهنة</th>
                  <th className="py-2 px-3 text-center font-medium text-slate-600">
                    الأيام (من {totalDaysInMonth})
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400">لا يوجد موظفون نشطون</td>
                  </tr>
                )}
                {employees.map((emp) => {
                  const val = manualDays[emp.id] ?? ''
                  const days = val !== '' ? Number(val) : totalDaysInMonth
                  const invalid = val !== '' && !validateAttendanceDays(Number(val), totalDaysInMonth)
                  const profession = emp.profession?.trim() ?? ''
                  const rate = rateByProfession.get(profession.toLowerCase()) ?? 0
                  const amount = rate && !invalid ? calcAmount(rate, totalDaysInMonth, days) : null

                  return (
                    <tr key={emp.id} className={`border-t border-slate-100 ${invalid ? 'bg-red-50' : ''}`}>
                      <td className="py-2 px-3">
                        <div className="text-slate-800">{emp.name}</div>
                        {!emp.residence_number && (
                          <div className="text-xs text-amber-500 flex items-center gap-0.5 mt-0.5">
                            <AlertTriangle className="h-3 w-3" /> بلا رقم إقامة
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-xs">{profession || '—'}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2 justify-center">
                          <Input
                            type="number"
                            value={val}
                            onChange={(e) => handleManualDayChange(emp.id, e.target.value)}
                            min={0}
                            max={totalDaysInMonth}
                            placeholder={String(totalDaysInMonth)}
                            className={`h-7 w-16 text-center text-xs ${invalid ? 'border-red-400' : ''}`}
                          />
                          {amount !== null && (
                            <span className="text-xs font-mono text-slate-500">
                              {amount.toLocaleString('ar-SA', { minimumFractionDigits: 0 })} ريال
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleManualConfirm}
            disabled={employees.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition disabled:opacity-60"
          >
            معاينة النتائج
          </button>
        </div>
      )}

      {/* Match results */}
      {matchResult && (
        <>
          <AttendanceMatchSummary rows={matchResult} totalDaysInMonth={totalDaysInMonth} />

          {hasInvalidDays && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              يجب تصحيح أيام الحضور قبل المتابعة
            </div>
          )}

          <button
            onClick={() => onMatchComplete(matchResult)}
            disabled={!canProceed}
            className="w-full py-2 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition disabled:opacity-50"
          >
            التالي — معاينة المستخلص
          </button>
        </>
      )}
    </div>
  )
}
