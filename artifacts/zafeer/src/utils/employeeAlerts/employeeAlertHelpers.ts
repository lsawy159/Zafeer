import { Employee, Company } from '../../lib/supabase'
import { EmployeeAlert } from './employeeAlertThresholds'
import {
  checkContractExpiry,
  checkResidenceExpiry,
  checkHealthInsuranceExpiry,
  checkHiredWorkerContractExpiry,
} from './employeeExpiryChecks'

export async function generateEmployeeAlerts(
  employees: Employee[],
  companies: Company[]
): Promise<EmployeeAlert[]> {
  const alerts: EmployeeAlert[] = []

  const companyMap = new Map(companies.map((c) => [c.id, c]))

  for (const employee of employees) {
    const company = employee.company_id ? companyMap.get(employee.company_id) : undefined
    const companyInfo = company
      ? {
          id: company.id,
          name: company.name,
          commercial_registration_number: company.commercial_registration_expiry,
          unified_number: company.unified_number,
        }
      : { id: '', name: 'بدون مؤسسة', commercial_registration_number: undefined, unified_number: undefined }

    const contractAlert = await checkContractExpiry(employee)
    if (contractAlert) {
      contractAlert.company = companyInfo
      alerts.push(contractAlert)
    }

    const residenceAlert = await checkResidenceExpiry(employee)
    if (residenceAlert) {
      residenceAlert.company = companyInfo
      alerts.push(residenceAlert)
    }

    const healthInsuranceAlert = await checkHealthInsuranceExpiry(employee)
    if (healthInsuranceAlert) {
      healthInsuranceAlert.company = companyInfo
      alerts.push(healthInsuranceAlert)
    }

    const hiredWorkerContractAlert = await checkHiredWorkerContractExpiry(employee)
    if (hiredWorkerContractAlert) {
      hiredWorkerContractAlert.company = companyInfo
      alerts.push(hiredWorkerContractAlert)
    }
  }

  return alerts.sort((a, b) => {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
    if (priorityDiff !== 0) return priorityDiff

    const daysA = a.days_remaining ?? Infinity
    const daysB = b.days_remaining ?? Infinity
    return daysA - daysB
  })
}

export function enrichEmployeeAlertsWithCompanyData(
  alerts: EmployeeAlert[],
  companies: Company[]
): EmployeeAlert[] {
  return alerts.map((alert) => {
    const company = companies.find((c) => c.id === alert.employee.company_id)
    if (company) {
      return {
        ...alert,
        company: {
          id: company.id,
          name: company.name,
          commercial_registration_number: company.commercial_registration_expiry,
          unified_number: company.unified_number,
        },
      }
    }
    return alert
  })
}

export function filterEmployeeAlertsByPriority(
  alerts: EmployeeAlert[],
  priorities: EmployeeAlert['priority'][]
): EmployeeAlert[] {
  if (priorities.length === 0) {
    return alerts
  }
  return alerts.filter((alert) => priorities.includes(alert.priority))
}

export function filterEmployeeAlertsByType(
  alerts: EmployeeAlert[],
  type: EmployeeAlert['type']
): EmployeeAlert[] {
  return alerts.filter((alert) => alert.type === type)
}

export function getEmployeeAlertsStats(alerts: EmployeeAlert[]) {
  const totalAlerts = alerts.length

  const uniqueEmployeeIds = new Set(alerts.map((a) => a.employee.id))
  const total = uniqueEmployeeIds.size

  const employeeMaxPriority = new Map<string, 'urgent' | 'high' | 'medium' | 'low'>()
  const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }

  alerts.forEach((alert) => {
    const empId = alert.employee.id

    if (!employeeMaxPriority.has(empId)) {
      employeeMaxPriority.set(empId, alert.priority)
    } else {
      const currentPriority = employeeMaxPriority.get(empId)!
      if (priorityOrder[alert.priority] > priorityOrder[currentPriority]) {
        employeeMaxPriority.set(empId, alert.priority)
      }
    }
  })

  const urgent = Array.from(employeeMaxPriority.values()).filter((p) => p === 'urgent').length
  const high = Array.from(employeeMaxPriority.values()).filter((p) => p === 'high').length
  const medium = Array.from(employeeMaxPriority.values()).filter((p) => p === 'medium').length
  const low = Array.from(employeeMaxPriority.values()).filter((p) => p === 'low').length

  const contractAlerts = alerts.filter((a) => a.type === 'contract_expiry').length
  const residenceAlerts = alerts.filter((a) => a.type === 'residence_expiry').length
  const healthInsuranceAlerts = alerts.filter((a) => a.type === 'health_insurance_expiry').length
  const hiredWorkerContractAlerts = alerts.filter(
    (a) => a.type === 'hired_worker_contract_expiry'
  ).length

  return {
    total,
    totalAlerts,
    urgent,
    high,
    medium,
    low,
    contractAlerts,
    residenceAlerts,
    healthInsuranceAlerts,
    hiredWorkerContractAlerts,
  }
}

export function getUrgentEmployeeAlerts(alerts: EmployeeAlert[]): EmployeeAlert[] {
  return alerts.filter((alert) => alert.priority === 'urgent' || alert.priority === 'high')
}

export function getExpiredEmployeeAlerts(alerts: EmployeeAlert[]): EmployeeAlert[] {
  return alerts.filter((alert) => alert.days_remaining !== undefined && alert.days_remaining < 0)
}
