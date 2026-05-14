/**
 * Pure filter function for Advanced Search.
 * Accepts all filter state + raw data, returns filtered results.
 * No React hooks — safe to call inside a useCallback.
 */
import { Company as CompanyType, Employee as EmployeeType } from '@/lib/supabase'
import Fuse from 'fuse.js'
import { calculateCommercialRegistrationStatus } from '@/utils/autoCompanyStatus'
import { normalizeArabic } from '@/utils/textUtils'
import type {
  ResidenceStatus,
  ContractStatus,
  CommercialRegStatus,
} from '@/hooks/advancedSearchTypes'

export interface FilterParams {
  employees: EmployeeType[]
  companies: CompanyType[]
  // search
  employeeSearchQuery: string
  companySearchQuery: string
  // employee filters
  selectedNationality: string
  selectedCompanyFilter: string
  selectedProfession: string
  selectedProject: string
  residenceStatus: ResidenceStatus
  contractStatus: ContractStatus
  hasHealthInsuranceExpiry: string
  healthInsuranceExpiryStatus: string
  hasPassport: string
  hasBankAccount: string
  birthDateRange: string
  joiningDateRange: string
  passportNumberSearch: string
  residenceNumberSearch: string
  // company filters
  commercialRegStatus: CommercialRegStatus
  companyDateFilter: 'all' | 'commercial_expiring'
  powerSubscriptionStatus: string
  moqeemSubscriptionStatus: string
  employeeCountFilter: string
  availableSlotsFilter: string
  exemptionsFilter: string
  unifiedNumberSearch: string
  taxNumberSearch: string
  laborSubscriptionNumberSearch: string
  maxEmployeesRange: string
  companyCreatedDateRange: string
  companyCreatedStartDate: string
  companyCreatedEndDate: string
  notesSearch: string
  notesFilter: 'all' | 'has_notes' | 'no_notes'
}

/** Returns { filteredEmployees, filteredCompanies } after applying all filters */
export function applyAdvancedSearchFilters(p: FilterParams): {
  filteredEmployees: EmployeeType[]
  filteredCompanies: CompanyType[]
} {
  let emps = [...p.employees]
  let comps = [...p.companies]

  // Fuzzy employee search
  if (p.employeeSearchQuery.trim()) {
    const searchable = emps.map((e) => ({
      ...e,
      searchableText: [e.name, e.profession, e.nationality, e.phone].filter(Boolean).join(' '),
    }))
    const fuse = new Fuse(searchable, {
      keys: ['name', 'profession', 'nationality', 'phone', 'searchableText'],
      threshold: 0.3,
      includeScore: true,
    })
    emps = fuse.search(p.employeeSearchQuery).map((r) => r.item)
  }

  // Company search (numeric exact | fuzzy text)
  if (p.companySearchQuery.trim()) {
    const sq = p.companySearchQuery.trim()
    if (/^\d+$/.test(sq)) {
      let exact = comps.filter((c) => c.unified_number?.toString() === sq)
      if (!exact.length) exact = comps.filter((c) => c.social_insurance_number?.toString() === sq)
      comps = exact
    } else {
      const fuse = new Fuse(
        comps.map((c) => ({ ...c, searchableText: c.name || '' })),
        { keys: ['name', 'searchableText'], threshold: 0.3, includeScore: true }
      )
      comps = fuse.search(sq).map((r) => r.item)
    }
  }

  // ---- Employee filters ----
  if (p.selectedNationality !== 'all')
    emps = emps.filter((e) => e.nationality === p.selectedNationality)
  if (p.selectedCompanyFilter !== 'all')
    emps = emps.filter((e) => e.company_id === p.selectedCompanyFilter)
  if (p.selectedProfession !== 'all')
    emps = emps.filter((e) => e.profession === p.selectedProfession)
  if (p.selectedProject !== 'all')
    emps = emps.filter((e) => e.project_name === p.selectedProject)

  if (p.residenceStatus !== 'all') {
    const today = new Date()
    const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    emps = emps.filter((e) => {
      if (!e.residence_expiry) return false
      const d = new Date(e.residence_expiry)
      if (p.residenceStatus === 'expired') return d < today
      if (p.residenceStatus === 'expiring_soon') return d >= today && d <= in30
      if (p.residenceStatus === 'valid') return d > in30
      return true
    })
  }

  if (p.contractStatus !== 'all') {
    const today = new Date()
    const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    emps = emps.filter((e) => {
      if (!e.contract_expiry) return false
      const d = new Date(e.contract_expiry)
      if (p.contractStatus === 'expired') return d < today
      if (p.contractStatus === 'expiring_soon') return d >= today && d <= in30
      if (p.contractStatus === 'valid') return d > in30
      return true
    })
  }

  if (p.hasHealthInsuranceExpiry !== 'all')
    emps = emps.filter((e) =>
      p.hasHealthInsuranceExpiry === 'yes' ? !!e.health_insurance_expiry : !e.health_insurance_expiry
    )

  if (p.healthInsuranceExpiryStatus !== 'all') {
    const today = new Date()
    const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    emps = emps.filter((e) => {
      if (!e.health_insurance_expiry) return p.healthInsuranceExpiryStatus === 'no_expiry'
      const d = new Date(e.health_insurance_expiry)
      if (p.healthInsuranceExpiryStatus === 'expired') return d < today
      if (p.healthInsuranceExpiryStatus === 'expiring_soon') return d >= today && d <= in30
      if (p.healthInsuranceExpiryStatus === 'valid') return d > in30
      if (p.healthInsuranceExpiryStatus === 'no_expiry') return false
      return true
    })
  }

  if (p.hasPassport !== 'all')
    emps = emps.filter((e) =>
      p.hasPassport === 'yes' ? !!e.passport_number : !e.passport_number
    )
  if (p.passportNumberSearch.trim())
    emps = emps.filter((e) =>
      e.passport_number?.toLowerCase().includes(p.passportNumberSearch.toLowerCase().trim())
    )
  if (p.residenceNumberSearch.trim())
    emps = emps.filter((e) =>
      e.residence_number?.toString().includes(p.residenceNumberSearch.trim())
    )
  if (p.hasBankAccount !== 'all')
    emps = emps.filter((e) =>
      p.hasBankAccount === 'yes' ? !!e.bank_account : !e.bank_account
    )

  if (p.birthDateRange !== 'all') {
    const today = new Date()
    emps = emps.filter((e) => {
      if (!e.birth_date) return false
      const age = today.getFullYear() - new Date(e.birth_date).getFullYear()
      if (p.birthDateRange === 'under_25') return age < 25
      if (p.birthDateRange === '25_35') return age >= 25 && age <= 35
      if (p.birthDateRange === '35_45') return age >= 35 && age <= 45
      if (p.birthDateRange === 'over_45') return age > 45
      return true
    })
  }

  if (p.joiningDateRange !== 'all') {
    const today = new Date()
    emps = emps.filter((e) => {
      if (!e.joining_date) return false
      const d = new Date(e.joining_date)
      const months =
        (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth())
      if (p.joiningDateRange === 'less_than_6_months') return months < 6
      if (p.joiningDateRange === '6_months_1_year') return months >= 6 && months < 12
      if (p.joiningDateRange === '1_2_years') return months >= 12 && months < 24
      if (p.joiningDateRange === 'over_2_years') return months >= 24
      return true
    })
  }

  // ---- Company filters ----
  if (p.commercialRegStatus !== 'all') {
    comps = comps.filter((c) => {
      const s = calculateCommercialRegistrationStatus(c.commercial_registration_expiry)
      if (p.commercialRegStatus === 'expired') return s.status === 'منتهي'
      if (p.commercialRegStatus === 'expiring_soon')
        return s.status === 'عاجل' || s.status === 'طارئ'
      if (p.commercialRegStatus === 'valid')
        return s.status === 'ساري' || s.status === 'متوسط'
      return true
    })
  }

  if (p.companyDateFilter === 'commercial_expiring') {
    const today = new Date()
    const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    comps = comps.filter((c) => {
      if (!c.commercial_registration_expiry) return false
      const d = new Date(c.commercial_registration_expiry)
      return d >= today && d <= in30
    })
  }

  if (p.powerSubscriptionStatus !== 'all') {
    const today = new Date()
    const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    comps = comps.filter((c) => {
      if (!c.ending_subscription_power_date) return p.powerSubscriptionStatus === 'no_expiry'
      const d = new Date(c.ending_subscription_power_date)
      if (p.powerSubscriptionStatus === 'expired') return d < today
      if (p.powerSubscriptionStatus === 'expiring_soon') return d >= today && d <= in30
      if (p.powerSubscriptionStatus === 'valid') return d > in30
      if (p.powerSubscriptionStatus === 'no_expiry') return false
      return true
    })
  }

  if (p.moqeemSubscriptionStatus !== 'all') {
    const today = new Date()
    const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    comps = comps.filter((c) => {
      if (!c.ending_subscription_moqeem_date) return p.moqeemSubscriptionStatus === 'no_expiry'
      const d = new Date(c.ending_subscription_moqeem_date)
      if (p.moqeemSubscriptionStatus === 'expired') return d < today
      if (p.moqeemSubscriptionStatus === 'expiring_soon') return d >= today && d <= in30
      if (p.moqeemSubscriptionStatus === 'valid') return d > in30
      if (p.moqeemSubscriptionStatus === 'no_expiry') return false
      return true
    })
  }

  if (p.employeeCountFilter !== 'all') {
    comps = comps.filter((c) => {
      const n = c.employee_count || 0
      if (p.employeeCountFilter === '1') return n === 1
      if (p.employeeCountFilter === '2') return n === 2
      if (p.employeeCountFilter === '3') return n === 3
      if (p.employeeCountFilter === '4+') return n >= 4
      return true
    })
  }

  if (p.availableSlotsFilter !== 'all') {
    comps = comps.filter((c) => {
      const slots = (c as CompanyType & { available_slots?: number }).available_slots || 0
      if (p.availableSlotsFilter === '1') return slots === 1
      if (p.availableSlotsFilter === '2') return slots === 2
      if (p.availableSlotsFilter === '3') return slots === 3
      if (p.availableSlotsFilter === '4+') return slots >= 4
      return true
    })
  }

  if (p.exemptionsFilter !== 'all') {
    const target = normalizeArabic('تم الاعفاء')
    comps = comps.filter((c) => {
      const isExempt = normalizeArabic(c.exemptions).includes(target)
      return p.exemptionsFilter === 'تم الاعفاء' ? isExempt : !isExempt
    })
  }

  if (p.unifiedNumberSearch.trim())
    comps = comps.filter((c) =>
      c.unified_number?.toString().includes(p.unifiedNumberSearch.trim())
    )
  if (p.taxNumberSearch.trim())
    comps = comps.filter((c) =>
      c.social_insurance_number?.toString().includes(p.taxNumberSearch.trim())
    )
  if (p.laborSubscriptionNumberSearch.trim())
    comps = comps.filter((c) =>
      c.labor_subscription_number
        ?.toLowerCase()
        .includes(p.laborSubscriptionNumberSearch.toLowerCase().trim())
    )

  if (p.maxEmployeesRange !== 'all') {
    comps = comps.filter((c) => {
      const m = c.max_employees || 0
      if (p.maxEmployeesRange === '1_2') return m >= 1 && m <= 2
      if (p.maxEmployeesRange === '3_4') return m >= 3 && m <= 4
      if (p.maxEmployeesRange === '5_10') return m >= 5 && m <= 10
      if (p.maxEmployeesRange === 'over_10') return m > 10
      return true
    })
  }

  if (p.companyCreatedDateRange !== 'all') {
    const today = new Date()
    let startDate: Date | null = null
    let endDate: Date | null = null
    if (p.companyCreatedDateRange === 'last_month') {
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
      endDate = today
    } else if (p.companyCreatedDateRange === 'last_3_months') {
      startDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())
      endDate = today
    } else if (p.companyCreatedDateRange === 'last_year') {
      startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
      endDate = today
    } else if (
      p.companyCreatedDateRange === 'custom' &&
      p.companyCreatedStartDate &&
      p.companyCreatedEndDate
    ) {
      startDate = new Date(p.companyCreatedStartDate)
      endDate = new Date(p.companyCreatedEndDate)
    }
    if (startDate && endDate) {
      comps = comps.filter((c) => {
        if (!c.created_at) return false
        const d = new Date(c.created_at)
        return d >= startDate! && d <= endDate!
      })
    }
  }

  if (p.notesSearch.trim()) {
    const q = p.notesSearch.toLowerCase().trim()
    comps = comps.filter((c) => c.notes?.toLowerCase().includes(q))
  }
  if (p.notesFilter !== 'all') {
    comps = comps.filter((c) => {
      if (p.notesFilter === 'has_notes') return c.notes && c.notes.trim().length > 0
      if (p.notesFilter === 'no_notes') return !c.notes || c.notes.trim().length === 0
      return true
    })
  }

  return { filteredEmployees: emps, filteredCompanies: comps }
}
