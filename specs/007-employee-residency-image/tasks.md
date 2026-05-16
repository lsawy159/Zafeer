---
description: "Task list — ملف الإقامة للموظف (صورة أو PDF)"
---

# Tasks: ملف الإقامة للموظف (صورة أو PDF)

**Input**: Design documents from `specs/007-employee-residency-image/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/storage-and-ui.md, quickstart.md

**Tests**: اختبارات وحدة خفيفة للدوال الخالصة + الـ hook مُدرجة (quickstart.md يطلبها صراحةً). صفحات/بيانات اختبار تُحذف فور النجاح.

**Organization**: مجمّعة حسب user story لتمكين التنفيذ والاختبار المستقل.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: قابل للتوازي (ملفات مختلفة، لا تبعيات)
- **[Story]**: US1 رفع | US2 عرض | US3 رفض غير صالح | US4 استبدال/حذف
- المسارات نسبية لجذر الريبو؛ كود الواجهة تحت `artifacts/zafeer/`

## Path Conventions

- Frontend: `artifacts/zafeer/src/`
- Storage migration: `supabase/migrations/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: التحقق من جاهزية البيئة

- [x] T001 التحقق من توفّر `@supabase/supabase-js`, `@tanstack/react-query`, `sonner`, `lucide-react` في `artifacts/zafeer/package.json`، وأن `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` مضبوطة في `.env`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: البنية التحتية المشتركة — تحجب كل user stories

**⚠️ CRITICAL**: لا يبدأ أي user story قبل اكتمال هذه المرحلة

- [x] T002 إنشاء migration `supabase/migrations/20260516XXXXXX_create_employee_documents_bucket.sql`: إنشاء bucket خاص `employee-documents` (`public=false`, `file_size_limit=512000`, `allowed_mime_types` = image/jpeg,image/png,image/webp,application/pdf) + سياسات RLS على `storage.objects` لـ SELECT (`user_has_permission('employees','view')` OR `role='admin'`) و INSERT/UPDATE/DELETE (`user_has_permission('employees','edit')` OR `role='admin'`)، كلها مقيّدة بـ `bucket_id='employee-documents'`
- [x] T003 التحقق من الصيغة الفعلية لمفاتيح صلاحيات قسم الموظفين (`employees.view`/`employees.edit`) من `users.permissions` ودالة `user_has_permission`، وتطبيق migration T002 على مشروع Supabase
- [x] T004 [P] إنشاء `artifacts/zafeer/src/lib/residenceFile.ts`: الثوابت (`RESIDENCE_MAX_BYTES=512000`، `RESIDENCE_ALLOWED_MIME`، `RESIDENCE_BUCKET`)، النوع `ResidenceFileKind`، والدوال `validateResidenceFile`، `residenceKindFromPath`، `isLegacyExternalUrl`، `buildResidencePath` حسب عقد B.1
- [x] T005 إنشاء `artifacts/zafeer/src/hooks/useResidenceFile.ts`: `useUploadResidenceFile` (تحقق → رفع object → UPDATE `residence_image_url` → حذف القديم؛ لا UPDATE عند فشل الرفع)، `useDeleteResidenceFile`، `useResidenceSignedUrl`؛ إبطال `['employees']` بعد النجاح، توست عربي عبر `sonner` (يعتمد T004)

**Checkpoint**: الأساس جاهز — يمكن بدء user stories

---

## Phase 3: User Story 1 - رفع ملف إقامة الموظف (Priority: P1) 🎯 MVP

**Goal**: المستخدم يرفع صورة أو PDF (≤ 500 KB) لموظف ويُحفظ المرجع في `residence_image_url`

**Independent Test**: فتح موظف بدون ملف، رفع صورة JPG صالحة ثم PDF صالح، التأكد من الحفظ والربط بالموظف الصحيح

- [x] T006 [US1] إنشاء `artifacts/zafeer/src/components/employees/ResidenceFileField.tsx`: زر "إضافة ملف الإقامة"، `<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf">`، استدعاء `validateResidenceFile`، مؤشر تقدّم أثناء الرفع، تعطيل الإجراء أثناء `isPending` (FR-001, FR-002, FR-010)
- [x] T007 [US1] دمج رفع الملف في `artifacts/zafeer/src/components/employees/AddEmployeeModal.tsx` (~سطر 1217–1231): استبدال حقل النص `residence_image_url` بزر رفع — الرفع يتم بعد إنشاء الموظف للحصول على `employeeId`
- [x] T008 [US1] دمج `ResidenceFileField` في `artifacts/zafeer/src/components/employees/EmployeeCard.tsx` (~سطر 1537–1563): استبدال حقل النص بالمكوّن، تمرير `employeeId` و `currentPath`
- [x] T009 [P] [US1] اختبار وحدة لـ `useUploadResidenceFile` في `artifacts/zafeer/src/hooks/useResidenceFile.test.ts` (mock لـ supabase): نجاح الرفع يكتب المسار؛ فشل الرفع لا يكتب `residence_image_url`

**Checkpoint**: US1 تعمل ومختبَرة مستقلاً — رفع وحفظ ملف الإقامة

---

## Phase 4: User Story 2 - عرض ملف الإقامة من كارت الموظف (Priority: P1)

**Goal**: عرض الملف المحفوظ مباشرة من الكارت — صورة كمصغّرة قابلة للتكبير، PDF عبر استعراض المتصفح

**Independent Test**: موظف لديه صورة محفوظة → ظهور المصغّرة وتكبيرها؛ موظف لديه PDF → فتح الاستعراض دون تنزيل

- [x] T010 [US2] إنشاء `artifacts/zafeer/src/components/employees/ResidenceFileViewer.tsx`: `path` فارغ → لا عرض؛ `kind='image'` → `<img>` مصغّرة + lightbox عند النقر؛ `kind='pdf'` → أيقونة + زر "عرض الملف" يفتح `<iframe>`/تبويب جديد؛ رابط خارجي قديم → رابط "عرض" في تبويب جديد (FR-006, FR-007)
- [x] T011 [US2] دمج `ResidenceFileViewer` في `artifacts/zafeer/src/components/employees/EmployeeCard.tsx` بجانب `ResidenceFileField`، باستخدام `useResidenceSignedUrl` لتوليد رابط العرض

**Checkpoint**: US1 + US2 تعملان مستقلاً — رفع وعرض الملف من الكارت

---

## Phase 5: User Story 3 - رفض الملفات غير الصالحة (Priority: P2)

**Goal**: رفض أي ملف > 500 KB أو نوع غير مسموح أو 0 بايت، مع رسالة خطأ عربية واضحة دون حفظ

**Independent Test**: محاولة رفع ملف 600 KB وملف Word — رفض كليهما برسالة مناسبة دون أي طلب شبكة

- [x] T012 [P] [US3] اختبار وحدة لـ `validateResidenceFile` في `artifacts/zafeer/src/lib/residenceFile.test.ts`: 600 KB يُرفض، 0 بايت يُرفض، Word/txt يُرفض، 500 KB بالضبط وJPEG/PNG/WebP/PDF صالحة تُقبل
- [x] T013 [US3] في `ResidenceFileField.tsx`: عرض رسالة خطأ `validateResidenceFile` العربية عند الرفض ومنع أي رفع، التعامل مع ملف 0 بايت (FR-003, FR-004)

**Checkpoint**: US1 + US2 + US3 — الرفع المؤمَّن بالتحقق يعمل

---

## Phase 6: User Story 4 - استبدال أو حذف ملف الإقامة (Priority: P3)

**Goal**: استبدال الملف الحالي بآخر (صورة أو PDF) أو حذفه مع تأكيد

**Independent Test**: موظف لديه ملف → رفع بديل يظهر الجديد ويختفي القديم؛ ثم حذف + تأكيد → عودة لحالة "لا يوجد ملف"

- [x] T014 [US4] في `ResidenceFileField.tsx`: عند وجود ملف، عرض زر "استبدال الملف" (يمرّر `oldPath` لـ `useUploadResidenceFile` لحذف القديم) وزر "حذف الملف" يفتح نافذة تأكيد عربية تستدعي `useDeleteResidenceFile` (FR-008, FR-009)
- [x] T015 [P] [US4] اختبار وحدة لـ `useDeleteResidenceFile` في `artifacts/zafeer/src/hooks/useResidenceFile.test.ts`: الحذف يزيل object ويصفّر `residence_image_url`

**Checkpoint**: كل user stories تعمل مستقلاً

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: تحسينات شاملة والتحقق النهائي

- [x] T016 منع رفع ملف لموظف `is_deleted=true` في `ResidenceFileField.tsx` (تعطيل الزر) — Edge Case
- [x] T017 تشغيل `pnpm run typecheck` في `artifacts/zafeer` — صفر أخطاء، لا `any` بدون تبرير
- [ ] T018 تنفيذ Smoke Test (9 حالات) من [quickstart.md](./quickstart.md) في المتصفح والتأكد من نجاحها
- [ ] T019 حذف أي بيانات/ملفات اختبار أُنشئت في الـ bucket أو DB أثناء التحقق اليدوي

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: لا تبعيات
- **Foundational (Phase 2)**: بعد Setup — يحجب كل user stories
- **User Stories (Phase 3–6)**: كلها بعد Phase 2
  - US1 (P1) و US2 (P1) مستقلتان عن بعض — يمكن التوازي
  - US3 (P2) تمتدّ `ResidenceFileField` من US1
  - US4 (P3) تمتدّ `ResidenceFileField` من US1
- **Polish (Phase 7)**: بعد اكتمال القصص المطلوبة

### User Story Dependencies

- **US1 (P1)**: بعد Phase 2 — لا تبعيات على قصص أخرى
- **US2 (P1)**: بعد Phase 2 — مستقلة عن US1 (تستهلك `useResidenceSignedUrl` الأساسي)
- **US3 (P2)**: بعد US1 — تعدّل `ResidenceFileField.tsx`
- **US4 (P3)**: بعد US1 — تعدّل `ResidenceFileField.tsx`

### Within Each User Story

- T004 قبل T005 (الـ hook يستهلك الـ helpers)
- T006 قبل T007/T008 (المكوّن قبل دمجه)
- T010 قبل T011
- ترتيب: helpers → hook → مكوّن → دمج

### Parallel Opportunities

- T004 مع باقي إعداد Phase 2 (لكن T005 يعتمد T004)
- T009، T012، T015 (ملفات اختبار مختلفة) قابلة للتوازي
- بعد Phase 2: US1 و US2 يمكن لمطوّرَين مختلفَين العمل عليهما بالتوازي

---

## Parallel Example: User Story 1

```bash
# بعد اكتمال T006–T008، اختبار US1:
Task: "اختبار وحدة useUploadResidenceFile في artifacts/zafeer/src/hooks/useResidenceFile.test.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1: Setup
2. Phase 2: Foundational (حرج — يحجب كل شيء)
3. Phase 3: US1 رفع الملف
4. Phase 4: US2 عرض الملف
5. **توقّف وتحقّق**: الميزة قابلة للعرض — رفع + عرض
6. النشر/العرض إن جاهز

### Incremental Delivery

1. Setup + Foundational → الأساس جاهز
2. US1 → اختبار مستقل → عرض
3. US2 → اختبار مستقل → عرض (MVP كامل: رفع + عرض)
4. US3 → تحصين التحقق → عرض
5. US4 → استبدال/حذف → عرض

---

## Notes

- [P] = ملفات مختلفة، لا تبعيات
- US1 يبني `ResidenceFileField` الأساسي؛ US3/US4 يمتدّانه — تنفيذ متسلسل لهذا الملف
- لا migration على جدول `employees` — يُعاد استخدام `residence_image_url`
- الـ bucket خاص — العرض حصراً عبر signed URLs
- كل النصوص عربية، RTL؛ commit بعد كل مهمة أو مجموعة منطقية
