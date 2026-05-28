import { useState } from 'react'
import { Plus, RefreshCw, Wallet, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import {
  usePayrollRuns,
  useCreatePayrollRun,
  useUpdatePayrollRunStatus,
  useDeletePayrollRun,
  type PayrollRunSummary,
} from '@/hooks/usePayrollRuns'
import { useProjects } from '@/hooks/useProjects'
import { useCompanies } from '@/hooks/useCompanies'
import { usePermissions } from '@/utils/permissions'
import { toast } from 'sonner'
import type { PayrollScopeType, PayrollInputMode } from '@/lib/supabase'
import { formatDateDDMMMYYYY as formatDate } from '@/utils/dateFormatter'

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
  canEdit: boolean
  isAdmin: boolean
}

function RunCard({ run, onSelect, isSelected, onApprove, onCancel, onDelete, canEdit, isAdmin }: RunCardProps) {
  return (
    <div
      className={`rounded-xl border ${isSelected ? 'border-primary bg-primary/5' : 'border-border-200 bg-surface'} p-4 cursor-pointer hover:border-primary/50 transition`}
      onClick={() => onSelect(run.id)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground text-sm">
            {run.scope_type === 'project' ? 'مشروع' : 'مؤسسة'} — {formatDate(run.payroll_month)}
          </span>
        </div>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[run.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {STATUS_LABELS[run.status] ?? run.status}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-foreground-secondary mb-3">
        <div>موظفين: <span className="font-medium text-foreground">{run.entry_count}</span></div>
        <div>إجمالي: <span className="font-medium text-foreground">{Number(run.total_gross_amount).toLocaleString('en-US', { minimumFractionDigits: 0 })}</span></div>
        <div>صافي: <span className="font-medium text-foreground">{Number(run.total_net_amount).toLocaleString('en-US', { minimumFractionDigits: 0 })}</span></div>
      </div>
      {(canEdit || isAdmin) && run.status !== 'finalized' && run.status !== 'cancelled' && (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {run.status === 'processing' && (
            <button
              type="button"
              onClick={onApprove}
              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              اعتماد
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
          >
            <XCircle className="h-3.5 w-3.5" />
            إلغاء
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              حذف
            </button>
          )}
        </div>
      )}
    </div>
  )
}

interface CreateRunFormProps {
  onSuccess: () => void
  onCancel: () => void
}

function CreateRunForm({ onSuccess, onCancel }: CreateRunFormProps) {
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ')
    }
  }

  return (
    <div className="rounded-xl border border-border-200 bg-surface p-4 space-y-3" dir="rtl">
      <h3 className="font-semibold text-foreground">إنشاء مسير رواتب جديد</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-foreground-secondary mb-1 block">شهر المسير</label>
          <input
            type="month"
            value={form.payroll_month}
            onChange={(e) => setForm((f) => ({ ...f, payroll_month: e.target.value }))}
            className="w-full rounded-xl border border-border-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground-secondary mb-1 block">النطاق</label>
          <select
            value={form.scope_type}
            onChange={(e) => setForm((f) => ({ ...f, scope_type: e.target.value as PayrollScopeType, scope_id: '' }))}
            className="w-full rounded-xl border border-border-200 px-3 py-2 text-sm"
          >
            <option value="company">مؤسسة</option>
            <option value="project">مشروع</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground-secondary mb-1 block">
            {form.scope_type === 'company' ? 'المؤسسة' : 'المشروع'}
          </label>
          <select
            value={form.scope_id}
            onChange={(e) => setForm((f) => ({ ...f, scope_id: e.target.value }))}
            className="w-full rounded-xl border border-border-200 px-3 py-2 text-sm"
          >
            <option value="">اختر...</option>
            {scopeOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground-secondary mb-1 block">طريقة الإدخال</label>
          <select
            value={form.input_mode}
            onChange={(e) => setForm((f) => ({ ...f, input_mode: e.target.value as PayrollInputMode }))}
            className="w-full rounded-xl border border-border-200 px-3 py-2 text-sm"
          >
            <option value="manual">يدوي</option>
            <option value="excel">Excel</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-foreground-secondary mb-1 block">ملاحظات</label>
        <input
          type="text"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          className="w-full rounded-xl border border-border-200 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={createRun.isPending || !form.scope_id}
          className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {createRun.isPending ? 'جاري الإنشاء...' : 'إنشاء'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-border-200 px-4 py-2 text-sm font-semibold text-foreground-secondary hover:bg-surface-secondary-50">
          إلغاء
        </button>
      </div>
    </div>
  )
}

export default function PayrollRunsSection() {
  const { isAdmin, canEdit } = usePermissions()
  const { data: runs = [], isLoading, refetch } = usePayrollRuns()
  const updateStatus = useUpdatePayrollRunStatus()
  const deleteRun = useDeletePayrollRun()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

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

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground">مسيرات الرواتب</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border-200 px-3 py-1.5 text-sm text-foreground-secondary hover:bg-surface-secondary-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
          {(isAdmin || canEdit('payroll')) && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              مسير جديد
            </button>
          )}
        </div>
      </div>

      {showCreateForm && (
        <CreateRunForm onSuccess={() => setShowCreateForm(false)} onCancel={() => setShowCreateForm(false)} />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-200 py-8 text-center text-sm text-foreground-tertiary">
          لا توجد مسيرات رواتب بعد
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {runs.map((run) => (
            <RunCard
              key={run.id}
              run={run}
              isSelected={selectedRunId === run.id}
              onSelect={setSelectedRunId}
              onApprove={() => void handleApprove(run.id)}
              onCancel={() => void handleCancel(run.id)}
              onDelete={() => void handleDelete(run.id)}
              canEdit={canEdit('payroll')}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  )
}
