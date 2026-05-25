/**
 * Advanced Search phase 10 hook.
 * Handles data loading, DB-level nationality/profession filters,
 * saved-search persistence, and client-side filter + sort application.
 */
import { useState, useCallback, useEffect } from 'react'
import { supabase, Company as CompanyType, Employee as EmployeeType } from '@/lib/supabase'
import { toast } from 'sonner'
import { saveAs } from 'file-saver'
import { loadXlsx } from '@/utils/lazyXlsx'
import { applyAdvancedSearchFilters } from '@/hooks/advancedSearchFilterFn'
import type {
  SavedSearch,
  SavedSearchFilters,
  TabType,
  ResidenceStatus,
  ContractStatus,
  CommercialRegStatus,
  ViewMode,
  AdvancedSearchSortDirection,
} from '@/hooks/advancedSearchTypes'

const EMPLOYEE_SELECT =
  'id,company_id,name,profession,nationality,birth_date,phone,passport_number,residence_number,joining_date,contract_expiry,residence_expiry,project_name,bank_account,residence_image_url,salary,health_insurance_expiry,additional_fields,created_at,updated_at,notes,hired_worker_contract_expiry,project_id,is_deleted,deleted_at, companies(name)'

const COMPANY_SELECT =
  'id,name,unified_number,labor_subscription_number,commercial_registration_expiry,social_insurance_expiry,ending_subscription_power_date,ending_subscription_moqeem_date,ending_subscription_insurance_date,commercial_registration_status,social_insurance_status,current_employees,max_employees,additional_fields,created_at,updated_at,notes,exemptions,social_insurance_number,company_type,employee_count'

const normalizeSavedFilterArray = (value: string | string[] | undefined): string[] => {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (value === 'all') return []
  return [value]
}

// Helper: get company name from employee
export const getCompanyName = (
  emp: EmployeeType & { companies?: CompanyType | CompanyType[] }
): string => {
  if (!emp.companies) return ''
  if (Array.isArray(emp.companies)) return emp.companies[0]?.name || ''
  return emp.companies.name || ''
}

interface UseAdvancedSearchFiltersOptions {
  userId: string | undefined
}

export function useAdvancedSearchFilters({ userId }: UseAdvancedSearchFiltersOptions) {
  // ---- Tab / search queries ----
  const [activeTab, setActiveTab] = useState<TabType>('employees')
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('')
  const [companySearchQuery, setCompanySearchQuery] = useState('')

  // ---- Loaded data ----
  const [employees, setEmployees] = useState<EmployeeType[]>([])
  const [companies, setCompanies] = useState<CompanyType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])

  // ---- Derived filter lists ----
  const [nationalities, setNationalities] = useState<string[]>([])
  const [companyList, setCompanyList] = useState<{ id: string; name: string }[]>([])
  const [professions, setProfessions] = useState<string[]>([])
  const [projects, setProjects] = useState<string[]>([])

  // ---- View / pagination ----
  const [showFiltersModal, setShowFiltersModal] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // ---- Sort ----
  const [sortDirection, setSortDirection] = useState<AdvancedSearchSortDirection>('asc')

  // ---- Employee filter states ----
  const [selectedNationality, setSelectedNationality] = useState<string[]>([])
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all')
  const [selectedProfession, setSelectedProfession] = useState<string[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [residenceStatus, setResidenceStatus] = useState<ResidenceStatus>('all')
  const [contractStatus, setContractStatus] = useState<ContractStatus>('all')
  const [hasHealthInsuranceExpiry, setHasHealthInsuranceExpiry] = useState<string>('all')
  const [healthInsuranceExpiryStatus, setHealthInsuranceExpiryStatus] = useState<string>('all')
  const [hasPassport, setHasPassport] = useState<string>('all')
  const [hasBankAccount, setHasBankAccount] = useState<string>('all')
  const [birthDateRange, setBirthDateRange] = useState<string>('all')
  const [joiningDateRange, setJoiningDateRange] = useState<string>('all')
  const [passportNumberSearch, setPassportNumberSearch] = useState<string>('')
  const [residenceNumberSearch, setResidenceNumberSearch] = useState<string>('')

  // ---- Company filter states ----
  const [commercialRegStatus, setCommercialRegStatus] = useState<CommercialRegStatus>('all')
  const [companyDateFilter, setCompanyDateFilter] = useState<'all' | 'commercial_expiring'>('all')
  const [powerSubscriptionStatus, setPowerSubscriptionStatus] = useState<string>('all')
  const [moqeemSubscriptionStatus, setMoqeemSubscriptionStatus] = useState<string>('all')
  const [employeeCountFilter, setEmployeeCountFilter] = useState<string>('all')
  const [availableSlotsFilter, setAvailableSlotsFilter] = useState<string>('all')
  const [exemptionsFilter, setExemptionsFilter] = useState<string>('all')
  const [unifiedNumberSearch, setUnifiedNumberSearch] = useState<string>('')
  const [taxNumberSearch, setTaxNumberSearch] = useState<string>('')
  const [laborSubscriptionNumberSearch, setLaborSubscriptionNumberSearch] = useState<string>('')
  const [maxEmployeesRange, setMaxEmployeesRange] = useState<string>('all')
  const [companyCreatedDateRange, setCompanyCreatedDateRange] = useState<string>('all')
  const [companyCreatedStartDate, setCompanyCreatedStartDate] = useState<string>('')
  const [companyCreatedEndDate, setCompanyCreatedEndDate] = useState<string>('')
  const [notesSearch, setNotesSearch] = useState<string>('')
  const [notesFilter, setNotesFilter] = useState<'all' | 'has_notes' | 'no_notes'>('all')

  // ---- Filtered results ----
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeType[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<CompanyType[]>([])

  // ---- Modal states ----
  const [selectedEmployee, setSelectedEmployee] = useState<
    (EmployeeType & { company: CompanyType }) | null
  >(null)
  const [isEmployeeCardOpen, setIsEmployeeCardOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<CompanyType | null>(null)
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false)
  const [showCompanyDetailModal, setShowCompanyDetailModal] = useState(false)
  const [selectedCompanyForDetail, setSelectedCompanyForDetail] = useState<CompanyType | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [{ data: employeesData, error: employeesError }, { data: companiesData, error: companiesError }] =
        await Promise.all([
          supabase.from('employees').select(EMPLOYEE_SELECT).order('name'),
          supabase.from('companies').select(COMPANY_SELECT).order('name'),
        ])

      if (employeesError) throw employeesError
      if (companiesError) throw companiesError

      const baseEmployees = employeesData ?? []
      setNationalities([...new Set(baseEmployees.map((e) => e.nationality).filter(Boolean))].sort())
      setProfessions([...new Set(baseEmployees.map((e) => e.profession).filter(Boolean))].sort())
      setProjects([...new Set(baseEmployees.map((e) => e.project_name).filter(Boolean))].sort())

      const hasDbEmployeeFilters =
        selectedNationality.length > 0 || selectedProfession.length > 0

      if (hasDbEmployeeFilters) {
        let filteredQuery = supabase.from('employees').select(EMPLOYEE_SELECT).order('name')

        if (selectedNationality.length === 1) {
          filteredQuery = filteredQuery.eq('nationality', selectedNationality[0])
        } else if (selectedNationality.length > 1) {
          filteredQuery = filteredQuery.in('nationality', selectedNationality)
        }

        if (selectedProfession.length === 1) {
          filteredQuery = filteredQuery.eq('profession', selectedProfession[0])
        } else if (selectedProfession.length > 1) {
          filteredQuery = filteredQuery.in('profession', selectedProfession)
        }

        const { data: filteredEmployeesData, error: filteredEmployeesError } = await filteredQuery
        if (filteredEmployeesError) throw filteredEmployeesError
        setEmployees(filteredEmployeesData ?? [])
      } else {
        setEmployees(baseEmployees)
      }

      if (companiesData) {
        setCompanies(companiesData)
        setCompanyList(companiesData.map((c) => ({ id: c.id, name: c.name })))
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('حدث خطأ أثناء تحميل البيانات')
    } finally {
      setIsLoading(false)
    }
  }, [selectedNationality, selectedProfession])

  const loadSavedSearches = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('saved_searches')
      .select('id,user_id,name,search_query,search_type,filters,created_at,updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading saved searches:', error)
      return
    }
    if (data) setSavedSearches(data)
  }, [userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadSavedSearches()
  }, [loadSavedSearches])

  useEffect(() => {
    const { filteredEmployees: nextEmployees, filteredCompanies: nextCompanies } =
      applyAdvancedSearchFilters({
        employees,
        companies,
        employeeSearchQuery,
        companySearchQuery,
        selectedNationality,
        selectedCompanyFilter,
        selectedProfession,
        selectedProject,
        residenceStatus,
        contractStatus,
        hasHealthInsuranceExpiry,
        healthInsuranceExpiryStatus,
        hasPassport,
        hasBankAccount,
        birthDateRange,
        joiningDateRange,
        passportNumberSearch,
        residenceNumberSearch,
        commercialRegStatus,
        companyDateFilter,
        powerSubscriptionStatus,
        moqeemSubscriptionStatus,
        employeeCountFilter,
        availableSlotsFilter,
        exemptionsFilter,
        unifiedNumberSearch,
        taxNumberSearch,
        laborSubscriptionNumberSearch,
        maxEmployeesRange,
        companyCreatedDateRange,
        companyCreatedStartDate,
        companyCreatedEndDate,
        notesSearch,
        notesFilter,
        sortDirection,
      })

    setFilteredEmployees(nextEmployees)
    setFilteredCompanies(nextCompanies)
    setCurrentPage(1)
  }, [
    employees,
    companies,
    employeeSearchQuery,
    companySearchQuery,
    selectedNationality,
    selectedCompanyFilter,
    selectedProfession,
    selectedProject,
    residenceStatus,
    contractStatus,
    hasHealthInsuranceExpiry,
    healthInsuranceExpiryStatus,
    hasPassport,
    hasBankAccount,
    birthDateRange,
    joiningDateRange,
    passportNumberSearch,
    residenceNumberSearch,
    commercialRegStatus,
    companyDateFilter,
    powerSubscriptionStatus,
    moqeemSubscriptionStatus,
    employeeCountFilter,
    availableSlotsFilter,
    exemptionsFilter,
    unifiedNumberSearch,
    taxNumberSearch,
    laborSubscriptionNumberSearch,
    maxEmployeesRange,
    companyCreatedDateRange,
    companyCreatedStartDate,
    companyCreatedEndDate,
    notesSearch,
    notesFilter,
    sortDirection,
  ])

  // ---- Active filters count ----
  const calculateActiveFiltersCount = useCallback(() => {
    let count = 0
    if (activeTab === 'employees') {
      if (employeeSearchQuery.trim()) count++
      if (selectedNationality.length > 0) count++
      if (selectedCompanyFilter !== 'all') count++
      if (selectedProfession.length > 0) count++
      if (selectedProject !== 'all') count++
      if (residenceStatus !== 'all') count++
      if (contractStatus !== 'all') count++
      if (hasHealthInsuranceExpiry !== 'all') count++
      if (healthInsuranceExpiryStatus !== 'all') count++
      if (hasPassport !== 'all') count++
      if (hasBankAccount !== 'all') count++
      if (birthDateRange !== 'all') count++
      if (joiningDateRange !== 'all') count++
      if (passportNumberSearch.trim()) count++
      if (residenceNumberSearch.trim()) count++
    } else {
      if (companySearchQuery.trim()) count++
      if (commercialRegStatus !== 'all') count++
      if (companyDateFilter !== 'all') count++
      if (exemptionsFilter !== 'all') count++
      if (powerSubscriptionStatus !== 'all') count++
      if (moqeemSubscriptionStatus !== 'all') count++
      if (employeeCountFilter !== 'all') count++
      if (availableSlotsFilter !== 'all') count++
      if (unifiedNumberSearch.trim()) count++
      if (taxNumberSearch.trim()) count++
      if (laborSubscriptionNumberSearch.trim()) count++
      if (maxEmployeesRange !== 'all') count++
      if (companyCreatedDateRange !== 'all') count++
      if (notesFilter !== 'all') count++
    }
    return count
  }, [
    activeTab,
    employeeSearchQuery,
    selectedNationality,
    selectedCompanyFilter,
    selectedProfession,
    selectedProject,
    residenceStatus,
    contractStatus,
    hasHealthInsuranceExpiry,
    healthInsuranceExpiryStatus,
    hasPassport,
    hasBankAccount,
    birthDateRange,
    joiningDateRange,
    passportNumberSearch,
    residenceNumberSearch,
    companySearchQuery,
    commercialRegStatus,
    companyDateFilter,
    exemptionsFilter,
    powerSubscriptionStatus,
    moqeemSubscriptionStatus,
    employeeCountFilter,
    availableSlotsFilter,
    unifiedNumberSearch,
    taxNumberSearch,
    laborSubscriptionNumberSearch,
    maxEmployeesRange,
    companyCreatedDateRange,
    notesFilter,
  ])

  // ---- Clear filters ----
  const clearFilters = useCallback(() => {
    if (activeTab === 'employees') {
      setEmployeeSearchQuery('')
      setSelectedNationality([])
      setSelectedCompanyFilter('all')
      setSelectedProfession([])
      setSelectedProject('all')
      setResidenceStatus('all')
      setContractStatus('all')
      setHasHealthInsuranceExpiry('all')
      setHealthInsuranceExpiryStatus('all')
      setHasPassport('all')
      setHasBankAccount('all')
      setBirthDateRange('all')
      setJoiningDateRange('all')
      setPassportNumberSearch('')
      setResidenceNumberSearch('')
    } else {
      setCompanySearchQuery('')
      setCommercialRegStatus('all')
      setCompanyDateFilter('all')
      setExemptionsFilter('all')
      setPowerSubscriptionStatus('all')
      setMoqeemSubscriptionStatus('all')
      setEmployeeCountFilter('all')
      setAvailableSlotsFilter('all')
      setUnifiedNumberSearch('')
      setTaxNumberSearch('')
      setLaborSubscriptionNumberSearch('')
      setNotesSearch('')
      setNotesFilter('all')
      setMaxEmployeesRange('all')
      setCompanyCreatedDateRange('all')
      setCompanyCreatedStartDate('')
      setCompanyCreatedEndDate('')
    }
    setSortDirection('asc')
    setCurrentPage(1)
  }, [activeTab])

  // ---- Load saved search into state ----
  const loadSavedSearch = useCallback((saved: SavedSearch) => {
    const savedType = saved.search_type === 'both' ? 'employees' : (saved.search_type as TabType)
    setActiveTab(savedType)
    if (savedType === 'employees') {
      setEmployeeSearchQuery(saved.search_query || '')
    } else {
      setCompanySearchQuery(saved.search_query || '')
    }
    if (saved.filters) {
      if (savedType === 'employees') {
        setSelectedNationality(normalizeSavedFilterArray(saved.filters.nationality))
        setSelectedCompanyFilter(saved.filters.company || 'all')
        setSelectedProfession(normalizeSavedFilterArray(saved.filters.profession))
        setSelectedProject(saved.filters.project || 'all')
        setResidenceStatus((saved.filters.residenceStatus as ResidenceStatus) || 'all')
        setContractStatus((saved.filters.contractStatus as ContractStatus) || 'all')
        setHasHealthInsuranceExpiry(String(saved.filters.hasHealthInsuranceExpiry ?? 'all'))
        setHealthInsuranceExpiryStatus(saved.filters.healthInsuranceExpiryStatus || 'all')
        setHasPassport(String(saved.filters.hasPassport ?? 'all'))
        setHasBankAccount(String(saved.filters.hasBankAccount ?? 'all'))
        setBirthDateRange(saved.filters.birthDateRange || 'all')
        setJoiningDateRange(saved.filters.joiningDateRange || 'all')
        setPassportNumberSearch(saved.filters.passportNumberSearch || '')
        setResidenceNumberSearch(saved.filters.residenceNumberSearch || '')
      } else {
        setCommercialRegStatus((saved.filters.commercialRegStatus as CommercialRegStatus) || 'all')
        setCompanyDateFilter(
          (saved.filters.companyDateFilter as 'all' | 'commercial_expiring') || 'all'
        )
        setPowerSubscriptionStatus(saved.filters.powerSubscriptionStatus || 'all')
        setMoqeemSubscriptionStatus(saved.filters.moqeemSubscriptionStatus || 'all')
        setEmployeeCountFilter(saved.filters.employeeCountFilter || 'all')
        setAvailableSlotsFilter(saved.filters.availableSlotsFilter || 'all')
        setExemptionsFilter(saved.filters.exemptionsFilter || 'all')
        setUnifiedNumberSearch(saved.filters.unifiedNumberSearch || '')
        setTaxNumberSearch(saved.filters.taxNumberSearch || '')
        setLaborSubscriptionNumberSearch(saved.filters.laborSubscriptionNumberSearch || '')
        setNotesSearch(saved.filters.notesSearch || '')
        setNotesFilter((saved.filters.notesFilter as 'all' | 'has_notes' | 'no_notes') || 'all')
        setMaxEmployeesRange(saved.filters.maxEmployeesRange || 'all')
        setCompanyCreatedDateRange(saved.filters.companyCreatedDateRange || 'all')
        setCompanyCreatedStartDate(saved.filters.companyCreatedStartDate || '')
        setCompanyCreatedEndDate(saved.filters.companyCreatedEndDate || '')
      }
    }
    setCurrentPage(1)
    toast.success(`تم تحميل البحث: ${saved.name}`)
  }, [])

  // ---- Pagination helpers ----
  const totalResults =
    activeTab === 'employees' ? filteredEmployees.length : filteredCompanies.length
  const totalPages = Math.ceil(totalResults / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex)
  const paginatedCompanies = filteredCompanies.slice(startIndex, endIndex)

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const goToPreviousPage = useCallback(() => {
    setCurrentPage((prev) => {
      if (prev > 1) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return prev - 1
      }
      return prev
    })
  }, [])

  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) => {
      if (prev < totalPages) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return prev + 1
      }
      return prev
    })
  }, [totalPages])

  const getPageNumbers = useCallback(() => {
    const nums: number[] = []
    const max = 5
    let start = Math.max(1, currentPage - Math.floor(max / 2))
    const end = Math.min(totalPages, start + max - 1)
    if (end - start + 1 < max) start = Math.max(1, end - max + 1)
    for (let i = start; i <= end; i++) nums.push(i)
    return nums
  }, [currentPage, totalPages])

  // ---- Employee / Company card handlers ----
  const handleEmployeeClick = useCallback(async (employee: EmployeeType) => {
    try {
      const { data: empData, error } = await supabase
        .from('employees')
        .select(
          'id,company_id,name,profession,nationality,birth_date,phone,passport_number,residence_number,joining_date,contract_expiry,residence_expiry,project_name,bank_account,residence_image_url,salary,health_insurance_expiry,additional_fields,created_at,updated_at,notes,hired_worker_contract_expiry,project_id,is_deleted,deleted_at, companies(id,name,unified_number,labor_subscription_number,commercial_registration_expiry,social_insurance_expiry,ending_subscription_power_date,ending_subscription_moqeem_date,ending_subscription_insurance_date,commercial_registration_status,social_insurance_status,current_employees,max_employees,additional_fields,created_at,updated_at,notes,exemptions,social_insurance_number,company_type,employee_count)'
        )
        .eq('id', employee.id)
        .single()

      if (error) throw error
      if (empData) {
        const employeeWithCompany = {
          ...empData,
          company:
            Array.isArray(empData.companies) && empData.companies.length > 0
              ? empData.companies[0]
              : empData.companies || null,
        }
        if ('companies' in employeeWithCompany) {
          delete (employeeWithCompany as EmployeeType & { companies?: CompanyType | CompanyType[] })
            .companies
        }
        if (employeeWithCompany.company) {
          setSelectedEmployee(employeeWithCompany as EmployeeType & { company: CompanyType })
          setIsEmployeeCardOpen(true)
        } else {
          toast.error('فشل تحميل بيانات المؤسسة المرتبطة بالموظف')
        }
      } else {
        toast.error('فشل تحميل بيانات الموظف')
      }
    } catch (error) {
      console.error('Error loading employee:', error)
      toast.error('حدث خطأ أثناء تحميل البيانات')
    }
  }, [])

  const handleCompanyClick = useCallback((company: CompanyType) => {
    setSelectedCompanyForDetail(company)
    setShowCompanyDetailModal(true)
  }, [])

  const handleCloseEmployeeCard = useCallback(() => {
    setIsEmployeeCardOpen(false)
    setSelectedEmployee(null)
  }, [])

  const handleCloseCompanyModal = useCallback(() => {
    setIsCompanyModalOpen(false)
    setSelectedCompany(null)
  }, [])

  const handleCloseCompanyDetailModal = useCallback(() => {
    setShowCompanyDetailModal(false)
    setSelectedCompanyForDetail(null)
  }, [])

  const handleEditCompanyFromDetail = useCallback((company: CompanyType) => {
    setShowCompanyDetailModal(false)
    setSelectedCompany(company)
    setIsCompanyModalOpen(true)
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDeleteCompanyFromDetail = useCallback((_company: CompanyType) => {
    setShowCompanyDetailModal(false)
  }, [])

  const handleEmployeeUpdate = useCallback(async () => {
    await loadData()
  }, [loadData])

  const handleCompanyUpdate = useCallback(async () => {
    await loadData()
    handleCloseCompanyModal()
  }, [loadData, handleCloseCompanyModal])

  const saveSearch = useCallback(async () => {
    if (!userId) {
      toast.error('يجب تسجيل الدخول لحفظ البحث')
      return
    }

    const searchName = prompt('أدخل اسمًا لهذا البحث:')
    if (!searchName || !searchName.trim()) return

    try {
      const currentSearchQuery =
        activeTab === 'employees' ? employeeSearchQuery : companySearchQuery
      const filters: SavedSearchFilters = {}

      if (activeTab === 'employees') {
        filters.nationality = selectedNationality
        filters.company = selectedCompanyFilter
        filters.profession = selectedProfession
        filters.project = selectedProject
        filters.residenceStatus = residenceStatus
        filters.contractStatus = contractStatus
        filters.hasHealthInsuranceExpiry = hasHealthInsuranceExpiry
        filters.healthInsuranceExpiryStatus = healthInsuranceExpiryStatus
        filters.hasPassport = hasPassport
        filters.hasBankAccount = hasBankAccount
        filters.birthDateRange = birthDateRange
        filters.joiningDateRange = joiningDateRange
        filters.passportNumberSearch = passportNumberSearch
        filters.residenceNumberSearch = residenceNumberSearch
      } else {
        filters.commercialRegStatus = commercialRegStatus
        filters.companyDateFilter = companyDateFilter
        filters.powerSubscriptionStatus = powerSubscriptionStatus
        filters.moqeemSubscriptionStatus = moqeemSubscriptionStatus
        filters.employeeCountFilter = employeeCountFilter
        filters.availableSlotsFilter = availableSlotsFilter
        filters.exemptionsFilter = exemptionsFilter
        filters.unifiedNumberSearch = unifiedNumberSearch
        filters.taxNumberSearch = taxNumberSearch
        filters.laborSubscriptionNumberSearch = laborSubscriptionNumberSearch
        filters.notesSearch = notesSearch
        filters.notesFilter = notesFilter
        filters.maxEmployeesRange = maxEmployeesRange
        filters.companyCreatedDateRange = companyCreatedDateRange
        filters.companyCreatedStartDate = companyCreatedStartDate
        filters.companyCreatedEndDate = companyCreatedEndDate
      }

      const { error } = await supabase.from('saved_searches').insert({
        user_id: userId,
        name: searchName.trim(),
        search_type: activeTab,
        search_query: currentSearchQuery,
        filters,
      })

      if (error) throw error

      toast.success('تم حفظ البحث بنجاح')
      loadSavedSearches()
    } catch (error) {
      console.error('Error saving search:', error)
      const errorMessage = error instanceof Error ? error.message : 'فشل حفظ البحث'
      toast.error(errorMessage)
    }
  }, [
    activeTab,
    employeeSearchQuery,
    companySearchQuery,
    selectedNationality,
    selectedCompanyFilter,
    selectedProfession,
    selectedProject,
    residenceStatus,
    contractStatus,
    hasHealthInsuranceExpiry,
    healthInsuranceExpiryStatus,
    hasPassport,
    hasBankAccount,
    birthDateRange,
    joiningDateRange,
    passportNumberSearch,
    residenceNumberSearch,
    commercialRegStatus,
    companyDateFilter,
    powerSubscriptionStatus,
    moqeemSubscriptionStatus,
    employeeCountFilter,
    availableSlotsFilter,
    exemptionsFilter,
    unifiedNumberSearch,
    taxNumberSearch,
    laborSubscriptionNumberSearch,
    notesSearch,
    notesFilter,
    maxEmployeesRange,
    companyCreatedDateRange,
    companyCreatedStartDate,
    companyCreatedEndDate,
    userId,
    loadSavedSearches,
  ])

  const deleteSavedSearch = useCallback(
    async (id: string) => {
      try {
        await supabase.from('saved_searches').delete().eq('id', id)
        toast.success('تم حذف البحث المحفوظ')
        loadSavedSearches()
      } catch (error) {
        console.error('Error deleting saved search:', error)
        toast.error('فشل حذف البحث')
      }
    },
    [loadSavedSearches]
  )

  const exportResults = useCallback(async () => {
    const XLSX = await loadXlsx()

    if (activeTab === 'employees') {
      const employeeData = filteredEmployees.map((emp) => ({
        الاسم: emp.name,
        المهنة: emp.profession,
        الجنسية: emp.nationality,
        الجوال: emp.phone,
        'انتهاء الإقامة': emp.residence_expiry,
        'انتهاء العقد': emp.contract_expiry,
        المؤسسة: getCompanyName(emp),
      }))

      const worksheet = XLSX.utils.json_to_sheet(employeeData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'نتائج البحث - موظفين')
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      saveAs(blob, `نتائج_البحث_موظفين_${new Date().toISOString().split('T')[0]}.xlsx`)
    } else {
      const companyData = filteredCompanies.map((comp) => ({
        'اسم المؤسسة': comp.name,
        'رقم اشتراك التأمينات الاجتماعية': comp.social_insurance_number || '',
        'رقم موحد': comp.unified_number,
        'انتهاء السجل التجاري': comp.commercial_registration_expiry,
      }))

      const worksheet = XLSX.utils.json_to_sheet(companyData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'نتائج البحث - مؤسسات')
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      saveAs(blob, `نتائج_البحث_مؤسسات_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    toast.success('تم تصدير النتائج بنجاح')
  }, [activeTab, filteredEmployees, filteredCompanies])

  return {
    // Tab
    activeTab,
    setActiveTab,
    // Search queries
    employeeSearchQuery,
    setEmployeeSearchQuery,
    companySearchQuery,
    setCompanySearchQuery,
    // Data
    employees,
    companies,
    filteredEmployees,
    filteredCompanies,
    isLoading,
    // Saved searches
    savedSearches,
    showFiltersModal,
    setShowFiltersModal,
    // View / pagination
    viewMode,
    setViewMode,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalResults,
    totalPages,
    startIndex,
    endIndex,
    paginatedEmployees,
    paginatedCompanies,
    // Employee filter states
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
    hasHealthInsuranceExpiry,
    setHasHealthInsuranceExpiry,
    healthInsuranceExpiryStatus,
    setHealthInsuranceExpiryStatus,
    hasPassport,
    setHasPassport,
    hasBankAccount,
    setHasBankAccount,
    birthDateRange,
    setBirthDateRange,
    joiningDateRange,
    setJoiningDateRange,
    passportNumberSearch,
    setPassportNumberSearch,
    residenceNumberSearch,
    setResidenceNumberSearch,
    // Company filter states
    commercialRegStatus,
    setCommercialRegStatus,
    companyDateFilter,
    setCompanyDateFilter,
    powerSubscriptionStatus,
    setPowerSubscriptionStatus,
    moqeemSubscriptionStatus,
    setMoqeemSubscriptionStatus,
    employeeCountFilter,
    setEmployeeCountFilter,
    availableSlotsFilter,
    setAvailableSlotsFilter,
    exemptionsFilter,
    setExemptionsFilter,
    unifiedNumberSearch,
    setUnifiedNumberSearch,
    taxNumberSearch,
    setTaxNumberSearch,
    laborSubscriptionNumberSearch,
    setLaborSubscriptionNumberSearch,
    maxEmployeesRange,
    setMaxEmployeesRange,
    companyCreatedDateRange,
    setCompanyCreatedDateRange,
    companyCreatedStartDate,
    setCompanyCreatedStartDate,
    companyCreatedEndDate,
    setCompanyCreatedEndDate,
    notesSearch,
    setNotesSearch,
    notesFilter,
    setNotesFilter,
    // Sort
    sortDirection,
    setSortDirection,
    // Filter lists
    nationalities,
    companyList,
    professions,
    projects,
    // Modal states
    selectedEmployee,
    isEmployeeCardOpen,
    selectedCompany,
    isCompanyModalOpen,
    showCompanyDetailModal,
    selectedCompanyForDetail,
    // Computed
    calculateActiveFiltersCount,
    // Actions
    clearFilters,
    saveSearch,
    loadSavedSearch,
    deleteSavedSearch,
    exportResults,
    goToPage,
    goToPreviousPage,
    goToNextPage,
    getPageNumbers,
    handleEmployeeClick,
    handleCompanyClick,
    handleCloseEmployeeCard,
    handleCloseCompanyModal,
    handleCloseCompanyDetailModal,
    handleEditCompanyFromDetail,
    handleDeleteCompanyFromDetail,
    handleEmployeeUpdate,
    handleCompanyUpdate,
  }
}
