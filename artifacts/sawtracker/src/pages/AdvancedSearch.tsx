import Layout from '@/components/layout/Layout'
import {
  Filter,
  Save,
  Download,
  Grid3X3,
  List,
  Users,
  Building2,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import EmployeeCard from '@/components/employees/EmployeeCard'
import CompanyModal from '@/components/companies/CompanyModal'
import CompanyDetailModal from '@/components/companies/CompanyDetailModal'
import { usePermissions } from '@/utils/permissions'
import { SearchIcon } from 'lucide-react'
import { useIsMobileView } from '@/hooks/useIsMobileView'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterBar } from '@/components/ui/FilterBar'
import { SearchInput } from '@/components/ui/SearchInput'
import { Button } from '@/components/ui/Button'
import { useAdvancedSearchFilters } from '@/hooks/useAdvancedSearchFilters'
import AdvancedSearchFiltersModal from './advancedSearch/AdvancedSearchFiltersModal'
import AdvancedSearchResults from './advancedSearch/AdvancedSearchResults'

export default function AdvancedSearch() {
  const { user } = useAuth()
  const { canView } = usePermissions()
  const isMobileView = useIsMobileView()

  const search = useAdvancedSearchFilters({ userId: user?.id })

  // Permission guard — after all hooks
  if (!canView('advancedSearch')) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <SearchIcon className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">غير مصرح</h2>
            <p className="text-gray-600">عذراً، ليس لديك صلاحية لعرض هذه الصفحة.</p>
          </div>
        </div>
      </Layout>
    )
  }

  const activeFiltersCount = search.calculateActiveFiltersCount()
  const resultsCount = search.activeTab === 'employees'
    ? search.filteredEmployees.length
    : search.filteredCompanies.length
  const currentSearchQuery =
    search.activeTab === 'employees' ? search.employeeSearchQuery : search.companySearchQuery

  return (
    <Layout>
      <div className="app-page app-tech-grid">
        <PageHeader
          title="البحث المتقدم"
          description={`النتائج المطابقة: ${resultsCount}${activeFiltersCount > 0 ? ` (${activeFiltersCount} فلتر نشط)` : ''}`}
          breadcrumbs={[{ label: 'الرئيسية', href: '/dashboard' }, { label: 'البحث المتقدم' }]}
          className="mb-6"
          actions={
            <>
              <Button onClick={() => search.setShowFiltersModal(true)} className="relative">
                <Filter className="w-4 h-4" />
                <span>الفلاتر</span>
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>

              <Button onClick={search.saveSearch} variant="secondary">
                <Save className="w-4 h-4" />
                <span>حفظ البحث</span>
              </Button>

              <Button onClick={search.exportResults} disabled={resultsCount === 0} variant="default">
                <Download className="w-4 h-4" />
                <span>تصدير ({resultsCount})</span>
              </Button>
            </>
          }
        />

        {/* Tabs */}
        <div className="app-panel mb-6">
          <div className="flex border-b border-border">
            <button
              onClick={() => {
                search.setActiveTab('employees')
                search.setCurrentPage(1)
              }}
              className={`app-tab-button flex-1 border-b-2 ${
                search.activeTab === 'employees'
                  ? 'app-tab-button-active'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>الموظفين</span>
            </button>
            <button
              onClick={() => {
                search.setActiveTab('companies')
                search.setCurrentPage(1)
              }}
              className={`app-tab-button flex-1 border-b-2 ${
                search.activeTab === 'companies'
                  ? 'app-tab-button-active'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-5 h-5" />
              <span>المؤسسات</span>
            </button>
          </div>
        </div>

        {/* Search bar + view controls */}
        <FilterBar className="mb-6">
          <SearchInput
            type="text"
            value={currentSearchQuery}
            onChange={(e) => {
              if (search.activeTab === 'employees') {
                search.setEmployeeSearchQuery(e.target.value)
              } else {
                search.setCompanySearchQuery(e.target.value)
              }
            }}
            placeholder={
              search.activeTab === 'employees'
                ? 'ابحث بالاسم، المهنة، الجنسية، رقم الجوال، أو أي حقل إضافي...'
                : 'ابحث باسم المؤسسة، الرقم الموحد، الرقم التأميني، أو أي حقل إضافي...'
            }
            wrapperClassName="min-w-[260px] flex-1"
          />

          <div className="flex items-center gap-3">
            {/* View mode toggle */}
            {!isMobileView && (
              <div className="app-toggle-shell">
                <Button
                  onClick={() => search.setViewMode('grid')}
                  variant={search.viewMode === 'grid' ? 'default' : 'secondary'}
                  size="icon"
                  title="عرض شبكي"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => search.setViewMode('table')}
                  variant={search.viewMode === 'table' ? 'default' : 'secondary'}
                  size="icon"
                  title="عرض جدول"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            )}
            {isMobileView && (
              <div className="app-toggle-shell">
                <Button
                  onClick={() => search.setViewMode('grid')}
                  variant={search.viewMode === 'grid' ? 'default' : 'secondary'}
                  size="icon"
                  title="عرض شبكي"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Items per page */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">عرض:</span>
              <select
                value={search.itemsPerPage}
                onChange={(e) => {
                  search.setItemsPerPage(Number(e.target.value))
                  search.setCurrentPage(1)
                }}
                className="focus-ring-brand rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={150}>150</option>
              </select>
            </div>
          </div>

          {/* Active filter chips */}
          {activeFiltersCount > 0 && (
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
          )}
        </FilterBar>

        {/* Filters Modal */}
        {search.showFiltersModal && (
          <AdvancedSearchFiltersModal
            activeTab={search.activeTab}
            activeFiltersCount={activeFiltersCount}
            selectedNationality={search.selectedNationality}
            setSelectedNationality={search.setSelectedNationality}
            selectedCompanyFilter={search.selectedCompanyFilter}
            setSelectedCompanyFilter={search.setSelectedCompanyFilter}
            selectedProfession={search.selectedProfession}
            setSelectedProfession={search.setSelectedProfession}
            selectedProject={search.selectedProject}
            setSelectedProject={search.setSelectedProject}
            residenceStatus={search.residenceStatus}
            setResidenceStatus={search.setResidenceStatus}
            contractStatus={search.contractStatus}
            setContractStatus={search.setContractStatus}
            healthInsuranceExpiryStatus={search.healthInsuranceExpiryStatus}
            setHealthInsuranceExpiryStatus={search.setHealthInsuranceExpiryStatus}
            passportNumberSearch={search.passportNumberSearch}
            setPassportNumberSearch={search.setPassportNumberSearch}
            residenceNumberSearch={search.residenceNumberSearch}
            setResidenceNumberSearch={search.setResidenceNumberSearch}
            commercialRegStatus={search.commercialRegStatus}
            setCommercialRegStatus={search.setCommercialRegStatus}
            exemptionsFilter={search.exemptionsFilter}
            setExemptionsFilter={search.setExemptionsFilter}
            powerSubscriptionStatus={search.powerSubscriptionStatus}
            setPowerSubscriptionStatus={search.setPowerSubscriptionStatus}
            moqeemSubscriptionStatus={search.moqeemSubscriptionStatus}
            setMoqeemSubscriptionStatus={search.setMoqeemSubscriptionStatus}
            unifiedNumberSearch={search.unifiedNumberSearch}
            setUnifiedNumberSearch={search.setUnifiedNumberSearch}
            taxNumberSearch={search.taxNumberSearch}
            setTaxNumberSearch={search.setTaxNumberSearch}
            laborSubscriptionNumberSearch={search.laborSubscriptionNumberSearch}
            setLaborSubscriptionNumberSearch={search.setLaborSubscriptionNumberSearch}
            notesSearch={search.notesSearch}
            setNotesSearch={search.setNotesSearch}
            notesFilter={search.notesFilter}
            setNotesFilter={search.setNotesFilter}
            nationalities={search.nationalities}
            companyList={search.companyList}
            professions={search.professions}
            projects={search.projects}
            savedSearches={search.savedSearches}
            loadSavedSearch={search.loadSavedSearch}
            deleteSavedSearch={search.deleteSavedSearch}
            clearFilters={search.clearFilters}
            onClose={() => search.setShowFiltersModal(false)}
          />
        )}

        {/* Results */}
        <AdvancedSearchResults
          activeTab={search.activeTab}
          viewMode={search.viewMode}
          isLoading={search.isLoading}
          resultsCount={resultsCount}
          paginatedEmployees={search.paginatedEmployees}
          paginatedCompanies={search.paginatedCompanies}
          totalPages={search.totalPages}
          totalResults={search.totalResults}
          currentPage={search.currentPage}
          startIndex={search.startIndex}
          endIndex={search.endIndex}
          goToPage={search.goToPage}
          goToPreviousPage={search.goToPreviousPage}
          goToNextPage={search.goToNextPage}
          getPageNumbers={search.getPageNumbers}
          handleEmployeeClick={search.handleEmployeeClick}
          handleCompanyClick={search.handleCompanyClick}
        />
      </div>

      {/* Employee Card Modal */}
      {search.isEmployeeCardOpen && search.selectedEmployee && (
        <EmployeeCard
          employee={search.selectedEmployee}
          onClose={search.handleCloseEmployeeCard}
          onUpdate={search.handleEmployeeUpdate}
        />
      )}

      {/* Company Detail Modal */}
      {search.showCompanyDetailModal && search.selectedCompanyForDetail && (
        <CompanyDetailModal
          company={{
            ...search.selectedCompanyForDetail,
            employee_count: search.filteredEmployees.filter(
              (e) => e.company_id === search.selectedCompanyForDetail!.id
            ).length,
            available_slots: Math.max(
              0,
              (search.selectedCompanyForDetail.max_employees || 4) -
                search.filteredEmployees.filter(
                  (e) => e.company_id === search.selectedCompanyForDetail!.id
                ).length
            ),
            max_employees: search.selectedCompanyForDetail.max_employees || 4,
          }}
          onClose={search.handleCloseCompanyDetailModal}
          onEdit={search.handleEditCompanyFromDetail}
          onDelete={search.handleDeleteCompanyFromDetail}
        />
      )}

      {/* Company Modal */}
      {search.isCompanyModalOpen && (
        <CompanyModal
          isOpen={search.isCompanyModalOpen}
          company={search.selectedCompany}
          onClose={search.handleCloseCompanyModal}
          onSuccess={search.handleCompanyUpdate}
        />
      )}
    </Layout>
  )
}
