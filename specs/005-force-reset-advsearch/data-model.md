# Data Model: Force Password Reset + AdvancedSearch Refactor

**Branch**: `005-force-reset-advsearch` | **Date**: 2026-05-15

---

## لا تغييرات في قاعدة البيانات

هذه الـ Spec لا تُضيف جداول أو أعمدة أو migrations. كل التغييرات في الـ client-side فقط.

---

## كيانات الـ UI (client-side فقط)

### PasswordResetFormData

حالة نموذج الـ Dialog — client-side فقط، لا تُحفظ في DB.

```ts
interface PasswordResetFormData {
  newPassword: string     // min: 8 chars — تُرسَل للـ API
  confirmPassword: string // تحقق UI فقط — لا تُرسَل للـ API
}
```

**Validation Rules**:
- `newPassword.length >= 8`
- `newPassword === confirmPassword`
- كلا الحقلين مطلوبان

**State Transitions**:
```
idle → dirty (user types) → submitting → success (dialog closes)
                                       → error (dialog stays open, toast error)
```

---

### UpdateUserRequest (موجود — من lib/api-zod)

```ts
// lib/api-client-react/src/generated/api.schemas.ts
interface UpdateUserRequest {
  full_name?: string
  role?: 'manager' | 'user'
  permissions?: string[]
  is_active?: boolean
  password?: string  // minLength: 8 — هذا الحقل فقط يُرسَل في force reset
}
```

عند force reset: `{ password: newPassword }` فقط — باقي الحقول `undefined`.

---

### SearchState (موجود — من useAdvancedSearchFilters)

```ts
// نوع الـ `search` object المُمرَّر للـ sub-components
type SearchState = ReturnType<typeof useAdvancedSearchFilters>
```

لا تغيير في الحقول أو البنية — فقط طريقة تمرير الـ props تتغير.

---

## الـ Entities الموجودة (reference)

### User (public.users)

```ts
interface User {
  id: string           // uuid — يطابق auth.users.id
  email: string
  username?: string
  full_name?: string
  role: 'admin' | 'manager' | 'user'
  is_active: boolean
  permissions: string[]
  created_at: string
  last_login?: string
}
```

**القيد الجديد (UI فقط)**: زر "إعادة تعيين" مخفي/معطّل إذا `user.id === currentAdminId`.
