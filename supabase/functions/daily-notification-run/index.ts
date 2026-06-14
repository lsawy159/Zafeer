// @author ZaFeer System
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import ExcelJS from 'npm:exceljs@4.4.0'
import JSZip from 'https://esm.sh/jszip@3.10.1'

interface Thresholds {
  urgent_days: number
  warning_days: number
  alert_days: number
}

function getThresholdsForType(notificationThresholds: Record<string, number>, docType: string): Thresholds {
  return {
    urgent_days: notificationThresholds[`${docType}_urgent_days`] ?? 7,
    warning_days: notificationThresholds[`${docType}_high_days`] ?? 15,
    alert_days: notificationThresholds[`${docType}_medium_days`] ?? 30,
  }
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const todayRiyadh = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  const today = new Date(todayRiyadh)
  const target = new Date(dateStr)
  return Math.floor((target.getTime() - today.getTime()) / 86400000)
}

function getSeverityLevel(days: number | null, thresholds: Thresholds): 'عاجل' | 'تحذير' | 'تنبيه' | null {
  if (days === null) return null
  if (days <= thresholds.urgent_days) return 'عاجل'
  if (days <= thresholds.warning_days) return 'تحذير'
  if (days <= thresholds.alert_days) return 'تنبيه'
  return null
}

function getEntitySeverity(levels: (ReturnType<typeof getSeverityLevel>)[]): 'عاجل' | 'تحذير' | 'تنبيه' | null {
  if (levels.includes('عاجل')) return 'عاجل'
  if (levels.includes('تحذير')) return 'تحذير'
  if (levels.includes('تنبيه')) return 'تنبيه'
  return null
}

function isEntityActive(levels: (ReturnType<typeof getSeverityLevel>)[]): boolean {
  return getEntitySeverity(levels) !== null
}

function formatDateDDMMYYYY(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getUTCFullYear()}`
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// ─── Quiet Hours ───────────────────────────────────────────────────────────────

// Returns true if current Asia/Riyadh time falls inside [start, end] quiet window.
// Handles midnight crossing (e.g., 23:50–08:30).
function isInQuietHours(start: string, end: string): { active: boolean; currentTime: string } {
  const now = new Date()
  const riyadhFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Riyadh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const currentTime = riyadhFormatter.format(now) // "HH:MM"

  const cur = currentTime.replace(':', '')
  const s = start.replace(':', '')
  const e = end.replace(':', '')

  // Midnight-crossing window: start > end means it wraps (e.g., 23:50 → 08:30)
  const active = s > e ? (cur >= s || cur <= e) : (cur >= s && cur <= e)
  return { active, currentTime }
}

// ─── system_settings reader ────────────────────────────────────────────────────

interface SystemSettings {
  quiet_hours_start: string
  quiet_hours_end: string
  admin_email: string
  include_expired_in_daily_email: boolean
}

async function readSettings(admin: ReturnType<typeof createClient>): Promise<SystemSettings> {
  const keys = ['quiet_hours_start', 'quiet_hours_end', 'admin_email']
  const { data, error } = await admin
    .from('system_settings')
    .select('setting_key, setting_value')
    .in('setting_key', keys)

  const map: Record<string, string> = {}
  if (!error && data) {
    for (const row of data) {
      const val = row.setting_value
      let strVal = typeof val === 'string' ? val : String(val ?? '')
      // JSONB column stores strings as JSON-encoded — e.g. '"email@x.com"' → 'email@x.com'
      if (strVal.startsWith('"')) {
        try { strVal = JSON.parse(strVal) } catch { /* leave as-is */ }
      }
      map[row.setting_key] = strVal
    }
  }

  const { data: expiredRow } = await admin
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'expired_inclusion_settings')
    .maybeSingle()

  const expiredValue = expiredRow?.setting_value
  const expiredObject =
    expiredValue && typeof expiredValue === 'object'
      ? (expiredValue as { include_in_daily_email?: boolean })
      : typeof expiredValue === 'string'
        ? (() => {
            try {
              return JSON.parse(expiredValue) as { include_in_daily_email?: boolean }
            } catch {
              return null
            }
          })()
        : null

  return {
    quiet_hours_start: map['quiet_hours_start'] ?? '23:50',
    quiet_hours_end: map['quiet_hours_end'] ?? '08:30',
    admin_email: map['admin_email'] ?? '',
    include_expired_in_daily_email: expiredObject?.include_in_daily_email ?? true,
  }
}

// ─── Email HTML builder ────────────────────────────────────────────────────────

interface NotificationRow {
  id: string
  type: string
  title: string
  message: string
  entity_type: string
  priority: string
  days_remaining: number | null
  target_date: string | null
  snoozed_until?: string | null
  is_deferred?: boolean | null
}

interface SnoozedAlertRow {
  alert_id: string
  snoozed_until: string | null
  is_deferred: boolean
}

const ALERT_ID_PREFIXES: Record<string, string> = {
  commercial_registration_expiry: 'commercial',
  power_subscription_expiry: 'power',
  moqeem_subscription_expiry: 'moqeem',
  contract_expiry: 'contract',
  residence_expiry: 'residence',
  health_insurance_expiry: 'health_insurance',
  hired_worker_contract_expiry: 'hired_worker_contract',
}

function getNotificationAlertId(notification: NotificationRow): string | null {
  const prefix = ALERT_ID_PREFIXES[notification.type]
  if (!prefix || !notification.entity_id || !notification.target_date) {
    return null
  }

  return `${prefix}_${notification.entity_id}_${notification.target_date}`
}

type DigestSeverityCounts = {
  total_entities: number
  employees_count: number
  companies_count: number
  critical: number
  high: number
  medium: number
  attachment_available: boolean
}

function buildDigestHtml(counts: DigestSeverityCounts, today: string): string {
  const badge = (label: string, color: string, count: number) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;margin:0 0 10px;background:#fff;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:9999px;background:${color};"></span>
        <span style="color:#111827;font-size:14px;font-weight:600;">${label}</span>
      </div>
      <span style="color:${color};font-size:14px;font-weight:700;">${count}</span>
    </div>
  `

  return `<!DOCTYPE html>
<!-- digest_template_version: 022-summary-only -->
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ملخص التنبيهات اليومي — زفير</title>
</head>
<body style="font-family:Tahoma,Arial,sans-serif;direction:rtl;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:32px;">
    <h2 style="color:#111827;margin:0 0 4px;">ملخص التنبيهات اليومي</h2>
    <p style="color:#6b7280;margin:0 0 4px;font-size:14px;">تاريخ: ${today}</p>
    <p style="color:#6b7280;margin:0 0 16px;font-size:13px;">
      إجمالي الكيانات ذات تنبيهات نشطة: <strong style="color:#111827;">${counts.total_entities}</strong>
      <span style="color:#9ca3af;">(موظفون: ${counts.employees_count} - مؤسسات: ${counts.companies_count})</span>
    </p>

    ${badge('عاجل', '#dc2626', counts.critical)}
    ${badge('تحذير', '#ea580c', counts.high)}
    ${badge('تنبيه', '#ca8a04', counts.medium)}

    <p style="color:#6b7280;margin:14px 0 0;font-size:13px;">
      ${counts.attachment_available ? 'مرفق ملف ZIP يحتوي على ملفات Excel متعددة الشيتات وملف CSV للمؤجلات.' : 'تعذر إرفاق ملف التفاصيل (ZIP) في هذا الإرسال.'}
    </p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">
      تم إرسال هذا البريد تلقائياً من نظام زفير. لا ترد على هذه الرسالة.
    </p>
  </div>
</body>
</html>`
}

// ─── Excel builders (same logic as send-alert-report) ─────────────────────────

const DEFAULT_THRESHOLDS: Record<string, number> = {
  residence_urgent_days: 7, residence_high_days: 15, residence_medium_days: 30,
  contract_urgent_days: 7, contract_high_days: 15, contract_medium_days: 30,
  commercial_reg_urgent_days: 7, commercial_reg_high_days: 15, commercial_reg_medium_days: 30,
  health_insurance_urgent_days: 30, health_insurance_high_days: 45, health_insurance_medium_days: 60,
  power_subscription_urgent_days: 7, power_subscription_high_days: 15, power_subscription_medium_days: 30,
  moqeem_subscription_urgent_days: 7, moqeem_subscription_high_days: 15, moqeem_subscription_medium_days: 30,
}

function getCellArgb(days: number | null, thresholds: Thresholds): string | null {
  if (days === null) return null
  if (days < 0) return 'FFFECACA'
  const sev = getSeverityLevel(days, thresholds)
  if (sev === 'عاجل') return 'FFFEE2E2'
  if (sev === 'تحذير') return 'FFFFEDD5'
  if (sev === 'تنبيه') return 'FFFEF9C3'
  return 'FFDCFCE7'
}

function buildEmployeeCategorySheet(
  employees: Record<string, unknown>[],
  companyNameMap: Map<string, string>,
  thresholds: Record<string, number>,
  docType: 'residence' | 'contract' | 'health_insurance' | 'hired_worker_contract',
  dateKey: string,
  dateLabel: string,
  includeExpired: boolean,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  const docThresholds = getThresholdsForType(thresholds, docType)

  for (const emp of employees) {
    const dateValue = emp[dateKey] as string | null
    const days = daysUntil(dateValue)
    const sev = getSeverityLevel(days, docThresholds)
    if (sev === null) continue
    if (!includeExpired && days !== null && days < 0) continue

    rows.push({
      'رقم الإقامة': emp.residence_number ?? '',
      'اسم الموظف': emp.name,
      'اسم الشركة': companyNameMap.get(emp.company_id as string) ?? '',
      [dateLabel]: formatDateDDMMYYYY(dateValue),
      'الأيام المتبقية': days !== null ? String(days) : '',
      _days: days,
      'مستوى الخطورة': sev,
    })
  }

  return rows
}

function buildCompanyCategorySheet(
  companies: Record<string, unknown>[],
  thresholds: Record<string, number>,
  docType: 'commercial_reg' | 'power_subscription' | 'moqeem_subscription',
  dateKey: string,
  dateLabel: string,
  includeExpired: boolean,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  const docThresholds = getThresholdsForType(thresholds, docType)

  for (const co of companies) {
    const dateValue = co[dateKey] as string | null
    const days = daysUntil(dateValue)
    const sev = getSeverityLevel(days, docThresholds)
    if (sev === null) continue
    if (!includeExpired && days !== null && days < 0) continue

    rows.push({
      'الرقم الموحد': co.unified_number ?? '',
      'اسم المؤسسة': co.name,
      [dateLabel]: formatDateDDMMYYYY(dateValue),
      'الأيام المتبقية': days !== null ? String(days) : '',
      _days: days,
      'مستوى الخطورة': sev,
    })
  }

  return rows
}

async function buildXlsxWorkbook(
  sheets: {
    name: string
    headers: string[]
    keys: string[]
    widths: number[]
    rows: Record<string, unknown>[]
    daysKey: string | null
    thresholds: Thresholds | null
  }[],
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'ZaFeer System'

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name)

    ws.columns = sheet.keys.map((key, i) => ({
      header: sheet.headers[i],
      key,
      width: sheet.widths[i] ?? 18,
    }))

    ws.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FF1F2937' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1D5DB' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } },
      }
    })

    for (const rowData of sheet.rows) {
      const displayRow: Record<string, unknown> = {}
      for (const key of sheet.keys) {
        displayRow[key] = rowData[key] ?? ''
      }

      const addedRow = ws.addRow(displayRow)

      if (sheet.daysKey && sheet.thresholds) {
        const days = (rowData._days as number | null | undefined) ?? null
        const argb = getCellArgb(days, sheet.thresholds)
        if (argb) {
          const daysColIdx = sheet.keys.indexOf(sheet.daysKey) + 1
          if (daysColIdx > 0) {
            addedRow.getCell(daysColIdx).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb },
            }
            if (daysColIdx > 1) {
              addedRow.getCell(daysColIdx - 1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb },
              }
            }
          }
        }
      }
    }

    ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }]
  }

  const buffer = await wb.xlsx.writeBuffer()
  return new Uint8Array(buffer as ArrayBuffer)
}

async function buildAlertCsvZip(
  admin: ReturnType<typeof createClient>,
  thresholds: Record<string, number>,
  includeExpired: boolean,
): Promise<{ zipBytes: Uint8Array | null; empRows: Record<string, unknown>[]; coRows: Record<string, unknown>[] }> {
  const { data: employees } = await admin
    .from('employees')
    .select('id, residence_number, name, company_id, residence_expiry, contract_expiry, health_insurance_expiry, hired_worker_contract_expiry')
    .eq('is_deleted', false)

  const { data: companies } = await admin
    .from('companies')
    .select('id, unified_number, name, commercial_registration_expiry, ending_subscription_power_date, ending_subscription_moqeem_date')

  const companyNameMap = new Map<string, string>(
    (companies ?? []).map((c: Record<string, unknown>) => [c.id as string, c.name as string])
  )

  const empRows: Record<string, unknown>[] = []
  for (const e of employees ?? []) {
    const emp = e as Record<string, unknown>
    const resDays = daysUntil(emp.residence_expiry as string | null)
    const conDays = daysUntil(emp.contract_expiry as string | null)
    const hiDays = daysUntil(emp.health_insurance_expiry as string | null)
    const hwDays = daysUntil(emp.hired_worker_contract_expiry as string | null)
    const resSev = getSeverityLevel(resDays, getThresholdsForType(thresholds, 'residence'))
    const conSev = getSeverityLevel(conDays, getThresholdsForType(thresholds, 'contract'))
    const hiSev = getSeverityLevel(hiDays, getThresholdsForType(thresholds, 'health_insurance'))
    const hwSev = getSeverityLevel(hwDays, getThresholdsForType(thresholds, 'hired_worker_contract'))
    if (!isEntityActive([resSev, conSev, hiSev, hwSev])) continue
    if (!includeExpired && [resDays, conDays, hiDays, hwDays].every((days) => days !== null && days < 0)) continue
    empRows.push({
      'رقم الإقامة': emp.residence_number ?? '',
      'اسم الموظف': emp.name,
      'اسم الشركة': companyNameMap.get(emp.company_id as string) ?? '',
      'تاريخ انتهاء الإقامة': formatDateDDMMYYYY(emp.residence_expiry as string | null),
      'الأيام المتبقية (الإقامة)': resDays !== null ? String(resDays) : '',
      'تاريخ انتهاء العقد': formatDateDDMMYYYY(emp.contract_expiry as string | null),
      'الأيام المتبقية (العقد)': conDays !== null ? String(conDays) : '',
      'تاريخ انتهاء التأمين الطبي': formatDateDDMMYYYY(emp.health_insurance_expiry as string | null),
      'الأيام المتبقية (التأمين)': hiDays !== null ? String(hiDays) : '',
      'تاريخ انتهاء عقد الأجير': formatDateDDMMYYYY(emp.hired_worker_contract_expiry as string | null),
      'الأيام المتبقية (عقد الأجير)': hwDays !== null ? String(hwDays) : '',
      'مستوى الخطورة': getEntitySeverity([resSev, conSev, hiSev, hwSev]) ?? '',
    })
  }

  const coRows: Record<string, unknown>[] = []
  for (const c of companies ?? []) {
    const co = c as Record<string, unknown>
    const crDays = daysUntil(co.commercial_registration_expiry as string | null)
    const pwDays = daysUntil(co.ending_subscription_power_date as string | null)
    const mqDays = daysUntil(co.ending_subscription_moqeem_date as string | null)
    const crSev = getSeverityLevel(crDays, getThresholdsForType(thresholds, 'commercial_reg'))
    const pwSev = getSeverityLevel(pwDays, getThresholdsForType(thresholds, 'power_subscription'))
    const mqSev = getSeverityLevel(mqDays, getThresholdsForType(thresholds, 'moqeem_subscription'))
    if (!isEntityActive([crSev, pwSev, mqSev])) continue
    if (!includeExpired && [crDays, pwDays, mqDays].every((days) => days !== null && days < 0)) continue
    coRows.push({
      'الرقم الموحد': co.unified_number ?? '',
      'اسم المؤسسة': co.name,
      'تاريخ انتهاء السجل التجاري': formatDateDDMMYYYY(co.commercial_registration_expiry as string | null),
      'الأيام المتبقية (السجل)': crDays !== null ? String(crDays) : '',
      'تاريخ انتهاء اشتراك قوى': formatDateDDMMYYYY(co.ending_subscription_power_date as string | null),
      'الأيام المتبقية (قوى)': pwDays !== null ? String(pwDays) : '',
      'تاريخ انتهاء اشتراك مقيم': formatDateDDMMYYYY(co.ending_subscription_moqeem_date as string | null),
      'الأيام المتبقية (مقيم)': mqDays !== null ? String(mqDays) : '',
      'مستوى الخطورة': getEntitySeverity([crSev, pwSev, mqSev]) ?? '',
    })
  }

  if (empRows.length === 0 && coRows.length === 0) return { zipBytes: null, empRows, coRows }

  const employeeRecords = (employees ?? []) as Record<string, unknown>[]
  const companyRecords = (companies ?? []) as Record<string, unknown>[]

  const employeeResidenceRows = buildEmployeeCategorySheet(employeeRecords, companyNameMap, thresholds, 'residence', 'residence_expiry', 'تاريخ انتهاء الإقامة', includeExpired)
  const employeeHealthRows = buildEmployeeCategorySheet(employeeRecords, companyNameMap, thresholds, 'health_insurance', 'health_insurance_expiry', 'تاريخ انتهاء التأمين الطبي', includeExpired)
  const employeeContractRows = buildEmployeeCategorySheet(employeeRecords, companyNameMap, thresholds, 'contract', 'contract_expiry', 'تاريخ انتهاء العقد', includeExpired)
  const employeeWorkerRows = buildEmployeeCategorySheet(employeeRecords, companyNameMap, thresholds, 'hired_worker_contract', 'hired_worker_contract_expiry', 'تاريخ انتهاء عقد الأجير', includeExpired)
  const companyCommercialRows = buildCompanyCategorySheet(companyRecords, thresholds, 'commercial_reg', 'commercial_registration_expiry', 'تاريخ انتهاء السجل التجاري', includeExpired)
  const companyPowerRows = buildCompanyCategorySheet(companyRecords, thresholds, 'power_subscription', 'ending_subscription_power_date', 'تاريخ انتهاء اشتراك قوى', includeExpired)
  const companyMoqeemRows = buildCompanyCategorySheet(companyRecords, thresholds, 'moqeem_subscription', 'ending_subscription_moqeem_date', 'تاريخ انتهاء اشتراك مقيم', includeExpired)

  const zip = new JSZip()

  const employeesXlsx = await buildXlsxWorkbook([
    {
      name: 'الكامل',
      headers: [
        'رقم الإقامة',
        'اسم الموظف',
        'اسم الشركة',
        'تاريخ انتهاء الإقامة',
        'الأيام المتبقية (الإقامة)',
        'تاريخ انتهاء العقد',
        'الأيام المتبقية (العقد)',
        'تاريخ انتهاء التأمين الطبي',
        'الأيام المتبقية (التأمين)',
        'تاريخ انتهاء عقد الأجير',
        'الأيام المتبقية (عقد الأجير)',
        'مستوى الخطورة',
      ],
      keys: [
        'رقم الإقامة',
        'اسم الموظف',
        'اسم الشركة',
        'تاريخ انتهاء الإقامة',
        'الأيام المتبقية (الإقامة)',
        'تاريخ انتهاء العقد',
        'الأيام المتبقية (العقد)',
        'تاريخ انتهاء التأمين الطبي',
        'الأيام المتبقية (التأمين)',
        'تاريخ انتهاء عقد الأجير',
        'الأيام المتبقية (عقد الأجير)',
        'مستوى الخطورة',
      ],
      widths: [14, 22, 22, 18, 14, 18, 14, 18, 14, 18, 14, 12],
      rows: empRows,
      daysKey: null,
      thresholds: null,
    },
    {
      name: 'إقامة',
      headers: ['رقم الإقامة', 'اسم الموظف', 'اسم الشركة', 'تاريخ انتهاء الإقامة', 'الأيام المتبقية', 'مستوى الخطورة'],
      keys: ['رقم الإقامة', 'اسم الموظف', 'اسم الشركة', 'تاريخ انتهاء الإقامة', 'الأيام المتبقية', 'مستوى الخطورة'],
      widths: [14, 22, 22, 18, 14, 12],
      rows: employeeResidenceRows,
      daysKey: 'الأيام المتبقية',
      thresholds: getThresholdsForType(thresholds, 'residence'),
    },
    {
      name: 'تأمين طبي',
      headers: ['رقم الإقامة', 'اسم الموظف', 'اسم الشركة', 'تاريخ انتهاء التأمين الطبي', 'الأيام المتبقية', 'مستوى الخطورة'],
      keys: ['رقم الإقامة', 'اسم الموظف', 'اسم الشركة', 'تاريخ انتهاء التأمين الطبي', 'الأيام المتبقية', 'مستوى الخطورة'],
      widths: [14, 22, 22, 20, 14, 12],
      rows: employeeHealthRows,
      daysKey: 'الأيام المتبقية',
      thresholds: getThresholdsForType(thresholds, 'health_insurance'),
    },
    {
      name: 'عقد عمل',
      headers: ['رقم الإقامة', 'اسم الموظف', 'اسم الشركة', 'تاريخ انتهاء العقد', 'الأيام المتبقية', 'مستوى الخطورة'],
      keys: ['رقم الإقامة', 'اسم الموظف', 'اسم الشركة', 'تاريخ انتهاء العقد', 'الأيام المتبقية', 'مستوى الخطورة'],
      widths: [14, 22, 22, 18, 14, 12],
      rows: employeeContractRows,
      daysKey: 'الأيام المتبقية',
      thresholds: getThresholdsForType(thresholds, 'contract'),
    },
    {
      name: 'عقد أجير',
      headers: ['رقم الإقامة', 'اسم الموظف', 'اسم الشركة', 'تاريخ انتهاء عقد الأجير', 'الأيام المتبقية', 'مستوى الخطورة'],
      keys: ['رقم الإقامة', 'اسم الموظف', 'اسم الشركة', 'تاريخ انتهاء عقد الأجير', 'الأيام المتبقية', 'مستوى الخطورة'],
      widths: [14, 22, 22, 20, 14, 12],
      rows: employeeWorkerRows,
      daysKey: 'الأيام المتبقية',
      thresholds: getThresholdsForType(thresholds, 'hired_worker_contract'),
    },
  ])
  zip.file('employees.xlsx', employeesXlsx)

  const companiesXlsx = await buildXlsxWorkbook([
    {
      name: 'الكامل',
      headers: [
        'الرقم الموحد',
        'اسم المؤسسة',
        'تاريخ انتهاء السجل التجاري',
        'الأيام المتبقية (السجل)',
        'تاريخ انتهاء اشتراك قوى',
        'الأيام المتبقية (قوى)',
        'تاريخ انتهاء اشتراك مقيم',
        'الأيام المتبقية (مقيم)',
        'مستوى الخطورة',
      ],
      keys: [
        'الرقم الموحد',
        'اسم المؤسسة',
        'تاريخ انتهاء السجل التجاري',
        'الأيام المتبقية (السجل)',
        'تاريخ انتهاء اشتراك قوى',
        'الأيام المتبقية (قوى)',
        'تاريخ انتهاء اشتراك مقيم',
        'الأيام المتبقية (مقيم)',
        'مستوى الخطورة',
      ],
      widths: [14, 24, 20, 14, 18, 14, 18, 14, 12],
      rows: coRows,
      daysKey: null,
      thresholds: null,
    },
    {
      name: 'سجل تجاري',
      headers: ['الرقم الموحد', 'اسم المؤسسة', 'تاريخ انتهاء السجل التجاري', 'الأيام المتبقية', 'مستوى الخطورة'],
      keys: ['الرقم الموحد', 'اسم المؤسسة', 'تاريخ انتهاء السجل التجاري', 'الأيام المتبقية', 'مستوى الخطورة'],
      widths: [14, 24, 20, 14, 12],
      rows: companyCommercialRows,
      daysKey: 'الأيام المتبقية',
      thresholds: getThresholdsForType(thresholds, 'commercial_reg'),
    },
    {
      name: 'اشتراك قوى',
      headers: ['الرقم الموحد', 'اسم المؤسسة', 'تاريخ انتهاء اشتراك قوى', 'الأيام المتبقية', 'مستوى الخطورة'],
      keys: ['الرقم الموحد', 'اسم المؤسسة', 'تاريخ انتهاء اشتراك قوى', 'الأيام المتبقية', 'مستوى الخطورة'],
      widths: [14, 24, 18, 14, 12],
      rows: companyPowerRows,
      daysKey: 'الأيام المتبقية',
      thresholds: getThresholdsForType(thresholds, 'power_subscription'),
    },
    {
      name: 'اشتراك مقيم',
      headers: ['الرقم الموحد', 'اسم المؤسسة', 'تاريخ انتهاء اشتراك مقيم', 'الأيام المتبقية', 'مستوى الخطورة'],
      keys: ['الرقم الموحد', 'اسم المؤسسة', 'تاريخ انتهاء اشتراك مقيم', 'الأيام المتبقية', 'مستوى الخطورة'],
      widths: [14, 24, 18, 14, 12],
      rows: companyMoqeemRows,
      daysKey: 'الأيام المتبقية',
      thresholds: getThresholdsForType(thresholds, 'moqeem_subscription'),
    },
  ])
  zip.file('companies.xlsx', companiesXlsx)

  const zipBytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
  return { zipBytes, empRows, coRows }
}

// ─── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
  const TEMPLATE_VERSION = '022-summary-only'
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev'

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse({ success: false, error: 'Server misconfigured: missing Supabase env vars' }, 500)
  }
  if (!RESEND_API_KEY) {
    return jsonResponse({ success: false, error: 'Server misconfigured: missing RESEND_API_KEY' }, 500)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('[daily-notification-run] template_version:', TEMPLATE_VERSION)

  // 1. Read system settings
  const settings = await readSettings(admin)

  // 2. Quiet hours check
  const { active: quietActive, currentTime } = isInQuietHours(
    settings.quiet_hours_start,
    settings.quiet_hours_end,
  )
  if (quietActive) {
    return jsonResponse({
      success: true,
      skipped: true,
      skipped_reason: 'quiet_hours',
      quiet_hours_start: settings.quiet_hours_start,
      quiet_hours_end: settings.quiet_hours_end,
      current_time: currentTime,
    })
  }

  // 3. Call RPC to generate/update in-app notifications
  const { error: rpcError } = await admin.rpc('generate_expiry_notifications')
  if (rpcError) {
    return jsonResponse({ success: false, error: 'RPC failed: ' + rpcError.message }, 500)
  }

  // 4. Fetch all non-archived notifications
  const { data: allNotifications, error: fetchError } = await admin
    .from('notifications')
    .select('id, type, title, message, entity_type, priority, days_remaining, target_date, snoozed_until, is_deferred')
    .eq('is_archived', false)
    .order('priority', { ascending: true })
    .order('days_remaining', { ascending: true })

  if (fetchError) {
    return jsonResponse({ success: false, error: 'Fetch notifications failed: ' + fetchError.message }, 500)
  }

  const now = new Date()
  const { data: snoozedRows, error: snoozedError } = await admin
    .from('snoozed_alerts')
    .select('alert_id, snoozed_until, is_deferred')

  if (snoozedError) {
    return jsonResponse({ success: false, error: 'Fetch snoozed alerts failed: ' + snoozedError.message }, 500)
  }

  const activeSnoozedIds = new Set(
    (snoozedRows ?? [])
      .filter((row: SnoozedAlertRow) => row.is_deferred === true || (!!row.snoozed_until && new Date(row.snoozed_until) > now))
      .map((row: SnoozedAlertRow) => row.alert_id)
  )

  const activeAlerts = (allNotifications ?? []).filter((n: NotificationRow) => {
    const alertId = getNotificationAlertId(n)
    return alertId ? !activeSnoozedIds.has(alertId) : true
  })

  if (activeAlerts.length === 0) {
    return jsonResponse({
      success: true,
      skipped: false,
      alerts_count: 0,
      email_sent: false,
      email_skip_reason: 'no_alerts',
      in_app_generated: true,
    })
  }

  // 6. Check admin_email
  if (!settings.admin_email || !settings.admin_email.includes('@')) {
    return jsonResponse({
      success: true,
      skipped: false,
      alerts_count: activeAlerts.length,
      email_sent: false,
      email_skip_reason: 'no_admin_email',
      in_app_generated: true,
    })
  }

  // 7. Build HTML digest
  const todayStr = new Intl.DateTimeFormat('ar-SA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  // 8. Build Excel ZIP attachment (best-effort — skip if fails)
  const digestThresholds: Record<string, number> = { ...DEFAULT_THRESHOLDS }
  const { data: threshRow } = await admin
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'notification_thresholds')
    .maybeSingle()
  if (threshRow?.setting_value && typeof threshRow.setting_value === 'object') {
    Object.assign(digestThresholds, threshRow.setting_value)
  }

  const reportData = await buildAlertCsvZip(
    admin,
    digestThresholds,
    settings.include_expired_in_daily_email,
  ).catch(() => null)
  const zipBytes = reportData?.zipBytes ?? null
  const empRows = reportData?.empRows ?? []
  const coRows = reportData?.coRows ?? []
  const filteredEmpRows = settings.include_expired_in_daily_email
    ? empRows
    : empRows.filter(
        (row) =>
          (row._days as number | null | undefined) === null ||
          (row._days as number | undefined) === undefined ||
          (row._days as number) >= 0,
      )
  const filteredCoRows = settings.include_expired_in_daily_email
    ? coRows
    : coRows.filter(
        (row) =>
          (row._days as number | null | undefined) === null ||
          (row._days as number | undefined) === undefined ||
          (row._days as number) >= 0,
      )

  const severityFromRow = (row: Record<string, unknown>): 'عاجل' | 'تحذير' | 'تنبيه' | null => {
    const raw = row['مستوى الخطورة']
    if (raw === 'عاجل' || raw === 'تحذير' || raw === 'تنبيه') return raw
    return null
  }

  const entityTotal = filteredEmpRows.length + filteredCoRows.length
  const severityCounts: DigestSeverityCounts = {
    total_entities: entityTotal,
    employees_count: filteredEmpRows.length,
    companies_count: filteredCoRows.length,
    critical: 0,
    high: 0,
    medium: 0,
    attachment_available: zipBytes !== null,
  }

  for (const r of filteredEmpRows) {
    const sev = severityFromRow(r)
    if (sev === 'عاجل') severityCounts.critical++
    else if (sev === 'تحذير') severityCounts.high++
    else if (sev === 'تنبيه') severityCounts.medium++
  }
  for (const r of filteredCoRows) {
    const sev = severityFromRow(r)
    if (sev === 'عاجل') severityCounts.critical++
    else if (sev === 'تحذير') severityCounts.high++
    else if (sev === 'تنبيه') severityCounts.medium++
  }

  const htmlBody = buildDigestHtml(severityCounts, todayStr)
  const subjectTotal = entityTotal > 0 ? entityTotal : activeAlerts.length
  let attachments: { filename: string; content: string }[] | undefined
  if (zipBytes) {
    let zipBinary = ''
    const CHUNK = 8192
    for (let i = 0; i < zipBytes.length; i += CHUNK) {
      zipBinary += String.fromCharCode(...zipBytes.slice(i, i + CHUNK))
    }
    const todayForFile = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date())
    attachments = [{ filename: `alert-report-${todayForFile}.zip`, content: btoa(zipBinary) }]
  }

  // 9. Send via Resend
  const resend = new Resend(RESEND_API_KEY)
  const { error: sendError } = await resend.emails.send({
    from: FROM_EMAIL,
    to: settings.admin_email,
    subject: `ملخص التنبيهات اليومي — زفير | ${subjectTotal} تنبيه (v022)`,
    html: htmlBody,
    ...(attachments ? { attachments } : {}),
  })

  if (sendError) {
    return jsonResponse({
      success: false,
      error: 'Resend error: ' + String((sendError as { message?: string }).message ?? sendError),
    }, 500)
  }

  // Upsert csv_report_last_sent if ZIP was attached
  if (zipBytes) {
    const isoNow2 = new Date().toISOString()
    await admin
      .from('system_settings')
      .upsert(
        { setting_key: 'csv_report_last_sent', setting_value: JSON.stringify(isoNow2), updated_at: isoNow2 },
        { onConflict: 'setting_key' },
      )
  }

  // 11. Upsert expiry_digest_last_sent
  const isoNow = new Date().toISOString()
  await admin
    .from('system_settings')
    .upsert(
      { setting_key: 'expiry_digest_last_sent', setting_value: JSON.stringify(isoNow), updated_at: isoNow },
      { onConflict: 'setting_key' },
    )

  return jsonResponse({
    success: true,
    skipped: false,
    alerts_count: subjectTotal,
    email_sent: true,
    in_app_generated: true,
    quiet_hours_active: false,
    template_version: TEMPLATE_VERSION,
    totals: {
      total_entities: severityCounts.total_entities,
      employees_count: severityCounts.employees_count,
      companies_count: severityCounts.companies_count,
      critical: severityCounts.critical,
      high: severityCounts.high,
      medium: severityCounts.medium,
    },
    attachment_available: severityCounts.attachment_available,
  })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[daily-notification-run] Unhandled error:', msg)
    return jsonResponse({ success: false, error: 'Internal error: ' + msg }, 500)
  }
})
