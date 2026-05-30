import { Employee, Company } from '../../lib/supabase'
import { supabase } from '../../lib/supabase'
import { logger } from '../logger'
import { EmployeeAlert } from './employeeAlertThresholds'
import {
  checkContractExpiry,
  checkResidenceExpiry,
  checkHealthInsuranceExpiry,
  checkHiredWorkerContractExpiry,
} from './employeeExpiryChecks'

const loggedEmployeeDigestKeys = new Set<string>()

function getTodayEmployeeAlertDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function getEmployeeDigestKey(alert: EmployeeAlert): string {
  return `${alert.employee.id}:${alert.type}:${alert.expiry_date ?? getTodayEmployeeAlertDate()}`
}

async function logEmployeeAlertsForDigest(alerts: EmployeeAlert[], employees: Employee[]) {
  if (import.meta.env.MODE === 'test' || import.meta.env.VITEST) {
    return
  }

  const employeeMap = new Map(employees.map((employee) => [employee.id, employee]))
  const urgentHighAlerts = alerts.filter((alert) => alert.priority === 'urgent' || alert.priority === 'high')

  if (urgentHighAlerts.length === 0) {
    return
  }

  const logsToSend = urgentHighAlerts
    .filter((alert) => {
      const digestKey = getEmployeeDigestKey(alert)
      if (loggedEmployeeDigestKeys.has(digestKey)) {
        return false
      }
      loggedEmployeeDigestKeys.add(digestKey)
      return true
    })
    .map((alert) => {
      const employee = employeeMap.get(alert.employee.id)
      return {
        employee_id: alert.employee.id,
        alert_type: alert.type,
        priority: alert.priority,
        title: alert.title,
        message: alert.message,
        action_required: alert.action_required,
        expiry_date: alert.expiry_date || null,
        details: {
          employee_name: alert.employee.name,
          employee_profession: alert.employee.profession,
          employee_nationality: alert.employee.nationality,
          residence_number: employee?.residence_number,
          unified_number: alert.company?.unified_number,
        },
      }
    })

  if (logsToSend.length === 0) {
    return
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  fetch(`${supabaseUrl}/functions/v1/log-alert-digest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${(await supabase.auth.getSession())?.data?.session?.access_token || ''}`,
    },
    body: JSON.stringify({ logs: logsToSend }),
  })
    .then((res) => res.json())
    .then((result) => {
      logger.debug(`Employee alert digest logging: ${result.logged} logged, ${result.skipped} skipped, ${result.failed} failed`)
    })
    .catch((err) => {
      logger.error('Failed to call log-alert-digest function:', err)
    })
}

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

  logEmployeeAlertsForDigest(alerts, employees)

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
