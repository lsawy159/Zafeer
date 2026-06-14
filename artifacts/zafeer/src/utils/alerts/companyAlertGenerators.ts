import { Alert } from '../../components/alerts/AlertCard'
import { type Company } from '../../lib/supabase'
import { getNotificationThresholds } from './alertThresholds'
import {
  checkCommercialRegistrationExpiry,
  checkPowerSubscriptionExpiry,
  checkMoqeemSubscriptionExpiry,
} from './companyExpiryChecks'

export async function generateCompanyAlerts(companies: Company[]): Promise<Alert[]> {
  const alerts: Alert[] = []

  for (const company of companies) {
    const commercialRegAlert = await checkCommercialRegistrationExpiry(company)
    if (commercialRegAlert) {
      alerts.push(commercialRegAlert)
    }

    const powerAlert = await checkPowerSubscriptionExpiry(company)
    if (powerAlert) {
      alerts.push(powerAlert)
    }

    const moqeemAlert = await checkMoqeemSubscriptionExpiry(company)
    if (moqeemAlert) {
      alerts.push(moqeemAlert)
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

export async function generateCompanyAlertsSync(companies: Company[]): Promise<Alert[]> {
  const alerts: Alert[] = []
  const thresholds = await getNotificationThresholds()

  companies.forEach((company) => {
    if (company.commercial_registration_expiry) {
      const today = new Date()
      const expiryDate = new Date(company.commercial_registration_expiry)
      const timeDiff = expiryDate.getTime() - today.getTime()
      const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24))

      if (daysRemaining <= thresholds.commercial_reg_medium_days) {
        let priority: Alert['priority']
        if (daysRemaining < 0) {
          priority = 'urgent'
        } else if (daysRemaining <= thresholds.commercial_reg_urgent_days) {
          priority = 'urgent'
        } else if (
          daysRemaining <=
          (thresholds.commercial_reg_high_days || thresholds.commercial_reg_urgent_days + 15)
        ) {
          priority = 'high'
        } else {
          priority = 'medium'
        }

        alerts.push({
          id: `commercial_${company.id}_${company.commercial_registration_expiry}`,
          type: 'commercial_registration_expiry',
          priority,
          title: 'انتهاء صلاحية السجل التجاري',
          message: `ينتهي السجل التجاري للمؤسسة "${company.name}" ${daysRemaining < 0 ? `منذ ${Math.abs(daysRemaining)} يوم` : `خلال ${daysRemaining} يوم`}`,
          company: {
            id: company.id,
            name: company.name,
            commercial_registration_expiry: company.commercial_registration_expiry,
            unified_number: company.unified_number,
          },
          expiry_date: company.commercial_registration_expiry,
          days_remaining: daysRemaining,
          action_required: `قم بتجديد السجل التجاري للمؤسسة "${company.name}"`,
          created_at: new Date().toISOString(),
        })
      }
    }

    if (company.ending_subscription_power_date) {
      const today = new Date()
      const expiryDate = new Date(company.ending_subscription_power_date)
      const timeDiff = expiryDate.getTime() - today.getTime()
      const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24))

      const urgentDays =
        thresholds.power_subscription_urgent_days ?? thresholds.commercial_reg_urgent_days
      const highDays =
        thresholds.power_subscription_high_days ?? thresholds.commercial_reg_high_days
      const mediumDays =
        thresholds.power_subscription_medium_days ?? thresholds.commercial_reg_medium_days

      if (daysRemaining <= mediumDays) {
        let priority: Alert['priority']
        let message: string
        let actionRequired: string

        if (daysRemaining < 0) {
          priority = 'urgent'
          const daysExpired = Math.abs(daysRemaining)
          message = `انتهت صلاحية اشتراك قوى للمؤسسة "${company.name}" منذ ${daysExpired} يوم. يجب تجديده فوراً.`
          actionRequired = `قم بتجديد اشتراك قوى للمؤسسة "${company.name}" في أقرب وقت ممكن.`
        } else if (daysRemaining <= urgentDays) {
          priority = 'urgent'
          message = `ينتهي اشتراك قوى للمؤسسة "${company.name}" خلال ${daysRemaining} أيام - إجراء فوري مطلوب.`
          actionRequired = `قم بترتيب تجديد اشتراك قوى للمؤسسة "${company.name}" خلال ال ${daysRemaining} أيام القادمة.`
        } else if (daysRemaining <= (highDays || urgentDays + 15)) {
          priority = 'high'
          message = `ينتهي اشتراك قوى للمؤسسة "${company.name}" خلال ${daysRemaining} يوم - متابعة مطلوبة.`
          actionRequired = `قم بترتيب تجديد اشتراك قوى للمؤسسة "${company.name}" خلال ال ${daysRemaining} يوم القادمة.`
        } else {
          priority = 'medium'
          message = `ينتهي اشتراك قوى للمؤسسة "${company.name}" خلال ${daysRemaining} يوم.`
          actionRequired = `قم بمتابعة تجديد اشتراك قوى للمؤسسة "${company.name}" عند الحاجة.`
        }

        alerts.push({
          id: `power_${company.id}_${company.ending_subscription_power_date}`,
          type: 'power_subscription_expiry',
          priority,
          title: 'انتهاء صلاحية اشتراك قوى',
          message,
          company: {
            id: company.id,
            name: company.name,
            commercial_registration_expiry: company.commercial_registration_expiry,
            unified_number: company.unified_number,
          },
          expiry_date: company.ending_subscription_power_date,
          days_remaining: daysRemaining,
          action_required: actionRequired,
          created_at: new Date().toISOString(),
        })
      }
    }

    if (company.ending_subscription_moqeem_date) {
      const today = new Date()
      const expiryDate = new Date(company.ending_subscription_moqeem_date)
      const timeDiff = expiryDate.getTime() - today.getTime()
      const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24))

      const urgentDays =
        thresholds.moqeem_subscription_urgent_days ?? thresholds.commercial_reg_urgent_days
      const highDays =
        thresholds.moqeem_subscription_high_days ?? thresholds.commercial_reg_high_days
      const mediumDays =
        thresholds.moqeem_subscription_medium_days ?? thresholds.commercial_reg_medium_days

      if (daysRemaining <= mediumDays) {
        let priority: Alert['priority']
        let message: string
        let actionRequired: string

        if (daysRemaining < 0) {
          priority = 'urgent'
          const daysExpired = Math.abs(daysRemaining)
          message = `انتهت صلاحية اشتراك مقيم للمؤسسة "${company.name}" منذ ${daysExpired} يوم. يجب تجديده فوراً.`
          actionRequired = `قم بتجديد اشتراك مقيم للمؤسسة "${company.name}" في أقرب وقت ممكن.`
        } else if (daysRemaining <= urgentDays) {
          priority = 'urgent'
          message = `ينتهي اشتراك مقيم للمؤسسة "${company.name}" خلال ${daysRemaining} أيام - إجراء فوري مطلوب.`
          actionRequired = `قم بترتيب تجديد اشتراك مقيم للمؤسسة "${company.name}" خلال ال ${daysRemaining} أيام القادمة.`
        } else if (daysRemaining <= (highDays || urgentDays + 15)) {
          priority = 'high'
          message = `ينتهي اشتراك مقيم للمؤسسة "${company.name}" خلال ${daysRemaining} يوم - متابعة مطلوبة.`
          actionRequired = `قم بترتيب تجديد اشتراك مقيم للمؤسسة "${company.name}" خلال ال ${daysRemaining} يوم القادمة.`
        } else {
          priority = 'medium'
          message = `ينتهي اشتراك مقيم للمؤسسة "${company.name}" خلال ${daysRemaining} يوم.`
          actionRequired = `قم بمتابعة تجديد اشتراك مقيم للمؤسسة "${company.name}" عند الحاجة.`
        }

        alerts.push({
          id: `moqeem_${company.id}_${company.ending_subscription_moqeem_date}`,
          type: 'moqeem_subscription_expiry',
          priority,
          title: 'انتهاء صلاحية اشتراك مقيم',
          message,
          company: {
            id: company.id,
            name: company.name,
            commercial_registration_expiry: company.commercial_registration_expiry,
            unified_number: company.unified_number,
          },
          expiry_date: company.ending_subscription_moqeem_date,
          days_remaining: daysRemaining,
          action_required: actionRequired,
          created_at: new Date().toISOString(),
        })
      }
    }
  })

  return alerts.sort((a, b) => {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
    if (priorityDiff !== 0) return priorityDiff

    const daysA = a.days_remaining ?? Infinity
    const daysB = b.days_remaining ?? Infinity
    return daysA - daysB
  })
}
