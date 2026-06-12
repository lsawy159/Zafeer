import { useMemo, useState } from 'react'
import { AlertTriangle, Calendar, CheckCircle, Loader2, Plus, RefreshCw, RotateCcw, Wallet, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  useCreatePayrollRun,
  useDeletePayrollRun,
  usePayrollRuns,
  useUpdatePayrollRunStatus,
  type PayrollRunSummary,
} from '@/hooks/usePayrollRuns'
import EditPayrollMonthModal from '@/components/payroll/EditPayrollMonthModal'
import { useCompanies } from '@/hooks/useCompanies'
import { useProjects } from '@/hooks/useProjects'
import { usePermissions } from '@/utils/permissions'
import type { PayrollInputMode, PayrollScopeType } from '@/lib/supabase'
import { formatDateDDMMMYYYY as formatDate } from '@/utils/dateFormatter'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import FinancialMetricStrip from './FinancialMetricStrip'

const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  processing: 'قيد المعالجة',
  finalized: 'مُعتمد',
  cancelled: 'ملغي',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  processing: 'bg-blue-100 text-blue-700',
  finalized: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

interface RunCardProps {
  run: PayrollRunSummary
  onSelect: (id: string) => void
  isSelected: boolean
  onApprove: () => void
  onCancel: () => void
  onDelete: () => void
  onEditMonth: () => void
  onRevertToDraft: () => void
  canEdit: boolean
  isAdmin: boolean
}

function RunCard({
  run,
  onSelect,
  isSelected,
  onApprove,
  onCancel,
  onDelete,
  onEditMonth,
  onRevertToDraft,
  canEdit,
  isAdmin,
}: RunCardProps) {
  return (
    <div
      className={`rounded-2xl border bg-surface p-4 shadow-sm transition hover:border-primary/50 ${
        isSelected ? 'border-primary ring-2 ring-primary/10' : 'border-border-200'
      }`}
      onClick={() => onSelect(run.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(run.id)
        }
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Wallet className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-sm font-semibold text-foreground">
            {run.scope_type === 'project' ? 'مشروع' : 'مؤسسة'} - {formatDate(run.payroll_month)}
          </span>
        </div>
        <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[run.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {STATUS_LABELS[run.status] ?? run.status}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-xs text-foreground-secondary">
        <div>موظفين: <span className="font-medium text-foreground">{run.entry_count}</span></div>
        <div>إجمالي: <span className="font-medium text-foreground">{Number(run.total_gross_amount).toLocaleString('en-US', { minimumFractionDigits: 0 })}</span></div>
        <div>صافي: <span className="font-medium text-foreground">{Number(run.total_net_amount).toLocaleString('en-US', { minimumFractionDigits: 0 })}</span></div>
      </div>

      <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
        {isAdmin && run.status === 'draft' && (
          <button
            type="button"
            onClick={onEditMonth}
            className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            <Calendar className="h-3.5 w-3.5" />
            تعديل الشهر
          </button>
        )}
        {isAdmin && run.status === 'finalized' && (
          <button
            type="button"
            onClick={onRevertToDraft}
            className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            إرجاع لمسودة
          </button>
        )}
        {(canEdit || isAdmin) && run.status !== 'finalized' && run.status !== 'cancelled' && (
          <>
            {run.status === 'processing' && (
              <button
                type="button"
                onClick={onApprove}
                className="inline-flex items-center gap-1 rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                اعتماد
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
            >
              <XCircle className="h-3.5 w-3.5" />
              إلغاء
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                حذف
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

interface CreateRunDialogProps {
  open: boolean
  onSuccess: () => void
  onOpenChange: (open: boolean) => void
}

function CreateRunDialog({ open, onSuccess, onOpenChange }: CreateRunDialogProps) {
  const { data: companies = [] } = useCompanies()
  const { data: projects = [] } = useProjects()
  const createRun = useCreatePayrollRun()
  const [form, setForm] = useState({
    payroll_month: new Date().toISOString().slice(0, 7),
    scope_type: 'company' as PayrollScopeType,
    scope_id: '',
    input_mode: 'manual' as PayrollInputMode,
    notes: '',
  })

  const scopeOptions = form.scope_type === 'company' ? companies : projects

  const handleSubmit = async () => {
    if (!form.scope_id || !form.payroll_month) return

    try {
      await createRun.mutateAsync({
        payroll_month: `${form.payroll_month}-01`,
        scope_type: form.scope_type,
        scope_id: form.scope_id,
        input_mode: form.input_mode,
        notes: form.notes || null,
      })
      toast.success('تم إنشاء مسير الرواتب')
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>إنشاء مسير رواتب جديد</DialogTitle>
          <DialogDescription>
            اختر الشهر والنطاق وطريقة الإدخال. سيتم إنشاء المسير داخل تبويب الرواتب.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-secondary">شهر المسير</label>
            <input
              type="month"
              value={form.payroll_month}
              onChange={(event) => setForm((current) => ({ ...current, payroll_month: event.target.value }))}
              className="w-full rounded-xl border border-border-200 bg-surface px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-secondary">النطاق</label>
            <select
              value={form.scope_type}
              onChange={(event) => setForm((current) => ({
                ...current,
                scope_type: event.target.value as PayrollScopeType,
                scope_id: '',
              }))}
              className="w-full rounded-xl border border-border-200 bg-surface px-3 py-2 text-sm"
            >
              <option value="company">مؤسسة</option>
              <option value="project">مشروع</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-secondary">
              {form.scope_type === 'company' ? 'المؤسسة' : 'المشروع'}
            </label>
            <select
              value={form.scope_id}
              onChange={(event) => setForm((current) => ({ ...current, scope_id: event.target.value }))}
              className="w-full rounded-xl border border-border-200 bg-surface px-3 py-2 text-sm"
            >
              <option value="">اختر...</option>
              {scopeOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-secondary">طريقة الإدخال</label>
            <select
              value={form.input_mode}
              onChange={(event) => setForm((current) => ({
                ...current,
                input_mode: event.target.value as PayrollInputMode,
              }))}
              className="w-full rounded-xl border border-border-200 bg-surface px-3 py-2 text-sm"
            >
              <option value="manual">يدوي</option>
              <option value="excel">Excel</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-foreground-secondary">ملاحظات</label>
            <input
              type="text"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              className="w-full rounded-xl border border-border-200 bg-surface px-3 py-2 text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={createRun.isPending || !form.scope_id}
          >
            {createRun.isPending ? 'جاري الإنشاء...' : 'إنشاء'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function PayrollRunsSection() {
  const { isAdmin, canEdit } = usePermissions()
  const { data: runs = [], isLoading, refetch } = usePayrollRuns()
  const updateStatus = useUpdatePayrollRunStatus()
  const deleteRun = useDeletePayrollRun()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [editMonthRunId, setEditMonthRunId] = useState<string | null>(null)
  const metrics = useMemo(() => {
    const totalGross = runs.reduce((sum, run) => sum + Number(run.total_gross_amount ?? 0), 0)
    const totalNet = runs.reduce((sum, run) => sum + Number(run.total_net_amount ?? 0), 0)
    const employees = runs.reduce((sum, run) => sum + Number(run.entry_count ?? 0), 0)
    const finalized = runs.filter((run) => run.status === 'finalized').length

    return [
      {
        label: 'مسيرات الرواتب',
        value: runs.length,
        helper: `${finalized.toLocaleString('en-US')} معتمد`,
        icon: <Wallet className="h-5 w-5" />,
      },
      {
        label: 'إجمالي الرواتب',
        value: `${totalGross.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س`,
      },
      {
        label: 'صافي المستحق',
        value: `${totalNet.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س`,
        tone: totalNet > 0 ? 'success' as const : 'neutral' as const,
      },
      {
        label: 'إجمالي الإدخالات',
        value: employees,
      },
    ]
  }, [runs])

  const handleApprove = async (runId: string) => {
    try {
      await updateStatus.mutateAsync({ runId, status: 'finalized', approved_at: new Date().toISOString() })
      toast.success('تم اعتماد المسير')
    } catch {
      toast.error('حدث خطأ أثناء الاعتماد')
    }
  }

  const handleCancel = async (runId: string) => {
    try {
      await updateStatus.mutateAsync({ runId, status: 'cancelled' })
      toast.success('تم إلغاء المسير')
    } catch {
      toast.error('حدث خطأ')
    }
  }

  const handleDelete = async (runId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المسير؟')) return

    try {
      await deleteRun.mutateAsync(runId)
      toast.success('تم حذف المسير')
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
    }
  }

  const handleRevertToDraft = async (runId: string) => {
    const run = runs.find((r) => r.id === runId)
    if (!run) return

    const hasLaterFinalized = runs.some(
      (r) =>
        r.id !== runId &&
        r.scope_type === run.scope_type &&
        r.scope_id === run.scope_id &&
        r.status === 'finalized' &&
        r.payroll_month > run.payroll_month
    )

    const msg = hasLaterFinalized
      ? 'هذا المسير يسبق مسيرات معتمدة أخرى. إرجاعه للمسودة سيؤثر على الالتزامات. هل أنت متأكد؟'
      : 'سيتم إرجاع المسير لمسودة وإعادة التزامات الموظفين. هل أنت متأكد؟'

    if (!window.confirm(msg)) return

    try {
      await updateStatus.mutateAsync({ runId, status: 'draft' })
      toast.success('تم إرجاع المسير للمسودة')
    } catch {
      toast.error('حدث خطأ أثناء الإرجاع')
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-lg font-bold text-foreground">مسيرات الرواتب</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          {(isAdmin || canEdit('payroll')) && (
            <Button
              type="button"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4" />
              مسير جديد
            </Button>
          )}
        </div>
      </div>

      <CreateRunDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => void refetch()}
      />

      {!isLoading && <FinancialMetricStrip metrics={metrics} />}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-200 py-8 text-center text-sm text-foreground-tertiary">
          لا توجد مسيرات رواتب بعد
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {runs.map((run) => (
              <RunCard
                key={run.id}
                run={run}
                isSelected={selectedRunId === run.id}
                onSelect={setSelectedRunId}
                onApprove={() => void handleApprove(run.id)}
                onCancel={() => void handleCancel(run.id)}
                onDelete={() => void handleDelete(run.id)}
                onEditMonth={() => setEditMonthRunId(run.id)}
                onRevertToDraft={() => void handleRevertToDraft(run.id)}
                canEdit={canEdit('payroll')}
                isAdmin={isAdmin}
              />
            ))}
          </div>
          {editMonthRunId && (() => {
            const run = runs.find((r) => r.id === editMonthRunId)
            if (!run) return null
            return (
              <EditPayrollMonthModal
                open={true}
                runId={run.id}
                currentMonth={run.payroll_month}
                onClose={() => setEditMonthRunId(null)}
              />
            )
          })()}
        </>
      )}
    </div>
  )
}
