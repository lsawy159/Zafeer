import { differenceInDays } from 'date-fns'
import { Employee, Company } from '@/lib/supabase'

interface FiveCategories {
  expired: number
  urgent: number
  high: number
  medium: number
  valid: number
}

export interface CompanyThresholds {
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
  contract_urgent_days: number
  contract_high_days: number
  contract_medium_days: number
  residence_urgent_days: number
  residence_high_days: number
  residence_medium_days: number
  health_insurance_urgent_days: number
  health_insurance_high_days: number
  health_insurance_medium_days: number
  hired_worker_contract_urgent_days: number
  hired_worker_contract_high_days: number
  hired_worker_contract_medium_days: number
}

export interface DashboardStats {
  totalEmployees: number
  totalCompanies: number
  fullCompanies: number
  companiesWithFewSlots: number
  totalAvailableSlots: number
  totalContractSlots: number
  avgEmployeesPerCompany: number
  utilizationRate: number
  expiredContracts: number
  urgentContracts: number
  highContracts: number
  mediumContracts: number
  validContracts: number
  expiredResidences: number
  urgentResidences: number
  highResidences: number
  mediumResidences: number
  validResidences: number
  expiredInsurance: number
  urgentInsurance: number
  highInsurance: number
  mediumInsurance: number
  validInsurance: number
  expiredHiredWorkerContracts: number
  urgentHiredWorkerContracts: number
  highHiredWorkerContracts: number
  mediumHiredWorkerContracts: number
  validHiredWorkerContracts: number
  expiredCommercialReg: number
  urgentCommercialReg: number
  highCommercialReg: number
  mediumCommercialReg: number
  validCommercialReg: number
  expiredPower: number
  urgentPower: number
  highPower: number
  mediumPower: number
  validPower: number
  expiredMoqeem: number
  urgentMoqeem: number
  highMoqeem: number
  mediumMoqeem: number
  validMoqeem: number
}

export function calculateFiveCategories(
  expiryDate: string | null | undefined,
  today: Date,
  thresholds: { urgent: number; high: number; medium: number }
): FiveCategories {
  if (!expiryDate) {
    return { expired: 0, urgent: 0, high: 0, medium: 0, valid: 0 }
  }

  const expiry = new Date(expiryDate)
  const todayNormalized = new Date(today)
  todayNormalized.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)

  const diff = differenceInDays(expiry, todayNormalized)

  if (diff < 0) return { expired: 1, urgent: 0, high: 0, medium: 0, valid: 0 }
  if (diff <= thresholds.urgent) return { expired: 0, urgent: 1, high: 0, medium: 0, valid: 0 }
  if (diff <= thresholds.high) return { expired: 0, urgent: 0, high: 1, medium: 0, valid: 0 }
  if (diff <= thresholds.medium) return { expired: 0, urgent: 0, high: 0, medium: 1, valid: 0 }
  return { expired: 0, urgent: 0, high: 0, medium: 0, valid: 1 }
}

export function calculateDashboardStats(
  employees: Employee[],
  companies: Company[],
  companyThresholds: CompanyThresholds,
  employeeThresholds: EmployeeThresholds
): DashboardStats {
  const today = new Date()

  const totalEmployees = employees.length
  const totalCompanies = companies.length
  let fullCompanies = 0
  let companiesWithFewSlots = 0
  let totalAvailableSlots = 0
  let totalContractSlots = 0

  companies.forEach((company) => {
    const employeesInCompany = employees.filter((emp) => emp.company_id === company.id).length
    const maxEmployees = company.max_employees || 4
    const availableSlots = Math.max(0, maxEmployees - employeesInCompany)
    const contractSlots = company.max_employees || 4

    totalAvailableSlots += availableSlots
    totalContractSlots += contractSlots
    if (availableSlots === 0) fullCompanies++
    if (availableSlots <= 2) companiesWithFewSlots++
  })

  const avgEmployeesPerCompany = totalCompanies > 0 ? Math.round(totalEmployees / totalCompanies) : 0
  const utilizationRate =
    totalContractSlots > 0
      ? Math.round(((totalContractSlots - totalAvailableSlots) / totalContractSlots) * 100)
      : 0

  const accum = (field: keyof Employee, thresholds: { urgent: number; high: number; medium: number }) => {
    let expired = 0, urgent = 0, high = 0, medium = 0, valid = 0
    employees.forEach((emp) => {
      const cats = calculateFiveCategories(emp[field] as string | null | undefined, today, thresholds)
      expired += cats.expired; urgent += cats.urgent; high += cats.high; medium += cats.medium; valid += cats.valid
    })
    return { expired, urgent, high, medium, valid }
  }

  const accumCompany = (field: keyof Company, thresholds: { urgent: number; high: number; medium: number }) => {
    let expired = 0, urgent = 0, high = 0, medium = 0, valid = 0
    companies.forEach((company) => {
      const cats = calculateFiveCategories(company[field] as string | null | undefined, today, thresholds)
      expired += cats.expired; urgent += cats.urgent; high += cats.high; medium += cats.medium; valid += cats.valid
    })
    return { expired, urgent, high, medium, valid }
  }

  const contracts = accum('contract_expiry', {
    urgent: employeeThresholds.contract_urgent_days,
    high: employeeThresholds.contract_high_days,
    medium: employeeThresholds.contract_medium_days,
  })
  const residences = accum('residence_expiry', {
    urgent: employeeThresholds.residence_urgent_days,
    high: employeeThresholds.residence_high_days,
    medium: employeeThresholds.residence_medium_days,
  })
  const insurance = accum('health_insurance_expiry', {
    urgent: employeeThresholds.health_insurance_urgent_days,
    high: employeeThresholds.health_insurance_high_days,
    medium: employeeThresholds.health_insurance_medium_days,
  })
  const hiredWorker = accum('hired_worker_contract_expiry', {
    urgent: employeeThresholds.hired_worker_contract_urgent_days,
    high: employeeThresholds.hired_worker_contract_high_days,
    medium: employeeThresholds.hired_worker_contract_medium_days,
  })
  const commercialReg = accumCompany('commercial_registration_expiry', {
    urgent: companyThresholds.commercial_reg_urgent_days,
    high: companyThresholds.commercial_reg_high_days,
    medium: companyThresholds.commercial_reg_medium_days,
  })
  const power = accumCompany('ending_subscription_power_date', {
    urgent: companyThresholds.power_subscription_urgent_days,
    high: companyThresholds.power_subscription_high_days,
    medium: companyThresholds.power_subscription_medium_days,
  })
  const moqeem = accumCompany('ending_subscription_moqeem_date', {
    urgent: companyThresholds.moqeem_subscription_urgent_days,
    high: companyThresholds.moqeem_subscription_high_days,
    medium: companyThresholds.moqeem_subscription_medium_days,
  })

  return {
    totalEmployees, totalCompanies, fullCompanies, companiesWithFewSlots,
    totalAvailableSlots, totalContractSlots, avgEmployeesPerCompany, utilizationRate,
    expiredContracts: contracts.expired, urgentContracts: contracts.urgent,
    highContracts: contracts.high, mediumContracts: contracts.medium, validContracts: contracts.valid,
    expiredResidences: residences.expired, urgentResidences: residences.urgent,
    highResidences: residences.high, mediumResidences: residences.medium, validResidences: residences.valid,
    expiredInsurance: insurance.expired, urgentInsurance: insurance.urgent,
    highInsurance: insurance.high, mediumInsurance: insurance.medium, validInsurance: insurance.valid,
    expiredHiredWorkerContracts: hiredWorker.expired, urgentHiredWorkerContracts: hiredWorker.urgent,
    highHiredWorkerContracts: hiredWorker.high, mediumHiredWorkerContracts: hiredWorker.medium,
    validHiredWorkerContracts: hiredWorker.valid,
    expiredCommercialReg: commercialReg.expired, urgentCommercialReg: commercialReg.urgent,
    highCommercialReg: commercialReg.high, mediumCommercialReg: commercialReg.medium,
    validCommercialReg: commercialReg.valid,
    expiredPower: power.expired, urgentPower: power.urgent,
    highPower: power.high, mediumPower: power.medium, validPower: power.valid,
    expiredMoqeem: moqeem.expired, urgentMoqeem: moqeem.urgent,
    highMoqeem: moqeem.high, mediumMoqeem: moqeem.medium, validMoqeem: moqeem.valid,
  }
}
