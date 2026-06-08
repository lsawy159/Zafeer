import { createPortal } from 'react-dom'
import { EmployeeWithRelations } from '@/lib/supabase'
import { validateResidenceFile } from '@/lib/residenceFile'
import {
  X, UserPlus, AlertCircle, CheckCircle, Users, Search, ChevronDown,
  FolderKanban, Plus, Loader2, Upload, FileText,
} from 'lucide-react'
import { HIRED_WORKER_CONTRACT_STATUS_OPTIONS } from '@/utils/employeeBusinessFields'
import { useAddEmployeeForm } from './AddEmployeeModal/useAddEmployeeForm'

interface AddEmployeeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (createdEmployee?: EmployeeWithRelations) => void
  initialData?: Partial<{
    name: string; profession: string; nationality: string; birth_date: string
    phone: string; passport_number: string; residence_number: string | number
    joining_date: string; contract_expiry: string; hired_worker_contract_expiry: string
    residence_expiry: string; project_id: string; project_name: string
    bank_account: string; bank_name: string; salary: string | number
    health_insurance_expiry: string; residence_image_url: string; notes: string
    company_id: string; hired_worker_contract_status: string
  }>
}

export default function AddEmployeeModal(props: AddEmployeeModalProps) {
  const {
    formData, loading, companies,
    companySearchQuery, setCompanySearchQuery, isCompanyDropdownOpen, setIsCompanyDropdownOpen,
    projectSearchQuery, setProjectSearchQuery, isProjectDropdownOpen, setIsProjectDropdownOpen,
    showCreateProjectModal, setShowCreateProjectModal, newProjectName, setNewProjectName,
    creatingProject, pendingFile, setPendingFile, pendingFileError, setPendingFileError,
    residenceFileInputRef, companyDropdownRef, projectDropdownRef,
    filteredCompanies, filteredProjects, showCreateOption,
    getAvailableSlotsColor, getAvailableSlotsText,
    handleChange, handleSubmit, handleOverlayClick, handleCreateProject,
    selectCompany, selectProject, clearProject,
  } = useAddEmployeeForm(props)

  if (!props.isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[120] bg-slate-950/55 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div className="app-modal-surface max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="app-modal-header flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-2">
              <UserPlus className="h-6 w-6 text-slate-900" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900">إضافة موظف جديد</h2>
          </div>
          <button onClick={props.onClose} className="p-2 hover:bg-neutral-100 rounded-lg transition" disabled={loading}>
            <X className="w-6 h-6 text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">الاسم <span className="text-danger-500">*</span></label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="app-input py-2.5" placeholder="أدخل اسم الموظف" required disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">مهنة الإقامة</label>
              <input type="text" name="profession" value={formData.profession} onChange={handleChange} className="app-input py-2.5" placeholder="أدخل المهنة" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">الجنسية</label>
              <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} className="app-input py-2.5" placeholder="أدخل الجنسية" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">رقم الإقامة <span className="text-danger-500">*</span></label>
              <input type="text" name="residence_number" value={formData.residence_number} onChange={handleChange} className="app-input py-2.5 font-mono" placeholder="أدخل رقم الإقامة" required disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">رقم جواز السفر</label>
              <input type="text" name="passport_number" value={formData.passport_number} onChange={handleChange} className="app-input py-2.5 font-mono" placeholder="أدخل رقم جواز السفر" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">رقم الهاتف</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="app-input py-2.5 font-mono" placeholder="05xxxxxxxx" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">الحساب البنكي</label>
              <input type="text" name="bank_account" value={formData.bank_account} onChange={handleChange} className="app-input py-2.5 font-mono" placeholder="أدخل رقم الحساب البنكي" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">اسم البنك</label>
              <input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange} className="app-input py-2.5" placeholder="أدخل اسم البنك" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">الراتب</label>
              <input type="number" name="salary" value={formData.salary} onChange={handleChange} className="app-input py-2.5" placeholder="أدخل الراتب" min="0" step="0.01" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">حالة عقد أجير</label>
              <select name="hired_worker_contract_status" value={formData.hired_worker_contract_status} onChange={handleChange} className="app-input py-2.5" disabled={loading || Boolean(formData.hired_worker_contract_expiry)}>
                {HIRED_WORKER_CONTRACT_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            {/* المشروع */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                <FolderKanban className="w-4 h-4" />المشروع
              </label>
              <div className="relative" ref={projectDropdownRef}>
                <div className="relative">
                  <input type="text" value={projectSearchQuery}
                    onChange={(e) => { setProjectSearchQuery(e.target.value); setIsProjectDropdownOpen(true) }}
                    onFocus={() => setIsProjectDropdownOpen(true)}
                    placeholder="ابحث عن مشروع..." disabled={loading} className="app-input bg-white pr-10" />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none"><Search className="w-5 h-5 text-neutral-400" /></div>
                  <button type="button" onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600" disabled={loading}>
                    <ChevronDown className={`w-5 h-5 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {isProjectDropdownOpen && (
                  <div className="absolute z-[130] w-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                    <button type="button" onClick={clearProject} className="w-full px-4 py-2.5 text-right text-sm hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none transition-colors text-neutral-600">بدون مشروع</button>
                    {filteredProjects.length === 0 && !showCreateOption ? (
                      <div className="px-4 py-3 text-sm text-neutral-500 text-center">{projectSearchQuery.trim() ? 'لا توجد نتائج' : 'لا توجد مشاريع متاحة'}</div>
                    ) : (
                      <>
                        {filteredProjects.map((project) => (
                          <button key={project.id} type="button" onClick={() => selectProject(project)} className="w-full px-4 py-2.5 text-right text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors">
                            <div className="flex items-center justify-between">
                              <span>{project.name}</span>
                              <span className={`text-xs px-2 py-1 rounded-full ${project.status === 'active' ? 'bg-green-100 text-success-800' : project.status === 'inactive' ? 'bg-neutral-100 text-neutral-800' : 'bg-blue-100 text-blue-800'}`}>
                                {project.status === 'active' ? 'نشط' : project.status === 'inactive' ? 'متوقف' : 'مكتمل'}
                              </span>
                            </div>
                          </button>
                        ))}
                        {showCreateOption && (
                          <button type="button" onClick={() => { setNewProjectName(projectSearchQuery.trim()); setShowCreateProjectModal(true) }} className="w-full px-4 py-2.5 text-right text-sm hover:bg-green-50 focus:bg-green-50 focus:outline-none transition-colors border-t border-neutral-200 text-success-700 font-medium">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-2"><Plus className="w-4 h-4" />إنشاء مشروع جديد: {projectSearchQuery.trim()}</span>
                            </div>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              <input type="hidden" name="project_id" value={formData.project_id} />
            </div>

            {/* مودال إضافة مشروع جديد */}
            {showCreateProjectModal && (
              <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[120] p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                  <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-success-600" />إضافة مشروع جديد</h3>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">اسم المشروع <span className="text-danger-500">*</span></label>
                    <input type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !creatingProject) handleCreateProject() }}
                      className="app-input" placeholder="أدخل اسم المشروع" autoFocus disabled={creatingProject} />
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <button type="button" onClick={() => { setShowCreateProjectModal(false); setNewProjectName('') }} className="app-button-secondary" disabled={creatingProject}>إلغاء</button>
                    <button type="button" onClick={handleCreateProject} disabled={creatingProject || !newProjectName.trim()} className="app-button-success">
                      {creatingProject ? (<><Loader2 className="w-4 h-4 animate-spin" />جاري الإنشاء...</>) : (<><Plus className="w-4 h-4" />إضافة</>)}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* الشركة أو المؤسسة */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">الشركة أو المؤسسة <span className="text-danger-500">*</span></label>
              <div className="relative" ref={companyDropdownRef}>
                <div className="relative">
                  <input type="text" value={companySearchQuery}
                    onChange={(e) => { setCompanySearchQuery(e.target.value); setIsCompanyDropdownOpen(true) }}
                    onFocus={() => setIsCompanyDropdownOpen(true)}
                    placeholder="ابحث بالاسم أو الرقم الموحد..." className="app-input bg-white pr-10" disabled={loading} />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none"><Search className="w-5 h-5 text-neutral-400" /></div>
                  <button type="button" onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600" disabled={loading}>
                    <ChevronDown className={`w-5 h-5 transition-transform ${isCompanyDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {isCompanyDropdownOpen && (
                  <div className="absolute z-[130] w-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredCompanies.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-neutral-500 text-center">{companySearchQuery.trim() ? 'لا توجد نتائج' : 'لا توجد مؤسسات متاحة'}</div>
                    ) : (
                      filteredCompanies.map((company) => (
                        <button key={company.id} type="button" onClick={() => selectCompany(company)} className="w-full px-4 py-2.5 text-right text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors">
                          {company.name} - {company.unified_number} - ({company.employee_count}/{company.max_employees})
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <input type="hidden" name="company_id" value={formData.company_id} required />
              {formData.company_id && (() => {
                const selectedCompany = companies.find((c) => c.id === formData.company_id)
                if (!selectedCompany) return null
                return (
                  <div className="mt-3 p-3 rounded-lg border border-neutral-200 bg-neutral-50">
                    <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4" /><span className="text-sm font-medium text-neutral-700">معلومات المؤسسة</span></div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-neutral-600">العدد الحالي:</span><span className="font-medium">{selectedCompany.employee_count} موظف</span></div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* حقول التواريخ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">تاريخ الميلاد</label>
              <input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} className="app-input py-2.5" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">تاريخ الالتحاق</label>
              <input type="date" name="joining_date" value={formData.joining_date} onChange={handleChange} className="app-input py-2.5" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">تاريخ انتهاء الإقامة</label>
              <input type="date" name="residence_expiry" value={formData.residence_expiry} onChange={handleChange} className="app-input py-2.5" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">تاريخ انتهاء العقد</label>
              <input type="date" name="contract_expiry" value={formData.contract_expiry} onChange={handleChange} className="app-input py-2.5" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">تاريخ انتهاء عقد أجير</label>
              <input type="date" name="hired_worker_contract_expiry" value={formData.hired_worker_contract_expiry} onChange={handleChange} className="app-input py-2.5" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">تاريخ انتهاء التأمين الصحي</label>
              <input type="date" name="health_insurance_expiry" value={formData.health_insurance_expiry} onChange={handleChange} className="app-input py-2.5" disabled={loading} />
            </div>
          </div>

          {/* ملف الإقامة */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />ملف الإقامة (اختياري — يُرفع بعد حفظ الموظف)
            </label>
            <input ref={residenceFileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" disabled={loading}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                setPendingFileError(null)
                if (!file) { setPendingFile(null); return }
                const result = validateResidenceFile(file)
                if (!result.ok) { setPendingFileError(result.messageAr); e.target.value = ''; return }
                setPendingFile(file)
              }} />
            <button type="button" onClick={() => residenceFileInputRef.current?.click()} disabled={loading} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors">
              <Upload className="w-4 h-4" />{pendingFile ? pendingFile.name : 'اختر ملف الإقامة'}
            </button>
            {pendingFileError && <p className="mt-1.5 text-xs text-red-600">{pendingFileError}</p>}
            {pendingFile && <p className="mt-1 text-xs text-slate-500">سيُرفع الملف تلقائياً بعد إنشاء الموظف</p>}
          </div>

          {/* الملاحظات */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-neutral-700 mb-2">الملاحظات</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={4} className="app-input min-h-[110px] resize-none py-2.5" placeholder="أدخل أي ملاحظات إضافية عن الموظف..." disabled={loading} />
          </div>

          {/* Footer */}
          <div className="app-modal-footer mt-8 flex items-center gap-4 border-t border-neutral-200 pt-6">
            <button type="submit" disabled={loading} className="app-button-primary flex-1 justify-center px-6 py-3">
              {loading ? (<><Loader2 className="h-5 w-5 animate-spin" />جاري الإضافة...</>) : (<><UserPlus className="w-5 h-5" />إضافة الموظف</>)}
            </button>
            <button type="button" onClick={props.onClose} disabled={loading} className="app-button-secondary flex-1 justify-center px-6 py-3">إلغاء</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
