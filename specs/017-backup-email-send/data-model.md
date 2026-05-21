# Data Model: إرسال النسخة الاحتياطية بالبريد

**Branch**: `017-backup-email-send` | **Date**: 2026-05-21

## Schema Changes

**لا تغييرات في قاعدة البيانات مطلوبة.**

الميزة عملية لحظية: frontend → Edge Function → Resend API → email delivered.
لا حالة تُحفظ ولا جداول تُضاف.

## Entities (Read-Only)

### BackupRecord (موجود — `backup_history`)

الحقول المستخدمة في هذه الميزة:

| Field | Type | Usage |
|-------|------|-------|
| `id` | `uuid` | معرف النسخة المُرسَلة |
| `file_path` | `text` | مسار الملف في Supabase Storage لإنشاء Signed URL |
| `status` | `text` | يُتحقق منه: الإرسال مسموح فقط إذا `completed` |
| `backup_type` | `text` | يُذكر في نص البريد للتوضيح |
| `file_size` | `int8` | يُذكر في نص البريد |
| `completed_at` | `timestamptz` | يُذكر في نص البريد |

## State Flow

```
BackupRecord.status = 'completed'
  → زر "إرسال بالبريد" يظهر
  → Modal يفتح
  → user يدخل email
  → POST /send-backup-email { backup_id, recipient_email }
  → Edge Function:
      1. تتحقق من admin role
      2. تجلب backup_history row
      3. تُنشئ Signed URL (24h expiry)
      4. ترسل email عبر Resend
  → toast نجاح/فشل
```

## No New Tables

لا `email_send_log` — الإرسال لحظي وتسجيله خارج نطاق هذه المرحلة.
