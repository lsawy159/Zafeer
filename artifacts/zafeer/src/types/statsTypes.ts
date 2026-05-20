// Stats dashboard type definitions — no React/supabase imports

export interface StatsCompanyRow {
  id: string
  name: string
  unified_number?: number | null
  commercial_registration_expiry?: string | null
  ending_subscription_power_date?: string | null
  ending_subscription_moqeem_date?: string | null
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
export type AlertLevel = 'urgent' | 'high' | 'medium'

// Section A — حالة المؤسسات
export interface CompanyStatsResult {
  healthy: number
  damaged: number
  missing: number
  total: number
}

// Section A' — حالة الموظفين
export interface EmployeeStatsResult {
  healthy: number
  damaged: number
  missing: number
  total: number
}

// Section B — تنبيهات المؤسسات (سليمة فقط — لديها تواريخ صالحة غير منتهية)
export interface CompanyAlertStatsResult {
  urgent: number
  high: number
  medium: number
}

// Section F — بيانات المؤسسات الناقصة
export interface CompanyMissingDataResult {
  commercial_reg: number          // commercial_registration_expiry = null
  power_subscription: number     // ending_subscription_power_date = null
  moqeem_subscription: number    // ending_subscription_moqeem_date = null
  any_missing: number            // لديها حقل واحد على الأقل ناقص
}

// Section C — وثائق الموظفين المنتهية
export interface EmployeeExpiredDocsResult {
  residence: number
  contract: number
  hired_worker_contract: number
  health_insurance: number
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

// Section E — تنبيهات الموظفين (سليمون فقط)
export interface EmployeeAlertStatsResult {
  urgent: number
  high: number
  medium: number
}

export interface AllStatsResult {
  companyStats: CompanyStatsResult
  companyAlerts: CompanyAlertStatsResult
  companyMissing: CompanyMissingDataResult
  employeeStats: EmployeeStatsResult
  employeeExpired: EmployeeExpiredDocsResult
  employeeMissing: EmployeeMissingDocsResult
  employeeAlerts: EmployeeAlertStatsResult
}

export interface StatusThresholds {
  commercial_reg_urgent_days: number
  commercial_reg_high_days: number
  commercial_reg_medium_days: number
  power_subscription_urgent_days: number
  power_subscription_high_days: number
  power_subscription_medium_days: number
  moqeem_subscription_urgent_days: number
  moqeem_subscription_high_days: number
  moqeem_subscription_medium_days: number
}

export interface EmployeeThresholds {
  residence_urgent_days: number
  residence_high_days: number
  residence_medium_days: number
  contract_urgent_days: number
  contract_high_days: number
  contract_medium_days: number
  health_insurance_urgent_days: number
  health_insurance_high_days: number
  health_insurance_medium_days: number
  hired_worker_contract_urgent_days: number
  hired_worker_contract_high_days: number
  hired_worker_contract_medium_days: number
}

// Props for StatsDetailModal
export interface StatsDetailModalProps {
  title: string
  type: 'company' | 'employee'
  companies?: StatsCompanyRow[]
  employees?: StatsEmployeeRow[]
  today: Date
  onClose: () => void
}

// Internal modal state stored in StatsDashboard
export interface ModalState {
  title: string
  type: 'company' | 'employee'
  companyPredicate?: (row: StatsCompanyRow, today: Date) => boolean
  employeePredicate?: (row: StatsEmployeeRow, today: Date) => boolean
}
