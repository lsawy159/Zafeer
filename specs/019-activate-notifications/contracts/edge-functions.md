# Edge Function Contracts

**Feature**: تفعيل نظام الإشعارات الفعلي  
**Branch**: `019-activate-notifications`

---

## daily-notification-run

**المسار**: `supabase/functions/daily-notification-run/index.ts`  
**المُشغِّل**: pg_cron — يومياً في الساعة 08:31 (Asia/Riyadh) — أول شيء بعد انتهاء فترة الصمت  
**المصادقة**: Service Role Key (من pg_cron — ليست public)

### Request

```
POST /functions/v1/daily-notification-run
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
Content-Type: application/json

{} // no body required; cron passes empty
```

### Response — Success

```json
{
  "success": true,
  "skipped": false,
  "alerts_count": 12,
  "email_sent": true,
  "in_app_generated": true,
  "quiet_hours_active": false
}
```

### Response — Skipped (quiet hours)

```json
{
  "success": true,
  "skipped": true,
  "skipped_reason": "quiet_hours",
  "quiet_hours_start": "23:50",
  "quiet_hours_end": "08:30",
  "current_time": "02:15"
}
```

### Response — No alerts

```json
{
  "success": true,
  "skipped": false,
  "alerts_count": 0,
  "email_sent": false,
  "email_skip_reason": "no_alerts"
}
```

### Response — No admin_email configured

```json
{
  "success": true,
  "skipped": false,
  "alerts_count": 8,
  "email_sent": false,
  "email_skip_reason": "no_admin_email"
}
```

### Response — Error

```json
{
  "success": false,
  "error": "string describing what failed"
}
```
HTTP 500

### Logic Flow

```
1. READ system_settings: quiet_hours_start, quiet_hours_end, admin_email
2. CHECK current time (Asia/Riyadh) against quiet hours
   → If in quiet hours: return skipped (no exceptions — all alert levels wait)
3. CALL generate_expiry_notifications() RPC → UPSERT to notifications table
   (RPC uses ON CONFLICT DO UPDATE preserving snoozed_until + is_deferred)
4. FETCH active notifications: WHERE (snoozed_until IS NULL OR snoozed_until <= NOW())
   AND is_deferred = false
5. IF alerts_count = 0: return no_alerts
6. IF admin_email missing or empty: return no_admin_email
7. BUILD email digest HTML (RTL Arabic, same template as comprehensiveExpiryAlertService)
8. BUILD ZIP with 2 CSV files: employees.csv + companies.csv (active alerts only — no deferred sheet)
   Using helper functions from _shared/alert-helpers.ts: daysUntil, getSeverityLevel, getEntitySeverity
9. SEND via Resend API (RESEND_API_KEY env var) with ZIP attachment
10. UPSERT expiry_digest_last_sent in system_settings
11. RETURN success response
```

---

## process-email-queue

**المسار**: `supabase/functions/process-email-queue/index.ts`  
**المُشغِّل**: pg_cron — كل ساعة OR يُستدعى يدوياً  
**المصادقة**: Service Role Key

### Request

```
POST /functions/v1/process-email-queue
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
Content-Type: application/json

{} // no body required
```

### Response

```json
{
  "success": true,
  "processed": 3,
  "sent": 2,
  "failed": 1,
  "errors": ["email_id: error description"]
}
```

### Logic Flow

```
1. SELECT + atomic claim (FOR UPDATE SKIP LOCKED):
   UPDATE email_queue SET status='processing'
   WHERE id IN (
     SELECT id FROM email_queue
     WHERE status='pending'
       AND (scheduled_at IS NULL OR scheduled_at <= now())
     ORDER BY priority DESC, created_at ASC
     LIMIT 50
     FOR UPDATE SKIP LOCKED
   ) RETURNING *
2. FOR EACH claimed email:
   a. SEND via Resend
   b. IF success: UPDATE status='sent', sent_at=now()
   c. IF failed: UPDATE status='failed', error_message=..., retry_count++
3. RETURN summary { processed, sent, failed, errors }
```

---

## send-alert-report

**المسار**: `supabase/functions/send-alert-report/index.ts`  
**المُشغِّل**: استدعاء يدوي من Frontend (تبويب "تقرير CSV" في صفحة الإشعارات)  
**المصادقة**: Bearer JWT (admin user)

### Request

```
POST /functions/v1/send-alert-report
Authorization: Bearer <USER_JWT>
Content-Type: application/json

{} // no body required
```

### Response — Success

```json
{
  "success": true,
  "employees_count": 15,
  "companies_count": 4,
  "deferred_count": 3,
  "email_sent": true,
  "recipient": "admin@example.com"
}
```

### Response — No Alerts

```json
{
  "success": true,
  "employees_count": 0,
  "companies_count": 0,
  "deferred_count": 0,
  "email_sent": false,
  "email_skip_reason": "no_active_alerts"
}
```

### Response — No Admin Email

```json
{
  "success": false,
  "error": "no_admin_email"
}
```

### Response — Error

```json
{
  "success": false,
  "error": "string describing what failed"
}
```
HTTP 500

### Logic Flow

```
1. AUTH: extract userId from JWT → verify users.role = 'admin'
2. READ system_settings: notification_thresholds, admin_email
3. IF admin_email missing or empty → return { success: false, error: 'no_admin_email' }
4. FETCH employees WHERE is_deleted = false + JOIN companies
5. FOR EACH employee — using helpers from _shared/alert-helpers.ts:
   a. Compute daysUntil for all 4 documents
   b. getSeverityLevel per document
   c. getEntitySeverity overall
   d. Skip if severity = null (outside threshold range → not an active alert)
   e. BUILD row: residence_number, name, company_name, expiry dates + days per doc, overall severity
6. BUILD employees.csv (12 columns, UTF-8 BOM, arrayToCsv)
7. REPEAT steps 4-6 for companies (unified_number, name, 3 documents → 9 columns)
8. FETCH deferred notifications: WHERE snoozed_until IS NOT NULL OR is_deferred = true
   JOIN employees/companies to get names + expiry dates
9. BUILD deferred.csv (7 columns: entity_type, id, name, doc_type, expiry_date, days_remaining, snoozed_until)
10. IF employees_count = 0 AND companies_count = 0 AND deferred_count = 0
    → return { email_sent: false, skip_reason: 'no_active_alerts' }
11. CREATE ZIP containing employees.csv + companies.csv + deferred.csv
    (UTF-8 BOM + arrayToCsv + JSZip — same pattern as send-backup-email)
12. SEND via Resend (RESEND_API_KEY env var) with ZIP attachment
13. UPSERT csv_report_last_sent in system_settings
14. RETURN success response
```

### Frontend API (Notifications.tsx — CSV Report Tab)

```typescript
// إرسال التقرير يدوياً
const { data, error } = await supabase.functions.invoke('send-alert-report')

// قراءة آخر تاريخ إرسال
const { data } = await supabase
  .from('system_settings')
  .select('setting_value')
  .eq('setting_key', 'csv_report_last_sent')
  .single()
```

---

## Env Vars Required

| المتغير | الوصف | موجود؟ |
|---------|-------|--------|
| `RESEND_API_KEY` | مفتاح Resend API | ✅ موجود (send-backup-email يستخدمه) |
| `RESEND_FROM_EMAIL` | عنوان المُرسِل | ✅ موجود |
| `SUPABASE_URL` | رابط Supabase | ✅ موجود دائماً |
| `SUPABASE_SERVICE_ROLE_KEY` | مفتاح الخدمة | ✅ موجود دائماً في Edge Functions |
