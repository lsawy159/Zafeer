# Tasks: إدارة المستخدمين

**Input**: Design documents from `/specs/006-user-management/`
**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅

**Organization**: Tasks grouped by user story — كل story قابلة للتنفيذ والاختبار بشكل مستقل.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: يمكن تشغيله بالتوازي (ملفات مختلفة، لا اعتماديات معلّقة)
- **[Story]**: القصة التي تخدمها المهمة (US1/US2/US3)

---

## Phase 1: Setup

**Purpose**: لا setup جديد — Vite proxy موجود (Spec 005). لا backend جديد. Skip to Phase 2.

*لا مهام — skip to Phase 2.*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wrapper hooks تحقن `Authorization: Bearer <token>` — prerequisite لجميع الـ dialogs.

**⚠️ CRITICAL**: لا يمكن تنفيذ أي user story قبل اكتمال هذه المرحلة.

- [x] T001 [P] أنشئ `artifacts/zafeer/src/hooks/useCreateUser.ts` — wrapper حول `useCreateAdminUser` يحقن `Authorization: Bearer ${session?.access_token}` من `useAuth()`. نفس نمط `useForceResetPassword.ts` تماماً.
- [x] T002 [P] أنشئ `artifacts/zafeer/src/hooks/useUpdateUserProfile.ts` — wrapper حول `useUpdateAdminUser` يحقن `Authorization: Bearer ${session?.access_token}` من `useAuth()`. يُستخدم لتعديل full_name/role/is_active (مختلف عن useForceResetPassword المخصص لكلمة المرور).

**Checkpoint**: `T001` + `T002` مكتملان — Foundation جاهز.

---

## Phase 3: User Story 1 — إنشاء مستخدم جديد (Priority: P1) 🎯 MVP

**Goal**: الأدمن ينشئ حساب مستخدم جديد من واجهة الإعدادات بدون الحاجة لأي لوحة خارجية.

**Independent Test**: سجّل دخول كأدمن ← الإعدادات ← المستخدمون والصلاحيات ← اضغط "إضافة مستخدم" ← أدخل البيانات ← تحقق من toast النجاح + ظهور المستخدم في القائمة فوراً.

### Implementation for User Story 1

- [x] T003 [US1] أنشئ `artifacts/zafeer/src/components/settings/tabs/CreateUserDialog.tsx` — Dialog يحتوي حقول: `full_name` (required)، `email` (required، email format)، `password` (min 8)، `confirmPassword` (يطابق password)، `role` (Select: admin/manager/user، default: user). يستدعي `useCreateUser` عند الإرسال. عند النجاح: `queryClient.invalidateQueries({ queryKey: ['users'] })` + toast "تم إنشاء الحساب بنجاح" + يُغلق. عند الخطأ: toast الرسالة من API. layout: `dir="rtl"`.
- [x] T004 [US1] حدّث `artifacts/zafeer/src/components/settings/tabs/UsersPermissionsTab.tsx` — أضف state `showCreateDialog: boolean`، زر "إضافة مستخدم" (مع icon `UserPlus`) في header الجدول بجوار "إدارة الأدوار"، استدعاء `<CreateUserDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} />`.

**Checkpoint**: US1 مكتمل ومختبر يدوياً — MVP قابل للشحن.

---

## Phase 4: User Story 2 — تعديل بيانات مستخدم (Priority: P2)

**Goal**: الأدمن يعدّل الاسم الكامل والدور لأي مستخدم آخر.

**Independent Test**: اضغط "تعديل" على مستخدم ← غيّر الاسم أو الدور ← احفظ ← تحقق من تحديث القائمة.

### Implementation for User Story 2

- [x] T005 [P] [US2] أنشئ `artifacts/zafeer/src/components/settings/tabs/EditUserDialog.tsx` — Dialog يحتوي حقول: `full_name` (required)، `role` (Select: admin/manager/user). يأخذ props: `{ userId: string | null, userName: string, currentFullName: string, currentRole: string, onClose: () => void }`. يستدعي `useUpdateUserProfile` عند الإرسال. عند النجاح: `queryClient.invalidateQueries({ queryKey: ['users'] })` + toast "تم التحديث بنجاح" + يُغلق. layout: `dir="rtl"`.
- [x] T006 [US2] حدّث `artifacts/zafeer/src/components/settings/tabs/UsersPermissionsTab.tsx` — أضف state `(editUserId, editUserName, editUserFullName, editUserRole)`، زر "تعديل" (icon `Pencil`) في عمود الإجراءات `disabled` إذا `user.id === currentUser?.id`، استدعاء `<EditUserDialog userId={editUserId} userName={editUserName} currentFullName={editUserFullName} currentRole={editUserRole} onClose={() => setEditUserId(null)} />`.

**Checkpoint**: US2 مكتمل — تعديل الاسم والدور يعمل بدون تغيير باقي الوظائف.

---

## Phase 5: User Story 3 — تفعيل/تعطيل مستخدم (Priority: P3)

**Goal**: الأدمن يوقف وصول مستخدم أو يعيد تفعيله بنقرة واحدة.

**Independent Test**: اضغط "تعطيل" على مستخدم ← تحقق من تغيير badge + منع الدخول. اضغط "تفعيل" ← تحقق من إعادة الوصول.

### Implementation for User Story 3

- [x] T007 [US3] حدّث `artifacts/zafeer/src/components/settings/tabs/UsersPermissionsTab.tsx` — أضف زر "تعطيل"/"تفعيل" (toggle) في عمود الإجراءات: يستدعي `useUpdateUserProfile().mutate({ id: user.id, data: { is_active: !user.is_active } })` ثم `queryClient.invalidateQueries({ queryKey: ['users'] })`. `disabled` إذا `user.id === currentUser?.id`. toast "تم تعطيل الحساب" / "تم تفعيل الحساب". لا dialog — نقرة مباشرة مع toast تأكيد.

**Checkpoint**: US3 مكتمل — كل وظائف إدارة المستخدمين تعمل.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T008 [P] شغّل `pnpm run typecheck` من جذر المشروع — يجب أن ينجح بصفر أخطاء
- [x] T009 [P] شغّل `pnpm -r run build` من جذر المشروع — يجب أن ينجح (Constitution Principle V)
- [ ] T010 نفّذ سيناريوهات [quickstart.md](quickstart.md) بالكامل — create + edit + activate/deactivate

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 2 (Foundation)
    └── T001 [P] (useCreateUser) + T002 [P] (useUpdateUserProfile)
            ↓ (كلاهما مطلوبان قبل أي story)
Phase 3 (US1) — depends on T001
    └── T003 (CreateUserDialog) → T004 (UsersPermissionsTab: create button)

Phase 4 (US2) — depends on T002، يُفضَّل بعد US1 (نفس الملف)
    └── T005 [P] (EditUserDialog) → T006 (UsersPermissionsTab: edit button)

Phase 5 (US3) — depends on T002، يجب بعد US1+US2 (نفس الملف)
    └── T007 (UsersPermissionsTab: activate/deactivate button)

Phase 6 (Polish) — بعد اكتمال كل الـ stories
```

### User Story Dependencies

- **US1 (P1)**: تعتمد على T001 (useCreateUser) فقط
- **US2 (P2)**: تعتمد على T002 (useUpdateUserProfile)؛ يُفضَّل بعد US1 (نفس ملف Tab)
- **US3 (P3)**: تعتمد على T002 (useUpdateUserProfile)؛ يجب بعد US1+US2 (نفس ملف Tab)

### Parallel Opportunities

- **T001 + T002**: مختلف تماماً — يُشغَّلان معاً
- **T003 + T005**: بعد Foundation، ملفات مختلفة — يُشغَّلان معاً
- **T008 + T009**: بعد كل التنفيذ — يُشغَّلان معاً

---

## Parallel Example

```bash
# Foundation — يُشغَّلان معاً:
Task T001: "Create useCreateUser.ts in artifacts/zafeer/src/hooks/"
Task T002: "Create useUpdateUserProfile.ts in artifacts/zafeer/src/hooks/"

# بعد Foundation — يُشغَّلان معاً:
Task T003: "Create CreateUserDialog.tsx in artifacts/zafeer/src/components/settings/tabs/"
Task T005: "Create EditUserDialog.tsx in artifacts/zafeer/src/components/settings/tabs/"
```

---

## Implementation Strategy

### MVP First (US1 فقط)

1. أكمل Phase 2: Foundation (T001 + T002)
2. أكمل Phase 3: US1 (T003 + T004)
3. **توقف وتحقق**: اختبر إنشاء مستخدم جديد يدوياً
4. شحن MVP — الأدمن يقدر يضيف مستخدمين الآن

### Incremental Delivery

1. Foundation → جاهز
2. US1 → تحقق → (شحن MVP)
3. US2 → تحقق → تعديل البيانات يعمل
4. US3 → تحقق → تفعيل/تعطيل يعمل
5. Polish → typecheck + build → merge

---

## Notes

- لا تعديلات في `artifacts/api-server/` أو `lib/` — frontend فقط
- T004 و T006 و T007 يعدّلان `UsersPermissionsTab.tsx` معاً — لا تشغّلهما بالتوازي (نفس الملف)
- بعد T007: `UsersPermissionsTab.tsx` يجب أن يمرر `queryClient` صحيح — استخدم `useQueryClient()` من `@tanstack/react-query`
- `useUpdateUserProfile` مختلف عن `useForceResetPassword` — الأول للبيانات، الثاني لكلمة المرور فقط
