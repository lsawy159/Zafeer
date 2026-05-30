import { Alert } from '../../components/alerts/AlertCard'

export function filterAlertsByPriority(
  alerts: Alert[],
  priorities: Alert['priority'][]
): Alert[] {
  if (priorities.length === 0) {
    return alerts
  }
  return alerts.filter((alert) => priorities.includes(alert.priority))
}

export function filterAlertsByType(alerts: Alert[], type: Alert['type']): Alert[] {
  return alerts.filter((alert) => alert.type === type)
}

export function getAlertsStats(alerts: Alert[]) {
  const totalAlerts = alerts.length

  const uniqueCompanyIds = new Set(alerts.map((a) => a.company?.id).filter(Boolean))
  const total = uniqueCompanyIds.size

  const companyMaxPriority = new Map<string, 'urgent' | 'high' | 'medium' | 'low'>()
  const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }

  alerts.forEach((alert) => {
    const companyId = alert.company?.id
    if (!companyId) return

    if (!companyMaxPriority.has(companyId)) {
      companyMaxPriority.set(companyId, alert.priority)
    } else {
      const currentPriority = companyMaxPriority.get(companyId)!
      if (priorityOrder[alert.priority] > priorityOrder[currentPriority]) {
        companyMaxPriority.set(companyId, alert.priority)
      }
    }
  })

  const urgent = Array.from(companyMaxPriority.values()).filter((p) => p === 'urgent').length
  const high = Array.from(companyMaxPriority.values()).filter((p) => p === 'high').length
  const medium = Array.from(companyMaxPriority.values()).filter((p) => p === 'medium').length
  const low = Array.from(companyMaxPriority.values()).filter((p) => p === 'low').length

  const commercialRegAlerts = alerts.filter(
    (a) => a.type === 'commercial_registration_expiry'
  ).length
  const powerAlerts = alerts.filter((a) => a.type === 'power_subscription_expiry').length
  const moqeemAlerts = alerts.filter((a) => a.type === 'moqeem_subscription_expiry').length

  return {
    total,
    totalAlerts,
    urgent,
    high,
    medium,
    low,
    commercialRegAlerts,
    powerAlerts,
    moqeemAlerts,
  }
}

export function getUrgentAlerts(alerts: Alert[]): Alert[] {
  return alerts.filter((alert) => alert.priority === 'urgent' || alert.priority === 'high')
}

export function getExpiredAlerts(alerts: Alert[]): Alert[] {
  return alerts.filter((alert) => alert.days_remaining !== undefined && alert.days_remaining < 0)
}
