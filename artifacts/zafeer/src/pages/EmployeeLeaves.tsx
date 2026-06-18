import { useState, useMemo } from 'react'
import { CalendarDays, Plus, Trash2, Pencil, UmbrellaOff } from 'lucide-react'
import { toast } from 'sonner'
import Layout from '@/components/layout/Layout'
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { usePermissions } from '@/utils/permissions'
import { useAllActiveEmployees } from '@/hooks/useEmployees'
import {
  useEmployeeLeaves,
  useCreateEmployeeLeave,
  useUpdateEmployeeLeave,
  useDeleteEmployeeLeave,
  type CreateEmployeeLeaveInput,
} from '@/hooks/useEmployeeLeaves'
import type { EmployeeLeaveWithEmployee } from '@/lib/supabase'

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function daysBetween(start: string, end: string): number {
  return Math.max(
    0,
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1
  )
}

interface LeaveFormState {
  employee_id: string
  employeeSearch: string
  start_date: string
  end_date: string
  notes: string
}

const EMPTY_FORM: LeaveFormState = {
  employee_id: '',
  employeeSearch: '',
  start_date: '',
  end_date: '',
  notes: '',
}

interface LeaveFormProps {
  open: boolean
  onClose: () => void
  editLeave: EmployeeLeaveWithEmployee | null
}

function LeaveFormModal({ open, onClose, editLeave }: LeaveFormProps) {
  const { data: employees = [] } = useAllActiveEmployees()
  const createLeave = useCreateEmployeeLeave()
  const updateLeave = useUpdateEmployeeLeave()

  const [form, setForm] = useState<LeaveFormState>(() =>
    editLeave
      ? {
          employee_id: editLeave.employee_id,
          employeeSearch: editLeave.employee?.name ?? '',
          start_date: editLeave.start_date,
          end_date: editLeave.end_date,
          notes: editLeave.notes ?? '',
        }
      : EMPTY_FORM
  )
  const [showSuggestions, setShowSuggestions] = useState(false)

  const filteredEmployees = useMemo(() => {
    const q = form.employeeSearch.trim().toLowerCase()
    if (!q) return []
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        String(e.residence_number ?? '').includes(q)
    ).slice(0, 8)
  }, [form.employeeSearch, employees])

  function setField<K extends keyof LeaveFormState>(key: K, value: LeaveFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function selectEmployee(id: string, name: string) {
    setForm((prev) => ({ ...prev, employee_id: id, employeeSearch: name }))
    setShowSuggestions(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.employee_id) { toast.error('اختر موظفاً أولاً'); return }
    if (!form.start_date || !form.end_date) { toast.error('تاريخ البداية والنهاية مطلوبان'); return }
    if (form.end_date < form.start_date) { toast.error('تاريخ النهاية لا يمكن أن يكون قبل تاريخ البداية'); return }

    try {
      if (editLeave) {
        await updateLeave.mutateAsync({
          id: editLeave.id,
          start_date: form.start_date,
          end_date: form.end_date,
          notes: form.notes || null,
        })
        toast.success('تم تحديث الإجازة')
      } else {
        const input: CreateEmployeeLeaveInput = {
          employee_id: form.employee_id,
          start_date: form.start_date,
          end_date: form.end_date,
          notes: form.notes || null,
        }
        await createLeave.mutateAsync(input)
        toast.success('تم تسجيل الإجازة')
      }
      onClose()
    } catch {
      toast.error('حدث خطأ، حاول مرة أخرى')
    }
  }

  const isPending = createLeave.isPending || updateLeave.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="app-modal-surface max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>{editLeave ? 'تعديل إجازة' : 'تسجيل إجازة جديدة'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Employee search */}
          {!editLeave && (
            <div className="relative">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                الموظف <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="ابحث بالاسم أو رقم الإقامة"
                value={form.employeeSearch}
                onChange={(e) => {
                  setField('employeeSearch', e.target.value)
                  setField('employee_id', '')
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                autoComplete="off"
              />
              {showSuggestions && filteredEmployees.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
                  {filteredEmployees.map((emp) => (
                    <li
                      key={emp.id}
                      className="cursor-pointer px-4 py-2.5 text-sm hover:bg-slate-50 first:rounded-t-xl last:rounded-b-xl"
                      onMouseDown={() => selectEmployee(emp.id, emp.name)}
                    >
                      <span className="font-medium">{emp.name}</span>
                      {emp.residence_number && (
                        <span className="ms-2 text-slate-400 text-xs">{emp.residence_number}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {form.employee_id && (
                <p className="mt-1 text-xs text-emerald-600">✓ تم اختيار الموظف</p>
              )}
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                تاريخ البداية <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setField('start_date', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                تاريخ النهاية <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={form.end_date}
                min={form.start_date || undefined}
                onChange={(e) => setField('end_date', e.target.value)}
                required
              />
            </div>
          </div>

          {form.start_date && form.end_date && form.end_date >= form.start_date && (
            <p className="text-xs text-slate-500">
              عدد الأيام: <span className="font-semibold text-slate-700">{daysBetween(form.start_date, form.end_date)}</span> يوم
            </p>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">ملاحظات</label>
            <Input
              placeholder="ملاحظات اختيارية"
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending || (!editLeave && !form.employee_id)}>
              {isPending ? 'جاري الحفظ...' : editLeave ? 'حفظ التعديلات' : 'تسجيل الإجازة'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function EmployeeLeaves() {
  const { canView, canCreate, canEdit, canDelete } = usePermissions()
  const { data: leaves = [], isLoading } = useEmployeeLeaves()
  const deleteLeave = useDeleteEmployeeLeave()

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editLeave, setEditLeave] = useState<EmployeeLeaveWithEmployee | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  if (!canView('employeeLeaves')) {
    return (
      <Layout>
        <div className="p-6">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            لا تملك صلاحية الوصول إلى صفحة إجازات الموظفين.
          </div>
        </div>
      </Layout>
    )
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return leaves
    return leaves.filter(
      (l) =>
        (l.employee?.name ?? '').toLowerCase().includes(q) ||
        String(l.employee?.residence_number ?? '').includes(q)
    )
  }, [leaves, search])

  async function handleDelete(id: string) {
    setDeleteConfirmId(id)
  }

  async function handleDeleteConfirmed() {
    if (!deleteConfirmId) return
    try {
      await deleteLeave.mutateAsync(deleteConfirmId)
      toast.success('تم حذف الإجازة')
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
    } finally {
      setDeleteConfirmId(null)
    }
  }

  function openAdd() {
    setEditLeave(null)
    setModalOpen(true)
  }

  function openEdit(leave: EmployeeLeaveWithEmployee) {
    setEditLeave(leave)
    setModalOpen(true)
  }

  return (
    <Layout>
      <div className="app-page app-tech-grid space-y-5">
        {/* Header */}
        <div className="mb-2 rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50/80 via-white to-emerald-50/60 p-5 sm:p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 shadow-sm">
              <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
                إجازات الموظفين
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
                تسجيل وعرض إجازات الموظفين. ابحث بالاسم أو رقم الإقامة.
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Input
            placeholder="بحث بالاسم أو رقم الإقامة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72"
          />
          {canCreate('employeeLeaves') && (
            <Button onClick={openAdd} className="gap-2 whitespace-nowrap">
              <Plus className="h-4 w-4" />
              تسجيل إجازة
            </Button>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<UmbrellaOff className="h-8 w-8" />}
            title={search ? 'لا توجد نتائج' : 'لا توجد إجازات مسجلة'}
            description={search ? 'جرّب بحثاً مختلفاً' : 'سجّل إجازة جديدة بالضغط على الزر أعلاه'}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3">الموظف</th>
                  <th className="px-4 py-3">رقم الإقامة</th>
                  <th className="px-4 py-3">من</th>
                  <th className="px-4 py-3">إلى</th>
                  <th className="px-4 py-3 text-center">الأيام</th>
                  <th className="px-4 py-3">ملاحظات</th>
                  {(canEdit('employeeLeaves') || canDelete('employeeLeaves')) && (
                    <th className="px-4 py-3 text-center">إجراءات</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((leave) => (
                  <tr key={leave.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {leave.employee?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 tabular-nums">
                      {leave.employee?.residence_number ?? '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      {formatDate(leave.start_date)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      {formatDate(leave.end_date)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                        {daysBetween(leave.start_date, leave.end_date)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">
                      {leave.notes || '—'}
                    </td>
                    {(canEdit('employeeLeaves') || canDelete('employeeLeaves')) && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {canEdit('employeeLeaves') && (
                            <button
                              onClick={() => openEdit(leave)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                              title="تعديل"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete('employeeLeaves') && (
                            <button
                              onClick={() => handleDelete(leave.id)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count */}
        {!isLoading && filtered.length > 0 && (
          <p className="text-xs text-slate-400 text-end">
            {filtered.length} {filtered.length === 1 ? 'إجازة' : 'إجازات'}
            {search && ` من أصل ${leaves.length}`}
          </p>
        )}
      </div>

      {modalOpen && (
        <LeaveFormModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditLeave(null) }}
          editLeave={editLeave}
        />
      )}

      <ConfirmationDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDeleteConfirmed}
        title="حذف الإجازة"
        message="هل أنت متأكد من حذف هذه الإجازة؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="حذف"
        cancelText="إلغاء"
        isDangerous={true}
        icon="alert"
      />
    </Layout>
  )
}
