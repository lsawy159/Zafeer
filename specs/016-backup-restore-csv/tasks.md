# Tasks: تحسين النسخ الاحتياطي — 18 جدول + CSV + استعادة بتاريخ

**Input**: specs/016-backup-restore-csv/
**Branch**: `016-backup-restore-csv`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅

**User Stories**:
- US1 (P1): توسيع النسخة لتشمل 18 جدول + table_record_counts
- US2 (P1): استعادة النظام لنسخة سابقة (restore بتاريخ)
- US3 (P2): تنزيل CSV ZIP لجميع الجداول

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: إعداد التبعيات والبنية الأساسية

- [X] T001 Add JSZip dependency: `pnpm --filter @workspace/zafeer add jszip` و `pnpm --filter @workspace/zafeer add -D @types/jszip`
- [X] T002 [P] Create directory `artifacts/zafeer/src/components/settings/backup/` for new components
- [X] T003 [P] Create directory `supabase/functions/restore-backup/` for new Edge Function

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: تغييرات DB والـ schema — تسبق كل الـ user stories

**⚠️ CRITICAL**: لا تبدأ أي user story قبل اكتمال هذه المرحلة

- [X] T004 Update `lib/db/src/schema/system.ts`:
  - add `table_record_counts: jsonb('table_record_counts')` to `backupHistoryTable`
  - add `maintenance_until: timestamp('maintenance_until', { withTimezone: true })` to the system_settings row type (or separate approach if settings use key-value)
  - add full `restoreHistoryTable` per data-model.md — status values: `'pending' | 'creating_snapshot' | 'reading_file' | 'staging_data' | 'restoring_data' | 'completed' | 'failed'`
  - add `restoreStagingTable` with chunking fields: `{ id uuid PK, session_id uuid, table_name text, data jsonb, chunk_index integer default 0, chunk_total integer default 1, created_at timestamptz }`
- [X] T005 Create migration `supabase/migrations/20260521_016_backup_restore.sql` with ALL of the following in order:
  1. `ALTER TABLE backup_history ADD COLUMN IF NOT EXISTS table_record_counts jsonb`
  2. `ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS maintenance_until timestamptz` (C3)
  3. `CREATE TABLE restore_history` per data-model.md (status text default 'pending')
  4. `CREATE TABLE restore_staging` with chunking columns: `(id uuid PK, session_id uuid NOT NULL, table_name text NOT NULL, data jsonb NOT NULL, chunk_index integer NOT NULL DEFAULT 0, chunk_total integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now())` + `CREATE UNIQUE INDEX restore_staging_unique ON restore_staging (session_id, table_name, chunk_index)` — لا RLS (C2)
  5. RLS على `restore_history`: `admins_manage_restore_history` (SELECT + INSERT للـ admin)
  6. RLS على `system_settings`: policy `all_read_maintenance_mode` — تُتيح لكل `authenticated` SELECT حيث `setting_key = 'maintenance_mode'` (A12)
  7. `CREATE OR REPLACE FUNCTION is_maintenance_active() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER` — تقرأ setting + تتحقق `maintenance_until > now()` (C3)
  8. `CREATE OR REPLACE FUNCTION _get_staged_rows(session_id, table_name)` — تجمع chunks بالترتيب (C2)
  9. `CREATE OR REPLACE FUNCTION _verify_chunks_complete(session_id)` — تتحقق chunk_total مكتمل (C2)
  10. `CREATE OR REPLACE FUNCTION _verify_admin_in_backup(session_id)` — تتحقق `auth.uid()` موجود في staged users (H1/FR-019)
  11. `CREATE OR REPLACE FUNCTION _preflight_validate_fks(session_id)` — تفحص كل single-column FKs في النسخة قبل أي DELETE (H3)
  12. `CREATE OR REPLACE FUNCTION admin_restore_backup(p_backup_id uuid, p_session_id uuid) RETURNS jsonb SECURITY DEFINER`:
      - تحقق admin role
      - `SET LOCAL lock_timeout = '30s'` — يمنع الانتظار للأبد لو backup جاري (#7)
      - `pg_advisory_xact_lock(9182736455)` — ينتظر لو backup جاري، يُلغى تلقائياً بعد 30s (#7/H2)
      - `_verify_chunks_complete` → `_preflight_validate_fks` → `_verify_admin_in_backup` (الترتيب مهم)
      - DELETE 18 جدول بالترتيب العكسي **بدون** استثناء المدير (المدير في النسخة — تم التحقق)
      - INSERT من `_get_staged_rows()` لكل جدول بالترتيب الصحيح
      - `EXCEPTION WHEN OTHERS THEN RAISE` — auto-ROLLBACK، كل التغييرات تُلغى (C1)
  13. `REVOKE EXECUTE ON FUNCTION admin_restore_backup, _get_staged_rows, _verify_chunks_complete, _verify_admin_in_backup, _preflight_validate_fks FROM PUBLIC`
  14. `GRANT EXECUTE ON FUNCTION admin_restore_backup, is_maintenance_active TO authenticated`
  14b. `CREATE OR REPLACE FUNCTION public.try_backup_lock() RETURNS boolean LANGUAGE sql AS $$ SELECT pg_try_advisory_lock(9182736455) $$;` و `CREATE OR REPLACE FUNCTION public.release_backup_lock() RETURNS boolean LANGUAGE sql AS $$ SELECT pg_advisory_unlock(9182736455) $$;` ثم `GRANT EXECUTE ON FUNCTION public.try_backup_lock, public.release_backup_lock TO authenticated;` — wrappers في public schema للـ session-level advisory lock (pg_catalog functions لا تُستدعى عبر PostgREST/supabase.rpc مباشرة — #9/#2)
  15. تفعيل pg_cron (غير مُفعَّل افتراضياً في Supabase — #6): `CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;` — ثم sweeper: `SELECT cron.schedule('clear-stale-maintenance', '* * * * *', 'UPDATE system_settings SET maintenance_until=NULL WHERE setting_key=''maintenance_mode'' AND maintenance_until < now()')`
- [X] T005b **قبل apply**: تحقق أن الـ 18 جدول لا تستخدم `GENERATED ALWAYS AS IDENTITY` columns (إذا وُجدت، `jsonb_populate_recordset` + INSERT ستفشل): شغّل `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND is_identity='YES' AND table_name IN ('users','companies','projects','employees',...)`. إذا وُجدت → أضف `OVERRIDING SYSTEM VALUE` في INSERT المقابل داخل `admin_restore_backup` (#4)
- [X] T006 Apply migration via Supabase MCP (`mcp__supabase__apply_migration`)
- [X] T007 Update `artifacts/zafeer/src/lib/backupService.ts`: extend `BackupRecord` interface to add `table_record_counts?: Record<string, number>` field

**Checkpoint**: DB جاهز — ابدأ US1 و US2 و US3 بالتوازي

---

## Phase 3: User Story 1 — 18 جدول + table_record_counts (P1) 🎯 MVP

**Goal**: النسخة الاحتياطية تشمل 18 جدول تشغيلي + تسجيل عدد السجلات لكل جدول

**Independent Test**: اضغط "تشغيل الآن" ← حمّل الملف ← افتح JSON ← تحقق من وجود 18 مفتاح في `tables` + وجود `table_record_counts` ← تحقق من صحة الأعداد

### Implementation

- [X] T008 [US1] Update `supabase/functions/automated-backup/index.ts`:
  - **أولاً**: أضف admin JWT check + advisory lock في بداية الدالة:
    - تحقق admin role (A8)
    - اقرأ `skip_lock` من body (boolean، default = false) — يُرسَل كـ `true` فقط من `restore-backup` لإنشاء snapshot وقائي (داخلي — #6)
    - لو `skip_lock === false`: `const { data: locked } = await supabase.rpc('try_backup_lock')` — لو `false` أرجع 409 "عملية نسخ أو استعادة جارية" (H2)
    - في finally block (لو `skip_lock === false` فقط): `await supabase.rpc('release_backup_lock')` — يُطلق الـ session-level lock
  - استبدل `TABLES_TO_EXPORT` بالقائمة الكاملة من data-model.md (18 جدول بالترتيب الصحيح)
  - أضف حساب `table_record_counts`: لكل جدول بعد export احسب `data.length`
  - رفّع `version: 1` → `version: 2` في الـ JSON archive
  - أضف `table_record_counts` في payload الـ JSON
- [X] T009 [US1] In same `automated-backup/index.ts`: after upload success, update `backup_history` record with `table_record_counts` (include it in the `.update({...})` call at the end)
- [X] T010 [US1] Deploy updated Edge Function via `mcp__supabase__deploy_edge_function` with all 18 tables

**Checkpoint**: ✅ US1 مكتمل — اضغط "تشغيل الآن" وتحقق من الجداول الـ 18 في الملف

---

## Phase 4: User Story 2 — استعادة بتاريخ (P1)

**Goal**: المسؤول يختار نسخة من السجل، يرى معاينة، يؤكد مرتين، النظام يستعيد + pre-restore snapshot تلقائي + progress bar للمنفِّذ + شاشة صيانة للآخرين + رجوع تلقائي عند الفشل مع رسالة مصنَّفة

**Independent Test**: أنشئ نسخة ← أضف بيانات جديدة ← استعد من النسخة ← تحقق اختفاء البيانات الجديدة + ظهور snapshot جديد في القائمة + سجل في restore_history

### Implementation — Backend

- [X] T011 [US2] Create `supabase/functions/restore-backup/index.ts` (Edge Function orchestrator — staging approach):
  - قبول body: `{ backup_id: string, confirm_date: string, confirm_word: string }`
  - التحقق: `confirm_word === 'استعادة'` + `confirm_date` يطابق تاريخ النسخة بصيغة `dd/MM/yyyy`
  - التحقق من admin عبر JWT
  - إنشاء سجل `restore_history` بـ `status='creating_snapshot'`
  - تفعيل maintenance_mode مع expiry فوراً (خطوة واحدة فقط): upsert في `system_settings` key `maintenance_mode` بـ `{ enabled: true, started_at: ISO, executor_id: userId }` + `maintenance_until = new Date(Date.now() + 15*60*1000).toISOString()` — يجب تفعيله قبل أي عمل آخر لضمان `is_maintenance_active()` ترجع true طوال العملية (C3/#2)
  - إنشاء pre-restore snapshot: insert مباشر في `backup_history` بنوع `pre-restore-snapshot` مع storage path بنفس convention الـ automated-backup: `backups/<backup_id>.json.gz` (نفس الـ bucket `backups`) — **⚠️ لا تستدعِ `automated-backup` كـ HTTP request مستقل** (سيحاول أخذ advisory lock وسيفشل بـ 409 لأن restore سيحجزه لاحقاً). بدلاً من ذلك: اكتب backup logic مباشرة inline في `restore-backup` (أو استخدم shared helper function) مع تمرير `skip_lock: true` للتخطي فوق الـ lock check — لو فشل الـ snapshot: أوقف maintenance_mode + حدّث status=failed + أرجع خطأ (#6)
  - حدّث `restore_history.status = 'reading_file'`
  - قراءة ملف النسخة من Storage عبر signed URL → fetch → decompress عبر `DecompressionStream('gzip')` streaming → `Response.json()` لـ parse
  - حدّث `restore_history.status = 'staging_data'`
  - توليد `session_id = crypto.randomUUID()`
  - **Chunking**: لكل table في `archive.tables`، قسّم rows لدفعات 500 (`CHUNK_SIZE = 500`) وأدخل كل دفعة كـ row منفردة في `restore_staging(session_id, table_name, data_chunk, chunk_index, chunk_total)` — أرسل max 5 chunks في كل insert batch (C2)
  - حدّث `restore_history.status = 'restoring_data'`
  - استدعاء `supabase.rpc('admin_restore_backup', { p_backup_id: backup_id, p_session_id: session_id })` — **⚠️ إلزامي**: استخدم client مُهيَّأ بـ user JWT من `req.headers.authorization` (ليس service_role key) — `auth.uid()` داخل الدالة يقرأ JWT، لو service_role = يُرجع NULL ويفشل verify_admin (#5)
  - **في كل الحالات (finally block)**: `DELETE FROM restore_staging WHERE session_id = session_id`
  - عند نجاح: إيقاف maintenance_mode (`maintenance_until = null`) + حدّث `restore_history.status = 'completed'`
  - عند فشل RPC: إيقاف maintenance_mode + حدّث `restore_history.status = 'failed'` + تصنيف الخطأ العربي
  - **ملاحظة في الكود (C1)**: فشل RPC = PostgreSQL ROLLBACK تلقائي (كل DELETE/INSERT يُلغى، البيانات لم تتغير). **لا** "استعادة تلقائية من snapshot" — snapshot للمراجعة اليدوية فقط.
  - **snapshot cleanup**: **بعد نجاح إنشاء snapshot الوقائي الجديد** (وقبل بدء قراءة ملف النسخة)، احذف snapshots الزائدة بحيث يبقى آخر 10 فقط من نوع `pre-restore-snapshot` (بما فيها الجديد — لو العدد ≤ 10 لا تفعل شيئاً) — الترتيب الإلزامي: **(1)** احضر `storage_path` للسجلات الزائدة من `backup_history` ← **(2)** `supabase.storage.from('backups').remove([storagePaths])` لحذف الملفات من Storage ← **(3)** `DELETE FROM backup_history WHERE id IN (...)` لحذف السجلات (#4 + #5)
  - إرجاع `{ success, restore_id, snapshot_id, error_type?, error_message_ar? }`

- [ ] T012 [US2] Add Arabic error classification map in `restore-backup/index.ts`:
  ```ts
  // داخل الـ Edge Function
  function classifyError(err: unknown): { type: string; message_ar: string } {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('ECONNRESET'))
      return { type: 'network', message_ar: 'انقطع الاتصال أثناء الاستعادة. تحقق من الإنترنت وحاول مجدداً.' }
    if (msg.includes('timeout') || msg.includes('57014'))
      return { type: 'timeout', message_ar: 'استغرقت العملية وقتاً أطول من المتوقع. البيانات كبيرة الحجم.' }
    if (msg.includes('parse') || msg.includes('JSON') || msg.includes('invalid'))
      return { type: 'corrupt_file', message_ar: 'ملف النسخة الاحتياطية تالف أو غير مكتمل. اختر نسخة أخرى.' }
    if (msg.includes('column') || msg.includes('schema') || msg.includes('42703'))
      return { type: 'schema_mismatch', message_ar: 'بنية قاعدة البيانات تغيّرت منذ إنشاء هذه النسخة.' }
    if (msg.includes('storage') || msg.includes('quota') || msg.includes('space'))
      return { type: 'storage_full', message_ar: 'مساحة التخزين ممتلئة. لم يُنشأ الـ snapshot الوقائي — أُلغيت الاستعادة.' }
    if (msg.includes('permission') || msg.includes('UNAUTHORIZED') || msg.includes('42501'))
      return { type: 'unauthorized', message_ar: 'لا تملك صلاحية الاستعادة. تواصل مع مسؤول النظام.' }
    if (msg.includes('foreign key') || msg.includes('23503') || msg.includes('PREFLIGHT_FK'))
      return { type: 'data_conflict', message_ar: 'بيانات النسخة غير متوافقة مع النظام الحالي (تعارض في مراجع البيانات). تم إلغاء الاستعادة — البيانات لم تتغير.' }
    if (msg.includes('ADMIN_NOT_IN_BACKUP'))
      return { type: 'admin_not_in_backup', message_ar: 'حسابك غير موجود في هذه النسخة. اختر نسخة أحدث من تاريخ إنشاء حسابك.' }
    if (msg.includes('INCOMPLETE_CHUNKS'))
      return { type: 'upload_incomplete', message_ar: 'فشل رفع بيانات النسخة بالكامل. تحقق من الاتصال وحاول مجدداً.' }
    if (msg.includes('CONCURRENT_OPERATION') || msg.includes('55P03'))
      return { type: 'concurrent_op', message_ar: 'عملية نسخ أو استعادة أخرى جارية. انتظر انتهاءها وحاول مجدداً.' }
    return { type: 'unexpected', message_ar: `حدث خطأ غير متوقع في النظام. الكود: ${msg.slice(0, 80)}` }
  }
  ```
- [X] T013 [US2] Deploy `restore-backup` Edge Function via `mcp__supabase__deploy_edge_function` (verify_jwt: true)

### Implementation — Frontend Services

- [X] T014 [US2] Create `artifacts/zafeer/src/lib/restoreService.ts`:
  - `triggerRestore(backupId, confirmDate, confirmWord): Promise<RestoreResult>`  → calls `supabase.functions.invoke('restore-backup', ...)`
  - `fetchRestoreHistory(): Promise<RestoreHistoryRecord[]>` → query `restore_history` ordered by started_at desc
  - `checkMaintenanceActive(): Promise<boolean>` → `supabase.rpc('is_maintenance_active')` (C3 — يحترم expiry تلقائياً)
  - Types: `RestoreResult { success, restore_id, error_type?, error_message_ar?, snapshot_id? }` و `RestoreHistoryRecord`

### Implementation — Frontend UI

- [X] T015 [US2] Create `artifacts/zafeer/src/components/settings/backup/RestorePreviewModal.tsx`:
  - **Step 1 — معاينة**: جدول يعرض لكل table: الاسم العربي، عدد السجلات في النسخة (من `table_record_counts`)
  - **Step 2 — تأكيد مزدوج**: حقل أول "اكتب تاريخ النسخة (مثال: 20/05/2026)" + حقل ثانٍ "اكتب كلمة استعادة" — زر التنفيذ `disabled` حتى يُكتَب الاثنان بشكل صحيح
  - **Step 3 — تقدم**: Progress bar يعكس `restore_history.status` (polling كل 2 ثانية):
    - `creating_snapshot` → "جارٍ إنشاء snapshot الوقائي..." (25%)
    - `reading_file` → "جارٍ قراءة ملف النسخة..." (50%)
    - `staging_data` → "جارٍ تحضير البيانات..." (65%)
    - `restoring_data` → "جارٍ استعادة البيانات (لا تغلق الصفحة)..." (80%)
  - **Step 4 — نتيجة**: نجاح (رابط للـ snapshot الوقائي) | فشل (رسالة الخطأ المصنَّفة العربية + رابط للـ snapshot + توضيح: "البيانات لم تتغير — العملية أُلغيت تلقائياً")
  - Props: `backup: BackupRecord`, `onClose: () => void`

- [X] T016 [US2] Create `artifacts/zafeer/src/components/settings/backup/MaintenanceScreen.tsx`:
  - يُعرض لكل المستخدمين (غير المنفِّذ) لما `is_maintenance_active() === true`
  - رسالة: "النظام في وضع الصيانة — جارٍ استعادة البيانات. يُرجى الانتظار."
  - polling كل 10 ثانية عبر `supabase.rpc('is_maintenance_active')` (C3 — يحترم expiry تلقائياً، لا يلزم RLS إضافي)

- [X] T017 [US2] Create `artifacts/zafeer/src/hooks/useMaintenanceMode.ts`:
  - يستدعي `supabase.rpc('is_maintenance_active')` كل 10 ثانية
  - يقرأ `executor_id` من `system_settings.maintenance_mode.setting_value` (بـ SELECT مباشر — متاح بـ A12 RLS)
  - لو active و`executor_id !== currentUserId` → يُعيد `{ active: true }`
  - يُستخدم في `App.tsx` لعرض `<MaintenanceScreen />` فوق كل الـ routes

- [X] T018 [US2] Create `artifacts/zafeer/src/components/settings/backup/BackupListItem.tsx`:
  - يعرض نسخة واحدة: التاريخ، النوع (يدوي/تلقائي/pre-restore-snapshot مع شريط تمييز خاص)، الحجم، عدد الجداول، إجمالي السجلات (من `table_record_counts`)
  - أزرار: "تحميل JSON" | "تحميل CSV" (placeholder — يُفعَّل في US3) | "معاينة واستعادة" (يفتح `RestorePreviewModal`)
  - Pre-restore-snapshot: يُعرض بخلفية مميزة وعنوان "Snapshot وقائي"

- [X] T019 [US2] Update `artifacts/zafeer/src/components/settings/tabs/BackupTab.tsx`:
  - استبدل قائمة النسخ الحالية بـ `<BackupListItem>` components
  - أضف query hook لـ `restore_history` تحت قائمة النسخ (جدول بسيط: التاريخ، المنفِّذ، النسخة المُستعادة، الحالة)
  - أضف تنبيه ثابت (banner) أعلى الصفحة: "⚠️ ملاحظة: كلمات المرور وجلسات الدخول خارج نطاق النسخة الاحتياطية"

**Checkpoint**: ✅ US2 مكتمل — اختبر restore كامل وتحقق من rollback عند فشل متعمَّد

---

## Phase 5: User Story 3 — تنزيل CSV ZIP (P2)

**Goal**: زر "تحميل CSV" يُنتج ZIP يحتوي ملف CSV لكل جدول، العربية صحيحة في Excel

**Independent Test**: حمّل ZIP ← افتح أي CSV في Excel ← تحقق من ظهور العربية بدون تشويه + وجود ملف لكل جدول

### Implementation

- [X] T020 [US3] Create `artifacts/zafeer/src/lib/csvExport.ts`:
  - `convertTableToCsv(tableName: string, rows: Record<string, unknown>[]): string`:
    - Header row من `Object.keys(rows[0])`
    - قيم مُعالَجة: null→فارغ، arrays/objects→ `JSON.stringify()` مع escape للـ `"` والأسطر الجديدة
    - `'﻿'` (UTF-8 BOM) كأول بايت
  - `generateCsvZip(archive: BackupArchive): Promise<Blob>`:
    - استخدام `const JSZip = (await import('jszip')).default` (dynamic import — يمنع تضخيم initial bundle ~95KB)
    - لكل table في `archive.tables`: `zip.file(\`\${tableName}.csv\`, convertTableToCsv(tableName, rows))`
    - `return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })`
  - `downloadBlob(blob: Blob, filename: string): void` — يُنشئ `<a>` مؤقتاً ويضغط click

- [X] T021 [US3] Update `artifacts/zafeer/src/lib/restoreService.ts`: add `downloadBackupAsCsv(backup: BackupRecord): Promise<void>`:
  - احصل على signed URL لملف النسخة (`getBackupDownloadUrl`)
  - fetch → decompress via `DecompressionStream('gzip')` → parse JSON → `generateCsvZip(archive)` → `downloadBlob(zip, \`backup-\${formattedDate}.zip\`)`

- [X] T022 [US3] Update `artifacts/zafeer/src/components/settings/backup/BackupListItem.tsx`: فعّل زر "تحميل CSV" — يستدعي `downloadBackupAsCsv(backup)` مع loading state ومعالجة خطأ بـ `toast.error()`

**Checkpoint**: ✅ US3 مكتمل — تحقق من ZIP + Excel

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T023 [P] Run `pnpm --filter @workspace/zafeer typecheck` — أصلح أي type errors
- [X] T024 [P] Update `memory/HISTORY.md` بملخص الجلسة + `memory/DECISIONS.md` بـ D-018 (قرارات 016)
- [X] T025 [P] Update `memory/PROJECT_CONTEXT.md`: أضف نظام الاستعادة لـ "ما تم" + سجّل JSZip كـ dependency جديدة
- [ ] T026 Verify in browser: تشغيل النسخة اليدوية → التحقق من 18 جدول في الملف → تنزيل CSV ZIP → فتح في Excel → التحقق من العربية

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: تبدأ فوراً بدون اعتماديات
- **Foundational (Phase 2)**: تعتمد على Phase 1 — تحجب كل الـ user stories
- **US1 (Phase 3)**: تعتمد على Phase 2 — لا تعتمد على US2 أو US3
- **US2 (Phase 4)**: تعتمد على Phase 2 — لا تعتمد على US1 أو US3 (لكن US1 مفيد لأن restore يعمل بشكل أفضل مع نسخة كاملة)
- **US3 (Phase 5)**: تعتمد على Phase 2 فقط — مستقلة تماماً
- **Polish (Phase 6)**: بعد اكتمال كل الـ user stories المطلوبة

### User Story Dependencies

- **US1**: مستقلة بعد Phase 2
- **US2**: مستقلة بعد Phase 2 (T011-T019 يمكن تنفيذها بالتوازي مع US1)
- **US3**: مستقلة بعد Phase 2 — تعتمد على US1 فقط لوجود `table_record_counts` في archive الملف (إذا كان الملف قديم، CSV يشتغل على `tables` مباشرة)

### Within Phase 4 (US2)

```
T011 → T012 → T013 (backend متسلسل)
T014 (service, بعد T013)
T015, T016, T017 [P] (components, بالتوازي بعد T014)
T018 (يعتمد على T015 للـ modal)
T019 (يعتمد على T018)
```

---

## Parallel Opportunities

```
# Phase 1 — بالتوازي:
T002 + T003 (directories)

# Phase 2 — متسلسل (كل task تعتمد على السابقة)

# Phase 3 + Phase 4 + Phase 5 — يمكن البدء بالتوازي بعد Phase 2:
T008-T010 (US1) || T011-T013 (US2 backend) || T020-T022 (US3)

# Phase 4 UI — بالتوازي:
T015 || T016 || T017

# Phase 6:
T023 || T024 || T025
```

---

## Implementation Strategy

### MVP First (US1 فقط)

1. Phase 1: Setup
2. Phase 2: Foundational (DB + migration)
3. Phase 3: US1 (18 جدول)
4. **STOP وتحقق**: تشغيل النسخة وفتح الملف — هل فيه 18 جدول؟
5. Deploy

### Incremental Delivery

1. Setup + Foundational → DB جاهز
2. US1 → نسخة كاملة ✅
3. US2 → استعادة كاملة ✅
4. US3 → CSV ZIP ✅

---

## Notes

- `[P]` = يمكن تشغيله بالتوازي مع tasks في نفس المرحلة (ملفات مختلفة)
- `[USN]` = ينتمي لـ User Story N
- T005 (migration) هي المهمة الأخطر — تحقق من data-model.md جيداً قبل apply
- `admin_restore_backup` تحذف **كل** بيانات الجداول — لا تختبر في production بدون pre-restore snapshot جاهز
- `maintenance_mode` في `system_settings`: تأكد من clear بعد كل test للاستعادة حتى لا تبقى الصفحة مقفلة
- **تصميم الـ staging (C2)**: كل جدول يُقسَّم لدفعات 500 سجل، كل دفعة row في `restore_staging` بـ `(chunk_index, chunk_total)` — يتجاوز حد PostgREST 6MB — يُنظَّف في finally block دائماً
- **"رجوع تلقائي" (C1)**: = PL/pgSQL ROLLBACK (إلغاء فوري، البيانات لم تتغير) — **ليس** restore من snapshot. snapshot الوقائي للمراجعة اليدوية فقط
- **Advisory lock `9182736455` (H2)**: ثابت مشترك بين `admin_restore_backup` (xact lock) و`automated-backup` (try_advisory_lock session) — مانع التشغيل المتوازي
- **Maintenance expiry (C3)**: `maintenance_until` timestamp (+15 دقيقة) + `is_maintenance_active()` RPC + pg_cron sweeper كل دقيقة — شاشة الصيانة لن تتجمد أبداً
- **Pre-flight order (H1+H2+H3)**: `_verify_chunks_complete` → `_preflight_validate_fks` → `_verify_admin_in_backup` — كلهم قبل أي DELETE
- **snapshot cleanup (M2)**: احتفظ بآخر 10 pre-restore snapshots فقط، احذف الأقدم في بداية كل restore
- **A8**: admin check + advisory lock في `automated-backup` قبل deploy — انظر T008
