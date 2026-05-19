# Tasks: إصلاح تهنيج تصدير الموظفين

**Input**: Design documents from `specs/011-fix-export-performance/`  
**Branch**: `011-fix-export-performance`  
**File**: `artifacts/zafeer/src/components/import-export/ExportTab.tsx` (ملف وحيد)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: يمكن تنفيذه بالتوازي
- **[Story]**: المستخدم القصة المرتبط بها (US1/US2/US3)

---

## Phase 1: Setup

**Purpose**: لا يوجد — مشروع قائم، ملف واحد، لا حاجة لتهيئة

*يُتخطى — الانتقال مباشرة لـ Phase 2*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: تحضير البنية التحتية التي تعتمد عليها كل الـ user stories — نقل helpers لـ module-level + types جديدة

**⚠️ CRITICAL**: لا يمكن البدء في أي user story قبل اكتمال هذه المرحلة

- [X] T001 تعديل imports: إضافة `useCallback` و `memo` في `artifacts/zafeer/src/components/import-export/ExportTab.tsx` (السطر 1: `import { useState, useEffect, useMemo, useCallback, memo, ReactNode } from 'react'`)

- [X] T002 نقل `STATUS_THRESHOLDS` const من داخل ExportTab إلى module-level (قبل الـ component، بعد imports) في `artifacts/zafeer/src/components/import-export/ExportTab.tsx`

- [X] T003 نقل الـ helper functions الست التالية من داخل ExportTab إلى module-level في `artifacts/zafeer/src/components/import-export/ExportTab.tsx`: `isExpired`, `isExpiringWithin30Days`, `getDaysRemaining`, `getDateTextColor`, `formatDateStatus` — تأتي مباشرة بعد `STATUS_THRESHOLDS`

- [X] T004 إضافة `type EmployeeWithRelations` و `interface EmployeeDisplayData` و `function computeEmployeeDisplayData` في module-level بعد helpers في `artifacts/zafeer/src/components/import-export/ExportTab.tsx` — الكود الكامل في `specs/011-fix-export-performance/plan.md` قسم "الخطوة 3"

**Checkpoint**: البنية التحتية جاهزة — يمكن الآن البدء في user stories

---

## Phase 3: User Story 1 — التبديل السلس بين نوعي التصدير (Priority: P1) 🎯 MVP

**Goal**: تغيير `employeeExportMode` لا يُعيد رسم صفوف/كروت الموظفين — صفر تجمد للمتصفح

**Independent Test**: افتح تبويب التصدير مع 100+ موظف → غيّر نوع التصدير مرات متعددة → المتصفح يستجيب فوراً بدون أي تجمد مرئي

### Implementation for User Story 1

- [X] T005 [US1] إضافة `EmployeeTableRow` كـ `memo` component في module-level بعد `computeEmployeeDisplayData` في `artifacts/zafeer/src/components/import-export/ExportTab.tsx` — الكود الكامل في `specs/011-fix-export-performance/plan.md` قسم "الخطوة 4"

- [X] T006 [US1] إضافة `EmployeeCardItem` كـ `memo` component في module-level بعد `EmployeeTableRow` في `artifacts/zafeer/src/components/import-export/ExportTab.tsx` — الكود الكامل في `specs/011-fix-export-performance/plan.md` قسم "الخطوة 5"

- [X] T007 [US1] إضافة `today` useMemo و `employeeDisplayData` useMemo داخل ExportTab بعد useState declarations في `artifacts/zafeer/src/components/import-export/ExportTab.tsx` — الكود الكامل في `specs/011-fix-export-performance/plan.md` قسم "الخطوة 6"

- [X] T008 [US1] استبدال `<tbody>` في الجدول (سطر ~1301-1415) باستخدام `<EmployeeTableRow>` بدلاً من inline `<tr>` مع IIFEs في `artifacts/zafeer/src/components/import-export/ExportTab.tsx` — الكود في `specs/011-fix-export-performance/plan.md` قسم "الخطوة 7"

- [X] T009 [US1] استبدال mobile grid (سطر ~1437-1570) باستخدام `<EmployeeCardItem>` بدلاً من inline cards مع inline date computations في `artifacts/zafeer/src/components/import-export/ExportTab.tsx` — الكود في `specs/011-fix-export-performance/plan.md` قسم "الخطوة 8"

**Checkpoint**: غيّر نوع التصدير من "أساسي" إلى "شهري" — يجب ألا يكون هناك تجمد مرئي

---

## Phase 4: User Story 2 — التفاعل السلس عند التحديد والإلغاء (Priority: P2)

**Goal**: تحديد موظف فردي يُعيد رسم صفه فقط — لا تأثير على باقي القائمة

**Independent Test**: حدد موظفاً واحداً → أيقونة التحديد تتغير فوراً → باقي الصفوف لا تتأثر

### Implementation for User Story 2

- [X] T010 [US2] إضافة `handleToggleEmployee` كـ `useCallback` داخل ExportTab في `artifacts/zafeer/src/components/import-export/ExportTab.tsx` — يستخدم functional state update بدلاً من reference capture (الكود في `specs/011-fix-export-performance/plan.md` قسم "الخطوة 6")

  > **ملاحظة**: إذا كانت T008/T009 تستخدمان `toggleEmployeeSelection` بالفعل بدلاً من `handleToggleEmployee`، بدّل الـ prop في `EmployeeTableRow` + `EmployeeCardItem` ليستخدم `handleToggleEmployee` الجديدة

**Checkpoint**: اختبر تحديد عدة موظفين متتاليين — كل نقرة تُستجاب فوراً بدون تأخير مع قائمة 200+ موظف

---

## Phase 5: User Story 3 — أداء مستقر مع الفلاتر (Priority: P3)

**Goal**: تغيير فلاتر البحث/الشركة/المشروع يُعيد حساب البيانات للموظفين المصفاة فقط

**Independent Test**: أدخل نصاً في حقل البحث تكراراً → القائمة تتصفى سريعاً، حسابات التاريخ لا تُعاد إلا للموظفين الجدد في النتيجة

### Implementation for User Story 3

- [X] T011 [US3] تحقق أن `employeeDisplayData` useMemo مربوط بـ `[filteredEmployees, today]` فقط في `artifacts/zafeer/src/components/import-export/ExportTab.tsx` — إذا كانت T007 أنجزت هذا بشكل صحيح، هذه مجرد verification لا تعديل

  > **تنبيه**: `today` stable (لا يتغير) → `employeeDisplayData` يُعاد حسابه فقط لما `filteredEmployees` تتغير — هذا السلوك الصحيح

**Checkpoint**: غيّر نص البحث بسرعة → لا تجمد، البيانات المحسوبة تُستخدم من الـ cache للموظفين الثابتين في النتيجة

---

## Phase 6: Polish & Cleanup

**Purpose**: حذف الكود القديم + التحقق النهائي

- [X] T012 حذف النسخ القديمة من داخل ExportTab من `artifacts/zafeer/src/components/import-export/ExportTab.tsx`: `STATUS_THRESHOLDS`, `isExpired`, `isExpiringWithin30Days`, `getDaysRemaining`, `getDateTextColor`, `formatDateStatus` — بعد التأكد أن الـ typecheck ناجح

- [X] T013 إبقاء `calculateAvailableSlots` داخل ExportTab (تُستخدم في company filters — ليست helper بحتة) في `artifacts/zafeer/src/components/import-export/ExportTab.tsx` — لا تعديل مطلوب لهذه الدالة

- [X] T014 [P] تشغيل `pnpm typecheck` من `artifacts/zafeer/` والتأكد من صفر أخطاء TypeScript

- [ ] T015 Manual browser test: افتح `/import-export` → تبويب "تصدير" → غيّر نوع التصدير 5 مرات بسرعة → تحقق لا تجمد → جرب التصدير الفعلي لـ "أساسي" و"شهري" → تحقق ملف Excel صحيح

- [X] T016 [FR-005] إضافة `useIsDesktop` hook بسيط واستبدال CSS `hidden lg:block` / `lg:hidden` بـ conditional rendering في `artifacts/zafeer/src/components/import-export/ExportTab.tsx`:
  ```typescript
  // داخل ExportTab (أو في ملف hook منفصل):
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  ```
  ثم استبدل الـ class `hidden lg:block` بـ `{isDesktop && <table>...</table>}` و`{!isDesktop && <div className="space-y-3">...</div>}` — يُنجز FR-005 + SC-005

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: T001 → T002 → T003 → T004 (ترتيب صارم، ملف واحد)
- **US1 (Phase 3)**: يبدأ بعد Phase 2 — T005 → T006 → T007 → T008 → T009
- **US2 (Phase 4)**: يبدأ بعد T008/T009 — T010 يُضيف useCallback ويستبدل الـ prop
- **US3 (Phase 5)**: T011 verification — لا تعديل فعلي إذا تمت T007 بشكل صحيح
- **Polish (Phase 6)**: بعد كل الـ user stories — T012 → T013 → T014 → T015

### User Story Dependencies

- **US1 (P1)**: يعتمد على Phase 2 (foundational) — الأهم، يجب أولاً
- **US2 (P2)**: يعتمد على US1 (نفس الـ memo components) — T010 يُكمل ما بدأه US1
- **US3 (P3)**: verification فقط — يعتمد على US1 بشكل طبيعي

### Parallel Opportunities

هذا الـ spec ملف واحد — معظم التسلسل إلزامي. لكن:
- T005 و T006 (EmployeeTableRow + EmployeeCardItem) يمكن كتابتهما بالتوازي إذا كان هناك مطوران يعملان على sections مختلفة من الملف

---

## Parallel Example: User Story 1

```text
# بعد اكتمال Phase 2، يمكن بدء:
T005: EmployeeTableRow memo component
T006: EmployeeCardItem memo component
# (sections مختلفة، لا تعارض)

# ثم بعد T005+T006+T007:
T008: update table rendering   → يعتمد على T005
T009: update card rendering    → يعتمد على T006
```

---

## Implementation Strategy

### MVP First (User Story 1 فقط)

1. أكمل Phase 2: Foundational (T001-T004)
2. أكمل Phase 3: US1 (T005-T009)
3. **STOP & VALIDATE**: جرّب التبديل بين نوعي التصدير — يجب أن يكون سلساً
4. إذا نجح → تابع US2 و US3

### Incremental Delivery

1. Phase 2 → Phase 3 → اختبر US1 → **الـ freeze اختفى (MVP)**
2. أضف T010 (useCallback) → اختبر US2 → تحديد الصفوف أسرع
3. تحقق T011 → US3 تلقائياً مُصلَح
4. Polish: T012-T015

---

## Notes

- ملف واحد فقط — كل الـ tasks في `artifacts/zafeer/src/components/import-export/ExportTab.tsx`
- الكود الكامل لكل خطوة موجود في `specs/011-fix-export-performance/plan.md`
- لا مكتبات جديدة — `memo` و `useCallback` موجودان في React
- لا تغييرات وظيفية — نفس بيانات التصدير، نفس الفلاتر، نفس منطق الـ DB queries
- الأثر: ~3200 عملية per render → 0 عمليات (memo skip) عند تغيير نوع التصدير
