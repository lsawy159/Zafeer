import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ChevronDown, ChevronUp, Trash2, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { useDeletedEmployeeObligations, type DeletedEmployeeObligationRow } from '@/hooks/useEmployeeObligations'
import { deleteObligationHeaders } from '../employees/employeeUtils'
import { logger } from '@/utils/logger'
import { Button } from '@/components/ui/Button'

function getObligationTypeLabel(type: string): string {
  switch (type) {
    case 'advance': return 'سلفة'
    case 'transfer': return 'نقل كفالة'
    case 'renewal': return 'تجديد'
    case 'penalty': return 'غرامة'
    default: return 'التزام آخر'
  }
}

function formatAmount(amount: number, currency: string): string {
  return `${Number(amount).toLocaleString('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency || 'ريال'}`
}

function DeleteObligationConfirmDialog({
  row,
  onConfirm,
  onCancel,
  loading,
}: {
  row: DeletedEmployeeObligationRow
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="bg-surface rounded-xl shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-100 p-3 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900">تأكيد حذف الالتزام</h3>
              <p className="text-sm text-neutral-500">هذا الإجراء لا يمكن التراجع عنه</p>
            </div>
          </div>

          <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3 mb-4 space-y-1">
            <p className="text-sm font-medium text-neutral-800">
              {row.title || getObligationTypeLabel(row.obligation_type)}
            </p>
            <p className="text-xs text-neutral-500">
              {row.employee?.name ?? row.employee_id} • {getObligationTypeLabel(row.obligation_type)} • {formatAmount(row.total_amount, row.currency_code)}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onConfirm}
              disabled={loading}
              variant="destructive"
              className="flex-1"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  نعم، احذف الالتزام
                </>
              )}
            </Button>
            <Button onClick={onCancel} disabled={loading} variant="secondary" className="flex-1">
              إلغاء
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DeletedEmployeeObligationsSection() {
  const queryClient = useQueryClient()
  const { data = [], isLoading } = useDeletedEmployeeObligations()
  const [open, setOpen] = useState(false)
  const [confirmRow, setConfirmRow] = useState<DeletedEmployeeObligationRow | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (isLoading || data.length === 0) return null

  const handleDeleteConfirmed = async () => {
    if (!confirmRow) return
    setDeletingId(confirmRow.id)
    try {
      await deleteObligationHeaders([confirmRow.id])
      await queryClient.invalidateQueries({ queryKey: ['deleted-employee-obligations'] })
      await queryClient.invalidateQueries({ queryKey: ['all-obligations-summary'] })
      toast.success('تم حذف الالتزام بنجاح')
      setConfirmRow(null)
    } catch (err) {
      logger.error('Error deleting obligation for deleted employee:', err)
      toast.error('تعذر حذف الالتزام')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-red-200 bg-red-50 overflow-hidden mt-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-right hover:bg-red-100/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <UserX className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-red-800">
              التزامات الموظفين المغادرين ({data.length})
            </span>
          </div>
          {open ? (
            <ChevronUp className="w-4 h-4 text-red-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-red-600" />
          )}
        </button>

        {open && (
          <div className="border-t border-red-200">
            <div className="divide-y divide-red-100">
              {data.map((row) => (
                <div key={row.id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-red-50/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-neutral-800 truncate">
                        {row.title || getObligationTypeLabel(row.obligation_type)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                        <UserX className="w-3 h-3" />
                        موظف محذوف
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-neutral-500">
                        {row.employee?.name ?? row.employee_id}
                      </span>
                      <span className="text-xs text-neutral-400">•</span>
                      <span className="text-xs text-neutral-500">
                        {getObligationTypeLabel(row.obligation_type)}
                      </span>
                      <span className="text-xs text-neutral-400">•</span>
                      <span className="text-xs font-medium text-neutral-700">
                        {formatAmount(row.total_amount, row.currency_code)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmRow(row)}
                    disabled={deletingId === row.id}
                    className="flex-shrink-0 p-2 rounded-lg text-red-500 hover:bg-red-100 hover:text-red-700 transition-colors disabled:opacity-40"
                    title="حذف الالتزام"
                  >
                    {deletingId === row.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {confirmRow && (
        <DeleteObligationConfirmDialog
          row={confirmRow}
          onConfirm={() => void handleDeleteConfirmed()}
          onCancel={() => setConfirmRow(null)}
          loading={deletingId === confirmRow.id}
        />
      )}
    </>
  )
}
