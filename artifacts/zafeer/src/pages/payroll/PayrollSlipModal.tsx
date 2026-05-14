import { createPortal } from 'react-dom'
import {
  CreditCard,
  Download,
  ReceiptText,
  X,
} from 'lucide-react'
import { type PayrollEntry } from '@/lib/supabase'
import { type AllObligationsSummaryRow } from '@/hooks/useEmployeeObligations'
import { normalizePayrollEntryAmounts } from '@/utils/payrollMath'

interface PayrollSlip {
  slip_number?: string | null
  generated_at?: string | null
  payroll_entry_id?: string | null
}

interface SlipComponent {
  component_type?: string
  component_code?: string
  amount?: number
  notes?: string | null
}

interface Props {
  selectedPayrollSlip: PayrollSlip | null
  selectedSlipEntry: Partial<PayrollEntry> | null | undefined
  selectedSlipComponents: SlipComponent[]
  selectedSlipTotals: ReturnType<typeof normalizePayrollEntryAmounts> | null
  allObligationsSummary: AllObligationsSummaryRow[]
  onClose: () => void
  onDownloadPdf: () => void
  onPrint: () => void
}

export default function PayrollSlipModal({
  selectedPayrollSlip,
  selectedSlipEntry,
  selectedSlipComponents,
  selectedSlipTotals,
  allObligationsSummary,
  onClose,
  onDownloadPdf,
  onPrint,
}: Props) {
  if (!selectedPayrollSlip || !selectedSlipEntry) return null

  const slipObligation = allObligationsSummary.find(
    (row) => row.employee_id === selectedSlipEntry.employee_id
  )
  const slipGross = Number(selectedSlipTotals?.grossAmount || selectedSlipEntry.gross_amount || 0)
  const slipNet = Number(selectedSlipTotals?.netAmount || selectedSlipEntry.net_amount || 0)
  const slipDeductions = Number(selectedSlipEntry.deductions_amount || 0)
  const slipInstallment = Number(selectedSlipEntry.installment_deducted_amount || 0)
  const totalDeducted = slipDeductions + slipInstallment
  const obligRemaining = slipObligation?.total_remaining ?? 0
  const obligMonthly = slipObligation?.total_monthly ?? 0
  const payrollMonthLabel = selectedPayrollSlip.slip_number?.slice(0, 7) || '-'

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/65 p-4 pt-8 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl mb-8 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-l from-slate-800 to-slate-700 px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-slate-200 mb-2">
              <CreditCard className="w-3 h-3" />
              قسيمة راتب — {payrollMonthLabel}
            </div>
            <h2 className="text-xl font-bold text-white leading-tight">
              {selectedSlipEntry.employee_name_snapshot || 'موظف'}
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              {selectedSlipEntry.company_name_snapshot || selectedSlipEntry.project_name_snapshot || '—'}
              {selectedSlipEntry.residence_number_snapshot
                ? ` • ${selectedSlipEntry.residence_number_snapshot}`
                : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onDownloadPdf}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-white transition"
            >
              <Download className="w-3.5 h-3.5" />
              PDF
            </button>
            <button
              type="button"
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 text-xs font-semibold text-white transition"
            >
              <ReceiptText className="w-3.5 h-3.5" />
              طباعة
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-white/10 hover:bg-white/20 p-1.5 text-slate-300 hover:text-white transition"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Totals strip */}
        <div className="grid grid-cols-4 divide-x divide-x-reverse divide-slate-100 border-b border-slate-100 bg-slate-50">
          <div className="px-4 py-4 text-center">
            <div className="text-[11px] font-medium text-slate-500 mb-1">إجمالي الراتب</div>
            <div className="text-xl font-bold text-blue-700">
              {slipGross.toLocaleString('en-US')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">ر.س</div>
          </div>
          <div className="px-4 py-4 text-center">
            <div className="text-[11px] font-medium text-slate-500 mb-1">إجمالي الخصومات</div>
            <div className="text-xl font-bold text-red-600">
              {totalDeducted.toLocaleString('en-US')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">ر.س</div>
          </div>
          <div className="px-4 py-4 text-center">
            <div className="text-[11px] font-medium text-slate-500 mb-1">خصم الأقساط</div>
            <div className="text-xl font-bold text-amber-600">
              {slipInstallment.toLocaleString('en-US')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">ر.س</div>
          </div>
          <div className="px-4 py-4 text-center bg-emerald-50">
            <div className="text-[11px] font-medium text-emerald-700 mb-1">صافي الراتب</div>
            <div className="text-xl font-bold text-emerald-700">
              {slipNet.toLocaleString('en-US')}
            </div>
            <div className="text-[10px] text-emerald-500 mt-0.5">ر.س</div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Details row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'الراتب الأساسي', value: `${Number(selectedSlipEntry.basic_salary_snapshot || 0).toLocaleString('en-US')} ر.س` },
              { label: 'أيام الحضور', value: `${Number(selectedSlipEntry.attendance_days || 0)} يوم` },
              { label: 'الإجازات المدفوعة', value: `${Number(selectedSlipEntry.paid_leave_days || 0)} يوم` },
              { label: 'الإضافي', value: `${Number(selectedSlipEntry.overtime_amount || 0).toLocaleString('en-US')} ر.س` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                <div className="text-[11px] text-slate-500 mb-1">{label}</div>
                <div className="text-sm font-semibold text-slate-800">{value}</div>
              </div>
            ))}
          </div>

          {/* Obligation summary */}
          {(obligRemaining > 0 || obligMonthly > 0) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold text-orange-700">إجمالي المتبقي</div>
                  <div className="text-[11px] text-orange-600">من الالتزامات المالية</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-orange-700">{obligRemaining.toLocaleString('en-US')}</div>
                  <div className="text-[10px] text-orange-500">ر.س</div>
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold text-blue-700">القسط الشهري المقرر</div>
                  <div className="text-[11px] text-blue-600">وفق جدول الاستحقاق</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-700">{obligMonthly.toLocaleString('en-US')}</div>
                  <div className="text-[10px] text-blue-500">ر.س</div>
                </div>
              </div>
            </div>
          )}

          {/* Deduction breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
              <div className="text-[11px] text-slate-500 mb-1">الجزاءات / الغرامات</div>
              <div className="text-sm font-semibold text-red-600">{slipDeductions.toLocaleString('en-US')} ر.س</div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
              <div className="text-[11px] text-slate-500 mb-1">إجمالي المقتطع فعلياً</div>
              <div className="text-sm font-semibold text-slate-800">{totalDeducted.toLocaleString('en-US')} ر.س</div>
            </div>
          </div>

          {/* Components table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-100 text-xs font-semibold text-slate-600 border-b border-slate-200">
              مكونات القسيمة التفصيلية
            </div>
            {selectedSlipComponents.length === 0 ? (
              <div className="p-6 text-sm text-slate-400 text-center">
                لا توجد مكونات تفصيلية محفوظة لهذه القسيمة.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">النوع</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">الكود</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">المبلغ (ر.س)</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">الملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {selectedSlipComponents.map((component, index) => (
                      <tr
                        key={`${component.component_code || 'component'}-${index}`}
                        className="hover:bg-slate-50 transition"
                      >
                        <td className="px-4 py-2.5 text-slate-600">{component.component_type || '-'}</td>
                        <td className="px-4 py-2.5 font-mono text-xs font-medium text-slate-800">
                          {component.component_code || '-'}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-slate-900">
                          {Number(component.amount || 0).toLocaleString('en-US')}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs">
                          {component.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-mono">{selectedPayrollSlip.slip_number}</div>
          <div className="text-xs text-slate-400">
            {selectedPayrollSlip.generated_at
              ? new Date(selectedPayrollSlip.generated_at).toLocaleString('en-GB')
              : ''}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
