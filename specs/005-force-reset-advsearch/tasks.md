# Tasks: إعادة تعيين كلمة المرور قسراً + ريفاكتور البحث المتقدم

**Input**: Design documents from `/specs/005-force-reset-advsearch/`
**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅

**Organization**: Tasks grouped by user story — كل story قابلة للتنفيذ والاختبار بشكل مستقل.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: يمكن تشغيله بالتوازي (ملفات مختلفة، لا اعتماديات معلّقة)
- **[Story]**: القصة التي تخدمها المهمة (US1/US2/US3)

---

## Phase 1: Setup

**Purpose**: لا setup جديد — المشروع موجود ومُهيأ. المرحلة تُدرج للوضوح فقط.

*لا مهام — skip to Phase 2.*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: إصلاح اتصال Frontend بـ Express API — prerequisite لـ US1 بالكامل.

**⚠️ CRITICAL**: US1 لا يمكن تنفيذه قبل اكتمال هذه المرحلة.

- [x] T001 أضف Vite dev proxy في `artifacts/zafeer/vite.config.ts` — route `/api → http://localhost:3000` داخل `server.proxy`
- [x] T002 أنشئ `artifacts/zafeer/src/hooks/useForceResetPassword.ts` — wrapper حول `useUpdateAdminUser` يحقن `Authorization: Bearer ${session?.access_token}` من `useAuth()`

**Checkpoint**: `curl http://localhost:5173/api/healthz` يُعيد `{"status":"ok"}` — Foundation جاهز.

---

## Phase 3: User Story 1 — إعادة تعيين كلمة المرور (Priority: P1) 🎯 MVP

**Goal**: الأدمن يعيد تعيين كلمة مرور أي مستخدم آخر عبر Dialog في تبويب المستخدمين.

**Independent Test**: سجّل دخول كأدمن ← الإعدادات ← المستخدمون والصلاحيات ← اضغط "إعادة تعيين" في صف مستخدم آخر ← أدخل كلمة مرور جديدة ← تحقق من toast النجاح وإمكانية الدخول بالكلمة الجديدة.

### Implementation for User Story 1

- [x] T003 [US1] أنشئ `artifacts/zafeer/src/components/settings/tabs/PasswordResetDialog.tsx` — Dialog يحتوي حقلَي `newPassword` + `confirmPassword` مع Zod validation (`min 8` + `match`)، يستدعي `useForceResetPassword` عند الإرسال، toast نجاح/خطأ، يُغلق عند النجاح
- [x] T004 [US1] حدّث `artifacts/zafeer/src/components/settings/tabs/UsersPermissionsTab.tsx` — أضف state `(resetUserId, resetUserName)`، زر "إعادة تعيين" في عمود الإجراءات (`disabled` إذا `user.id === currentUser?.id`)، استدعاء `<PasswordResetDialog />`

**Checkpoint**: US1 مكتمل ومختبر يدوياً — MVP قابل للشحن.

---

## Phase 4: User Story 2 — استخراج مكون شرائح الفلاتر (Priority: P2)

**Goal**: `<ActiveFilterChips />` مكون مستقل يخفف `AdvancedSearch.tsx` بمقدار ~150 سطر.

**Independent Test**: افتح البحث المتقدم ← طبّق فلاتر متعددة ← تحقق من ظهور الشرائح وعمل زر X على كل منها.

### Implementation for User Story 2

- [x] T005 [US2] أنشئ `artifacts/zafeer/src/pages/advancedSearch/ActiveFilterChips.tsx` — انقل سطر 198–372 من `AdvancedSearch.tsx` كما هو، props: `{ search: ReturnType<typeof useAdvancedSearchFilters>, activeFiltersCount: number }`
- [x] T006 [US2] حدّث `artifacts/zafeer/src/pages/AdvancedSearch.tsx` — احذف سطر 198–372 واستبدله بـ `<ActiveFilterChips search={search} activeFiltersCount={activeFiltersCount} />`

**Checkpoint**: US2 مكتمل — `AdvancedSearch.tsx` أقصر بـ 150+ سطر، وظيفة الشرائح بدون تغيير.

---

## Phase 5: User Story 3 — ريفاكتور props الـ FiltersModal (Priority: P3)

**Goal**: `AdvancedSearchFiltersModal` يستقبل `search` object واحد بدل 20+ prop فردي.

**Independent Test**: افتح modal الفلاتر ← غيّر أي فلتر ← تحقق من تطبيقه فوراً. احفظ بحثاً ← حمّله ← تحقق من استعادة الفلاتر.

### Implementation for User Story 3

- [x] T007 [US3] حدّث interface الـ props في `artifacts/zafeer/src/pages/advancedSearch/AdvancedSearchFiltersModal.tsx` — استبدل 20+ prop بـ `{ search: ReturnType<typeof useAdvancedSearchFilters>, activeFiltersCount: number, onClose: () => void }`؛ أضف destructuring داخل المكون: `const { activeTab, selectedNationality, ... } = search`
- [x] T008 [US3] حدّث استدعاء `<AdvancedSearchFiltersModal />` في `artifacts/zafeer/src/pages/AdvancedSearch.tsx` — مرّر `search={search} activeFiltersCount={activeFiltersCount} onClose={() => search.setShowFiltersModal(false)}` بدل الـ props الفردية

**Checkpoint**: US3 مكتمل — `AdvancedSearchFiltersModal` ≤5 props، كل وظائف البحث تعمل بدون تغيير.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T009 [P] شغّل `pnpm run typecheck` من جذر المشروع — يجب أن ينجح بصفر أخطاء
- [x] T010 [P] شغّل `pnpm -r run build` من جذر المشروع — يجب أن ينجح (Constitution Principle V)
- [x] T011 نفّذ سيناريوهات [quickstart.md](quickstart.md) بالكامل — Vite proxy + force reset + advanced search

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 2 (Foundation)
    └── T001 (Vite proxy) → T002 (useForceResetPassword hook)
            ↓
Phase 3 (US1) — depends on T001 + T002
    └── T003 (PasswordResetDialog) → T004 (UsersPermissionsTab update)

Phase 4 (US2) — مستقل تماماً عن Foundation
    └── T005 (ActiveFilterChips) → T006 (AdvancedSearch update)

Phase 5 (US3) — مستقل عن Foundation، يُفضَّل بعد US2
    └── T007 (FiltersModal refactor) → T008 (AdvancedSearch update)

Phase 6 (Polish) — بعد اكتمال كل الـ stories المطلوبة
```

### User Story Dependencies

- **US1 (P1)**: تعتمد على T001+T002 (Foundation) — لا تعتمد على US2/US3
- **US2 (P2)**: مستقلة تماماً — يمكن تنفيذها قبل أو بعد أو موازياً مع US1
- **US3 (P3)**: يُفضَّل بعد US2 (تعدّل نفس ملف `AdvancedSearch.tsx`)، لكن لا اعتمادية صارمة

### Parallel Opportunities

- **T001 + T005**: يمكن تشغيلهما معاً (ملفات مختلفة تماماً)
- **T003 + T005**: بعد T002، يمكن تشغيلهما معاً
- **T009 + T010**: بعد اكتمال كل التنفيذ، يُشغَّلان معاً

---

## Parallel Example

```bash
# بعد اكتمال Foundation (T001+T002):
# يمكن تشغيل هذه معاً:
Task T003: "Create PasswordResetDialog in artifacts/zafeer/src/components/settings/tabs/"
Task T005: "Create ActiveFilterChips in artifacts/zafeer/src/pages/advancedSearch/"
```

---

## Implementation Strategy

### MVP First (US1 فقط)

1. أكمل Phase 2: Foundation (T001 + T002)
2. أكمل Phase 3: US1 (T003 + T004)
3. **توقف وتحقق**: اختبر force password reset يدوياً
4. شحن MVP — الأدمن يقدر يعيد تعيين كلمات المرور الآن

### Incremental Delivery

1. Foundation → جاهز
2. US1 → تحقق → (شحن MVP)
3. US2 → تحقق → AdvancedSearch أخف
4. US3 → تحقق → prop drilling مُصلح بالكامل
5. Polish → typecheck + build → merge

---

## Notes

- لا تعديلات في `artifacts/api-server/` أو `lib/` — frontend فقط
- T007 و T008 يعدّلان `AdvancedSearch.tsx` معاً — لا تشغّلهما بالتوازي (نفس الملف)
- بعد T008: `<AdvancedSearchFiltersModal />` في `AdvancedSearch.tsx` يجب أن يمرر `search` بدل الـ props المنفردة التي كانت موجودة قبل T005+T006 أيضاً — راجع الكود الفعلي بعد تطبيق T006 قبل بدء T008
