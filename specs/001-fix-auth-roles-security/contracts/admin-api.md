# Admin API Contracts

**Base**: `/api/admin`
**Auth**: Bearer token (Supabase JWT) — user must have `role = admin` in `public.users`

---

## POST /api/admin/users

إنشاء مستخدم جديد.

**Request Body**:
```json
{
  "email": "user@example.com",      // required, valid email
  "password": "min8chars",          // required, min 8 chars
  "full_name": "اسم المستخدم",     // required, non-empty
  "role": "manager",                // required, enum: manager | user
  "permissions": ["view_reports"]   // optional, default []
}
```

**Responses**:
- `201` — `{ user: UserProfile }`
- `400` — `{ error: string }` — validation error or Supabase Auth error
- `401` — `{ error: "Unauthorized" }` — missing/invalid token
- `403` — `{ error: "Admin access required" }` — not admin
- `500` — `{ error: string }` — DB error (with rollback)

---

## GET /api/admin/users

قائمة كل المستخدمين.

**Response** `200`:
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "string",
      "full_name": "string",
      "role": "admin | manager | user",
      "permissions": ["string"],
      "is_active": true,
      "created_at": "ISO8601",
      "last_login": "ISO8601 | null"
    }
  ]
}
```

---

## PATCH /api/admin/users/:id

تعديل بيانات مستخدم.

**Request Body** (كل الحقول اختيارية):
```json
{
  "full_name": "string",
  "role": "manager | user",
  "permissions": ["string"],
  "is_active": false,
  "password": "newpassword"
}
```

**Responses**: `200 { user }` | `400` | `401` | `403` | `500`

---

## DELETE /api/admin/users/:id

حذف مستخدم (من Auth + profile).

**Responses**: `200 { success: true }` | `400` | `401` | `403`

---

## GET /api/healthz

فحص صحة الـ server.

**Response** `200`: `{ status: "ok" }`
