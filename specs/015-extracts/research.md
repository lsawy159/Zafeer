# Research: المستخلصات — Phase 0

**Date**: 2026-05-20  
**Branch**: `015-extracts`  
**Source**: تحليل codebase مباشر + قرارات مالك المشروع

---

## RES-001: Profession Matching Strategy

**Decision**: LOWER(TRIM(profession)) في كل مكان — SQL + JS

**Rationale**: المهن في `employees.profession` نص حر بلا lookup table. نفس المهنة قد تُكتب بحالات أحرف مختلفة أو مسافات زائدة ("مهندس" vs "مهندس "). تستخدم الكودبيز هذا النمط بالفعل.

**Implementation**:
- Migration: `CREATE UNIQUE INDEX ON project_job_title_rates (project_id, LOWER(TRIM(profession)))` — يمنع التكرار على مستوى DB
- SQL queries: `WHERE LOWER(TRIM(e.profession)) = LOWER(TRIM(r.profession))`
- Frontend: `profession.trim().toLowerCase()` عند المقارنة والبحث

**Alternatives considered**:
- UNIQUE constraint بسيط: يفشل مع اختلاف حالة الأحرف
- Lookup table للمهن: overhead زائد، المهن غير موحدة في النظام الحالي

---

## RES-002: residence_number Enforcement

**Decision**: إضافة NOT NULL + UNIQUE constraint في migration جديدة (مالك المشروع أقر A)

**Rationale**: الـ DB schema الحالي (`employees.ts:residence_number`) لا يطبّق NOT NULL على مستوى DB رغم أن الـ frontend يُلزم به. لضمان integrity ملف الحضور (المطابقة عبر رقم الإقامة)، يجب تطبيق القيد على مستوى DB.

**Implementation**:
```sql
-- في migration المستخلصات
ALTER TABLE public.employees 
  ALTER COLUMN residence_number SET NOT NULL;

ALTER TABLE public.employees 
  ADD CONSTRAINT employees_residence_number_unique UNIQUE (residence_number);
```

**Alternatives considered**:
- الاعتماد على frontend validation فقط: يُبقي خطر بيانات قديمة بدون رقم إقامة
- مالك المشروع أكّد: لا يوجد موظف بدون رقم إقامة في النظام الحالي

---

## RES-003: Extract Status Type

**Decision**: PostgreSQL Enum — `extract_status_enum` ('draft', 'exported')

**Rationale**: متسق مع نمط النظام الحالي (`payroll_run_status_enum`, `payroll_entry_status_enum` في `lib/db/src/schema/enums.ts`). مالك المشروع اختار ما يتماشى مع النظام.

**Implementation**:
```sql
CREATE TYPE public.extract_status_enum AS ENUM ('draft', 'exported');
```
في Drizzle:
```ts
export const extractStatusEnum = pgEnum('extract_status_enum', ['draft', 'exported']);
```

**Alternatives considered**:
- TEXT + CHECK constraint: أقل type safety في Drizzle
- Boolean is_exported: لا يدعم توسع مستقبلي لحالات إضافية

---

## RES-004: Job Title Rates UI Pattern

**Decision**: زر "⚙️ أسعار المهن" في ProjectDetailModal يفتح modal منفصل (`JobTitleRatesModal`)

**Rationale**: `ProjectDetailModal.tsx` flat layout (لا tabs). مالك المشروع اختار Option B — إضافة زر بدون إعادة هيكلة المكوّن الحالي.

**Implementation**:
- إضافة زر في header أو footer الـ modal الحالي
- `JobTitleRatesModal` يُعرض كـ `<Dialog>` فوق الـ modal الحالي
- يجلب المهن من `employees` حيث `project_id = currentProject.id` ويقرأ/يكتب من `project_job_title_rates`

**Alternatives considered**:
- Tab داخل ProjectDetailModal: يستلزم restructuring الـ modal بأكمله
- صفحة منفصلة لأسعار المهن: أطول navigation path

---

## RES-005: Snapshot Immutability Strategy

**Decision**: نسخ البيانات في `extract_invoice_lines` عند الإنشاء عبر RPC — لا FK references للأسعار

**Rationale**: FR-012 يشترط تجميد البيانات. الـ snapshot يُخزَّن كـ columns مباشرة في السطر: `profession_snapshot`, `monthly_rate_snapshot`, `residence_number_snapshot`, `employee_name_snapshot`. الإنشاء يتم في Postgres transaction واحدة عبر RPC لضمان atomicity.

**Implementation**:
- RPC `create_extract_invoice(...)` تُنفّذ: INSERT header + INSERT all lines + UPDATE totals في transaction واحدة
- لا multi-step client inserts — كل العمليات في Postgres
- `extract_invoice_lines` لا يحتوي FK لـ `project_job_title_rates` (الـ rate قد يتغير)
- status يبدأ 'draft' → يُحوَّل 'exported' من الـ client بعد نجاح Excel download

---

## RES-005b: Create vs Export — Single Flow Decision

**Decision**: الإنشاء والتصدير مرتبطان في نهاية الـ wizard — لا 'draft' مرئي للمستخدم

**Rationale**: الـ wizard ينتهي بزر "تصدير Excel". عند الضغط: (1) RPC تُنشئ المستخلص (status='draft'), (2) client يُولّد Excel ويُنزّله, (3) useMarkExported() يُحوّل status → 'exported'. 'draft' موجود في الـ enum للحالة المؤقتة بين RPC والـ download — لا يُعرض للمستخدم. إعادة التصدير من ExtractDetail تستدعي useMarkExported() مباشرة (المستخلص موجود بالفعل).

**Alternatives considered**:
- عملية واحدة كاملة (create + exported مباشرة): يخفي الفاصل بين إنشاء البيانات وتأكيد التصدير
- 'draft' مرئي في UI: يعقّد الـ wizard بدون قيمة مضافة

---

## RES-006: Excel Pattern

**Decision**: نفس نمط PayrollDeductions.tsx — `lazyXlsx.ts` + `file-saver`

**Rationale**: موجود في المشروع. `lazyXlsx.ts` يستورد `xlsx` lazily لتقليل bundle size. نفس الـ pattern للتحميل والتصدير.

**Implementation**:
```ts
// تحميل قالب الحضور
const { utils, write } = await loadXlsx();
const ws = utils.aoa_to_sheet([header, ...rows]);
const wb = utils.book_new();
utils.book_append_sheet(wb, ws, 'حضور');
saveAs(new Blob([write(wb, { type: 'array' })]), `قالب-حضور-${projectName}.xlsx`);

// قراءة ملف مرفوع
const data = await file.arrayBuffer();
const wb = xlsx.read(data);
const rows = utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
```

**File size limit**: 20MB — يُتحقق في frontend قبل أي معالجة: `if (file.size > 20 * 1024 * 1024) reject()`

---

## RES-007: Versioning Strategy

**Decision**: `version` column (integer) في `extract_invoices` — auto-increment per (project_id, period_month)

**Rationale**: FR-008 يشترط الاحتفاظ بكل النسخ. النسخة تُحسب: `MAX(version) + 1` لنفس (project_id, period_month).

**Implementation**:
```sql
-- في application layer (لا trigger)
SELECT COALESCE(MAX(version), 0) + 1 
FROM extract_invoices 
WHERE project_id = $1 AND period_month = $2
```

---

## RES-008: Permission Section

**Decision**: `extracts` section بـ 5 actions: `view`, `create`, `edit`, `delete`, `export`

**Rationale**: FR-015 + FR-016-018 يشترطون صلاحيات منفصلة للتعديل والحذف. `edit` = تعديل أيام + إضافة سطور. `delete` = حذف سطور. كلاهما يعمل على المسوَّدات فقط، إلا admin يتجاوز هذا القيد.

**Files to update**:
1. `PERMISSIONS_SCHEMA.ts` → إضافة section
2. `permissions.ts` → تحديث `PermissionMatrix` interface
3. Migration → إضافة `'extracts.view'`, `'extracts.create'`, `'extracts.export'` للـ admin users

---

## RES-009: ProjectDetailModal Bug Fix

**Decision**: إضافة `.eq('is_deleted', false)` في query الـ modal

**Rationale**: القراءة في التحليل أظهرت أن query في السطر 38 من `ProjectDetailModal.tsx` لا تُصفّي الموظفين المحذوفين. يُصلح في نفس commit إضافة زر أسعار المهن.

---

## RES-010: Navigation Order

**Decision**: `extracts` في order=10 (بين payroll-deductions=9 و import-export=11)

**Rationale**: المستخلصات تتعلق بالمشاريع والعملاء — منطقياً بعد الرواتب وقبل الاستيراد/التصدير العام.

**Files to update**:
- `nav-config.ts`: `{ id: 'extracts', labelAr: 'المستخلصات', icon: FileText, to: '/extracts', group: 'operational', order: 10 }`
- `useNavItems.ts`: `{ path: '/extracts', icon: FileText, label: 'المستخلصات', permission: { section: 'extracts' as const, action: 'view' } }`

---

## RES-011: Edit/Delete/Duplicate — Draft vs Exported Rules

**Decision**: 
- Draft: أي مستخدم بصلاحية edit/delete يُعدّل/يحذف سطور مباشرة
- Exported + Admin: يُعدّل مباشرة بدون قيود  
- Exported + غير Admin: لا تعديل مباشر — يجب Duplicate أولاً → نسخة draft جديدة → تعديل → تصدير

**Rationale**: يحفظ سلامة المستخلصات المُصدَّرة (audit trail) بينما يعطي admin المرونة الكاملة. غير admin لا يخسر العمل — يُكرّر ويُعدّل.

**Implementation**: 
- Helper function `extract_is_directly_editable(invoice_id)` في Postgres تُستخدم في RLS
- Frontend: `useIsAdmin()` أو `user.role === 'admin'` يتحكم في visibility الـ edit controls
- RPC `duplicate_extract_invoice` تُنشئ نسخة draft كاملة في transaction واحدة

**Alternatives considered**:
- فتح التعديل لكل مُصدَّر: يُفقد audit trail
- إغلاق التعديل كلياً بعد التصدير: يُلزم المستخدم بحذف ملف Excel وإعادة الكل
