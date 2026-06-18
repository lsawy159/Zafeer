// @author ZaFeer System
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import ExcelJS from 'npm:exceljs@4.4.0'
import JSZip from 'https://esm.sh/jszip@3.10.1'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_ZIP_BYTES = 35 * 1024 * 1024

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

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

function arrayToCsv(rows: Record<string, unknown>[]): string {
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

function buildDeferredSheet(deferredRows: DeferredNotificationRow[]): Record<string, unknown>[] {
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

interface DeferredNotificationRow {
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

interface SnoozedAlertRow {
  alert_id: string
  snoozed_until: string | null
  is_deferred: boolean
}

function employeeAlertId(
  prefix: 'contract' | 'residence' | 'health_insurance' | 'hired_worker_contract',
  employeeId: string,
  expiry: string | null | undefined
) {
  return `${prefix}_${employeeId}_${expiry ?? ''}`
}

function companyAlertId(
  prefix: 'commercial' | 'power' | 'moqeem',
  companyId: string,
  expiry: string | null | undefined
) {
  return `${prefix}_${companyId}_${expiry ?? ''}`
}

function parseAlertId(alertId: string): { prefix: string; entityId: string; expiryDate: string } | null {
  const lastSep = alertId.lastIndexOf('_')
  if (lastSep <= 0) return null
  const expiryDate = alertId.slice(lastSep + 1)
  const entityAndPrefix = alertId.slice(0, lastSep)
  const entitySep = entityAndPrefix.lastIndexOf('_')
  if (entitySep <= 0) return null
  return {
    prefix: entityAndPrefix.slice(0, entitySep),
    entityId: entityAndPrefix.slice(entitySep + 1),
    expiryDate,
  }
}

// ─── Employee / Company row builders ──────────────────────────────────────────

const DEFAULT_THRESHOLDS: Record<string, number> = {
  residence_urgent_days: 7, residence_high_days: 15, residence_medium_days: 30,
  contract_urgent_days: 7, contract_high_days: 15, contract_medium_days: 30,
  commercial_reg_urgent_days: 7, commercial_reg_high_days: 15, commercial_reg_medium_days: 30,
  health_insurance_urgent_days: 30, health_insurance_high_days: 45, health_insurance_medium_days: 60,
  power_subscription_urgent_days: 7, power_subscription_high_days: 15, power_subscription_medium_days: 30,
  moqeem_subscription_urgent_days: 7, moqeem_subscription_high_days: 15, moqeem_subscription_medium_days: 30,
}

interface EmployeeRow {
  id: string
  residence_number: number | null
  name: string
  company_name: string
  residence_expiry: string | null
  contract_expiry: string | null
  health_insurance_expiry: string | null
  hired_worker_contract_expiry: string | null
}

function buildEmployeesRows(
  employees: EmployeeRow[],
  thresholds: Record<string, number>,
  snoozedIds: Set<string>,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  for (const emp of employees) {
    const resDays = daysUntil(emp.residence_expiry)
    const conDays = daysUntil(emp.contract_expiry)
    const hiDays = daysUntil(emp.health_insurance_expiry)
    const hwDays = daysUntil(emp.hired_worker_contract_expiry)

    const resSev = getSeverityLevel(resDays, getThresholdsForType(thresholds, 'residence'))
    const conSev = getSeverityLevel(conDays, getThresholdsForType(thresholds, 'contract'))
    const hiSev = getSeverityLevel(hiDays, getThresholdsForType(thresholds, 'health_insurance'))
    const hwSev = getSeverityLevel(hwDays, getThresholdsForType(thresholds, 'hired_worker_contract'))
    const activeSeverities = [
      resSev && !snoozedIds.has(employeeAlertId('residence', emp.id, emp.residence_expiry))
        ? resSev
        : null,
      conSev && !snoozedIds.has(employeeAlertId('contract', emp.id, emp.contract_expiry))
        ? conSev
        : null,
      hiSev && !snoozedIds.has(employeeAlertId('health_insurance', emp.id, emp.health_insurance_expiry))
        ? hiSev
        : null,
      hwSev && !snoozedIds.has(employeeAlertId('hired_worker_contract', emp.id, emp.hired_worker_contract_expiry))
        ? hwSev
        : null,
    ]

    if (!isEntityActive(activeSeverities)) continue

    rows.push({
      'رقم الإقامة': emp.residence_number ?? '',
      'اسم الموظف': emp.name,
      'اسم الشركة': emp.company_name,
      'تاريخ انتهاء الإقامة': snoozedIds.has(employeeAlertId('residence', emp.id, emp.residence_expiry))
        ? ''
        : formatDateDDMMYYYY(emp.residence_expiry),
      'الأيام المتبقية (الإقامة)': snoozedIds.has(employeeAlertId('residence', emp.id, emp.residence_expiry))
        ? ''
        : resDays !== null
          ? String(resDays)
          : '',
      'تاريخ انتهاء العقد': snoozedIds.has(employeeAlertId('contract', emp.id, emp.contract_expiry))
        ? ''
        : formatDateDDMMYYYY(emp.contract_expiry),
      'الأيام المتبقية (العقد)': snoozedIds.has(employeeAlertId('contract', emp.id, emp.contract_expiry))
        ? ''
        : conDays !== null
          ? String(conDays)
          : '',
      'تاريخ انتهاء التأمين الطبي': snoozedIds.has(employeeAlertId('health_insurance', emp.id, emp.health_insurance_expiry))
        ? ''
        : formatDateDDMMYYYY(emp.health_insurance_expiry),
      'الأيام المتبقية (التأمين)': snoozedIds.has(employeeAlertId('health_insurance', emp.id, emp.health_insurance_expiry))
        ? ''
        : hiDays !== null
          ? String(hiDays)
          : '',
      'تاريخ انتهاء عقد الأجير': snoozedIds.has(employeeAlertId('hired_worker_contract', emp.id, emp.hired_worker_contract_expiry))
        ? ''
        : formatDateDDMMYYYY(emp.hired_worker_contract_expiry),
      'الأيام المتبقية (عقد الأجير)': snoozedIds.has(employeeAlertId('hired_worker_contract', emp.id, emp.hired_worker_contract_expiry))
        ? ''
        : hwDays !== null
          ? String(hwDays)
          : '',
      'مستوى الخطورة': getEntitySeverity(activeSeverities) ?? '',
    })
  }
  return rows
}

interface CompanyRow {
  id: string
  unified_number: number | null
  name: string
  commercial_registration_expiry: string | null
  ending_subscription_power_date: string | null
  ending_subscription_moqeem_date: string | null
}

function buildCompaniesRows(
  companies: CompanyRow[],
  thresholds: Record<string, number>,
  snoozedIds: Set<string>,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  for (const co of companies) {
    const crDays = daysUntil(co.commercial_registration_expiry)
    const pwDays = daysUntil(co.ending_subscription_power_date)
    const mqDays = daysUntil(co.ending_subscription_moqeem_date)

    const crSev = getSeverityLevel(crDays, getThresholdsForType(thresholds, 'commercial_reg'))
    const pwSev = getSeverityLevel(pwDays, getThresholdsForType(thresholds, 'power_subscription'))
    const mqSev = getSeverityLevel(mqDays, getThresholdsForType(thresholds, 'moqeem_subscription'))
    const activeSeverities = [
      crSev && !snoozedIds.has(companyAlertId('commercial', co.id, co.commercial_registration_expiry))
        ? crSev
        : null,
      pwSev && !snoozedIds.has(companyAlertId('power', co.id, co.ending_subscription_power_date))
        ? pwSev
        : null,
      mqSev && !snoozedIds.has(companyAlertId('moqeem', co.id, co.ending_subscription_moqeem_date))
        ? mqSev
        : null,
    ]

    if (!isEntityActive(activeSeverities)) continue

    rows.push({
      'الرقم الموحد': co.unified_number ?? '',
      'اسم المؤسسة': co.name,
      'تاريخ انتهاء السجل التجاري': snoozedIds.has(companyAlertId('commercial', co.id, co.commercial_registration_expiry))
        ? ''
        : formatDateDDMMYYYY(co.commercial_registration_expiry),
      'الأيام المتبقية (السجل)': snoozedIds.has(companyAlertId('commercial', co.id, co.commercial_registration_expiry))
        ? ''
        : crDays !== null
          ? String(crDays)
          : '',
      'تاريخ انتهاء اشتراك قوى': snoozedIds.has(companyAlertId('power', co.id, co.ending_subscription_power_date))
        ? ''
        : formatDateDDMMYYYY(co.ending_subscription_power_date),
      'الأيام المتبقية (قوى)': snoozedIds.has(companyAlertId('power', co.id, co.ending_subscription_power_date))
        ? ''
        : pwDays !== null
          ? String(pwDays)
          : '',
      'تاريخ انتهاء اشتراك مقيم': snoozedIds.has(companyAlertId('moqeem', co.id, co.ending_subscription_moqeem_date))
        ? ''
        : formatDateDDMMYYYY(co.ending_subscription_moqeem_date),
      'الأيام المتبقية (مقيم)': snoozedIds.has(companyAlertId('moqeem', co.id, co.ending_subscription_moqeem_date))
        ? ''
        : mqDays !== null
          ? String(mqDays)
          : '',
      'مستوى الخطورة': getEntitySeverity(activeSeverities) ?? '',
    })
  }
  return rows
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
  employees: EmployeeRow[],
  thresholds: Record<string, number>,
  docType: 'residence' | 'contract' | 'health_insurance' | 'hired_worker_contract',
  dateKey: keyof EmployeeRow,
  dateLabel: string,
  snoozedIds: Set<string>,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  const docThresholds = getThresholdsForType(thresholds, docType)

  for (const emp of employees) {
    const dateValue = emp[dateKey] as string | null
    const days = daysUntil(dateValue)
    const sev = getSeverityLevel(days, docThresholds)
    if (sev === null || snoozedIds.has(employeeAlertId(docType, emp.id, dateValue))) continue

    rows.push({
      'رقم الإقامة': emp.residence_number ?? '',
      'اسم الموظف': emp.name,
      'اسم الشركة': emp.company_name,
      [dateLabel]: formatDateDDMMYYYY(dateValue),
      'الأيام المتبقية': days !== null ? String(days) : '',
      _days: days,
      'مستوى الخطورة': sev,
    })
  }

  return rows
}

function buildCompanyCategorySheet(
  companies: CompanyRow[],
  thresholds: Record<string, number>,
  docType: 'commercial_reg' | 'power_subscription' | 'moqeem_subscription',
  dateKey: keyof CompanyRow,
  dateLabel: string,
  snoozedIds: Set<string>,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  const docThresholds = getThresholdsForType(thresholds, docType)

  for (const co of companies) {
    const dateValue = co[dateKey] as string | null
    const days = daysUntil(dateValue)
    const sev = getSeverityLevel(days, docThresholds)
    if (sev === null || snoozedIds.has(companyAlertId(docType === 'commercial_reg' ? 'commercial' : docType === 'power_subscription' ? 'power' : 'moqeem', co.id, dateValue))) continue

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

function extractUserIdFromJwt(authHeader: string | null): string | null {
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = payload.length % 4
    if (pad) payload += '='.repeat(4 - pad)
    return JSON.parse(atob(payload)).sub ?? null
  } catch {
    return null
  }
}

// ─── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
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

    const authHeader = req.headers.get('Authorization')
    const userId = extractUserIdFromJwt(authHeader)
    if (!userId) return jsonResponse({ success: false, error: 'غير مصرح' }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: userRow, error: userErr } = await admin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (userErr || !userRow || userRow.role !== 'admin') {
      return jsonResponse({ success: false, error: 'صلاحية المدير مطلوبة' }, 403)
    }

    // Read system settings
    const { data: settingsRows } = await admin
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['admin_email', 'notification_thresholds'])

    const settingsMap: Record<string, unknown> = {}
    for (const row of settingsRows ?? []) {
      settingsMap[row.setting_key] = row.setting_value
    }

    let adminEmail = typeof settingsMap['admin_email'] === 'string' ? settingsMap['admin_email'] : ''
    // JSONB column stores strings as JSON-encoded — e.g. '"email@x.com"' → 'email@x.com'
    if (adminEmail.startsWith('"')) {
      try { adminEmail = JSON.parse(adminEmail) } catch { /* leave as-is */ }
    }
    if (!adminEmail || !adminEmail.includes('@')) {
      return jsonResponse({ success: false, error: 'no_admin_email' }, 400)
    }

    const rawThresholds = settingsMap['notification_thresholds']
    const thresholds: Record<string, number> = {
      ...DEFAULT_THRESHOLDS,
      ...(rawThresholds && typeof rawThresholds === 'object' ? rawThresholds as Record<string, number> : {}),
    }

    // Fetch employees (no join — separate company name lookup)
    const { data: employees, error: empErr } = await admin
      .from('employees')
      .select('id, residence_number, name, company_id, residence_expiry, contract_expiry, health_insurance_expiry, hired_worker_contract_expiry')
      .eq('is_deleted', false)

    if (empErr) {
      return jsonResponse({ success: false, error: 'Failed to fetch employees: ' + empErr.message }, 500)
    }

    // Fetch all companies for name lookup
    const { data: companiesData, error: coErr } = await admin
      .from('companies')
      .select('id, unified_number, name, commercial_registration_expiry, ending_subscription_power_date, ending_subscription_moqeem_date')

    if (coErr) {
      return jsonResponse({ success: false, error: 'Failed to fetch companies: ' + coErr.message }, 500)
    }

    const companyNameMap = new Map<string, string>(
      (companiesData ?? []).map((c: Record<string, unknown>) => [c.id as string, c.name as string])
    )

    const empRows: EmployeeRow[] = (employees ?? []).map((e: Record<string, unknown>) => ({
      id: e.id as string,
      residence_number: e.residence_number as number | null,
      name: e.name as string,
      company_name: companyNameMap.get(e.company_id as string) ?? '',
      residence_expiry: e.residence_expiry as string | null,
      contract_expiry: e.contract_expiry as string | null,
      health_insurance_expiry: e.health_insurance_expiry as string | null,
      hired_worker_contract_expiry: e.hired_worker_contract_expiry as string | null,
    }))
    const employeeLookup = new Map<string, EmployeeRow>(empRows.map((row) => [row.id, row]))
    const companyRows = (companiesData ?? []) as CompanyRow[]
    const companyLookup = new Map<string, CompanyRow>(companyRows.map((row) => [row.id, row]))

    // Fetch employee leaves
    const { data: leavesData } = await admin
      .from('employee_leaves')
      .select('id, employee_id, start_date, end_date, notes')
      .order('start_date', { ascending: false })

    interface LeaveRow { id: string; employee_id: string; start_date: string; end_date: string; notes: string | null }
    const leavesRows: Record<string, unknown>[] = ((leavesData ?? []) as LeaveRow[]).map((l) => {
      const emp = employeeLookup.get(l.employee_id)
      const days = Math.max(
        0,
        Math.round((new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) / 86400000) + 1
      )
      return {
        'رقم الإقامة': emp?.residence_number ?? '',
        'اسم الموظف': emp?.name ?? '',
        'تاريخ البداية': formatDateDDMMYYYY(l.start_date),
        'تاريخ النهاية': formatDateDDMMYYYY(l.end_date),
        'عدد الأيام': String(days),
        'ملاحظات': l.notes ?? '',
      }
    })

    const { data: snoozedRows, error: snoozedError } = await admin
      .from('snoozed_alerts')
      .select('alert_id, snoozed_until, is_deferred')

    if (snoozedError) {
      return jsonResponse({ success: false, error: 'Failed to fetch snoozed alerts: ' + snoozedError.message }, 500)
    }

    const activeSnoozedRows = (snoozedRows ?? []).filter(
      (row: SnoozedAlertRow) =>
        row.is_deferred === true || (!!row.snoozed_until && new Date(row.snoozed_until) > new Date())
    )
    const snoozedIds = new Set(activeSnoozedRows.map((row: SnoozedAlertRow) => row.alert_id))

    const employeesCsvRows = buildEmployeesRows(empRows, thresholds, snoozedIds)
    const companiesCsvRows = buildCompaniesRows(companyRows, thresholds, snoozedIds)
    const employeesResidenceRows = buildEmployeeCategorySheet(
      empRows,
      thresholds,
      'residence',
      'residence_expiry',
      'تاريخ انتهاء الإقامة',
      snoozedIds,
    )
    const employeesHealthRows = buildEmployeeCategorySheet(
      empRows,
      thresholds,
      'health_insurance',
      'health_insurance_expiry',
      'تاريخ انتهاء التأمين الطبي',
      snoozedIds,
    )
    const employeesContractRows = buildEmployeeCategorySheet(
      empRows,
      thresholds,
      'contract',
      'contract_expiry',
      'تاريخ انتهاء العقد',
      snoozedIds,
    )
    const employeesWorkerRows = buildEmployeeCategorySheet(
      empRows,
      thresholds,
      'hired_worker_contract',
      'hired_worker_contract_expiry',
      'تاريخ انتهاء عقد الأجير',
      snoozedIds,
    )
    const companiesCommercialRows = buildCompanyCategorySheet(
      companyRows,
      thresholds,
      'commercial_reg',
      'commercial_registration_expiry',
      'تاريخ انتهاء السجل التجاري',
      snoozedIds,
    )
    const companiesPowerRows = buildCompanyCategorySheet(
      companyRows,
      thresholds,
      'power_subscription',
      'ending_subscription_power_date',
      'تاريخ انتهاء اشتراك قوى',
      snoozedIds,
    )
    const companiesMoqeemRows = buildCompanyCategorySheet(
      companyRows,
      thresholds,
      'moqeem_subscription',
      'ending_subscription_moqeem_date',
      'تاريخ انتهاء اشتراك مقيم',
      snoozedIds,
    )

    const deferredRows: DeferredNotificationRow[] = activeSnoozedRows.map((row: SnoozedAlertRow) => {
      const parsed = parseAlertId(row.alert_id)
      const prefix = parsed?.prefix ?? ''
      const entityId = parsed?.entityId ?? ''
      const expiryDate = parsed?.expiryDate ?? null
      const isEmp = prefix === 'contract' || prefix === 'residence' || prefix === 'health_insurance' || prefix === 'hired_worker_contract'
      const emp = isEmp ? employeeLookup.get(entityId) ?? null : null
      const co = !isEmp ? companyLookup.get(entityId) ?? null : null

      return {
        snoozed_until: row.snoozed_until,
        is_deferred: row.is_deferred,
        notification_type:
          prefix === 'commercial'
            ? 'commercial_registration_expiry'
            : prefix === 'power'
              ? 'power_subscription_expiry'
              : prefix === 'moqeem'
                ? 'moqeem_subscription_expiry'
                : prefix,
        entity_type: isEmp ? 'employee' : 'company',
        entity_id: entityId,
        entity_name: isEmp ? (emp?.name ?? '') : (co?.name ?? ''),
        entity_identifier: isEmp ? String(emp?.residence_number ?? '') : String(co?.unified_number ?? ''),
        expiry_date: expiryDate,
        days_remaining: expiryDate ? daysUntil(expiryDate) : null,
      }
    })

    const deferredCsvRows = buildDeferredSheet(deferredRows)

    if (employeesCsvRows.length === 0 && companiesCsvRows.length === 0 && leavesRows.length === 0) {
      return jsonResponse({
        success: true,
        employees_count: 0, companies_count: 0, deferred_count: deferredRows.length, leaves_count: 0,
        email_sent: false, email_skip_reason: 'no_active_alerts',
      })
    }

    // Build ZIP
    const zip = new JSZip()
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date())

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
        rows: employeesCsvRows,
        daysKey: null,
        thresholds: null,
      },
      {
        name: 'إقامة',
        headers: ['رقم الإقامة', 'اسم الموظف', 'اسم الشركة', 'تاريخ انتهاء الإقامة', 'الأيام المتبقية', 'مستوى الخطورة'],
        keys: ['رقم الإقامة', 'اسم الموظف', 'اسم الشركة', 'تاريخ انتهاء الإقامة', 'الأيام المتبقية', 'مستوى الخطورة'],
        widths: [14, 22, 22, 18, 14, 12],
        rows: employeesResidenceRows,
        daysKey: 'الأيام المتبقية',
        thresholds: getThresholdsForType(thresholds, 'residence'),
      },
      {
        name: 'تأمين طبي',
        headers: ['رقم الإقامة', 'اسم الموظف', 'اسم الشركة', 'تاريخ انتهاء التأمين الطبي', 'الأيام المتبقية', 'مستوى الخطورة'],
        keys: ['رقم الإقامة', 'اسم الموظف', 'اسم الشركة', 'تاريخ انتهاء التأمين الطبي', 'الأيام المتبقية', 'مستوى الخطورة'],
        widths: [14, 22, 22, 20, 14, 12],
        rows: employeesHealthRows,
        daysKey: 'الأيام المتبقية',
        thresholds: getThresholdsForType(thresholds, 'health_insurance'),
      },
      {
        name: 'عقد عمل',
        headers: ['رقم الإقامة', 'اسم الموظف', 'اسم الشركة', 'تاريخ انتهاء العقد', 'الأيام المتبقية', 'مستوى الخطورة'],
        keys: ['رقم الإقامة', 'اسم الموظف', 'اسم الشركة', 'تاريخ انتهاء العقد', 'الأيام المتبقية', 'مستوى الخطورة'],
        widths: [14, 22, 22, 18, 14, 12],
        rows: employeesContractRows,
        daysKey: 'الأيام المتبقية',
        thresholds: getThresholdsForType(thresholds, 'contract'),
      },
      {
        name: 'عقد أجير',
        headers: ['رقم الإقامة', 'اسم الموظف', 'اسم الشركة', 'تاريخ انتهاء عقد الأجير', 'الأيام المتبقية', 'مستوى الخطورة'],
        keys: ['رقم الإقامة', 'اسم الموظف', 'اسم الشركة', 'تاريخ انتهاء عقد الأجير', 'الأيام المتبقية', 'مستوى الخطورة'],
        widths: [14, 22, 22, 20, 14, 12],
        rows: employeesWorkerRows,
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
        rows: companiesCsvRows,
        daysKey: null,
        thresholds: null,
      },
      {
        name: 'سجل تجاري',
        headers: ['الرقم الموحد', 'اسم المؤسسة', 'تاريخ انتهاء السجل التجاري', 'الأيام المتبقية', 'مستوى الخطورة'],
        keys: ['الرقم الموحد', 'اسم المؤسسة', 'تاريخ انتهاء السجل التجاري', 'الأيام المتبقية', 'مستوى الخطورة'],
        widths: [14, 24, 20, 14, 12],
        rows: companiesCommercialRows,
        daysKey: 'الأيام المتبقية',
        thresholds: getThresholdsForType(thresholds, 'commercial_reg'),
      },
      {
        name: 'اشتراك قوى',
        headers: ['الرقم الموحد', 'اسم المؤسسة', 'تاريخ انتهاء اشتراك قوى', 'الأيام المتبقية', 'مستوى الخطورة'],
        keys: ['الرقم الموحد', 'اسم المؤسسة', 'تاريخ انتهاء اشتراك قوى', 'الأيام المتبقية', 'مستوى الخطورة'],
        widths: [14, 24, 18, 14, 12],
        rows: companiesPowerRows,
        daysKey: 'الأيام المتبقية',
        thresholds: getThresholdsForType(thresholds, 'power_subscription'),
      },
      {
        name: 'اشتراك مقيم',
        headers: ['الرقم الموحد', 'اسم المؤسسة', 'تاريخ انتهاء اشتراك مقيم', 'الأيام المتبقية', 'مستوى الخطورة'],
        keys: ['الرقم الموحد', 'اسم المؤسسة', 'تاريخ انتهاء اشتراك مقيم', 'الأيام المتبقية', 'مستوى الخطورة'],
        widths: [14, 24, 18, 14, 12],
        rows: companiesMoqeemRows,
        daysKey: 'الأيام المتبقية',
        thresholds: getThresholdsForType(thresholds, 'moqeem_subscription'),
      },
    ])
    zip.file('companies.xlsx', companiesXlsx)

    const leavesXlsx = await buildXlsxWorkbook([
      {
        name: 'إجازات الموظفين',
        headers: ['رقم الإقامة', 'اسم الموظف', 'تاريخ البداية', 'تاريخ النهاية', 'عدد الأيام', 'ملاحظات'],
        keys: ['رقم الإقامة', 'اسم الموظف', 'تاريخ البداية', 'تاريخ النهاية', 'عدد الأيام', 'ملاحظات'],
        widths: [14, 22, 16, 16, 10, 28],
        rows: leavesRows,
        daysKey: null,
        thresholds: null,
      },
    ])
    zip.file('leaves.xlsx', leavesXlsx)

    if (deferredCsvRows.length > 0) zip.file('deferred.csv', arrayToCsv(deferredCsvRows))

    const zipBytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })

    if (zipBytes.byteLength > MAX_ZIP_BYTES) {
      return jsonResponse({
        success: false,
        error: `ZIP too large: ${(zipBytes.byteLength / 1024 / 1024).toFixed(1)}MB`,
      }, 500)
    }

    let zipBinary = ''
    const CHUNK = 8192
    for (let i = 0; i < zipBytes.length; i += CHUNK) {
      zipBinary += String.fromCharCode(...zipBytes.slice(i, i + CHUNK))
    }
    const zipBase64 = btoa(zipBinary)

    // Send via Resend (isolated catch — SDK may throw instead of returning {error})
    const resend = new Resend(RESEND_API_KEY)
    let sendError: unknown = null
    try {
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to: adminEmail,
        subject: `تقرير تنبيهات انتهاء الصلاحيات — زفير | ${todayStr}`,
        html: `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>تقرير التنبيهات — زفير</title></head>
<body style="font-family:Tahoma,Arial,sans-serif;direction:rtl;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:32px;">
    <h2 style="color:#111827;margin:0 0 8px;">تقرير تنبيهات انتهاء الصلاحيات</h2>
    <p style="color:#6b7280;margin:0 0 20px;font-size:14px;">تاريخ: ${todayStr}</p>
    <ul style="color:#374151;font-size:14px;line-height:2;">
      <li>موظفون لديهم تنبيهات نشطة: <strong>${employeesCsvRows.length}</strong></li>
      <li>مؤسسات لديها تنبيهات نشطة: <strong>${companiesCsvRows.length}</strong></li>
      <li>تنبيهات مؤجَّلة: <strong>${deferredRows.length}</strong></li>
    </ul>
    <p style="color:#6b7280;font-size:13px;margin-top:20px;">مرفق ملف ZIP مضغوط يحتوي على ملفات Excel متعددة الشيتات وملف CSV للمؤجلات.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">تم إرسال هذا البريد تلقائياً من نظام زفير. لا ترد على هذه الرسالة.</p>
  </div>
</body>
</html>`,
        attachments: [{ filename: `alert-report-${todayStr}.zip`, content: zipBase64 }],
      })
      sendError = result.error ?? null
    } catch (e) {
      sendError = e
    }

    if (sendError) {
      const errMsg = sendError instanceof Error
        ? `${sendError.name}: ${sendError.message}`
        : JSON.stringify(sendError)
      console.error('[send-alert-report] Resend failed:', errMsg)
      return jsonResponse({ success: false, error: 'Resend error: ' + errMsg }, 500)
    }

    const isoNow = new Date().toISOString()
    await admin.from('system_settings').upsert(
      { setting_key: 'csv_report_last_sent', setting_value: JSON.stringify(isoNow), updated_at: isoNow },
      { onConflict: 'setting_key' },
    )

    return jsonResponse({
      success: true,
      employees_count: employeesCsvRows.length,
      companies_count: companiesCsvRows.length,
      deferred_count: deferredRows.length,
      leaves_count: leavesRows.length,
      email_sent: true,
      recipient: adminEmail,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[send-alert-report] Unhandled error:', msg)
    return jsonResponse({ success: false, error: 'Internal error: ' + msg }, 500)
  }
})
