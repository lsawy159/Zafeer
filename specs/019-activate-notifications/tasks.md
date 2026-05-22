# Tasks: تفعيل نظام الإشعارات الفعلي

**Input**: Design documents from `specs/019-activate-notifications/`  
**Branch**: `019-activate-notifications`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/edge-functions.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: يمكن تشغيله بالتوازي (ملفات مختلفة، لا تبعية)
- **[Story]**: القصة المرتبطة بالمهمة (US1–US6)

---

## Phase 1: Setup — التحقق من البنية التحتية

**Purpose**: التأكد من توفر المتطلبات قبل البدء في التنفيذ

- [X] T001 التحقق من وجود env vars: `RESEND_API_KEY` و `RESEND_FROM_EMAIL` في Supabase project settings
- [X] T002 [P] التحقق من وجود extension `pg_cron` مُفعَّل في Supabase (SQL: `SELECT * FROM pg_extension WHERE extname = 'pg_cron'`)
- [X] T003 [P] التحقق من وجود function `generate_expiry_notifications()` في DB الإنتاج **وأنها تدعم ON CONFLICT (UPSERT)**: `SELECT proname, prosrc FROM pg_proc WHERE proname = 'generate_expiry_notifications'` — إذا كانت INSERT فقط → T037 يُضيف ON CONFLICT clause

**Checkpoint**: env vars موجودة، pg_cron مفعَّل، RPC موجودة → يمكن البدء في Phase 2

---

## Phase 2: Foundational — البنية الأساسية المشتركة

**Purpose**: مكونات DB وإعدادات تحتاجها جميع القصص

⚠️ **CRITICAL**: لا يمكن تنفيذ أي قصة قبل اكتمال هذه المرحلة

- ~~T004~~ (محذوف — notification_mutes خارج النطاق)
- ~~T005~~ (محذوف — notification_mutes خارج النطاق)
- [X] T006 [P] إنشاء migration لـ seed إعداد `admin_email` في `system_settings` (قيمة فارغة، ON CONFLICT DO NOTHING) في `supabase/migrations/`
- [X] T007 استبدال `PRIMARY_ADMIN_EMAIL` الثابت في `artifacts/zafeer/src/lib/notificationTypes.ts` بـ async function تقرأ من `system_settings` key `admin_email`، fallback: لا إرسال + log warning
- [X] T008 استبدال `DIGEST_ADMIN_EMAIL` الثابت في `artifacts/zafeer/src/lib/emailQueueService.ts` باستخدام نفس helper function من T007 — **بعد T007 (تسلسلي)**

**Checkpoint**: DB migration يمر، typecheck يمر، hardcoded emails محذوفة

---

## Phase 3: User Story 1 — إيميل تلقائي يومي (Priority: P1) 🎯 MVP

**Goal**: إرسال إيميل ملخص يومي للمسؤول بكل التنبيهات الحرجة، مع احترام ساعات الصمت

**Independent Test**: استدعاء `daily-notification-run` يدوياً → وصول إيميل للمسؤول + لا إرسال في ساعات الصمت

### Implementation for User Story 1

- [X] T009 [US1] إنشاء ملف `supabase/functions/daily-notification-run/index.ts` بالهيكل الأساسي (CORS, auth check, supabase client) — نمط مماثل لـ `send-backup-email/index.ts`
- [X] T010 [US1] تنفيذ دالة `isQuietHours(start, end, timezone)` في نفس الملف: تقرأ `quiet_hours_start` و `quiet_hours_end` من `system_settings`، تعامل مع العبور عبر منتصف الليل، timezone = `Asia/Riyadh` — لا استثناء لأي مستوى تنبيه (urgent_notifications bypass محذوف)
- [X] T011 [US1] تنفيذ منطق استدعاء `generate_expiry_notifications()` RPC في `daily-notification-run/index.ts` وجلب نتائجها من جدول `notifications`
- [X] T012 [US1] تصفية الإشعارات المؤجلة (`snoozed_until > NOW() OR is_deferred = true`) من نتائج الـ RPC في `daily-notification-run/index.ts` قبل بناء الإيميل
- [X] T013 [US1] تنفيذ بناء HTML email digest في `daily-notification-run/index.ts` (نمط مماثل لـ `sendEmailNotifications` في `comprehensiveExpiryAlertService.ts` — RTL، عربي، جداول)
- [X] T014 [US1] تنفيذ إرسال الإيميل عبر Resend + upsert `expiry_digest_last_sent` في `system_settings` في `daily-notification-run/index.ts`
- [X] T015 [US1] إضافة pg_cron job لتشغيل `daily-notification-run` يومياً الساعة 08:31 بتوقيت Asia/Riyadh في `supabase/migrations/` (migration جديد)

**Checkpoint**: استدعاء Edge Function يدوياً يرسل إيميل ✓، استدعاء في ساعات الصمت يعيد `skipped: true` ✓

---

## Phase 4: User Story 2 — إشعارات داخل التطبيق (Priority: P2)

**Goal**: الإشعارات الداخلية تُولَّد يومياً من Edge Function وتظهر بتصنيف واضح (عاجل/تحذير/تنبيه)

**Independent Test**: فتح التطبيق بعد تشغيل الـ Edge Function → ظهور إشعارات مصنّفة بألوان مختلفة

### Implementation for User Story 2

- [X] T016 [US2] التحقق من أن `generate_expiry_notifications()` RPC تُولِّد records في جدول `notifications` بحقل `priority` صحيح — إذا كانت تُولِّد بشكل صحيح لا تعديل مطلوب
- [X] T017 [P] [US2] مراجعة صفحة `artifacts/zafeer/src/pages/Notifications.tsx`: التحقق من أن الإشعارات تُصنَّف بصرياً (عاجل=أحمر، تحذير=برتقالي، تنبيه=أصفر) — تعديل إذا لزم
- [X] T018 [US2] التحقق من أن الإشعارات المُولَّدة خلال ساعات الصمت تظهر في الصفحة عند فتح التطبيق بعد 08:30 (لا حاجة لمنطق إضافي — الـ RPC تكتب في notifications table وتُقرأ عند الفتح)

**Checkpoint**: فتح Notifications page يُظهر الإشعارات بألوان/أيقونات مختلفة لكل مستوى ✓

---

## ~~Phase 5: User Story 3~~ — محذوف (2026-05-22)

> **قرار**: الإيقاف الكلي لكيانات (Mute) خارج النطاق. راجع spec US3. التحكم في الإشعارات يكون عبر US6 فقط (per-document snooze).
> T019–T023 محذوفة جميعها.

---

## Phase 6: User Story 4 — إعدادات الإشعارات المتقدمة (Priority: P4)

**Goal**: صفحة إعدادات الإشعارات تتحكم فعلياً في سلوك النظام (ساعات الصمت تُطبَّق)

**Independent Test**: تغيير ساعات الصمت من 23:50 إلى 22:00 → استدعاء Edge Function الساعة 22:30 → `skipped: quiet_hours` ✓

### Implementation for User Story 4

- [X] T024 [US4] حذف `residence_expiry_days` و `contract_expiry_days` من `NOTIFICATIONS_SETTINGS` array في `artifacts/zafeer/src/pages/settings/settingsConfig.ts` (سطور ~78-95)
- [X] T025 [US4] التحقق من أن إعدادات `quiet_hours_start` و `quiet_hours_end` المحفوظة في `system_settings` تُقرأ فعلياً من Edge Function (مرتبطة بـ T010) — `urgent_notifications` محذوف من المنطق

**Checkpoint**: حذف الحقلين، typecheck يمر، صفحة الإعدادات لا تُظهر الحقلين المحذوفين ✓

---

## Phase 7: Polish — تحسينات عامة

**Purpose**: مكونات ذات قيمة مضافة لا تتعلق بقصة بعينها

- [X] T026 إنشاء `supabase/functions/_shared/alert-helpers.ts`: helper functions مُشتَركة بين Edge Functions (`daysUntil`, `getSeverityLevel`, `getEntitySeverity`, `isEntityActive`, `buildDeferredSheet`) — تُستورَد في T030/T031
- [X] T026b إنشاء `supabase/functions/process-email-queue/index.ts`: معالج طابور الإيميلات المعلّقة عبر Resend مع atomic claim `FOR UPDATE SKIP LOCKED`، فلترة `WHERE status='pending'`، حد `retry_count < 3` لمنع loop اللانهائي على فشل دائم (انظر contracts/edge-functions.md)
- [X] T027 [P] إضافة pg_cron job لتشغيل `process-email-queue` كل ساعة في migration جديد
- [X] T028 [P] إصلاح comment `@author SAW Tracker System` → `@author ZaFeer System` في `artifacts/zafeer/src/services/comprehensiveExpiryAlertService.ts` (boy-scout rule — Principle VI)
- [X] T029 تشغيل `pnpm run typecheck` والتحقق من 0 errors بعد جميع التغييرات

---

## Phase 8: User Story 5 — تقرير CSV (Priority: P5)

**Goal**: تقرير CSV يومي مرفق مع إيميل الملخص + إمكانية إرسال يدوي من تبويب جديد

**Independent Test**: ضغط زر "إرسال التقرير الآن" → وصول إيميل مع ZIP يحتوي employees.csv + companies.csv ✓

### Implementation for User Story 5

- [X] T030 [US5] إنشاء `supabase/functions/send-alert-report/index.ts`: auth check (admin JWT)، قراءة notification_thresholds + admin_email، جلب notifications + employees + companies، بناء 3 CSVs (موظفون نشطون + مؤسسات نشطة + مؤجلات) عبر helper functions من `_shared/alert-helpers.ts`، ضغط ZIP عبر JSZip (UTF-8 BOM)، إرسال Resend مع المرفق، upsert csv_report_last_sent — ⚠️ **Resend حد المرفقات 40MB**: للشركات الكبيرة قد يتجاوز الـ ZIP الحد — سجّل حجم الملف قبل الإرسال + أضف error handling واضح إذا تجاوز 35MB
- [X] T031 [US5] تحديث `supabase/functions/daily-notification-run/index.ts`: إضافة منطق توليد CSV وإرفاقه مع إيميل الملخص اليومي (نفس helper functions مُشتركة من T030)
- [X] T032 [US5] تحديث `artifacts/zafeer/src/pages/Notifications.tsx`: إضافة تبويب "تقرير CSV" مع زر "إرسال التقرير الآن" + عرض آخر تاريخ إرسال من `system_settings.csv_report_last_sent` + حالة التحميل/النتيجة + تحذير `admin_email` فارغ للمسؤول (admin) فقط
- [X] T032b [P] [US5] تحديث صفحة الإعدادات (`artifacts/zafeer/src/pages/settings/`): إضافة تحذير "إيميل المسؤول غير مضبوط" للمسؤول (admin) فقط — متوافق مع FR-023 (يظهر في صفحتَي الإشعارات والإعدادات)

**Checkpoint**: ضغط الزر → وصول ZIP بالإيميل ✓، الدورة اليومية ترسل ZIP تلقائياً ✓، تحذير admin_email يظهر في الصفحتين للأدمن فقط ✓

---

## Phase 9: User Story 6 — التنبيهات المؤجلة (Priority: P6)

**Goal**: تبويب "المؤجلة" في صفحة الإشعارات — المسؤول يؤجّل إشعاراً بعينه أو يعطّله مؤقتاً ثم يُعيد تفعيله

**Independent Test**: تأجيل إشعار إقامة موظف أسبوعاً → لا يظهر في القائمة النشطة ولا في الإيميل اليومي → بعد أسبوع يعود تلقائياً

### Implementation for User Story 6

- [X] T033 [US6] إنشاء migration SQL يضيف `snoozed_until` و `is_deferred` لجدول `notifications` في `supabase/migrations/` + UNIQUE constraint على `(entity_type, entity_id, type)` للـ UPSERT — ⚠️ **قبل إضافة الـ UNIQUE constraint يجب حذف الـ duplicates الحالية**: تم عبر DISTINCT ON + DELETE (applied to DB ✓)
- [X] T033b [US6] تحديث `lib/db/src/schema/notifications.ts`: إضافة `snoozed_until` (TIMESTAMPTZ nullable) و `is_deferred` (BOOLEAN default false) للـ Drizzle schema يدوياً — **مطلوب لـ typecheck يمر** (Constitution III)
- [X] T033c [US6] التحقق من وجود RLS UPDATE policy على جدول `notifications` للـ admin role — `notifications_admin_write` (cmd=ALL) تغطي UPDATE ✓ لا تعديل مطلوب
- [X] T034 [US6] تحديث `artifacts/zafeer/src/pages/Notifications.tsx`: تصفية التبويب النشط لاستثناء الإشعارات المؤجلة (`WHERE (snoozed_until IS NULL OR snoozed_until <= NOW()) AND is_deferred = false`)
- [X] T035 [P] [US6] إنشاء `artifacts/zafeer/src/components/notifications/SnoozeModal.tsx`: نموذج تأجيل — خيار تاريخ مستقبلي أو "حتى يُفعَّل يدوياً" — يحدّث `snoozed_until` / `is_deferred` عبر Supabase client
- [X] T036 [US6] تحديث `artifacts/zafeer/src/pages/Notifications.tsx`: إضافة تبويب "المؤجلة" + زر "تفعيل الآن" + زر "تعديل التأجيل" + `SnoozeModal` على الإشعارات النشطة
- [X] T037 [P] [US6] إعادة كتابة `generate_expiry_notifications()` RPC بـ UPSERT (ON CONFLICT DO UPDATE) يحافظ على `snoozed_until` و `is_deferred` — migration 005 ✓

**Checkpoint**: تأجيل إشعار → يختفي من "النشطة" ويظهر في "المؤجلة" ✓، لا يُذكر في الإيميل ✓، "تفعيل الآن" يعيده فوراً ✓

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: لا تبعيات — يبدأ فوراً
- **Phase 2 (Foundational)**: يعتمد على Phase 1 — يحجب جميع القصص
- **Phase 3 (US1)**: يعتمد على Phase 2 — الأهم والأكثر قيمة (MVP)
- **Phase 4 (US2)**: يعتمد على Phase 3 (T011 — RPC call)
- **Phase 5**: محذوف (US3 خارج النطاق)
- **Phase 6 (US4)**: يعتمد على Phase 2 — مستقل عن US1/US2
- **Phase 7 (Polish)**: يعتمد على اكتمال جميع القصص المطلوبة
- **Phase 8 (US5)**: يعتمد على Phase 2 (admin_email) + Phase 3 (T013/T014) + Phase 7 (T026 — _shared helpers)
- **Phase 9 (US6)**: يعتمد على T033 (snooze migration) + T033b (Drizzle schema update) + T033c (RLS policy verify)

### User Story Dependencies

- **US1 (P1)**: يعتمد على Phase 2 — لا تبعية على US2/US4
- **US2 (P2)**: يعتمد على US1 (T011) — RPC يُستدعى من Edge Function
- **US4 (P4)**: يعتمد على Phase 2 فقط — T024 مستقل تماماً
- **US5 (P5)**: يعتمد على Phase 2 + Phase 3 + T026 (_shared helpers) — T030 يمكن بالتوازي بعد Phase 3
- **US6 (P6)**: تسلسل إلزامي: T033 → T033b → T033c → T034 → T036 (نفس الملف Notifications.tsx). T035 (SnoozeModal — ملف جديد منفصل) و T037 (RPC verify) يمكن بالتوازي بعد T033c

### Parallel Opportunities

- T002 و T003 و T006 يعملان بالتوازي (ملفات/queries مختلفة)
- T006 و T007 بالتوازي (ملفات مختلفة) — T008 بعد T007 (يعتمد على helper من T007)
- T027 و T028 بالتوازي

---

## Parallel Example: Phase 2

```text
بالتوازي (ملفات مختلفة — لا تبعيات):
- T006: migration seed admin_email
- T007: إزالة hardcoded email من notificationTypes.ts (بنفس الوقت مع T006)

بعد T007 (تسلسلي — يعتمد على helper من T007):
- T008: إزالة hardcoded email من emailQueueService.ts
```

## Parallel Example: Phase 3 (US1)

```text
بالتسلسل (كل مهمة تعتمد على السابقة في نفس الملف):
T009 → T010 → T011 → T012 → T013 → T014 → T015
```

---

## Implementation Strategy

### MVP First (US1 فقط)

1. Phase 1: التحقق من البنية
2. Phase 2: DB + settings
3. Phase 3: Edge Function + pg_cron
4. **STOP والتحقق**: إيميل يومي يصل ✓
5. هذا وحده يُحقق القيمة الأساسية

### Incremental Delivery

1. Phase 1 + 2 → البنية جاهزة
2. Phase 3 → إيميل يومي تلقائي ✓ (MVP)
3. Phase 4 → إشعارات داخلية مصنَّفة ✓
4. ~~Phase 5~~ → محذوف (US3 خارج النطاق)
5. Phase 6 → إعدادات فعّالة ✓
6. Phase 7 → polish + email queue processor ✓
7. Phase 8 → تقرير CSV مرفق + يدوي ✓
8. Phase 9 → تأجيل إشعارات بعينها (Snooze/Defer) ✓

---

## Notes

- لا tests مطلوبة — التحقق يدوي + typecheck
- **T006/T033**: DB migrations تُطبَّق على الإنتاج عبر `mcp__supabase__apply_migration`
- **T015/T027**: pg_cron jobs تُضاف عبر migration SQL
- **T003**: إذا لم تكن RPC موجودة → يُنشأ migration لها قبل Phase 3
- `RESEND_API_KEY` موجود بالفعل من feature backup email
- كل commit يتبع: `[notifications]: وصف بالعربي`
- **RTL/Arabic**: كل نصوص الـ UI الجديدة (T032/T032b/T035/T036) يجب أن تكون عربية + `dir="rtl"` (Constitution II)
- **Brand**: grep على "SAW Tracker" / "sawtracker" في الـ Edge Functions الجديدة (T009, T026, T026b, T030) — أي تسرب يُحذف فوراً (Constitution VI)

---

## Summary

| المرحلة | عدد المهام | القيمة |
|---------|-----------|--------|
| Phase 1 (Setup) | 3 | تحقق |
| Phase 2 (Foundational) | 3 | DB + إعدادات (حذف T004/T005) |
| Phase 3 (US1 — Email) | 7 | إيميل تلقائي يومي ← MVP |
| Phase 4 (US2 — In-app) | 3 | إشعارات داخلية |
| Phase 5 (US3) | — | محذوف (notification_mutes خارج النطاق) |
| Phase 6 (US4 — Settings) | 2 | إعدادات فعّالة |
| Phase 7 (Polish) | 5 | _shared helpers + email queue + cleanup |
| Phase 8 (US5 — CSV) | 4 | تقرير CSV 3 شيتات + يدوي + تحذير صفحة الإعدادات |
| Phase 9 (US6 — Snooze) | 7 | تأجيل وثائق بعينها (+ Drizzle schema + RLS verify) |
| **المجموع الفعلي** | **34** | (بدون المحذوفات) |
