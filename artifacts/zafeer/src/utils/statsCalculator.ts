// Pure calculation functions for stats dashboard - no React/supabase/date-fns imports
// Day math: Math.floor convention matching differenceInDays from date-fns

import type {
  StatsCompanyRow,
  StatsEmployeeRow,
  CompanyClassification,
  EmployeeClassification,
  CompanyMissingDataResult,
  EmployeeMissingDocsResult,
} from '@/types/statsTypes'

// days remaining until expiry - negative means expired
function daysBetween(today: Date, expiryStr: string | null | undefined): number | null {
  if (!expiryStr) return null
  const expiry = new Date(expiryStr)
  if (isNaN(expiry.getTime())) return null
  return Math.floor((expiry.getTime() - today.getTime()) / 86_400_000)
}

function isDateMissing(d: string | null | undefined): boolean {
  return d === null || d === undefined || d === ''
}

function isDateExpired(d: string | null | undefined, today: Date): boolean {
  if (isDateMissing(d)) return false
  const days = daysBetween(today, d)
  return days !== null && days < 0
}

function isStringMissing(value: string | null | undefined): boolean {
  return !value || value.trim() === ''
}

// Classification source of truth
export function classifyCompany(row: StatsCompanyRow, today: Date): CompanyClassification {
  const dates = [
    row.commercial_registration_expiry,
    row.ending_subscription_power_date,
    row.ending_subscription_moqeem_date,
  ]
  if (dates.some(isDateMissing)) return 'missing'
  if (dates.some(d => isDateExpired(d, today))) return 'damaged'
  return 'healthy'
}

export function classifyEmployee(row: StatsEmployeeRow, today: Date): EmployeeClassification {
  const dates = [
    row.residence_expiry,
    row.contract_expiry,
    row.hired_worker_contract_expiry,
    row.health_insurance_expiry,
  ]
  if (dates.some(isDateMissing)) return 'missing'
  if (dates.some(d => isDateExpired(d, today))) return 'damaged'
  return 'healthy'
}

function isActive(row: StatsEmployeeRow): boolean {
  return row.is_deleted !== true
}

// Section F - company missing data
export function calculateCompanyMissingData(rows: StatsCompanyRow[]): CompanyMissingDataResult {
  let commercial_reg = 0, power_subscription = 0, moqeem_subscription = 0, any_missing = 0
  let labor_subscription = 0, social_insurance = 0

  for (const row of rows) {
    const missingComm = isDateMissing(row.commercial_registration_expiry)
    const missingPower = isDateMissing(row.ending_subscription_power_date)
    const missingMoqeem = isDateMissing(row.ending_subscription_moqeem_date)
    const missingLabor = isStringMissing(row.labor_subscription_number)
    const missingInsurance = isStringMissing(row.social_insurance_number)

    if (missingComm) commercial_reg++
    if (missingPower) power_subscription++
    if (missingMoqeem) moqeem_subscription++
    if (missingLabor) labor_subscription++
    if (missingInsurance) social_insurance++
    if (missingComm || missingPower || missingMoqeem || missingLabor || missingInsurance) any_missing++
  }

  return {
    commercial_reg,
    power_subscription,
    moqeem_subscription,
    labor_subscription,
    social_insurance,
    any_missing,
  }
}

// Section D - employee missing docs
export function calculateEmployeeMissingDocs(rows: StatsEmployeeRow[]): EmployeeMissingDocsResult {
  let residence = 0, contract = 0, hired_worker_contract = 0, health_insurance = 0
  let salary = 0, profession = 0, bank_account = 0, residence_image = 0, company_unified_number = 0
  for (const row of rows) {
    if (!isActive(row)) continue
    if (isDateMissing(row.residence_expiry)) residence++
    if (isDateMissing(row.contract_expiry)) contract++
    if (isDateMissing(row.hired_worker_contract_expiry)) hired_worker_contract++
    if (isDateMissing(row.health_insurance_expiry)) health_insurance++
    if (row.salary === null || row.salary === undefined || row.salary === 0) salary++
    if (isStringMissing(row.profession)) profession++
    if (isStringMissing(row.bank_account)) bank_account++
    if (isStringMissing(row.residence_image_url)) residence_image++
    if (row.company_unified_number === null || row.company_unified_number === undefined) company_unified_number++
  }
  return {
    residence,
    contract,
    hired_worker_contract,
    health_insurance,
    salary,
    profession,
    bank_account,
    residence_image,
    company_unified_number,
  }
}

// Predicate functions - used by StatsDetailModal to filter entities at click time (lazy)
export const predicates = {
  // Company missing data (Section F)
  isMissingCommercialReg: (row: StatsCompanyRow) => isDateMissing(row.commercial_registration_expiry),
  isMissingPowerDate: (row: StatsCompanyRow) => isDateMissing(row.ending_subscription_power_date),
  isMissingMoqeemDate: (row: StatsCompanyRow) => isDateMissing(row.ending_subscription_moqeem_date),
  isMissingLaborSubscription: (row: StatsCompanyRow) => isStringMissing(row.labor_subscription_number),
  isMissingInsuranceNumber: (row: StatsCompanyRow) => isStringMissing(row.social_insurance_number),

  // Employee missing date fields (Section D - date-specific)
  isMissingResidenceDate: (row: StatsEmployeeRow) => isActive(row) && isDateMissing(row.residence_expiry),
  isMissingContractDate: (row: StatsEmployeeRow) => isActive(row) && isDateMissing(row.contract_expiry),
  isMissingHiredWorkerContractDate: (row: StatsEmployeeRow) => isActive(row) && isDateMissing(row.hired_worker_contract_expiry),
  isMissingHealthInsuranceDate: (row: StatsEmployeeRow) => isActive(row) && isDateMissing(row.health_insurance_expiry),

  // Employee missing data fields (Section D - non-date)
  isMissingSalary: (row: StatsEmployeeRow) => isActive(row) && (row.salary === null || row.salary === undefined || row.salary === 0),
  isMissingProfession: (row: StatsEmployeeRow) => isActive(row) && isStringMissing(row.profession),
  isMissingBankAccount: (row: StatsEmployeeRow) => isActive(row) && isStringMissing(row.bank_account),
  isMissingResidenceImage: (row: StatsEmployeeRow) => isActive(row) && isStringMissing(row.residence_image_url),
  isMissingCompanyUnifiedNumber: (row: StatsEmployeeRow) => isActive(row) && (row.company_unified_number === null || row.company_unified_number === undefined),
}
