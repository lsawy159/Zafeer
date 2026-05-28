import { useState, useMemo } from 'react'
import { RefreshCw, Search, UserPlus } from 'lucide-react'
import {
  useAllObligationsSummary,
  useCreateEmployeeObligationPlan,
  type AllObligationsSummaryRow,
  type CreateEmployeeObligationPlanInput,
} from '@/hooks/useEmployeeObligations'
import { usePermissions } from '@/utils/permissions'

// عنوان فرعي قابل للطي (T028)
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
          تكاليف دفعتها الشركة مسبقاً على الموظف
        </p>
      )}
    </div>
  )
}

function ObligationRowCard({ row }: { row: AllObligationsSummaryRow }) {
  return (
    <tr className="border-b border-border-100 hover:bg-surface-secondary-50 transition">
      <td className="py-2 px-2 font-medium text-foreground">{row.employee_name}</td>
      <td className="py-2 px-2 text-foreground-secondary text-sm">{row.residence_number}</td>
      <td className="py-2 px-2 text-foreground-secondary text-sm">{row.project_name || '—'}</td>
      <td className="py-2 px-2 tabular-nums text-right">
        {row.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </td>
      <td className="py-2 px-2 tabular-nums text-right text-green-700">
        {row.total_paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </td>
      <td className="py-2 px-2 tabular-nums text-right font-semibold text-primary">
        {row.total_remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </td>
    </tr>
  )
}

function AddObligationDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [employeeId, setEmployeeId] = useState('')
  const [obligationType, setObligationType] = useState<CreateEmployeeObligationPlanInput['obligation_type']>('advance')
  const [totalAmount, setTotalAmount] = useState(0)
  const [installmentCount, setInstallmentCount] = useState(1)
  const [startMonth, setStartMonth] = useState(new Date().toISOString().slice(0, 7))
  const [notes, setNotes] = useState('')
  const createPlan = useCreateEmployeeObligationPlan()

  const handleSubmit = async () => {
    if (!employeeId || totalAmount <= 0) return
    const perInstallment = Number((totalAmount / installmentCount).toFixed(2))
    const installments = Array.from({ length: installmentCount }, () => perInstallment)
    await createPlan.mutateAsync({
      employee_id: employeeId,
      obligation_type: obligationType,
      total_amount: totalAmount,
      currency_code: 'SAR',
      start_month: `${startMonth}-01`,
      installment_amounts: installments,
      notes: notes || null,
    })
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface rounded-2xl border border-border-200 p-6 w-full max-w-md shadow-xl" dir="rtl">
        <h2 className="text-lg font-bold text-foreground mb-4">إضافة التزام جديد</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground-secondary">معرّف الموظف</label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="UUID الموظف"
              className="mt-1 w-full border border-border-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground-secondary">نوع الالتزام</label>
            <select
              value={obligationType}
              onChange={(e) => setObligationType(e.target.value as CreateEmployeeObligationPlanInput['obligation_type'])}
              className="mt-1 w-full border border-border-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="advance">سلفة</option>
              <option value="transfer">نقل كفالة</option>
              <option value="renewal">تجديد</option>
              <option value="penalty">غرامة</option>
              <option value="other">أخرى</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground-secondary">المبلغ الإجمالي (ر.س)</label>
            <input
              type="number"
              value={totalAmount || ''}
              onChange={(e) => setTotalAmount(Number(e.target.value))}
              className="mt-1 w-full border border-border-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground-secondary">عدد الأقساط</label>
            <input
              type="number"
              min={1}
              value={installmentCount}
              onChange={(e) => setInstallmentCount(Math.max(1, Number(e.target.value)))}
              className="mt-1 w-full border border-border-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground-secondary">شهر البدء</label>
            <input
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              className="mt-1 w-full border border-border-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground-secondary">ملاحظات</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full border border-border-200 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={createPlan.isPending || !employeeId || totalAmount <= 0}
            className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {createPlan.isPending ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border-200 px-4 py-2 text-sm font-semibold text-foreground-secondary hover:bg-surface-secondary-50"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ObligationsTab() {
  const { isAdmin, canEdit } = usePermissions()
  const { data: summary = [], isLoading, refetch } = useAllObligationsSummary()
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)

  const filtered = useMemo(() => {
    return summary.filter((row) => {
      if (search && !row.employee_name.includes(search) && !row.residence_number.includes(search)) return false
      if (projectFilter && !row.project_name?.includes(projectFilter)) return false
      return true
    })
  }, [summary, search, projectFilter])

  const uniqueProjects = useMemo(
    () => Array.from(new Set(summary.map((r) => r.project_name).filter(Boolean))).sort(),
    [summary]
  )

  return (
    <div className="space-y-4" dir="rtl">
      <CollapsibleSubtitle />

      <div className="rounded-2xl border border-border-200 bg-surface p-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">قائمة الالتزامات</h2>
            <p className="text-sm text-gray-500 mt-1">ملخص جميع الالتزامات النشطة على الموظفين</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border-200 bg-surface px-3 py-1.5 text-sm font-medium text-foreground-secondary hover:bg-surface-secondary-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              تحديث
            </button>
            {(isAdmin || canEdit('payroll')) && (
              <button
                type="button"
                onClick={() => setShowAddDialog(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary/90"
              >
                <UserPlus className="h-4 w-4" />
                إضافة التزام
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو رقم الإقامة"
              className="w-full rounded-xl border border-border-200 bg-surface pr-9 pl-3 py-2 text-sm"
            />
          </div>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-full rounded-xl border border-border-200 bg-surface px-3 py-2 text-sm"
          >
            <option value="">كل المشاريع</option>
            {uniqueProjects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="py-8 text-center text-foreground-tertiary text-sm">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-foreground-tertiary text-sm">لا توجد التزامات</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-200 text-foreground-secondary">
                  <th className="py-2 px-2 text-right font-medium">الموظف</th>
                  <th className="py-2 px-2 text-right font-medium">رقم الإقامة</th>
                  <th className="py-2 px-2 text-right font-medium">المشروع</th>
                  <th className="py-2 px-2 text-right font-medium">الإجمالي</th>
                  <th className="py-2 px-2 text-right font-medium">المسدد</th>
                  <th className="py-2 px-2 text-right font-medium">المتبقي</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <ObligationRowCard key={row.employee_id} row={row} />
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-foreground-tertiary">
              إجمالي {filtered.length} موظف — اضغط على أي صف لعرض التفاصيل
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddDialog && (
        <AddObligationDialog
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => void refetch()}
        />
      )}
    </div>
  )
}
