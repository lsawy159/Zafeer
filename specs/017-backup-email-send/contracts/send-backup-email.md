# Contract: Edge Function `send-backup-email`

**Type**: Supabase Edge Function (Deno)  
**Path**: `supabase/functions/send-backup-email/index.ts`

## Request

```
POST /functions/v1/send-backup-email
Authorization: Bearer <user-jwt>
Content-Type: application/json
```

### Body

```typescript
{
  backup_id: string      // UUID — must exist in backup_history with status='completed'
  recipient_email: string // valid email address
}
```

### Validation Rules

- `backup_id`: required, must be valid UUID, must reference an existing `completed` backup
- `recipient_email`: required, must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

## Response

### Success (200)

```json
{
  "success": true,
  "message": "تم إرسال النسخة الاحتياطية بنجاح"
}
```

### Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| 400 | Missing/invalid fields | `{ "error": "بيانات غير صالحة: ..." }` |
| 403 | Non-admin user | `{ "error": "Forbidden: admin role required" }` |
| 404 | backup_id not found or not completed | `{ "error": "النسخة الاحتياطية غير موجودة أو لم تكتمل بعد" }` |
| 500 | Resend API failure / Storage error | `{ "error": "فشل إرسال البريد: ..." }` |

## Authorization

- Caller MUST be authenticated (valid Supabase JWT)
- Caller's `users.role` MUST be `'admin'` — enforced server-side via `users` table lookup

## Email Contract

### From
`noreply@<configured-domain>` (from `RESEND_FROM_EMAIL` env var)

### To
`recipient_email` (from request body)

### Subject
`نسخة احتياطية — زفير | <date>`

### Body
HTML email containing:
- اسم النظام: **زفير**
- تاريخ النسخة الاحتياطية
- نوع النسخة (كاملة / تلقائية / Snapshot وقائي)
- حجم الملف
- رابط تحميل (Signed URL — صالح 24 ساعة)
- تحذير: "هذا الرابط صالح لمدة 24 ساعة فقط"

## Environment Variables Required

```
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@zafeer.app
```
