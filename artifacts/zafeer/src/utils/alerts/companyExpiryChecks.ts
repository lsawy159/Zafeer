import { Alert } from '../../components/alerts/AlertCard'
import { type Company } from '../../lib/supabase'
import { getNotificationThresholds } from './alertThresholds'

interface AlertConfig {
  expiryFieldKey: keyof Company
  alertType: Alert['type']
  alertTitle: string
  idPrefix: string
  thresholdKeys: {
    urgent: string
    high: string
    medium: string
  }
  messageTemplate: {
    expired: (days: number, name: string) => string
    today: (name: string) => string
    tomorrow: (name: string) => string
    upcoming: (days: number, name: string) => string
    urgentUpcoming: (days: number, name: string) => string
    highUpcoming: (days: number, name: string) => string
  }
  actionTemplate: {
    expired: (name: string) => string
    today: (name: string) => string
    tomorrow: (name: string) => string
    upcoming: (days: number, name: string) => string
    urgentUpcoming: (days: number, name: string) => string
    highUpcoming: (days: number, name: string) => string
  }
}

type DefaultThresholds = Awaited<ReturnType<typeof getNotificationThresholds>>

async function createExpiryAlert(
  company: Company,
  config: AlertConfig,
  thresholds: DefaultThresholds
): Promise<Alert | null> {
  const expiryDateStr = company[config.expiryFieldKey]
  if (!expiryDateStr) {
    return null
  }

  const today = new Date()
  const expiryDate = new Date(expiryDateStr as string)
  const timeDiff = expiryDate.getTime() - today.getTime()
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24))

  const urgentThreshold = (thresholds[config.thresholdKeys.urgent as keyof DefaultThresholds] ?? thresholds.commercial_reg_urgent_days) as number
  const highThreshold = (thresholds[config.thresholdKeys.high as keyof DefaultThresholds] ?? thresholds.commercial_reg_high_days) as number
  const mediumThreshold = (thresholds[config.thresholdKeys.medium as keyof DefaultThresholds] ?? thresholds.commercial_reg_medium_days) as number

  if (daysRemaining > mediumThreshold) {
    return null
  }

  let priority: Alert['priority']
  if (daysRemaining < 0) {
    priority = 'urgent'
  } else if (daysRemaining <= urgentThreshold) {
    priority = 'urgent'
  } else if (daysRemaining <= highThreshold) {
    priority = 'high'
  } else if (daysRemaining <= mediumThreshold) {
    priority = 'medium'
  } else {
    priority = 'low'
  }

  let message: string
  let actionRequired: string

  if (daysRemaining < 0) {
    message = config.messageTemplate.expired(Math.abs(daysRemaining), company.name)
    actionRequired = config.actionTemplate.expired(company.name)
  } else if (daysRemaining === 0) {
    message = config.messageTemplate.today(company.name)
    actionRequired = config.actionTemplate.today(company.name)
  } else if (daysRemaining === 1) {
    message = config.messageTemplate.tomorrow(company.name)
    actionRequired = config.actionTemplate.tomorrow(company.name)
  } else if (daysRemaining <= urgentThreshold) {
    message = config.messageTemplate.urgentUpcoming(daysRemaining, company.name)
    actionRequired = config.actionTemplate.urgentUpcoming(daysRemaining, company.name)
  } else if (daysRemaining <= highThreshold) {
    message = config.messageTemplate.highUpcoming(daysRemaining, company.name)
    actionRequired = config.actionTemplate.highUpcoming(daysRemaining, company.name)
  } else {
    message = config.messageTemplate.upcoming(daysRemaining, company.name)
    actionRequired = config.actionTemplate.upcoming(daysRemaining, company.name)
  }

  return {
    id: `${config.idPrefix}${company.id}_${expiryDateStr}`,
    type: config.alertType,
    priority,
    title: config.alertTitle,
    message,
    company: {
      id: company.id,
      name: company.name,
      commercial_registration_expiry: company.commercial_registration_expiry,
      unified_number: company.unified_number,
    },
    expiry_date: expiryDateStr as string,
    days_remaining: daysRemaining,
    action_required: actionRequired,
    created_at: new Date().toISOString(),
  }
}

export async function checkCommercialRegistrationExpiry(company: Company): Promise<Alert | null> {
  const thresholds = await getNotificationThresholds()

  const config: AlertConfig = {
    expiryFieldKey: 'commercial_registration_expiry',
    alertType: 'commercial_registration_expiry',
    alertTitle: 'انتهاء صلاحية السجل التجاري',
    idPrefix: 'commercial_',
    thresholdKeys: {
      urgent: 'commercial_reg_urgent_days',
      high: 'commercial_reg_high_days',
      medium: 'commercial_reg_medium_days',
    },
    messageTemplate: {
      expired: (days, name) =>
        `انتهت صلاحية السجل التجاري للمؤسسة "${name}" منذ ${days} يوم. يجب تجديده فوراً لتجنب المشاكل القانونية.`,
      today: (name) => `ينتهي السجل التجاري للمؤسسة "${name}" اليوم. يجب تجديده قبل نهاية اليوم.`,
      tomorrow: (name) => `ينتهي السجل التجاري للمؤسسة "${name}" غداً. يفضل تجديده اليوم.`,
      upcoming: (days, name) =>
        `ينتهي السجل التجاري للمؤسسة "${name}" خلال ${days} يوم. يفضل تجديده قبل انتهاء المدة.`,
      urgentUpcoming: (days, name) =>
        `ينتهي السجل التجاري للمؤسسة "${name}" خلال ${days} أيام - إجراء فوري مطلوب.`,
      highUpcoming: (days, name) =>
        `ينتهي السجل التجاري للمؤسسة "${name}" خلال ${days} يوم - متابعة مطلوبة.`,
    },
    actionTemplate: {
      expired: (name) =>
        `قم بتجديد السجل التجاري للمؤسسة "${name}" في أقرب وقت ممكن لضمان استمرار النشاط القانوني.`,
      today: (name) => `قم بتجديد السجل التجاري للمؤسسة "${name}" قبل نهاية اليوم.`,
      tomorrow: (name) => `قم بتجديد السجل التجاري للمؤسسة "${name}" قبل انتهاء مدته غداً.`,
      upcoming: (days, name) =>
        `قم بترتيب تجديد السجل التجاري للمؤسسة "${name}" خلال ال ${days} يوم القادمة.`,
      urgentUpcoming: (days, name) =>
        `قم بترتيب تجديد السجل التجاري للمؤسسة "${name}" خلال ال ${days} أيام القادمة.`,
      highUpcoming: (days, name) =>
        `قم بترتيب تجديد السجل التجاري للمؤسسة "${name}" خلال ال ${days} يوم القادمة.`,
    },
  }

  return createExpiryAlert(company, config, thresholds)
}

export async function checkPowerSubscriptionExpiry(company: Company): Promise<Alert | null> {
  const thresholds = await getNotificationThresholds()

  const config: AlertConfig = {
    expiryFieldKey: 'ending_subscription_power_date',
    alertType: 'power_subscription_expiry',
    alertTitle: 'انتهاء صلاحية اشتراك قوى',
    idPrefix: 'power_',
    thresholdKeys: {
      urgent: 'power_subscription_urgent_days',
      high: 'power_subscription_high_days',
      medium: 'power_subscription_medium_days',
    },
    messageTemplate: {
      expired: (days, name) =>
        `انتهت صلاحية اشتراك قوى للمؤسسة "${name}" منذ ${days} يوم. يجب تجديده فوراً.`,
      today: (name) => `ينتهي اشتراك قوى للمؤسسة "${name}" اليوم. يجب تجديده قبل نهاية اليوم.`,
      tomorrow: (name) => `ينتهي اشتراك قوى للمؤسسة "${name}" غداً. يفضل تجديده اليوم.`,
      upcoming: (days, name) =>
        `ينتهي اشتراك قوى للمؤسسة "${name}" خلال ${days} يوم.`,
      urgentUpcoming: (days, name) =>
        `ينتهي اشتراك قوى للمؤسسة "${name}" خلال ${days} أيام - إجراء فوري مطلوب.`,
      highUpcoming: (days, name) =>
        `ينتهي اشتراك قوى للمؤسسة "${name}" خلال ${days} يوم - متابعة مطلوبة.`,
    },
    actionTemplate: {
      expired: (name) => `قم بتجديد اشتراك قوى للمؤسسة "${name}" في أقرب وقت ممكن.`,
      today: (name) => `قم بتجديد اشتراك قوى للمؤسسة "${name}" قبل نهاية اليوم.`,
      tomorrow: (name) => `قم بتجديد اشتراك قوى للمؤسسة "${name}" قبل انتهاء مدته غداً.`,
      upcoming: (days, name) =>
        `قم بمتابعة تجديد اشتراك قوى للمؤسسة "${name}" عند الحاجة.`,
      urgentUpcoming: (days, name) =>
        `قم بترتيب تجديد اشتراك قوى للمؤسسة "${name}" خلال ال ${days} أيام القادمة.`,
      highUpcoming: (days, name) =>
        `قم بترتيب تجديد اشتراك قوى للمؤسسة "${name}" خلال ال ${days} يوم القادمة.`,
    },
  }

  return createExpiryAlert(company, config, thresholds)
}

export async function checkMoqeemSubscriptionExpiry(company: Company): Promise<Alert | null> {
  const thresholds = await getNotificationThresholds()

  const config: AlertConfig = {
    expiryFieldKey: 'ending_subscription_moqeem_date',
    alertType: 'moqeem_subscription_expiry',
    alertTitle: 'انتهاء صلاحية اشتراك مقيم',
    idPrefix: 'moqeem_',
    thresholdKeys: {
      urgent: 'moqeem_subscription_urgent_days',
      high: 'moqeem_subscription_high_days',
      medium: 'moqeem_subscription_medium_days',
    },
    messageTemplate: {
      expired: (days, name) =>
        `انتهت صلاحية اشتراك مقيم للمؤسسة "${name}" منذ ${days} يوم. يجب تجديده فوراً.`,
      today: (name) => `ينتهي اشتراك مقيم للمؤسسة "${name}" اليوم. يجب تجديده قبل نهاية اليوم.`,
      tomorrow: (name) => `ينتهي اشتراك مقيم للمؤسسة "${name}" غداً. يفضل تجديده اليوم.`,
      upcoming: (days, name) =>
        `ينتهي اشتراك مقيم للمؤسسة "${name}" خلال ${days} يوم.`,
      urgentUpcoming: (days, name) =>
        `ينتهي اشتراك مقيم للمؤسسة "${name}" خلال ${days} أيام - إجراء فوري مطلوب.`,
      highUpcoming: (days, name) =>
        `ينتهي اشتراك مقيم للمؤسسة "${name}" خلال ${days} يوم - متابعة مطلوبة.`,
    },
    actionTemplate: {
      expired: (name) => `قم بتجديد اشتراك مقيم للمؤسسة "${name}" في أقرب وقت ممكن.`,
      today: (name) => `قم بتجديد اشتراك مقيم للمؤسسة "${name}" قبل نهاية اليوم.`,
      tomorrow: (name) => `قم بتجديد اشتراك مقيم للمؤسسة "${name}" قبل انتهاء مدته غداً.`,
      upcoming: (days, name) =>
        `قم بمتابعة تجديد اشتراك مقيم للمؤسسة "${name}" عند الحاجة.`,
      urgentUpcoming: (days, name) =>
        `قم بترتيب تجديد اشتراك مقيم للمؤسسة "${name}" خلال ال ${days} أيام القادمة.`,
      highUpcoming: (days, name) =>
        `قم بترتيب تجديد اشتراك مقيم للمؤسسة "${name}" خلال ال ${days} يوم القادمة.`,
    },
  }

  return createExpiryAlert(company, config, thresholds)
}
