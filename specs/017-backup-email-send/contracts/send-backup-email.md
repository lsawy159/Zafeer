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
  backup_id: string       // UUID — must exist in backup_history with status='completed'
  recipient_email: string // valid email address
}
```

### Validation Rules

- `backup_id`: required, valid UUID, references `completed` backup (all types: full/scheduled/pre-restore-snapshot)
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
| 403 | Non-admin user | `{ "error": "صلاحية المدير مطلوبة" }` |
| 404 | backup_id not found or not completed | `{ "error": "النسخة الاحتياطية غير موجودة أو لم تكتمل بعد" }` |
| 413 | ZIP attachment exceeds 25MB | `{ "error": "حجم الملف كبير جداً للإرسال كمرفق، حاول تحميله يدوياً" }` |
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
`نسخة احتياطية — زفير | <date>` — التاريخ بصيغة `dd/MM/yyyy` (Principle II)

### Body
HTML email — يجب أن يحتوي على `<html dir="rtl" lang="ar">`:
- اسم النظام: **زفير**
- تاريخ النسخة الاحتياطية
- نوع النسخة (كاملة / تلقائية / Snapshot وقائي)
- حجم الملف
- رابط تحميل JSON (Signed URL — صالح 24 ساعة)
- تحذير: "هذا الرابط صالح لمدة 24 ساعة فقط"

### Attachment
- `filename`: `backup-<date>-<backup_id_short>.zip` — `backup_id_short` = first 8 characters of UUID, `date` = `YYYY-MM-DD`
- `content_type`: `application/zip`
- `content`: ZIP file (base64) — one CSV per table (e.g. `employees.csv`, `companies.csv`)
- CSV encoding: UTF-8 with BOM (`﻿`), comma delimiter, RFC 4180 quoting
- Max size: **25MB raw ZIP** (before base64 encoding) — if exceeded, return 413, no email sent

## Environment Variables Required

```
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@zafeer.app
```
