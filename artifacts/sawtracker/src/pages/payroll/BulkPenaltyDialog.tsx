import { createPortal } from 'react-dom'
import { X, Users, Search, CheckCircle, Loader2 } from 'lucide-react'

interface ActiveEmployee {
  id: string
  name: string
  residence_number?: string | number | null
  project_name?: string | null
  project?: { name?: string } | null
}

interface BulkPenaltyDialogProps {
  show: boolean
  confirmingBulkPenalty: boolean
  bulkPenaltySearch: string
  bulkPenaltySelectedIds: Set<string>
  bulkPenaltyAmount: number
  bulkPenaltyMonth: string
  bulkPenaltyNotes: string
  allActiveEmployees: ActiveEmployee[]
  compactButtonBaseClass: string
  outlineCompactButtonClass: string
  onClose: () => void
  onSetSearch: (v: string) => void
  onSetSelectedIds: (updater: (prev: Set<string>) => Set<string>) => void
  onSetAmount: (v: number) => void
  onSetMonth: (v: string) => void
  onSetNotes: (v: string) => void
  onConfirm: () => void
}

export default function BulkPenaltyDialog({
  show,
  confirmingBulkPenalty,
  bulkPenaltySearch,
  bulkPenaltySelectedIds,
  bulkPenaltyAmount,
  bulkPenaltyMonth,
  bulkPenaltyNotes,
  allActiveEmployees,
  compactButtonBaseClass,
  outlineCompactButtonClass,
  onClose,
  onSetSearch,
  onSetSelectedIds,
  onSetAmount,
  onSetMonth,
  onSetNotes,
  onConfirm,
}: BulkPenaltyDialogProps) {
  if (!show) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !confirmingBulkPenalty) {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] border border-border-200"
      >
        {/* رأس المودال */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-200 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-600" />
            <h2 className="text-base font-bold text-foreground">غرامة جماعية</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={confirmingBulkPenalty}
            className="p-1.5 rounded-lg hover:bg-surface-secondary-50 text-foreground-secondary transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* جسم المودال */}
        <div className="flex flex-col flex-1 overflow-hidden p-6 gap-5">

          {/* حقول المبلغ والشهر والملاحظة */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1.5">
                مبلغ الغرامة (ريال) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={bulkPenaltyAmount || ''}
                onChange={(e) => onSetAmount(Number(e.target.value))}
                placeholder="0.00"
                className="w-full h-9 rounded-lg border border-border-300 bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1.5">
                شهر الاستقطاع <span className="text-red-500">*</span>
              </label>
              <input
                type="month"
                value={bulkPenaltyMonth}
                onChange={(e) => onSetMonth(e.target.value)}
                className="w-full h-9 rounded-lg border border-border-300 bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground-secondary mb-1.5">
                سبب الغرامة / ملاحظة
              </label>
              <input
                type="text"
                value={bulkPenaltyNotes}
                onChange={(e) => onSetNotes(e.target.value)}
                placeholder="اختياري"
                className="w-full h-9 rounded-lg border border-border-300 bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>
          </div>

          {/* قائمة الموظفين */}
          <div className="flex flex-col flex-1 overflow-hidden border border-border-200 rounded-xl">
            {/* بحث وتحديد الكل */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border-200 bg-surface-secondary-50 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground-muted" />
                <input
                  type="text"
                  value={bulkPenaltySearch}
                  onChange={(e) => onSetSearch(e.target.value)}
                  placeholder="بحث بالاسم أو رقم الإقامة…"
                  className="w-full h-8 pr-9 pl-3 rounded-lg border border-border-200 bg-surface text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-orange-500/40"
                />
              </div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-foreground-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={
                    allActiveEmployees.length > 0 &&
                    allActiveEmployees.every((e) => bulkPenaltySelectedIds.has(e.id))
                  }
                  onChange={(ev) => {
                    const allIds = allActiveEmployees.map((e) => e.id)
                    onSetSelectedIds(() => ev.target.checked ? new Set(allIds) : new Set())
                  }}
                  className="h-4 w-4 rounded border-border-300 accent-orange-600"
                />
                تحديد الكل
              </label>
              {bulkPenaltySelectedIds.size > 0 && (
                <span className="text-xs font-medium text-orange-600 shrink-0">
                  {bulkPenaltySelectedIds.size} محدد
                </span>
              )}
            </div>

            {/* صفوف الموظفين */}
            <div className="overflow-y-auto flex-1">
              {(() => {
                const q = bulkPenaltySearch.trim().toLowerCase()
                const filtered = allActiveEmployees
                  .filter((e) =>
                    q
                      ? e.name.toLowerCase().includes(q) ||
                        String(e.residence_number || '').includes(q)
                      : true
                  )
                if (filtered.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-foreground-muted">
                      <Users className="h-8 w-8 mb-2 opacity-30" />
                      <p className="text-sm">لا يوجد موظفون مطابقون</p>
                    </div>
                  )
                }
                return filtered.map((emp) => {
                  const checked = bulkPenaltySelectedIds.has(emp.id)
                  return (
                    <label
                      key={emp.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer border-b border-border-100 last:border-b-0 transition-colors ${
                        checked
                          ? 'bg-orange-50 dark:bg-orange-900/10'
                          : 'hover:bg-surface-secondary-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(ev) => {
                          onSetSelectedIds((prev) => {
                            const next = new Set(prev)
                            if (ev.target.checked) next.add(emp.id)
                            else next.delete(emp.id)
                            return next
                          })
                        }}
                        className="h-4 w-4 rounded border-border-300 accent-orange-600 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{emp.name}</p>
                        <p className="text-xs text-foreground-muted">
                          {emp.residence_number ?? '—'}
                          {emp.project?.name ? ` · ${emp.project.name}` : emp.project_name ? ` · ${emp.project_name}` : ''}
                        </p>
                      </div>
                    </label>
                  )
                })
              })()}
            </div>
          </div>
        </div>

        {/* تذييل المودال */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={confirmingBulkPenalty}
            className={outlineCompactButtonClass}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={
              confirmingBulkPenalty ||
              bulkPenaltySelectedIds.size === 0 ||
              bulkPenaltyAmount <= 0 ||
              !bulkPenaltyMonth
            }
            className={`${compactButtonBaseClass} bg-orange-600 text-white hover:bg-orange-700`}
          >
            {confirmingBulkPenalty ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جارٍ الإنشاء…
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                تطبيق الغرامة على {bulkPenaltySelectedIds.size > 0 ? `${bulkPenaltySelectedIds.size} موظف` : 'الموظفين المحددين'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
