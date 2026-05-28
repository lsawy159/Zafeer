import { useState, useMemo } from 'react'
import { ChevronDown, ChevronLeft, AlertTriangle } from 'lucide-react'
import { useRevenuePnl, useUnlinkedPayrollCount, type RevenuePnlRow } from '@/hooks/useRevenuePnl'
import { useProjects } from '@/hooks/useProjects'
import CashPositionPanel from './CashPositionPanel'

function formatMonth(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' })
  } catch {
    return dateStr
  }
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

function MarginBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-foreground-tertiary text-xs">—</span>
  const color = pct >= 20 ? 'text-green-700' : pct >= 0 ? 'text-yellow-700' : 'text-red-700'
  return <span className={`font-semibold tabular-nums ${color}`}>{pct.toFixed(1)}%</span>
}

function PnlRow({ row }: { row: RevenuePnlRow }) {
  const [expanded, setExpanded] = useState(false)
  const isNegative = row.margin < 0

  return (
    <>
      <tr
        className={`border-b border-border-100 hover:bg-surface-secondary-50 cursor-pointer transition ${isNegative ? 'bg-red-50/40' : ''}`}
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="py-2 px-3">
          <div className="flex items-center gap-1">
            {expanded ? <ChevronDown className="h-4 w-4 text-foreground-tertiary" /> : <ChevronLeft className="h-4 w-4 text-foreground-tertiary" />}
            <span className="font-medium text-foreground">{row.project_name || '—'}</span>
          </div>
        </td>
        <td className="py-2 px-3 text-foreground-secondary text-sm">{formatMonth(row.period_month)}</td>
        <td className="py-2 px-3 tabular-nums text-right text-green-800">{fmt(row.revenue)}</td>
        <td className="py-2 px-3 tabular-nums text-right text-red-800">{fmt(row.labor_cost)}</td>
        <td className={`py-2 px-3 tabular-nums text-right font-semibold ${isNegative ? 'text-red-700' : 'text-foreground'}`}>
          {fmt(row.margin)}
        </td>
        <td className="py-2 px-3 text-right">
          <MarginBadge pct={row.margin_pct} />
        </td>
      </tr>
      {expanded && (
        <tr className="bg-surface-secondary-50 border-b border-border-100">
          <td colSpan={6} className="py-2 px-8">
            <div className="flex items-center gap-2 text-sm text-foreground-secondary">
              <span>منها أيام غير مفوترة:</span>
              <span className="font-medium text-foreground">{fmt(row.unbillable_days)} يوم</span>
              <span>=</span>
              <span className="font-medium text-foreground">{fmt(row.unbillable_cost)} ر.س</span>
              <span
                className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 text-xs px-2 py-0.5 cursor-help"
                title="غير محسوب ضمن هامش الربح"
              >
                غير محسوب ضمن هامش الربح
              </span>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function RevenueTab() {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedProject, setSelectedProject] = useState('')

  const { data: rows = [], isLoading } = useRevenuePnl(selectedMonth || undefined, selectedProject || undefined)
  const { data: projects = [] } = useProjects()
  const { data: unlinkedCount = 0 } = useUnlinkedPayrollCount(selectedMonth || undefined)

  const totals = useMemo(() => ({
    revenue: rows.reduce((s, r) => s + r.revenue, 0),
    labor_cost: rows.reduce((s, r) => s + r.labor_cost, 0),
    margin: rows.reduce((s, r) => s + r.margin, 0),
  }), [rows])

  return (
    <div className="space-y-4" dir="rtl">
      {/* Filters */}
      <div className="rounded-2xl border border-border-200 bg-surface p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-foreground-secondary mb-1 block">الشهر</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-xl border border-border-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground-secondary mb-1 block">المشروع (اختياري)</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full rounded-xl border border-border-200 px-3 py-2 text-sm"
            >
              <option value="">كل المشاريع</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* FR-029: Banner رواتب بدون مشروع */}
        {unlinkedCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {unlinkedCount} إدخال راتب بدون مشروع محدد — غير مدرجة في حسابات الربحية
            </span>
          </div>
        )}
      </div>

      {/* P&L Table */}
      <div className="rounded-2xl border border-border-200 bg-surface p-4">
        <h2 className="text-lg font-bold text-foreground mb-3">جدول الإيرادات والتكاليف</h2>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-foreground-tertiary">جاري التحميل...</div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-foreground-tertiary">
            لا توجد بيانات لهذا الشهر
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-200 text-foreground-secondary">
                  <th className="py-2 px-3 text-right font-medium">المشروع</th>
                  <th className="py-2 px-3 text-right font-medium">الشهر</th>
                  <th className="py-2 px-3 text-right font-medium">الإيراد</th>
                  <th className="py-2 px-3 text-right font-medium">تكلفة العمالة</th>
                  <th className="py-2 px-3 text-right font-medium">الهامش</th>
                  <th className="py-2 px-3 text-right font-medium">نسبة الهامش</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <PnlRow key={`${row.project_id}-${row.period_month}`} row={row} />
                ))}
              </tbody>
              <tfoot className="border-t-2 border-border-200">
                <tr className="font-bold">
                  <td className="py-2 px-3" colSpan={2}>الإجمالي</td>
                  <td className="py-2 px-3 tabular-nums text-right text-green-800">{fmt(totals.revenue)}</td>
                  <td className="py-2 px-3 tabular-nums text-right text-red-800">{fmt(totals.labor_cost)}</td>
                  <td className={`py-2 px-3 tabular-nums text-right ${totals.margin < 0 ? 'text-red-700' : 'text-foreground'}`}>
                    {fmt(totals.margin)}
                  </td>
                  <td className="py-2 px-3">
                    <MarginBadge pct={totals.revenue > 0 ? Number(((totals.margin / totals.revenue) * 100).toFixed(2)) : null} />
                  </td>
                </tr>
              </tfoot>
            </table>
            <p className="mt-2 text-xs text-foreground-tertiary">
              اضغط على أي صف لعرض تفاصيل الأيام غير المفوترة
            </p>
          </div>
        )}
      </div>

      {/* Cash Position — T031 */}
      <CashPositionPanel />
    </div>
  )
}
