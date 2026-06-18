import React, { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import { toast } from 'sonner'
import {
  ChevronRight,
  Download,
  Copy,
  Plus,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { saveAs } from 'file-saver'
import { loadXlsx } from '@/utils/lazyXlsx'
import { useExtract, useMarkExported, useDuplicateExtract, useDeleteExtract } from '@/hooks/useExtracts'
import { useUpdateExtractLine, useDeleteExtractLine } from '@/hooks/useExtractLines'
import { usePermissions } from '@/utils/permissions'
import { validateAttendanceDays } from '@/utils/extractCalculations'
import AddLineModal from '@/components/extracts/AddLineModal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import type { ExtractInvoiceLine } from '@/hooks/useExtracts'

function formatPeriodMonth(raw: string): string {
  const d = new Date(raw)
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' })
}

function StatusBadge({ status }: { status: 'draft' | 'exported' }) {
  if (status === 'exported') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        تم التصدير
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      <Clock className="h-3.5 w-3.5" />
      مسودة
    </span>
  )
}

interface EditableCellProps {
  line: ExtractInvoiceLine
  totalDaysInMonth: number
  invoiceId: string
}

function EditableAttendanceCell({ line, totalDaysInMonth, invoiceId }: EditableCellProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(line.attendance_days))
  const inputRef = useRef<HTMLInputElement>(null)
  const updateLine = useUpdateExtractLine(invoiceId)

  const handleBlur = () => {
    const days = Number(value)
    if (!validateAttendanceDays(days, totalDaysInMonth)) {
      toast.error(`الأيام يجب بين 0 و ${totalDaysInMonth}`)
      setValue(String(line.attendance_days))
      setEditing(false)
      return
    }
    if (days === line.attendance_days) {
      setEditing(false)
      return
    }
    updateLine.mutate(
      {
        lineId: line.id,
        attendanceDays: days,
        totalDaysInMonth,
        monthlyRate: Number(line.monthly_rate_snapshot),
      },
      {
        onSuccess: () => toast.success('تم تحديث الأيام'),
        onError: () => {
          toast.error('فشل التحديث')
          setValue(String(line.attendance_days))
        },
      }
    )
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') inputRef.current?.blur()
    if (e.key === 'Escape') {
      setValue(String(line.attendance_days))
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={value}
        min={0}
        max={totalDaysInMonth}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        className="w-14 h-7 text-center border border-primary rounded text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 mx-auto block"
      />
    )
  }

  return (
    <button
      onClick={() => { setEditing(true); setValue(String(line.attendance_days)) }}
      className="w-full text-center hover:bg-primary/10 rounded px-1 py-0.5 transition text-slate-700 text-xs"
      title="انقر للتعديل"
    >
      {line.attendance_days}
    </button>
  )
}

interface Props {
  extractId?: string
  onBack?: () => void
}

export default function ExtractDetail({ extractId: extractIdProp, onBack }: Props = {}) {
  const params = useParams<{ id: string }>()
  const id = extractIdProp ?? params.id
  const navigate = useNavigate()
  // لو embedded (بداخل تبويب) لا نضيف Layout لأنه موجود بالخارج
  const wrap = (children: React.ReactNode) =>
    onBack ? <>{children}</> : <Layout>{children}</Layout>
  const permissions = usePermissions()
  // helper alias — avoids repeated destructure inside conditional
  const [showAddModal, setShowAddModal] = useState(false)
  const [deletingLineId, setDeletingLineId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { data: extract, isLoading } = useExtract(id)
  const markExported = useMarkExported()
  const duplicateExtract = useDuplicateExtract()
  const deleteExtractMutation = useDeleteExtract()
  const deleteLineMutation = useDeleteExtractLine(id ?? '')

  if (!id) return null

  if (isLoading) {
    return wrap(<div className="py-16 text-center text-slate-500">جاري التحميل...</div>)
  }

  if (!extract) {
    return wrap(
      <div className="py-16 text-center text-slate-500">
        <p>لم يُعثر على المستخلص</p>
        <button onClick={() => onBack ? onBack() : navigate('/extracts')} className="mt-2 text-primary text-sm hover:underline">
          العودة للقائمة
        </button>
      </div>
    )
  }

  const { isAdmin } = permissions
  const isDraft = extract.status === 'draft'
  const isDirectlyEditable = isDraft || isAdmin
  const canEdit = permissions.canEdit('extracts') && isDirectlyEditable
  const canDelete = permissions.canDelete('extracts') && isDirectlyEditable
  const canExport = permissions.canExport('extracts')
  const canCreate = permissions.canCreate('extracts')

  const lines = extract.extract_invoice_lines ?? []
  const totalDays = extract.total_days_in_month

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const xlsx = await loadXlsx()
      const headers = ['الاسم', 'رقم الإقامة', 'المهنة', 'السعر الشهري', 'أيام الحضور', 'المستحق (ريال)']
      const rows = lines.map((l) => [
        l.employee_name_snapshot,
        l.residence_number_snapshot,
        l.profession_snapshot,
        Number(l.monthly_rate_snapshot),
        l.attendance_days,
        Number(l.amount),
      ])

      const ws = xlsx.utils.aoa_to_sheet([headers, ...rows])
      // تنسيق الأعمدة
      ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 18 }]

      const wb = xlsx.utils.book_new()
      const sheetName = `${extract.projects?.name ?? 'مستخلص'} — ${formatPeriodMonth(extract.period_month)}`
      xlsx.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))

      const buf = xlsx.write(wb, { type: 'array', bookType: 'xlsx' })
      const fileName = `مستخلص-${extract.projects?.name ?? ''}-${extract.period_month}-v${extract.version}.xlsx`
      saveAs(new Blob([buf], { type: 'application/octet-stream' }), fileName)

      // تحديث الحالة إلى "تم التصدير" إذا كان مسودة
      if (isDraft) {
        markExported.mutate(id, {
          onSuccess: () => toast.success('تم التصدير وتحديث الحالة'),
          onError: () => toast.warning('تم تحميل الملف ولكن فشل تحديث الحالة'),
        })
      } else {
        toast.success('تم إعادة تصدير الملف')
      }
    } catch {
      toast.error('فشل إنشاء ملف Excel')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteLine = (lineId: string) => {
    setDeletingLineId(lineId)
  }

  const confirmDelete = () => {
    if (!deletingLineId) return
    deleteLineMutation.mutate(deletingLineId, {
      onSuccess: () => {
        toast.success('تم حذف السطر')
        setDeletingLineId(null)
      },
      onError: () => {
        toast.error('فشل الحذف')
        setDeletingLineId(null)
      },
    })
  }

  const handleDuplicate = () => {
    duplicateExtract.mutate(id, {
      onError: () => toast.error('فشل إنشاء النسخة'),
    })
  }

  const handleConfirmDelete = () => {
    if (id) {
      deleteExtractMutation.mutate(id, {
        onSuccess: () => {
          toast.success('تم حذف المستخلص')
        },
        onError: () => {
          toast.error('فشل حذف المستخلص')
        },
      })
    }
  }

  return wrap(
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onBack ? onBack() : navigate('/extracts')}
            className="text-slate-500 hover:text-slate-700 transition mt-1"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 line-clamp-2">
              {extract.projects?.name ?? '—'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {formatPeriodMonth(extract.period_month)} · نسخة {extract.version} · {extract.employee_count} موظف
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
          <StatusBadge status={extract.status} />

          {/* Admin editing exported extract badge */}
          {!isDraft && isAdmin && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 font-medium">
              <ShieldAlert className="h-3 w-3" />
              تعديل مباشر — مدير النظام
            </span>
          )}

          {canCreate && (
            <button
              onClick={handleDuplicate}
              disabled={duplicateExtract.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition disabled:opacity-50"
            >
              <Copy className="h-4 w-4" />
              تكرار كنسخة جديدة
            </button>
          )}

          {canExport && (
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'جاري التصدير...' : isDraft ? 'تصدير Excel' : 'إعادة تصدير'}
            </button>
          )}

          {permissions.canDelete('extracts') && (
            <button
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleteExtractMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50 transition disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              حذف المستخلص
            </button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
          <div className="text-lg font-bold text-slate-800">{extract.employee_count}</div>
          <div className="text-xs text-slate-500 mt-0.5">موظف</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
          <div className="text-lg font-bold text-slate-800">{extract.total_days_in_month}</div>
          <div className="text-xs text-slate-500 mt-0.5">يوم في الشهر</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
          <div className="text-lg font-bold text-primary font-mono">
            {Number(extract.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">ريال إجمالي</div>
        </div>
      </div>

      {/* Lines table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700">سطور المستخلص</h2>
          {canEdit && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              إضافة سطر يدوي
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-2.5 px-4 text-right font-medium text-slate-600">الاسم</th>
                <th className="py-2.5 px-3 text-right font-medium text-slate-600 hidden sm:table-cell">رقم الإقامة</th>
                <th className="py-2.5 px-3 text-right font-medium text-slate-600">المهنة</th>
                <th className="py-2.5 px-3 text-center font-medium text-slate-600">السعر الشهري</th>
                <th className="py-2.5 px-3 text-center font-medium text-slate-600">الأيام</th>
                <th className="py-2.5 px-3 text-right font-medium text-slate-600">المستحق (ريال)</th>
                {canDelete && <th className="py-2.5 px-2 w-8" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.length === 0 && (
                <tr>
                  <td colSpan={canDelete ? 7 : 6} className="py-10 text-center text-slate-400 text-sm">
                    لا توجد سطور
                  </td>
                </tr>
              )}
              {lines.map((line) => (
                <tr key={line.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-4 text-slate-800 font-medium">{line.employee_name_snapshot}</td>
                  <td className="py-2.5 px-3 text-slate-500 text-xs hidden sm:table-cell font-mono">
                    {line.residence_number_snapshot}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{line.profession_snapshot}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-600 text-xs">
                    {Number(line.monthly_rate_snapshot).toLocaleString('en-US')}
                  </td>
                  <td className="py-2.5 px-3">
                    {canEdit ? (
                      <EditableAttendanceCell
                        line={line}
                        totalDaysInMonth={totalDays}
                        invoiceId={id}
                      />
                    ) : (
                      <span className="block text-center text-slate-700">{line.attendance_days}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-800">
                    {Number(line.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  {canDelete && (
                    <td className="py-2.5 px-2">
                      <button
                        onClick={() => handleDeleteLine(line.id)}
                        className="text-slate-400 hover:text-red-500 transition"
                        title="حذف السطر"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>

            {lines.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                  <td className="py-2.5 px-4 text-slate-700" colSpan={2}>
                    الإجمالي — {lines.length} موظف
                  </td>
                  <td className="hidden sm:table-cell" />
                  <td />
                  <td className="py-2.5 px-3 text-center text-slate-600 text-xs">
                    {lines.reduce((s, l) => s + l.attendance_days, 0)} يوم
                  </td>
                  <td className="py-2.5 px-3 font-mono text-primary">
                    {Number(extract.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ريال
                  </td>
                  {canDelete && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Non-admin + exported message */}
      {!isDraft && !isAdmin && (
        <p className="text-xs text-slate-400 text-center">
          المستخلص مُصدَّر — لإجراء تعديلات استخدم "تكرار كنسخة جديدة"
        </p>
      )}

      {/* Delete confirm dialog */}
      {deletingLineId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-5 space-y-4">
            <h3 className="text-base font-semibold text-slate-800">تأكيد الحذف</h3>
            <p className="text-sm text-slate-600">هل أنت متأكد من حذف هذا السطر؟ لا يمكن التراجع.</p>
            <div className="flex gap-2">
              <button
                onClick={confirmDelete}
                disabled={deleteLineMutation.isPending}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleteLineMutation.isPending ? 'جاري الحذف...' : 'حذف'}
              </button>
              <button
                onClick={() => setDeletingLineId(null)}
                className="flex-1 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add line modal */}
      {showAddModal && (
        <AddLineModal
          invoiceId={id}
          projectId={extract.project_id}
          totalDaysInMonth={totalDays}
          existingLines={lines}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>حذف المستخلص</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من رغبتك في حذف هذا المستخلص الخاص بـ {extract.projects?.name}؟ لا يمكن استرجاع البيانات المحذوفة.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteExtractMutation.isPending}
            >
              {deleteExtractMutation.isPending ? 'جاري الحذف...' : 'حذف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
