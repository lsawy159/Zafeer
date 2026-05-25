import { describe, expect, it } from 'vitest'
import { applyAdvancedSearchFilters, type FilterParams } from '@/hooks/advancedSearchFilterFn'
import type { Company as CompanyType, Employee as EmployeeType } from '@/lib/supabase'

const buildEmployee = (overrides: Partial<EmployeeType> = {}): EmployeeType =>
  ({
    id: crypto.randomUUID(),
    company_id: null,
    name: '',
    profession: '',
    nationality: '',
    birth_date: null,
    phone: null,
    passport_number: null,
    residence_number: null,
    joining_date: null,
    contract_expiry: null,
    residence_expiry: null,
    project_name: null,
    bank_account: null,
    residence_image_url: null,
    salary: null,
    health_insurance_expiry: null,
    additional_fields: null,
    created_at: null,
    updated_at: null,
    notes: null,
    hired_worker_contract_expiry: null,
    project_id: null,
    is_deleted: false,
    deleted_at: null,
    companies: null,
    ...overrides,
  }) as EmployeeType

const buildCompany = (overrides: Partial<CompanyType> = {}): CompanyType =>
  ({
    id: crypto.randomUUID(),
    name: '',
    unified_number: null,
    labor_subscription_number: null,
    commercial_registration_expiry: null,
    social_insurance_expiry: null,
    ending_subscription_power_date: null,
    ending_subscription_moqeem_date: null,
    ending_subscription_insurance_date: null,
    commercial_registration_status: null,
    social_insurance_status: null,
    current_employees: null,
    max_employees: null,
    additional_fields: null,
    created_at: null,
    updated_at: null,
    notes: null,
    exemptions: null,
    social_insurance_number: null,
    company_type: null,
    employee_count: null,
    ...overrides,
  }) as CompanyType

const baseParams = (overrides: Partial<FilterParams> = {}): FilterParams =>
  ({
    employees: [],
    companies: [],
    employeeSearchQuery: '',
    companySearchQuery: '',
    selectedNationality: [],
    selectedCompanyFilter: 'all',
    selectedProfession: [],
    selectedProject: 'all',
    residenceStatus: 'all',
    contractStatus: 'all',
    hasHealthInsuranceExpiry: 'all',
    healthInsuranceExpiryStatus: 'all',
    hasPassport: 'all',
    hasBankAccount: 'all',
    birthDateRange: 'all',
    joiningDateRange: 'all',
    passportNumberSearch: '',
    residenceNumberSearch: '',
    commercialRegStatus: 'all',
    companyDateFilter: 'all',
    powerSubscriptionStatus: 'all',
    moqeemSubscriptionStatus: 'all',
    employeeCountFilter: 'all',
    availableSlotsFilter: 'all',
    exemptionsFilter: 'all',
    unifiedNumberSearch: '',
    taxNumberSearch: '',
    laborSubscriptionNumberSearch: '',
    maxEmployeesRange: 'all',
    companyCreatedDateRange: 'all',
    companyCreatedStartDate: '',
    companyCreatedEndDate: '',
    notesSearch: '',
    notesFilter: 'all',
    sortDirection: 'asc',
    ...overrides,
  }) as FilterParams

describe('applyAdvancedSearchFilters', () => {
  it('keeps OR inside each multi-select field and AND between fields', () => {
    const result = applyAdvancedSearchFilters(
      baseParams({
        employees: [
          buildEmployee({
            id: '1',
            name: 'B',
            nationality: 'سعودي',
            profession: 'نجار',
          }),
          buildEmployee({
            id: '2',
            name: 'A',
            nationality: 'كويتي',
            profession: 'نجار',
          }),
          buildEmployee({
            id: '3',
            name: 'C',
            nationality: 'مصري',
            profession: 'سباك',
          }),
        ],
        selectedNationality: ['سعودي', 'كويتي'],
        selectedProfession: ['نجار'],
      })
    )

    expect(result.filteredEmployees.map((employee) => employee.name)).toEqual(['A', 'B'])
  })

  it('sorts by name and keeps empty names last', () => {
    const result = applyAdvancedSearchFilters(
      baseParams({
        employees: [
          buildEmployee({ id: '1', name: 'Beta' }),
          buildEmployee({ id: '2', name: '' }),
          buildEmployee({ id: '3', name: 'Alpha' }),
        ],
        companies: [
          buildCompany({ id: 'c1', name: 'Sigma' }),
          buildCompany({ id: 'c2', name: '' }),
          buildCompany({ id: 'c3', name: 'Omega' }),
        ],
        sortDirection: 'desc',
      })
    )

    expect(result.filteredEmployees.map((employee) => employee.name)).toEqual([
      'Beta',
      'Alpha',
      '',
    ])
    expect(result.filteredCompanies.map((company) => company.name)).toEqual([
      'Sigma',
      'Omega',
      '',
    ])
  })
})
