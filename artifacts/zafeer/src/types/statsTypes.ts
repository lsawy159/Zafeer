// Stats dashboard type definitions — no React/supabase imports

export interface StatsCompanyRow {
  id: string
  name: string
  unified_number?: number | null
  commercial_registration_expiry?: string | null
  ending_subscription_power_date?: string | null
  ending_subscription_moqeem_date?: string | null
  labor_subscription_number?: string | null
  social_insurance_number?: string | null
}

export interface StatsEmployeeRow {
  id: string
  name: string
  residence_expiry?: string | null
  contract_expiry?: string | null
  hired_worker_contract_expiry?: string | null
  health_insurance_expiry?: string | null
  salary?: number | null
  profession?: string | null
  bank_account?: string | null
  residence_image_url?: string | null
  company_unified_number?: number | null
  company_name?: string | null
  is_deleted?: boolean | null
}

export type CompanyClassification = 'healthy' | 'damaged' | 'missing'
export type EmployeeClassification = 'healthy' | 'damaged' | 'missing'

// Section F — بيانات المؤسسات الناقصة
export interface CompanyMissingDataResult {
  commercial_reg: number
  power_subscription: number
  moqeem_subscription: number
  labor_subscription: number
  social_insurance: number
  any_missing: number
}

// Section D — بيانات الموظفين الناقصة
export interface EmployeeMissingDocsResult {
  residence: number
  contract: number
  hired_worker_contract: number
  health_insurance: number
  salary: number
  profession: number
  bank_account: number
  residence_image: number
  company_unified_number: number
}

// Internal modal state stored in StatsDashboard
export interface ModalState {
  title: string
  type: 'company' | 'employee'
  companyPredicate?: (row: StatsCompanyRow, today: Date) => boolean
  employeePredicate?: (row: StatsEmployeeRow, today: Date) => boolean
}
