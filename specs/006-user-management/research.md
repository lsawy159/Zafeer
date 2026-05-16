# Research: إدارة المستخدمين

**Branch**: `006-user-management` | **Date**: 2026-05-16

---

## D-001: Auth Header Injection Pattern

**Decision**: Wrapper hooks تحقن `Authorization: Bearer <token>` من `useAuth().session` — نفس نمط `useForceResetPassword`

**Rationale**: `customFetch` في المتصفح لا يعرف الـ base URL ولا يضيف auth header تلقائياً. الـ Vite proxy يحل مشكلة الـ URL. الـ hook يحل مشكلة الـ auth. هذا النمط تم تبنّيه في Spec 005 ويجب الالتزام به.

**Alternatives considered**:
- تعديل `customFetch` مباشرة ← مرفوض (Constitution Principle V — `lib/` لا تُعدَّل يدوياً)
- استخدام axios مع interceptor ← غير ضروري، يضيف dependency

---

## D-002: Cache Invalidation بعد Mutations

**Decision**: استخدام `queryClient.invalidateQueries({ queryKey: ['users'] })` بعد كل mutation ناجح (create, update)

**Rationale**: `UsersPermissionsTab` تستخدم `useQuery({ queryKey: ['users'], ... })` مع Supabase direct. بعد إنشاء/تعديل مستخدم عبر Express API، يجب إخبار React Query بتحديث البيانات.

**Alternatives considered**:
- تبديل القراءة لـ `useListAdminUsers` ← يكسر نمط Constitution I (domain reads من Supabase مباشرة)
- Manual state update ← هش، يسبب sync مشاكل

---

## D-003: نطاق تعديل المستخدم (Edit Scope)

**Decision**: `EditUserDialog` يعدّل `full_name` + `role` + `is_active` فقط. كلمة المرور تبقى في `PasswordResetDialog` المنفصل (Spec 005)

**Rationale**: فصل المسؤوليات — تغيير كلمة المرور عملية أمنية مستقلة بتأكيد مزدوج. تعديل البيانات عملية إدارية بسيطة.

**Alternatives considered**:
- دمج كل التعديلات في dialog واحد ← مرفوض، يجعل الـ UX أكثر تعقيداً وأقل أماناً

---

## D-004: حماية الأدمن من الإقفال العرضي

**Decision**: زرا "تعديل" و"تفعيل/تعطيل" `disabled` إذا `user.id === currentUser?.id` — نفس منطق `PasswordResetDialog`

**Rationale**: الأدمن لا يجب أن يغيّر دوره أو يعطّل نفسه عن طريق الواجهة. هذا يحمي من الأخطاء غير المقصودة.

---

## D-005: دور المستخدم الافتراضي عند الإنشاء

**Decision**: الدور الافتراضي = `user` (أقل صلاحية)

**Rationale**: مبدأ least privilege — الأدمن يرفع الصلاحيات يدوياً إذا لزم.

---

## D-006: No Delete UI

**Decision**: لا زر حذف نهائي في هذا الـ Spec — التعطيل (`is_active = false`) كافٍ

**Rationale**: الحذف لا رجعة منه. التعطيل يحفظ السجل للأرشفة ويمنع الوصول. مطابق لمتطلبات US3 من الـ spec.
