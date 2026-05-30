import { AlertCircle, ArrowDown, ArrowUp, ArrowUpDown, Building2, ChevronLeft, ChevronRight, Grid3X3, List, Shield } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import CompanyModal from '@/components/companies/CompanyModal'
import CompanyCard from '@/components/companies/CompanyCard'
import CompanyDetailModal from '@/components/companies/CompanyDetailModal'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterBar } from '@/components/ui/FilterBar'
import { SearchInput } from '@/components/ui/SearchInput'
import { Button } from '@/components/ui/Button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import { CompaniesFiltersModal } from './companies/CompaniesFiltersModal'
import { CompaniesTable } from './companies/CompaniesTable'
import { CompaniesGrid } from './companies/CompaniesGrid'
import { useCompaniesPage, type SortField, type CardStatusFilter } from './companies/useCompaniesPage'

export default function Companies() {
  const p = useCompaniesPage()

  if (!p.canView('companies')) {
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

  const getSortIcon = (field: SortField) => {
    if (p.sortField !== field) return <ArrowUpDown className="w-4 h-4" />
    return p.sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
  }

  // Statistics
  let totalExpired = 0, totalUrgent = 0, totalHigh = 0, totalMedium = 0
  for (const c of p.companies) {
    const unified = p.getCompanyUnifiedStatus(c)
    if (unified === 'منتهي') totalExpired++
    else if (unified === 'طارئ') totalUrgent++
    else if (unified === 'عاجل') totalHigh++
    else if (unified === 'متوسط') totalMedium++
  }

  const summaryCards = [
    { key: 'companies' as const, title: 'إجمالي المؤسسات', value: p.companies.length, label: '', accentClass: '', valueClass: 'text-foreground dark:text-white' },
    { key: 'all' as const, title: 'إجمالي التنبيهات', value: p.companyAlertsCount, label: 'المؤسسات التي لديها تنبيه واحد على الأقل', accentClass: 'border-rose-500/20 bg-rose-500/5', valueClass: 'text-rose-600 dark:text-rose-300' },
    { key: 'منتهي' as const, title: 'منتهي', value: totalExpired, label: 'أقل من 0 يوم', accentClass: 'border-red-500/20 bg-red-500/5', valueClass: 'text-red-600 dark:text-red-300' },
    { key: 'طارئ' as const, title: 'طارئ', value: totalUrgent, label: `0 - ${p.companyThresholds.commercial_reg_urgent_days} يوم`, accentClass: 'border-red-500/20 bg-red-500/5', valueClass: 'text-red-600 dark:text-red-300' },
    { key: 'عاجل' as const, title: 'عاجل', value: totalHigh, label: `${p.companyThresholds.commercial_reg_urgent_days + 1} - ${p.companyThresholds.commercial_reg_high_days} يوم`, accentClass: 'border-orange-500/20 bg-orange-500/5', valueClass: 'text-orange-600 dark:text-orange-300' },
    { key: 'متوسط' as const, title: 'متوسط', value: totalMedium, label: `${p.companyThresholds.commercial_reg_high_days + 1} - ${p.companyThresholds.commercial_reg_medium_days} يوم`, accentClass: 'border-yellow-500/20 bg-yellow-500/5', valueClass: 'text-yellow-600 dark:text-yellow-300' },
    { key: 'مؤجلة' as const, title: 'مؤجلة', value: p.snoozedCompaniesCount, label: '', accentClass: 'border-amber-500/20 bg-amber-500/5', valueClass: 'text-amber-600 dark:text-amber-300' },
  ]

  return (
    <Layout>
      <div className="app-page app-tech-grid">
        <PageHeader
          title="المؤسسات"
          description={`عرض ${p.filteredCompanies.length} من ${p.companies.length} مؤسسة${p.activeFiltersCount > 0 ? ` (${p.activeFiltersCount} فلتر نشط)` : ''}`}
          breadcrumbs={[{ label: 'الرئيسية', href: '/dashboard' }, { label: 'المؤسسات' }]}
          className="mb-6"
          actions={p.canCreate('companies') ? (
            <Button onClick={p.handleAddCompany} variant="default">
              <Building2 className="w-4 h-4" />
              إضافة مؤسسة
            </Button>
          ) : undefined}
        />

        {/* Statistics */}
        <div className="app-panel mb-5 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-base font-bold text-neutral-900 md:text-lg">
              <Building2 className="h-5 w-5 text-info-600" />
              إحصائيات المؤسسات
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
            {summaryCards.map((card) => (
              <div
                key={card.key}
                onClick={() => p.setCardStatusFilter(card.key === 'companies' ? null : (p.cardStatusFilter === card.key ? null : card.key as CardStatusFilter))}
                className={`app-panel cursor-pointer px-3 py-2.5 text-center transition-shadow ${card.accentClass} ${(card.key === 'companies' ? p.cardStatusFilter === null : p.cardStatusFilter === card.key) ? 'ring-2 ring-offset-1 ring-primary shadow-md' : 'hover:shadow-sm'}`}
              >
                <div className="text-[11px] font-medium leading-4 text-foreground-secondary dark:text-foreground-secondary md:text-xs">{card.title}</div>
                <div className={`text-lg font-bold leading-none md:text-xl ${card.valueClass}`}>{card.value.toLocaleString('en-US')}</div>
                <div className="text-[11px] leading-4 text-foreground-secondary dark:text-foreground-secondary md:text-xs">{card.label}</div>
              </div>
            ))}
          </div>
        </div>

        <FilterBar className="mb-6">
          <SearchInput
            type="text"
            value={p.searchTerm}
            onChange={(e) => p.setSearchTerm(e.target.value)}
            placeholder="ابحث بالاسم أو رقم اشتراك التأمينات أو الرقم الموحد..."
            wrapperClassName="min-w-[260px] flex-1"
          />
          <Button onClick={() => p.setShowFiltersModal(true)} className="relative">
            <span>الفلاتر</span>
            {p.activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">{p.activeFiltersCount}</span>
            )}
          </Button>
          <Button onClick={() => p.setShowAlertsOnly((prev) => !prev)} variant="secondary" className={`relative border-red-200 text-red-700 ${p.showAlertsOnly ? 'bg-red-50' : ''}`} title="عرض المؤسسات ذات التنبيهات فقط">
            <AlertCircle className="w-4 h-4" />
            <span className="hidden sm:inline">تنبيهات</span>
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">{p.companyAlertsCount}</span>
          </Button>

          <DropdownMenu open={p.showSortDropdown} onOpenChange={p.setShowSortDropdown}>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">
                {getSortIcon(p.sortField)}
                <span className="hidden sm:inline">الترتيب</span>
                <ArrowUpDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={8} className="w-56">
              <DropdownMenuLabel>الترتيب حسب:</DropdownMenuLabel>
              {[
                { field: 'name' as SortField, label: 'الاسم' },
                { field: 'created_at' as SortField, label: 'تاريخ التسجيل' },
                { field: 'commercial_registration_status' as SortField, label: 'حالة التسجيل التجاري' },
                { field: 'employee_count' as SortField, label: 'عدد الموظفين' },
                { field: 'power_subscription_status' as SortField, label: 'حالة اشتراك قوى' },
                { field: 'moqeem_subscription_status' as SortField, label: 'حالة اشتراك مقيم' },
              ].map(({ field, label }) => (
                <DropdownMenuItem key={field} onClick={() => p.handleSort(field)} className={`w-full justify-between text-right ${p.sortField === field ? 'bg-primary/10 text-foreground' : ''}`}>
                  <span>{label}</span>
                  {p.sortField === field && getSortIcon(field)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex flex-wrap items-center gap-3">
            <div className="app-toggle-shell">
              {!p.isMobileView && (
                <>
                  <button onClick={() => p.setViewMode('grid')} className={`app-toggle-button ${p.viewMode === 'grid' ? 'app-toggle-button-active' : ''}`} title="عرض شبكي"><Grid3X3 className="w-4 h-4" /></button>
                  <button onClick={() => p.setViewMode('table')} className={`app-toggle-button ${p.viewMode === 'table' ? 'app-toggle-button-active' : ''}`} title="عرض جدول"><List className="w-4 h-4" /></button>
                </>
              )}
              {p.isMobileView && (
                <button onClick={() => p.setViewMode('grid')} className="app-toggle-button app-toggle-button-active" title="عرض شبكي"><Grid3X3 className="w-4 h-4" /></button>
              )}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface/70 px-3 py-1.5 dark:bg-surface-900/70">
              <span className="text-sm text-neutral-600">عرض:</span>
              <select value={p.itemsPerPage} onChange={(e) => { p.setItemsPerPage(Number(e.target.value)); p.setCurrentPage(1) }} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={150}>150</option>
              </select>
            </div>
          </div>
        </FilterBar>

        {p.showFiltersModal && (
          <CompaniesFiltersModal
            activeFiltersCount={p.activeFiltersCount}
            commercialRegStatus={p.commercialRegStatus} setCommercialRegStatus={p.setCommercialRegStatus}
            powerSubscriptionStatus={p.powerSubscriptionStatus} setPowerSubscriptionStatus={p.setPowerSubscriptionStatus}
            moqeemSubscriptionStatus={p.moqeemSubscriptionStatus} setMoqeemSubscriptionStatus={p.setMoqeemSubscriptionStatus}
            employeeCountMin={p.employeeCountMin} setEmployeeCountMin={p.setEmployeeCountMin}
            employeeCountMax={p.employeeCountMax} setEmployeeCountMax={p.setEmployeeCountMax}
            availableSlotsFilter={p.availableSlotsFilter} setAvailableSlotsFilter={p.setAvailableSlotsFilter}
            createdAtFrom={p.createdAtFrom} setCreatedAtFrom={p.setCreatedAtFrom}
            createdAtTo={p.createdAtTo} setCreatedAtTo={p.setCreatedAtTo}
            exemptionsFilter={p.exemptionsFilter} setExemptionsFilter={p.setExemptionsFilter}
            showAlertsOnly={p.showAlertsOnly} setShowAlertsOnly={p.setShowAlertsOnly}
            clearFilters={p.clearFilters}
            onClose={() => p.setShowFiltersModal(false)}
          />
        )}

        {/* Display */}
        {p.loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : p.filteredCompanies.length > 0 ? (
          <>
            {p.viewMode === 'grid' ? (
              <CompaniesGrid
                paginatedCompanies={p.paginatedCompanies}
                companyGridClass={p.companyGridClass}
                onCardClick={p.handleCompanyCardClick}
                onEdit={p.handleEditCompany}
                onDelete={p.handleDeleteCompany}
              />
            ) : (
              <CompaniesTable
                paginatedCompanies={p.paginatedCompanies}
                selectedCompanyIds={p.selectedCompanyIds}
                selectedRowIndex={p.selectedRowIndex}
                tableRef={p.tableRef}
                rowRefs={p.rowRefs}
                canEdit={p.canEdit}
                canDelete={p.canDelete}
                loading={p.loading}
                onRowClick={p.handleCompanyCardClick}
                onEdit={p.handleEditCompany}
                onDelete={p.handleDeleteCompany}
                onSelectCompany={p.handleSelectCompany}
                onSelectAll={p.handleSelectAllCompanies}
                onBulkDeleteClick={() => p.setShowBulkDeleteModal(true)}
                onClearSelection={() => p.setSelectedCompanyIds([])}
              />
            )}

            {/* Pagination */}
            {p.totalPages > 1 && (
              <div className="app-panel mt-6 flex items-center justify-between p-4">
                <div className="text-sm text-neutral-600">
                  عرض {p.startIndex + 1}-{Math.min(p.endIndex, p.totalResults)} من {p.totalResults} مؤسسة
                </div>
                <div className="flex items-center gap-1">
                  <Button onClick={p.goToPreviousPage} disabled={p.currentPage === 1} variant="secondary" size="icon">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  {p.getPageNumbers().map((pageNum) => (
                    <Button key={pageNum} onClick={() => p.goToPage(pageNum)} variant={p.currentPage === pageNum ? 'default' : 'secondary'} size="sm" className="min-w-9">
                      {pageNum}
                    </Button>
                  ))}
                  <Button onClick={p.goToNextPage} disabled={p.currentPage === p.totalPages} variant="secondary" size="icon">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="app-panel py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
            <p className="text-neutral-600">لا توجد مؤسسات تطابق معايير البحث</p>
            {p.activeFiltersCount > 0 && (
              <Button onClick={p.clearFilters} variant="secondary" size="sm" className="mt-4">مسح الفلاتر وعرض الكل</Button>
            )}
          </div>
        )}

        {/* Add/Edit Modal */}
        {(p.showAddModal || p.showEditModal) && (
          <CompanyModal isOpen={p.showAddModal || p.showEditModal} company={p.selectedCompany} onClose={p.handleModalClose} onSuccess={p.handleModalSuccess} />
        )}

        {/* Detail Modal */}
        {p.showCompanyDetailModal && p.selectedCompanyForDetail && (
          <CompanyDetailModal
            company={p.selectedCompanyForDetail}
            onClose={p.handleCloseCompanyDetailModal}
            onEdit={p.handleEditCompany}
            onDelete={p.handleDeleteCompany}
            getAvailableSlotsColor={(slots) => { if (slots === 0) return 'text-red-600 bg-red-50 border-red-200'; if (slots === 1) return 'text-warning-600 bg-orange-50 border-orange-200'; if (slots <= 3) return 'text-yellow-600 bg-yellow-50 border-yellow-200'; return 'text-success-600 bg-green-50 border-green-200' }}
            getAvailableSlotsTextColor={(slots) => { if (slots === 0) return 'text-red-600'; if (slots === 1) return 'text-warning-600'; if (slots <= 3) return 'text-yellow-600'; return 'text-success-600' }}
            getAvailableSlotsText={(slots) => { if (slots === 0) return 'مكتملة'; if (slots === 1) return 'مكان واحد متبقي'; if (slots <= 3) return 'أماكن قليلة متاحة'; return 'أماكن متاحة' }}
          />
        )}

        {/* Delete Confirm */}
        {p.showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={p.handleModalClose}>
            <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-red-100 p-3 rounded-lg"><AlertCircle className="w-6 h-6 text-red-600" /></div>
                  <div><h3 className="text-lg font-bold text-neutral-900">تأكيد الحذف</h3><p className="text-sm text-neutral-600">هذا الإجراء لا يمكن التراجع عنه</p></div>
                </div>
                <p className="text-neutral-700 mb-6">
                  هل أنت متأكد من حذف مؤسسة "<strong>{p.selectedCompany?.name}</strong>"؟<br />
                  <span className="text-sm text-info-600 mt-2 block">✓ سيبقى الموظفون في النظام بدون تعيينهم على أي مؤسسة</span>
                  <span className="text-sm text-info-600 block">✓ يمكن إعادة تعيينهم لاحقاً إن أردت</span>
                </p>
                <div className="flex gap-3">
                  <Button onClick={p.handleDeleteConfirm} variant="destructive" className="flex-1">نعم، احذف</Button>
                  <Button onClick={p.handleModalClose} variant="secondary" className="flex-1">إلغاء</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Delete Confirm */}
        {p.showBulkDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => { if (!p.loading) p.setShowBulkDeleteModal(false) }}>
            <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-red-100 p-3 rounded-lg"><AlertCircle className="w-6 h-6 text-red-600" /></div>
                  <div><h3 className="text-lg font-bold text-neutral-900">تأكيد حذف المحدد</h3><p className="text-sm text-neutral-600">هذا الإجراء لا يمكن التراجع عنه</p></div>
                </div>
                <p className="text-neutral-700 mb-6">
                  هل أنت متأكد من حذف <strong>{p.selectedCompanyIds.length} مؤسسة</strong>؟<br />
                  <span className="text-sm text-info-600 mt-2 block">✓ سيبقى الموظفون في النظام بدون تعيينهم على أي مؤسسة</span>
                  <span className="text-sm text-info-600 block">✓ يمكن إعادة تعيينهم لاحقاً إن أردت</span>
                </p>
                <div className="flex gap-3">
                  <Button onClick={p.handleBulkDelete} disabled={p.loading} variant="destructive" className="flex-1">{p.loading ? 'جاري الحذف...' : 'نعم، احذف الكل'}</Button>
                  <Button onClick={() => p.setShowBulkDeleteModal(false)} disabled={p.loading} variant="secondary" className="flex-1">إلغاء</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
