# Implementation Plan: تحسين النسخ الاحتياطي — جداول شاملة + CSV + استعادة

**Branch**: `016-backup-restore-csv` | **Date**: 2026-05-21 | **Spec**: [spec.md](spec.md)

---

## Summary

توسيع نظام النسخ الاحتياطي الحالي ليشمل 18 جدول تشغيلي (بدل 12)، إضافة تصدير CSV ZIP يدعم العربية في Excel، وبناء نظام استعادة atomic محمي بتأكيد مزدوج وـ snapshot وقائي تلقائي. الاستعادة تجري داخل PostgreSQL (PL/pgSQL) لتجاوز قيود Edge Function CPU timeout.

---

## Technical Context

**Language/Version**: TypeScript 5.9 (frontend) + Deno latest (Edge Functions)
**Primary Dependencies**: React 19, Supabase JS v2, React Query v5, JSZip (جديد — CSV ZIP)
**Storage**: PostgreSQL (Supabase) + Supabase Storage bucket `backups`
**Testing**: Vitest + React Testing Library (frontend)
**Target Platform**: Web browser (Chrome 80+, Firefox 113+, Safari 16.4+)
**Project Type**: Web application — internal admin dashboard
**Performance Goals**: نسخة احتياطية < 60s لـ 100k سجل؛ استعادة < 5 دقائق لنفس الحجم
**Constraints**: Edge Function CPU time ≤ 2s → الاستعادة تجري في PostgreSQL عبر RPC
**Scale/Scope**: ~18 جدول، متوقع < 500k سجل إجمالي في المدى القريب

---

## Constitution Check

| Principle | Gate | Status |
|-----------|------|--------|
| I — Supabase-First | Frontend → Supabase مباشرة؛ Edge Function لعمليات service_role فقط | ✅ |
| II — Arabic RTL | كل نصوص الواجهة عربية؛ CSV + BOM؛ ar-SA | ✅ |
| III — Type Safety | TypeScript كامل؛ `BackupArchive` v2 interface؛ Drizzle types | ✅ |
| IV — Security via RLS | RLS على `restore_history`؛ `admin_restore_backup` SECURITY DEFINER + auth.uid() check | ✅ |
| V — Monorepo Discipline | جداول جديدة في `lib/db/src/schema/`؛ migrations فقط | ✅ |
| VI — Brand ZaFeer | لا أسماء legacy | ✅ |
| VII — Users vs Employees | الاستعادة تحترم الفصل؛ لا RLS على employees بـ auth.uid() | ✅ |

---

## Project Structure

### Documentation (this feature)

```text
specs/016-backup-restore-csv/
├── plan.md              ← هذا الملف
├── research.md          ← Phase 0 ✅
├── data-model.md        ← Phase 1 ✅
├── tasks.md             ← Phase 2 (speckit-tasks)
└── checklists/
    └── requirements.md
```

### Source Code

```text
# DB Schema + Migrations
lib/db/src/schema/system.ts          ← إضافة restoreHistoryTable + table_record_counts
supabase/migrations/
  20260521_016_backup_restore.sql    ← جديد: restore_history + alter backup_history + PL/pgSQL function

# Edge Functions
supabase/functions/
  automated-backup/index.ts          ← تحديث: 18 جدول + table_record_counts + archive version 2
  restore-backup/index.ts            ← جديد: orchestrator يستدعي admin_restore_backup RPC

# Frontend — Services
artifacts/zafeer/src/lib/
  backupService.ts                   ← تحديث: triggerManualBackup يحفظ table_record_counts
  restoreService.ts                  ← جديد: fetchRestoreHistory, triggerRestore, generateCsvZip
  csvExport.ts                       ← جديد: JSON → CSV per table (UTF-8 BOM + JSZip)

# Frontend — Components
artifacts/zafeer/src/components/settings/tabs/
  BackupTab.tsx                      ← تحديث: زر CSV + restore UI في القائمة

artifacts/zafeer/src/components/settings/backup/
  RestorePreviewModal.tsx            ← جديد: معاينة + تأكيد مزدوج + تقدم الاستعادة
  BackupListItem.tsx                 ← جديد: عنصر واحد في القائمة (مع أزرار Download JSON/CSV + Restore)
```

---

## Implementation Phases

### Phase A — DB Foundation (migration + schema)

**T-001**: إضافة `table_record_counts jsonb` إلى `backup_history`
**T-002**: إنشاء جدول `restore_history` (مع حقل `status` ذو 6 مراحل) + RLS policy (admin SELECT فقط)
**T-003**: تحديث Drizzle schema في `lib/db/src/schema/system.ts`
**T-004**: إنشاء جدول `restore_staging` مع chunking `(chunk_index, chunk_total)` — يتجاوز حد PostgREST 6MB بتقسيم كل جدول لدفعات 500 سجل
**T-004b**: إضافة عمود `maintenance_until` على `system_settings` + دالة `is_maintenance_active()` RPC + pg_cron sweeper كل دقيقة + RLS تُتيح لكل `authenticated` قراءة `maintenance_mode`
**T-004c**: دوال PL/pgSQL المساعدة: `_get_staged_rows`, `_verify_chunks_complete`, `_verify_admin_in_backup`, `_preflight_validate_fks`
**T-004d**: `admin_restore_backup(p_backup_id, p_session_id)` — تُنفِّذ الـ 4 pre-flight checks ثم DELETE/INSERT atomic
**T-005**: Migration شاملة لكل الخطوات + apply عبر Supabase MCP

### Phase B — Edge Functions

**T-006**: تحديث `automated-backup/index.ts`:
- توسيع `TABLES_TO_EXPORT` من 12 → 18 جدول (بالترتيب الموثَّق في data-model.md)
- إضافة admin JWT check في البداية (A8)
- `supabase.rpc('try_backup_lock')` (wrapper في public schema — pg_catalog functions لا تُستدعى عبر PostgREST مباشرة، #9) — لو مقفول: skip مع log 409 (H2)
- في finally: `supabase.rpc('release_backup_lock')` — تحرير session-level lock
- حساب `table_record_counts` لكل جدول
- رفع `version: 2` في JSON archive
- تخزين `table_record_counts` في `backup_history`

**T-007**: إنشاء `restore-backup/index.ts` — orchestrator بـ chunked staging:
- يقبل `{ backup_id, confirm_date, confirm_word }` في body
- يتحقق `confirm_word === 'استعادة'` + `confirm_date` يطابق تاريخ النسخة بصيغة `dd/MM/yyyy`
- يتحقق admin status عبر JWT
- يُفعِّل `maintenance_mode` مع `maintenance_until = now() + 15min` في **خطوة واحدة أولى** قبل أي عمل آخر (C3/#2 — يمنع النافذة التي كانت `is_maintenance_active()` ترجع false فيها)
- يُنشئ pre-restore snapshot بـ backup logic inline (مع `skip_lock: true`) — لا يستدعي `automated-backup` كـ HTTP مستقل لأنه سيحجز advisory lock ويتعارض (#6)
- بعد نجاح الـ snapshot: يحذف snapshots الزائدة (احتفظ بآخر 10 شاملاً الجديد) — أولاً ملفاتها من Storage ثم السجلات من backup_history (#4/#5)
- يُحدِّث `restore_history.status = 'reading_file'`
- يقرأ الملف من Storage + decompress streaming + parse JSON
- يُحدِّث `restore_history.status = 'staging_data'`
- **Chunking**: كل جدول → دفعات 500 سجل → insert في `restore_staging(session_id, table_name, data, chunk_index, chunk_total)` بـ batches من 5 inserts (C2)
- يُحدِّث `restore_history.status = 'restoring_data'`
- يستدعي `admin_restore_backup(backup_id, session_id)` RPC
  - RPC تُنفِّذ: advisory lock + verify_chunks + preflight_fks + verify_admin + DELETE all + INSERT all
  - فشل = auto-ROLLBACK (البيانات لم تتغير) (C1)
- **finally block دائماً**: `DELETE FROM restore_staging WHERE session_id = ?` + إيقاف maintenance_mode
- عند نجاح: status=completed
- عند فشل: status=failed + تصنيف الخطأ العربي (8 أنواع + 3 جديدة: admin_not_in_backup, upload_incomplete, concurrent_op)

### Phase C — Frontend Services

**T-008**: `csvExport.ts`:
- `generateCsvZip(backupArchive: BackupArchive): Promise<Blob>`
- لكل جدول: headers من أول record + rows كـ CSV strings
- UTF-8 BOM لكل ملف
- JSZip يجمع الكل في `.zip`

**T-009**: `restoreService.ts`:
- `fetchRestoreHistory(): Promise<RestoreHistory[]>`
- `triggerRestore(backupId, confirmText): Promise<void>`
- `downloadBackupAsCsv(backup: BackupRecord): Promise<void>` — يستخدم `csvExport.ts`

**T-010**: تحديث `backupService.ts`:
- `triggerManualBackup` → قراءة `table_record_counts` من response
- تحديث type `BackupRecord` ليشمل `table_record_counts?: Record<string, number>`

### Phase D — Frontend UI

**T-011**: `BackupListItem.tsx`:
- عرض: تاريخ، نوع (يدوي/تلقائي/snapshot)، الحجم، عدد الجداول، عدد السجلات
- 3 أزرار: "تحميل JSON" | "تحميل CSV" | "معاينة واستعادة"
- Pre-restore-snapshot: يظهر بشريط تمييز خاص (نوع مختلف)

**T-012**: `RestorePreviewModal.tsx`:
- Step 1: جدول معاينة (اسم الجدول، عدد السجلات في النسخة vs الحالي)
- Step 2: تحذير احمر صريح + حقل نصي للتأكيد (يكتب "استعادة")
- Step 3: Progress indicator أثناء التنفيذ
- Step 4: نتيجة (نجاح/فشل) مع رابط للـ snapshot الوقائي

**T-013**: تحديث `BackupTab.tsx`:
- استبدال قائمة النسخ بـ `BackupListItem` components
- إضافة hook `useRestoreHistory` لعرض سجل الاستعادات
- تنبيه ثابت: "بيانات كلمات المرور خارج نطاق النسخة الاحتياطية"

### Phase E — Dependencies + Typecheck

**T-014**: إضافة JSZip: `pnpm --filter @workspace/zafeer add jszip` + `@types/jszip`
**T-015**: `pnpm typecheck` → صفر أخطاء

---

## User Decisions (confirmed 2026-05-21)

| القرار | الاختيار |
|--------|----------|
| أثناء الاستعادة | المستخدمون الآخرون → شاشة صيانة (ممنوع الدخول). المسؤول المُنفِّذ → يبقى داخل النظام ويرى progress bar. |
| تأكيد الاستعادة | خطوتان: (1) المستخدم يكتب تاريخ النسخة المختارة ← (2) يكتب "استعادة" |
| تنزيل CSV | ملف ZIP واحد يحتوي جميع الجداول |
| فشل الاستعادة | تُلغى التغييرات تلقائياً (البيانات لم تتغير) + رسالة خطأ مصنَّفة. snapshot وقائي محفوظ للمراجعة اليدوية. |

### تصنيف أخطاء الاستعادة (رسائل بالعربية)

| الخطأ | الرسالة للمستخدم |
|-------|-----------------|
| انقطاع الإنترنت | "انقطع الاتصال أثناء الاستعادة. تم إلغاء العملية. تحقق من الإنترنت وحاول مجدداً." |
| انتهاء المهلة | "استغرقت العملية وقتاً أطول من المتوقع. تم إلغاؤها. قد تكون قاعدة البيانات تحتوي بيانات كثيرة." |
| ملف النسخة تالف | "ملف النسخة الاحتياطية تالف أو غير مكتمل. اختر نسخة أخرى." |
| بنية جداول تغيّرت | "بنية قاعدة البيانات تغيّرت منذ إنشاء هذه النسخة. لا يمكن استعادتها." |
| مساحة ممتلئة | "مساحة التخزين ممتلئة. لم يُنشأ الـ snapshot الوقائي ← أُلغيت الاستعادة." |
| خطأ في الصلاحيات | "لا تملك صلاحية الاستعادة. تواصل مع مسؤول النظام." |
| خطأ في البيانات | "بيانات النسخة غير متوافقة مع النظام الحالي (تعارض في أرقام تعريفية). تم إلغاء الاستعادة." |
| المدير غير موجود في النسخة | "حسابك غير موجود في هذه النسخة. اختر نسخة أحدث من تاريخ إنشاء حسابك." |
| خطأ غير متوقع | "حدث خطأ غير متوقع في النظام. تم إلغاء الاستعادة. الكود: [رمز الخطأ الفني]." |

> في جميع حالات الفشل: تُلغى كل التغييرات تلقائياً (البيانات كما كانت)، يُخرج النظام من وضع الصيانة، snapshot وقائي محفوظ للمراجعة إذا احتجت.

---

## Architectural Revisions (post-analyze — 2026-05-21)

مشاكل اكتُشفت بعد `/speckit-analyze` وتم حلّها قبل التنفيذ:

| ID | المشكلة | الحل المُختار |
|----|---------|--------------|
| A1/C2 | PostgREST body limit ~6MB — حتى staging row واحد لجدول كبير يتجاوزها | **Chunking**: كل جدول يُقسَّم دفعات 500 سجل، كل دفعة row في `restore_staging` بـ `(chunk_index, chunk_total)` |
| A2/C1 | "رجوع تلقائي للـ snapshot" مبهم ومتعارض مع plan | مُوضَّح في spec+plan+UI: ROLLBACK = إلغاء فوري (البيانات لم تتغير)؛ snapshot للمراجعة اليدوية فقط |
| A3 | Edge Function CPU 2s | `DecompressionStream` streaming (IO لا CPU)؛ chunking يُوزع الضغط |
| A4/H1 | بيانات المدير لا تُستعاد (ON CONFLICT DO NOTHING) | بيانات المدير **تُستعاد** كاملاً. Pre-flight يرفض الاستعادة لو المدير غير موجود في النسخة (FR-019) |
| A5/H2 | `automated-backup` يشتغل أثناء `restore` → نسخة تالفة | Advisory lock `9182736455` مشترك — backup يأخذه أول، restore ينتظر 30s ثم يبدأ |
| A6 | Progress bar مزيّف | 4 مراحل Edge Function تُحدِّث `restore_history.status` |
| A8 | `automated-backup` بلا admin check | JWT admin check + `pg_try_advisory_lock` في بداية الدالة |
| A12/C3 | `maintenance_mode` عالق للأبد لو Edge Function انهارت | `maintenance_until` timestamp (+15 دقيقة) + `is_maintenance_active()` RPC + pg_cron sweeper كل دقيقة |
| H3 | لا يوجد FK pre-flight قبل المسح الكارثي | `_preflight_validate_fks()` تفحص كل FKs في staging قبل أي DELETE |
| #2 | maintenance_mode يُفعَّل مرتين (أولى بدون expiry، ثانية مع expiry) — نافذة `is_maintenance_active()=false` بين الاثنتين | دمجهما في upsert واحد أول شيء مع `maintenance_until = now()+15min` |
| #5 | snapshot cleanup يحذف `backup_history` records لكن لا يحذف الملفات من Storage | احذف Storage files أولاً `storage.remove([paths])` ثم السجلات — الترتيب إلزامي |
| #6 | `pg_cron` ليس مُفعَّلاً افتراضياً على Supabase — migration step 15 يفشل بـ `function cron.schedule does not exist` | `CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions` كأول سطر في step 15 |
| #7 | `pg_advisory_xact_lock` ينتظر للأبد لو backup جاري — لا timeout محدَّد | `SET LOCAL lock_timeout = '30s'` قبل lock call في `admin_restore_backup` |
| #9 | `supabase.rpc('pg_try_advisory_lock', ...)` يُرجع 404 — pg_catalog functions غير مُكشوفة عبر PostgREST | إنشاء wrapper functions في public schema: `public.try_backup_lock()` + `public.release_backup_lock()` |
| O1 | `_preflight_validate_fks` يُقارن uuid/int/text بدون cast صريح → type mismatch runtime error | إعادة كتابة بـ CTEs مع `::text` cast على كل قيمة، ونمط `NOT EXISTS` بدل `NOT IN` |
| O2 | `auth.uid()` في `admin_restore_backup` يُرجع NULL لو استُدعيت بـ service_role key | T011 يستدعي الـ RPC بـ user JWT client (من `req.headers.authorization`) لا service_role |
| O3 | Snapshot creation أثناء restore قد تتعارض مع advisory lock لو automated-backup جدولي يعمل بالتوازي | T011: تحقق من `try_backup_lock()=false` قبل استدعاء `automated-backup` لملء snapshot |
| O4 | `GENERATED ALWAYS AS IDENTITY` columns ستفشل مع `INSERT ... SELECT * FROM jsonb_populate_recordset` | T005b: فحص وجود identity columns قبل apply، إضافة `OVERRIDING SYSTEM VALUE` إذا لزم |

**Advisory Lock Key**: `9182736455` (ثابت — موثَّق في migration + Edge Functions)

### `restore_staging` Table (مُحدَّث بـ chunking)

```sql
CREATE TABLE public.restore_staging (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL,
  table_name   text NOT NULL,
  data         jsonb NOT NULL,      -- 500 سجل كحد أقصى لكل row
  chunk_index  integer NOT NULL DEFAULT 0,
  chunk_total  integer NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX restore_staging_unique
  ON restore_staging (session_id, table_name, chunk_index);
-- لا RLS — service_role فقط؛ يُنظَّف دائماً في finally block
```

### `system_settings` — maintenance_mode مع expiry

```sql
-- القيمة المخزَّنة: { "enabled": true, "started_at": "ISO", "executor_id": "uuid" }
-- عمود جديد:
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS maintenance_until timestamptz;

-- RPC يُستخدم بدل قراءة العمود مباشرة (يحترم expiry تلقائياً)
CREATE OR REPLACE FUNCTION is_maintenance_active()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT (setting_value->>'enabled')::boolean AND maintenance_until > now()
     FROM system_settings WHERE setting_key = 'maintenance_mode'
     LIMIT 1), false);
$$;
GRANT EXECUTE ON FUNCTION is_maintenance_active TO authenticated;
```

### `restore_history.status` State Machine (مُحدَّث)

```
pending → creating_snapshot → reading_file → staging_data → restoring_data → completed
                                                                            ↘ failed
```

### ترتيب تنفيذ `admin_restore_backup` (داخل PL/pgSQL transaction)

```
0. SET LOCAL lock_timeout = '30s'          ← #7: يمنع الانتظار للأبد لو backup جاري
1. pg_advisory_xact_lock(9182736455)       ← H2: ينتظر lock أو يُلغى بعد 30s
2. _verify_chunks_complete(session_id)     ← C2: تأكد وصلت كل دفعات كل جدول
3. _preflight_validate_fks(session_id)    ← H3: تحقق كل FKs سليمة قبل أي مسح
4. _verify_admin_in_backup(session_id)    ← H1/FR-019: تحقق المدير في النسخة
5. DELETE 18 جدول بالترتيب العكسي        ← يشمل DELETE FROM users (كلهم)
6. INSERT 18 جدول بالترتيب الصحيح        ← يشمل المدير نفسه من النسخة
7. COMMIT / EXCEPTION → auto-ROLLBACK     ← C1: لا رجوع للـ snapshot، البيانات لم تتغير
```

---

## Complexity Tracking

| Item | Why Needed | Simpler Alternative Rejected |
|------|------------|------------------------------|
| PL/pgSQL `admin_restore_backup` | Edge Function 2s CPU limit يمنع restore في Deno | Sequential supabase-js calls ليست atomic |
| `restore_staging` + chunking | PostgREST 6MB body limit — حتى row واحد لجدول كبير يتجاوزها | تمرير jsonb مباشرة أو row واحد per table (كلاهما يفشل) |
| 4 pre-flight checks قبل DELETE | منع الكوارث: chunks ناقصة / FKs يتيمة / المدير مش في النسخة / كلهم قبل أي مسح | التحقق بعد الفشل = بيانات في حالة غير محددة |
| `maintenance_until` + pg_cron | maintenance_mode يتعلق للأبد لو Edge Function انهارت | الاعتماد فقط على finally block (لا يُنفَّذ عند crash) |
| JSZip | CompressionStream لا يدعم ZIP format | Hand-rolled ZIP (~150 LOC) عرضة للأخطاء |
| Pre-restore snapshot قبل الاستعادة | SC-005: صفر استعادات بلا snapshot — ضمان عدم فقدان البيانات | لا بديل أبسط يحقق نفس المستوى من الأمان |
| maintenance_mode في system_settings | إشعار المستخدمين بوضع الصيانة عبر frontend | قفل RLS على 18 جدول (معقد + يبطئ كل Query) |
