import {
  AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, Bell, Calendar, Filter,
  LayoutGrid, Shield, Table, Trash2, UserPlus,
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import EmployeeCard from '@/components/employees/EmployeeCard'
import AddEmployeeModal from '@/components/employees/AddEmployeeModal'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterBar } from '@/components/ui/FilterBar'
import { SearchInput } from '@/components/ui/SearchInput'
import { Button } from '@/components/ui/Button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import { EmployeesFiltersModal } from './employees/EmployeesFiltersModal'
import { EmployeeGridCard } from './employees/EmployeeGridCard'
import { EmployeeDeleteSummaryModal } from './employees/EmployeeDeleteSummaryModal'
import { BulkDeleteModal } from './employees/BulkDeleteModal'
import { BulkDateModal } from './employees/BulkDateModal'
import { EmployeesTable } from './employees/EmployeesTable'
import { useEmployeesPage, type ObligationDeleteChoice } from './employees/useEmployeesPage'

export default function Employees() {
  const p = useEmployeesPage()

  if (!p.hasViewPermission) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-danger-500" />
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">غير مصرح</h2>
            <p className="text-neutral-600">عذراً، ليس لديك صلاحية لعرض هذه الصفحة.</p>
          </div>
        </div>
      </Layout>
    )
  }

  const getSortIcon = (field: typeof p.sortField) => {
    if (p.sortField !== field) return <ArrowUpDown className="w-4 h-4" />
    return p.sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
  }

  return (
    <Layout>
      <div className="app-page app-tech-grid">
        <PageHeader
          title="الموظفين"
          description={p.loading ? 'جاري تحميل بيانات الموظفين...' : `عرض ${p.sortedAndFilteredEmployees.length} من ${p.employees.length} موظف${p.activeFiltersCount > 0 ? ` (${p.activeFiltersCount} فلتر نشط)` : ''}`}
          breadcrumbs={[{ label: 'الرئيسية', href: '/dashboard' }, { label: 'الموظفين' }]}
          className="mb-6"
          actions={<>{p.canCreate('employees') && <Button onClick={() => p.setIsAddModalOpen(true)}><UserPlus className="w-4 h-4" />إضافة موظف</Button>}</>}
        />

        {/* Stats Panel */}
        <div className="app-panel mb-5 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-base font-bold text-neutral-900 md:text-lg">
              <Bell className="h-5 w-5 text-info-600" />
              تنبيهات الموظفين
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
            {p.employeeSummaryCards.map((card) => (
              <div
                key={card.key}
                onClick={() => {
                  if (card.key === 'employees') p.setCardSeverityFilter(null)
                  else p.setCardSeverityFilter(p.cardSeverityFilter === card.key ? null : (card.key as Parameters<typeof p.setCardSeverityFilter>[0]))
                }}
                className={`app-panel cursor-pointer px-3 py-2.5 text-center transition-shadow ${card.accentClass} ${(card.key === 'employees' ? p.cardSeverityFilter === null : p.cardSeverityFilter === card.key) ? 'ring-2 ring-offset-1 ring-primary shadow-md' : 'hover:shadow-sm'}`}
              >
                <div className="text-[11px] font-medium leading-4 text-foreground-secondary dark:text-foreground-secondary md:text-xs">{card.title}</div>
                <div className={`text-lg font-bold leading-none md:text-xl ${card.valueClass}`}>{card.value.toLocaleString('en-US')}</div>
                <div className="text-[11px] leading-4 text-foreground-secondary dark:text-foreground-secondary md:text-xs">{card.label}</div>
              </div>
            ))}
          </div>
        </div>

        <FilterBar
          className="mb-6"
          actions={
            <>
              <div className="app-toggle-shell">
                {!p.isMobileView && (
                  <button onClick={() => p.setViewMode('table')} className={`app-toggle-button ${p.viewMode === 'table' ? 'app-toggle-button-active' : ''}`} title="عرض الشرائط">
                    <Table className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => p.setViewMode('grid')} className={`app-toggle-button ${p.viewMode === 'grid' ? 'app-toggle-button-active' : ''}`} title="عرض الكروت">
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
              <Button onClick={() => p.setShowFiltersModal(true)} className="relative">
                <Filter className="w-4 h-4" />
                <span>الفلاتر</span>
                {p.activeFiltersCount > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">{p.activeFiltersCount}</span>}
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => p.setShowAlertsOnly((prev) => !prev)} variant="secondary" className={`relative border-red-200 text-red-700 ${p.showAlertsOnly ? 'bg-red-50' : ''}`} title="عرض الموظفين ذوي التنبيهات فقط">
                    <AlertCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">تنبيهات</span>
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">{p.alertsCount}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-neutral-900 text-white">تحسب طارئ وعاجل ومتوسط</TooltipContent>
              </Tooltip>
              <DropdownMenu open={p.showSortDropdown} onOpenChange={p.setShowSortDropdown}>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary">{getSortIcon(p.sortField)}<span className="hidden sm:inline">الترتيب</span><ArrowUpDown className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={8} className="w-56">
                  <DropdownMenuLabel>الترتيب حسب:</DropdownMenuLabel>
                  {[
                    { field: 'name' as typeof p.sortField, label: 'الاسم' },
                    { field: 'profession' as typeof p.sortField, label: 'المهنة' },
                    { field: 'nationality' as typeof p.sortField, label: 'الجنسية' },
                    { field: 'company' as typeof p.sortField, label: 'الشركة' },
                    { field: 'project' as typeof p.sortField, label: 'المشروع' },
                    { field: 'contract_expiry' as typeof p.sortField, label: 'تاريخ انتهاء العقد' },
                    { field: 'hired_worker_contract_expiry' as typeof p.sortField, label: 'تاريخ انتهاء عقد أجير' },
                    { field: 'residence_expiry' as typeof p.sortField, label: 'تاريخ انتهاء الإقامة' },
                    { field: 'health_insurance_expiry' as typeof p.sortField, label: 'تاريخ انتهاء التأمين الصحي' },
                  ].map(({ field, label }) => (
                    <DropdownMenuItem key={field} onClick={() => p.handleSort(field)} className={`w-full justify-between text-right ${p.sortField === field ? 'bg-primary/10 text-foreground' : ''}`}>
                      <span>{label}</span>
                      {p.sortField === field && getSortIcon(field)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        >
          <SearchInput type="text" value={p.searchTerm} onChange={(e) => p.setSearchTerm(e.target.value)} placeholder="ابحث بالاسم أو رقم الإقامة أو رقم الجواز أو المهنة أو الجنسية..." wrapperClassName="min-w-[260px] flex-1" />
        </FilterBar>

        {p.showFiltersModal && (
          <EmployeesFiltersModal
            activeFiltersCount={p.activeFiltersCount}
            colorThresholds={null}
            companies={p.companiesWithIds}
            companyFilter={p.companyFilter} setCompanyFilter={p.setCompanyFilter}
            projects={p.projects}
            projectFilter={p.projectFilter} setProjectFilter={p.setProjectFilter}
            nationalities={p.nationalities}
            nationalityFilter={p.nationalityFilter} setNationalityFilter={p.setNationalityFilter}
            professions={p.professions}
            professionFilter={p.professionFilter} setProfessionFilter={p.setProfessionFilter}
            contractFilter={p.contractFilter} setContractFilter={p.setContractFilter}
            hiredWorkerContractFilter={p.hiredWorkerContractFilter} setHiredWorkerContractFilter={p.setHiredWorkerContractFilter}
            residenceFilter={p.residenceFilter} setResidenceFilter={p.setResidenceFilter}
            healthInsuranceFilter={p.healthInsuranceFilter} setHealthInsuranceFilter={p.setHealthInsuranceFilter}
            contractStatusDocFilter={p.contractStatusDocFilter} setContractStatusDocFilter={p.setContractStatusDocFilter}
            hiredWorkerContractStatusDocFilter={p.hiredWorkerContractStatusDocFilter} setHiredWorkerContractStatusDocFilter={p.setHiredWorkerContractStatusDocFilter}
            residenceStatusDocFilter={p.residenceStatusDocFilter} setResidenceStatusDocFilter={p.setResidenceStatusDocFilter}
            healthInsuranceStatusDocFilter={p.healthInsuranceStatusDocFilter} setHealthInsuranceStatusDocFilter={p.setHealthInsuranceStatusDocFilter}
            hasAlertFilter={p.hasAlertFilter} setHasAlertFilter={p.setHasAlertFilter}
            clearFilters={p.clearFilters}
            onClose={() => p.setShowFiltersModal(false)}
          />
        )}

        {/* Bulk Actions Bar */}
        {p.selectedEmployees.size > 0 && (
          <div className="app-info-block mb-3 rounded-lg p-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-foreground">{p.selectedEmployees.size} موظف محدد</div>
                <Button onClick={p.clearSelection} variant="ghost" size="sm" className="h-8 px-2">إلغاء التحديد</Button>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button onClick={() => p.setShowBulkResidenceModal(true)} variant="default" size="sm" title="تعديل تاريخ انتهاء الإقامة"><Calendar className="w-3 h-3" />تعديل تاريخ الإقامة</Button>
                <Button onClick={() => p.setShowBulkInsuranceModal(true)} variant="outline" size="sm" title="تعديل تاريخ انتهاء التأمين"><Calendar className="w-3 h-3" />تعديل تاريخ التأمين</Button>
                <Button onClick={() => p.setShowBulkContractModal(true)} variant="outline" size="sm" title="تعديل تاريخ انتهاء العقد"><Calendar className="w-3 h-3" />تعديل تاريخ العقد</Button>
                <Button onClick={() => void p.handleBulkDeleteClick()} variant="destructive" size="sm" title="حذف الموظفين المحددين"><Trash2 className="w-3 h-3" />حذف المحددين</Button>
              </div>
            </div>
          </div>
        )}

        {/* Display */}
        {p.loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : p.viewMode === 'grid' ? (
          <div ref={p.gridContainerRef} style={{ position: 'relative', height: p.gridVirtualizer.getTotalSize() }}>
            {p.gridVirtualizer.getVirtualItems().map((virtualRow) => {
              const startIdx = virtualRow.index * p.gridColumnsCount
              const rowEmployees = p.sortedAndFilteredEmployees.slice(startIdx, startIdx + p.gridColumnsCount)
              return (
                <div
                  key={virtualRow.key}
                  ref={p.gridVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  style={{ position: 'absolute', top: 0, transform: `translateY(${virtualRow.start - p.gridVirtualizer.options.scrollMargin}px)`, width: '100%', display: 'grid', gridTemplateColumns: `repeat(${p.gridColumnsCount}, minmax(0, 1fr))`, gap: '14px', paddingBottom: '4px' }}
                >
                  {rowEmployees.map((employee, i) => (
                    <EmployeeGridCard
                      key={employee.id}
                      employee={employee}
                      index={startIdx + i}
                      canEditEmployee={p.canEdit('employees')}
                      canDeleteEmployee={p.canDelete('employees')}
                      onEmployeeClick={p.handleEmployeeClick}
                      onDeleteEmployee={p.handleDeleteEmployee}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        ) : (
          <EmployeesTable
            sortedAndFilteredEmployees={p.sortedAndFilteredEmployees}
            selectedEmployees={p.selectedEmployees}
            selectedRowIndex={p.selectedRowIndex}
            tableRef={p.tableRef}
            rowRefs={p.rowRefs}
            canDelete={p.canDelete}
            employeeTableThresholds={p.employeeTableThresholds}
            onEmployeeClick={p.handleEmployeeClick}
            onDeleteEmployee={p.handleDeleteEmployee}
            onToggleSelection={p.toggleEmployeeSelection}
            onToggleSelectAll={p.toggleSelectAll}
            onBulkDeleteClick={() => void p.handleBulkDeleteClick()}
            onClearSelection={p.clearSelection}
          />
        )}
      </div>

      {/* Modals */}
      {p.isCardOpen && p.selectedEmployee && (
        <EmployeeCard employee={p.selectedEmployee} onClose={p.handleCloseCard} onUpdate={p.handleUpdateEmployee} onDelete={p.handleDeleteEmployee} />
      )}
      <AddEmployeeModal isOpen={p.isAddModalOpen} onClose={() => p.setIsAddModalOpen(false)} onSuccess={p.handleUpdateEmployee} />
      {p.showDeleteSummaryModal && p.employeeToDelete && (
        <EmployeeDeleteSummaryModal
          open={p.showDeleteSummaryModal} isBulk={false}
          employees={[{ id: p.employeeToDelete.id, name: p.employeeToDelete.name, company: p.employeeToDelete.company?.name }]}
          preview={p.deletePreview} loadingPreview={p.deletePreviewLoading} loading={p.deleteConfirmLoading}
          onConfirm={p.confirmDeleteEmployee}
          onCancel={() => { p.setShowDeleteSummaryModal(false); p.setDeletePreview(null); p.setEmployeeToDelete(null) }}
        />
      )}
      {p.showBulkDeleteModal && (
        <BulkDeleteModal
          selectedCount={p.selectedEmployees.size}
          selectedEmployees={p.employees.filter((emp) => p.selectedEmployees.has(emp.id))}
          preview={p.bulkDeletePreview} loadingPreview={p.bulkPreviewLoading}
          onConfirm={p.handleBulkDelete}
          onCancel={() => { p.setShowBulkDeleteModal(false); p.setBulkDeletePreview(null) }}
          isDeleting={p.deletingEmployees}
        />
      )}
      {p.showBulkResidenceModal && <BulkDateModal title="تعديل تاريخ انتهاء الإقامة" selectedCount={p.selectedEmployees.size} onConfirm={p.handleBulkUpdateResidence} onCancel={() => p.setShowBulkResidenceModal(false)} />}
      {p.showBulkInsuranceModal && <BulkDateModal title="تعديل تاريخ انتهاء التأمين" selectedCount={p.selectedEmployees.size} onConfirm={p.handleBulkUpdateInsurance} onCancel={() => p.setShowBulkInsuranceModal(false)} />}
      {p.showBulkContractModal && <BulkDateModal title="تعديل تاريخ انتهاء العقد" selectedCount={p.selectedEmployees.size} onConfirm={p.handleBulkUpdateContract} onCancel={() => p.setShowBulkContractModal(false)} />}
    </Layout>
  )
}
