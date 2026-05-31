export interface UnifiedSettingsData {
  residence_urgent_days: number
  residence_high_days: number
  residence_medium_days: number
  contract_urgent_days: number
  contract_high_days: number
  contract_medium_days: number
  health_insurance_urgent_days: number
  health_insurance_high_days: number
  health_insurance_medium_days: number
  hired_worker_contract_urgent_days: number
  hired_worker_contract_high_days: number
  hired_worker_contract_medium_days: number
  commercial_reg_urgent_days: number
  commercial_reg_high_days: number
  commercial_reg_medium_days: number
  power_subscription_urgent_days: number
  power_subscription_high_days: number
  power_subscription_medium_days: number
  moqeem_subscription_urgent_days: number
  moqeem_subscription_high_days: number
  moqeem_subscription_medium_days: number
  [key: string]: number
}

export const DEFAULT_SETTINGS: UnifiedSettingsData = {
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
  commercial_reg_urgent_days: 7,
  commercial_reg_high_days: 15,
  commercial_reg_medium_days: 30,
  power_subscription_urgent_days: 7,
  power_subscription_high_days: 15,
  power_subscription_medium_days: 30,
  moqeem_subscription_urgent_days: 7,
  moqeem_subscription_high_days: 15,
  moqeem_subscription_medium_days: 30,
}

export const EMPLOYEE_SECTIONS = [
  {
    key: 'residence',
    title: 'إقامات الموظفين',
    icon: '🛂',
    description: 'إعدادات ألوان وتنبيهات انتهاء الإقامات',
    fields: {
      urgent: 'residence_urgent_days',
      high: 'residence_high_days',
      medium: 'residence_medium_days',
    },
    type: 'employee' as const,
  },
  {
    key: 'contract',
    title: 'عقود الموظفين',
    icon: '📄',
    description: 'إعدادات ألوان وتنبيهات انتهاء عقود العمل',
    fields: {
      urgent: 'contract_urgent_days',
      high: 'contract_high_days',
      medium: 'contract_medium_days',
    },
    type: 'employee' as const,
  },
  {
    key: 'health',
    title: 'التأمين الصحي',
    icon: '🏥',
    description: 'إعدادات ألوان وتنبيهات انتهاء التأمين الصحي',
    fields: {
      urgent: 'health_insurance_urgent_days',
      high: 'health_insurance_high_days',
      medium: 'health_insurance_medium_days',
    },
    type: 'employee' as const,
  },
  {
    key: 'hired',
    title: 'عقود أجير',
    icon: '👷',
    description: 'إعدادات ألوان وتنبيهات انتهاء عقود الأجير',
    fields: {
      urgent: 'hired_worker_contract_urgent_days',
      high: 'hired_worker_contract_high_days',
      medium: 'hired_worker_contract_medium_days',
    },
    type: 'employee' as const,
  },
]

export const COMPANY_SECTIONS = [
  {
    key: 'commercial',
    title: 'السجل التجاري',
    icon: '🏢',
    description: 'إعدادات حالة وألوان وتنبيهات السجل التجاري',
    fields: {
      urgent: 'commercial_reg_urgent_days',
      high: 'commercial_reg_high_days',
      medium: 'commercial_reg_medium_days',
    },
    type: 'company' as const,
  },
  {
    key: 'power',
    title: 'اشتراك قوى',
    icon: '⚡',
    description: 'إعدادات حالة وألوان وتنبيهات اشتراك قوى',
    fields: {
      urgent: 'power_subscription_urgent_days',
      high: 'power_subscription_high_days',
      medium: 'power_subscription_medium_days',
    },
    type: 'company' as const,
  },
  {
    key: 'moqeem',
    title: 'اشتراك مقيم',
    icon: '👥',
    description: 'إعدادات حالة وألوان وتنبيهات اشتراك مقيم',
    fields: {
      urgent: 'moqeem_subscription_urgent_days',
      high: 'moqeem_subscription_high_days',
      medium: 'moqeem_subscription_medium_days',
    },
    type: 'company' as const,
  },
]
