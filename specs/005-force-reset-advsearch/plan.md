# Implementation Plan: إعادة تعيين كلمة المرور قسراً + ريفاكتور البحث المتقدم

**Branch**: `005-force-reset-advsearch` | **Date**: 2026-05-15 | **Spec**: [spec.md](spec.md)

---

## Summary

إضافة واجهة "إعادة تعيين كلمة المرور" للأدمن في تبويب المستخدمون والصلاحيات، مع تصحيح اتصال الـ Frontend بـ Express API (Vite proxy + auth header injection). موازياً: ريفاكتور صفحة البحث المتقدم باستخراج `<ActiveFilterChips />` وحل الـ prop drilling في `AdvancedSearchFiltersModal`.

---

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend: React 18 + Vite, Backend: Express + Node.js)  
**Primary Dependencies**: TanStack Query, React Hook Form + Zod, shadcn/ui (Sheet, Dialog, Button), sonner (toasts)  
**Storage**: Supabase (PostgreSQL) — لا تغييرات في الـ schema  
**Testing**: اختبار يدوي (لا test suite موجود حالياً)  
**Target Platform**: Web browser — RTL, Arabic UI  
**Project Type**: Internal web application (monorepo)  
**Performance Goals**: عمليات فورية — لا متطلبات throughput خاصة  
**Constraints**: `pnpm -r run build` + `pnpm run typecheck` يجب أن ينجحا بدون أخطاء  
**Scale/Scope**: مستخدمون داخليون (~5-20 مستخدم)

---

## Constitution Check

*GATE: يجب الاجتياز قبل Phase 0. إعادة التحقق بعد Phase 1.*

| المبدأ | الحالة | الملاحظة |
|--------|--------|----------|
| **I. Supabase-First** | ✅ | Password reset → Express API (service role) — صحيح حسب المبدأ |
| **II. Arabic UX** | ✅ | كل نصوص الـ UI عربية — labels, toasts, errors |
| **III. Type Safety** | ✅ | استخدام `UpdateUserRequest` المولّد + `ReturnType<typeof useAdvancedSearchFilters>` |
| **IV. Security via RLS** | ✅ | `requireAdmin` يحمي الـ endpoint، service role key في الـ backend فقط |
| **V. Monorepo Discipline** | ⚠️ | تعديل `vite.config.ts` (artifact فقط) + `lib/` لا يُعدَّل → `pnpm -r run build` مطلوب |
| **VI. Brand Identity** | ✅ | لا أسماء legacy، branch name يبدأ بـ `005-` |
| **VII. Users vs Employees** | ✅ | الهدف `public.users` (auth users) فقط — employees لا علاقة لهم |

**نتيجة Gate**: مجتاز — لا violations تحتاج توثيق في Complexity Tracking.

---

## Project Structure

### Documentation (this feature)

```text
specs/005-force-reset-advsearch/
├── plan.md              ← هذا الملف
├── research.md          ← Phase 0 مكتمل
├── data-model.md        ← Phase 1 مكتمل
├── quickstart.md        ← Phase 1 مكتمل
└── tasks.md             ← Phase 2 output (speckit-tasks)
```

### Source Code — الملفات المتأثرة

```text
# جديد
artifacts/zafeer/src/hooks/useForceResetPassword.ts
artifacts/zafeer/src/components/settings/tabs/PasswordResetDialog.tsx
artifacts/zafeer/src/pages/advancedSearch/ActiveFilterChips.tsx

# تعديل
artifacts/zafeer/vite.config.ts                                    ← إضافة Vite proxy
artifacts/zafeer/src/components/settings/tabs/UsersPermissionsTab.tsx  ← إضافة زر + dialog state
artifacts/zafeer/src/pages/AdvancedSearch.tsx                      ← استبدال chips code
artifacts/zafeer/src/pages/advancedSearch/AdvancedSearchFiltersModal.tsx  ← تبديل props
```

**Structure Decision**: الـ Feature تخص `artifacts/zafeer` (frontend) فقط. لا تغييرات في `artifacts/api-server` أو `lib/`.

---

## Phase 0 — Research ✅ (مكتمل)

راجع [research.md](research.md) للقرارات الكاملة.

**القرارات الرئيسية**:
1. **Vite proxy**: `/api → http://localhost:3000` في `vite.config.ts` (dev) → لا تعديل على `customFetch`
2. **Auth injection**: wrapper hook `useForceResetPassword` يقرأ session من `useAuth()` + يمرر Bearer token
3. **AdvancedSearch props**: تمرير `search: ReturnType<typeof useAdvancedSearchFilters>` كـ prop وحيد

---

## Phase 1 — Design & Contracts ✅ (مكتمل)

راجع [data-model.md](data-model.md) و [quickstart.md](quickstart.md).

### الـ Contracts (Internal API — موجودة، لا تغيير)

**Endpoint**: `PATCH /api/admin/users/:id`  
**Auth**: `Authorization: Bearer <supabase-jwt>` (admin role required)  
**Request Body** (للـ force reset):
```json
{ "password": "newPassword123" }
```
**Response 200**:
```json
{ "success": true }
```
**Response 400**: `{ "error": "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }` (من Zod validation)  
**Response 403**: `{ "error": "Admin access required" }`

---

## Phase 2 — Implementation Plan

### Task A: إصلاح Vite Proxy (prerequisite)

**الملف**: `artifacts/zafeer/vite.config.ts`  
**التغيير**: إضافة `server.proxy`:
```ts
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
},
```
**الاختبار**: `curl http://localhost:5173/api/healthz` يُعيد `{"status":"ok"}`

---

### Task B: `useForceResetPassword` Hook

**الملف**: `artifacts/zafeer/src/hooks/useForceResetPassword.ts` (جديد)  
**المنطق**:
- يستدعي `useUpdateAdminUser` من `lib/api-client-react`
- يحقن `Authorization: Bearer ${session?.access_token}` عبر `request.headers`
- يُعيد mutation result جاهز للاستخدام

**الاعتماديات**: `useAuth` من `@/contexts/AuthContext`, `useUpdateAdminUser` من `@workspace/api-client-react`

---

### Task C: `PasswordResetDialog` Component

**الملف**: `artifacts/zafeer/src/components/settings/tabs/PasswordResetDialog.tsx` (جديد)  
**Props**:
```ts
interface PasswordResetDialogProps {
  userId: string | null      // null = dialog مغلق
  userName: string           // لعرض "إعادة تعيين: [الاسم]"
  onClose: () => void
}
```
**المنطق**:
- `Dialog` من shadcn/ui (أو `AlertDialog` للتأكيد)
- `react-hook-form` + `zod` للتحقق: `newPassword (min 8)` + `confirmPassword (must match)`
- عند الإرسال: `useForceResetPassword` mutation
- نجاح: `toast.success('تم تعيين كلمة المرور بنجاح')` + `onClose()`
- فشل: `toast.error(error.message)` + dialog يبقى مفتوحاً

---

### Task D: تحديث `UsersPermissionsTab`

**الملف**: `artifacts/zafeer/src/components/settings/tabs/UsersPermissionsTab.tsx`  
**التغييرات**:
1. إضافة `useState<string | null>(null)` → `resetUserId`
2. إضافة `useState<string>('')` → `resetUserName`
3. في عمود الإجراءات: زر "إعادة تعيين" جانب زر "صلاحيات"
   - `disabled={user.id === currentUser?.id}` (حماية ذاتية)
   - `onClick={() => { setResetUserId(user.id); setResetUserName(user.full_name || user.username) }}`
4. إضافة `<PasswordResetDialog userId={resetUserId} userName={resetUserName} onClose={() => setResetUserId(null)} />`

**استيراد**: `{ useAuth }` من `@/contexts/AuthContext`

---

### Task E: استخراج `<ActiveFilterChips />`

**الملف الجديد**: `artifacts/zafeer/src/pages/advancedSearch/ActiveFilterChips.tsx`  
**المنطق**:
- نقل سطر 198–372 من `AdvancedSearch.tsx` كما هو إلى المكون الجديد
- Props: `{ search: ReturnType<typeof useAdvancedSearchFilters>, activeFiltersCount: number }`
- لا تغيير في المنطق أو الـ JSX

**تحديث `AdvancedSearch.tsx`**:
- حذف الكود المنقول (سطر 198–372)
- استبداله بـ `<ActiveFilterChips search={search} activeFiltersCount={activeFiltersCount} />`

---

### Task F: ريفاكتور `AdvancedSearchFiltersModal` Props

**الملف**: `artifacts/zafeer/src/pages/advancedSearch/AdvancedSearchFiltersModal.tsx`  
**التغيير**:
```ts
// قبل
interface AdvancedSearchFiltersModalProps {
  activeTab: TabType
  selectedNationality: string
  setSelectedNationality: (v: string) => void
  // ... 20+ props
}

// بعد
interface AdvancedSearchFiltersModalProps {
  search: ReturnType<typeof useAdvancedSearchFilters>
  activeFiltersCount: number
  onClose: () => void
}
```
- داخل المكون: `const { activeTab, selectedNationality, setSelectedNationality, ... } = search`
- تحديث الاستدعاء في `AdvancedSearch.tsx`: تمرير `search={search}` بدل 20+ prop

---

## Complexity Tracking

> لا violations — لا يوجد محتوى هنا.
