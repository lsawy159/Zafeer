import { type CSSProperties } from 'react'
import { Company } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import {
  calculateCommercialRegistrationStatus,
  calculatePowerSubscriptionStatus,
  calculateMoqeemSubscriptionStatus,
} from '@/utils/autoCompanyStatus'
import type { CompanyWithCount } from './useCompaniesPage'
import { getAvailableSlotsColor } from './useCompaniesPage'

interface CompaniesTableProps {
  paginatedCompanies: CompanyWithCount[]
  selectedCompanyIds: string[]
  selectedRowIndex: number | null
  tableRef: React.RefObject<HTMLTableElement | null>
  rowRefs: React.RefObject<(HTMLTableRowElement | null)[]>
  canEdit: (resource: string) => boolean
  canDelete: (resource: string) => boolean
  loading: boolean
  onRowClick: (company: CompanyWithCount) => void
  onEdit: (company: Company) => void
  onDelete: (company: Company) => void
  onSelectCompany: (id: string, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onBulkDeleteClick: () => void
  onClearSelection: () => void
}

export function CompaniesTable({
  paginatedCompanies,
  selectedCompanyIds,
  selectedRowIndex,
  tableRef,
  rowRefs,
  canEdit,
  canDelete,
  loading,
  onRowClick,
  onEdit,
  onDelete,
  onSelectCompany,
  onSelectAll,
  onBulkDeleteClick,
  onClearSelection,
}: CompaniesTableProps) {
  return (
    <div className="app-panel overflow-hidden">
      {/* Bulk Action Toolbar */}
      {selectedCompanyIds.length > 0 && (
        <div className="flex items-center justify-between border-b border-primary/30 bg-primary/10 px-6 py-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-neutral-700">
              تم تحديد {selectedCompanyIds.length} مؤسسة
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onClearSelection} variant="secondary" size="sm">إلغاء التحديد</Button>
            {canDelete('companies') && (
              <Button onClick={onBulkDeleteClick} variant="destructive" size="sm">حذف المحدد</Button>
            )}
          </div>
        </div>
      )}
      <div className="overflow-x-auto max-h-[calc(100vh-400px)]">
        <table className="w-full text-sm" ref={tableRef}>
          <thead className="sticky top-0 z-[1] bg-neutral-50 shadow-sm">
            <tr>
              <th className="px-4 py-3 text-right font-semibold text-neutral-700 w-12">
                <input
                  type="checkbox"
                  checked={selectedCompanyIds.length > 0 && selectedCompanyIds.length === paginatedCompanies.length}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-700">اسم المؤسسة</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-700">رقم موحد</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-700">رقم اشتراك التأمينات الاجتماعية</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-700">رقم اشتراك قوى</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-700">انتهاء السجل التجاري</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-700">حالة اشتراك قوى</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-700">حالة اشتراك مقيم</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-700">عدد الموظفين</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-700">الأماكن الشاغرة</th>
              <th className="px-4 py-3 text-right font-semibold text-neutral-700">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCompanies.map((company, index) => {
              const commercialStatus = calculateCommercialRegistrationStatus(company.commercial_registration_expiry)
              const powerStatus = calculatePowerSubscriptionStatus(company.ending_subscription_power_date)
              const moqeemStatus = calculateMoqeemSubscriptionStatus(company.ending_subscription_moqeem_date)
              const isSelected = selectedRowIndex === index
              const isCompanySelected = selectedCompanyIds.includes(company.id)

              const statusBadge = (status: { status: string }, date: string | null | undefined) => {
                if (!date) return <span className="text-neutral-400">-</span>
                const cls = status.status === 'منتهي' || status.status === 'طارئ' ? 'bg-red-100 text-red-700'
                  : status.status === 'عاجل' ? 'bg-orange-100 text-warning-700'
                  : status.status === 'متوسط' ? 'bg-yellow-100 text-yellow-700'
                  : status.status === 'ساري' ? 'bg-green-100 text-success-700'
                  : 'bg-neutral-100 text-neutral-700'
                return <span className={`px-2 py-1 rounded-full text-xs ${cls}`}>{date}</span>
              }

              return (
                <tr
                  key={company.id}
                  ref={(el) => { rowRefs.current[index] = el }}
                  className={`cursor-pointer border-t transition hover:bg-neutral-50 ${isSelected ? 'bg-primary/10 border-l-4 border-primary' : ''}`}
                  onClick={() => onRowClick(company)}
                >
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={isCompanySelected} onChange={(e) => onSelectCompany(company.id, e.target.checked)} className="w-4 h-4 rounded cursor-pointer" />
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-900">{company.name}</td>
                  <td className="px-4 py-3 text-neutral-700">{company.unified_number || '-'}</td>
                  <td className="px-4 py-3 text-neutral-700">{company.social_insurance_number || '-'}</td>
                  <td className="px-4 py-3 text-neutral-700">{company.labor_subscription_number || '-'}</td>
                  <td className="px-4 py-3">{statusBadge(commercialStatus, company.commercial_registration_expiry)}</td>
                  <td className="px-4 py-3">{statusBadge(powerStatus, company.ending_subscription_power_date)}</td>
                  <td className="px-4 py-3">{statusBadge(moqeemStatus, company.ending_subscription_moqeem_date)}</td>
                  <td className="px-4 py-3 text-neutral-700">{company.employee_count || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${getAvailableSlotsColor(company.available_slots || 0)}`}>
                      {company.available_slots || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {canEdit('companies') && <Button onClick={() => onEdit(company)} variant="secondary" size="sm">تعديل</Button>}
                      {canDelete('companies') && <Button onClick={() => onDelete(company)} variant="destructive" size="sm">حذف</Button>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
