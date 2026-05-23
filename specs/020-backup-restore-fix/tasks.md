# Tasks: إصلاح أمان الاستعادة واستقرار المايجرشن

**Input**: Design documents from `specs/020-backup-restore-fix/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: يمكن تنفيذه بالتوازي مع مهام أخرى مختلفة الملفات
- **[Story]**: US1, US2, US3, US4 حسب spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: تجهيز نقطة بداية forward-only للـ hardening بدل تعديل/إعادة تسمية migrations قديمة

- [x] T001 [P] إنشاء migration جديد forward-only باسم `supabase/migrations/20260523_020_backup_restore_hardening.sql` لتجميع إصلاحات restore قبل أي تعديل في مسارات التشغيل

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: تثبيت القواعد المشتركة التي تعتمد عليها كل user stories

**Checkpoint**: بعد T001 وT002 يمكن تنفيذ بقية القصص بشكل آمن

- [x] T002 [P] ملء `supabase/migrations/20260523_020_backup_restore_hardening.sql` بإصلاحات SQL الأساسية: fail-closed admin check، advisory lock acquire/release لمنع الاستعادة المتزامنة، تحديث contract الخاص بـ `public.admin_restore_backup(...)`، وتثبيت bookkeeping الخاص بالفشل

---

## Phase 3: User Story 1 - استعادة محمية بصلاحيات واضحة (Priority: P1)

**Goal**: الاستعادة لا تبدأ إلا بعد التأكد من أن الحساب Admin صالح ومصرّح له بالكامل

**Independent Test**: محاولة استعادة من حساب غير Admin تُرفض قبل أي side effect، ومحاولة استعادة من Admin صالح تُقبل وتبدأ بشكل طبيعي

- [x] T003 [US1] Harden admin gate in `supabase/functions/restore-backup/index.ts` بحيث يفشل الطلب إذا كانت `users.role` غير موجودة أو ليست `admin` قبل تشغيل maintenance أو snapshot أو staging
- [x] T004 [US1] Align the RPC payload in `supabase/functions/restore-backup/index.ts` مع `public.admin_restore_backup(...)` بحيث يمرّر `p_session_id` و`p_restore_history_id` الصحيحين بدل قيمة backup غير المطابقة

---

## Phase 4: User Story 2 - نتيجة الاستعادة تظل قابلة للتتبع حتى عند الفشل (Priority: P1)

**Goal**: أي فشل في restore يترك حالة نهائية واضحة ورسالة خطأ قابلة للمراجعة

**Independent Test**: فشل restore في منتصف العملية يترك `restore_history` كـ failed مع سبب واضح، ولا يبدو للمستخدمين وكأنه completed

- [x] T005 [US2] Move final success/failure persistence into `supabase/functions/restore-backup/index.ts` بحيث يكون الـ Edge Function هو مصدر الحالة النهائية بدل الاعتماد على rethrow من SQL
- [x] T006 [US2] Update `supabase/migrations/20260523_020_backup_restore_hardening.sql` بحيث `public.admin_restore_backup(...)` يرجّع failure metadata بدون ما يضيع bookkeeping بتاعه في rollback داخلي

---

## Phase 5: User Story 3 - البيانات المؤقتة للاستعادة تبقى معزولة (Priority: P2)

**Goal**: `restore_staging` يظل مؤقتًا ومغلقًا على مسار الاستعادة فقط

**Independent Test**: مستخدم عادي لا يستطيع قراءة أو تعديل staging، وبعد نجاح أو فشل restore لا تبقى أي rows نشطة مرتبطة بالمحاولة

- [x] T007 [US3] Lock down `restore_staging` access in `supabase/migrations/20260523_020_backup_restore_hardening.sql` باستخدام revoke/grant أو RLS بحيث لا يملك authenticated clients أي وصول مباشر
- [x] T008 [US3] Keep the `finally` cleanup in `supabase/functions/restore-backup/index.ts` بحيث يتم حذف `restore_staging` rows بعد النجاح أو الفشل في كل الأحوال

---

## Phase 6: User Story 4 - تحديثات البنية تظل مستقرة بين البيئات (Priority: P2)

**Goal**: التحديث يمر على البيئات القائمة والجديدة بدون تضارب أو احتياج لتنظيف يدوي لتاريخ migrations

**Independent Test**: تطبيق المايجرشن على database قائمة وعلى database جديدة ينجح من غير mismatch في التاريخ أو الحاجة لتدخل يدوي

- [x] T009 [US4] Document the migration rollout path in `specs/020-backup-restore-fix/quickstart.md` بحيث يوضح التطبيق على بيئة موجودة وبيئة جديدة بدون إعادة تسمية migrations قديمة

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: تحقق نهائي من السلوك والحالة بعد كل التغييرات

- [ ] T010 [P] Run `pnpm run typecheck` and smoke-check admin/non-admin restore behavior plus concurrent restore rejection using the steps in `specs/020-backup-restore-fix/quickstart.md`
- [ ] T011 [P] Verify `restore_history` and `restore_staging` after a success path, a failure path, and a rejected concurrent attempt so the final state matches the spec

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: يبدأ فورًا
- **Phase 2 (Foundational)**: يعتمد على T001
- **User Stories (Phase 3+)**: تبدأ بعد T002
- **Polish (Phase 7)**: بعد انتهاء القصص المطلوبة

### User Story Dependencies

- **US1 (P1)**: لا يعتمد على قصص أخرى
- **US2 (P1)**: يعتمد على baseline restore flow من US1/Foundational
- **US3 (P2)**: يعتمد على baseline migration hardening فقط
- **US4 (P2)**: يعتمد على اكتمال migration hardening والـ quickstart

### Within Each User Story

- التحقق من الصلاحيات يجب أن يسبق أي snapshot أو staging
- حالة الفشل النهائية يجب أن تُحفظ قبل أي cleanup نهائي
- `restore_staging` cleanup يجب أن يبقى في `finally`
- أي تعديل SQL جديد يجب أن يظل forward-only بدون إعادة تسمية للملفات المطبقة

### Parallel Opportunities

- T003 وT004 يمكن مراجعتهما معًا لكن التنفيذ الفعلي في نفس الملف غالبًا سيكون sequential
- T007 وT008 مستقلان في ملفين مختلفين ويمكن تنفيذهما بالتوازي إذا لزم
- T010 وT011 يمكن تشغيلهما بالتوازي كتحقق نهائي

---

## Parallel Example: User Story 3

```powershell
Task: "Lock down restore_staging access in supabase/migrations/20260523_020_backup_restore_hardening.sql"
Task: "Keep the finally cleanup in supabase/functions/restore-backup/index.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. أنشئ migration hardening الجديد
2. ثبّت admin gate في `supabase/functions/restore-backup/index.ts`
3. أصلح RPC contract بين Edge Function و`public.admin_restore_backup(...)`
4. STOP and VALIDATE: restore لا يبدأ إلا مع Admin صالح

### Incremental Delivery

1. Baseline hardening في SQL
2. US1: صلاحيات restore
3. US2: تتبع النجاح والفشل
4. US3: عزل staging وتنظيفه
5. US4: تأكيد استقرار تطبيق المايجرشن
6. Polish: typecheck + smoke verification

### Solo Strategy

1. ابدأ بـ T001 → T002
2. نفّذ US1 ثم تحقق من المسار
3. نفّذ US2 وUS3
4. أخيرًا تحقق من US4 وعمليات الـ smoke

---

## Notes

- [P] = task يمكن تنفيذه بالتوازي مع ملفات أخرى
- [Story] label يربط المهمة بقصة المستخدم
- لا توجد test tasks مستقلة لأن spec لم يطلب TDD صريح
- التحقق النهائي مسموح كمهام polish

