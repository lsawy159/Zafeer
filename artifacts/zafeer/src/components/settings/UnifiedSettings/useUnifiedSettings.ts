import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { invalidateEmployeeNotificationThresholdsCache } from '@/utils/employeeAlerts'
import { invalidateNotificationThresholdsCache } from '@/utils/alerts'
import { invalidateStatusThresholdsCache } from '@/utils/autoCompanyStatus'
import {
  DEFAULT_EXPIRED_INCLUSION,
  getExpiredInclusionSettings,
  saveExpiredInclusionSettings,
  type ExpiredInclusionSettings,
} from '@/utils/expiredInclusionSettings'

/**
 * واجهة موحدة لجميع إعدادات النظام
 * تجمع: إعدادات الحالات، إعدادات التنبيهات، وألوان الجداول
 */
interface UnifiedSettingsData {
  // الموظفين - الإقامة
  residence_urgent_days: number
  residence_high_days: number
  residence_medium_days: number

  // الموظفين - العقود
  contract_urgent_days: number
  contract_high_days: number
  contract_medium_days: number

  // الموظفين - التأمين الصحي
  health_insurance_urgent_days: number
  health_insurance_high_days: number
  health_insurance_medium_days: number

  // الموظفين - عقد أجير
  hired_worker_contract_urgent_days: number
  hired_worker_contract_high_days: number
  hired_worker_contract_medium_days: number

  // المؤسسات - السجل التجاري (موحد مع الموظفين)
  commercial_reg_urgent_days: number
  commercial_reg_high_days: number
  commercial_reg_medium_days: number

  // المؤسسات - اشتراك قوى
  power_subscription_urgent_days: number
  power_subscription_high_days: number
  power_subscription_medium_days: number

  // المؤسسات - اشتراك مقيم
  moqeem_subscription_urgent_days: number
  moqeem_subscription_high_days: number
  moqeem_subscription_medium_days: number

  [key: string]: number
}

const DEFAULT_SETTINGS: UnifiedSettingsData = {
  // الموظفين - الإقامة
  residence_urgent_days: 7,
  residence_high_days: 15,
  residence_medium_days: 30,

  // الموظفين - العقود
  contract_urgent_days: 7,
  contract_high_days: 15,
  contract_medium_days: 30,

  // الموظفين - التأمين الصحي
  health_insurance_urgent_days: 30,
  health_insurance_high_days: 45,
  health_insurance_medium_days: 60,

  // الموظفين - عقد أجير
  hired_worker_contract_urgent_days: 7,
  hired_worker_contract_high_days: 15,
  hired_worker_contract_medium_days: 30,

  // المؤسسات - السجل التجاري (موحد مع الموظفين)
  commercial_reg_urgent_days: 7,
  commercial_reg_high_days: 15,
  commercial_reg_medium_days: 30,

  // المؤسسات - اشتراك قوى
  power_subscription_urgent_days: 7,
  power_subscription_high_days: 15,
  power_subscription_medium_days: 30,

  // المؤسسات - اشتراك مقيم
  moqeem_subscription_urgent_days: 7,
  moqeem_subscription_high_days: 15,
  moqeem_subscription_medium_days: 30,
}

// تكوين أقسام الموظفين
const EMPLOYEE_SECTIONS = [
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

// تكوين أقسام المؤسسات (موحد مع الموظفين)
const COMPANY_SECTIONS = [
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


export function useUnifiedSettings({ isReadOnly = false }: { isReadOnly?: boolean } = {}) {
  const [settings, setSettings] = useState<UnifiedSettingsData>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'employees' | 'companies'>('employees')
  const [expiredSettings, setExpiredSettings] = useState<ExpiredInclusionSettings>(
    DEFAULT_EXPIRED_INCLUSION
  )

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    void getExpiredInclusionSettings().then(setExpiredSettings)
  }, [])

  const loadSettings = async () => {
    try {
      const { data: notificationData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'notification_thresholds')
        .maybeSingle()

      const mergedSettings = {
        ...DEFAULT_SETTINGS,
        ...(notificationData?.setting_value || {}),
      }

      setSettings(mergedSettings)
    } catch (error) {
      logger.error('Error loading unified settings:', error)
      toast.error('تعذر تحميل الإعدادات، سيتم استخدام القيم الافتراضية')
      setSettings(DEFAULT_SETTINGS)
    } finally {
      setLoading(false)
    }
  }

  const handleExpiredInclusionChange = (
    key: keyof ExpiredInclusionSettings,
    checked: boolean
  ) => {
    setExpiredSettings((current) => {
      const next = { ...current, [key]: checked }
      void saveExpiredInclusionSettings(next).catch((error) => {
        logger.error('Error saving expired inclusion settings:', error)
        toast.error('طظ… ط§ظ„ط­ظپط¸ ط£ظˆ ط¬ط¯ط¯ ط§ظ„ظ…ط­ط§ظˆظ„ط©')
      })
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // حفظ إعدادات التنبيهات والحالات (موحدة للموظفين والمؤسسات)
      const notificationSettings = {
        // إعدادات الموظفين
        residence_urgent_days: settings.residence_urgent_days,
        residence_high_days: settings.residence_high_days,
        residence_medium_days: settings.residence_medium_days,
        contract_urgent_days: settings.contract_urgent_days,
        contract_high_days: settings.contract_high_days,
        contract_medium_days: settings.contract_medium_days,
        health_insurance_urgent_days: settings.health_insurance_urgent_days,
        health_insurance_high_days: settings.health_insurance_high_days,
        health_insurance_medium_days: settings.health_insurance_medium_days,
        hired_worker_contract_urgent_days: settings.hired_worker_contract_urgent_days,
        hired_worker_contract_high_days: settings.hired_worker_contract_high_days,
        hired_worker_contract_medium_days: settings.hired_worker_contract_medium_days,
        // إعدادات المؤسسات (موحدة)
        commercial_reg_urgent_days: settings.commercial_reg_urgent_days,
        commercial_reg_high_days: settings.commercial_reg_high_days,
        commercial_reg_medium_days: settings.commercial_reg_medium_days,
        power_subscription_urgent_days: settings.power_subscription_urgent_days,
        power_subscription_high_days: settings.power_subscription_high_days,
        power_subscription_medium_days: settings.power_subscription_medium_days,
        moqeem_subscription_urgent_days: settings.moqeem_subscription_urgent_days,
        moqeem_subscription_high_days: settings.moqeem_subscription_high_days,
        moqeem_subscription_medium_days: settings.moqeem_subscription_medium_days,
      }

      // حفظ البيانات باستخدام INSERT OR UPDATE
      // محاولة الحفظ مع إعادة محاولة في حالة الفشل
      const { error: notificationError } = await supabase
        .from('system_settings')
        .upsert(
          {
            setting_key: 'notification_thresholds',
            setting_value: notificationSettings,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'setting_key' }
        )
        .select()

      if (notificationError) {
        throw notificationError
      }

      // إبطال جميع الكاش
      invalidateNotificationThresholdsCache()
      invalidateEmployeeNotificationThresholdsCache()
      invalidateStatusThresholdsCache()

      toast.success('تم حفظ جميع الإعدادات بنجاح')
    } catch (error) {
      logger.error('Error saving unified settings:', error)

      // معالجة رسالة الخطأ
      let errorMessage = 'فشل حفظ الإعدادات'
      if (error instanceof Object && 'message' in error) {
        const errorMsg = (error as Record<string, unknown>).message as string
        if (errorMsg.includes('row-level security') || errorMsg.includes('RLS')) {
          errorMessage =
            'ليس لديك صلاحية كافية لحفظ الإعدادات. اطلب من المدير إعطاء صلاحية التعديل.'
        } else if (errorMsg.includes('permission') || errorMsg.includes('access')) {
          errorMessage = 'خطأ في الصلاحيات. تأكد من أن لديك صلاحية التعديل.'
        }
      }

      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const employeePreviews = useMemo(
    () =>
      EMPLOYEE_SECTIONS.map((section) => ({
        ...section,
        values: {
          urgentDays: settings[section.fields.urgent],
          highDays: settings[section.fields.high],
          mediumDays: settings[section.fields.medium],
          greenStart: settings[section.fields.medium] + 1,
        },
      })),
    [settings]
  )

  const companyPreviews = useMemo(
    () =>
      COMPANY_SECTIONS.map((section) => ({
        ...section,
        values: {
          urgentDays: settings[section.fields.urgent],
          highDays: settings[section.fields.high],
          mediumDays: settings[section.fields.medium],
          greenStart: settings[section.fields.medium] + 1,
        },
      })),
    [settings]
  )

  return {
    settings, setSettings,
    loading, saving,
    employeePreviews, companyPreviews,
    activeTab, setActiveTab,
    expiredSettings, setExpiredSettings,
    isReadOnly,
    loadSettings,
    handleSave,
    handleExpiredInclusionChange,
  }
}
