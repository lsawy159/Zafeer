import { RefObject } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface CompanyOption {
  id: string
  name: string
  unified_number?: number
}

interface EmployeesFiltersModalProps {
  activeFiltersCount: number
  hasActiveFilters: string | boolean | undefined
  searchTerm: string
  setSearchTerm: (v: string) => void
  residenceNumberSearch: string
  setResidenceNumberSearch: (v: string) => void
  companyFilter: string
  setCompanyFilter: (v: string) => void
  companySearchQuery: string
  setCompanySearchQuery: (v: string) => void
  isCompanyDropdownOpen: boolean
  setCompanyDropdownOpen: (v: boolean) => void
  filteredCompanies: CompanyOption[]
  companyDropdownRef: RefObject<HTMLDivElement | null>
  nationalityFilter: string
  setNationalityFilter: (v: string) => void
  nationalities: string[]
  professionFilter: string
  setProfessionFilter: (v: string) => void
  professions: string[]
  projectFilter: string
  setProjectFilter: (v: string) => void
  projects: string[]
  contractFilter: string
  setContractFilter: (v: string) => void
  hiredWorkerContractFilter: string
  setHiredWorkerContractFilter: (v: string) => void
  residenceFilter: string
  setResidenceFilter: (v: string) => void
  healthInsuranceFilter: string
  setHealthInsuranceFilter: (v: string) => void
  showAlertsOnly: boolean
  setShowAlertsOnly: (v: boolean) => void
  clearFilters: () => void
  onClose: () => void
}

export function EmployeesFiltersModal({
  activeFiltersCount,
  hasActiveFilters,
  searchTerm,
  setSearchTerm,
  residenceNumberSearch,
  setResidenceNumberSearch,
  companyFilter,
  setCompanyFilter,
  companySearchQuery,
  setCompanySearchQuery,
  isCompanyDropdownOpen,
  setCompanyDropdownOpen,
  filteredCompanies,
  companyDropdownRef,
  nationalityFilter,
  setNationalityFilter,
  nationalities,
  professionFilter,
  setProfessionFilter,
  professions,
  projectFilter,
  setProjectFilter,
  projects,
  contractFilter,
  setContractFilter,
  hiredWorkerContractFilter,
  setHiredWorkerContractFilter,
  residenceFilter,
  setResidenceFilter,
  healthInsuranceFilter,
  setHealthInsuranceFilter,
  showAlertsOnly,
  setShowAlertsOnly,
  clearFilters,
  onClose,
}: EmployeesFiltersModalProps) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        style={{ contain: 'strict', willChange: 'opacity' }}
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="fixed inset-0 flex items-end justify-center p-0 md:items-center md:p-4 pointer-events-none">
        <div className="w-full max-h-[92vh] max-w-4xl overflow-hidden rounded-t-2xl border border-border bg-card shadow-xl motion-safe-enter md:rounded-2xl flex flex-col pointer-events-auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-200">
            <div>
              <h2 className="text-xl font-bold text-neutral-900">الفلاتر والبحث</h2>
              {activeFiltersCount > 0 && (
                <p className="text-sm text-neutral-600 mt-1">{activeFiltersCount} فلتر نشط</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="touch-feedback rounded-lg p-2 transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:bg-muted"
            >
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* البحث برقم الإقامة */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  البحث برقم الإقامة
                </label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="ابحث برقم الإقامة..."
                    value={residenceNumberSearch}
                    onChange={(e) => setResidenceNumberSearch(e.target.value)}
                    className="focus-ring-brand w-full rounded-md border border-input bg-surface py-2 pr-10 pl-3 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
                  />
                </div>
              </div>

              {/* فلتر الشركة */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  الشركة
                </label>
                <div className="relative" ref={companyDropdownRef}>
                  <div className="relative">
                    <input
                      type="text"
                      value={companySearchQuery}
                      onChange={(e) => {
                        setCompanySearchQuery(e.target.value)
                        setCompanyDropdownOpen(true)
                      }}
                      onFocus={() => setCompanyDropdownOpen(true)}
                      placeholder="ابحث بالاسم أو الرقم الموحد..."
                      className="focus-ring-brand w-full rounded-md border border-input bg-surface py-2 pr-10 pl-3 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Search className="w-4 h-4 text-neutral-400" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setCompanyDropdownOpen(!isCompanyDropdownOpen)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${isCompanyDropdownOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>

                  {isCompanyDropdownOpen && (
                    <div className="absolute z-[130] w-full mt-1 bg-surface border border-neutral-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setCompanyFilter('')
                          setCompanySearchQuery('')
                          setCompanyDropdownOpen(false)
                        }}
                        className="w-full px-3 py-2 text-right text-sm hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none transition-colors text-neutral-600"
                      >
                        جميع الشركات
                      </button>
                      {filteredCompanies.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-neutral-500 text-center">
                          {companySearchQuery.trim()
                            ? 'لا توجد نتائج'
                            : 'لا توجد شركات متاحة'}
                        </div>
                      ) : (
                        filteredCompanies.map((company) => {
                          const displayText = company.unified_number
                            ? `${company.name} (${company.unified_number})`
                            : company.name
                          return (
                            <button
                              key={company.id}
                              type="button"
                              onClick={() => {
                                setCompanyFilter(company.name)
                                setCompanySearchQuery(displayText)
                                setCompanyDropdownOpen(false)
                              }}
                              className="w-full px-3 py-2 text-right text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
                            >
                              {displayText}
                            </button>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* فلتر الجنسية */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  الجنسية
                </label>
                <select
                  value={nationalityFilter}
                  onChange={(e) => setNationalityFilter(e.target.value)}
                  className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
                >
                  <option value="">جميع الجنسيات</option>
                  {nationalities.map((nationality) => (
                    <option key={nationality} value={nationality}>
                      {nationality}
                    </option>
                  ))}
                </select>
              </div>

              {/* فلتر المهنة */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  المهنة
                </label>
                <select
                  value={professionFilter}
                  onChange={(e) => setProfessionFilter(e.target.value)}
                  className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
                >
                  <option value="">جميع المهن</option>
                  {professions.map((profession) => (
                    <option key={profession} value={profession}>
                      {profession}
                    </option>
                  ))}
                </select>
              </div>

              {/* فلتر المشروع */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  المشروع
                </label>
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
                >
                  <option value="">جميع المشاريع</option>
                  {projects.map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))}
                </select>
              </div>

              {/* فلتر العقود */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  حالة العقد
                </label>
                <select
                  value={contractFilter}
                  onChange={(e) => setContractFilter(e.target.value)}
                  className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
                >
                  <option value="">جميع العقود</option>
                  <option value="منتهي">عقود منتهية</option>
                  <option value="طارئ">عقود طارئة</option>
                  <option value="عاجل">عقود عاجلة</option>
                  <option value="متوسط">عقود متوسطة</option>
                  <option value="ساري">عقود سارية</option>
                </select>
              </div>

              {/* فلتر عقد أجير */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  حالة عقد أجير
                </label>
                <select
                  value={hiredWorkerContractFilter}
                  onChange={(e) => setHiredWorkerContractFilter(e.target.value)}
                  className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
                >
                  <option value="">جميع الحالات</option>
                  <option value="منتهي">منتهي</option>
                  <option value="طارئ">طارئ</option>
                  <option value="عاجل">عاجل</option>
                  <option value="متوسط">متوسط</option>
                  <option value="ساري">ساري</option>
                </select>
              </div>

              {/* فلتر الإقامات */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  حالة الإقامة
                </label>
                <select
                  value={residenceFilter}
                  onChange={(e) => setResidenceFilter(e.target.value)}
                  className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
                >
                  <option value="">جميع الإقامات</option>
                  <option value="منتهي">إقامات منتهية</option>
                  <option value="طارئ">إقامات طارئة</option>
                  <option value="عاجل">إقامات عاجلة</option>
                  <option value="متوسط">إقامات متوسطة</option>
                  <option value="ساري">إقامات سارية</option>
                </select>
              </div>

              {/* فلتر التأمين */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  حالة التأمين
                </label>
                <select
                  value={healthInsuranceFilter}
                  onChange={(e) => setHealthInsuranceFilter(e.target.value)}
                  className="focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]"
                >
                  <option value="">جميع الموظفين</option>
                  <option value="ساري">التأمين ساري</option>
                  <option value="منتهي">التأمين منتهي</option>
                  <option value="طارئ">التأمين طارئ</option>
                  <option value="عاجل">التأمين عاجل</option>
                  <option value="متوسط">التأمين متوسط</option>
                </select>
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="mt-6 pt-6 border-t border-neutral-200">
                <h3 className="text-sm font-medium text-neutral-700 mb-3">الفلاتر النشطة:</h3>
                <div className="flex flex-wrap gap-2">
                  {searchTerm && (
                    <span className="px-3 py-1.5 bg-blue-50 text-info-700 text-sm rounded-full flex items-center gap-2">
                      البحث: {searchTerm}
                      <button
                        onClick={() => setSearchTerm('')}
                        className="touch-feedback rounded-full p-0.5 transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:bg-black/10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {residenceNumberSearch && (
                    <span className="px-3 py-1.5 bg-cyan-50 text-cyan-700 text-sm rounded-full flex items-center gap-2">
                      رقم الإقامة: {residenceNumberSearch}
                      <button
                        onClick={() => setResidenceNumberSearch('')}
                        className="touch-feedback rounded-full p-0.5 transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:bg-black/10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {companyFilter && (
                    <span className="px-3 py-1.5 bg-green-50 text-success-700 text-sm rounded-full flex items-center gap-2">
                      الشركة: {companyFilter}
                      <button
                        onClick={() => setCompanyFilter('')}
                        className="touch-feedback rounded-full p-0.5 transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:bg-black/10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {nationalityFilter && (
                    <span className="px-3 py-1.5 bg-purple-50 text-purple-700 text-sm rounded-full flex items-center gap-2">
                      الجنسية: {nationalityFilter}
                      <button
                        onClick={() => setNationalityFilter('')}
                        className="touch-feedback rounded-full p-0.5 transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:bg-black/10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {professionFilter && (
                    <span className="px-3 py-1.5 bg-orange-50 text-warning-700 text-sm rounded-full flex items-center gap-2">
                      المهنة: {professionFilter}
                      <button
                        onClick={() => setProfessionFilter('')}
                        className="touch-feedback rounded-full p-0.5 transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:bg-black/10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {projectFilter && (
                    <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm rounded-full flex items-center gap-2">
                      المشروع: {projectFilter}
                      <button
                        onClick={() => setProjectFilter('')}
                        className="touch-feedback rounded-full p-0.5 transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:bg-black/10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {contractFilter && (
                    <span className="px-3 py-1.5 bg-red-50 text-red-700 text-sm rounded-full flex items-center gap-2">
                      العقد: {contractFilter}
                      <button
                        onClick={() => setContractFilter('')}
                        className="touch-feedback rounded-full p-0.5 transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:bg-black/10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {hiredWorkerContractFilter && (
                    <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm rounded-full flex items-center gap-2">
                      عقد أجير: {hiredWorkerContractFilter}
                      <button
                        onClick={() => setHiredWorkerContractFilter('')}
                        className="touch-feedback rounded-full p-0.5 transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:bg-black/10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {residenceFilter && (
                    <span className="px-3 py-1.5 bg-rose-50 text-rose-700 text-sm rounded-full flex items-center gap-2">
                      الإقامة: {residenceFilter}
                      <button
                        onClick={() => setResidenceFilter('')}
                        className="touch-feedback rounded-full p-0.5 transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:bg-black/10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {healthInsuranceFilter && (
                    <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm rounded-full flex items-center gap-2">
                      التأمين الصحي: {healthInsuranceFilter}
                      <button
                        onClick={() => setHealthInsuranceFilter('')}
                        className="touch-feedback rounded-full p-0.5 transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:bg-black/10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {showAlertsOnly && (
                    <span className="px-3 py-1.5 bg-red-50 text-red-700 text-sm rounded-full flex items-center gap-2">
                      تنبيهات فقط
                      <button
                        onClick={() => setShowAlertsOnly(false)}
                        className="touch-feedback rounded-full p-0.5 transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:bg-black/10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between border-t border-border bg-muted/30 p-6">
            <Button
              onClick={clearFilters}
              disabled={activeFiltersCount === 0}
              variant="secondary"
              size="sm"
            >
              <X className="w-4 h-4" />
              مسح جميع الفلاتر
            </Button>
            <Button onClick={onClose} size="sm">
              تطبيق الفلاتر
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
