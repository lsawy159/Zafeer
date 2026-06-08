import { useState, useEffect, useRef } from 'react'
import { useModalScrollLock } from '@/hooks/useModalScrollLock'
import { supabase, Company, Project, Employee, EmployeeWithRelations } from '@/lib/supabase'
import { useUploadResidenceFile } from '@/hooks/useResidenceFile'
import { toast } from 'sonner'
import { parseDate, normalizeDate } from '@/utils/dateParser'
import {
  buildEmployeeBusinessAdditionalFields,
  getEmployeeBusinessFields,
} from '@/utils/employeeBusinessFields'

interface AddEmployeeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (createdEmployee?: EmployeeWithRelations) => void
  initialData?: Partial<{
    name: string
    profession: string
    nationality: string
    birth_date: string
    phone: string
    passport_number: string
    residence_number: string | number
    joining_date: string
    contract_expiry: string
    hired_worker_contract_expiry: string
    residence_expiry: string
    project_id: string
    project_name: string
    bank_account: string
    bank_name: string
    salary: string | number
    health_insurance_expiry: string
    residence_image_url: string
    notes: string
    company_id: string
    hired_worker_contract_status: string
  }>
}

export interface CompanyWithStats extends Company {
  employee_count: number
  available_slots: number
}

const createDefaultFormData = () => ({
  name: '',
  profession: '',
  nationality: '',
  birth_date: '',
  phone: '',
  passport_number: '',
  residence_number: '',
  joining_date: '',
  contract_expiry: '',
  hired_worker_contract_expiry: '',
  residence_expiry: '',
  project_id: '',
  project_name: '',
  bank_account: '',
  bank_name: '',
  salary: '',
  health_insurance_expiry: '',
  residence_image_url: '',
  notes: '',
  company_id: '',
  hired_worker_contract_status: 'بدون أجير',
})

const buildInitialFormData = (initialData?: AddEmployeeModalProps['initialData']) => {
  const defaults = createDefaultFormData()
  if (!initialData) return defaults
  return {
    ...defaults,
    ...initialData,
    residence_number:
      initialData.residence_number !== undefined
        ? String(initialData.residence_number)
        : defaults.residence_number,
    salary: initialData.salary !== undefined ? String(initialData.salary) : defaults.salary,
    hired_worker_contract_status:
      initialData.hired_worker_contract_status || defaults.hired_worker_contract_status,
  }
}

export function useAddEmployeeForm({ isOpen, onClose, onSuccess, initialData }: AddEmployeeModalProps) {
  const [companies, setCompanies] = useState<CompanyWithStats[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [companySearchQuery, setCompanySearchQuery] = useState('')
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false)
  const [projectSearchQuery, setProjectSearchQuery] = useState('')
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false)
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [creatingProject, setCreatingProject] = useState(false)
  const [formData, setFormData] = useState(buildInitialFormData(initialData))
  const [isDirty, setIsDirty] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingFileError, setPendingFileError] = useState<string | null>(null)

  const residenceFileInputRef = useRef<HTMLInputElement>(null)
  const companyDropdownRef = useRef<HTMLDivElement>(null)
  const projectDropdownRef = useRef<HTMLDivElement>(null)
  const uploadResidenceFile = useUploadResidenceFile()

  const loadCompanies = async () => {
    try {
      const { data: companiesData, error } = await supabase
        .from('companies')
        .select(
          'id,name,unified_number,labor_subscription_number,commercial_registration_expiry,social_insurance_number,commercial_registration_status,additional_fields,ending_subscription_power_date,ending_subscription_moqeem_date,employee_count,max_employees,notes,exemptions,company_type,created_at,updated_at'
        )
        .order('name')
      if (error) throw error

      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('company_id')
      if (employeesError) throw employeesError

      const employeeCounts: Record<string, number> = {}
      employeesData?.forEach((emp) => {
        if (emp.company_id) {
          employeeCounts[emp.company_id] = (employeeCounts[emp.company_id] || 0) + 1
        }
      })

      const companiesWithStats = (companiesData || []).map((company) => {
        const employeeCount = employeeCounts[company.id] || 0
        const maxEmployees = company.max_employees || 4
        const availableSlots = Math.max(0, maxEmployees - employeeCount)
        return { ...company, employee_count: employeeCount, available_slots: availableSlots }
      })

      setCompanies(companiesWithStats)
    } catch (error) {
      console.error('Error loading companies:', error)
      toast.error('فشل تحميل قائمة المؤسسات')
    }
  }

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id,name,description,status,created_at,updated_at')
        .eq('status', 'active')
        .eq('is_deleted', false)
        .order('name')
      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
      toast.error('فشل تحميل قائمة المشاريع')
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      loadCompanies()
      loadProjects()
      setFormData(buildInitialFormData(initialData))
      setIsDirty(false)
    } else {
      setFormData(createDefaultFormData())
      setIsDirty(false)
      setCompanySearchQuery('')
      setIsCompanyDropdownOpen(false)
      setProjectSearchQuery('')
      setIsProjectDropdownOpen(false)
      setShowCreateProjectModal(false)
      setNewProjectName('')
    }
  }, [isOpen, initialData])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        if (showCreateProjectModal) {
          setShowCreateProjectModal(false)
          setNewProjectName('')
          return
        }
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, showCreateProjectModal])

  useModalScrollLock(isOpen)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (formData.company_id && companies.length > 0) {
      const selectedCompany = companies.find((c) => c.id === formData.company_id)
      if (selectedCompany) {
        const displayText = `${selectedCompany.name} - ${selectedCompany.unified_number} - (${selectedCompany.employee_count}/${selectedCompany.max_employees})`
        if (companySearchQuery !== displayText) {
          setCompanySearchQuery(displayText)
        }
      }
    } else if (!formData.company_id && companySearchQuery) {
      setCompanySearchQuery('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.company_id])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target as Node)) {
        setIsCompanyDropdownOpen(false)
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (formData.project_id && projects.length > 0) {
      const selectedProject = projects.find((p) => p.id === formData.project_id)
      if (selectedProject) {
        const displayText = selectedProject.name
        if (projectSearchQuery !== displayText) {
          setProjectSearchQuery(displayText)
        }
      }
    } else if (!formData.project_id && projectSearchQuery) {
      setProjectSearchQuery('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.project_id, projects])
  /* eslint-enable react-hooks/set-state-in-effect */

  const getAvailableSlotsColor = (availableSlots: number) => {
    if (availableSlots === 0) return 'text-red-600 bg-red-50'
    if (availableSlots === 1) return 'text-warning-600 bg-orange-50'
    return 'text-success-600 bg-green-50'
  }

  const getAvailableSlotsText = (availableSlots: number) => {
    if (availableSlots === 0) return 'مكتملة'
    if (availableSlots === 1) return 'مكان واحد متبقي'
    return `${availableSlots} مكان متبقي`
  }

  const filteredCompanies = companies.filter((company) => {
    if (company.available_slots === 0) return false
    if (companySearchQuery.trim()) {
      const query = companySearchQuery.toLowerCase().trim()
      return company.name?.toLowerCase().includes(query) || company.unified_number?.toString().includes(query)
    }
    return true
  })

  const filteredProjects = projects.filter((project) => {
    if (projectSearchQuery.trim()) {
      return project.name?.toLowerCase().includes(projectSearchQuery.toLowerCase().trim())
    }
    return true
  })

  const hasExactMatch =
    projectSearchQuery.trim() &&
    projects.some((p) => p.name.toLowerCase() === projectSearchQuery.toLowerCase().trim())

  const showCreateOption = projectSearchQuery.trim() && !hasExactMatch && isProjectDropdownOpen

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('يرجى إدخال اسم المشروع')
      return
    }
    const existingProject = projects.find(
      (p) => p.name.toLowerCase() === newProjectName.trim().toLowerCase()
    )
    if (existingProject) {
      toast.error('يوجد مشروع بنفس الاسم بالفعل')
      setFormData({ ...formData, project_id: existingProject.id, project_name: existingProject.name })
      setProjectSearchQuery(existingProject.name)
      setShowCreateProjectModal(false)
      setNewProjectName('')
      setIsProjectDropdownOpen(false)
      return
    }
    setCreatingProject(true)
    try {
      const { data: newProject, error } = await supabase
        .from('projects')
        .insert({ name: newProjectName.trim(), status: 'active' })
        .select()
        .single()
      if (error) {
        if (error.code === '23505') {
          toast.error('يوجد مشروع بنفس الاسم بالفعل')
        } else {
          throw error
        }
        return
      }
      await loadProjects()
      setFormData({ ...formData, project_id: newProject.id, project_name: newProject.name })
      setProjectSearchQuery(newProject.name)
      setShowCreateProjectModal(false)
      setNewProjectName('')
      setIsProjectDropdownOpen(false)
      toast.success('تم إنشاء المشروع بنجاح')
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error(error instanceof Error ? error.message : 'فشل إنشاء المشروع')
    } finally {
      setCreatingProject(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => {
      if (name === 'hired_worker_contract_expiry' && value.trim()) {
        return { ...prev, [name]: value, hired_worker_contract_status: 'أجير' }
      }
      return { ...prev, [name]: value }
    })
    setIsDirty(true)
  }

  const validateForm = (): boolean => {
    const normalizedHiredWorkerContractExpiry = normalizeDate(formData.hired_worker_contract_expiry)
    const hiredWorkerStatus = getEmployeeBusinessFields({
      additional_fields: { hired_worker_contract_status: formData.hired_worker_contract_status },
      hired_worker_contract_expiry: normalizedHiredWorkerContractExpiry,
    }).hired_worker_contract_status

    if (!formData.name.trim()) { toast.error('الرجاء إدخال اسم الموظف'); return false }
    if (!formData.residence_number.trim()) { toast.error('الرجاء إدخال رقم الإقامة'); return false }
    if (!formData.company_id) { toast.error('الرجاء اختيار المؤسسة'); return false }

    const selectedCompany = companies.find((c) => c.id === formData.company_id)
    if (selectedCompany?.available_slots === 0) {
      toast.error(`لا يمكن إضافة موظف جديد. المؤسسة "${selectedCompany.name}" مكتملة (${selectedCompany.employee_count}/${selectedCompany.max_employees} موظف)`)
      return false
    }

    const dateChecks = [
      { val: formData.birth_date, msg: 'تاريخ الميلاد غير صحيح' },
      { val: formData.joining_date, msg: 'تاريخ الالتحاق غير صحيح' },
      { val: formData.residence_expiry, msg: 'تاريخ انتهاء الإقامة غير صحيح' },
      { val: formData.contract_expiry, msg: 'تاريخ انتهاء العقد غير صحيح' },
      { val: formData.hired_worker_contract_expiry, msg: 'تاريخ انتهاء عقد أجير غير صحيح' },
    ]
    for (const { val, msg } of dateChecks) {
      if (val) {
        const result = parseDate(val)
        if (!result.date) { toast.error(result.error || msg); return false }
      }
    }

    if (hiredWorkerStatus === 'أجير' && !normalizedHiredWorkerContractExpiry) {
      toast.error('عند اختيار حالة عقد أجير = أجير يجب إدخال تاريخ انتهاء عقد أجير')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    try {
      const employeeData: Partial<Employee> & { project_name?: string | null } = {
        name: formData.name.trim(),
        profession: formData.profession.trim(),
        nationality: formData.nationality.trim(),
        birth_date: normalizeDate(formData.birth_date) ?? undefined,
        phone: formData.phone.trim() || undefined,
        passport_number: formData.passport_number.trim(),
        residence_number: Number(formData.residence_number.trim()) || 0,
        joining_date: normalizeDate(formData.joining_date) ?? undefined,
        contract_expiry: normalizeDate(formData.contract_expiry) ?? undefined,
        hired_worker_contract_expiry: normalizeDate(formData.hired_worker_contract_expiry) ?? undefined,
        residence_expiry: normalizeDate(formData.residence_expiry) ?? undefined,
        bank_account: formData.bank_account.trim() || undefined,
        salary: Number(formData.salary) || 0,
        health_insurance_expiry: normalizeDate(formData.health_insurance_expiry) ?? undefined,
        notes: formData.notes.trim() || undefined,
        company_id: formData.company_id,
        additional_fields: buildEmployeeBusinessAdditionalFields(undefined, {
          bank_name: formData.bank_name,
          hired_worker_contract_status: formData.hired_worker_contract_status,
          hired_worker_contract_expiry: formData.hired_worker_contract_expiry,
        }),
      }

      if (formData.project_id) {
        employeeData.project_id = formData.project_id
        const selectedProject = projects.find((p) => p.id === formData.project_id)
        if (selectedProject) employeeData.project_name = selectedProject.name
      } else {
        employeeData.project_name = formData.project_name.trim() || undefined
      }

      const residenceNumberStr = employeeData.residence_number?.toString().trim()
      if (residenceNumberStr) {
        const { data: existingEmployee } = await supabase
          .from('employees')
          .select('id, name, residence_number')
          .eq('residence_number', residenceNumberStr)
          .eq('is_deleted', false)
          .single()
        if (existingEmployee) {
          toast.error(`رقم الإقامة ${residenceNumberStr} موجود بالفعل للموظف: ${existingEmployee.name}`)
          setLoading(false)
          return
        }
      }

      const { data: insertedEmployee, error } = await supabase
        .from('employees')
        .insert([employeeData])
        .select(
          'id,company_id,name,profession,nationality,birth_date,phone,passport_number,residence_number,joining_date,contract_expiry,hired_worker_contract_expiry,residence_expiry,project_id,project_name,bank_account,residence_image_url,health_insurance_expiry,salary,notes,additional_fields,is_deleted,deleted_at,created_at,updated_at, company:companies(id,name,unified_number,labor_subscription_number,commercial_registration_expiry,social_insurance_number,commercial_registration_status,additional_fields,ending_subscription_power_date,ending_subscription_moqeem_date,employee_count,max_employees,notes,exemptions,company_type,created_at,updated_at), project:projects(id,name,description,status,created_at,updated_at)'
        )
        .single()

      if (error) {
        if (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate')) {
          toast.error(`رقم الإقامة ${residenceNumberStr} موجود بالفعل في النظام`)
          setLoading(false)
          return
        }
        throw error
      }

      if (pendingFile && insertedEmployee?.id) {
        try {
          await uploadResidenceFile.mutateAsync({ employeeId: insertedEmployee.id, file: pendingFile })
        } catch { /* خطأ الرفع يُعرض عبر toast في الـ hook */ }
      }

      toast.success('تم إضافة الموظف بنجاح')
      setFormData(createDefaultFormData())
      setPendingFile(null)
      setPendingFileError(null)
      setProjectSearchQuery('')
      setIsProjectDropdownOpen(false)

      onSuccess(insertedEmployee as unknown as EmployeeWithRelations | undefined)
      onClose()
    } catch (error) {
      console.error('Error adding employee:', error)
      toast.error(error instanceof Error ? error.message : 'فشل إضافة الموظف')
    } finally {
      setLoading(false)
    }
  }

  const handleOverlayClick = () => {
    if (isDirty) {
      if (window.confirm('لديك تغييرات غير محفوظة. هل تريد الخروج بدون حفظ؟')) onClose()
    } else {
      onClose()
    }
  }

  const selectCompany = (company: CompanyWithStats) => {
    setFormData((prev) => ({ ...prev, company_id: company.id }))
    setCompanySearchQuery(`${company.name} - ${company.unified_number} - (${company.employee_count}/${company.max_employees})`)
    setIsCompanyDropdownOpen(false)
  }

  const selectProject = (project: Project) => {
    setFormData((prev) => ({ ...prev, project_id: project.id, project_name: project.name }))
    setProjectSearchQuery(project.name)
    setIsProjectDropdownOpen(false)
  }

  const clearProject = () => {
    setFormData((prev) => ({ ...prev, project_id: '' }))
    setProjectSearchQuery('')
    setIsProjectDropdownOpen(false)
  }

  return {
    // state
    formData, isDirty, loading, companies, projects,
    companySearchQuery, setCompanySearchQuery,
    isCompanyDropdownOpen, setIsCompanyDropdownOpen,
    projectSearchQuery, setProjectSearchQuery,
    isProjectDropdownOpen, setIsProjectDropdownOpen,
    showCreateProjectModal, setShowCreateProjectModal,
    newProjectName, setNewProjectName,
    creatingProject,
    pendingFile, setPendingFile,
    pendingFileError, setPendingFileError,
    uploadResidenceFile,
    // refs
    residenceFileInputRef, companyDropdownRef, projectDropdownRef,
    // computed
    filteredCompanies, filteredProjects, hasExactMatch, showCreateOption,
    // helpers
    getAvailableSlotsColor, getAvailableSlotsText,
    // handlers
    handleChange, handleSubmit, handleOverlayClick, handleCreateProject,
    selectCompany, selectProject, clearProject,
  }
}
