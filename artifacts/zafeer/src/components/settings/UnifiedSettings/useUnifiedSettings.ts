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
import {
  DEFAULT_SETTINGS,
  EMPLOYEE_SECTIONS,
  COMPANY_SECTIONS,
  type UnifiedSettingsData,
} from './unifiedSettingsConfig'


export function useUnifiedSettings({ isReadOnly = false }: { isReadOnly?: boolean } = {}) {
  const [settings, setSettings] = useState<UnifiedSettingsData>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'employees' | 'companies'>('employees')
  const [expiredSettings, setExpiredSettings] = useState<ExpiredInclusionSettings>(
    DEFAULT_EXPIRED_INCLUSION
  )

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSettings()
  }, [])

  useEffect(() => {
    void getExpiredInclusionSettings().then(setExpiredSettings)
  }, [])

  const handleExpiredInclusionChange = (
    key: keyof ExpiredInclusionSettings,
    checked: boolean
  ) => {
    setExpiredSettings((current) => {
      const next = { ...current, [key]: checked }
      void saveExpiredInclusionSettings(next).catch((error) => {
        logger.error('Error saving expired inclusion settings:', error)
        toast.error('فشل حفظ إعدادات تضمين المنتهي، أعد المحاولة')
      })
      return next
    })
  }

  const validateThresholdOrdering = (s: UnifiedSettingsData): { group: string } | null => {
    const groups = [
      { key: 'residence', label: 'إقامات الموظفين' },
      { key: 'contract', label: 'عقود الموظفين' },
      { key: 'health_insurance', label: 'التأمين الصحي' },
      { key: 'hired_worker_contract', label: 'عقد الأجير' },
      { key: 'commercial_reg', label: 'السجل التجاري' },
      { key: 'power_subscription', label: 'اشتراك الكهرباء' },
      { key: 'moqeem_subscription', label: 'اشتراك مقيم' },
    ]
    for (const { key, label } of groups) {
      const urgent = s[`${key}_urgent_days`]
      const high = s[`${key}_high_days`]
      const medium = s[`${key}_medium_days`]
      if (urgent > high || high > medium) return { group: label }
    }
    return null
  }

  const handleSave = async () => {
    const invalid = validateThresholdOrdering(settings)
    if (invalid) {
      toast.error(`ترتيب العتبات خاطئ في "${invalid.group}" — يجب: عاجل ≤ عالي ≤ متوسط`)
      return
    }

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
