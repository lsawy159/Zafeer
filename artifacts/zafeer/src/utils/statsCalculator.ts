// Pure calculation functions for stats dashboard — no React/supabase/date-fns imports
// Day math: Math.floor convention matching differenceInDays from date-fns

import type {
  StatsCompanyRow,
  StatsEmployeeRow,
  CompanyClassification,
  EmployeeClassification,
  CompanyStatsResult,
  EmployeeStatsResult,
  CompanyAlertStatsResult,
  EmployeeExpiredDocsResult,
  EmployeeMissingDocsResult,
  EmployeeAlertStatsResult,
  StatusThresholds,
  EmployeeThresholds,
} from '@/types/statsTypes'

// days remaining until expiry — negative means expired
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

// ──────────────────────────────────────────────
// Company classification (single source of truth)
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// Employee classification (date fields only)
// ──────────────────────────────────────────────

export function classifyEmployee(row: StatsEmployeeRow, today: Date): EmployeeClassification {
  // classification uses ONLY the 4 date fields, not salary/profession/etc
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

// ──────────────────────────────────────────────
// Section A — حالة المؤسسات
// ──────────────────────────────────────────────

export function calculateCompanyStats(rows: StatsCompanyRow[], today: Date): CompanyStatsResult {
  let healthy = 0, damaged = 0, missing = 0
  for (const row of rows) {
    const c = classifyCompany(row, today)
    if (c === 'healthy') healthy++
    else if (c === 'damaged') damaged++
    else missing++
  }
  return { healthy, damaged, missing, total: rows.length }
}

// ──────────────────────────────────────────────
// Section A' — حالة الموظفين
// ──────────────────────────────────────────────

export function calculateEmployeeStats(rows: StatsEmployeeRow[], today: Date): EmployeeStatsResult {
  let healthy = 0, damaged = 0, missing = 0
  for (const row of rows) {
    if (!isActive(row)) continue
    const c = classifyEmployee(row, today)
    if (c === 'healthy') healthy++
    else if (c === 'damaged') damaged++
    else missing++
  }
  const total = healthy + damaged + missing
  return { healthy, damaged, missing, total }
}

// ──────────────────────────────────────────────
// Section B — تنبيهات المؤسسات (سليمة فقط)
// ──────────────────────────────────────────────

function getCompanyAlertLevel(
  row: StatsCompanyRow,
  thresholds: StatusThresholds,
  today: Date
): 'urgent' | 'high' | 'medium' | null {
  // only healthy companies are alert candidates
  if (classifyCompany(row, today) !== 'healthy') return null

  const checks = [
    { date: row.commercial_registration_expiry, u: thresholds.commercial_reg_urgent_days, h: thresholds.commercial_reg_high_days, m: thresholds.commercial_reg_medium_days },
    { date: row.ending_subscription_power_date, u: thresholds.power_subscription_urgent_days, h: thresholds.power_subscription_high_days, m: thresholds.power_subscription_medium_days },
    { date: row.ending_subscription_moqeem_date, u: thresholds.moqeem_subscription_urgent_days, h: thresholds.moqeem_subscription_high_days, m: thresholds.moqeem_subscription_medium_days },
  ]

  let topLevel: 'urgent' | 'high' | 'medium' | null = null

  for (const { date, u, h, m } of checks) {
    const days = daysBetween(today, date)
    if (days === null || days <= 0) continue // missing or expired (shouldn't happen for healthy, but guard)
    let level: 'urgent' | 'high' | 'medium' | null = null
    if (days <= u) level = 'urgent'
    else if (days <= h) level = 'high'
    else if (days <= m) level = 'medium'
    if (level === 'urgent') return 'urgent' // short-circuit
    if (level === 'high') topLevel = 'high'
    else if (level === 'medium' && topLevel !== 'high') topLevel = 'medium'
  }
  return topLevel
}

export function calculateCompanyAlertStats(
  rows: StatsCompanyRow[],
  thresholds: StatusThresholds,
  today: Date
): CompanyAlertStatsResult {
  let urgent = 0, high = 0, medium = 0
  for (const row of rows) {
    const level = getCompanyAlertLevel(row, thresholds, today)
    if (level === 'urgent') urgent++
    else if (level === 'high') high++
    else if (level === 'medium') medium++
  }
  return { urgent, high, medium }
}

// ──────────────────────────────────────────────
// Section C — وثائق الموظفين المنتهية
// ──────────────────────────────────────────────

export function calculateEmployeeExpiredDocs(
  rows: StatsEmployeeRow[],
  today: Date
): EmployeeExpiredDocsResult {
  let residence = 0, contract = 0, hired_worker_contract = 0, health_insurance = 0
  for (const row of rows) {
    if (!isActive(row)) continue
    if (isDateExpired(row.residence_expiry, today)) residence++
    if (isDateExpired(row.contract_expiry, today)) contract++
    if (isDateExpired(row.hired_worker_contract_expiry, today)) hired_worker_contract++
    if (isDateExpired(row.health_insurance_expiry, today)) health_insurance++
  }
  return { residence, contract, hired_worker_contract, health_insurance }
}

// ──────────────────────────────────────────────
// Section D — بيانات الموظفين الناقصة
// ──────────────────────────────────────────────

export function calculateEmployeeMissingDocs(rows: StatsEmployeeRow[]): EmployeeMissingDocsResult {
  let residence = 0, contract = 0, hired_worker_contract = 0, health_insurance = 0
  let salary = 0, profession = 0, bank_account = 0, residence_image = 0, company_unified_number = 0
  for (const row of rows) {
    if (!isActive(row)) continue
    if (isDateMissing(row.residence_expiry)) residence++
    if (isDateMissing(row.contract_expiry)) contract++
    if (isDateMissing(row.hired_worker_contract_expiry)) hired_worker_contract++
    if (isDateMissing(row.health_insurance_expiry)) health_insurance++
    // salary: null OR 0 counts as missing
    if (row.salary === null || row.salary === undefined || row.salary === 0) salary++
    if (!row.profession || row.profession.trim() === '') profession++
    if (!row.bank_account || row.bank_account.trim() === '') bank_account++
    if (!row.residence_image_url || row.residence_image_url.trim() === '') residence_image++
    if (row.company_unified_number === null || row.company_unified_number === undefined) company_unified_number++
  }
  return { residence, contract, hired_worker_contract, health_insurance, salary, profession, bank_account, residence_image, company_unified_number }
}

// ──────────────────────────────────────────────
// Section E — تنبيهات الموظفين (سليمون فقط)
// ──────────────────────────────────────────────

function getEmployeeAlertLevel(
  row: StatsEmployeeRow,
  thresholds: EmployeeThresholds,
  today: Date
): 'urgent' | 'high' | 'medium' | null {
  if (!isActive(row)) return null
  // only healthy employees (all 4 dates present and not expired) are alert candidates
  if (classifyEmployee(row, today) !== 'healthy') return null

  const checks = [
    { date: row.residence_expiry, u: thresholds.residence_urgent_days, h: thresholds.residence_high_days, m: thresholds.residence_medium_days },
    { date: row.contract_expiry, u: thresholds.contract_urgent_days, h: thresholds.contract_high_days, m: thresholds.contract_medium_days },
    { date: row.hired_worker_contract_expiry, u: thresholds.hired_worker_contract_urgent_days, h: thresholds.hired_worker_contract_high_days, m: thresholds.hired_worker_contract_medium_days },
    { date: row.health_insurance_expiry, u: thresholds.health_insurance_urgent_days, h: thresholds.health_insurance_high_days, m: thresholds.health_insurance_medium_days },
  ]

  let topLevel: 'urgent' | 'high' | 'medium' | null = null
  for (const { date, u, h, m } of checks) {
    const days = daysBetween(today, date)
    if (days === null || days <= 0) continue
    let level: 'urgent' | 'high' | 'medium' | null = null
    if (days <= u) level = 'urgent'
    else if (days <= h) level = 'high'
    else if (days <= m) level = 'medium'
    if (level === 'urgent') return 'urgent'
    if (level === 'high') topLevel = 'high'
    else if (level === 'medium' && topLevel !== 'high') topLevel = 'medium'
  }
  return topLevel
}

export function calculateEmployeeAlertStats(
  rows: StatsEmployeeRow[],
  thresholds: EmployeeThresholds,
  today: Date
): EmployeeAlertStatsResult {
  let urgent = 0, high = 0, medium = 0
  for (const row of rows) {
    const level = getEmployeeAlertLevel(row, thresholds, today)
    if (level === 'urgent') urgent++
    else if (level === 'high') high++
    else if (level === 'medium') medium++
  }
  return { urgent, high, medium }
}

// ──────────────────────────────────────────────
// Predicate functions — used by StatsDetailModal
// to filter entities at click time (lazy)
// ──────────────────────────────────────────────

export const predicates = {
  // Company classification
  isHealthyCompany: (row: StatsCompanyRow, today: Date) => classifyCompany(row, today) === 'healthy',
  isDamagedCompany: (row: StatsCompanyRow, today: Date) => classifyCompany(row, today) === 'damaged',
  isMissingCompany: (row: StatsCompanyRow, today: Date) => classifyCompany(row, today) === 'missing',

  // Company alerts
  isUrgentAlertCompany: (row: StatsCompanyRow, thresholds: StatusThresholds, today: Date) =>
    getCompanyAlertLevel(row, thresholds, today) === 'urgent',
  isHighAlertCompany: (row: StatsCompanyRow, thresholds: StatusThresholds, today: Date) =>
    getCompanyAlertLevel(row, thresholds, today) === 'high',
  isMediumAlertCompany: (row: StatsCompanyRow, thresholds: StatusThresholds, today: Date) =>
    getCompanyAlertLevel(row, thresholds, today) === 'medium',

  // Employee classification
  isHealthyEmployee: (row: StatsEmployeeRow, today: Date) => isActive(row) && classifyEmployee(row, today) === 'healthy',
  isDamagedEmployee: (row: StatsEmployeeRow, today: Date) => isActive(row) && classifyEmployee(row, today) === 'damaged',
  isMissingEmployee: (row: StatsEmployeeRow, today: Date) => isActive(row) && classifyEmployee(row, today) === 'missing',

  // Employee expired docs (Section C)
  hasExpiredResidence: (row: StatsEmployeeRow, today: Date) => isActive(row) && isDateExpired(row.residence_expiry, today),
  hasExpiredContract: (row: StatsEmployeeRow, today: Date) => isActive(row) && isDateExpired(row.contract_expiry, today),
  hasExpiredHiredWorkerContract: (row: StatsEmployeeRow, today: Date) => isActive(row) && isDateExpired(row.hired_worker_contract_expiry, today),
  hasExpiredHealthInsurance: (row: StatsEmployeeRow, today: Date) => isActive(row) && isDateExpired(row.health_insurance_expiry, today),

  // Employee missing date fields (Section D — date-specific)
  isMissingResidenceDate: (row: StatsEmployeeRow) => isActive(row) && isDateMissing(row.residence_expiry),
  isMissingContractDate: (row: StatsEmployeeRow) => isActive(row) && isDateMissing(row.contract_expiry),
  isMissingHiredWorkerContractDate: (row: StatsEmployeeRow) => isActive(row) && isDateMissing(row.hired_worker_contract_expiry),
  isMissingHealthInsuranceDate: (row: StatsEmployeeRow) => isActive(row) && isDateMissing(row.health_insurance_expiry),

  // Employee missing data fields (Section D — non-date)
  isMissingSalary: (row: StatsEmployeeRow) => isActive(row) && (row.salary === null || row.salary === undefined || row.salary === 0),
  isMissingProfession: (row: StatsEmployeeRow) => isActive(row) && (!row.profession || row.profession.trim() === ''),
  isMissingBankAccount: (row: StatsEmployeeRow) => isActive(row) && (!row.bank_account || row.bank_account.trim() === ''),
  isMissingResidenceImage: (row: StatsEmployeeRow) => isActive(row) && (!row.residence_image_url || row.residence_image_url.trim() === ''),
  isMissingCompanyUnifiedNumber: (row: StatsEmployeeRow) => isActive(row) && (row.company_unified_number === null || row.company_unified_number === undefined),

  // Employee alerts
  isUrgentAlertEmployee: (row: StatsEmployeeRow, thresholds: EmployeeThresholds, today: Date) =>
    getEmployeeAlertLevel(row, thresholds, today) === 'urgent',
  isHighAlertEmployee: (row: StatsEmployeeRow, thresholds: EmployeeThresholds, today: Date) =>
    getEmployeeAlertLevel(row, thresholds, today) === 'high',
  isMediumAlertEmployee: (row: StatsEmployeeRow, thresholds: EmployeeThresholds, today: Date) =>
    getEmployeeAlertLevel(row, thresholds, today) === 'medium',
}
