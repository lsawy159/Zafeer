/**
 * Orchestrates all Advanced Search state, filter logic, pagination, and modals.
 * Data loading / export / saved-search CRUD is delegated to useAdvancedSearchData.
 */
import { useState, useCallback, useEffect } from 'react'
import { supabase, Company as CompanyType, Employee as EmployeeType } from '@/lib/supabase'
import { toast } from 'sonner'
import type {
  SavedSearch,
  TabType,
  ResidenceStatus,
  ContractStatus,
  CommercialRegStatus,
  ViewMode,
} from '@/hooks/advancedSearchTypes'
import { useAdvancedSearchData } from '@/hooks/useAdvancedSearchData'
import { applyAdvancedSearchFilters } from '@/hooks/advancedSearchFilterFn'

export type {
  SavedSearchFilters,
  SavedSearch,
  TabType,
  ResidenceStatus,
  ContractStatus,
  CommercialRegStatus,
  ViewMode,
} from '@/hooks/advancedSearchTypes'

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

  // ---- Filter results ----
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeType[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<CompanyType[]>([])

  // ---- View / pagination ----
  const [showFiltersModal, setShowFiltersModal] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // ---- Employee filter states ----
  const [selectedNationality, setSelectedNationality] = useState<string>('all')
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all')
  const [selectedProfession, setSelectedProfession] = useState<string>('all')
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

  // ---- Modal states ----
  const [selectedEmployee, setSelectedEmployee] = useState<
    (EmployeeType & { company: CompanyType }) | null
  >(null)
  const [isEmployeeCardOpen, setIsEmployeeCardOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<CompanyType | null>(null)
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false)
  const [showCompanyDetailModal, setShowCompanyDetailModal] = useState(false)
  const [selectedCompanyForDetail, setSelectedCompanyForDetail] = useState<CompanyType | null>(null)

  // ---- Data layer ----
  const data = useAdvancedSearchData({
    userId,
    activeTab,
    filteredEmployees,
    filteredCompanies,
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
  })

  // ---- Filter logic (delegated to pure function) ----
  const applyFilters = useCallback(() => {
    const { filteredEmployees: emps, filteredCompanies: comps } = applyAdvancedSearchFilters({
      employees: data.employees,
      companies: data.companies,
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
    })
    setFilteredEmployees(emps)
    setFilteredCompanies(comps)
  }, [
    data.employees, data.companies,
    employeeSearchQuery, companySearchQuery,
    selectedNationality, selectedCompanyFilter, selectedProfession, selectedProject,
    residenceStatus, contractStatus,
    hasHealthInsuranceExpiry, healthInsuranceExpiryStatus,
    hasPassport, hasBankAccount, birthDateRange, joiningDateRange,
    passportNumberSearch, residenceNumberSearch,
    commercialRegStatus, companyDateFilter,
    powerSubscriptionStatus, moqeemSubscriptionStatus,
    employeeCountFilter, availableSlotsFilter, exemptionsFilter,
    unifiedNumberSearch, taxNumberSearch, laborSubscriptionNumberSearch,
    maxEmployeesRange, companyCreatedDateRange, companyCreatedStartDate, companyCreatedEndDate,
    notesSearch, notesFilter,
  ])

  useEffect(() => {
    applyFilters()
    setCurrentPage(1)
  }, [applyFilters])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

  // ---- Active filters count ----
  const calculateActiveFiltersCount = useCallback(() => {
    let count = 0
    if (activeTab === 'employees') {
      if (employeeSearchQuery.trim()) count++
      if (selectedNationality !== 'all') count++
      if (selectedCompanyFilter !== 'all') count++
      if (selectedProfession !== 'all') count++
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
    }
    return count
  }, [
    activeTab, employeeSearchQuery, selectedNationality, selectedCompanyFilter,
    selectedProfession, selectedProject, residenceStatus, contractStatus,
    hasHealthInsuranceExpiry, healthInsuranceExpiryStatus, hasPassport, hasBankAccount,
    birthDateRange, joiningDateRange, passportNumberSearch, residenceNumberSearch,
    companySearchQuery, commercialRegStatus, companyDateFilter, exemptionsFilter,
    powerSubscriptionStatus, moqeemSubscriptionStatus, employeeCountFilter, availableSlotsFilter,
    unifiedNumberSearch, taxNumberSearch, laborSubscriptionNumberSearch,
    maxEmployeesRange, companyCreatedDateRange,
  ])

  // ---- Clear filters ----
  const clearFilters = useCallback(() => {
    if (activeTab === 'employees') {
      setEmployeeSearchQuery(''); setSelectedNationality('all')
      setSelectedCompanyFilter('all'); setSelectedProfession('all')
      setSelectedProject('all'); setResidenceStatus('all')
      setContractStatus('all'); setHasHealthInsuranceExpiry('all')
      setHealthInsuranceExpiryStatus('all'); setHasPassport('all')
      setHasBankAccount('all'); setBirthDateRange('all')
      setJoiningDateRange('all'); setPassportNumberSearch('')
      setResidenceNumberSearch('')
    } else {
      setCompanySearchQuery(''); setCommercialRegStatus('all')
      setCompanyDateFilter('all'); setExemptionsFilter('all')
      setPowerSubscriptionStatus('all'); setMoqeemSubscriptionStatus('all')
      setEmployeeCountFilter('all'); setAvailableSlotsFilter('all')
      setUnifiedNumberSearch(''); setTaxNumberSearch('')
      setLaborSubscriptionNumberSearch(''); setNotesSearch('')
      setNotesFilter('all'); setMaxEmployeesRange('all')
      setCompanyCreatedDateRange('all'); setCompanyCreatedStartDate('')
      setCompanyCreatedEndDate('')
    }
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
        setSelectedNationality(saved.filters.nationality || 'all')
        setSelectedCompanyFilter(saved.filters.company || 'all')
        setSelectedProfession(saved.filters.profession || 'all')
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
      if (prev > 1) { window.scrollTo({ top: 0, behavior: 'smooth' }); return prev - 1 }
      return prev
    })
  }, [])

  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) => {
      if (prev < totalPages) { window.scrollTo({ top: 0, behavior: 'smooth' }); return prev + 1 }
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
      toast.error('حدث خطأ أثناء تحميل بيانات الموظف')
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
    await data.loadData()
  }, [data.loadData])

  const handleCompanyUpdate = useCallback(async () => {
    await data.loadData()
    handleCloseCompanyModal()
  }, [data.loadData, handleCloseCompanyModal])

  return {
    // Tab
    activeTab, setActiveTab,
    // Search queries
    employeeSearchQuery, setEmployeeSearchQuery,
    companySearchQuery, setCompanySearchQuery,
    // Data
    employees: data.employees,
    companies: data.companies,
    filteredEmployees,
    filteredCompanies,
    isLoading: data.isLoading,
    // Saved searches
    savedSearches: data.savedSearches,
    showFiltersModal, setShowFiltersModal,
    // View / pagination
    viewMode, setViewMode,
    currentPage, setCurrentPage,
    itemsPerPage, setItemsPerPage,
    totalResults, totalPages, startIndex, endIndex,
    paginatedEmployees, paginatedCompanies,
    // Employee filter states
    selectedNationality, setSelectedNationality,
    selectedCompanyFilter, setSelectedCompanyFilter,
    selectedProfession, setSelectedProfession,
    selectedProject, setSelectedProject,
    residenceStatus, setResidenceStatus,
    contractStatus, setContractStatus,
    hasHealthInsuranceExpiry, setHasHealthInsuranceExpiry,
    healthInsuranceExpiryStatus, setHealthInsuranceExpiryStatus,
    hasPassport, setHasPassport,
    hasBankAccount, setHasBankAccount,
    birthDateRange, setBirthDateRange,
    joiningDateRange, setJoiningDateRange,
    passportNumberSearch, setPassportNumberSearch,
    residenceNumberSearch, setResidenceNumberSearch,
    // Company filter states
    commercialRegStatus, setCommercialRegStatus,
    companyDateFilter, setCompanyDateFilter,
    powerSubscriptionStatus, setPowerSubscriptionStatus,
    moqeemSubscriptionStatus, setMoqeemSubscriptionStatus,
    employeeCountFilter, setEmployeeCountFilter,
    availableSlotsFilter, setAvailableSlotsFilter,
    exemptionsFilter, setExemptionsFilter,
    unifiedNumberSearch, setUnifiedNumberSearch,
    taxNumberSearch, setTaxNumberSearch,
    laborSubscriptionNumberSearch, setLaborSubscriptionNumberSearch,
    maxEmployeesRange, setMaxEmployeesRange,
    companyCreatedDateRange, setCompanyCreatedDateRange,
    companyCreatedStartDate, setCompanyCreatedStartDate,
    companyCreatedEndDate, setCompanyCreatedEndDate,
    notesSearch, setNotesSearch,
    notesFilter, setNotesFilter,
    // Filter lists
    nationalities: data.nationalities,
    companyList: data.companyList,
    professions: data.professions,
    projects: data.projects,
    // Modal states
    selectedEmployee, isEmployeeCardOpen,
    selectedCompany, isCompanyModalOpen,
    showCompanyDetailModal, selectedCompanyForDetail,
    // Computed
    calculateActiveFiltersCount,
    // Actions
    clearFilters,
    saveSearch: data.saveSearch,
    loadSavedSearch,
    deleteSavedSearch: data.deleteSavedSearch,
    exportResults: data.exportResults,
    goToPage, goToPreviousPage, goToNextPage, getPageNumbers,
    handleEmployeeClick, handleCompanyClick,
    handleCloseEmployeeCard, handleCloseCompanyModal,
    handleCloseCompanyDetailModal, handleEditCompanyFromDetail,
    handleDeleteCompanyFromDetail, handleEmployeeUpdate, handleCompanyUpdate,
  }
}
