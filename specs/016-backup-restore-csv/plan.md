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
**T-002**: إنشاء جدول `restore_history` + RLS policy (admin SELECT فقط)
**T-003**: تحديث Drizzle schema في `lib/db/src/schema/system.ts`
**T-004**: إنشاء PL/pgSQL function `admin_restore_backup(p_backup_id, p_tables jsonb)` في migration
**T-005**: Migration شاملة لكل الخطوات + apply عبر Supabase MCP

### Phase B — Edge Functions

**T-006**: تحديث `automated-backup/index.ts`:
- توسيع `TABLES_TO_EXPORT` من 12 → 18 جدول (بالترتيب الموثَّق في data-model.md)
- حساب `table_record_counts` لكل جدول
- رفع `version: 2` في JSON archive
- تخزين `table_record_counts` في `backup_history`

**T-007**: إنشاء `restore-backup/index.ts`:
- يقبل `{ backup_id, confirm_text }` في body
- يتحقق `confirm_text === 'استعادة'`
- يتحقق admin status عبر JWT
- يُنشئ `pre-restore-snapshot` أولاً (يستدعي `automated-backup` داخلياً أو ينشئ سجل مباشرة)
- يقرأ الملف من Storage عبر service_role signed URL
- يُمرِّر payload → `admin_restore_backup` RPC
- يُسجِّل في `restore_history`

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
| أثناء الاستعادة | شاشة "وضع الصيانة" تمنع الدخول لكل المستخدمين حتى تنتهي الاستعادة |
| تأكيد الاستعادة | خطوتان: (1) المستخدم يكتب تاريخ النسخة المختارة ← (2) يكتب "استعادة" |
| تنزيل CSV | ملف ZIP واحد يحتوي جميع الجداول |
| فشل الاستعادة | النظام يرجع تلقائياً للـ snapshot + رسالة خطأ مصنّفة (أنواع الأخطاء أدناه) |

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
| خطأ غير متوقع | "حدث خطأ غير متوقع في النظام. تم إلغاء الاستعادة. الكود: [رمز الخطأ الفني]." |

> في جميع حالات الفشل: النظام يرجع تلقائياً للـ snapshot الوقائي ويُخرج النظام من وضع الصيانة.

---

## Complexity Tracking

| Item | Why Needed | Simpler Alternative Rejected |
|------|------------|------------------------------|
| PL/pgSQL `admin_restore_backup` | Edge Function 2s CPU limit يمنع restore في Deno | Sequential supabase-js calls ليست atomic |
| JSZip | CompressionStream لا يدعم ZIP format | Hand-rolled ZIP (~150 LOC) عرضة للأخطاء |
| Pre-restore snapshot قبل الاستعادة | SC-005: صفر استعادات بلا snapshot — ضمان عدم فقدان البيانات | لا بديل أبسط يحقق نفس المستوى من الأمان |
| maintenance_mode في system_settings | منع الكتابة من أي مستخدم أثناء الاستعادة | قفل على مستوى DB (أكثر تعقيداً + يمنع Admin نفسه) |
