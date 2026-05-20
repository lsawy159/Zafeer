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

- [ ] T001 Add JSZip dependency: `pnpm --filter @workspace/zafeer add jszip` و `pnpm --filter @workspace/zafeer add -D @types/jszip`
- [ ] T002 [P] Create directory `artifacts/zafeer/src/components/settings/backup/` for new components
- [ ] T003 [P] Create directory `supabase/functions/restore-backup/` for new Edge Function

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: تغييرات DB والـ schema — تسبق كل الـ user stories

**⚠️ CRITICAL**: لا تبدأ أي user story قبل اكتمال هذه المرحلة

- [ ] T004 Update `lib/db/src/schema/system.ts`: add `table_record_counts: jsonb('table_record_counts')` to `backupHistoryTable` + add full `restoreHistoryTable` definition as per data-model.md
- [ ] T005 Create migration file `supabase/migrations/20260521_016_backup_restore.sql` with:
  1. `ALTER TABLE backup_history ADD COLUMN IF NOT EXISTS table_record_counts jsonb`
  2. `CREATE TABLE restore_history` (كامل من data-model.md)
  3. RLS policies على `restore_history` (admin SELECT فقط)
  4. `CREATE OR REPLACE FUNCTION admin_restore_backup(p_backup_id uuid, p_tables jsonb) RETURNS jsonb SECURITY DEFINER` — DELETE بالترتيب العكسي (T018 → T001 من data-model.md) ثم INSERT بالترتيب الصحيح، مع تحقق `auth.uid()` admin داخل الدالة، وتأمين `REVOKE EXECUTE FROM PUBLIC; GRANT EXECUTE TO authenticated`
- [ ] T006 Apply migration via Supabase MCP (`mcp__supabase__apply_migration`)
- [ ] T007 Update `artifacts/zafeer/src/lib/backupService.ts`: extend `BackupRecord` interface to add `table_record_counts?: Record<string, number>` field

**Checkpoint**: DB جاهز — ابدأ US1 و US2 و US3 بالتوازي

---

## Phase 3: User Story 1 — 18 جدول + table_record_counts (P1) 🎯 MVP

**Goal**: النسخة الاحتياطية تشمل 18 جدول تشغيلي + تسجيل عدد السجلات لكل جدول

**Independent Test**: اضغط "تشغيل الآن" ← حمّل الملف ← افتح JSON ← تحقق من وجود 18 مفتاح في `tables` + وجود `table_record_counts` ← تحقق من صحة الأعداد

### Implementation

- [ ] T008 [US1] Update `supabase/functions/automated-backup/index.ts`:
  - استبدل `TABLES_TO_EXPORT` بالقائمة الكاملة من data-model.md (18 جدول بالترتيب الصحيح)
  - أضف حساب `table_record_counts`: لكل جدول بعد export احسب `data.length`
  - رفّع `version: 1` → `version: 2` في الـ JSON archive
  - أضف `table_record_counts` في payload الـ JSON
- [ ] T009 [US1] In same `automated-backup/index.ts`: after upload success, update `backup_history` record with `table_record_counts` (include it in the `.update({...})` call at the end)
- [ ] T010 [US1] Deploy updated Edge Function via `mcp__supabase__deploy_edge_function` with all 18 tables

**Checkpoint**: ✅ US1 مكتمل — اضغط "تشغيل الآن" وتحقق من الجداول الـ 18 في الملف

---

## Phase 4: User Story 2 — استعادة بتاريخ (P1)

**Goal**: المسؤول يختار نسخة من السجل، يرى معاينة، يؤكد مرتين، النظام يستعيد + pre-restore snapshot تلقائي + progress bar للمنفِّذ + شاشة صيانة للآخرين + رجوع تلقائي عند الفشل مع رسالة مصنَّفة

**Independent Test**: أنشئ نسخة ← أضف بيانات جديدة ← استعد من النسخة ← تحقق اختفاء البيانات الجديدة + ظهور snapshot جديد في القائمة + سجل في restore_history

### Implementation — Backend

- [ ] T011 [US2] Create `supabase/functions/restore-backup/index.ts` (Edge Function orchestrator):
  - قبول body: `{ backup_id: string, confirm_date: string, confirm_word: string }`
  - التحقق: `confirm_word === 'استعادة'` + `confirm_date` يطابق تاريخ النسخة بصيغة `dd/MM/yyyy`
  - التحقق من admin عبر JWT (نفس pattern `extractUserIdFromJwt` في `automated-backup`)
  - تفعيل maintenance_mode: upsert في `system_settings` key `maintenance_mode` بـ `{ enabled: true, started_at: ISO, executor_id: userId }`
  - إنشاء pre-restore snapshot: استدعاء `automated-backup` داخلياً (أو insert مباشر في backup_history بنوع `pre-restore-snapshot`)
  - قراءة ملف النسخة من Storage عبر signed URL → fetch → decompress (DecompressionStream) → parse JSON
  - تقسيم payload per-table وتمريره لـ `admin_restore_backup` RPC
  - عند نجاح: إيقاف maintenance_mode + insert في `restore_history` بـ status=completed
  - عند فشل: محاولة rollback تلقائي (restore من pre-restore snapshot) + إيقاف maintenance_mode + insert في `restore_history` بـ status=failed + تصنيف الخطأ (انظر خريطة الأخطاء أدناه)
  - إرجاع `{ success, restore_id, error_type?, error_message_ar? }`

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
    if (msg.includes('foreign key') || msg.includes('23503') || msg.includes('uuid'))
      return { type: 'data_conflict', message_ar: 'بيانات النسخة غير متوافقة مع النظام الحالي (تعارض في مفاتيح البيانات).' }
    return { type: 'unexpected', message_ar: `حدث خطأ غير متوقع في النظام. الكود: ${msg.slice(0, 80)}` }
  }
  ```
- [ ] T013 [US2] Deploy `restore-backup` Edge Function via `mcp__supabase__deploy_edge_function` (verify_jwt: true)

### Implementation — Frontend Services

- [ ] T014 [US2] Create `artifacts/zafeer/src/lib/restoreService.ts`:
  - `triggerRestore(backupId, confirmDate, confirmWord): Promise<RestoreResult>`  → calls `supabase.functions.invoke('restore-backup', ...)`
  - `fetchRestoreHistory(): Promise<RestoreHistoryRecord[]>` → query `restore_history` ordered by started_at desc
  - `pollMaintenanceMode(): Promise<boolean>` → query `system_settings` for key `maintenance_mode`
  - Types: `RestoreResult { success, restore_id, error_type?, error_message_ar?, snapshot_id? }` و `RestoreHistoryRecord`

### Implementation — Frontend UI

- [ ] T015 [US2] Create `artifacts/zafeer/src/components/settings/backup/RestorePreviewModal.tsx`:
  - **Step 1 — معاينة**: جدول يعرض لكل table: الاسم العربي، عدد السجلات في النسخة (من `table_record_counts`)
  - **Step 2 — تأكيد مزدوج**: حقل أول "اكتب تاريخ النسخة (مثال: 20/05/2026)" + حقل ثانٍ "اكتب كلمة استعادة" — زر التنفيذ `disabled` حتى يُكتَب الاثنان بشكل صحيح
  - **Step 3 — تقدم**: Progress bar مراحل: "إنشاء snapshot الوقائي..." → "قراءة النسخة..." → "حذف البيانات القديمة..." → "استعادة البيانات..." (polling كل 2 ثانية على حالة restore_history)
  - **Step 4 — نتيجة**: نجاح (رابط للـ snapshot الوقائي) | فشل (رسالة الخطأ المصنَّفة العربية + رابط للـ snapshot)
  - Props: `backup: BackupRecord`, `onClose: () => void`

- [ ] T016 [US2] Create `artifacts/zafeer/src/components/settings/backup/MaintenanceScreen.tsx`:
  - يُعرض لكل المستخدمين (غير المنفِّذ) لما `system_settings.maintenance_mode.enabled === true`
  - رسالة: "النظام في وضع الصيانة — جارٍ استعادة البيانات. يُرجى الانتظار."
  - بولينج كل 10 ثانية على `system_settings` key `maintenance_mode` — لما يُلغى تلقائياً يعود النظام

- [ ] T017 [US2] Update `artifacts/zafeer/src/App.tsx` (أو root layout): إضافة hook `useMaintenanceMode` يقرأ `system_settings.maintenance_mode` كل 10 ثانية — لو enabled وعمل المستخدم الحالي ليس هو `executor_id` → يعرض `<MaintenanceScreen />`

- [ ] T018 [US2] Create `artifacts/zafeer/src/components/settings/backup/BackupListItem.tsx`:
  - يعرض نسخة واحدة: التاريخ، النوع (يدوي/تلقائي/pre-restore-snapshot مع شريط تمييز خاص)، الحجم، عدد الجداول، إجمالي السجلات (من `table_record_counts`)
  - أزرار: "تحميل JSON" | "تحميل CSV" (placeholder — يُفعَّل في US3) | "معاينة واستعادة" (يفتح `RestorePreviewModal`)
  - Pre-restore-snapshot: يُعرض بخلفية مميزة وعنوان "Snapshot وقائي"

- [ ] T019 [US2] Update `artifacts/zafeer/src/components/settings/tabs/BackupTab.tsx`:
  - استبدل قائمة النسخ الحالية بـ `<BackupListItem>` components
  - أضف query hook لـ `restore_history` تحت قائمة النسخ (جدول بسيط: التاريخ، المنفِّذ، النسخة المُستعادة، الحالة)
  - أضف تنبيه ثابت (banner) أعلى الصفحة: "⚠️ ملاحظة: كلمات المرور وجلسات الدخول خارج نطاق النسخة الاحتياطية"

**Checkpoint**: ✅ US2 مكتمل — اختبر restore كامل وتحقق من rollback عند فشل متعمَّد

---

## Phase 5: User Story 3 — تنزيل CSV ZIP (P2)

**Goal**: زر "تحميل CSV" يُنتج ZIP يحتوي ملف CSV لكل جدول، العربية صحيحة في Excel

**Independent Test**: حمّل ZIP ← افتح أي CSV في Excel ← تحقق من ظهور العربية بدون تشويه + وجود ملف لكل جدول

### Implementation

- [ ] T020 [US3] Create `artifacts/zafeer/src/lib/csvExport.ts`:
  - `convertTableToCsv(tableName: string, rows: Record<string, unknown>[]): string`:
    - Header row من `Object.keys(rows[0])`
    - قيم مُعالَجة: null→فارغ، arrays/objects→ `JSON.stringify()` مع escape للـ `"` والأسطر الجديدة
    - `'﻿'` (UTF-8 BOM) كأول بايت
  - `generateCsvZip(archive: BackupArchive): Promise<Blob>`:
    - استخدام `import JSZip from 'jszip'`
    - لكل table في `archive.tables`: `zip.file(\`\${tableName}.csv\`, convertTableToCsv(tableName, rows))`
    - `return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })`
  - `downloadBlob(blob: Blob, filename: string): void` — يُنشئ `<a>` مؤقتاً ويضغط click

- [ ] T021 [US3] Update `artifacts/zafeer/src/lib/restoreService.ts`: add `downloadBackupAsCsv(backup: BackupRecord): Promise<void>`:
  - احصل على signed URL لملف النسخة (`getBackupDownloadUrl`)
  - fetch → decompress via `DecompressionStream('gzip')` → parse JSON → `generateCsvZip(archive)` → `downloadBlob(zip, \`backup-\${formattedDate}.zip\`)`

- [ ] T022 [US3] Update `artifacts/zafeer/src/components/settings/backup/BackupListItem.tsx`: فعّل زر "تحميل CSV" — يستدعي `downloadBackupAsCsv(backup)` مع loading state ومعالجة خطأ بـ `toast.error()`

**Checkpoint**: ✅ US3 مكتمل — تحقق من ZIP + Excel

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T023 [P] Run `pnpm --filter @workspace/zafeer typecheck` — أصلح أي type errors
- [ ] T024 [P] Update `memory/HISTORY.md` بملخص الجلسة + `memory/DECISIONS.md` بـ D-018 (قرارات 016)
- [ ] T025 [P] Update `memory/PROJECT_CONTEXT.md`: أضف نظام الاستعادة لـ "ما تم" + سجّل JSZip كـ dependency جديدة
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
