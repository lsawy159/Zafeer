import { differenceInDays } from 'date-fns'
import { type EmployeeNotificationThresholds } from '@/utils/employeeAlerts'

export const COLOR_THRESHOLD_FALLBACK: EmployeeNotificationThresholds = {
  residence_urgent_days: 7,
  residence_high_days: 15,
  residence_medium_days: 30,
  contract_urgent_days: 7,
  contract_high_days: 15,
  contract_medium_days: 30,
  health_insurance_urgent_days: 30,
  health_insurance_high_days: 45,
  health_insurance_medium_days: 60,
  hired_worker_contract_urgent_days: 7,
  hired_worker_contract_high_days: 15,
  hired_worker_contract_medium_days: 30,
}

export const getDaysRemaining = (date: string | null | undefined): number | null => {
  if (!date) return null
  try {
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) return null
    return differenceInDays(dateObj, new Date())
  } catch {
    return null
  }
}

export const getStatusForField = (
  expiryDate: string | null | undefined,
  fieldType: 'contract' | 'hired_worker_contract' | 'residence' | 'health_insurance',
  thresholds: EmployeeNotificationThresholds
): 'غير محدد' | 'منتهي' | 'طارئ' | 'عاجل' | 'متوسط' | 'ساري' => {
  if (!expiryDate) return 'غير محدد'
  const days = getDaysRemaining(expiryDate)
  if (days === null) return 'غير محدد'

  const urgentDays = thresholds[
    `${fieldType}_urgent_days` as keyof EmployeeNotificationThresholds
  ] as number
  const highDays = thresholds[
    `${fieldType}_high_days` as keyof EmployeeNotificationThresholds
  ] as number
  const mediumDays = thresholds[
    `${fieldType}_medium_days` as keyof EmployeeNotificationThresholds
  ] as number

  if (days < 0) return 'منتهي'
  if (days <= urgentDays) return 'طارئ'
  if (days <= highDays) return 'عاجل'
  if (days <= mediumDays) return 'متوسط'
  return 'ساري'
}

export const hasAlert = (
  contractExpiry: string | null | undefined,
  hiredWorkerContractExpiry: string | null | undefined,
  residenceExpiry: string | null | undefined,
  healthInsuranceExpiry: string | null | undefined,
  thresholds: EmployeeNotificationThresholds
): boolean => {
  const statuses = [
    getStatusForField(contractExpiry, 'contract', thresholds),
    getStatusForField(hiredWorkerContractExpiry, 'hired_worker_contract', thresholds),
    getStatusForField(residenceExpiry, 'residence', thresholds),
    getStatusForField(healthInsuranceExpiry, 'health_insurance', thresholds),
  ]
  return statuses.some((status) => ['منتهي', 'طارئ', 'عاجل', 'متوسط'].includes(status))
}

export const getCellBackgroundColor = (days: number | null): string => {
  if (days === null) return ''
  if (days < 0) return 'bg-red-50'
  return ''
}

export const getTextColor = (days: number | null): string => {
  if (days === null) return 'text-neutral-700'
  if (days < 0) return 'text-red-600'
  return 'text-neutral-700'
}

export const truncateText = (text: string | number | null | undefined, maxLength: number): string => {
  if (text === null || text === undefined) return '-'
  const textStr = String(text)
  if (textStr.length <= maxLength) return textStr
  return textStr.substring(0, maxLength)
}

export const formatDateStatus = (days: number | null, expiredText: string = 'منتهي'): string => {
  if (days === null) return '-'
  if (days < 0) return expiredText
  const statusText = `${days} يوم`
  return truncateText(statusText, 10)
}

export const getFieldLabel = (key: string): string => {
  const fieldLabels: Record<string, string> = {
    name: 'الاسم',
    phone: 'رقم الهاتف',
    profession: 'المهنة',
    nationality: 'الجنسية',
    residence_number: 'رقم الإقامة',
    passport_number: 'رقم الجواز',
    bank_account: 'الحساب البنكي',
    salary: 'الراتب',
    project_id: 'المشروع',
    company_id: 'المؤسسة',
    birth_date: 'تاريخ الميلاد',
    joining_date: 'تاريخ الالتحاق',
    residence_expiry: 'تاريخ انتهاء الإقامة',
    contract_expiry: 'تاريخ انتهاء العقد',
    hired_worker_contract_expiry: 'تاريخ انتهاء عقد أجير',
    health_insurance_expiry: 'تاريخ انتهاء التأمين الصحي',
    notes: 'الملاحظات',
    employee_name: 'اسم الموظف',
    company: 'المؤسسة',
  }
  return fieldLabels[key] || key
}
