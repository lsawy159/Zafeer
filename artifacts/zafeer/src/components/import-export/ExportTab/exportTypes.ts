import { differenceInDays } from 'date-fns'
import { Employee, Company, Project } from '@/lib/supabase'
import { formatDateShortWithHijri } from '@/utils/dateFormatter'

export interface CompanyWithStats extends Company {
  employee_count?: number
  available_slots?: number
}

export interface ExportTabProps {
  initialExportType?: 'employees' | 'companies'
  hideTypeSelector?: boolean
}

export type EmployeeWithRelations = Employee & { company: Company; project?: Project }

export interface EmployeeDisplayData {
  contractDays: number | null
  hiredDays: number | null
  residenceDays: number | null
  insuranceDays: number | null
  contractFormatted: string
  hiredFormatted: string
  residenceFormatted: string
  insuranceFormatted: string
}

export function computeEmployeeDisplayData(emp: EmployeeWithRelations, today: Date): EmployeeDisplayData {
  return {
    contractDays: emp.contract_expiry
      ? differenceInDays(new Date(emp.contract_expiry), today)
      : null,
    hiredDays: emp.hired_worker_contract_expiry
      ? differenceInDays(new Date(emp.hired_worker_contract_expiry), today)
      : null,
    residenceDays: emp.residence_expiry
      ? differenceInDays(new Date(emp.residence_expiry), today)
      : null,
    insuranceDays: emp.health_insurance_expiry
      ? differenceInDays(new Date(emp.health_insurance_expiry), today)
      : null,
    contractFormatted: emp.contract_expiry ? formatDateShortWithHijri(emp.contract_expiry) : '',
    hiredFormatted: emp.hired_worker_contract_expiry
      ? formatDateShortWithHijri(emp.hired_worker_contract_expiry)
      : '',
    residenceFormatted: emp.residence_expiry ? formatDateShortWithHijri(emp.residence_expiry) : '',
    insuranceFormatted: emp.health_insurance_expiry
      ? formatDateShortWithHijri(emp.health_insurance_expiry)
      : '',
  }
}

export const STATUS_THRESHOLDS = { urgent: 7, high: 15, medium: 30 }

export const isExpired = (date: string | null | undefined): boolean => {
  if (!date) return false
  return differenceInDays(new Date(date), new Date()) < 0
}

export const isExpiringWithin30Days = (date: string | null | undefined): boolean => {
  if (!date) return false
  const daysRemaining = differenceInDays(new Date(date), new Date())
  return daysRemaining >= 0 && daysRemaining <= 30
}

export const getDaysRemaining = (date?: string | null): number | null => {
  if (!date) return null
  return differenceInDays(new Date(date), new Date())
}

export const getDateTextColor = (days: number | null): string => {
  if (days === null) return 'text-neutral-700'
  if (days < 0) return 'text-red-700'
  if (days <= STATUS_THRESHOLDS.urgent) return 'text-red-600'
  if (days <= STATUS_THRESHOLDS.high) return 'text-warning-600'
  if (days <= STATUS_THRESHOLDS.medium) return 'text-amber-600'
  return 'text-neutral-700'
}

export const formatDateStatus = (days: number | null, expiredLabel: string): string => {
  if (days === null) return ''
  if (days < 0) return expiredLabel
  if (days === 0) return 'اليوم'
  return `بعد ${days} يوم`
}
