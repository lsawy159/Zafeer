import { X } from 'lucide-react'
import type { useAdvancedSearchFilters } from '@/hooks/useAdvancedSearchFilters'

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
            {search.selectedNationality !== 'all' && (
              <span className="px-3 py-1.5 bg-purple-50 text-purple-700 text-sm rounded-full flex items-center gap-2">
                الجنسية: {search.selectedNationality}
                <button
                  onClick={() => search.setSelectedNationality('all')}
                  className="hover:bg-purple-100 rounded-full p-0.5 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
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
            {search.selectedProfession !== 'all' && (
              <span className="px-3 py-1.5 bg-orange-50 text-orange-700 text-sm rounded-full flex items-center gap-2">
                المهنة: {search.selectedProfession}
                <button
                  onClick={() => search.setSelectedProfession('all')}
                  className="hover:bg-orange-100 rounded-full p-0.5 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
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
          </>
        )}
      </div>
    </div>
  )
}
