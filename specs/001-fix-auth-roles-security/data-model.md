# Data Model: إصلاح نظام الأدوار والأمان

## Entities

### User (موجودة في Supabase `public.users`)

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| id | uuid | required | من Supabase Auth |
| email | string | email format | فريد |
| full_name | string | min 1 char | |
| role | enum | admin \| manager \| user | **يجب أن يشمل `admin`** |
| permissions | string[] | subset of known permissions | |
| is_active | boolean | default true | |
| created_at | timestamp | auto | |
| last_login | timestamp | nullable | |

## Role Definitions

| Role | الوصف | يُنشأ عبر |
|------|-------|-----------|
| `admin` | صلاحيات كاملة — إدارة users | Supabase Dashboard أو seed script |
| `manager` | صلاحيات إدارية محدودة | `POST /api/admin/users` (by admin) |
| `user` | صلاحيات عادية | `POST /api/admin/users` (by admin) |

## State Transitions

```
[إنشاء] → is_active: true
[تعطيل] → is_active: false  (PATCH /api/admin/users/:id)
[حذف]   → deleted from auth + profile (DELETE /api/admin/users/:id)
```

## Validation Rules

- `role` في `POST /api/admin/users`: يقبل `manager` أو `user` فقط (admin يُنشأ بطريقة أخرى)
- `email`: يجب أن يكون email صحيح (Zod `.email()`)
- `password`: 8 أحرف على الأقل
- `full_name`: غير فارغ
- الـ rollback: إذا فشل إنشاء profile → حذف auth user تلقائياً (موجود بالفعل)
