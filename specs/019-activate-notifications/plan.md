# Implementation Plan: تفعيل نظام الإشعارات الفعلي

**Branch**: `019-activate-notifications` | **Date**: 2026-05-21 | **Spec**: [spec.md](spec.md)

## Summary

تفعيل الإشعارات التلقائية اليومية (إيميل + داخل التطبيق) لانتهاء صلاحيات الموظفين والشركات. المسار: Edge Function جديدة (`daily-notification-run`) تُشغَّل بـ pg_cron يومياً، تتحقق من ساعات الصمت، تستدعي RPC لتوليد الإشعارات الداخلية، ثم ترسل إيميل ملخص + CSV مرفق عبر Resend. إضافة `snoozed_until` و `is_deferred` على جدول `notifications` لتأجيل وثائق بعينها (US6)، وتوحيد إيميل المسؤول في `system_settings`.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend) + Deno (Edge Functions)  
**Primary Dependencies**: React 18, Supabase JS Client, Drizzle ORM, Resend (موجود)  
**Storage**: Supabase PostgreSQL — `notifications` (+ snooze columns), `email_queue`, `system_settings`  
**Testing**: لا يوجد test suite رسمي — التحقق يدوي + typecheck  
**Target Platform**: Web browser (frontend) + Supabase Edge Functions (Deno runtime)  
**Project Type**: SPA web application + serverless backend  
**Performance Goals**: Edge Function تنتهي < 30 ثانية (حد pg_cron timeout الافتراضي)  
**Constraints**: `pnpm run typecheck` يمر بـ 0 errors، لا service role key في frontend code  
**Scale/Scope**: مشروع واحد (artifacts/zafeer) + supabase/ + lib/db — تغييرات في 8-10 ملفات

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Supabase-First | ✅ Pass | Edge Functions تستخدم Supabase service role — لا Express API layer |
| II. Arabic UX — RTL First | ✅ Pass | إيميل الإشعار عربي + RTL. لا نصوص عربية جديدة في الواجهة |
| III. Type Safety | ✅ Pass | Drizzle migration لإضافة snoozed_until/is_deferred، typecheck يمر |
| IV. Security via RLS | ✅ Pass | notifications table: RLS موجود — يجب التحقق أن policy تسمح بـ UPDATE لـ admin على snooze columns. service role في Edge Function فقط |
| V. Monorepo Package Discipline | ✅ Pass | DB schema في lib/db/src/schema/، Edge Functions في supabase/ |
| VI. Brand Identity | ✅ Pass | لا أسماء جديدة. تعديل comment "SAW Tracker" في comprehensiveExpiryAlertService → "ZaFeer" (boy-scout) |
| VII. Users vs Employees | ✅ Pass | لا employee login/scoping. snooze يُطبَّق على notification rows لا على employees table |

**لا violations → لا complexity tracking مطلوب.**

## Project Structure

### Documentation (this feature)

```text
specs/019-activate-notifications/
├── plan.md              ← هذا الملف
├── research.md          ← Phase 0 ✅
├── data-model.md        ← Phase 1 ✅
├── contracts/
│   └── edge-functions.md  ← Phase 1 ✅
└── tasks.md             ← Phase 2 (/speckit-tasks)
```

### Source Code (affected files)

```text
lib/
└── db/
    └── src/
        └── schema/
            └── notifications.ts          ← إضافة snoozed_until + is_deferred لـ notifications table

supabase/
├── functions/
│   ├── _shared/
│   │   └── alert-helpers.ts              ← helper functions مُشتَركة: daysUntil, getSeverityLevel, getEntitySeverity, isEntityActive, buildDeferredSheet (T026)
│   ├── daily-notification-run/
│   │   └── index.ts                      ← جديد: Edge Function الإشعار اليومي (+ منطق CSV مُضمَّن)
│   ├── process-email-queue/
│   │   └── index.ts                      ← جديد: معالج طابور الإيميلات
│   └── send-alert-report/
│       └── index.ts                      ← جديد: Edge Function تقرير CSV (استدعاء يدوي)
└── migrations/
    ├── YYYYMMDD_seed_admin_email.sql         ← إضافة admin_email في system_settings (قيمة فارغة) — T006
    ├── YYYYMMDD_pg_cron_daily_run.sql        ← pg_cron job: daily-notification-run يومياً 08:31 Asia/Riyadh — T015
    ├── YYYYMMDD_pg_cron_email_queue.sql      ← pg_cron job: process-email-queue كل ساعة — T027
    └── YYYYMMDD_add_notifications_snooze.sql ← إضافة snoozed_until + is_deferred + UNIQUE constraint لـ notifications (US6) — T033

artifacts/zafeer/src/
├── pages/
│   ├── Notifications.tsx                 ← إضافة تبويب "تقرير CSV" + تبويب "المؤجلة"
│   └── settings/
│       └── settingsConfig.ts             ← حذف residence_expiry_days + contract_expiry_days
├── lib/
│   ├── notificationTypes.ts              ← نقل PRIMARY_ADMIN_EMAIL → قراءة من DB
│   └── emailQueueService.ts              ← تحديث DIGEST_ADMIN_EMAIL → قراءة من DB
├── components/
│   └── notifications/
│       └── SnoozeModal.tsx               ← جديد: modal تأجيل وثيقة بعينها (US6)
└── services/
    └── comprehensiveExpiryAlertService.ts ← تصحيح comment "SAW Tracker" → "ZaFeer"
```

### مفاتيح system_settings الإضافية

| المفتاح | الوصف |
|---------|-------|
| `csv_report_last_sent` | ISO timestamp آخر إرسال ناجح للتقرير CSV |

### التغيير الإضافي في daily-notification-run

في `daily-notification-run/index.ts`: بعد إرسال الملخص، يُضمَّن منطق CSV كمرفق ZIP إضافي مع نفس الإيميل (نفس helper functions لـ daysUntil و getSeverityLevel — مُشتركة).

---

## Phase 0: Research

*انظر [research.md](research.md)*

---

## Phase 1: Design & Contracts

### Data Model

*انظر [data-model.md](data-model.md)*

### Contracts

*انظر [contracts/edge-functions.md](contracts/edge-functions.md)*

### التغييرات التفصيلية

#### التغيير 1 — settingsConfig.ts: حذف حقلين

حذف `residence_expiry_days` و `contract_expiry_days` من `NOTIFICATIONS_SETTINGS` array (سطور 78-95 تقريباً).

#### التغيير 2 — lib/db/src/schema/notifications.ts: إضافة snooze columns

إضافة `snoozed_until` (TIMESTAMPTZ nullable) و `is_deferred` (BOOLEAN default false) لجدول `notifications`.

#### التغيير 3 — Drizzle Migrations

- Migration 1: seed `admin_email` في system_settings (قيمة فارغة، ON CONFLICT DO NOTHING)
- Migration 2: إضافة snooze columns + UNIQUE constraint على `(entity_type, entity_id, notification_type)` لدعم UPSERT

#### التغيير 4 — Edge Function: daily-notification-run

منطق: quiet hours → RPC (UPSERT) → filter snoozed/deferred → Resend email + CSV ZIP (2 sheets: employees + companies).
نمط الكود مماثل لـ `send-backup-email/index.ts`. helpers من `_shared/alert-helpers.ts`.

#### التغيير 5 — Edge Function: process-email-queue

معالجة `email_queue` rows بـ status='pending' وإرسالها عبر Resend.

#### التغيير 6 — notificationTypes.ts + emailQueueService.ts

استبدال `PRIMARY_ADMIN_EMAIL` الثابت بقراءة من `system_settings` key `admin_email`.
الـ fallback (إذا غاب admin_email في DB): لا إرسال + log warning.

#### التغيير 7 — comprehensiveExpiryAlertService.ts (boy-scout)

تصحيح comment: `@author SAW Tracker System` → `@author ZaFeer System`

#### التغيير 8 — Edge Function: send-alert-report (US5)

Edge Function جديدة للاستدعاء اليدوي. تقرأ employees + companies + notifications (deferred)، تحسب الأيام والخطورة عبر helpers من `_shared/alert-helpers.ts`، تبني 3 CSVs (موظفون نشطون + مؤسسات نشطة + مؤجلات)، تضغط ZIP (JSZip + UTF-8 BOM + arrayToCsv)، ترسل عبر Resend مع المرفق، تُحدِّث `csv_report_last_sent`.

#### التغيير 9 — daily-notification-run: إرفاق CSV (US5)

بعد بناء HTML الملخص، يُولَّد ZIP بنفس منطق send-alert-report (helper functions مُشتركة) ويُرفَق مع الإيميل اليومي.

#### التغيير 10 — Notifications.tsx: تبويب "تقرير CSV" (US5)

تبويب جديد بزر "إرسال التقرير الآن" يستدعي `supabase.functions.invoke('send-alert-report')` + عرض آخر تاريخ إرسال من `system_settings.csv_report_last_sent` + حالة التحميل/النتيجة.

### Verification

```bash
pnpm run typecheck   # يمر بـ 0 errors
# التحقق اليدوي: استدعاء Edge Function يدوياً + مراجعة notifications table + inbox
```
