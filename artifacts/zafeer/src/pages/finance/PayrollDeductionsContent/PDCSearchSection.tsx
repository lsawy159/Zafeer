import type { usePayrollDeductionsContent } from './usePayrollDeductionsContent'
import FinancialMetricStrip from '../FinancialMetricStrip'

type Ctx = ReturnType<typeof usePayrollDeductionsContent>

export default function PDCSearchSection(ctx: Ctx) {
  const {
    obligationStats,
    filteredObligationInsightRows,
    payrollSearchQuery, setPayrollSearchQuery,
    payrollSearchMonth, setPayrollSearchMonth,
    payrollSearchProject, setPayrollSearchProject,
    payrollSearchSortField, setPayrollSearchSortField,
    payrollSearchSortDirection, setPayrollSearchSortDirection,
    payrollInsightsLoading,
    filteredPayrollSearchRows,
    payrollTableContainerRef,
    payrollRowVirtualizer,
    projectFilterOptions,
  } = ctx

  return (
    <div className="space-y-5 mb-6">
      <FinancialMetricStrip metrics={[
        {
          label: 'إجمالي الالتزامات',
          value: obligationStats.total.toLocaleString('en-US'),
        },
        {
          label: 'ما تم سداده فعلياً',
          value: obligationStats.paid.toLocaleString('en-US'),
          tone: obligationStats.paid > 0 ? 'success' as const : 'neutral' as const,
        },
        {
          label: 'المتبقي الفعلي',
          value: obligationStats.remaining.toLocaleString('en-US'),
          tone: obligationStats.remaining > 0 ? 'danger' as const : 'neutral' as const,
        },
        {
          label: 'المسدد فعلياً في الشهر',
          value: filteredObligationInsightRows
            .reduce((sum, row) => sum + Number(row.amount_paid || 0), 0)
            .toLocaleString('en-US'),
          tone: 'neutral' as const,
        },
      ]} />

      <div className="rounded-2xl border border-border-200 bg-surface p-4 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">البحث التفاعلي في الاستقطاعات</h2>
          <p className="text-sm text-gray-600">
            اكتب أي رقم أو اسم أو مشروع وسيتم الفلترة مباشرة.
          </p>
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            الأرقام داخل الصف تمثل قسط أو استقطاع المسير لهذا الشهر، أما المتبقي بالأعلى فهو
            الرصيد الفعلي من خطة الالتزام ولا ينخفض إلا بعد اعتماد المسير نهائياً.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground-secondary">بحث</label>
            <input
              type="text"
              value={payrollSearchQuery}
              onChange={(e) => setPayrollSearchQuery(e.target.value)}
              placeholder="الاسم أو رقم الإقامة أو المشروع"
              className="w-full rounded-xl border border-border-300 bg-surface px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground-secondary">الشهر</label>
            <input
              type="month"
              value={payrollSearchMonth}
              onChange={(e) => setPayrollSearchMonth(e.target.value)}
              className="w-full rounded-xl border border-border-300 bg-surface px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground-secondary">المشروع</label>
            <select
              value={payrollSearchProject}
              onChange={(e) => setPayrollSearchProject(e.target.value)}
              className="w-full rounded-xl border border-border-300 bg-surface px-3 py-2 text-sm"
            >
              <option value="">كل المشاريع</option>
              {projectFilterOptions.map((projectName) => (
                <option key={projectName} value={projectName}>
                  {projectName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground-secondary">الترتيب</label>
            <div className="flex gap-2">
              <select
                value={payrollSearchSortField}
                onChange={(e) =>
                  setPayrollSearchSortField(
                    e.target.value as typeof payrollSearchSortField
                  )
                }
                className="w-full rounded-xl border border-border-300 bg-surface px-3 py-2 text-sm"
              >
                <option value="employee_name">الموظف</option>
                <option value="residence">الإقامة</option>
                <option value="project">المشروع</option>
                <option value="month">الشهر</option>
                <option value="status">حالة المسير</option>
                <option value="deductions">إجمالي استقطاع</option>
                <option value="remaining">المتبقي</option>
                <option value="net_amount">الصافي</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  setPayrollSearchSortDirection((current) =>
                    current === 'asc' ? 'desc' : 'asc'
                  )
                }
                className="inline-flex items-center justify-center rounded-xl border border-border-300 bg-surface px-3 py-2 text-sm font-medium text-foreground-secondary"
              >
                {payrollSearchSortDirection === 'asc' ? 'تصاعدي' : 'تنازلي'}
              </button>
            </div>
          </div>
        </div>

        {payrollInsightsLoading ? (
          <div className="rounded-xl border border-border-200 bg-surface-secondary-50 px-4 py-8 text-center text-sm text-foreground-tertiary">
            جاري تحميل بيانات البحث...
          </div>
        ) : filteredPayrollSearchRows.length === 0 ? (
          <div className="rounded-xl border border-border-200 bg-surface-secondary-50 px-4 py-8 text-center text-sm text-foreground-tertiary">
            لا توجد نتائج مطابقة للفلاتر الحالية.
          </div>
        ) : (
          <div
            ref={payrollTableContainerRef}
            className="overflow-auto rounded-xl border border-border-200"
            style={{ maxHeight: 520 }}
          >
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-surface-secondary-50">
                <tr>
                  <th className="px-4 py-3 text-right">الموظف</th>
                  <th className="px-4 py-3 text-right">الإقامة</th>
                  <th className="px-4 py-3 text-right">المشروع</th>
                  <th className="px-4 py-3 text-right">الشهر</th>
                  <th className="px-4 py-3 text-right">حالة المسير</th>
                  <th className="px-4 py-3 text-right">قسط نقل وتجديد</th>
                  <th className="px-4 py-3 text-right">قسط جزاءات</th>
                  <th className="px-4 py-3 text-right">قسط سلف</th>
                  <th className="px-4 py-3 text-right">قسط أخرى</th>
                  <th className="px-4 py-3 text-right">إجمالي استقطاع الشهر</th>
                  <th className="px-4 py-3 text-right">المتبقي الفعلي</th>
                  <th className="px-4 py-3 text-right">الصافي</th>
                </tr>
              </thead>
              <tbody>
                {payrollRowVirtualizer.getVirtualItems().length > 0 && (
                  <tr style={{ height: payrollRowVirtualizer.getVirtualItems()[0].start }}>
                    <td colSpan={12} />
                  </tr>
                )}
                {payrollRowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = filteredPayrollSearchRows[virtualRow.index]
                  return (
                    <tr key={row.id} className="border-t hover:bg-surface-secondary-50">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {row.employee_name_snapshot}
                      </td>
                      <td className="px-4 py-3">{row.residence_label}</td>
                      <td className="px-4 py-3">{row.project_label || '-'}</td>
                      <td className="px-4 py-3">{row.payroll_month_label || '-'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            row.payroll_run_status === 'finalized'
                              ? 'bg-green-100 text-green-700'
                              : row.payroll_run_status === 'cancelled'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {row.payroll_run_status === 'finalized'
                            ? 'نهائي ومحتسب'
                            : row.payroll_run_status === 'cancelled'
                              ? 'ملغي'
                              : 'مسودة غير محتسبة'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.deduction_breakdown.transfer_renewal.toLocaleString('en-US')}
                      </td>
                      <td className="px-4 py-3">
                        {row.deduction_breakdown.penalty.toLocaleString('en-US')}
                      </td>
                      <td className="px-4 py-3">
                        {row.deduction_breakdown.advance.toLocaleString('en-US')}
                      </td>
                      <td className="px-4 py-3">
                        {row.deduction_breakdown.other.toLocaleString('en-US')}
                      </td>
                      <td className="px-4 py-3 font-semibold text-red-600">
                        {row.total_deductions.toLocaleString('en-US')}
                      </td>
                      <td className="px-4 py-3 font-semibold text-amber-700">
                        {row.obligation_remaining.toLocaleString('en-US')}
                      </td>
                      <td className="px-4 py-3 font-semibold text-blue-700">
                        {row.net_amount.toLocaleString('en-US')}
                      </td>
                    </tr>
                  )
                })}
                {payrollRowVirtualizer.getVirtualItems().length > 0 && (() => {
                  const items = payrollRowVirtualizer.getVirtualItems()
                  const lastItem = items[items.length - 1]
                  const paddingBottom = payrollRowVirtualizer.getTotalSize() - lastItem.end
                  return paddingBottom > 0 ? (
                    <tr style={{ height: paddingBottom }}>
                      <td colSpan={12} />
                    </tr>
                  ) : null
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
