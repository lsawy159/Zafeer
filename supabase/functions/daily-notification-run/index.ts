// @author ZaFeer System
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import JSZip from 'https://esm.sh/jszip@3.10.1'

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

  return {
    quiet_hours_start: map['quiet_hours_start'] ?? '23:50',
    quiet_hours_end: map['quiet_hours_end'] ?? '08:30',
    admin_email: map['admin_email'] ?? '',
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

function priorityLabel(p: string): string {
  switch (p) {
    case 'critical': return 'عاجل'
    case 'high': return 'تحذير'
    case 'medium': return 'تنبيه'
    default: return 'تنبيه'
  }
}

function priorityColor(p: string): string {
  switch (p) {
    case 'critical': return '#dc2626'
    case 'high': return '#ea580c'
    default: return '#ca8a04'
  }
}

function typeLabel(t: string): string {
  const map: Record<string, string> = {
    residence_expiry: 'إقامة',
    contract_expiry: 'عقد عمل',
    health_insurance_expiry: 'تأمين طبي',
    commercial_registration_expiry: 'سجل تجاري',
    power_subscription_expiry: 'اشتراك قوى',
    moqeem_subscription_expiry: 'اشتراك مقيم',
    hired_worker_contract_expiry: 'عقد أجير',
  }
  return map[t] ?? t
}

function buildDigestHtml(alerts: NotificationRow[], today: string): string {
  const criticalAlerts = alerts.filter((a) => a.priority === 'critical')
  const highAlerts = alerts.filter((a) => a.priority === 'high')
  const mediumAlerts = alerts.filter((a) => a.priority !== 'critical' && a.priority !== 'high')

  function buildSection(title: string, color: string, items: NotificationRow[]): string {
    if (items.length === 0) return ''
    const rows = items
      .map(
        (a) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151;font-size:13px;">${typeLabel(a.type)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151;font-size:13px;">${a.message ?? a.title}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:${color};font-weight:600;font-size:13px;white-space:nowrap;">
            ${a.days_remaining !== null ? (a.days_remaining < 0 ? `منتهية منذ ${Math.abs(a.days_remaining)} يوم` : `${a.days_remaining} يوم`) : '—'}
          </td>
        </tr>`
      )
      .join('')

    return `
      <div style="margin-bottom:20px;">
        <h3 style="margin:0 0 8px;color:${color};font-size:15px;border-right:4px solid ${color};padding-right:8px;">${title} (${items.length})</h3>
        <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:right;color:#6b7280;font-size:12px;font-weight:600;">النوع</th>
              <th style="padding:8px 12px;text-align:right;color:#6b7280;font-size:12px;font-weight:600;">التفاصيل</th>
              <th style="padding:8px 12px;text-align:right;color:#6b7280;font-size:12px;font-weight:600;">الأيام المتبقية</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`
  }

  return `<!DOCTYPE html>
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
    <p style="color:#6b7280;margin:0 0 24px;font-size:13px;">إجمالي التنبيهات النشطة: <strong style="color:#111827;">${alerts.length}</strong></p>

    ${buildSection('⚠️ عاجل', priorityColor('critical'), criticalAlerts)}
    ${buildSection('⚡ تحذير', priorityColor('high'), highAlerts)}
    ${buildSection('🔔 تنبيه', priorityColor('medium'), mediumAlerts)}

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">
      تم إرسال هذا البريد تلقائياً من نظام زفير. لا ترد على هذه الرسالة.
    </p>
  </div>
</body>
</html>`
}

// ─── CSV builders (same logic as send-alert-report) ───────────────────────────

const DEFAULT_THRESHOLDS: Record<string, number> = {
  residence_urgent_days: 7, residence_high_days: 15, residence_medium_days: 30,
  contract_urgent_days: 7, contract_high_days: 15, contract_medium_days: 30,
  commercial_reg_urgent_days: 7, commercial_reg_high_days: 15, commercial_reg_medium_days: 30,
  health_insurance_urgent_days: 30, health_insurance_high_days: 45, health_insurance_medium_days: 60,
  power_subscription_urgent_days: 7, power_subscription_high_days: 15, power_subscription_medium_days: 30,
  moqeem_subscription_urgent_days: 7, moqeem_subscription_high_days: 15, moqeem_subscription_medium_days: 30,
}

async function buildAlertCsvZip(
  admin: ReturnType<typeof createClient>,
  thresholds: Record<string, number>,
): Promise<Uint8Array | null> {
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

  if (empRows.length === 0 && coRows.length === 0) return null

  const zip = new JSZip()
  if (empRows.length > 0) zip.file('employees.csv', arrayToCsv(empRows))
  if (coRows.length > 0) zip.file('companies.csv', arrayToCsv(coRows))
  return await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
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

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

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

  // 5. Filter snoozed/deferred (forward-compat: columns may not exist yet)
  const now = new Date()
  const activeAlerts = (allNotifications ?? []).filter((n: NotificationRow) => {
    if (n.is_deferred === true) return false
    if (n.snoozed_until && new Date(n.snoozed_until) > now) return false
    return true
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

  const htmlBody = buildDigestHtml(activeAlerts, todayStr)

  // 8. Build CSV ZIP attachment (best-effort — skip if fails)
  const digestThresholds: Record<string, number> = { ...DEFAULT_THRESHOLDS }
  const { data: threshRow } = await admin
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'notification_thresholds')
    .maybeSingle()
  if (threshRow?.setting_value && typeof threshRow.setting_value === 'object') {
    Object.assign(digestThresholds, threshRow.setting_value)
  }

  const zipBytes = await buildAlertCsvZip(admin, digestThresholds).catch(() => null)
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
    subject: `ملخص التنبيهات اليومي — زفير | ${activeAlerts.length} تنبيه`,
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
    alerts_count: activeAlerts.length,
    email_sent: true,
    in_app_generated: true,
    quiet_hours_active: false,
  })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[daily-notification-run] Unhandled error:', msg)
    return jsonResponse({ success: false, error: 'Internal error: ' + msg }, 500)
  }
})
