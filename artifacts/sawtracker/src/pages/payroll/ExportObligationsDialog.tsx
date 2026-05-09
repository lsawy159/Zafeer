import { createPortal } from 'react-dom'
import { X, Download, Loader2 } from 'lucide-react'
import { type AllObligationsSummaryRow } from '@/hooks/useEmployeeObligations'

interface ExportObligationsDialogProps {
  show: boolean
  canExport: boolean
  exportingObligations: boolean
  exportScope: 'filtered' | 'all'
  exportTypes: { transfer: boolean; renewal: boolean; penalty: boolean; advance: boolean; other: boolean }
  exportColumns: {
    employee_name: boolean
    residence_number: boolean
    project: boolean
    company: boolean
    total_amount: boolean
    total_paid: boolean
    per_type: boolean
    total_remaining: boolean
    monthly_installments: boolean
  }
  filteredObligationsSummary: AllObligationsSummaryRow[]
  allObligationsSummary: AllObligationsSummaryRow[]
  onClose: () => void
  onSetExportScope: (scope: 'filtered' | 'all') => void
  onSetExportTypes: (updater: (prev: ExportObligationsDialogProps['exportTypes']) => ExportObligationsDialogProps['exportTypes']) => void
  onSetExportColumns: (updater: (prev: ExportObligationsDialogProps['exportColumns']) => ExportObligationsDialogProps['exportColumns']) => void
  onExport: (scope: 'filtered' | 'all', types: ExportObligationsDialogProps['exportTypes'], columns: ExportObligationsDialogProps['exportColumns']) => Promise<void>
}

export default function ExportObligationsDialog({
  show,
  canExport,
  exportingObligations,
  exportScope,
  exportTypes,
  exportColumns,
  filteredObligationsSummary,
  allObligationsSummary,
  onClose,
  onSetExportScope,
  onSetExportTypes,
  onSetExportColumns,
  onExport,
}: ExportObligationsDialogProps) {
  if (!show || !canExport) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={() => { if (!exportingObligations) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-border-200 bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* رأس النافذة */}
        <div className="flex items-center justify-between gap-3 border-b border-border-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">تصدير قائمة الالتزامات</h2>
            <p className="mt-0.5 text-xs text-foreground-secondary">اختر نطاق التصدير وأنواع الالتزامات</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={exportingObligations}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-200 text-foreground-tertiary hover:bg-surface-secondary-50 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          {/* نطاق التصدير */}
          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">نطاق التصدير</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'filtered', label: 'المفلتر فقط', sub: `${filteredObligationsSummary.length} موظف` },
                { value: 'all', label: 'جميع البيانات', sub: `${allObligationsSummary.length} موظف` },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onSetExportScope(opt.value as 'filtered' | 'all')}
                  className={`rounded-xl border px-4 py-3 text-right transition ${
                    exportScope === opt.value
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                      : 'border-border-200 bg-surface text-foreground-secondary hover:bg-surface-secondary-50'
                  }`}
                >
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs mt-0.5 opacity-70">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* أنواع الالتزامات */}
          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">أنواع الالتزامات</p>
            <div className="rounded-xl border border-border-200 divide-y divide-border-100 overflow-hidden">
              {([
                { key: 'advance', label: 'سلف', color: 'text-blue-700' },
                { key: 'transfer', label: 'نقل كفالة', color: 'text-amber-700' },
                { key: 'renewal', label: 'تجديد', color: 'text-amber-700' },
                { key: 'penalty', label: 'جزاءات', color: 'text-rose-600' },
                { key: 'other', label: 'أخرى', color: 'text-violet-700' },
              ] as const).map(({ key, label, color }) => (
                <label
                  key={key}
                  className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-surface-secondary-50 transition"
                >
                  <span className={`text-sm font-medium ${color}`}>{label}</span>
                  <input
                    type="checkbox"
                    checked={exportTypes[key]}
                    onChange={(e) => onSetExportTypes((prev) => ({ ...prev, [key]: e.target.checked }))}
                    className="h-4 w-4 rounded text-indigo-600"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* اختيار الأعمدة */}
          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">الأعمدة</p>
            <div className="rounded-xl border border-border-200 divide-y divide-border-100 overflow-hidden">
              {([
                { key: 'employee_name', label: 'اسم الموظف' },
                { key: 'residence_number', label: 'رقم الإقامة' },
                { key: 'project', label: 'المشروع' },
                { key: 'company', label: 'المؤسسة' },
                { key: 'total_amount', label: 'إجمالي الالتزامات' },
                { key: 'total_paid', label: 'المدفوع' },
                { key: 'per_type', label: 'تفاصيل الأنواع (المتبقي لكل نوع)' },
                { key: 'total_remaining', label: 'إجمالي المتبقي' },
                { key: 'monthly_installments', label: 'الأقساط الشهرية' },
              ] as const).map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-surface-secondary-50 transition"
                >
                  <span className="text-sm text-foreground-secondary">{label}</span>
                  <input
                    type="checkbox"
                    checked={exportColumns[key]}
                    onChange={(e) => onSetExportColumns((prev) => ({ ...prev, [key]: e.target.checked }))}
                    className="h-4 w-4 rounded text-indigo-600"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* أزرار التنفيذ */}
        <div className="flex items-center justify-end gap-2 border-t border-border-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={exportingObligations}
            className="rounded-xl border border-border-300 px-4 py-2 text-sm text-foreground-secondary hover:bg-surface-secondary-50 transition"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={exportingObligations || !Object.values(exportTypes).some(Boolean) || !Object.values(exportColumns).some(Boolean)}
            onClick={async () => {
              await onExport(exportScope, exportTypes, exportColumns)
              onClose()
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-60"
          >
            {exportingObligations ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exportingObligations ? 'جاري التصدير...' : 'تصدير Excel'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
