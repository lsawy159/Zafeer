import { useRef } from 'react'
import {
  Briefcase,
  Calendar,
  ChevronDown,
  CreditCard,
  FileText,
  FolderKanban,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Search,
} from 'lucide-react'
import { Employee, Company, Project } from '@/lib/supabase'
import { HIRED_WORKER_CONTRACT_STATUS_OPTIONS } from '@/utils/employeeBusinessFields'
import { ResidenceFileField } from '../ResidenceFileField'
import { ResidenceFileViewer } from '../ResidenceFileViewer'
import type { EmployeeFormData } from './useEmployeeCardLogic'
import type { getEmployeeBusinessFields } from '@/utils/employeeBusinessFields'

interface EmployeeCardInfoProps {
  employee: Employee & { company: Company }
  formData: EmployeeFormData
  setFormData: (f: EmployeeFormData) => void
  isEditMode: boolean
  employeeBusinessFields: ReturnType<typeof getEmployeeBusinessFields>
  companySearchQuery: string
  setCompanySearchQuery: (v: string) => void
  isCompanyDropdownOpen: boolean
  setIsCompanyDropdownOpen: (v: boolean) => void
  companyDropdownRef: React.RefObject<HTMLDivElement | null>
  filteredCompanies: Company[]
  projectSearchQuery: string
  setProjectSearchQuery: (v: string) => void
  isProjectDropdownOpen: boolean
  setIsProjectDropdownOpen: (v: boolean) => void
  projectDropdownRef: React.RefObject<HTMLDivElement | null>
  filteredProjects: Project[]
  showCreateOption: string | false | boolean
  newProjectName: string
  setNewProjectName: (v: string) => void
  showCreateProjectModal: boolean
  setShowCreateProjectModal: (v: boolean) => void
  creatingProject: boolean
  handleCreateProject: () => Promise<void>
  thumbnailPreviewUrl: string | null
  hasPendingResidenceFile: boolean
  handleFilesReady: (original: File, thumbnail: File | null) => void
}

export function EmployeeCardInfo({
  employee,
  formData,
  setFormData,
  isEditMode,
  employeeBusinessFields,
  companySearchQuery,
  setCompanySearchQuery,
  isCompanyDropdownOpen,
  setIsCompanyDropdownOpen,
  companyDropdownRef,
  filteredCompanies,
  projectSearchQuery,
  setProjectSearchQuery,
  isProjectDropdownOpen,
  setIsProjectDropdownOpen,
  projectDropdownRef,
  filteredProjects,
  showCreateOption,
  newProjectName,
  setNewProjectName,
  showCreateProjectModal,
  setShowCreateProjectModal,
  creatingProject,
  handleCreateProject,
  thumbnailPreviewUrl,
  hasPendingResidenceFile,
  handleFilesReady,
}: EmployeeCardInfoProps) {
  const inputClass = (disabled: boolean) =>
    `app-input py-2 ${disabled ? 'border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed' : ''}`

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. الاسم */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">الاسم الكامل</label>
          <input
            type="text"
            value={formData.name ?? ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={!isEditMode}
            className={inputClass(!isEditMode)}
          />
        </div>

        {/* 2. مهنة الإقامة */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            مهنة الإقامة
          </label>
          <input
            type="text"
            value={formData.profession ?? ''}
            onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
            disabled={!isEditMode}
            className={inputClass(!isEditMode)}
          />
        </div>

        {/* 3. الجنسية */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            الجنسية
          </label>
          <input
            type="text"
            value={formData.nationality ?? ''}
            onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
            disabled={!isEditMode}
            className={inputClass(!isEditMode)}
          />
        </div>

        {/* 4. رقم الإقامة */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            رقم الإقامة
          </label>
          <input
            type="text"
            value={formData.residence_number || ''}
            onChange={(e) => setFormData({ ...formData, residence_number: parseInt(e.target.value) || 0 })}
            disabled={!isEditMode}
            className={`app-input py-2 font-mono ${!isEditMode ? 'border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed' : ''}`}
          />
        </div>

        {/* 5. رقم الجواز */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">رقم جواز السفر</label>
          <input
            type="text"
            value={formData.passport_number ?? ''}
            onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
            disabled={!isEditMode}
            className={inputClass(!isEditMode)}
          />
        </div>

        {/* 6. تاريخ الميلاد */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            تاريخ الميلاد
          </label>
          <input
            type="date"
            value={formData.birth_date || ''}
            onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
            disabled={!isEditMode}
            className={inputClass(!isEditMode)}
          />
        </div>

        {/* 7. رقم الهاتف */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            رقم الهاتف
          </label>
          <input
            type="text"
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            disabled={!isEditMode}
            className={inputClass(!isEditMode)}
          />
        </div>

        {/* 8. الحساب البنكي */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            الحساب البنكي
          </label>
          <input
            type="text"
            value={formData.bank_account || ''}
            onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
            disabled={!isEditMode}
            className={inputClass(!isEditMode)}
          />
        </div>

        {/* 9. اسم البنك */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            اسم البنك
          </label>
          <input
            type="text"
            value={employeeBusinessFields.bank_name}
            onChange={(e) =>
              setFormData({ ...formData, additional_fields: { ...formData.additional_fields, bank_name: e.target.value } })
            }
            disabled={!isEditMode}
            className={inputClass(!isEditMode)}
          />
        </div>

        {/* 10. الراتب */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            الراتب
          </label>
          <input
            type="number"
            value={formData.salary || 0}
            onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
            disabled={!isEditMode}
            className={inputClass(!isEditMode)}
            placeholder="الراتب الشهري"
          />
        </div>

        {/* 11. الشركة */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            الشركة أو المؤسسة
          </label>
          <div className="relative" ref={companyDropdownRef}>
            <div className="relative">
              <input
                type="text"
                value={companySearchQuery}
                onChange={(e) => { setCompanySearchQuery(e.target.value); setIsCompanyDropdownOpen(true) }}
                onFocus={() => { if (isEditMode) setIsCompanyDropdownOpen(true) }}
                placeholder="ابحث بالاسم أو الرقم الموحد..."
                disabled={!isEditMode}
                className={`app-input py-2 pr-10 ${!isEditMode ? 'border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed' : ''}`}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <Search className="w-5 h-5 text-neutral-400" />
              </div>
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <ChevronDown className={`w-5 h-5 transition-transform ${isCompanyDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
            {isCompanyDropdownOpen && isEditMode && (
              <div className="absolute z-[130] w-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredCompanies.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-neutral-500 text-center">
                    {companySearchQuery.trim() ? 'لا توجد نتائج' : 'لا توجد شركات متاحة'}
                  </div>
                ) : (
                  filteredCompanies.map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, company_id: company.id })
                        setCompanySearchQuery(`${company.name} (${company.unified_number})`)
                        setIsCompanyDropdownOpen(false)
                      }}
                      className="w-full px-4 py-2.5 text-right text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
                    >
                      {company.name} ({company.unified_number})
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* 12. المشروع */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
            <FolderKanban className="w-4 h-4" />
            المشروع
          </label>
          <div className="relative" ref={projectDropdownRef}>
            <div className="relative">
              <input
                type="text"
                value={projectSearchQuery}
                onChange={(e) => { setProjectSearchQuery(e.target.value); setIsProjectDropdownOpen(true) }}
                onFocus={() => { if (isEditMode) setIsProjectDropdownOpen(true) }}
                placeholder="ابحث عن مشروع..."
                disabled={!isEditMode}
                className={`app-input py-2 pr-10 ${!isEditMode ? 'border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed' : ''}`}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <Search className="w-5 h-5 text-neutral-400" />
              </div>
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <ChevronDown className={`w-5 h-5 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {isProjectDropdownOpen && isEditMode && (
              <div className="absolute z-[130] w-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                <button
                  type="button"
                  onClick={() => { setFormData({ ...formData, project_id: null }); setProjectSearchQuery(''); setIsProjectDropdownOpen(false) }}
                  className="w-full px-4 py-2.5 text-right text-sm hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none transition-colors text-neutral-600"
                >
                  بدون مشروع
                </button>
                {filteredProjects.length === 0 && !showCreateOption ? (
                  <div className="px-4 py-3 text-sm text-neutral-500 text-center">
                    {projectSearchQuery.trim() ? 'لا توجد نتائج' : 'لا توجد مشاريع متاحة'}
                  </div>
                ) : (
                  <>
                    {filteredProjects.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, project_id: project.id, project_name: project.name })
                          setProjectSearchQuery(project.name)
                          setIsProjectDropdownOpen(false)
                        }}
                        className="w-full px-4 py-2.5 text-right text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span>{project.name}</span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              project.status === 'active'
                                ? 'bg-green-100 text-success-800'
                                : project.status === 'inactive'
                                  ? 'bg-neutral-100 text-neutral-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {project.status === 'active' ? 'نشط' : project.status === 'inactive' ? 'متوقف' : 'مكتمل'}
                          </span>
                        </div>
                      </button>
                    ))}
                    {showCreateOption && (
                      <button
                        type="button"
                        onClick={() => { setNewProjectName(projectSearchQuery.trim()); setShowCreateProjectModal(true) }}
                        className="w-full px-4 py-2.5 text-right text-sm hover:bg-green-50 focus:bg-green-50 focus:outline-none transition-colors border-t border-neutral-200 text-success-700 font-medium"
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            إنشاء مشروع جديد: {projectSearchQuery.trim()}
                          </span>
                        </div>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* مودال إضافة مشروع جديد */}
            {showCreateProjectModal && (
              <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[60] p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                  <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-success-600" />
                    إضافة مشروع جديد
                  </h3>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      اسم المشروع <span className="text-danger-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !creatingProject) handleCreateProject() }}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="أدخل اسم المشروع"
                      autoFocus
                      disabled={creatingProject}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => { setShowCreateProjectModal(false); setNewProjectName('') }}
                      className="px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 transition"
                      disabled={creatingProject}
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateProject}
                      disabled={creatingProject || !newProjectName.trim()}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {creatingProject ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />جاري الإنشاء...</>
                      ) : (
                        <><Plus className="w-4 h-4" />إضافة</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 13. حالة عقد أجير */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">حالة عقد أجير</label>
          <select
            value={String(employeeBusinessFields.hired_worker_contract_status)}
            onChange={(e) =>
              setFormData({ ...formData, additional_fields: { ...formData.additional_fields, hired_worker_contract_status: e.target.value } })
            }
            disabled={!isEditMode || Boolean(formData.hired_worker_contract_expiry)}
            className={inputClass(!isEditMode)}
          >
            {HIRED_WORKER_CONTRACT_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        {/* 14. تاريخ الالتحاق */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            تاريخ الالتحاق
          </label>
          <input
            type="date"
            value={formData.joining_date || ''}
            onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
            disabled={!isEditMode}
            className={inputClass(!isEditMode)}
          />
        </div>

        {/* 15. تاريخ انتهاء الإقامة */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">تاريخ انتهاء الإقامة</label>
          <input
            type="date"
            value={formData.residence_expiry || ''}
            onChange={(e) => setFormData({ ...formData, residence_expiry: e.target.value })}
            disabled={!isEditMode}
            className={inputClass(!isEditMode)}
          />
        </div>

        {/* 16. تاريخ انتهاء العقد */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">تاريخ انتهاء العقد</label>
          <input
            type="date"
            value={formData.contract_expiry || ''}
            onChange={(e) => setFormData({ ...formData, contract_expiry: e.target.value })}
            disabled={!isEditMode}
            className={inputClass(!isEditMode)}
          />
        </div>

        {/* 17. تاريخ انتهاء عقد أجير */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">تاريخ انتهاء عقد أجير</label>
          <input
            type="date"
            value={formData.hired_worker_contract_expiry || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                hired_worker_contract_expiry: e.target.value,
                additional_fields: e.target.value
                  ? { ...formData.additional_fields, hired_worker_contract_status: 'أجير' }
                  : formData.additional_fields,
              })
            }
            disabled={!isEditMode}
            className={inputClass(!isEditMode)}
          />
        </div>

        {/* 18. تاريخ انتهاء التأمين الصحي */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">تاريخ انتهاء التأمين الصحي</label>
          <input
            type="date"
            value={formData.health_insurance_expiry || ''}
            onChange={(e) => setFormData({ ...formData, health_insurance_expiry: e.target.value })}
            disabled={!isEditMode}
            className={inputClass(!isEditMode)}
          />
        </div>

        {/* ملف الإقامة */}
        <div>
          {isEditMode ? (
            <ResidenceFileField
              employeeId={employee.id}
              currentPath={formData.residence_image_url || null}
              disabled={false}
              isDeleted={employee.is_deleted ?? false}
              onFilesReady={handleFilesReady}
              hasPendingFile={hasPendingResidenceFile}
            />
          ) : (
            <>
              <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                ملف الإقامة
              </label>
              {formData.residence_image_url ? (
                <ResidenceFileViewer path={formData.residence_image_url} />
              ) : (
                <p className="text-sm text-slate-400">لا يوجد ملف إقامة</p>
              )}
            </>
          )}
        </div>

        {/* الملاحظات */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            الملاحظات
          </label>
          {isEditMode ? (
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="app-input min-h-[100px] resize-none"
              placeholder="أدخل أي ملاحظات إضافية عن الموظف..."
            />
          ) : (
            <div className="w-full px-4 py-2 border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-700 min-h-[100px] whitespace-pre-wrap">
              {formData.notes || 'لا توجد ملاحظات'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
