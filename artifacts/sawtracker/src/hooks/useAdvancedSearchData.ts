/**
 * Handles data loading: employees, companies, saved searches, export.
 * Pure data concerns — no filter logic here.
 */
import { useState, useCallback, useEffect } from 'react'
import { supabase, Company as CompanyType, Employee as EmployeeType } from '@/lib/supabase'
import { toast } from 'sonner'
import { saveAs } from 'file-saver'
import { loadXlsx } from '@/utils/lazyXlsx'
import { getCompanyName } from '@/hooks/useAdvancedSearchFilters'
import type { SavedSearch, SavedSearchFilters, TabType } from '@/hooks/advancedSearchTypes'

interface UseAdvancedSearchDataOptions {
  userId: string | undefined
  activeTab: TabType
  filteredEmployees: EmployeeType[]
  filteredCompanies: CompanyType[]
  // Current filter state (needed for saveSearch snapshot)
  employeeSearchQuery: string
  companySearchQuery: string
  selectedNationality: string
  selectedCompanyFilter: string
  selectedProfession: string
  selectedProject: string
  residenceStatus: string
  contractStatus: string
  hasHealthInsuranceExpiry: string
  healthInsuranceExpiryStatus: string
  hasPassport: string
  hasBankAccount: string
  birthDateRange: string
  joiningDateRange: string
  passportNumberSearch: string
  residenceNumberSearch: string
  commercialRegStatus: string
  companyDateFilter: string
  powerSubscriptionStatus: string
  moqeemSubscriptionStatus: string
  employeeCountFilter: string
  availableSlotsFilter: string
  exemptionsFilter: string
  unifiedNumberSearch: string
  taxNumberSearch: string
  laborSubscriptionNumberSearch: string
  notesSearch: string
  notesFilter: 'all' | 'has_notes' | 'no_notes'
  maxEmployeesRange: string
  companyCreatedDateRange: string
  companyCreatedStartDate: string
  companyCreatedEndDate: string
}

export function useAdvancedSearchData(opts: UseAdvancedSearchDataOptions) {
  const [employees, setEmployees] = useState<EmployeeType[]>([])
  const [companies, setCompanies] = useState<CompanyType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])

  // Filter lists (derived from loaded data)
  const [nationalities, setNationalities] = useState<string[]>([])
  const [companyList, setCompanyList] = useState<{ id: string; name: string }[]>([])
  const [professions, setProfessions] = useState<string[]>([])
  const [projects, setProjects] = useState<string[]>([])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: employeesData } = await supabase
        .from('employees')
        .select(
          'id,company_id,name,profession,nationality,birth_date,phone,passport_number,residence_number,joining_date,contract_expiry,residence_expiry,project_name,bank_account,residence_image_url,salary,health_insurance_expiry,additional_fields,created_at,updated_at,notes,hired_worker_contract_expiry,project_id,is_deleted,deleted_at, companies(name)'
        )
        .order('name')

      if (employeesData) {
        setEmployees(employeesData)
        setNationalities(
          [...new Set(employeesData.map((e) => e.nationality).filter(Boolean))].sort()
        )
        setProfessions(
          [...new Set(employeesData.map((e) => e.profession).filter(Boolean))].sort()
        )
        setProjects(
          [...new Set(employeesData.map((e) => e.project_name).filter(Boolean))].sort()
        )
      }

      const { data: companiesData } = await supabase
        .from('companies')
        .select(
          'id,name,unified_number,labor_subscription_number,commercial_registration_expiry,social_insurance_expiry,ending_subscription_power_date,ending_subscription_moqeem_date,ending_subscription_insurance_date,commercial_registration_status,social_insurance_status,current_employees,max_employees,additional_fields,created_at,updated_at,notes,exemptions,social_insurance_number,company_type,employee_count'
        )
        .order('name')

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
  }, [])

  const loadSavedSearches = useCallback(async () => {
    if (!opts.userId) return
    const { data, error } = await supabase
      .from('saved_searches')
      .select('id,user_id,name,search_query,search_type,filters,created_at,updated_at')
      .eq('user_id', opts.userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading saved searches:', error)
      return
    }
    if (data) setSavedSearches(data)
  }, [opts.userId])

  useEffect(() => {
    loadData()
    loadSavedSearches()
  }, [loadData, loadSavedSearches])

  const saveSearch = useCallback(async () => {
    if (!opts.userId) {
      toast.error('يجب تسجيل الدخول لحفظ البحث')
      return
    }

    const searchName = prompt('أدخل اسماً لهذا البحث:')
    if (!searchName || !searchName.trim()) return

    try {
      const currentSearchQuery =
        opts.activeTab === 'employees' ? opts.employeeSearchQuery : opts.companySearchQuery
      const filters: SavedSearchFilters = {}

      if (opts.activeTab === 'employees') {
        filters.nationality = opts.selectedNationality
        filters.company = opts.selectedCompanyFilter
        filters.profession = opts.selectedProfession
        filters.project = opts.selectedProject
        filters.residenceStatus = opts.residenceStatus
        filters.contractStatus = opts.contractStatus
        filters.hasHealthInsuranceExpiry = opts.hasHealthInsuranceExpiry
        filters.healthInsuranceExpiryStatus = opts.healthInsuranceExpiryStatus
        filters.hasPassport = opts.hasPassport
        filters.hasBankAccount = opts.hasBankAccount
        filters.birthDateRange = opts.birthDateRange
        filters.joiningDateRange = opts.joiningDateRange
        filters.passportNumberSearch = opts.passportNumberSearch
        filters.residenceNumberSearch = opts.residenceNumberSearch
      } else {
        filters.commercialRegStatus = opts.commercialRegStatus
        filters.companyDateFilter = opts.companyDateFilter
        filters.powerSubscriptionStatus = opts.powerSubscriptionStatus
        filters.moqeemSubscriptionStatus = opts.moqeemSubscriptionStatus
        filters.employeeCountFilter = opts.employeeCountFilter
        filters.availableSlotsFilter = opts.availableSlotsFilter
        filters.exemptionsFilter = opts.exemptionsFilter
        filters.unifiedNumberSearch = opts.unifiedNumberSearch
        filters.taxNumberSearch = opts.taxNumberSearch
        filters.laborSubscriptionNumberSearch = opts.laborSubscriptionNumberSearch
        filters.notesSearch = opts.notesSearch
        filters.notesFilter = opts.notesFilter
        filters.maxEmployeesRange = opts.maxEmployeesRange
        filters.companyCreatedDateRange = opts.companyCreatedDateRange
        filters.companyCreatedStartDate = opts.companyCreatedStartDate
        filters.companyCreatedEndDate = opts.companyCreatedEndDate
      }

      const { error } = await supabase.from('saved_searches').insert({
        user_id: opts.userId,
        name: searchName.trim(),
        search_type: opts.activeTab,
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
  }, [opts, loadSavedSearches])

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

    if (opts.activeTab === 'employees') {
      const employeeData = opts.filteredEmployees.map((emp) => ({
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
      const companyData = opts.filteredCompanies.map((comp) => ({
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
  }, [opts.activeTab, opts.filteredEmployees, opts.filteredCompanies])

  return {
    employees,
    companies,
    isLoading,
    savedSearches,
    nationalities,
    companyList,
    professions,
    projects,
    loadData,
    loadSavedSearches,
    saveSearch,
    deleteSavedSearch,
    exportResults,
  }
}
