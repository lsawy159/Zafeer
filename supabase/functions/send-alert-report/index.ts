// @author ZaFeer System
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { Resend } from 'https://esm.sh/resend@4.0.0'
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

// ─── Inlined helpers (from _shared/alert-helpers.ts) ──────────────────────────

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

function buildEmployeesRows(employees: EmployeeRow[], thresholds: Record<string, number>): Record<string, unknown>[] {
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

    if (!isEntityActive([resSev, conSev, hiSev, hwSev])) continue

    rows.push({
      'رقم الإقامة': emp.residence_number ?? '',
      'اسم الموظف': emp.name,
      'اسم الشركة': emp.company_name,
      'تاريخ انتهاء الإقامة': formatDateDDMMYYYY(emp.residence_expiry),
      'الأيام المتبقية (الإقامة)': resDays !== null ? String(resDays) : '',
      'تاريخ انتهاء العقد': formatDateDDMMYYYY(emp.contract_expiry),
      'الأيام المتبقية (العقد)': conDays !== null ? String(conDays) : '',
      'تاريخ انتهاء التأمين الطبي': formatDateDDMMYYYY(emp.health_insurance_expiry),
      'الأيام المتبقية (التأمين)': hiDays !== null ? String(hiDays) : '',
      'تاريخ انتهاء عقد الأجير': formatDateDDMMYYYY(emp.hired_worker_contract_expiry),
      'الأيام المتبقية (عقد الأجير)': hwDays !== null ? String(hwDays) : '',
      'مستوى الخطورة': getEntitySeverity([resSev, conSev, hiSev, hwSev]) ?? '',
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

function buildCompaniesRows(companies: CompanyRow[], thresholds: Record<string, number>): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  for (const co of companies) {
    const crDays = daysUntil(co.commercial_registration_expiry)
    const pwDays = daysUntil(co.ending_subscription_power_date)
    const mqDays = daysUntil(co.ending_subscription_moqeem_date)

    const crSev = getSeverityLevel(crDays, getThresholdsForType(thresholds, 'commercial_reg'))
    const pwSev = getSeverityLevel(pwDays, getThresholdsForType(thresholds, 'power_subscription'))
    const mqSev = getSeverityLevel(mqDays, getThresholdsForType(thresholds, 'moqeem_subscription'))

    if (!isEntityActive([crSev, pwSev, mqSev])) continue

    rows.push({
      'الرقم الموحد': co.unified_number ?? '',
      'اسم المؤسسة': co.name,
      'تاريخ انتهاء السجل التجاري': formatDateDDMMYYYY(co.commercial_registration_expiry),
      'الأيام المتبقية (السجل)': crDays !== null ? String(crDays) : '',
      'تاريخ انتهاء اشتراك قوى': formatDateDDMMYYYY(co.ending_subscription_power_date),
      'الأيام المتبقية (قوى)': pwDays !== null ? String(pwDays) : '',
      'تاريخ انتهاء اشتراك مقيم': formatDateDDMMYYYY(co.ending_subscription_moqeem_date),
      'الأيام المتبقية (مقيم)': mqDays !== null ? String(mqDays) : '',
      'مستوى الخطورة': getEntitySeverity([crSev, pwSev, mqSev]) ?? '',
    })
  }
  return rows
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

    const employeesCsvRows = buildEmployeesRows(empRows, thresholds)
    const companiesCsvRows = buildCompaniesRows((companiesData ?? []) as CompanyRow[], thresholds)

    // Fetch deferred notifications
    let deferredRows: DeferredNotificationRow[] = []
    try {
      const { data: deferredData } = await admin
        .from('notifications')
        .select('id, type, entity_type, entity_id, snoozed_until, is_deferred, days_remaining, target_date')
        .or('snoozed_until.not.is.null,is_deferred.eq.true')
        .eq('is_archived', false)

      if (deferredData && deferredData.length > 0) {
        const empIds = (deferredData as Record<string, unknown>[])
          .filter((d) => d.entity_type === 'employee').map((d) => d.entity_id as string)
        const coIds = (deferredData as Record<string, unknown>[])
          .filter((d) => d.entity_type === 'company').map((d) => d.entity_id as string)

        const { data: dEmp } = empIds.length > 0
          ? await admin.from('employees').select('id, name, residence_number').in('id', empIds)
          : { data: [] }
        const { data: dCo } = coIds.length > 0
          ? await admin.from('companies').select('id, name, unified_number').in('id', coIds)
          : { data: [] }

        const empMap = new Map<string, { name: string; residence_number: number | null }>(
          (dEmp ?? []).map((e: Record<string, unknown>) => [e.id as string, { name: e.name as string, residence_number: e.residence_number as number | null }])
        )
        const coMap = new Map<string, { name: string; unified_number: number | null }>(
          (dCo ?? []).map((c: Record<string, unknown>) => [c.id as string, { name: c.name as string, unified_number: c.unified_number as number | null }])
        )

        deferredRows = (deferredData as Record<string, unknown>[]).map((d) => {
          const isEmp = d.entity_type === 'employee'
          const emp = isEmp ? empMap.get(d.entity_id as string) : null
          const co = !isEmp ? coMap.get(d.entity_id as string) : null
          return {
            snoozed_until: d.snoozed_until as string | null,
            is_deferred: Boolean(d.is_deferred),
            notification_type: d.type as string,
            entity_type: d.entity_type as string,
            entity_id: d.entity_id as string,
            entity_name: isEmp ? (emp?.name ?? '') : (co?.name ?? ''),
            entity_identifier: isEmp ? String(emp?.residence_number ?? '') : String(co?.unified_number ?? ''),
            expiry_date: d.target_date as string | null,
            days_remaining: d.days_remaining as number | null,
          }
        })
      }
    } catch {
      deferredRows = []
    }

    const deferredCsvRows = buildDeferredSheet(deferredRows)

    if (employeesCsvRows.length === 0 && companiesCsvRows.length === 0 && deferredRows.length === 0) {
      return jsonResponse({
        success: true,
        employees_count: 0, companies_count: 0, deferred_count: 0,
        email_sent: false, email_skip_reason: 'no_active_alerts',
      })
    }

    // Build ZIP
    const zip = new JSZip()
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date())

    if (employeesCsvRows.length > 0) zip.file('employees.csv', arrayToCsv(employeesCsvRows))
    if (companiesCsvRows.length > 0) zip.file('companies.csv', arrayToCsv(companiesCsvRows))
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
    <p style="color:#6b7280;font-size:13px;margin-top:20px;">مرفق ملف CSV مضغوط يحتوي على التفاصيل الكاملة.</p>
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
      email_sent: true,
      recipient: adminEmail,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[send-alert-report] Unhandled error:', msg)
    return jsonResponse({ success: false, error: 'Internal error: ' + msg }, 500)
  }
})
