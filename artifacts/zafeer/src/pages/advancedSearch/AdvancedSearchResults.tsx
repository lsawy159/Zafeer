import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Company as CompanyType, Employee as EmployeeType } from '@/lib/supabase'
import { getCompanyName } from '@/hooks/useAdvancedSearchFilters'
import type { TabType, ViewMode } from '@/hooks/advancedSearchTypes'

interface AdvancedSearchResultsProps {
  activeTab: TabType
  viewMode: ViewMode
  isLoading: boolean
  resultsCount: number
  paginatedEmployees: EmployeeType[]
  paginatedCompanies: CompanyType[]
  totalPages: number
  totalResults: number
  currentPage: number
  startIndex: number
  endIndex: number
  goToPage: (page: number) => void
  goToPreviousPage: () => void
  goToNextPage: () => void
  getPageNumbers: () => number[]
  handleEmployeeClick: (employee: EmployeeType) => void
  handleCompanyClick: (company: CompanyType) => void
}

export default function AdvancedSearchResults({
  activeTab,
  viewMode,
  isLoading,
  resultsCount,
  paginatedEmployees,
  paginatedCompanies,
  totalPages,
  totalResults,
  currentPage,
  startIndex,
  endIndex,
  goToPage,
  goToPreviousPage,
  goToNextPage,
  getPageNumbers,
  handleEmployeeClick,
  handleCompanyClick,
}: AdvancedSearchResultsProps) {
  return (
    <div className="w-full mt-6">
      {/* Loading */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-3 text-sm text-gray-600">جاري تحميل البيانات...</p>
        </div>
      )}

      {/* Results */}
      {!isLoading && resultsCount > 0 && (
        <>
          {/* Employee results */}
          {activeTab === 'employees' && paginatedEmployees.length > 0 && (
            <div className="mb-4">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {paginatedEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      onClick={() => handleEmployeeClick(emp)}
                      className="card-interactive rounded-xl border border-border bg-card p-3 cursor-pointer transition-[transform,border-color,box-shadow,background-color] duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:border-neutral-300 hover:shadow-md"
                    >
                      <h3 className="font-bold text-base mb-1.5">{emp.name}</h3>
                      <div className="space-y-0.5 text-xs">
                        <p>
                          <span className="text-gray-600">المهنة:</span> {emp.profession}
                        </p>
                        <p>
                          <span className="text-gray-600">الجنسية:</span> {emp.nationality}
                        </p>
                        <p>
                          <span className="text-gray-600">الجوال:</span> {emp.phone}
                        </p>
                        <p>
                          <span className="text-gray-600">المؤسسة:</span>{' '}
                          {getCompanyName(emp) || 'غير محدد'}
                        </p>
                        {emp.project_name && (
                          <p>
                            <span className="text-gray-600">المشروع:</span>
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full mr-1">
                              {emp.project_name}
                            </span>
                          </p>
                        )}
                        {emp.residence_expiry && (
                          <p>
                            <span className="text-gray-600">انتهاء الإقامة:</span>{' '}
                            {emp.residence_expiry}
                          </p>
                        )}
                        {emp.contract_expiry && (
                          <p>
                            <span className="text-gray-600">انتهاء العقد:</span>{' '}
                            {emp.contract_expiry}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-surface border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-1.5 text-right">الاسم</th>
                          <th className="px-3 py-1.5 text-right">المهنة</th>
                          <th className="px-3 py-1.5 text-right">الجنسية</th>
                          <th className="px-3 py-1.5 text-right">الجوال</th>
                          <th className="px-3 py-1.5 text-right">المؤسسة</th>
                          <th className="px-3 py-1.5 text-right">المشروع</th>
                          <th className="px-3 py-1.5 text-right">انتهاء الإقامة</th>
                          <th className="px-3 py-1.5 text-right">انتهاء العقد</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedEmployees.map((emp) => (
                          <tr
                            key={emp.id}
                            onClick={() => handleEmployeeClick(emp)}
                            className="border-t hover:bg-gray-50 cursor-pointer"
                          >
                            <td className="px-3 py-1.5 font-medium">{emp.name}</td>
                            <td className="px-3 py-1.5">{emp.profession}</td>
                            <td className="px-3 py-1.5">{emp.nationality}</td>
                            <td className="px-3 py-1.5">{emp.phone}</td>
                            <td className="px-3 py-1.5">
                              {getCompanyName(emp) || 'غير محدد'}
                            </td>
                            <td className="px-3 py-1.5">
                              {emp.project_name ? (
                                <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                                  {emp.project_name}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-1.5">{emp.residence_expiry || '-'}</td>
                            <td className="px-3 py-1.5">{emp.contract_expiry || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Company results */}
          {activeTab === 'companies' && paginatedCompanies.length > 0 && (
            <div className="mb-4">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {paginatedCompanies.map((comp) => (
                    <div
                      key={comp.id}
                      onClick={() => handleCompanyClick(comp)}
                      className="bg-surface border rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
                    >
                      <h3 className="font-bold text-base mb-1.5">{comp.name}</h3>
                      <div className="space-y-0.5 text-xs">
                        <p>
                          <span className="text-gray-600">رقم اشتراك التأمينات:</span>{' '}
                          {comp.social_insurance_number}
                        </p>
                        <p>
                          <span className="text-gray-600">رقم موحد:</span> {comp.unified_number}
                        </p>
                        {comp.commercial_registration_expiry && (
                          <p>
                            <span className="text-gray-600">انتهاء السجل:</span>{' '}
                            {comp.commercial_registration_expiry}
                          </p>
                        )}
                        {comp.ending_subscription_power_date && (
                          <p>
                            <span className="text-gray-600">انتهاء اشتراك قوى:</span>{' '}
                            {comp.ending_subscription_power_date}
                          </p>
                        )}
                        {comp.ending_subscription_moqeem_date && (
                          <p>
                            <span className="text-gray-600">انتهاء اشتراك مقيم:</span>{' '}
                            {comp.ending_subscription_moqeem_date}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-surface border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-1.5 text-right">اسم المؤسسة</th>
                          <th className="px-3 py-1.5 text-right">رقم اشتراك التأمينات</th>
                          <th className="px-3 py-1.5 text-right">رقم موحد</th>
                          <th className="px-3 py-1.5 text-right">انتهاء السجل</th>
                          <th className="px-3 py-1.5 text-right">انتهاء اشتراك قوى</th>
                          <th className="px-3 py-1.5 text-right">انتهاء اشتراك مقيم</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedCompanies.map((comp) => (
                          <tr
                            key={comp.id}
                            onClick={() => handleCompanyClick(comp)}
                            className="border-t hover:bg-gray-50 cursor-pointer"
                          >
                            <td className="px-3 py-1.5 font-medium">{comp.name}</td>
                            <td className="px-3 py-1.5">
                              {comp.social_insurance_number || '-'}
                            </td>
                            <td className="px-3 py-1.5">{comp.unified_number}</td>
                            <td className="px-3 py-1.5">
                              {comp.commercial_registration_expiry || '-'}
                            </td>
                            <td className="px-3 py-1.5">
                              {comp.ending_subscription_power_date || '-'}
                            </td>
                            <td className="px-3 py-1.5">
                              {comp.ending_subscription_moqeem_date || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-surface border rounded-lg p-3">
              <div className="text-xs text-gray-600">
                عرض {startIndex + 1}-{Math.min(endIndex, totalResults)} من {totalResults} نتيجة
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="p-1.5 border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {getPageNumbers().map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`px-2 py-1 border rounded-md text-xs ${
                      currentPage === pageNum
                        ? 'border-primary bg-primary text-foreground'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="p-1.5 border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!isLoading && resultsCount === 0 && (
        <div className="text-center py-8 bg-surface border rounded-lg">
          <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <h3 className="text-base font-semibold mb-1">لا توجد نتائج</h3>
          <p className="text-sm text-gray-600">جرب تغيير معايير البحث أو الفلاتر</p>
        </div>
      )}
    </div>
  )
}
