import { useState, useMemo } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatDateDDMMMYYYY as formatDate } from '@/utils/dateFormatter'
import { useProjects } from '@/hooks/useProjects'

interface PayrollEntrySearchRow {
  id: string
  employee_name_snapshot: string
  project_name_snapshot: string | null
  payroll_month: string
  gross_amount: number
  net_amount: number
  installment_deducted_amount: number
  entry_status: string
  attendance_days: number
}

function usePayrollEntriesSearch(month: string, projectSearch: string) {
  return useQuery({
    queryKey: ['payroll-entries-search', month, projectSearch],
    queryFn: async () => {
      let q = supabase
        .from('payroll_entries')
        .select(
          'id,employee_name_snapshot,project_name_snapshot,gross_amount,net_amount,installment_deducted_amount,entry_status,attendance_days,payroll_run:payroll_runs(payroll_month)'
        )
        .order('employee_name_snapshot', { ascending: true })
        .limit(300)

      if (month) {
        // filter by joining payroll_runs.payroll_month
      }

      const { data, error } = await q
      if (error) throw error

      return (data ?? []).map((row) => {
        const run = Array.isArray(row.payroll_run) ? row.payroll_run[0] : row.payroll_run
        return {
          id: row.id as string,
          employee_name_snapshot: row.employee_name_snapshot as string,
          project_name_snapshot: row.project_name_snapshot as string | null,
          payroll_month: (run as { payroll_month?: string } | null)?.payroll_month ?? '',
          gross_amount: Number(row.gross_amount) || 0,
          net_amount: Number(row.net_amount) || 0,
          installment_deducted_amount: Number(row.installment_deducted_amount) || 0,
          entry_status: row.entry_status as string,
          attendance_days: Number(row.attendance_days) || 0,
        } as PayrollEntrySearchRow
      })
    },
    staleTime: 30_000,
  })
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  calculated: 'محسوب',
  finalized: 'مُعتمد',
  cancelled: 'ملغي',
}

export default function PayrollEntriesSection() {
  const [nameSearch, setNameSearch] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const { data: projects = [] } = useProjects()

  const { data: entries = [], isLoading } = usePayrollEntriesSearch(monthFilter, projectFilter)

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (nameSearch && !e.employee_name_snapshot.includes(nameSearch)) return false
      if (monthFilter && !e.payroll_month.startsWith(monthFilter)) return false
      if (projectFilter && e.project_name_snapshot !== projectFilter) return false
      return true
    })
  }, [entries, nameSearch, monthFilter, projectFilter])

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground">البحث في إدخالات الرواتب</h3>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
          <input
            type="text"
            placeholder="بحث بالاسم"
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            className="w-full rounded-xl border border-border-200 pr-9 pl-3 py-2 text-sm"
          />
        </div>
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="w-full rounded-xl border border-border-200 px-3 py-2 text-sm"
          placeholder="فلتر بالشهر"
        />
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="w-full rounded-xl border border-border-200 px-3 py-2 text-sm"
        >
          <option value="">كل المشاريع</option>
          {projects.map((p) => (
            <option key={p.id} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-200 py-8 text-center text-sm text-foreground-tertiary">
          لا توجد نتائج
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-200">
          <table className="w-full text-sm">
            <thead className="bg-surface-secondary-50">
              <tr className="border-b border-border-200 text-foreground-secondary">
                <th className="py-2 px-3 text-right font-medium">الموظف</th>
                <th className="py-2 px-3 text-right font-medium">المشروع</th>
                <th className="py-2 px-3 text-right font-medium">الشهر</th>
                <th className="py-2 px-3 text-right font-medium">الإجمالي</th>
                <th className="py-2 px-3 text-right font-medium">الاستقطاع</th>
                <th className="py-2 px-3 text-right font-medium">الصافي</th>
                <th className="py-2 px-3 text-right font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.id} className="border-b border-border-100 hover:bg-surface-secondary-50">
                  <td className="py-2 px-3">{entry.employee_name_snapshot}</td>
                  <td className="py-2 px-3 text-foreground-secondary">{entry.project_name_snapshot ?? '—'}</td>
                  <td className="py-2 px-3 text-foreground-secondary">{entry.payroll_month ? formatDate(entry.payroll_month) : '—'}</td>
                  <td className="py-2 px-3 tabular-nums text-right">
                    {entry.gross_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 tabular-nums text-right text-red-700">
                    {entry.installment_deducted_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 tabular-nums text-right font-medium text-green-700">
                    {entry.net_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {STATUS_LABELS[entry.entry_status] ?? entry.entry_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-3 py-2 text-xs text-foreground-tertiary">{filtered.length} نتيجة</p>
        </div>
      )}
    </div>
  )
}
