import Layout from '@/components/layout/Layout'
import {
  Filter,
  Save,
  Download,
  Grid3X3,
  List,
  Users,
  Building2,
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
import ActiveFilterChips from './advancedSearch/ActiveFilterChips'

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

          <ActiveFilterChips search={search} activeFiltersCount={activeFiltersCount} />
        </FilterBar>

        {/* Filters Modal */}
        {search.showFiltersModal && (
          <AdvancedSearchFiltersModal
            search={search}
            activeFiltersCount={activeFiltersCount}
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
