# Data Model: تفعيل نظام الإشعارات الفعلي

**Branch**: `019-activate-notifications` | **Date**: 2026-05-21

## الجداول الجديدة

> **ملاحظة 2026-05-22**: جدول `notification_mutes` **محذوف من النطاق**. لا إيقاف كلي لكيانات. التحكم فقط عبر `snoozed_until` / `is_deferred` على مستوى الوثيقة الفردية في جدول `notifications`.

---

## مفاتيح system_settings الجديدة / المُعدَّلة

| المفتاح | النوع | القيمة الافتراضية | الوصف |
|---------|-------|-------------------|-------|
| `admin_email` | `string` | — | إيميل المسؤول الرئيسي (مطلوب للإيميلات) |
| `quiet_hours_start` | `string` | `"23:50"` | بداية فترة الصمت (HH:mm) |
| `quiet_hours_end` | `string` | `"08:30"` | نهاية فترة الصمت (HH:mm) |
| `notification_methods` | `string` | `"in_app"` | طريقة الإشعار (تحديث القيمة الافتراضية لـ `in_app,email`) |
| `expiry_digest_last_sent` | `string` (ISO 8601) | — | آخر timestamp لإرسال إيميل الملخص اليومي — يُحدَّث من `daily-notification-run` |
| `csv_report_last_sent` | `string` (ISO 8601) | — | آخر timestamp لإرسال تقرير CSV ناجح — يُنشأ عبر upsert من `send-alert-report` أو `daily-notification-run` |

**ملاحظة**: هذه المفاتيح موجودة بالفعل في DB من الإعدادات الحالية. Migration يُضيف `admin_email` فقط إذا غاب. مفتاح `csv_report_last_sent` يُنشأ تلقائياً عند أول إرسال ناجح (upsert).

---

## هيكل بيانات شيت الموظفين CSV (US5)

| العمود | المصدر | الوصف |
|--------|--------|-------|
| `رقم الإقامة` | `employees.residence_number` | المعرّف الرئيسي |
| `اسم الموظف` | `employees.name` | |
| `اسم الشركة` | `companies.name` via `employees.company_id` | |
| `تاريخ انتهاء الإقامة` | `employees.residence_expiry` | dd/MM/yyyy أو فارغ |
| `الأيام المتبقية (الإقامة)` | محسوب | سالب إذا انتهت |
| `تاريخ انتهاء العقد` | `employees.contract_expiry` | |
| `الأيام المتبقية (العقد)` | محسوب | |
| `تاريخ انتهاء التأمين الطبي` | `employees.health_insurance_expiry` | |
| `الأيام المتبقية (التأمين)` | محسوب | |
| `تاريخ انتهاء عقد الأجير` | `employees.hired_worker_contract_expiry` | |
| `الأيام المتبقية (عقد الأجير)` | محسوب | |
| `مستوى الخطورة` | محسوب | عاجل / تحذير / تنبيه |

## هيكل بيانات شيت المؤسسات CSV (US5)

| العمود | المصدر | الوصف |
|--------|--------|-------|
| `الرقم الموحد` | `companies.unified_number` | المعرّف الرئيسي |
| `اسم المؤسسة` | `companies.name` | |
| `تاريخ انتهاء السجل التجاري` | `companies.commercial_registration_expiry` | dd/MM/yyyy أو فارغ |
| `الأيام المتبقية (السجل)` | محسوب | |
| `تاريخ انتهاء اشتراك قوى` | `companies.ending_subscription_power_date` | |
| `الأيام المتبقية (قوى)` | محسوب | |
| `تاريخ انتهاء اشتراك مقيم` | `companies.ending_subscription_moqeem_date` | |
| `الأيام المتبقية (مقيم)` | محسوب | |
| `مستوى الخطورة` | محسوب | عاجل / تحذير / تنبيه |

## منطق حساب الأيام والخطورة (US5)

```
daysUntil(dateStr):
  if (!dateStr) return null
  today = new Date() @ Asia/Riyadh timezone (date only)
  target = new Date(dateStr)
  return Math.floor((target - today) / 86400000)

getSeverityLevel(days, thresholds):
  if (days === null) return null        // لا تاريخ = لا تنبيه
  if (days <= thresholds.urgent_days)  return 'عاجل'
  if (days <= thresholds.warning_days) return 'تحذير'
  if (days <= thresholds.alert_days)   return 'تنبيه'
  return null                           // خارج نطاق التنبيه

getEntitySeverity(documents):
  levels = ['عاجل', 'تحذير', 'تنبيه']
  for each level in levels:
    if any document has this level: return level
  return null

isEntityActive(entity):
  return getEntitySeverity(entity.documents) !== null
```

---

## هيكل شيت "المؤجلات" CSV (US5 — التقرير اليدوي فقط)

| العمود | المصدر | الوصف |
|--------|--------|-------|
| `نوع الكيان` | محسوب | موظف / مؤسسة |
| `المعرّف` | `residence_number` أو `unified_number` | |
| `الاسم` | `employees.name` أو `companies.name` | |
| `نوع الوثيقة` | notification.type | إقامة / عقد / تأمين طبي / ... |
| `تاريخ انتهاء الوثيقة` | من جدول الكيان | dd/MM/yyyy |
| `الأيام المتبقية` | محسوب | سالب إذا انتهت |
| `مؤجَّل حتى` | `notifications.snoozed_until` | dd/MM/yyyy أو "إلى أجل غير مسمى" |

---

## المفاتيح المحذوفة من settingsConfig.ts

| المفتاح | السبب |
|---------|-------|
| `residence_expiry_days` | مكرر مع نظام `notification_thresholds` المعتمد |
| `contract_expiry_days` | مكرر مع نظام `notification_thresholds` المعتمد |

---

## الجداول الموجودة المُعدَّلة

### notifications — إضافة حقلي التأجيل (US6)

```typescript
// lib/db/src/schema/notifications.ts — تعديل
// إضافة حقلين جديدين للتأجيل (Snooze / Defer)
snoozed_until: timestamp('snoozed_until', { withTimezone: true }), // null = غير مؤجَّل
is_deferred:   boolean('is_deferred').default(false),              // مؤجَّل بلا تاريخ (حتى يُفعَّل يدوياً)
```

**قواعد العمل (US6)**:
- إشعار **نشط**: `snoozed_until IS NULL AND is_deferred = false`
- إشعار **مؤجَّل بتاريخ**: `snoozed_until IS NOT NULL AND snoozed_until > NOW()`
- إشعار **مؤجَّل إلى أجل غير مسمى**: `is_deferred = true`
- عند انتهاء `snoozed_until`: الـ Edge Function تعالجه كإشعار نشط في الدورة التالية
- **تعارض Upsert**: عند إعادة توليد الإشعارات يومياً، الـ RPC تحتفظ بـ `snoozed_until` و `is_deferred` إذا كان الإشعار موجوداً (ON CONFLICT preserve snooze fields)

**Migration إضافي (US6)**:
```sql
-- Migration 2: إضافة حقلي التأجيل إلى notifications
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS snoozed_until  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_deferred    BOOLEAN NOT NULL DEFAULT FALSE;
```

---

## الجداول الموجودة المُستخدَمة (بدون تغيير)

### notifications (الحقول الأصلية)
الجدول الموجود — يستقبل الإشعارات من `generate_expiry_notifications()` RPC.
الحقول الأصلية بدون تغيير — فقط إضافة `snoozed_until` و `is_deferred` كما في القسم أعلاه.

### email_queue
الجدول الموجود — يستقبل الإيميلات المُصفَّفة من الواجهة.
سيُعالَج بواسطة `process-email-queue` Edge Function الجديدة.

### system_settings
الجدول الموجود — يخزن إعدادات النظام بما فيها ساعات الصمت وعتبات التنبيه.

---

## Migration Plan

```
Migration 1: إضافة إعداد admin_email (إذا غاب)
  - INSERT INTO system_settings (setting_key, setting_value)
    VALUES ('admin_email', '')
    ON CONFLICT DO NOTHING
  -- قيمة فارغة عمداً — يُضبَط يدوياً من صفحة الإعدادات

Migration 2: إضافة حقلي التأجيل إلى notifications (US6)
  - ALTER TABLE notifications
      ADD COLUMN IF NOT EXISTS snoozed_until  TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS is_deferred    BOOLEAN NOT NULL DEFAULT FALSE
  -- يحتاج UNIQUE constraint على (entity_type, entity_id, notification_type) لـ UPSERT
  -- إذا لم يكن موجوداً → إضافته في نفس migration

ملاحظة: notification_mutes محذوف من النطاق (قرار 2026-05-22)
```

---

## حالات البيانات (State Transitions)

### notifications snooze lifecycle
```
[نشط: snoozed_until=NULL, is_deferred=false]
  → [مؤجَّل بتاريخ: snoozed_until=X] → [انتهى التأجيل: يُعالَج كنشط تلقائياً في الدورة التالية]
  → [مؤجَّل إلى أجل: is_deferred=true] → [أُلغي التأجيل يدوياً: is_deferred=false → نشط]
```

### email_queue status
```
pending → [process-email-queue] → sent
pending → [process-email-queue] → failed → [retry] → sent | failed_permanent
```
