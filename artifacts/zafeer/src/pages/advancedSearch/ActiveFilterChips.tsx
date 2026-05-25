import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import type { useAdvancedSearchFilters } from '@/hooks/useAdvancedSearchFiltersPhase10'

const STATUS_LABELS: Record<string, string> = {
  expired: 'منتهي',
  expiring_soon: 'عاجل',
  valid: 'ساري',
  no_expiry: 'غير محدد',
}

const BIRTH_DATE_RANGE_LABELS: Record<string, string> = {
  under_25: 'أقل من 25 سنة',
  '25_35': 'من 25 إلى 35 سنة',
  '35_45': 'من 35 إلى 45 سنة',
  over_45: 'أكثر من 45 سنة',
}

const JOINING_DATE_RANGE_LABELS: Record<string, string> = {
  less_than_6_months: 'أقل من 6 أشهر',
  '6_months_1_year': 'من 6 أشهر إلى سنة',
  '1_2_years': 'من سنة إلى سنتين',
  over_2_years: 'أكثر من سنتين',
}

const MAX_EMPLOYEES_RANGE_LABELS: Record<string, string> = {
  '1_2': 'من 1 إلى 2 موظف',
  '3_4': 'من 3 إلى 4 موظفين',
  '5_10': 'من 5 إلى 10 موظفين',
  over_10: 'أكثر من 10 موظفين',
}

const COMPANY_CREATED_DATE_RANGE_LABELS: Record<string, string> = {
  last_month: 'آخر شهر',
  last_3_months: 'آخر 3 أشهر',
  last_year: 'آخر سنة',
  custom: 'مخصص',
}

const getYesNoLabel = (value: string) => (value === 'yes' ? 'نعم' : 'لا')

const getEmployeeCountLabel = (value: string) =>
  value === '4+' ? '4+ موظفين' : `${value} موظف`

const getAvailableSlotsLabel = (value: string) =>
  value === '4+' ? '4+ مقاعد متاحة' : `${value} مقعد متاح`

const getCompanyCreatedDateRangeLabel = (
  range: string,
  startDate: string,
  endDate: string
) => {
  if (range === 'custom') {
    if (startDate && endDate) {
      const formattedStart = new Date(startDate).toLocaleDateString('ar-EG')
      const formattedEnd = new Date(endDate).toLocaleDateString('ar-EG')
      return `${COMPANY_CREATED_DATE_RANGE_LABELS.custom}: ${formattedStart} - ${formattedEnd}`
    }
    return COMPANY_CREATED_DATE_RANGE_LABELS.custom
  }

  return COMPANY_CREATED_DATE_RANGE_LABELS[range] || range
}

function FilterChip({
  className,
  buttonClassName,
  children,
  onRemove,
}: {
  className: string
  buttonClassName: string
  children: ReactNode
  onRemove: () => void
}) {
  return (
    <span className={`px-3 py-1.5 ${className} rounded-full flex items-center gap-2`}>
      {children}
      <button onClick={onRemove} className={`${buttonClassName} rounded-full p-0.5 transition`}>
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}

interface ActiveFilterChipsProps {
  search: ReturnType<typeof useAdvancedSearchFilters>
  activeFiltersCount: number
}

export default function ActiveFilterChips({ search, activeFiltersCount }: ActiveFilterChipsProps) {
  if (activeFiltersCount === 0) return null

  return (
    <div className="mt-4 pt-4 border-t border-border-200">
      <div className="flex flex-wrap gap-2">
        {search.activeTab === 'employees' ? (
          <>
            {search.employeeSearchQuery && (
              <span className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-full flex items-center gap-2">
                البحث: {search.employeeSearchQuery}
                <button
                  onClick={() => search.setEmployeeSearchQuery('')}
                  className="hover:bg-blue-100 rounded-full p-0.5 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {search.selectedNationality.map((nationality) => (
              <span
                key={nationality}
                className="px-3 py-1.5 bg-purple-50 text-purple-700 text-sm rounded-full flex items-center gap-2"
              >
                الجنسية: {nationality}
                <button
                  onClick={() =>
                    search.setSelectedNationality(
                      search.selectedNationality.filter((item) => item !== nationality)
                    )
                  }
                  className="hover:bg-purple-100 rounded-full p-0.5 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {search.selectedCompanyFilter !== 'all' && (
              <span className="px-3 py-1.5 bg-green-50 text-green-700 text-sm rounded-full flex items-center gap-2">
                المؤسسة:{' '}
                {search.companyList.find((c) => c.id === search.selectedCompanyFilter)
                  ?.name || search.selectedCompanyFilter}
                <button
                  onClick={() => search.setSelectedCompanyFilter('all')}
                  className="hover:bg-green-100 rounded-full p-0.5 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {search.selectedProfession.map((profession) => (
              <span
                key={profession}
                className="px-3 py-1.5 bg-orange-50 text-orange-700 text-sm rounded-full flex items-center gap-2"
              >
                المهنة: {profession}
                <button
                  onClick={() =>
                    search.setSelectedProfession(
                      search.selectedProfession.filter((item) => item !== profession)
                    )
                  }
                  className="hover:bg-orange-100 rounded-full p-0.5 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {search.selectedProject !== 'all' && (
              <FilterChip
                className="bg-emerald-50 text-emerald-700 text-sm"
                buttonClassName="hover:bg-emerald-100"
                onRemove={() => search.setSelectedProject('all')}
              >
                المشروع: {search.selectedProject}
              </FilterChip>
            )}
            {search.hasHealthInsuranceExpiry !== 'all' && (
              <FilterChip
                className="bg-teal-50 text-teal-700 text-sm"
                buttonClassName="hover:bg-teal-100"
                onRemove={() => search.setHasHealthInsuranceExpiry('all')}
              >
                التأمين الصحي: {getYesNoLabel(search.hasHealthInsuranceExpiry)}
              </FilterChip>
            )}
            {search.healthInsuranceExpiryStatus !== 'all' && (
              <FilterChip
                className="bg-red-50 text-red-700 text-sm"
                buttonClassName="hover:bg-red-100"
                onRemove={() => search.setHealthInsuranceExpiryStatus('all')}
              >
                حالة انتهاء التأمين الصحي:{' '}
                {STATUS_LABELS[search.healthInsuranceExpiryStatus] ||
                  search.healthInsuranceExpiryStatus}
              </FilterChip>
            )}
            {search.hasPassport !== 'all' && (
              <FilterChip
                className="bg-indigo-50 text-indigo-700 text-sm"
                buttonClassName="hover:bg-indigo-100"
                onRemove={() => search.setHasPassport('all')}
              >
                الجواز: {getYesNoLabel(search.hasPassport)}
              </FilterChip>
            )}
            {search.hasBankAccount !== 'all' && (
              <FilterChip
                className="bg-sky-50 text-sky-700 text-sm"
                buttonClassName="hover:bg-sky-100"
                onRemove={() => search.setHasBankAccount('all')}
              >
                الحساب البنكي: {getYesNoLabel(search.hasBankAccount)}
              </FilterChip>
            )}
            {search.birthDateRange !== 'all' && (
              <FilterChip
                className="bg-amber-50 text-amber-700 text-sm"
                buttonClassName="hover:bg-amber-100"
                onRemove={() => search.setBirthDateRange('all')}
              >
                تاريخ الميلاد:{' '}
                {BIRTH_DATE_RANGE_LABELS[search.birthDateRange] || search.birthDateRange}
              </FilterChip>
            )}
            {search.joiningDateRange !== 'all' && (
              <FilterChip
                className="bg-lime-50 text-lime-700 text-sm"
                buttonClassName="hover:bg-lime-100"
                onRemove={() => search.setJoiningDateRange('all')}
              >
                تاريخ الانضمام:{' '}
                {JOINING_DATE_RANGE_LABELS[search.joiningDateRange] || search.joiningDateRange}
              </FilterChip>
            )}
            {search.residenceStatus !== 'all' && (
              <span className="px-3 py-1.5 bg-red-50 text-red-700 text-sm rounded-full flex items-center gap-2">
                حالة الإقامة:{' '}
                {search.residenceStatus === 'expired'
                  ? 'منتهي'
                  : search.residenceStatus === 'expiring_soon'
                    ? 'عاجل'
                    : 'ساري'}
                <button
                  onClick={() => search.setResidenceStatus('all')}
                  className="hover:bg-red-100 rounded-full p-0.5 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {search.contractStatus !== 'all' && (
              <span className="px-3 py-1.5 bg-yellow-50 text-yellow-700 text-sm rounded-full flex items-center gap-2">
                حالة العقد:{' '}
                {search.contractStatus === 'expired'
                  ? 'منتهي'
                  : search.contractStatus === 'expiring_soon'
                    ? 'عاجل'
                    : 'ساري'}
                <button
                  onClick={() => search.setContractStatus('all')}
                  className="hover:bg-yellow-100 rounded-full p-0.5 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {search.residenceNumberSearch && (
              <span className="px-3 py-1.5 bg-cyan-50 text-cyan-700 text-sm rounded-full flex items-center gap-2">
                رقم الإقامة: {search.residenceNumberSearch}
                <button
                  onClick={() => search.setResidenceNumberSearch('')}
                  className="hover:bg-cyan-100 rounded-full p-0.5 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {search.passportNumberSearch && (
              <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm rounded-full flex items-center gap-2">
                رقم الجواز: {search.passportNumberSearch}
                <button
                  onClick={() => search.setPassportNumberSearch('')}
                  className="hover:bg-indigo-100 rounded-full p-0.5 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </>
        ) : (
          <>
            {search.companySearchQuery && (
              <span className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-full flex items-center gap-2">
                البحث: {search.companySearchQuery}
                <button
                  onClick={() => search.setCompanySearchQuery('')}
                  className="hover:bg-blue-100 rounded-full p-0.5 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {search.commercialRegStatus !== 'all' && (
              <span className="px-3 py-1.5 bg-pink-50 text-pink-700 text-sm rounded-full flex items-center gap-2">
                حالة السجل التجاري:{' '}
                {search.commercialRegStatus === 'expired'
                  ? 'منتهي'
                  : search.commercialRegStatus === 'expiring_soon'
                    ? 'عاجل'
                    : search.commercialRegStatus === 'valid'
                      ? 'ساري'
                      : search.commercialRegStatus}
                <button
                  onClick={() => search.setCommercialRegStatus('all')}
                  className="hover:bg-pink-100 rounded-full p-0.5 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {search.companyDateFilter !== 'all' && (
              <FilterChip
                className="bg-sky-50 text-sky-700 text-sm"
                buttonClassName="hover:bg-sky-100"
                onRemove={() => search.setCompanyDateFilter('all')}
              >
                انتهاء السجل التجاري خلال 30 يوم
              </FilterChip>
            )}
            {search.exemptionsFilter !== 'all' && (
              <FilterChip
                className="bg-rose-50 text-rose-700 text-sm"
                buttonClassName="hover:bg-rose-100"
                onRemove={() => search.setExemptionsFilter('all')}
              >
                الإعفاءات: {search.exemptionsFilter}
              </FilterChip>
            )}
            {search.powerSubscriptionStatus !== 'all' && (
              <FilterChip
                className="bg-green-50 text-green-700 text-sm"
                buttonClassName="hover:bg-green-100"
                onRemove={() => search.setPowerSubscriptionStatus('all')}
              >
                حالة اشتراك قوى: {STATUS_LABELS[search.powerSubscriptionStatus] || search.powerSubscriptionStatus}
              </FilterChip>
            )}
            {search.moqeemSubscriptionStatus !== 'all' && (
              <FilterChip
                className="bg-violet-50 text-violet-700 text-sm"
                buttonClassName="hover:bg-violet-100"
                onRemove={() => search.setMoqeemSubscriptionStatus('all')}
              >
                حالة اشتراك مقيم: {STATUS_LABELS[search.moqeemSubscriptionStatus] || search.moqeemSubscriptionStatus}
              </FilterChip>
            )}
            {search.employeeCountFilter !== 'all' && (
              <FilterChip
                className="bg-amber-50 text-amber-700 text-sm"
                buttonClassName="hover:bg-amber-100"
                onRemove={() => search.setEmployeeCountFilter('all')}
              >
                عدد الموظفين: {getEmployeeCountLabel(search.employeeCountFilter)}
              </FilterChip>
            )}
            {search.availableSlotsFilter !== 'all' && (
              <FilterChip
                className="bg-cyan-50 text-cyan-700 text-sm"
                buttonClassName="hover:bg-cyan-100"
                onRemove={() => search.setAvailableSlotsFilter('all')}
              >
                المقاعد المتاحة: {getAvailableSlotsLabel(search.availableSlotsFilter)}
              </FilterChip>
            )}
            {search.unifiedNumberSearch && (
              <span className="px-3 py-1.5 bg-teal-50 text-teal-700 text-sm rounded-full flex items-center gap-2">
                الرقم الموحد: {search.unifiedNumberSearch}
                <button
                  onClick={() => search.setUnifiedNumberSearch('')}
                  className="hover:bg-teal-100 rounded-full p-0.5 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {search.taxNumberSearch && (
              <span className="px-3 py-1.5 bg-cyan-50 text-cyan-700 text-sm rounded-full flex items-center gap-2">
                الرقم التأميني: {search.taxNumberSearch}
                <button
                  onClick={() => search.setTaxNumberSearch('')}
                  className="hover:bg-cyan-100 rounded-full p-0.5 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {search.laborSubscriptionNumberSearch && (
              <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm rounded-full flex items-center gap-2">
                رقم اشتراك العمل: {search.laborSubscriptionNumberSearch}
                <button
                  onClick={() => search.setLaborSubscriptionNumberSearch('')}
                  className="hover:bg-indigo-100 rounded-full p-0.5 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {search.maxEmployeesRange !== 'all' && (
              <FilterChip
                className="bg-orange-50 text-orange-700 text-sm"
                buttonClassName="hover:bg-orange-100"
                onRemove={() => search.setMaxEmployeesRange('all')}
              >
                الحد الأقصى للموظفين:{' '}
                {MAX_EMPLOYEES_RANGE_LABELS[search.maxEmployeesRange] || search.maxEmployeesRange}
              </FilterChip>
            )}
            {search.companyCreatedDateRange !== 'all' && (
              <FilterChip
                className="bg-pink-50 text-pink-700 text-sm"
                buttonClassName="hover:bg-pink-100"
                onRemove={() => {
                  search.setCompanyCreatedDateRange('all')
                  search.setCompanyCreatedStartDate('')
                  search.setCompanyCreatedEndDate('')
                }}
              >
                تاريخ إنشاء المؤسسة:{' '}
                {getCompanyCreatedDateRangeLabel(
                  search.companyCreatedDateRange,
                  search.companyCreatedStartDate,
                  search.companyCreatedEndDate
                )}
              </FilterChip>
            )}
            {search.notesFilter !== 'all' && (
              <FilterChip
                className="bg-slate-50 text-slate-700 text-sm"
                buttonClassName="hover:bg-slate-100"
                onRemove={() => search.setNotesFilter('all')}
              >
                الملاحظات: {search.notesFilter === 'has_notes' ? 'يوجد ملاحظات' : 'لا توجد ملاحظات'}
              </FilterChip>
            )}
          </>
        )}
      </div>
    </div>
  )
}
