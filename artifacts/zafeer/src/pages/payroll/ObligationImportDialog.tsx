import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, FileUp, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { type ObligationImportRow } from './payrollTypes'
import { normalizeResidenceNumber, toNumericPayrollValue } from './payrollExcelUtils'

interface SimpleEmployee {
  id: string
  name: string
  residence_number?: string | number | null
}

interface ObligationImportDialogProps {
  show: boolean
  obligationImportStep: 'upload' | 'review'
  obligationImportRows: ObligationImportRow[]
  importingObligations: boolean
  obligationImportFileName: string
  obligationImportHeaderError: string | null
  allEmployees: SimpleEmployee[]
  compactButtonBaseClass: string
  outlineCompactButtonClass: string
  onClose: () => void
  onSetStep: (step: 'upload' | 'review') => void
  onSetRows: (updater: (prev: ObligationImportRow[]) => ObligationImportRow[]) => void
  onImportFile: (file: File) => void
  onConfirmImport: () => void
}

export default function ObligationImportDialog({
  show,
  obligationImportStep,
  obligationImportRows,
  importingObligations,
  obligationImportFileName,
  obligationImportHeaderError,
  allEmployees,
  compactButtonBaseClass,
  outlineCompactButtonClass,
  onClose,
  onSetStep,
  onSetRows,
  onImportFile,
  onConfirmImport,
}: ObligationImportDialogProps) {
  const obligationImportFileRef = useRef<HTMLInputElement | null>(null)

  if (!show) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !importingObligations) {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={
          obligationImportStep === 'review'
            ? 'w-full max-w-6xl rounded-2xl border border-border-200 bg-surface shadow-2xl flex flex-col max-h-[90vh]'
            : 'w-full max-w-md rounded-2xl border border-border-200 bg-surface shadow-2xl'
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border-200 px-6 py-4 shrink-0">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {obligationImportStep === 'upload' ? 'استيراد الالتزامات من Excel' : 'مراجعة البيانات قبل الاستيراد'}
            </h2>
            {obligationImportStep === 'review' && (
              <p className="text-xs text-foreground-secondary mt-0.5">
                {obligationImportRows.length} صف ·{' '}
                <span className="text-red-600">
                  {obligationImportRows.filter((r) => !r.employee_id).length} غير مطابق
                </span>{' '}
                ·{' '}
                <span className="text-emerald-700">
                  {obligationImportRows.filter((r) => r.selected).length} محدد للاستيراد
                </span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => { if (!importingObligations) onClose() }}
            className="rounded-lg p-1.5 text-foreground-tertiary hover:bg-surface-secondary-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Upload Step */}
        {obligationImportStep === 'upload' && (
          <div className="p-6 space-y-5">
            {/* Column guide */}
            <div className="rounded-xl border border-border-200 bg-surface-secondary-50 p-4 text-xs text-foreground-secondary space-y-1.5">
              <p className="font-semibold text-foreground text-sm">الأعمدة المتوقعة في الملف</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                <span>• <span className="font-medium text-foreground">رقم الإقامة</span> — مطلوب</span>
                <span>• اسم الموظف — اختياري</span>
                <span>• سلفة</span>
                <span>• نقل كفالة</span>
                <span>• تجديد</span>
                <span>• غرامة</span>
                <span>• أخرى</span>
                <span>• ملاحظات</span>
              </div>
            </div>

            {/* Drop zone */}
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border-300 bg-surface-secondary-50 py-10 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition"
              onClick={() => obligationImportFileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer.files?.[0]
                if (file) onImportFile(file)
              }}
            >
              <FileUp className="h-8 w-8 text-blue-500" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">اسحب الملف هنا أو اضغط للاختيار</p>
                <p className="text-xs text-foreground-tertiary mt-1">xlsx, xls, csv</p>
              </div>
              {obligationImportFileName && (
                <span className="text-xs text-blue-700 font-medium bg-blue-100 px-3 py-1 rounded-full">
                  {obligationImportFileName}
                </span>
              )}
              <input
                ref={obligationImportFileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) onImportFile(file)
                  e.target.value = ''
                }}
              />
            </div>

            {obligationImportHeaderError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {obligationImportHeaderError}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className={outlineCompactButtonClass}
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Review Step */}
        {obligationImportStep === 'review' && (
          <>
            {/* Select-all bar */}
            <div className="flex items-center gap-3 px-6 py-3 border-b border-border-200 bg-surface-secondary-50 shrink-0">
              <input
                type="checkbox"
                id="oblig-import-select-all"
                checked={
                  obligationImportRows.length > 0 &&
                  obligationImportRows.filter((r) => r.employee_id).length > 0 &&
                  obligationImportRows.filter((r) => r.employee_id).every((r) => r.selected)
                }
                onChange={(e) =>
                  onSetRows((prev) =>
                    prev.map((r) => ({ ...r, selected: r.employee_id ? e.target.checked : false }))
                  )
                }
                className="h-4 w-4 rounded border-border-300 accent-blue-600"
              />
              <label htmlFor="oblig-import-select-all" className="text-xs font-medium text-foreground-secondary cursor-pointer">
                تحديد الكل
              </label>
              <span className="mr-auto text-xs text-foreground-tertiary">
                الصفوف ذات الخلفية الحمراء: لم يُعثر على رقم الإقامة في النظام
              </span>
            </div>

            {/* Scrollable table */}
            <div className="overflow-auto flex-1 min-h-0">
              <table className="w-full text-xs min-w-[900px]">
                <thead className="bg-surface-secondary-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 w-8"></th>
                    <th className="px-3 py-2 text-right font-semibold">#</th>
                    <th className="px-3 py-2 text-right font-semibold">اسم الموظف (من الملف)</th>
                    <th className="px-3 py-2 text-right font-semibold">رقم الإقامة</th>
                    <th className="px-3 py-2 text-right font-semibold">الموظف المطابق</th>
                    <th className="px-3 py-2 text-right font-semibold">سلفة<br/><span className="text-foreground-tertiary font-normal text-[10px]">المبلغ / أقساط / شهر</span></th>
                    <th className="px-3 py-2 text-right font-semibold">نقل كفالة<br/><span className="text-foreground-tertiary font-normal text-[10px]">المبلغ / أقساط / شهر</span></th>
                    <th className="px-3 py-2 text-right font-semibold">تجديد<br/><span className="text-foreground-tertiary font-normal text-[10px]">المبلغ / أقساط / شهر</span></th>
                    <th className="px-3 py-2 text-right font-semibold">غرامة<br/><span className="text-foreground-tertiary font-normal text-[10px]">المبلغ / أقساط / شهر</span></th>
                    <th className="px-3 py-2 text-right font-semibold">أخرى<br/><span className="text-foreground-tertiary font-normal text-[10px]">المبلغ / أقساط / شهر</span></th>
                    <th className="px-3 py-2 text-right font-semibold">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-100">
                  {obligationImportRows.map((row, idx) => {
                    const isUnmatched = !row.employee_id
                    return (
                      <tr
                        key={row.row_number}
                        className={
                          isUnmatched
                            ? 'bg-red-50 hover:bg-red-100/70'
                            : row.selected
                            ? 'bg-emerald-50/40 hover:bg-emerald-50'
                            : 'hover:bg-surface-secondary-50'
                        }
                      >
                        {/* Checkbox */}
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            disabled={isUnmatched}
                            onChange={(e) =>
                              onSetRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, selected: e.target.checked } : r
                                )
                              )
                            }
                            className="h-3.5 w-3.5 rounded border-border-300 accent-blue-600 disabled:opacity-40"
                          />
                        </td>
                        {/* Row # */}
                        <td className="px-3 py-2 text-foreground-tertiary">{row.row_number}</td>
                        {/* Name from file */}
                        <td className="px-3 py-2 text-foreground-secondary max-w-[140px]">
                          <input
                            type="text"
                            value={row.employee_name_from_file}
                            onChange={(e) =>
                              onSetRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, employee_name_from_file: e.target.value } : r
                                )
                              )
                            }
                            className="w-full bg-transparent border-b border-dashed border-border-300 focus:outline-none focus:border-blue-400 py-0.5"
                          />
                        </td>
                        {/* Residence — editable to allow re-resolving unmatched rows */}
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.residence_number}
                            onChange={(e) => {
                              const newIqama = normalizeResidenceNumber(e.target.value)
                              const empByIqama = new Map<string, { id: string; name: string }>()
                              allEmployees.forEach((emp) => {
                                const iq = normalizeResidenceNumber(emp.residence_number)
                                if (iq) empByIqama.set(iq, { id: emp.id, name: emp.name })
                              })
                              const resolved = newIqama ? (empByIqama.get(newIqama) ?? null) : null
                              onSetRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx
                                    ? {
                                        ...r,
                                        residence_number: newIqama || e.target.value,
                                        employee_id: resolved?.id ?? null,
                                        employee_name: resolved?.name ?? null,
                                        selected: resolved !== null,
                                      }
                                    : r
                                )
                              )
                            }}
                            className="w-28 font-mono rounded border border-border-200 px-1.5 py-0.5 text-xs bg-surface focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                          />
                        </td>
                        {/* Matched employee */}
                        <td className="px-3 py-2">
                          {isUnmatched ? (
                            <span className="text-red-600 font-medium flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              غير موجود
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium">{row.employee_name}</span>
                          )}
                        </td>
                        {/* Per-type: amount + installments + start_month */}
                        {(
                          [
                            { label: 'advance', amtField: 'advance_amount', instField: 'advance_installments', monthField: 'advance_start_month' },
                            { label: 'transfer', amtField: 'transfer_amount', instField: 'transfer_installments', monthField: 'transfer_start_month' },
                            { label: 'renewal', amtField: 'renewal_amount', instField: 'renewal_installments', monthField: 'renewal_start_month' },
                            { label: 'penalty', amtField: 'penalty_amount', instField: 'penalty_installments', monthField: 'penalty_start_month' },
                            { label: 'other', amtField: 'other_amount', instField: 'other_installments', monthField: 'other_start_month' },
                          ] as const
                        ).map(({ label, amtField, instField, monthField }) => {
                          const amt = row[amtField]
                          return (
                            <td key={label} className="px-2 py-1.5 align-top">
                              <div className="flex flex-col gap-1">
                                {/* Amount */}
                                <input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  placeholder="0"
                                  value={amt || ''}
                                  onChange={(e) =>
                                    onSetRows((prev) =>
                                      prev.map((r, i) =>
                                        i === idx ? { ...r, [amtField]: toNumericPayrollValue(e.target.value) } : r
                                      )
                                    )
                                  }
                                  className="w-20 rounded border border-border-200 px-1.5 py-0.5 text-xs bg-surface focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                                />
                                {amt > 0 && (
                                  <>
                                    {/* Installments */}
                                    <input
                                      type="number"
                                      min={1}
                                      max={60}
                                      value={row[instField]}
                                      onChange={(e) =>
                                        onSetRows((prev) =>
                                          prev.map((r, i) =>
                                            i === idx
                                              ? { ...r, [instField]: Math.max(1, parseInt(e.target.value) || 1) }
                                              : r
                                          )
                                        )
                                      }
                                      title="عدد الأقساط"
                                      className="w-14 rounded border border-blue-200 px-1.5 py-0.5 text-xs bg-blue-50 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                                    />
                                    {/* Start month */}
                                    <input
                                      type="month"
                                      value={row[monthField]}
                                      onChange={(e) =>
                                        onSetRows((prev) =>
                                          prev.map((r, i) =>
                                            i === idx ? { ...r, [monthField]: e.target.value } : r
                                          )
                                        )
                                      }
                                      className="rounded border border-blue-200 px-1 py-0.5 text-[10px] bg-blue-50 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                                    />
                                  </>
                                )}
                              </div>
                            </td>
                          )
                        })}
                        {/* Notes */}
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.notes}
                            onChange={(e) =>
                              onSetRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, notes: e.target.value } : r
                                )
                              )
                            }
                            className="w-28 bg-transparent border-b border-dashed border-border-300 focus:outline-none focus:border-blue-400 py-0.5"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-between gap-3 border-t border-border-200 px-6 py-4 shrink-0">
              <button
                type="button"
                onClick={() => onSetStep('upload')}
                disabled={importingObligations}
                className={outlineCompactButtonClass}
              >
                رجوع
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { if (!importingObligations) onClose() }}
                  disabled={importingObligations}
                  className={outlineCompactButtonClass}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={
                    importingObligations ||
                    obligationImportRows.filter((r) => r.selected && r.employee_id).length === 0
                  }
                  onClick={onConfirmImport}
                  className={`${compactButtonBaseClass} bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60`}
                >
                  {importingObligations ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  {importingObligations
                    ? 'جاري الاستيراد...'
                    : `استيراد ${obligationImportRows.filter((r) => r.selected && r.employee_id).length} صف`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
