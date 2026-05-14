import { X, User, Calendar, Hash, Building2, Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/Select'
import type {
  TabType,
  ResidenceStatus,
  ContractStatus,
  CommercialRegStatus,
  SavedSearch,
} from '@/hooks/advancedSearchTypes'

interface AdvancedSearchFiltersModalProps {
  activeTab: TabType
  activeFiltersCount: number
  // Employee filter state
  selectedNationality: string
  setSelectedNationality: (v: string) => void
  selectedCompanyFilter: string
  setSelectedCompanyFilter: (v: string) => void
  selectedProfession: string
  setSelectedProfession: (v: string) => void
  selectedProject: string
  setSelectedProject: (v: string) => void
  residenceStatus: ResidenceStatus
  setResidenceStatus: (v: ResidenceStatus) => void
  contractStatus: ContractStatus
  setContractStatus: (v: ContractStatus) => void
  healthInsuranceExpiryStatus: string
  setHealthInsuranceExpiryStatus: (v: string) => void
  passportNumberSearch: string
  setPassportNumberSearch: (v: string) => void
  residenceNumberSearch: string
  setResidenceNumberSearch: (v: string) => void
  // Company filter state
  commercialRegStatus: CommercialRegStatus
  setCommercialRegStatus: (v: CommercialRegStatus) => void
  exemptionsFilter: string
  setExemptionsFilter: (v: string) => void
  powerSubscriptionStatus: string
  setPowerSubscriptionStatus: (v: string) => void
  moqeemSubscriptionStatus: string
  setMoqeemSubscriptionStatus: (v: string) => void
  unifiedNumberSearch: string
  setUnifiedNumberSearch: (v: string) => void
  taxNumberSearch: string
  setTaxNumberSearch: (v: string) => void
  laborSubscriptionNumberSearch: string
  setLaborSubscriptionNumberSearch: (v: string) => void
  notesSearch: string
  setNotesSearch: (v: string) => void
  notesFilter: 'all' | 'has_notes' | 'no_notes'
  setNotesFilter: (v: 'all' | 'has_notes' | 'no_notes') => void
  // Filter lists
  nationalities: string[]
  companyList: { id: string; name: string }[]
  professions: string[]
  projects: string[]
  // Saved searches
  savedSearches: SavedSearch[]
  loadSavedSearch: (saved: SavedSearch) => void
  deleteSavedSearch: (id: string) => void
  // Actions
  clearFilters: () => void
  onClose: () => void
}

export default function AdvancedSearchFiltersModal({
  activeTab,
  activeFiltersCount,
  selectedNationality,
  setSelectedNationality,
  selectedCompanyFilter,
  setSelectedCompanyFilter,
  selectedProfession,
  setSelectedProfession,
  selectedProject,
  setSelectedProject,
  residenceStatus,
  setResidenceStatus,
  contractStatus,
  setContractStatus,
  healthInsuranceExpiryStatus,
  setHealthInsuranceExpiryStatus,
  passportNumberSearch,
  setPassportNumberSearch,
  residenceNumberSearch,
  setResidenceNumberSearch,
  commercialRegStatus,
  setCommercialRegStatus,
  exemptionsFilter,
  setExemptionsFilter,
  powerSubscriptionStatus,
  setPowerSubscriptionStatus,
  moqeemSubscriptionStatus,
  setMoqeemSubscriptionStatus,
  unifiedNumberSearch,
  setUnifiedNumberSearch,
  taxNumberSearch,
  setTaxNumberSearch,
  laborSubscriptionNumberSearch,
  setLaborSubscriptionNumberSearch,
  notesSearch,
  setNotesSearch,
  notesFilter,
  setNotesFilter,
  nationalities,
  companyList,
  professions,
  projects,
  savedSearches,
  loadSavedSearch,
  deleteSavedSearch,
  clearFilters,
  onClose,
}: AdvancedSearchFiltersModalProps) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gradient-to-br from-gray-900/60 via-gray-800/50 to-gray-900/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-surface/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col transform transition-all animate-in fade-in zoom-in-95 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/20 bg-gradient-to-r from-white/40 to-white/20 backdrop-blur-sm">
            <div>
              <h2 className="text-lg font-bold text-gray-800">الفلاتر والبحث المتقدم</h2>
              {activeFiltersCount > 0 && (
                <p className="text-xs text-gray-600 mt-0.5">{activeFiltersCount} فلتر نشط</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-surface/30 rounded-lg transition-all duration-200 hover:scale-110"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Employee Filters */}
            {activeTab === 'employees' && (
              <div className="space-y-3 mb-4">
                {/* Group 1: المعلومات الأساسية */}
                <div className="bg-gradient-to-br from-blue-50/60 to-blue-100/40 backdrop-blur-md rounded-xl p-3.5 border border-white/30 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg backdrop-blur-sm">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-800">المعلومات الأساسية</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        الجنسية
                      </label>
                      <Select value={selectedNationality} onValueChange={setSelectedNationality}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          {nationalities.map((nat) => (
                            <SelectItem key={nat} value={nat}>
                              {nat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        المؤسسة
                      </label>
                      <Select
                        value={selectedCompanyFilter}
                        onValueChange={setSelectedCompanyFilter}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          {companyList.map((comp) => (
                            <SelectItem key={comp.id} value={comp.id}>
                              {comp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        المهنة
                      </label>
                      <Select value={selectedProfession} onValueChange={setSelectedProfession}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          {professions.map((prof) => (
                            <SelectItem key={prof} value={prof}>
                              {prof}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        المشروع
                      </label>
                      <Select value={selectedProject} onValueChange={setSelectedProject}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project} value={project}>
                              {project}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Group 2: حالة التوثيق */}
                <div className="bg-gradient-to-br from-green-50/60 to-emerald-100/40 backdrop-blur-md rounded-xl p-3.5 border border-white/30 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-green-500/20 rounded-lg backdrop-blur-sm">
                      <Calendar className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-800">حالة التوثيق</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        حالة الإقامة
                      </label>
                      <Select
                        value={residenceStatus}
                        onValueChange={(val) => setResidenceStatus(val as ResidenceStatus)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          <SelectItem value="expired">منتهية</SelectItem>
                          <SelectItem value="expiring_soon">عاجل</SelectItem>
                          <SelectItem value="valid">سارية</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        حالة العقد
                      </label>
                      <Select
                        value={contractStatus}
                        onValueChange={(val) => setContractStatus(val as ContractStatus)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          <SelectItem value="expired">منتهي</SelectItem>
                          <SelectItem value="expiring_soon">عاجل</SelectItem>
                          <SelectItem value="valid">ساري</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        حالة انتهاء التأمين الصحي
                      </label>
                      <Select
                        value={healthInsuranceExpiryStatus}
                        onValueChange={setHealthInsuranceExpiryStatus}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          <SelectItem value="expired">منتهي</SelectItem>
                          <SelectItem value="expiring_soon">عاجل</SelectItem>
                          <SelectItem value="valid">ساري</SelectItem>
                          <SelectItem value="no_expiry">غير محدد</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Group 3: البحث النصي */}
                <div className="bg-gradient-to-br from-purple-50/60 to-pink-100/40 backdrop-blur-md rounded-xl p-3.5 border border-white/30 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-purple-500/20 rounded-lg backdrop-blur-sm">
                      <Hash className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-800">البحث النصي</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        بحث رقم الجواز
                      </label>
                      <input
                        type="text"
                        value={passportNumberSearch}
                        onChange={(e) => setPassportNumberSearch(e.target.value)}
                        placeholder="ابحث برقم الجواز..."
                        className="w-full px-2.5 py-1.5 text-sm bg-surface/70 backdrop-blur-sm border border-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all shadow-sm hover:shadow-md"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        بحث رقم الإقامة
                      </label>
                      <input
                        type="text"
                        value={residenceNumberSearch}
                        onChange={(e) => setResidenceNumberSearch(e.target.value)}
                        placeholder="ابحث برقم الإقامة..."
                        className="w-full px-2.5 py-1.5 text-sm bg-surface/70 backdrop-blur-sm border border-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all shadow-sm hover:shadow-md"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Company Filters */}
            {activeTab === 'companies' && (
              <div className="space-y-3">
                {/* Group 1: الحالة الأساسية */}
                <div className="bg-gradient-to-br from-indigo-50/60 to-blue-100/40 backdrop-blur-md rounded-xl p-3.5 border border-white/30 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-indigo-500/20 rounded-lg backdrop-blur-sm">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-800">الحالة الأساسية</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        حالة السجل التجاري
                      </label>
                      <Select
                        value={commercialRegStatus}
                        onValueChange={(val) =>
                          setCommercialRegStatus(val as CommercialRegStatus)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          <SelectItem value="expired">منتهي</SelectItem>
                          <SelectItem value="expiring_soon">عاجل</SelectItem>
                          <SelectItem value="valid">ساري</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        الاعفاءات
                      </label>
                      <Select value={exemptionsFilter} onValueChange={setExemptionsFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          <SelectItem value="تم الاعفاء">تم الاعفاء</SelectItem>
                          <SelectItem value="لم يتم الاعفاء">لم يتم الاعفاء</SelectItem>
                          <SelectItem value="أخرى">أخرى</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Group 2: حالة التوثيق */}
                <div className="bg-gradient-to-br from-green-50/60 to-emerald-100/40 backdrop-blur-md rounded-xl p-3.5 border border-white/30 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-green-500/20 rounded-lg backdrop-blur-sm">
                      <Calendar className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-800">حالة التوثيق</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        حالة اشتراك قوى
                      </label>
                      <Select
                        value={powerSubscriptionStatus}
                        onValueChange={setPowerSubscriptionStatus}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          <SelectItem value="expired">منتهي</SelectItem>
                          <SelectItem value="expiring_soon">عاجل</SelectItem>
                          <SelectItem value="valid">ساري</SelectItem>
                          <SelectItem value="no_expiry">غير محدد</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        حالة اشتراك مقيم
                      </label>
                      <Select
                        value={moqeemSubscriptionStatus}
                        onValueChange={setMoqeemSubscriptionStatus}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          <SelectItem value="expired">منتهي</SelectItem>
                          <SelectItem value="expiring_soon">عاجل</SelectItem>
                          <SelectItem value="valid">ساري</SelectItem>
                          <SelectItem value="no_expiry">غير محدد</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Group 3: البحث النصي */}
                <div className="bg-gradient-to-br from-purple-50/60 to-pink-100/40 backdrop-blur-md rounded-xl p-3.5 border border-white/30 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-purple-500/20 rounded-lg backdrop-blur-sm">
                      <Hash className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-800">البحث النصي</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        بحث الرقم الموحد
                      </label>
                      <input
                        type="text"
                        value={unifiedNumberSearch}
                        onChange={(e) => setUnifiedNumberSearch(e.target.value)}
                        placeholder="ابحث بالرقم الموحد..."
                        className="w-full px-2.5 py-1.5 text-sm bg-surface/70 backdrop-blur-sm border border-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all shadow-sm hover:shadow-md"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        بحث الرقم التأميني
                      </label>
                      <input
                        type="text"
                        value={taxNumberSearch}
                        onChange={(e) => setTaxNumberSearch(e.target.value)}
                        placeholder="ابحث بالرقم التأميني..."
                        className="w-full px-2.5 py-1.5 text-sm bg-surface/70 backdrop-blur-sm border border-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all shadow-sm hover:shadow-md"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        بحث رقم اشتراك العمل
                      </label>
                      <input
                        type="text"
                        value={laborSubscriptionNumberSearch}
                        onChange={(e) => setLaborSubscriptionNumberSearch(e.target.value)}
                        placeholder="ابحث برقم اشتراك العمل..."
                        className="w-full px-2.5 py-1.5 text-sm bg-surface/70 backdrop-blur-sm border border-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all shadow-sm hover:shadow-md"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        بحث في الملاحظات
                      </label>
                      <input
                        type="text"
                        value={notesSearch}
                        onChange={(e) => setNotesSearch(e.target.value)}
                        placeholder="ابحث في الملاحظات..."
                        className="w-full px-2.5 py-1.5 text-sm bg-surface/70 backdrop-blur-sm border border-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all shadow-sm hover:shadow-md"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        فلتر الملاحظات
                      </label>
                      <Select
                        value={notesFilter}
                        onValueChange={(val) =>
                          setNotesFilter(val as 'all' | 'has_notes' | 'no_notes')
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          <SelectItem value="has_notes">يوجد ملاحظات</SelectItem>
                          <SelectItem value="no_notes">لا توجد ملاحظات</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Saved Searches inside modal */}
            {savedSearches.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <h3 className="text-xs font-bold mb-2.5 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-yellow-500" />
                  البحوث المحفوظة
                </h3>
                <div className="flex flex-wrap gap-2">
                  {savedSearches.map((saved) => (
                    <div
                      key={saved.id}
                      className="flex items-center gap-1.5 bg-surface/50 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-white/30 shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <button
                        onClick={() => {
                          loadSavedSearch(saved)
                          onClose()
                        }}
                        className="text-xs hover:text-blue-600 transition-colors font-medium"
                      >
                        {saved.name}
                      </button>
                      <button
                        onClick={() => deleteSavedSearch(saved.id)}
                        className="p-0.5 hover:bg-red-100/50 rounded text-red-600 transition-all duration-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/20 bg-gradient-to-r from-white/40 to-white/20 backdrop-blur-sm">
            <Button
              onClick={clearFilters}
              disabled={activeFiltersCount === 0}
              variant="secondary"
              size="sm"
            >
              <X className="w-3.5 h-3.5" />
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
