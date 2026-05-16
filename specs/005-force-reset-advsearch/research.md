# Research: Force Password Reset + AdvancedSearch Refactor

**Branch**: `005-force-reset-advsearch` | **Date**: 2026-05-15

---

## Q1: كيف يصل الـ Frontend لـ Express API Server؟

**Decision**: Vite dev proxy (`/api → http://localhost:3000`) + auth header injection عبر wrapper hook

**Rationale**:
- `customFetch` في `lib/api-client-react/src/custom-fetch.ts` يستخدم `baseUrl = ''` (فارغ في browser)
- لا يوجد `VITE_API_URL` في `artifacts/zafeer/.env`
- لا يوجد Vite proxy في `vite.config.ts`
- `requireAdmin` middleware يتطلب `Authorization: Bearer <token>` — `customFetch` لا يحقنه حالياً
- **الحل**: إضافة proxy في `vite.config.ts` بدلاً من تعديل `customFetch` (يبقى الـ lib بسيطاً)
- **Auth injection**: wrapper hook في `artifacts/zafeer/src/hooks/useForceResetPassword.ts` يقرأ session من `useAuth()` ويمرر `Authorization` header عبر `options?.request` المدعوم في الـ generated hook

**Alternatives Considered**:
- تعديل `customFetch` لقراءة `import.meta.env.VITE_API_URL` — مرفوض: يربط `lib/` بـ Vite (env-specific coupling)
- تمرير token من كل call site مباشرة — مرفوض: verbosity عالية، خطر نسيان في call sites مستقبلية

---

## Q2: هل `useUpdateAdminUser` (المولّد) يكفي أم نحتاج hook جديدة؟

**Decision**: wrapper hook `useForceResetPassword` في `artifacts/zafeer/src/hooks/`

**Rationale**:
- `useUpdateAdminUser` موجود في `lib/api-client-react/src/generated/api.ts` ويدعم `{ password }` عبر `UpdateUserRequest`
- لكنه لا يحقن auth header تلقائياً
- Wrapper hook يحل المشكلتين: (1) يحقن الـ Authorization header، (2) يوفر واجهة مختصرة `useForceResetPassword(userId)`
- الـ `lib/api-client-react` لا يُعدَّل — يبقى generated-only

**Pattern المقترح**:
```ts
// artifacts/zafeer/src/hooks/useForceResetPassword.ts
export function useForceResetPassword() {
  const { session } = useAuth()
  return useUpdateAdminUser({
    request: {
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }
    }
  })
}
```

---

## Q3: ريفاكتور AdvancedSearch — كيف نمرر `search` لـ FiltersModal؟

**Decision**: تغيير interface الـ `AdvancedSearchFiltersModal` ليستقبل `search: ReturnType<typeof useAdvancedSearchFilters>` كـ prop وحيد

**Rationale**:
- الـ hook return type موجود وكامل — TypeScript يضمن التوافق
- أقل تغيير ممكن: `AdvancedSearch.tsx` يمرر `search={search}` بدل 20+ prop
- Context مرفوض: overhead زائد لمشكلة prop drilling داخل file واحد (parent → child مباشرة)
- لا تغيير في السلوك — refactor بحت

**الـ Props قبل وبعد**:
```
قبل: selectedNationality, setSelectedNationality, selectedCompanyFilter, setSelectedCompanyFilter, ... (20+ prop)
بعد: search (كائن واحد يحتوي كل الـ state والـ handlers)
```

---

## Q4: `<ActiveFilterChips />` — ما واجهته؟

**Decision**: `interface ActiveFilterChipsProps { search: ReturnType<typeof useAdvancedSearchFilters> }`

**Rationale**:
- نفس نمط Q3 — نمرر `search` كاملاً بدل props فردية
- المكون pure rendering — لا state خاصة به
- يُستخرج من سطر 198–372 في `AdvancedSearch.tsx` بدون أي تعديل في المنطق

---

## Q5: هل تحتاج قاعدة البيانات أي تغيير؟

**Decision**: لا — صفر تغييرات في DB

**Rationale**:
- `PATCH /api/admin/users/:id` موجود ويستدعي `supabaseAdmin.auth.admin.updateUserById(id, { password })`
- `UpdateAdminUserBody` في `openapi.yaml` يحتوي `password: string (minLength: 8)` بالفعل
- كائن `PasswordResetDialog` form data هو client-side فقط، لا يُحفظ في DB

---

## Q6: الأمان — هل يكفي منع الأدمن من UI؟

**Decision**: الحماية في الـ UI كافية (API تقبل أي مستخدم بما فيهم الأدمن نفسه)

**Rationale**:
- النظام داخلي + أدمن واحد عادةً → لا نضيف server-side restriction
- الـ UI يخفي/يعطّل الزر للـ current user عبر `user?.id === targetUser.id`
- تعقيد إضافي في الـ API (رفض تعديل حساب المُرسِل) غير مبرر في هذا السياق

---

## ملخص التغييرات المطلوبة

| الملف | نوع التغيير |
|-------|------------|
| `artifacts/zafeer/vite.config.ts` | إضافة proxy `/api → http://localhost:3000` |
| `artifacts/zafeer/src/hooks/useForceResetPassword.ts` | **جديد** — wrapper hook |
| `artifacts/zafeer/src/components/settings/tabs/PasswordResetDialog.tsx` | **جديد** — Dialog component |
| `artifacts/zafeer/src/components/settings/tabs/UsersPermissionsTab.tsx` | إضافة زر + dialog state |
| `artifacts/zafeer/src/pages/advancedSearch/ActiveFilterChips.tsx` | **جديد** — مكون الشرائح |
| `artifacts/zafeer/src/pages/AdvancedSearch.tsx` | حذف chips code + استخدام `<ActiveFilterChips />` |
| `artifacts/zafeer/src/pages/advancedSearch/AdvancedSearchFiltersModal.tsx` | تبديل 20+ props → `search` object |
