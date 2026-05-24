import { useState, useMemo } from 'react'
import { type Employee, type Company, type Project } from '@/lib/supabase'
import { type EmployeeNotificationThresholds } from '@/utils/employeeAlerts'
import { getStatusForField, hasAlert, COLOR_THRESHOLD_FALLBACK } from '@/pages/employees/employeeUtils'

type SortField =
  | 'name'
  | 'profession'
  | 'nationality'
  | 'company'
  | 'project'
  | 'contract_expiry'
  | 'hired_worker_contract_expiry'
  | 'residence_expiry'
  | 'health_insurance_expiry'

type EmployeeWithCompany = Employee & { company: Company; project?: Project }

interface UseEmployeeFiltersParams {
  employees: EmployeeWithCompany[]
  colorThresholds: EmployeeNotificationThresholds | null
}

export function useEmployeeFilters({ employees, colorThresholds }: UseEmployeeFiltersParams) {
  const [searchTerm, setSearchTerm] = useState('')
  const [residenceNumberSearch, setResidenceNumberSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [nationalityFilter, setNationalityFilter] = useState('')
  const [professionFilter, setProfessionFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [contractFilter, setContractFilter] = useState('')
  const [hiredWorkerContractFilter, setHiredWorkerContractFilter] = useState('')
  const [residenceFilter, setResidenceFilter] = useState('')
  const [healthInsuranceFilter, setHealthInsuranceFilter] = useState('')
  const [showAlertsOnly, setShowAlertsOnly] = useState(false)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const thresholds = colorThresholds ?? COLOR_THRESHOLD_FALLBACK

  const filteredEmployees = useMemo(
    () =>
      employees.filter((emp) => {
        const contractStatus = getStatusForField(emp.contract_expiry, 'contract', thresholds)
        const hiredWorkerStatus = getStatusForField(emp.hired_worker_contract_expiry, 'hired_worker_contract', thresholds)
        const residenceStatus = getStatusForField(emp.residence_expiry, 'residence', thresholds)
        const insuranceStatus = getStatusForField(emp.health_insurance_expiry, 'health_insurance', thresholds)

        const searchLower = searchTerm.toLowerCase()
        const matchesSearch =
          !searchTerm ||
          emp.name.toLowerCase().includes(searchLower) ||
          (emp.residence_number ?? '').toString().toLowerCase().includes(searchLower) ||
          (emp.passport_number && emp.passport_number.toLowerCase().includes(searchLower)) ||
          (emp.profession && emp.profession.toLowerCase().includes(searchLower)) ||
          (emp.nationality && emp.nationality.toLowerCase().includes(searchLower))

        const matchesResidenceNumber =
          !residenceNumberSearch ||
          (emp.residence_number ?? '').toString().toLowerCase().includes(residenceNumberSearch.toLowerCase())

        const matchesCompany = !companyFilter || emp.company?.name === companyFilter
        const matchesNationality = !nationalityFilter || emp.nationality === nationalityFilter
        const matchesProfession = !professionFilter || emp.profession === professionFilter
        const matchesProject =
          !projectFilter ||
          emp.project?.name === projectFilter ||
          (emp.project_name === projectFilter && !emp.project)

        const empHasAlert = hasAlert(
          emp.contract_expiry,
          emp.hired_worker_contract_expiry,
          emp.residence_expiry,
          emp.health_insurance_expiry,
          thresholds
        )

        const matchesContract =
          !contractFilter ||
          (contractFilter === 'لديه تنبيه' ? empHasAlert : contractStatus === contractFilter)

        const matchesHiredWorkerContract =
          !hiredWorkerContractFilter ||
          (hiredWorkerContractFilter === 'لديه تنبيه'
            ? empHasAlert
            : hiredWorkerStatus === hiredWorkerContractFilter)

        const matchesResidence =
          !residenceFilter ||
          (residenceFilter === 'لديه تنبيه' ? empHasAlert : residenceStatus === residenceFilter)

        const matchesInsurance =
          !healthInsuranceFilter ||
          (healthInsuranceFilter === 'لديه تنبيه'
            ? empHasAlert
            : insuranceStatus === healthInsuranceFilter)

        const matchesAlertsToggle = !showAlertsOnly || empHasAlert

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
      }),
    [
      employees,
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
      thresholds,
    ]
  )

   const sortedAndFilteredEmployees = useMemo(() => {
    return [...filteredEmployees].sort((a, b) => {
      // Special handling for project field to use resolved name for null checks
      if (sortField === 'project') {
        const aName = (a.project?.name || a.project_name || null)
        const bName = (b.project?.name || b.project_name || null)
        if (aName == null && bName == null) return 0
        if (aName == null) return 1
        if (bName == null) return -1
        const aValue = aName.toLowerCase()
        const bValue = bName.toLowerCase()
        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
        }
      }

      const aVal = a[sortField]
      const bVal = b[sortField]

      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

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
        case 'contract_expiry':
          aValue = new Date(aVal as string).getTime()
          bValue = new Date(bVal as string).getTime()
          break
        case 'hired_worker_contract_expiry':
          aValue = new Date(aVal as string).getTime()
          bValue = new Date(bVal as string).getTime()
          break
        case 'residence_expiry':
          aValue = new Date(aVal as string).getTime()
          bValue = new Date(bVal as string).getTime()
          break
        case 'health_insurance_expiry':
          aValue = new Date(aVal as string).getTime()
          bValue = new Date(bVal as string).getTime()
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
    })
  }, [filteredEmployees, sortField, sortDirection])

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
    healthInsuranceFilter !== '',
    showAlertsOnly,
  ].filter(Boolean).length

  const hasActiveFilters = activeFiltersCount > 0

  function clearFilters() {
    setSearchTerm('')
    setResidenceNumberSearch('')
    setCompanyFilter('')
    setNationalityFilter('')
    setProfessionFilter('')
    setProjectFilter('')
    setContractFilter('')
    setHiredWorkerContractFilter('')
    setResidenceFilter('')
    setHealthInsuranceFilter('')
    setShowAlertsOnly(false)
  }

  function applyUrlFilter(filter: string | null) {
    switch (filter) {
      case 'alerts':
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
        setHealthInsuranceFilter('منتهي')
        break
      case 'urgent-contracts':
        setContractFilter('طارئ')
        break
      case 'urgent-residences':
        setResidenceFilter('طارئ')
        break
      case 'expiring-insurance-30':
        setHealthInsuranceFilter('طارئ')
        break
      case 'expiring-insurance-60':
        setHealthInsuranceFilter('متوسط')
        break
      case 'expiring-insurance-90':
      case 'active-insurance':
        setHealthInsuranceFilter('ساري')
        break
    }
  }

  return {
    searchTerm,
    setSearchTerm,
    residenceNumberSearch,
    setResidenceNumberSearch,
    companyFilter,
    setCompanyFilter,
    nationalityFilter,
    setNationalityFilter,
    professionFilter,
    setProfessionFilter,
    projectFilter,
    setProjectFilter,
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
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    filteredEmployees,
    sortedAndFilteredEmployees,
    activeFiltersCount,
    hasActiveFilters,
    clearFilters,
    applyUrlFilter,
  }
}
