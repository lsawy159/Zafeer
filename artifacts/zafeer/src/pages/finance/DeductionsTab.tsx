import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatDateDDMMMYYYY as formatDate } from '@/utils/dateFormatter'

// عنوان فرعي قابل للطي (T029)
function CollapsibleSubtitle() {
  const [open, setOpen] = useState(true)
  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-sm text-foreground-secondary hover:text-foreground transition"
      >
        <span>{open ? '▾' : '▸'}</span>
        {open ? 'إخفاء الوصف' : 'عرض الوصف'}
      </button>
      {open && (
        <p className="mt-1 text-sm text-foreground-tertiary rounded-lg bg-surface-secondary-50 border border-border-100 px-3 py-2">
          التنفيذ الشهري الفعلي للاستقطاع من الراتب
        </p>
      )}
    </div>
  )
}

interface DeductionRow {
  id: string
  employee_name: string
  due_month: string
  amount_due: number
  amount_paid: number
  line_status: string
  obligation_type: string
  obligation_title: string
}

function useExecutedDeductions() {
  return useQuery({
    queryKey: ['executed-deductions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_obligation_lines')
        .select(`
          id,
          due_month,
          amount_due,
          amount_paid,
          line_status,
          employee:employees(name),
          header:employee_obligation_headers(obligation_type, title)
        `)
        .not('payroll_entry_id', 'is', null)
        .order('due_month', { ascending: false })
        .limit(200)

      if (error) throw error

      return (data ?? []).map((row) => {
        const emp = Array.isArray(row.employee) ? row.employee[0] : row.employee
        const hdr = Array.isArray(row.header) ? row.header[0] : row.header
        return {
          id: row.id as string,
          employee_name: (emp as { name?: string } | null)?.name ?? '—',
          due_month: row.due_month as string,
          amount_due: Number(row.amount_due) || 0,
          amount_paid: Number(row.amount_paid) || 0,
          line_status: row.line_status as string,
          obligation_type: (hdr as { obligation_type?: string } | null)?.obligation_type ?? '—',
          obligation_title: (hdr as { title?: string } | null)?.title ?? '—',
        } as DeductionRow
      })
    },
    staleTime: 30_000,
  })
}

const STATUS_LABELS: Record<string, string> = {
  paid: 'مسدد',
  partial: 'جزئي',
  unpaid: 'غير مسدد',
}

const TYPE_LABELS: Record<string, string> = {
  transfer: 'نقل كفالة',
  renewal: 'تجديد',
  penalty: 'غرامة',
  advance: 'سلفة',
  other: 'أخرى',
}

export default function DeductionsTab() {
  const { data: rows = [], isLoading } = useExecutedDeductions()
  const [search, setSearch] = useState('')

  const filtered = rows.filter(
    (r) =>
      r.employee_name.includes(search) ||
      r.obligation_title.includes(search) ||
      r.due_month.includes(search)
  )

  return (
    <div className="space-y-4" dir="rtl">
      <CollapsibleSubtitle />

      <div className="rounded-2xl border border-border-200 bg-surface p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">الاستقطاعات المنفَّذة</h2>
          <input
            type="text"
            placeholder="بحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-border-200 rounded-lg px-3 py-1.5 text-sm w-48"
          />
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-foreground-tertiary text-sm">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-foreground-tertiary text-sm">
            لا توجد استقطاعات منفَّذة
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-200 text-foreground-secondary">
                  <th className="py-2 text-right font-medium">الموظف</th>
                  <th className="py-2 text-right font-medium">نوع الالتزام</th>
                  <th className="py-2 text-right font-medium">شهر الاستحقاق</th>
                  <th className="py-2 text-right font-medium">المستقطع</th>
                  <th className="py-2 text-right font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-border-100 hover:bg-surface-secondary-50">
                    <td className="py-2">{row.employee_name}</td>
                    <td className="py-2">{TYPE_LABELS[row.obligation_type] ?? row.obligation_type}</td>
                    <td className="py-2">{formatDate(row.due_month)}</td>
                    <td className="py-2 tabular-nums">
                      {row.amount_paid.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س
                    </td>
                    <td className="py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.line_status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : row.line_status === 'partial'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {STATUS_LABELS[row.line_status] ?? row.line_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
