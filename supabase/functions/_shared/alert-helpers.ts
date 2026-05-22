// @author ZaFeer System
// مساعدات مُشتركة بين daily-notification-run و send-alert-report

export interface Thresholds {
  urgent_days: number
  warning_days: number
  alert_days: number
}

// استخراج حدود الخطورة لنوع وثيقة معيّن من notification_thresholds
export function getThresholdsForType(
  notificationThresholds: Record<string, number>,
  docType: string,
): Thresholds {
  const prefix = docType // e.g. 'residence', 'contract', 'health_insurance'
  return {
    urgent_days: notificationThresholds[`${prefix}_urgent_days`] ?? 7,
    warning_days: notificationThresholds[`${prefix}_high_days`] ?? 15,
    alert_days: notificationThresholds[`${prefix}_medium_days`] ?? 30,
  }
}

// حساب الأيام المتبقية بتوقيت Asia/Riyadh (تاريخ فقط، بدون وقت)
export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const todayRiyadh = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()) // "YYYY-MM-DD"
  const today = new Date(todayRiyadh)
  const target = new Date(dateStr)
  return Math.floor((target.getTime() - today.getTime()) / 86400000)
}

// تحديد مستوى الخطورة بناءً على الأيام المتبقية والحدود
export function getSeverityLevel(
  days: number | null,
  thresholds: Thresholds,
): 'عاجل' | 'تحذير' | 'تنبيه' | null {
  if (days === null) return null
  if (days <= thresholds.urgent_days) return 'عاجل'
  if (days <= thresholds.warning_days) return 'تحذير'
  if (days <= thresholds.alert_days) return 'تنبيه'
  return null
}

// تحديد أعلى مستوى خطورة لكيان (من مجموعة مستويات وثائقه)
export function getEntitySeverity(
  levels: (ReturnType<typeof getSeverityLevel>)[],
): 'عاجل' | 'تحذير' | 'تنبيه' | null {
  if (levels.includes('عاجل')) return 'عاجل'
  if (levels.includes('تحذير')) return 'تحذير'
  if (levels.includes('تنبيه')) return 'تنبيه'
  return null
}

// هل الكيان نشط (لديه تنبيه واحد على الأقل)؟
export function isEntityActive(
  levels: (ReturnType<typeof getSeverityLevel>)[],
): boolean {
  return getEntitySeverity(levels) !== null
}

// تنسيق التاريخ بصيغة dd/MM/yyyy
export function formatDateDDMMYYYY(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

// بناء CSV من مصفوفة objects (UTF-8 BOM للعربية في Excel)
export function arrayToCsv(rows: Record<string, unknown>[]): string {
  if (!rows || rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const BOM = '﻿'
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }
  const lines = [
    headers.map(escape).join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ]
  return BOM + lines.join('\r\n')
}

// بناء شيت المؤجلات (للتقرير اليدوي فقط)
export interface DeferredNotificationRow {
  snoozed_until: string | null
  is_deferred: boolean
  notification_type: string
  entity_type: string
  entity_id: string
  entity_name: string
  entity_identifier: string
  expiry_date: string | null
  days_remaining: number | null
}

export function buildDeferredSheet(deferredRows: DeferredNotificationRow[]): Record<string, unknown>[] {
  return deferredRows.map((r) => ({
    'نوع الكيان': r.entity_type === 'employee' ? 'موظف' : 'مؤسسة',
    'المعرّف': r.entity_identifier,
    'الاسم': r.entity_name,
    'نوع الوثيقة': docTypeLabel(r.notification_type),
    'تاريخ انتهاء الوثيقة': formatDateDDMMYYYY(r.expiry_date),
    'الأيام المتبقية': r.days_remaining !== null ? String(r.days_remaining) : '',
    'مؤجَّل حتى': r.is_deferred
      ? 'إلى أجل غير مسمى'
      : r.snoozed_until
        ? formatDateDDMMYYYY(r.snoozed_until)
        : '',
  }))
}

function docTypeLabel(t: string): string {
  const map: Record<string, string> = {
    residence_expiry: 'إقامة',
    contract_expiry: 'عقد عمل',
    health_insurance_expiry: 'تأمين طبي',
    hired_worker_contract_expiry: 'عقد أجير',
    commercial_registration_expiry: 'سجل تجاري',
    power_subscription_expiry: 'اشتراك قوى',
    moqeem_subscription_expiry: 'اشتراك مقيم',
  }
  return map[t] ?? t
}
