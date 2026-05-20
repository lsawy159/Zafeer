# Tasks: المستخلصات — فواتير التكاليف الشهرية للمشاريع الخارجية

**Input**: Design documents from `specs/015-extracts/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅  
**Tests**: لم تُطلب — لا test tasks  
**Branch**: `015-extracts`

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: يُنفَّذ بالتوازي (ملفات مختلفة، لا تبعيات)
- **[Story]**: القصة التي تخدمها المهمة (US1/US2/US3)
- المسارات دقيقة ومكتملة

---

## Phase 1: Setup — DB Schema & Migration

**Purpose**: تعريف البنية البيانية الكاملة + Migration SQL قبل أي كود UI

- [ ] T001 Create Drizzle schema file with enum + 3 tables in `lib/db/src/schema/extracts.ts` (see data-model.md for exact field definitions)
- [ ] T002 Export extracts schema from `lib/db/src/schema/index.ts` — add `export * from './extracts';`
- [ ] T003 Create SQL migration file `supabase/migrations/YYYYMMDDHHMMSS_015_extracts_tables.sql` with: (1) ALTER employees NOT NULL+UNIQUE on residence_number, (2) CREATE TYPE extract_status_enum, (3) CREATE TABLE project_job_title_rates + expression index, (4) CREATE TABLE extract_invoices + indexes, (5) CREATE TABLE extract_invoice_lines + indexes, (6) ENABLE ROW LEVEL SECURITY on all 3 tables, (7) CREATE POLICY for each table per data-model.md

---

## Phase 2: Foundational — Permissions, Navigation & Routing

**Purpose**: البنية التحتية المشتركة — يجب اكتمالها قبل أي US

**⚠️ CRITICAL**: لا عمل على US حتى اكتمال هذه المرحلة

- [ ] T004 Apply migration — run `supabase db push` or `pnpm --filter @workspace/db run migrate` and verify 3 new tables exist in DB
- [ ] T005 Update `artifacts/zafeer/src/utils/PERMISSIONS_SCHEMA.ts` — add extracts section to `PERMISSION_SECTIONS`: `{ label: 'المستخلصات', description: 'إنشاء وتصدير فواتير التكاليف الشهرية', actions: ['view', 'create', 'export'] as const }`
- [ ] T006 Update `artifacts/zafeer/src/utils/permissions.ts` — add `extracts: { view: boolean; create: boolean; export: boolean }` to `PermissionMatrix` interface; verify `createEmptyPermissions()` and `createFullAdminPermissions()` still work
- [ ] T007 [P] Add extracts nav item to `artifacts/zafeer/src/components/layout/nav-config.ts`: `{ id: 'extracts', labelAr: 'المستخلصات', icon: FileText, to: '/extracts', group: 'operational', order: 10 }`
- [ ] T008 [P] Add extracts entry to `artifacts/zafeer/src/hooks/useNavItems.ts`: `{ path: '/extracts', icon: FileText, label: 'المستخلصات', permission: { section: 'extracts' as const, action: 'view' } }`
- [ ] T009 Add `/extracts` route to `artifacts/zafeer/src/App.tsx` with lazy import placeholder `<div>المستخلصات - قريباً</div>` (يُستبدل في US2)
- [ ] T010 Run `pnpm run typecheck` — verify zero TypeScript errors after all foundation changes

**Checkpoint**: Foundation ready — US1/US2/US3 يمكن البدء بها

---

## Phase 3: User Story 1 — تسجيل أسعار المهن (Priority: P1) 🎯 MVP Slice

**Goal**: المستخدم يسجّل سعراً شهرياً لكل مهنة في أي مشروع

**Independent Test**: افتح تفاصيل مشروع → اضغط "أسعار المهن" → أدخل سعراً → احفظ → أغلق وأعد الفتح → يظهر السعر محفوظاً

### Implementation for User Story 1

- [ ] T011 [US1] Create `artifacts/zafeer/src/hooks/useJobTitleRates.ts` — (1) `useJobTitleRates(projectId)`: SELECT from project_job_title_rates WHERE project_id, (2) `useUpsertJobTitleRate()`: upsert mutation with optimistic update, (3) profession deduplication via `LOWER(TRIM(profession))` in JS before upsert
- [ ] T012 [US1] Create `artifacts/zafeer/src/components/projects/JobTitleRatesModal.tsx` — (1) جلب موظفين نشطين للمشروع → استخراج المهن الفريدة (LOWER+TRIM), (2) جلب الأسعار الحالية من project_job_title_rates, (3) عرض table: مهنة | سعر شهري (NumericInput) | زر حفظ, (4) تحذير لكل مهنة بلا سعر, (5) تحذير لكل موظف بلا مهنة, (6) Dialog يُغلق بـ onOpenChange, RTL, SAR label
- [ ] T013 [US1] Modify `artifacts/zafeer/src/components/projects/ProjectDetailModal.tsx` — (1) إضافة `.eq('is_deleted', false)` في employees query (line ~38), (2) إضافة `useState(false)` لـ showRatesModal, (3) إضافة زر "أسعار المهن" في header/footer, (4) render `<JobTitleRatesModal>` conditionally

**Checkpoint**: US1 مكتملة ومختبرة مستقلاً — أسعار المهن تُحفظ وتُعرض صحيحاً

---

## Phase 4: User Story 2 — إنشاء مستخلص شهري (Priority: P1) 🎯 Core Feature

**Goal**: المستخدم ينشئ مستخلصاً كاملاً ويصدّره Excel في 5 خطوات

**Independent Test**: ابدأ مستخلص جديد → اختر مشروعاً → اختر شهراً → راجع الموظفين → ارفع ملف حضور → صدّر → تحقق من ملف Excel وتحول الحالة إلى "تم التصدير"

### Implementation for User Story 2

- [ ] T014 [US2] Create `artifacts/zafeer/src/hooks/useExtracts.ts` — (1) `useExtracts()`: SELECT extract_invoices + projects(name), (2) `useExtract(id)`: SELECT with extract_invoice_lines, (3) `useCreateExtract()`: mutation that (a) calculates version via MAX+1, (b) INSERTs extract_invoices, (c) INSERTs all extract_invoice_lines as snapshots, (d) UPDATEs totals, (e) UPDATEs status to 'exported' + exported_at on export
- [ ] T015 [P] [US2] Create `artifacts/zafeer/src/utils/extractCalculations.ts` — (1) `calcAmount(monthlyRate, totalDays, attendanceDays): number` using ROUND formula, (2) `validateAttendanceDays(days, totalDaysInMonth): boolean`, (3) `normalizeAttendanceRow(raw): AttendanceRow | null`, (4) `matchAttendanceToEmployees(rows, employees): MatchResult[]`
- [ ] T016 [US2] Create `artifacts/zafeer/src/pages/extracts/steps/StepSelectProject.tsx` — dropdown/list of active projects, تحذير إذا المشروع بلا موظفين نشطين, يُمرَّر projectId للـ wizard state
- [ ] T017 [P] [US2] Create `artifacts/zafeer/src/pages/extracts/steps/StepSelectPeriod.tsx` — month picker (شهر + سنة), حساب عدد أيام الشهر تلقائياً مع input للتأكيد, تحذير إذا وُجد مستخلص سابق لنفس project+month مع خيار المتابعة (نسخة جديدة)
- [ ] T018 [US2] Create `artifacts/zafeer/src/pages/extracts/steps/StepReviewEmployees.tsx` — جدول الموظفين النشطين في المشروع + حالة المهنة (✓ بسعر / ⚠ بلا سعر / ✗ بلا مهنة), زر "اذهب لأسعار المهن" إذا وُجدت مشكلات, يُعطَّل زر "التالي" حتى حل كل المشكلات
- [ ] T019 [US2] Create `artifacts/zafeer/src/pages/extracts/steps/StepUploadAttendance.tsx` — (1) زر تحميل قالب Excel (lazyXlsx + file-saver, اسم + رقم إقامة مُعبّأ، عمود الأيام فارغ), (2) file input مع تحقق حجم ≤ 20MB, (3) parse ملف مرفوع → `matchAttendanceToEmployees()`, (4) render `<AttendanceMatchSummary>`
- [ ] T020 [P] [US2] Create `artifacts/zafeer/src/pages/extracts/components/AttendanceMatchSummary.tsx` — جدول نتائج المطابقة: ✓ موظف معروف | ✗ رقم إقامة غير معروف | ⚠ أيام تتجاوز الشهر, عداد لكل فئة, يُعطَّل التصدير إذا وُجد ⚠ غير محلول
- [ ] T021 [US2] Create `artifacts/zafeer/src/pages/extracts/steps/StepPreviewExport.tsx` — (1) جدول معاينة: الاسم | المهنة | سعر المهنة | الأيام | المستحق (بـ SAR), (2) صف الإجماليات, (3) زر "تصدير Excel" → lazyXlsx → saveAs, (4) عند نجاح التصدير: استدعاء mutation لتحويل status → 'exported' وتسجيل exported_at
- [ ] T022 [US2] Create `artifacts/zafeer/src/pages/extracts/CreateExtractWizard.tsx` — orchestrates steps T016-T021: (1) state machine للخطوات (1..5), (2) shared wizard state (projectId, periodMonth, totalDays, matchedRows), (3) زر "رجوع"/"التالي" مع validation per step, (4) يستدعي `useCreateExtract()` عند التصدير
- [ ] T023 [US2] Create `artifacts/zafeer/src/pages/Extracts.tsx` — (1) جدول المستخلصات: اسم المشروع | الشهر (dd/MM/yyyy) | النسخة | الموظفون | الإجمالي SAR | الحالة badge, (2) زر "مستخلص جديد" → يفتح CreateExtractWizard, (3) permission guard: `useHasPermission('extracts', 'view')`, (4) PermissionGuard لزر الإنشاء: `'extracts', 'create'`
- [ ] T024 [US2] Update `artifacts/zafeer/src/App.tsx` — replace placeholder route with actual `<Extracts />` lazy import; add nested `/extracts/new` route for wizard

**Checkpoint**: US2 مكتملة — مستخلص يُنشأ كاملاً ويُصدَّر Excel بنجاح

---

## Phase 5: User Story 3 — أرشفة وعرض المستخلصات (Priority: P2)

**Goal**: المستخدم يستعرض سجل جميع المستخلصات ويعيد تصدير أي مستخلص قديم

**Independent Test**: افتح صفحة المستخلصات → اضغط على مستخلص قديم → تحقق من ظهور سطوره الكاملة كما أُنشئت → اضغط "إعادة تصدير" → تحقق من ملف Excel

### Implementation for User Story 3

- [ ] T025 [US3] Create `artifacts/zafeer/src/pages/extracts/ExtractDetail.tsx` — (1) عرض رأس المستخلص (مشروع، شهر، نسخة، حالة، إجمالي)، (2) جدول سطور المستخلص: الاسم | رقم الإقامة | المهنة | السعر الشهري | الأيام | المستحق — كل القيم من snapshot columns, (3) زر "إعادة تصدير Excel" مرئي لمن يملك `'extracts', 'export'`, (4) لا تعديل على أي بيانات — عرض فقط
- [ ] T026 [US3] Add `/extracts/:id` route to `artifacts/zafeer/src/App.tsx` with lazy `<ExtractDetail>`
- [ ] T027 [US3] Update `artifacts/zafeer/src/pages/Extracts.tsx` — اجعل صفوف الجدول قابلة للنقر مع navigate to `/extracts/:id`, أضف badge للنسخة (v1, v2...), أضف badge للحالة (مسوَّدة / تم التصدير)

**Checkpoint**: US3 مكتملة — كل المستخلصات تاريخياً قابلة للعرض والتصدير

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: تحقق نهائي من الجودة والتكامل

- [ ] T028 Run full `pnpm run typecheck` — zero errors required before any merge
- [ ] T029 [P] Verify SAR formatting throughout all extracts pages — all monetary values use `toLocaleString('ar-SA')` + "ريال" suffix, no EGP or جنيه
- [ ] T030 [P] Verify 20MB file size guard in `StepUploadAttendance.tsx` — `file.size > 20 * 1024 * 1024` before parse, clear Arabic error message
- [ ] T031 [P] Verify RLS isolation — test that user without `extracts.view` cannot see extracts page in nav and gets empty result from Supabase
- [ ] T032 Manual QA walkthrough: تسجيل أسعار → إنشاء مستخلص → رفع حضور → تصدير → عرض تفاصيل → إعادة تصدير → تحقق أن صفحة الرواتب لم تتأثر

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: لا تبعيات — يبدأ فوراً
- **Phase 2 (Foundational)**: يعتمد على Phase 1 — يحجب كل الـ US
- **Phase 3 (US1)**: بعد Phase 2 — مستقلة عن US2/US3
- **Phase 4 (US2)**: بعد Phase 2 — مستقلة عن US1 (لكن تستفيد من أسعار US1 موجودة في DB)
- **Phase 5 (US3)**: بعد Phase 4 — تعتمد على وجود مستخلصات (US2)
- **Phase 6 (Polish)**: بعد كل US المطلوبة

### User Story Dependencies

- **US1 (P1)**: مستقلة — تختبر قاعدة البيانات + Modal فقط
- **US2 (P1)**: مستقلة — لكن تتوقع أسعاراً مُسجَّلة لإتمام الـ wizard
- **US3 (P2)**: تعتمد على US2 لوجود مستخلصات في الـ DB للعرض

### Within Each Phase

- Models/hooks → components → pages
- T001 → T002 → T003 (sequential)
- T004 يعتمد على T003
- T007 و T008 بالتوازي بعد T006
- T015 و T017 و T020 بالتوازي مع مهام US2 الأخرى

---

## Parallel Opportunities

```text
# Phase 1 → Phase 2: sequential (migration first)

# Phase 3 (US1):
T011 → T012 → T013  (sequential within US1)

# Phase 4 (US2) — parallel batch 1:
T015: extractCalculations.ts
T016: StepSelectProject.tsx
T017: StepSelectPeriod.tsx
T020: AttendanceMatchSummary.tsx

# Phase 4 (US2) — then parallel batch 2 (after T015):
T018: StepReviewEmployees.tsx
T019: StepUploadAttendance.tsx
T021: StepPreviewExport.tsx

# Phase 4 (US2) — then T022 (wizard) after all steps ready
# Phase 4 (US2) — then T023+T024 (page + routing)

# Phase 6 (Polish):
T029 + T030 + T031  (all parallel)
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1: DB Schema + Migration
2. Phase 2: Permissions + Nav + Routing
3. Phase 3: US1 — أسعار المهن
4. Phase 4: US2 — إنشاء + تصدير المستخلص
5. **STOP**: اختبر إنشاء مستخلص كامل وتصديره
6. ابدأ Phase 5 إذا US1+US2 مستقرتان

### Incremental Delivery

1. Phase 1+2 → Foundation ready (لا UI بعد)
2. Phase 3 → أسعار المهن تعمل (US1 MVP)
3. Phase 4 → الإنشاء والتصدير يعمل (US2 core value)
4. Phase 5 → الأرشيف والتاريخ (US3 completion)
5. Phase 6 → Polish + QA

---

## Notes

- [P] = ملفات مختلفة، لا تعارض، يُنفَّذ بالتوازي
- [Story] يربط كل مهمة بقصة مستقلة قابلة للاختبار
- profession matching: دائماً `LOWER(TRIM(profession))` — لا استثناءات
- snapshot immutability: لا تُعدَّل extract_invoice_lines بعد الإنشاء أبداً
- PayrollDeductions.tsx: لا تعديل عليها — فصل تام (SC-006)
- typecheck يجب أن يمر صفر أخطاء قبل كل merge
- SAR + ar-SA locale في كل المبالغ — لا EGP

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| Phase 1: Setup | T001-T003 | DB Schema + Migration SQL |
| Phase 2: Foundational | T004-T010 | Apply migration + Permissions + Nav + Route |
| Phase 3: US1 | T011-T013 | أسعار المهن (hook + modal + ProjectDetail patch) |
| Phase 4: US2 | T014-T024 | إنشاء المستخلص — wizard + hooks + page |
| Phase 5: US3 | T025-T027 | أرشفة وعرض المستخلصات |
| Phase 6: Polish | T028-T032 | typecheck + QA + validation |
| **Total** | **32 tasks** | |
