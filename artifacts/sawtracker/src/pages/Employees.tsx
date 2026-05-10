import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useModalScrollLock } from '@/hooks/useModalScrollLock'
import { supabase, Employee, Company, Project, EmployeeWithRelations } from '@/lib/supabase'
import Layout from '@/components/layout/Layout'
import EmployeeCard from '@/components/employees/EmployeeCard'
import AddEmployeeModal from '@/components/employees/AddEmployeeModal'
import {
  Calendar,
  AlertCircle,
  UserPlus,
  CheckSquare,
  Square,
  Trash2,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  Table,
  Shield,
} from 'lucide-react'
import CascadeDeleteModal, { type ObligationHeaderInfo } from '@/components/employees/CascadeDeleteModal'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { type PostgrestError } from '@supabase/supabase-js'
import { usePermissions } from '@/utils/permissions'
import { logger } from '@/utils/logger'
import {
  getEmployeeNotificationThresholdsPublic,
  type EmployeeNotificationThresholds,
} from '@/utils/employeeAlerts'
import { useIsMobileView } from '@/hooks/useIsMobileView'
import { useCardColumns } from '@/hooks/useUiPreferences'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterBar } from '@/components/ui/FilterBar'
import { SearchInput } from '@/components/ui/SearchInput'
import { Button } from '@/components/ui/Button'
import { EmployeesFiltersModal } from './employees/EmployeesFiltersModal'
import { EmployeeGridCard } from './employees/EmployeeGridCard'
import { EmployeeListRow } from './employees/EmployeeListRow'
import { EmployeeDeleteConfirmModal } from './employees/EmployeeDeleteConfirmModal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import {
  COLOR_THRESHOLD_FALLBACK,
  getStatusForField,
  hasAlert,
  getFieldLabel,
} from './employees/employeeUtils'
import { BulkDeleteModal } from './employees/BulkDeleteModal'
import { BulkDateModal } from './employees/BulkDateModal'

export default function Employees() {
  const { canView, canCreate, canEdit, canDelete } = usePermissions()
  const location = useLocation()
  const navigate = useNavigate()
  const [employees, setEmployees] = useState<
    (Employee & { company: Company; project?: Project })[]
  >([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [residenceNumberSearch, setResidenceNumberSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState<string>('')
  const [nationalityFilter, setNationalityFilter] = useState<string>('')
  const [professionFilter, setProfessionFilter] = useState<string>('')
  const [projectFilter, setProjectFilter] = useState<string>('')
  const [contractFilter, setContractFilter] = useState<string>('')
  const [hiredWorkerContractFilter, setHiredWorkerContractFilter] = useState<string>('')
  const [residenceFilter, setResidenceFilter] = useState<string>('')
  const [healthInsuranceFilter, setHealthInsuranceFilter] = useState<string>('') // تحديث: insuranceFilter → healthInsuranceFilter
  const [showAlertsOnly, setShowAlertsOnly] = useState(false)

  const [companiesWithIds, setCompaniesWithIds] = useState<
    Array<{ id: string; name: string; unified_number?: number }>
  >([])
  const [companySearchQuery, setCompanySearchQuery] = useState('')
  const [isCompanyDropdownOpen, setCompanyDropdownOpen] = useState(false)
  const [nationalities, setNationalities] = useState<string[]>([])
  const [professions, setProfessions] = useState<string[]>([])
  const [projects, setProjects] = useState<string[]>([])
  const [colorThresholds, setColorThresholds] = useState<EmployeeNotificationThresholds | null>(
    null
  )

  // حالة المودال
  const [selectedEmployee, setSelectedEmployee] = useState<
    (Employee & { company: Company; project?: Project }) | null
  >(null)
  const [isCardOpen, setIsCardOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // حالة التنقل بالسهام
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)
  const rowRefs = useRef<(HTMLElement | null)[]>([])

  // حالة نوع العرض
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid')
  const isMobileView = useIsMobileView()
  const { gridClass: employeeGridClass } = useCardColumns()


  // حالة التعديل السريع - تم إزالتها

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<
    (Employee & { company: Company }) | null
  >(null)

  // Cascade delete modal states
  const [showCascadeDeleteModal, setShowCascadeDeleteModal] = useState(false)
  const [cascadeObligations, setCascadeObligations] = useState<ObligationHeaderInfo[]>([])
  const [cascadeEmployeeIds, setCascadeEmployeeIds] = useState<string[]>([])
  const [cascadeIsBulk, setCascadeIsBulk] = useState(false)
  const [cascadeDeleting, setCascadeDeleting] = useState(false)

  // Bulk selection states
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set())

  // Bulk action modals
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [deletingEmployees, setDeletingEmployees] = useState(false)

  const [showBulkResidenceModal, setShowBulkResidenceModal] = useState(false)
  const [showBulkInsuranceModal, setShowBulkInsuranceModal] = useState(false)
  const [showBulkContractModal, setShowBulkContractModal] = useState(false)

  // Filter modal and sort states
  const [showFiltersModal, setShowFiltersModal] = useState(false)
  const [showSortDropdown, setShowSortDropdown] = useState(false)

  // قفل التمرير عند فتح أي مودال
  useModalScrollLock(
    showDeleteModal ||
    showCascadeDeleteModal ||
    showBulkDeleteModal ||
    showBulkResidenceModal ||
    showBulkInsuranceModal ||
    showBulkContractModal ||
    showFiltersModal
  )
  const companyDropdownRef = useRef<HTMLDivElement>(null)
  const loadEmployeesRef = useRef<(() => Promise<void>) | undefined>(undefined)

  // التحقق من صلاحية العرض
  const hasViewPermission = canView('employees')

  // Sort states
  const [sortField, setSortField] = useState<
    | 'name'
    | 'profession'
    | 'nationality'
    | 'company'
    | 'project'
    | 'contract_expiry'
    | 'hired_worker_contract_expiry'
    | 'residence_expiry'
    | 'health_insurance_expiry'
  >('name') // تحديث: إضافة عقد أجير + المشروع + ending_subscription_insurance_date → health_insurance_expiry
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('employees')
        .select(
          'id,company_id,name,profession,nationality,birth_date,phone,passport_number,residence_number,joining_date,contract_expiry,hired_worker_contract_expiry,residence_expiry,project_id,project_name,bank_account,residence_image_url,health_insurance_expiry,salary,notes,additional_fields,is_deleted,deleted_at,created_at,updated_at, company:companies(id,name,unified_number,labor_subscription_number,commercial_registration_expiry,social_insurance_number,commercial_registration_status,additional_fields,ending_subscription_power_date,ending_subscription_moqeem_date,employee_count,max_employees,notes,exemptions,company_type,created_at,updated_at), project:projects(id,name,description,status,created_at,updated_at)'
        )
        .order('name')

      if (error) throw error

      const employeesData = (data || []) as unknown as EmployeeWithRelations[]
      setEmployees(employeesData as unknown as (Employee & { company: Company; project?: Project })[])

      // استخراج القوائم الفريدة للفلاتر
      // Reserved for future use: uniqueCompanies
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const uniqueCompanies = [
        ...new Set(employeesData.map((e) => e.company?.name).filter(Boolean)),
      ] as string[]
      const uniqueNationalities = [
        ...new Set(employeesData.map((e) => e.nationality).filter(Boolean)),
      ] as string[]
      const uniqueProfessions = [
        ...new Set(employeesData.map((e) => e.profession).filter(Boolean)),
      ] as string[]

      // بناء قائمة المؤسسات مع IDs و unified_number
      const companiesMap = new Map<string, { name: string; unified_number?: number }>()
      employeesData.forEach((emp) => {
        if (emp.company?.id && emp.company?.name) {
          if (!companiesMap.has(emp.company.id)) {
            companiesMap.set(emp.company.id, {
              name: emp.company.name,
              unified_number: emp.company.unified_number,
            })
          }
        }
      })
      const companiesWithIdsList = Array.from(companiesMap.entries()).map(([id, data]) => ({
        id,
        name: data.name,
        unified_number: data.unified_number,
      }))
      setCompaniesWithIds(companiesWithIdsList.sort((a, b) => a.name.localeCompare(b.name)))

      // تحميل المشاريع من جدول projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name')
        .order('name')

      if (!projectsError && projectsData) {
        const projectNames = projectsData.map((p) => p.name).filter(Boolean)
        setProjects(projectNames.sort())
      } else {
        // Fallback: استخراج من project_name القديم إذا فشل تحميل المشاريع
        const uniqueProjects = [
          ...new Set(employeesData.map((e) => e.project?.name || e.project_name).filter(Boolean)),
        ] as string[]
        setProjects(uniqueProjects.sort())
      }

      // Companies list is no longer stored in state, only used for filtering
      setNationalities(uniqueNationalities.sort())
      setProfessions(uniqueProfessions.sort())
    } catch (error) {
      logger.error('Error loading employees:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // حفظ loadEmployees في ref
  useEffect(() => {
    loadEmployeesRef.current = loadEmployees
  }, [loadEmployees])

  // تحميل إعدادات الألوان مع الاستماع لتحديثات الإعدادات
  useEffect(() => {
    let isMounted = true

    const loadThresholds = async () => {
      try {
        const thresholds = await getEmployeeNotificationThresholdsPublic()
        if (isMounted) {
          setColorThresholds(thresholds)
        }
      } catch (error) {
        logger.error('Error loading color thresholds:', error)
      }
    }

    loadThresholds()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (hasViewPermission) {
      loadEmployees()
      handleUrlParams()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadEmployees, hasViewPermission])


  // Handle company filter from URL after companies are loaded
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const companyId = params.get('company')
    if (companyId && companiesWithIds.length > 0) {
      const company = companiesWithIds.find((c) => c.id === companyId)
      if (company && companyFilter !== company.name) {
        setCompanyFilter(company.name)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companiesWithIds, location.search])

  // Deep-link: ?open=EMPLOYEE_ID → open employee card directly
  const openEmployeeHandledRef = useRef(false)
  useEffect(() => {
    if (openEmployeeHandledRef.current || loading || employees.length === 0) return
    const openId = new URLSearchParams(location.search).get('open')
    if (!openId) return
    const emp = employees.find((e) => e.id === openId)
    if (emp) {
      setSelectedEmployee(emp as Employee & { company: Company; project?: Project })
      setIsCardOpen(true)
      openEmployeeHandledRef.current = true
    }
  }, [employees, loading, location.search])

  // Clear selection when filters change
  useEffect(() => {
    setSelectedEmployees(new Set())
  }, [
    searchTerm,
    residenceNumberSearch,
    companyFilter,
    nationalityFilter,
    professionFilter,
    projectFilter,
    contractFilter,
    hiredWorkerContractFilter,
    residenceFilter,
    healthInsuranceFilter,
    showAlertsOnly,
  ]) // تحديث: insuranceFilter → healthInsuranceFilter

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        companyDropdownRef.current &&
        !companyDropdownRef.current.contains(event.target as Node)
      ) {
        setCompanyDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // تحديث نص البحث عند تغيير الشركة المختارة
  useEffect(() => {
    if (companyFilter && companiesWithIds.length > 0) {
      const selectedCompany = companiesWithIds.find((c) => c.name === companyFilter)
      if (selectedCompany) {
        const displayText = selectedCompany.unified_number
          ? `${selectedCompany.name} (${selectedCompany.unified_number})`
          : selectedCompany.name
        if (companySearchQuery !== displayText) {
          setCompanySearchQuery(displayText)
        }
      }
    } else if (!companyFilter && companySearchQuery) {
      setCompanySearchQuery('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyFilter, companiesWithIds])

  // تصفية الشركات: البحث في الاسم أو الرقم الموحد
  const filteredCompanies = companiesWithIds.filter((company) => {
    if (companySearchQuery.trim()) {
      const query = companySearchQuery.toLowerCase().trim()
      const nameMatch = company.name?.toLowerCase().includes(query)
      const unifiedNumberMatch = company.unified_number?.toString().includes(query)
      return nameMatch || unifiedNumberMatch
    }
    return true
  })

  const handleUrlParams = () => {
    const params = new URLSearchParams(location.search)
    const filter = params.get('filter')
    const companyId = params.get('company')

    // Handle company filter from URL
    if (companyId) {
      // سنقوم بتعيين companyFilter بعد تحميل الموظفين والمؤسسات
      // سنستخدم useEffect للتعامل مع ذلك
    }

    switch (filter) {
      case 'alerts':
        // فلترة الموظفين الذين لديهم تنبيهات (عقود أو إقامات أو تأمين منتهية أو قريبة من الانتهاء)
        setContractFilter('لديه تنبيه')
        setHiredWorkerContractFilter('لديه تنبيه')
        setResidenceFilter('لديه تنبيه')
        setHealthInsuranceFilter('لديه تنبيه')
        break
      case 'expired-contracts':
        setContractFilter('منتهي')
        break
      case 'expired-residences':
        setResidenceFilter('منتهي')
        break
      case 'expired-insurance':
        setHealthInsuranceFilter('منتهي') // تحديث: setInsuranceFilter → setHealthInsuranceFilter
        break
      case 'urgent-contracts':
        setContractFilter('طارئ')
        break
      case 'urgent-residences':
        setResidenceFilter('طارئ')
        break
      case 'expiring-insurance-30':
        setHealthInsuranceFilter('طارئ') // تحديث: setInsuranceFilter → setHealthInsuranceFilter
        break
      case 'expiring-insurance-60':
        setHealthInsuranceFilter('متوسط') // تحديث: setInsuranceFilter → setHealthInsuranceFilter
        break
      case 'expiring-insurance-90':
        setHealthInsuranceFilter('ساري') // تحديث: setInsuranceFilter → setHealthInsuranceFilter
        break
      case 'active-insurance':
        setHealthInsuranceFilter('ساري') // تحديث: setInsuranceFilter → setHealthInsuranceFilter
        break
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setResidenceNumberSearch('')
    setCompanyFilter('')
    setNationalityFilter('')
    setProfessionFilter('')
    setProjectFilter('')
    setContractFilter('')
    setHiredWorkerContractFilter('')
    setResidenceFilter('')
    setHealthInsuranceFilter('') // تحديث: setInsuranceFilter → setHealthInsuranceFilter
    setShowAlertsOnly(false)
    navigate('/employees')
  }

  const handleEmployeeClick = useCallback((employee: Employee & { company: Company }) => {
    setSelectedEmployee(employee)
    setIsCardOpen(true)
  }, [])

  const handleCloseCard = () => {
    setIsCardOpen(false)
    setSelectedEmployee(null)
    // إعادة تعيين الصف المحدد عند إغلاق الكارت
    setSelectedRowIndex(null)
  }

  const handleUpdateEmployee = async () => {
    // إعادة تحميل قائمة الموظفين بعد التحديث
    await loadEmployees()
  }

  // تم إزالة دوال التعديل السريع

  const logActivity = async (
    employeeId: string,
    action: string,
    changes: Record<string, unknown>
  ) => {
    try {
      const employee = employees.find((e) => e.id === employeeId)

      // تحويل مفاتيح التغييرات إلى أسماء مترجمة
      const translatedChanges: Record<string, unknown> = {}
      const changedFields: string[] = []

      Object.keys(changes).forEach((key) => {
        const label = getFieldLabel(key)
        translatedChanges[label] = changes[key]
        changedFields.push(label)
      })

      // تحديد اسم العملية الفعلي بناءً على عدد التغييرات
      let actionName = action
      if (changedFields.length === 1 && !action.includes('حذف')) {
        actionName = `تحديث ${changedFields[0]}`
      } else if (changedFields.length > 1 && !action.includes('حذف')) {
        actionName = `تحديث متعدد (${changedFields.length} حقول)`
      }

      await supabase.from('activity_log').insert({
        entity_type: 'employee',
        entity_id: employeeId,
        action: actionName,
        details: {
          employee_name: employee?.name,
          changes: translatedChanges,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      logger.error('Error logging activity:', error)
    }
  }

  const handleDeleteEmployee = useCallback(async (employee: Employee & { company: Company }) => {
    setEmployeeToDelete(employee)

    // فحص الالتزامات المرتبطة بالموظف
    const { data: headers, error: fetchError } = await supabase
      .from('employee_obligation_headers')
      .select('id, employee_id, obligation_type, title, total_amount, currency_code, status')
      .eq('employee_id', employee.id)

    if (fetchError) {
      logger.error('Error fetching obligations:', fetchError)
    }

    if (headers && headers.length > 0) {
      setCascadeObligations(headers as ObligationHeaderInfo[])
      setCascadeEmployeeIds([employee.id])
      setCascadeIsBulk(false)
      setShowCascadeDeleteModal(true)
    } else {
      setShowDeleteModal(true)
    }
  }, [])

  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) return

    try {
      const { error } = await supabase.from('employees').delete().eq('id', employeeToDelete.id)

      if (error) {
        logger.error('Delete error:', error)
        throw error
      }

      // Log activity
      await logActivity(employeeToDelete.id, 'حذف موظف', {
        employee_name: employeeToDelete.name,
        company: employeeToDelete.company?.name,
      })

      toast.success(`تم حذف الموظف "${employeeToDelete.name}" بنجاح`)

      // Refresh employees list
      await loadEmployees()
      setShowDeleteModal(false)
      setEmployeeToDelete(null)

      // Close card if open
      if (isCardOpen && selectedEmployee?.id === employeeToDelete.id) {
        setIsCardOpen(false)
        setSelectedEmployee(null)
      }
    } catch (error) {
      logger.error('Error deleting employee:', error)
      const errorMessage = error instanceof Error ? error.message : 'فشل في حذف الموظف'
      const postgrestError = error as PostgrestError | null
      if (postgrestError?.code === '23503') {
        toast.error('تعذر حذف الموظف بسبب وجود سجلات مرتبطة به.')
      } else {
        toast.error(errorMessage)
      }
    }
  }

  const confirmCascadeDelete = async () => {
    setCascadeDeleting(true)
    try {
      const headerIds = cascadeObligations.map((h) => h.id)

      // الحل الصحيح للـ trigger المُعلَّق (DEFERRABLE INITIALLY DEFERRED):
      // عند حذف الرأس، قاعدة البيانات تحذف البنود تلقائياً بـ CASCADE في نفس الـ transaction.
      // الـ trigger يتحقق في نهاية الـ transaction لكن الرأس حُذف فعلاً فيعود بـ IF NOT FOUND THEN RETURN.
      if (headerIds.length > 0) {
        const { error: headersError } = await supabase
          .from('employee_obligation_headers')
          .delete()
          .in('id', headerIds)
        if (headersError) throw headersError
      }

      // 2. حذف الموظفين
      const { error: empError } = await supabase
        .from('employees')
        .delete()
        .in('id', cascadeEmployeeIds)
      if (empError) throw empError

      // تسجيل النشاط
      if (!cascadeIsBulk && employeeToDelete) {
        await logActivity(employeeToDelete.id, 'حذف موظف مع الالتزامات', {
          employee_name: employeeToDelete.name,
          company: employeeToDelete.company?.name,
          obligations_deleted: headerIds.length,
        })
      }

      const successMsg = cascadeIsBulk
        ? `تم حذف ${cascadeEmployeeIds.length} موظف مع ${headerIds.length} التزام مرتبط بنجاح`
        : `تم حذف الموظف "${employeeToDelete?.name}" مع ${headerIds.length} التزام مرتبط بنجاح`
      toast.success(successMsg)

      await loadEmployees()
      setShowCascadeDeleteModal(false)
      setCascadeObligations([])
      setCascadeEmployeeIds([])
      setEmployeeToDelete(null)

      if (cascadeIsBulk) {
        clearSelection()
        setShowBulkDeleteModal(false)
      } else if (isCardOpen && selectedEmployee?.id === cascadeEmployeeIds[0]) {
        setIsCardOpen(false)
        setSelectedEmployee(null)
      }
    } catch (error) {
      logger.error('Error in cascade delete:', error)
      toast.error('حدث خطأ أثناء الحذف. يرجى المحاولة مرة أخرى.')
    } finally {
      setCascadeDeleting(false)
    }
  }

  // Bulk selection functions
  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId)
      } else {
        newSet.add(employeeId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedEmployees.size === filteredEmployees.length) {
      setSelectedEmployees(new Set())
    } else {
      setSelectedEmployees(new Set(filteredEmployees.map((emp) => emp.id)))
    }
  }

  const clearSelection = () => {
    setSelectedEmployees(new Set())
  }

  // Bulk delete function with batch processing
  const handleBulkDelete = async () => {
    if (selectedEmployees.size === 0) {
      toast.error('لم يتم تحديد أي موظف للحذف')
      return
    }

    const employeeIds = Array.from(selectedEmployees)

    // فحص الالتزامات المرتبطة بجميع الموظفين المحددين
    const { data: obligationHeaders, error: obligFetchError } = await supabase
      .from('employee_obligation_headers')
      .select('id, employee_id, obligation_type, title, total_amount, currency_code, status')
      .in('employee_id', employeeIds)

    if (obligFetchError) {
      logger.error('Error fetching obligations for bulk delete:', obligFetchError)
    }

    if (obligationHeaders && obligationHeaders.length > 0) {
      // يوجد التزامات — عرض مودال الحذف المتسلسل
      setCascadeObligations(obligationHeaders as ObligationHeaderInfo[])
      setCascadeEmployeeIds(employeeIds)
      setCascadeIsBulk(true)
      setShowCascadeDeleteModal(true)
      return
    }

    // لا توجد التزامات — المضي بالحذف المباشر دفعةً دفعة
    setDeletingEmployees(true)

    try {
      const selectedEmployeesData = employees.filter((emp) => employeeIds.includes(emp.id))

      const batchSize = 50
      let totalDeleted = 0
      const failedBatches: string[] = []
      const totalBatches = Math.ceil(employeeIds.length / batchSize)

      for (let i = 0; i < employeeIds.length; i += batchSize) {
        const batch = employeeIds.slice(i, i + batchSize)
        const currentBatch = Math.floor(i / batchSize) + 1

        try {
          const { error } = await supabase.from('employees').delete().in('id', batch)

          if (error) {
            logger.error(`Error deleting batch ${currentBatch}/${totalBatches}:`, error)
            failedBatches.push(...batch)
            continue
          }

          totalDeleted += batch.length

          if (selectedEmployeesData.length <= 100) {
            const batchEmployees = selectedEmployeesData.filter((emp) => batch.includes(emp.id))
            for (const employee of batchEmployees) {
              try {
                await logActivity(employee.id, 'حذف موظف (جماعي)', {
                  employee_name: employee.name,
                  company: employee.company?.name,
                })
              } catch {
                logger.warn('Failed to log activity for employee:', employee.id)
              }
            }
          }
        } catch (batchError) {
          logger.error(`Error in batch ${currentBatch}/${totalBatches}:`, batchError)
          failedBatches.push(...batch)
        }
      }

      if (failedBatches.length > 0) {
        toast.error(`تم حذف ${totalDeleted} موظف، ولكن فشل حذف ${failedBatches.length} موظف`)
      } else {
        toast.success(`تم حذف ${totalDeleted} موظف بنجاح`)
      }

      await loadEmployees()
      clearSelection()
      setShowBulkDeleteModal(false)
    } catch (error) {
      logger.error('Error bulk deleting employees:', error)
      const errorMessage = error instanceof Error ? error.message : 'فشل في حذف الموظفين'
      const postgrestError = error as PostgrestError | null
      if (postgrestError?.code === '23503') {
        toast.error('تعذر حذف بعض الموظفين بسبب وجود سجلات مرتبطة بهم.')
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setDeletingEmployees(false)
    }
  }

  // Bulk update residence expiry date
  const handleBulkUpdateResidence = async (newDate: string) => {
    if (selectedEmployees.size === 0) return

    try {
      const employeeIds = Array.from(selectedEmployees)
      const selectedEmployeesData = employees.filter((emp) => employeeIds.includes(emp.id))

      // Update all selected employees
      const { error } = await supabase
        .from('employees')
        .update({ residence_expiry: newDate })
        .in('id', employeeIds)

      if (error) throw error

      // Log activity for each employee
      for (const employee of selectedEmployeesData) {
        await logActivity(employee.id, 'تعديل تاريخ انتهاء الإقامة (جماعي)', {
          employee_name: employee.name,
          old_date: employee.residence_expiry,
          new_date: newDate,
        })
      }

      toast.success(`تم تحديث تاريخ انتهاء الإقامة لـ ${selectedEmployees.size} موظف`)

      // Refresh and clear selection
      await loadEmployees()
      clearSelection()
      setShowBulkResidenceModal(false)
    } catch (error) {
      logger.error('Error bulk updating residence:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'فشل في تحديث تاريخ انتهاء الإقامة'
      toast.error(errorMessage)
    }
  }

  // Bulk update insurance expiry date
  const handleBulkUpdateInsurance = async (newDate: string) => {
    if (selectedEmployees.size === 0) return

    try {
      const employeeIds = Array.from(selectedEmployees)
      const selectedEmployeesData = employees.filter((emp) => employeeIds.includes(emp.id))

      // Update all selected employees
      const { error } = await supabase
        .from('employees')
        .update({ health_insurance_expiry: newDate }) // تحديث: ending_subscription_insurance_date → health_insurance_expiry
        .in('id', employeeIds)

      if (error) throw error

      // Log activity for each employee
      for (const employee of selectedEmployeesData) {
        await logActivity(employee.id, 'تعديل تاريخ انتهاء التأمين (جماعي)', {
          employee_name: employee.name,
          old_date: employee.health_insurance_expiry, // تحديث: ending_subscription_insurance_date → health_insurance_expiry
          new_date: newDate,
        })
      }

      toast.success(`تم تحديث تاريخ انتهاء التأمين لـ ${selectedEmployees.size} موظف`)

      // Refresh and clear selection
      await loadEmployees()
      clearSelection()
      setShowBulkInsuranceModal(false)
    } catch (error) {
      logger.error('Error bulk updating insurance:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'فشل في تحديث تاريخ انتهاء التأمين'
      toast.error(errorMessage)
    }
  }

  // Bulk update contract expiry date
  const handleBulkUpdateContract = async (newDate: string) => {
    if (selectedEmployees.size === 0) return

    try {
      const employeeIds = Array.from(selectedEmployees)
      const selectedEmployeesData = employees.filter((emp) => employeeIds.includes(emp.id))

      // Update all selected employees
      const { error } = await supabase
        .from('employees')
        .update({ contract_expiry: newDate })
        .in('id', employeeIds)

      if (error) throw error

      // Log activity for each employee
      for (const employee of selectedEmployeesData) {
        await logActivity(employee.id, 'تعديل تاريخ انتهاء العقد (جماعي)', {
          employee_name: employee.name,
          old_date: employee.contract_expiry,
          new_date: newDate,
        })
      }

      toast.success(`تم تحديث تاريخ انتهاء العقد لـ ${selectedEmployees.size} موظف`)

      // Refresh and clear selection
      await loadEmployees()
      clearSelection()
      setShowBulkContractModal(false)
    } catch (error) {
      logger.error('Error bulk updating contract:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'فشل في تحديث تاريخ انتهاء العقد'
      toast.error(errorMessage)
    }
  }

  const alertsCount = employees.reduce((count, emp) => {
    return (
      count +
      (hasAlert(
        emp.contract_expiry,
        emp.hired_worker_contract_expiry,
        emp.residence_expiry,
        emp.health_insurance_expiry,
        colorThresholds ?? COLOR_THRESHOLD_FALLBACK
      )
        ? 1
        : 0)
    )
  }, 0)

  const filteredEmployees = useMemo(() => employees.filter((emp) => {
    const contractStatus = getStatusForField(emp.contract_expiry, 'contract', colorThresholds ?? COLOR_THRESHOLD_FALLBACK)
    const hiredWorkerStatus = getStatusForField(
      emp.hired_worker_contract_expiry,
      'hired_worker_contract',
      colorThresholds ?? COLOR_THRESHOLD_FALLBACK
    )
    const residenceStatus = getStatusForField(emp.residence_expiry, 'residence', colorThresholds ?? COLOR_THRESHOLD_FALLBACK)
    const insuranceStatus = getStatusForField(emp.health_insurance_expiry, 'health_insurance', colorThresholds ?? COLOR_THRESHOLD_FALLBACK)

    // البحث الشامل في الاسم، رقم الإقامة، رقم الجواز، المهنة، والجنسية
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      !searchTerm ||
      emp.name.toLowerCase().includes(searchLower) ||
      emp.residence_number.toString().toLowerCase().includes(searchLower) ||
      (emp.passport_number && emp.passport_number.toLowerCase().includes(searchLower)) ||
      (emp.profession && emp.profession.toLowerCase().includes(searchLower)) ||
      (emp.nationality && emp.nationality.toLowerCase().includes(searchLower))
    const matchesResidenceNumber =
      !residenceNumberSearch ||
      emp.residence_number.toString().toLowerCase().includes(residenceNumberSearch.toLowerCase())
    const matchesCompany = !companyFilter || emp.company?.name === companyFilter
    const matchesNationality = !nationalityFilter || emp.nationality === nationalityFilter
    const matchesProfession = !professionFilter || emp.profession === professionFilter
    const matchesProject =
      !projectFilter ||
      emp.project?.name === projectFilter ||
      (emp.project_name === projectFilter && !emp.project)

    // فلترة خاصة لـ "لديه تنبيه"
    const matchesContract =
      !contractFilter ||
      (contractFilter === 'لديه تنبيه'
        ? hasAlert(
            emp.contract_expiry,
            emp.hired_worker_contract_expiry,
            emp.residence_expiry,
            emp.health_insurance_expiry,
            colorThresholds ?? COLOR_THRESHOLD_FALLBACK
          )
        : contractStatus === contractFilter)
    const matchesHiredWorkerContract =
      !hiredWorkerContractFilter ||
      (hiredWorkerContractFilter === 'لديه تنبيه'
        ? hasAlert(
            emp.contract_expiry,
            emp.hired_worker_contract_expiry,
            emp.residence_expiry,
            emp.health_insurance_expiry,
            colorThresholds ?? COLOR_THRESHOLD_FALLBACK
          )
        : hiredWorkerStatus === hiredWorkerContractFilter)
    const matchesResidence =
      !residenceFilter ||
      (residenceFilter === 'لديه تنبيه'
        ? hasAlert(
            emp.contract_expiry,
            emp.hired_worker_contract_expiry,
            emp.residence_expiry,
            emp.health_insurance_expiry,
            colorThresholds ?? COLOR_THRESHOLD_FALLBACK
          )
        : residenceStatus === residenceFilter)
    const matchesInsurance =
      !healthInsuranceFilter ||
      (healthInsuranceFilter === 'لديه تنبيه'
        ? hasAlert(
            emp.contract_expiry,
            emp.hired_worker_contract_expiry,
            emp.residence_expiry,
            emp.health_insurance_expiry,
            colorThresholds ?? COLOR_THRESHOLD_FALLBACK
          )
        : insuranceStatus === healthInsuranceFilter)

    const matchesAlertsToggle =
      !showAlertsOnly ||
      hasAlert(
        emp.contract_expiry,
        emp.hired_worker_contract_expiry,
        emp.residence_expiry,
        emp.health_insurance_expiry,
        colorThresholds ?? COLOR_THRESHOLD_FALLBACK
      )

    return (
      matchesSearch &&
      matchesResidenceNumber &&
      matchesCompany &&
      matchesNationality &&
      matchesProfession &&
      matchesProject &&
      matchesContract &&
      matchesHiredWorkerContract &&
      matchesResidence &&
      matchesInsurance &&
      matchesAlertsToggle
    )
  }), [employees, searchTerm, residenceNumberSearch, companyFilter, nationalityFilter,
    professionFilter, projectFilter, contractFilter, hiredWorkerContractFilter,
    residenceFilter, healthInsuranceFilter, showAlertsOnly, colorThresholds])

  const hasActiveFilters =
    searchTerm ||
    residenceNumberSearch ||
    companyFilter ||
    nationalityFilter ||
    professionFilter ||
    projectFilter ||
    contractFilter ||
    hiredWorkerContractFilter ||
    residenceFilter ||
    healthInsuranceFilter ||
    showAlertsOnly // تحديث: insuranceFilter → healthInsuranceFilter

  // Calculate active filters count
  const activeFiltersCount = [
    searchTerm !== '',
    residenceNumberSearch !== '',
    companyFilter !== '',
    nationalityFilter !== '',
    professionFilter !== '',
    projectFilter !== '',
    contractFilter !== '',
    hiredWorkerContractFilter !== '',
    residenceFilter !== '',
    healthInsuranceFilter !== '', // تحديث: insuranceFilter → healthInsuranceFilter
    showAlertsOnly,
  ].filter(Boolean).length

  // Sort handling functions
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4" />
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4" />
    ) : (
      <ArrowDown className="w-4 h-4" />
    )
  }

  // Apply sorting to filtered employees
  const sortedAndFilteredEmployees = useMemo(() => [...filteredEmployees].sort((a, b) => {
    let aValue: string | number
    let bValue: string | number

    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'profession':
        aValue = (a.profession || '').toLowerCase()
        bValue = (b.profession || '').toLowerCase()
        break
      case 'nationality':
        aValue = (a.nationality || '').toLowerCase()
        bValue = (b.nationality || '').toLowerCase()
        break
      case 'company':
        aValue = (a.company?.name || '').toLowerCase()
        bValue = (b.company?.name || '').toLowerCase()
        break
      case 'project':
        aValue = (a.project?.name || a.project_name || '').toLowerCase()
        bValue = (b.project?.name || b.project_name || '').toLowerCase()
        break
      case 'contract_expiry':
        aValue = a.contract_expiry ? new Date(a.contract_expiry).getTime() : 0
        bValue = b.contract_expiry ? new Date(b.contract_expiry).getTime() : 0
        break
      case 'hired_worker_contract_expiry':
        aValue = a.hired_worker_contract_expiry
          ? new Date(a.hired_worker_contract_expiry).getTime()
          : 0
        bValue = b.hired_worker_contract_expiry
          ? new Date(b.hired_worker_contract_expiry).getTime()
          : 0
        break
      case 'residence_expiry':
        aValue = a.residence_expiry ? new Date(a.residence_expiry).getTime() : 0
        bValue = b.residence_expiry ? new Date(b.residence_expiry).getTime() : 0
        break
      case 'health_insurance_expiry': // تحديث: ending_subscription_insurance_date → health_insurance_expiry
        aValue = a.health_insurance_expiry ? new Date(a.health_insurance_expiry).getTime() : 0
        bValue = b.health_insurance_expiry ? new Date(b.health_insurance_expiry).getTime() : 0
        break
      default:
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
    }
  }), [filteredEmployees, sortField, sortDirection])

  // Virtualizer for list/table view
  const listContainerRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useWindowVirtualizer({
    count: viewMode === 'table' ? sortedAndFilteredEmployees.length : 0,
    estimateSize: () => 72,
    overscan: 10,
    scrollMargin: listContainerRef.current?.offsetTop ?? 0,
  })
  const virtualItems = rowVirtualizer.getVirtualItems()

  // معالجة التنقل بالسهام في الجدول
  useEffect(() => {
    // لا تعمل إذا كان هناك modal مفتوح
    if (
      isCardOpen ||
      isAddModalOpen ||
      showDeleteModal ||
      showBulkDeleteModal ||
      showFiltersModal
    ) {
      return
    }

    function handleKeyDown(e: KeyboardEvent) {
      // التحقق من أن المستخدم لا يكتب في حقل إدخال
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return
      }

      const employeesList = sortedAndFilteredEmployees
      if (employeesList.length === 0) return

      let newIndex: number | null = selectedRowIndex

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          if (selectedRowIndex === null) {
            newIndex = 0
          } else {
            newIndex = Math.min(selectedRowIndex + 1, employeesList.length - 1)
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          if (selectedRowIndex === null) {
            newIndex = employeesList.length - 1
          } else {
            newIndex = Math.max(selectedRowIndex - 1, 0)
          }
          break
        case 'Home':
          e.preventDefault()
          newIndex = 0
          break
        case 'End':
          e.preventDefault()
          newIndex = employeesList.length - 1
          break
        case 'Enter':
          e.preventDefault()
          if (selectedRowIndex !== null && employeesList[selectedRowIndex]) {
            handleEmployeeClick(employeesList[selectedRowIndex])
          }
          return
        default:
          return
      }

      if (newIndex !== null && newIndex !== selectedRowIndex) {
        setSelectedRowIndex(newIndex)
        // Scroll to view
        setTimeout(() => {
          const rowElement = rowRefs.current[newIndex]
          if (rowElement) {
            rowElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          }
        }, 0)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    selectedRowIndex,
    sortedAndFilteredEmployees,
    isCardOpen,
    isAddModalOpen,
    showDeleteModal,
    showBulkDeleteModal,
    showFiltersModal,
  ])

  // إعادة تعيين الصف المحدد عند تغيير الفلاتر
  useEffect(() => {
    setSelectedRowIndex(null)
  }, [
    searchTerm,
    companyFilter,
    nationalityFilter,
    professionFilter,
    projectFilter,
    contractFilter,
    residenceFilter,
    healthInsuranceFilter,
    sortField,
    sortDirection,
  ])

  // التحقق من صلاحية العرض قبل عرض الصفحة
  if (!hasViewPermission) {
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

  return (
    <Layout>
      <div className="app-page app-tech-grid">
        <PageHeader
          title="الموظفين"
          description={`عرض ${sortedAndFilteredEmployees.length} من ${employees.length} موظف${
            activeFiltersCount > 0 ? ` (${activeFiltersCount} فلتر نشط)` : ''
          }`}
          breadcrumbs={[{ label: 'الرئيسية', href: '/dashboard' }, { label: 'الموظفين' }]}
          className="mb-4"
          actions={
            <>
              <div className="app-toggle-shell">
                {!isMobileView && (
                  <button
                    onClick={() => setViewMode('table')}
                    className={`app-toggle-button ${viewMode === 'table' ? 'app-toggle-button-active' : ''}`}
                    title="عرض الشرائط"
                  >
                    <Table className="w-4 h-4" />
                    <span className="hidden sm:inline">شرائط</span>
                  </button>
                )}
                <button
                  onClick={() => setViewMode('grid')}
                  className={`app-toggle-button ${viewMode === 'grid' ? 'app-toggle-button-active' : ''}`}
                  title="عرض الكروت"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden sm:inline">كروت</span>
                </button>
              </div>

              {canCreate('employees') && (
                <Button onClick={() => setIsAddModalOpen(true)}>
                  <UserPlus className="w-4 h-4" />
                  إضافة موظف
                </Button>
              )}
            </>
          }
        />

        <FilterBar
          className="mb-6"
          actions={
            <>
              <Button onClick={() => setShowFiltersModal(true)} className="relative">
                <Filter className="w-4 h-4" />
                <span>الفلاتر</span>
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setShowAlertsOnly((prev) => !prev)}
                    variant="secondary"
                    className={`relative border-red-200 text-red-700 ${showAlertsOnly ? 'bg-red-50' : ''}`}
                    title="عرض الموظفين ذوي التنبيهات فقط"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">تنبيهات</span>
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                      {alertsCount}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-neutral-900 text-white">
                  تحسب طارئ وعاجل ومتوسط
                </TooltipContent>
              </Tooltip>

              <DropdownMenu open={showSortDropdown} onOpenChange={setShowSortDropdown}>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary">
                    {getSortIcon(sortField)}
                    <span className="hidden sm:inline">الترتيب</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={8} className="w-56">
                  <DropdownMenuLabel>الترتيب حسب:</DropdownMenuLabel>
                  {[
                    { field: 'name' as typeof sortField, label: 'الاسم' },
                    { field: 'profession' as typeof sortField, label: 'المهنة' },
                    { field: 'nationality' as typeof sortField, label: 'الجنسية' },
                    { field: 'company' as typeof sortField, label: 'الشركة' },
                    { field: 'project' as typeof sortField, label: 'المشروع' },
                    {
                      field: 'contract_expiry' as typeof sortField,
                      label: 'تاريخ انتهاء العقد',
                    },
                    {
                      field: 'hired_worker_contract_expiry' as typeof sortField,
                      label: 'تاريخ انتهاء عقد أجير',
                    },
                    {
                      field: 'residence_expiry' as typeof sortField,
                      label: 'تاريخ انتهاء الإقامة',
                    },
                    {
                      field: 'health_insurance_expiry' as typeof sortField,
                      label: 'تاريخ انتهاء التأمين الصحي',
                    },
                  ].map(({ field, label }) => (
                    <DropdownMenuItem
                      key={field}
                      onClick={() => {
                        handleSort(field)
                      }}
                      className={`w-full justify-between text-right ${sortField === field ? 'bg-primary/10 text-foreground' : ''}`}
                    >
                      <span>{label}</span>
                      {sortField === field && getSortIcon(field)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        >
          <SearchInput
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث بالاسم أو رقم الإقامة أو رقم الجواز أو المهنة أو الجنسية..."
            wrapperClassName="min-w-[260px] flex-1"
          />
        </FilterBar>

        {/* Filters Modal */}
        {showFiltersModal && (
          <EmployeesFiltersModal
            activeFiltersCount={activeFiltersCount}
            hasActiveFilters={hasActiveFilters}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            residenceNumberSearch={residenceNumberSearch}
            setResidenceNumberSearch={setResidenceNumberSearch}
            companyFilter={companyFilter}
            setCompanyFilter={setCompanyFilter}
            companySearchQuery={companySearchQuery}
            setCompanySearchQuery={setCompanySearchQuery}
            isCompanyDropdownOpen={isCompanyDropdownOpen}
            setCompanyDropdownOpen={setCompanyDropdownOpen}
            filteredCompanies={filteredCompanies}
            companyDropdownRef={companyDropdownRef}
            nationalityFilter={nationalityFilter}
            setNationalityFilter={setNationalityFilter}
            nationalities={nationalities}
            professionFilter={professionFilter}
            setProfessionFilter={setProfessionFilter}
            professions={professions}
            projectFilter={projectFilter}
            setProjectFilter={setProjectFilter}
            projects={projects}
            contractFilter={contractFilter}
            setContractFilter={setContractFilter}
            hiredWorkerContractFilter={hiredWorkerContractFilter}
            setHiredWorkerContractFilter={setHiredWorkerContractFilter}
            residenceFilter={residenceFilter}
            setResidenceFilter={setResidenceFilter}
            healthInsuranceFilter={healthInsuranceFilter}
            setHealthInsuranceFilter={setHealthInsuranceFilter}
            showAlertsOnly={showAlertsOnly}
            setShowAlertsOnly={setShowAlertsOnly}
            clearFilters={clearFilters}
            onClose={() => setShowFiltersModal(false)}
          />
        )}

        {/* Bulk Actions Bar */}
        {selectedEmployees.size > 0 && (
          <div className="app-info-block mb-3 rounded-lg p-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-foreground">
                  {selectedEmployees.size} موظف محدد
                </div>
                <Button onClick={clearSelection} variant="ghost" size="sm" className="h-8 px-2">
                  إلغاء التحديد
                </Button>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  onClick={() => setShowBulkResidenceModal(true)}
                  variant="default"
                  size="sm"
                  title="تعديل تاريخ انتهاء الإقامة"
                >
                  <Calendar className="w-3 h-3" />
                  تعديل تاريخ الإقامة
                </Button>
                <Button
                  onClick={() => setShowBulkInsuranceModal(true)}
                  variant="outline"
                  size="sm"
                  title="تعديل تاريخ انتهاء التأمين"
                >
                  <Calendar className="w-3 h-3" />
                  تعديل تاريخ التأمين
                </Button>
                <Button
                  onClick={() => setShowBulkContractModal(true)}
                  variant="outline"
                  size="sm"
                  title="تعديل تاريخ انتهاء العقد"
                >
                  <Calendar className="w-3 h-3" />
                  تعديل تاريخ العقد
                </Button>
                <Button
                  onClick={() => setShowBulkDeleteModal(true)}
                  variant="destructive"
                  size="sm"
                  title="حذف الموظفين المحددين"
                >
                  <Trash2 className="w-3 h-3" />
                  حذف المحددين
                </Button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : viewMode === 'grid' ? (
          // Grid View
          <div className={employeeGridClass}>
            {sortedAndFilteredEmployees.map((employee, index) => (
              <EmployeeGridCard
                key={employee.id}
                employee={employee}
                index={index}
                canEditEmployee={canEdit('employees')}
                canDeleteEmployee={canDelete('employees')}
                onEmployeeClick={handleEmployeeClick}
                onDeleteEmployee={handleDeleteEmployee}
              />
            ))}
          </div>
        ) : (
          <div ref={listContainerRef} className="space-y-3">
            <div className="app-data-strip flex items-center justify-between">
              <button
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-2 text-sm font-medium text-foreground-secondary dark:text-foreground"
                title={
                  selectedEmployees.size === filteredEmployees.length
                    ? 'إلغاء تحديد الكل'
                    : 'تحديد الكل'
                }
              >
                {selectedEmployees.size === filteredEmployees.length &&
                filteredEmployees.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-info-600" />
                ) : (
                  <Square className="w-4 h-4 text-foreground-tertiary" />
                )}
                تحديد الكل
              </button>
              <span className="text-xs text-foreground-secondary dark:text-foreground-secondary">
                {sortedAndFilteredEmployees.length} نتيجة
              </span>
            </div>

            {sortedAndFilteredEmployees.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
                <p>لا توجد نتائج تطابق الفلاتر المحددة</p>
              </div>
            ) : (
              <div
                style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}
              >
                {virtualItems.map((virtualRow) => {
                  const employee = sortedAndFilteredEmployees[virtualRow.index]
                  return (
                    <div
                      key={employee.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
                        width: '100%',
                      }}
                      ref={rowVirtualizer.measureElement}
                      data-index={virtualRow.index}
                    >
                      <EmployeeListRow
                        employee={employee}
                        index={virtualRow.index}
                        isSelected={selectedRowIndex === virtualRow.index}
                        isChecked={selectedEmployees.has(employee.id)}
                        setRowRef={(el) => { rowRefs.current[virtualRow.index] = el }}
                        canDeleteEmployee={canDelete('employees')}
                        onEmployeeClick={handleEmployeeClick}
                        onDeleteEmployee={handleDeleteEmployee}
                        onToggleSelection={toggleEmployeeSelection}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* مودال بطاقة الموظف */}
      {isCardOpen && selectedEmployee && (
        <EmployeeCard
          employee={selectedEmployee}
          onClose={handleCloseCard}
          onUpdate={handleUpdateEmployee}
          onDelete={handleDeleteEmployee}
        />
      )}

      {/* مودال إضافة موظف */}
      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleUpdateEmployee}
      />

      {/* مودال تأكيد حذف الموظف */}
      {showDeleteModal && (
        <EmployeeDeleteConfirmModal
          employeeName={employeeToDelete?.name}
          onConfirm={confirmDeleteEmployee}
          onCancel={() => {
            setShowDeleteModal(false)
            setEmployeeToDelete(null)
          }}
        />
      )}

      {/* مودال حذف جماعي */}
      {showBulkDeleteModal && (
        <BulkDeleteModal
          selectedCount={selectedEmployees.size}
          selectedEmployees={employees.filter((emp) => selectedEmployees.has(emp.id))}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkDeleteModal(false)}
          isDeleting={deletingEmployees}
        />
      )}

      {/* مودال الحذف المتسلسل (موظف لديه التزامات مرتبطة) */}
      <CascadeDeleteModal
        open={showCascadeDeleteModal}
        isBulk={cascadeIsBulk}
        employees={
          cascadeIsBulk
            ? employees
                .filter((emp) => cascadeEmployeeIds.includes(emp.id))
                .map((emp) => ({ id: emp.id, name: emp.name, company: emp.company?.name }))
            : employeeToDelete
              ? [{ id: employeeToDelete.id, name: employeeToDelete.name, company: employeeToDelete.company?.name }]
              : []
        }
        obligations={cascadeObligations}
        loading={cascadeDeleting}
        onConfirm={confirmCascadeDelete}
        onCancel={() => {
          setShowCascadeDeleteModal(false)
          setCascadeObligations([])
          setCascadeEmployeeIds([])
          if (!cascadeIsBulk) setEmployeeToDelete(null)
        }}
      />

      {/* مودال تعديل تاريخ الإقامة */}
      {showBulkResidenceModal && (
        <BulkDateModal
          title="تعديل تاريخ انتهاء الإقامة"
          selectedCount={selectedEmployees.size}
          onConfirm={handleBulkUpdateResidence}
          onCancel={() => setShowBulkResidenceModal(false)}
        />
      )}

      {/* مودال تعديل تاريخ التأمين */}
      {showBulkInsuranceModal && (
        <BulkDateModal
          title="تعديل تاريخ انتهاء التأمين"
          selectedCount={selectedEmployees.size}
          onConfirm={handleBulkUpdateInsurance}
          onCancel={() => setShowBulkInsuranceModal(false)}
        />
      )}

      {/* مودال تعديل تاريخ العقد */}
      {showBulkContractModal && (
        <BulkDateModal
          title="تعديل تاريخ انتهاء العقد"
          selectedCount={selectedEmployees.size}
          onConfirm={handleBulkUpdateContract}
          onCancel={() => setShowBulkContractModal(false)}
        />
      )}
    </Layout>
  )
}
