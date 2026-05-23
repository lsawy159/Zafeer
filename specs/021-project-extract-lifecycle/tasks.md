# Tasks: حذف المشروع مع بقاء تاريخه المالي وإدارة المستخلصات

**Input**: Design documents from `specs/021-project-extract-lifecycle/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md  
**Tests**: لا يوجد طلب TDD صريح؛ الاعتماد على typecheck + API spec lint + smoke walkthrough  
**Branch**: `021-project-extract-lifecycle`

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: يمكن تنفيذها بالتوازي في ملفات مختلفة
- **[Story]**: القصة التي تخدمها المهمة (`US1`, `US2`, `US3`)
- جميع المهام تحتوي مسار الملف المستهدف

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: تهيئة مسار التنفيذ الجديد عبر schema + API contract + admin route

- [X] T001 تجهيز مسار DB change الخاص بهذه feature عبر `lib/db/src/schema/projects.ts` وDrizzle workflow قبل أي ربط API أو frontend

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: البنية المشتركة التي تعتمد عليها كل القصص

**CRITICAL**: لا يبدأ عمل user stories قبل اكتمال هذه المرحلة

- [X] T002 تحديث `lib/db/src/schema/projects.ts` لإضافة حقول `is_deleted default false not null` و`deleted_at nullable` إلى Drizzle schema الخاصة بـ `projects`
- [X] T003 تطبيق تغيير قاعدة البيانات عبر Drizzle workflow من `lib/db/drizzle.config.ts` مع إنشاء/مراجعة migration artifact الناتج من نفس تغيير Drizzle schema، وإثبات أن الأعمدة الجديدة في `public.projects` مطابقة لـ `lib/db/src/schema/projects.ts`
- [X] T004 تحديث `lib/api-spec/openapi.yaml` بإضافة endpoints `DELETE /admin/projects/{id}` و`DELETE /admin/extracts/{id}` مع responses `401/403/404/409/429` حسب الحالة
- [X] T005 تحديث `lib/api-spec/openapi.yaml` بإضافة endpoints تعديل أسطر المستخلص `POST /admin/extracts/{id}/lines` و`PATCH /admin/extract-lines/{lineId}` و`DELETE /admin/extract-lines/{lineId}` مع request/response schemas وresponses `401/403/404/409/429`
- [X] T006 تشغيل توليد العقود بعد تحديث `lib/api-spec/openapi.yaml` لإخراج التحديثات في `lib/api-zod/src/generated/*` و`lib/api-client-react/src/generated/*`
- [X] T007 إنشاء `artifacts/api-server/src/routes/projectLifecycle.ts` لتعريف delete project وdelete extract وتعديل أسطر المستخلص تحت `requireAdmin` و`adminRateLimiter` وباستخدام generated Zod validation و`supabaseAdmin` مع server-side permission checks لصلاحيات `projects.delete` و`extracts.delete` و`extracts.edit`
- [X] T008 تعديل `artifacts/api-server/src/routes/index.ts` لتسجيل route الخاصة بـ `projectLifecycle.ts`
- [X] T009 [P] تعديل `artifacts/zafeer/src/lib/supabase.ts` لإضافة `is_deleted?: boolean` و`deleted_at?: string | null` إلى واجهة `Project`
- [X] T010 [P] مراجعة `artifacts/zafeer/src/hooks/useProjects.ts` لضمان وجود سطح واحد للقراءات التشغيلية يستبعد `is_deleted = true`

**Checkpoint**: schema + API contracts + admin routes الأساسية جاهزة، ويمكن بدء القصص

---

## Phase 3: User Story 1 - حذف مشروع منتهي مع بقاء تاريخه (Priority: P1) MVP Part 1

**Goal**: حذف المشروع تشغيليًا فقط مع بقاء المستخلصات والرواتب التاريخية سليمة

**Independent Test**: حذف مشروع بلا موظفين نشطين وله مستخلصات/رواتب سابقة يؤدي لاختفائه من إدارة المشاريع فقط، مع بقاء السجلات التاريخية قابلة للعرض

- [X] T011 [US1] تنفيذ منطق soft delete للمشروع داخل `artifacts/api-server/src/routes/projectLifecycle.ts` بتحديث `projects.is_deleted` و`deleted_at` وتسجيل `activity_log` تحت `requireAdmin` وserver-side `projects.delete` check مع guarded operation تمنع إكمال الحذف إذا ارتبط موظف نشط بالمشروع قبل اكتمال العملية
- [X] T012 [US1] تعديل `artifacts/zafeer/src/pages/Projects.tsx` لاستبدال `supabase.from('projects').delete()` باستدعاء generated admin delete mutation مع إخفاء الزر إلا للـ admin صاحب `projects.delete`
- [X] T013 [P] [US1] تعديل `artifacts/zafeer/src/components/projects/ProjectDetailModal.tsx` لمزامنة زر الحذف ورسالة التأكيد وإخفاء الزر إلا للـ admin صاحب `projects.delete`
- [X] T014 [P] [US1] تعديل `artifacts/zafeer/src/components/projects/ProjectStatistics.tsx` لاستبعاد `projects.is_deleted = true` من الإحصاءات التشغيلية
- [X] T015 [P] [US1] تعديل `artifacts/zafeer/src/components/layout/GlobalSearchModal.tsx` لإخفاء المشاريع المحذوفة من نتائج البحث التشغيلية
- [X] T016 [P] [US1] تعديل `artifacts/zafeer/src/components/employees/AddEmployeeModal.tsx` لإخفاء المشاريع المحذوفة من قوائم اختيار المشروع
- [X] T017 [P] [US1] تعديل `artifacts/zafeer/src/components/employees/EmployeeCard.tsx` لإخفاء المشاريع المحذوفة من قوائم إعادة ربط الموظف
- [X] T018 [P] [US1] تعديل `artifacts/zafeer/src/components/import-export/TransferProceduresTab.tsx` و`artifacts/zafeer/src/components/import-export/TransferProceduresExcelImport.tsx` لإخفاء المشاريع المحذوفة من أي اختيار تشغيلي جديد
- [X] T019 [P] [US1] تعديل `artifacts/zafeer/src/pages/ImportExport.tsx` لمراجعة أي project selector تشغيلي واستبعاد `is_deleted = true`
- [X] T020 [P] [US1] تعديل `artifacts/zafeer/src/components/import-export/ImportTab.tsx` لضمان أن lookup/create logic لا يعيد إحياء مشروع محذوف تشغيليًا بصمت
- [X] T021 [P] [US1] مراجعة `artifacts/zafeer/src/pages/extracts/steps/StepSelectProject.tsx` وأي query داخل إنشاء المستخلصات لضمان عرض المشاريع غير المحذوفة فقط في الاختيارات التشغيلية
- [X] T022 [US1] مراجعة `artifacts/zafeer/src/hooks/useExtracts.ts` و`artifacts/zafeer/src/pages/extracts/ExtractDetail.tsx` لضمان بقاء عرض المستخلصات التاريخية طبيعيًا حتى عند `projects.is_deleted = true`
- [X] T023 [US1] مراجعة `artifacts/zafeer/src/hooks/usePayroll.ts` وأي عرض تاريخي مرتبط بالرواتب لضمان بقاء اسم المشروع التاريخي ظاهرًا بعد soft delete

**Checkpoint**: المشروع يختفي من التشغيل فقط، ولا ينكسر عرضه التاريخي في المستخلصات أو الرواتب

---

## Phase 4: User Story 2 - منع حذف مشروع ما زال عليه موظفون (Priority: P1) MVP Part 2

**Goal**: المنع يحصل فقط عند وجود موظفين نشطين، وليس بسبب تاريخ قديم أو موظفين soft-deleted

**Independent Test**: محاولة حذف مشروع عليه موظف نشط تُرفض برسالة واضحة، بينما مشروع عليه موظفون soft-deleted فقط ينجح حذفه

- [X] T024 [US2] تنفيذ تحقق الموظفين النشطين داخل `artifacts/api-server/src/routes/projectLifecycle.ts` بحيث يحسب فقط `project_id = target` و`COALESCE(is_deleted, false) = false`
- [X] T025 [US2] ضبط استجابة `DELETE /admin/projects/{id}` في `artifacts/api-server/src/routes/projectLifecycle.ts` لإرجاع `409` ورسالة صريحة عند وجود موظفين نشطين
- [X] T026 [US2] تعديل `artifacts/zafeer/src/pages/Projects.tsx` لعرض رسالة منع عربية دقيقة عند فشل الحذف بسبب الموظفين النشطين بدل conflict عام
- [X] T027 [P] [US2] تعديل `artifacts/zafeer/src/components/projects/ProjectDetailModal.tsx` لضمان اتساق رسالة المنع والتأكيد مع السلوك الجديد

**Checkpoint**: المانع الوحيد لحذف المشروع صار هو الموظفون النشطون

---

## Phase 5: User Story 3 - تعديل أو حذف مستخلص قائم عند الحاجة (Priority: P2)

**Goal**: إكمال دورة حياة المستخلص بإتاحة حذف الرأس كاملًا مع توضيح حدود التعديل وتسجيل audit

**Independent Test**: حذف مستخلص من القائمة أو التفاصيل يزيله هو وأسطره فقط، وتعديل مستخلص قائم يظل ممكنًا ضمن نطاقه الداخلي دون تغيير المشروع/الفترة/النسخة

- [X] T028 [US3] تنفيذ delete extract داخل `artifacts/api-server/src/routes/projectLifecycle.ts` بحذف `extract_invoices` وترك cascade للأسطر مع تسجيل `activity_log` بعد validation وrate limiting وserver-side `extracts.delete` check
- [X] T029 [US3] تعديل `artifacts/zafeer/src/hooks/useExtracts.ts` لإضافة hook يعتمد على generated admin delete extract mutation ويقوم بـ invalidation لـ `['extracts']` و`['extract', id]`
- [X] T030 [P] [US3] تعديل `artifacts/zafeer/src/pages/Extracts.tsx` لإضافة إجراء حذف واضح للمستخلص في القائمة مع إخفائه إلا للـ admin صاحب `extracts.delete`
- [X] T031 [US3] تعديل `artifacts/zafeer/src/pages/extracts/ExtractDetail.tsx` لإضافة زر حذف للمستخلص الكامل مع confirm dialog وإخفائه إلا للـ admin صاحب `extracts.delete`
- [X] T032 [US3] تعديل `artifacts/zafeer/src/hooks/useExtractLines.ts` و`artifacts/zafeer/src/pages/extracts/ExtractDetail.tsx` لاستخدام generated admin extract-line mutations بدل أي direct Supabase insert/update/delete على `extract_invoice_lines`، مع server-side وUI gate لصلاحية `extracts.edit` وتوضيح أن التعديل لا يغير `project_id` أو `period_month` أو `version`
- [X] T033 [US3] إضافة تسجيل `activity_log` لمسارات إضافة/تعديل/حذف أسطر المستخلص داخل `artifacts/api-server/src/routes/projectLifecycle.ts` ضمن نفس transaction/flow الخاص بالـ admin mutation
- [X] T034 [P] [US3] مراجعة queries في `artifacts/zafeer/src/hooks/useExtracts.ts` و`artifacts/zafeer/src/pages/extracts/ExtractDetail.tsx` للتأكد أن إدارة المستخلص لا تنكسر عندما يكون المشروع `is_deleted = true`

**Checkpoint**: المستخلصات قابلة للحذف الكامل والتعديل المنضبط دون التأثير على الرواتب أو الهوية الأساسية للمستخلص

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: توحيد الرسائل والتحقق النهائي عبر كل المسارات

- [X] T035 [P] تحديث أي messages أو dialogs أو toasts عربية متعلقة بحذف المشروع/المستخلص في `artifacts/zafeer/src/pages/Projects.tsx` و`artifacts/zafeer/src/pages/Extracts.tsx` و`artifacts/zafeer/src/pages/extracts/ExtractDetail.tsx`
- [X] T036 [P] مراجعة `artifacts/zafeer/src/components/projects/ProjectModal.tsx` لضمان أن إخفاء المشاريع soft-deleted لا يكسر uniqueness أو إعادة الإنشاء التشغيلية
- [X] T037 تشغيل `pnpm --filter @workspace/api-spec run lint` و`pnpm --filter @workspace/api-server run typecheck` و`pnpm --filter @workspace/zafeer run typecheck` و`pnpm -r run build` للتحقق من العقود والنوعيات وshared-lib build gate بعد التعديلات
- [ ] T038 تنفيذ smoke walkthrough يدوي وفق `specs/021-project-extract-lifecycle/quickstart.md`: حذف مشروع منتهي، رفض حذف مشروع عليه موظفون نشطون، رفض حذف مشروع بدون `projects.delete` من السيرفر، حذف مستخلص، تعديل سطر مستخلص بصلاحية `extracts.edit`، رفض تعديل/حذف المستخلص بدون الصلاحية المناسبة من السيرفر، التأكد من عدم وجود frontend Supabase mutation مباشر على `extract_invoice_lines`، والتأكد من بقاء العرض التاريخي للمستخلصات والرواتب مع مطابقة عدد المستخلصات والرواتب التاريخية قبل حذف المشروع وبعده

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: تبدأ فورًا
- **Phase 2 (Foundational)**: تعتمد على T001 وتمنع كل user stories حتى تكتمل
- **US1 وUS2 وUS3**: تعتمد على اكتمال Phase 2
- **Polish**: بعد اكتمال القصص المطلوبة

### User Story Dependencies

- **US1 + US2**: يجب شحنهما معًا كـ MVP واحد لأن حذف المشروع لا يكون آمنًا دون مانع الموظفين النشطين
- **US2**: تعتمد منطقيًا على نفس endpoint الخاصة بحذف المشروع في US1 لكنها تبقى مستقلة في اختبار قاعدة المنع
- **US3**: تعتمد على admin route والعقود المولدة من foundational، وتتكامل مع العرض التاريخي الذي راجعته US1

### Within Each User Story

- schema/contracts/admin routes قبل أي ربط frontend
- generated hooks قبل استدعائها من الواجهة
- surface filtering قبل تعميم التحقق اليدوي النهائي
- typecheck/smoke بعد اكتمال التدفقات

---

## Parallel Opportunities

```text
# Phase 2
T004 ثم T005 ثم T006 بالتسلسل لأنها تعتمد على نفس openapi.yaml
T009 + T010 بالتوازي بعد T002/T003

# US1
T013 + T014 + T015 + T016 + T017 + T018 + T019 + T020 + T021 بالتوازي بعد T011/T012
T022 + T023 بالتوازي لمراجعة العروض التاريخية

# US2
T026 + T027 بالتوازي بعد T024/T025

# US3
T030 + T034 بالتوازي بعد T028/T029
```

---

## Parallel Example: User Story 1

```text
Task: "تعديل artifacts/zafeer/src/components/projects/ProjectStatistics.tsx لاستبعاد projects.is_deleted = true من الإحصاءات التشغيلية"
Task: "تعديل artifacts/zafeer/src/components/layout/GlobalSearchModal.tsx لإخفاء المشاريع المحذوفة من نتائج البحث التشغيلية"
Task: "تعديل artifacts/zafeer/src/components/employees/AddEmployeeModal.tsx لإخفاء المشاريع المحذوفة من قوائم اختيار المشروع"
Task: "تعديل artifacts/zafeer/src/components/import-export/ImportTab.tsx لضمان أن lookup/create logic لا يعيد إحياء مشروع محذوف تشغيليًا بصمت"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. أكمل Phase 1: Setup
2. أكمل Phase 2: Foundational
3. أكمل Phase 3: User Story 1
4. أكمل Phase 4: User Story 2
5. تحقق يدويًا أن حذف المشروع المنتهي يعمل مع بقاء التاريخ وأن حذف مشروع عليه موظفون نشطون مرفوض
6. بعدها نوسع إلى US3

### Incremental Delivery

1. Setup + Foundational
2. US1 + US2 -> تحقق مستقل -> شحن MVP الآمن
3. US3 -> تحقق مستقل
5. Polish + typecheck + smoke

### Parallel Team Strategy

1. فرد يجهز `lib/db` + Drizzle workflow
2. فرد يجهز `lib/api-spec` + generated packages
3. فرد يجهز `artifacts/api-server`
4. بعد foundational، تتوزع تعديلات الواجهة حسب surfaces المختلفة

---

## Notes

- جميع المهام بصيغة checklist كاملة مع IDs ومسارات ملفات
- لا توجد tasks tests مستقلة لأن الـ spec لم تطلب TDD صريح
- الـ MVP الحقيقي هنا هو US1 + US2 بعد foundational، لأن حذف المشروع لا يصح شحنه دون مانع الموظفين النشطين
- `tasks.md` الآن مبنية على admin API والعقود المولدة، وليس على RPCs من الواجهة

