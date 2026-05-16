# Data Model: إدارة المستخدمين

**Branch**: `006-user-management` | **Date**: 2026-05-16

---

## Entity: User

الجدول موجود بالفعل: `public.users` — لا تغييرات في الـ schema.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | `uuid` | ✅ | Primary key — يُولَّد تلقائياً من Supabase Auth |
| `email` | `string` | ✅ | فريد — لا يمكن تعديله بعد الإنشاء |
| `full_name` | `string` | ✅ | الاسم الكامل — قابل للتعديل |
| `role` | `'admin' \| 'manager' \| 'user'` | ✅ | الدور — قابل للتعديل (إلا الأدمن على نفسه) |
| `permissions` | `string[]` | ❌ | JSONB flat array — اختياري |
| `is_active` | `boolean` | ✅ | الحالة — قابل للتعديل (إلا الأدمن على نفسه) |
| `created_at` | `timestamptz` | ✅ | يُولَّد تلقائياً |
| `last_login` | `timestamptz` | ❌ | يُحدَّث عند الدخول |

## Create Request (`CreateUserRequest`)

```typescript
interface CreateUserRequest {
  email: string           // required, unique
  password: string        // required, min 8 chars
  full_name: string       // required, min 1 char
  role?: 'admin' | 'manager' | 'user'  // default: 'user'
  permissions?: string[]
}
```

## Update Request (`UpdateUserRequest`)

```typescript
interface UpdateUserRequest {
  full_name?: string      // min 1 char if provided
  role?: 'admin' | 'manager' | 'user'
  is_active?: boolean
  permissions?: string[]
  password?: string       // min 8 chars — handled by PasswordResetDialog, not EditUserDialog
}
```

## Validation Rules (Frontend — Zod)

### CreateUserDialog
```
email: string().email("بريد إلكتروني غير صالح")
password: string().min(8, "كلمة المرور 8 أحرف على الأقل")
confirmPassword: string() — must match password (Zod refine)
full_name: string().min(1, "الاسم مطلوب")
role: enum(['admin','manager','user']).default('user')
```

### EditUserDialog
```
full_name: string().min(1, "الاسم مطلوب")
role: enum(['admin','manager','user'])
is_active: boolean
```

## State Transitions

```
مستخدم جديد
    └── is_active: true (إنشاء)
            ├── is_active: false (تعطيل)
            │       └── is_active: true (إعادة تفعيل)
            └── role: يتغير بأمر الأدمن
```
