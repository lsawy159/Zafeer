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

## Storage Format

ملفات النسخ الاحتياطية مخزّنة في Supabase Storage bucket `backups` كـ:
- Path: `backups/<backup_id>.json.gz`
- Format: gzip-compressed JSON (مرجع: `supabase/functions/automated-backup/index.ts` — `gzipString()` + `storage.upload()`)
- JSON structure: `{ version, created_at, backup_type, triggered_by, table_record_counts, tables: { tableName: row[] } }`

## State Flow

```
BackupRecord.status = 'completed'
  → زر "إرسال بالبريد" يظهر (جميع الأنواع)
  → Modal يفتح
  → user يدخل email
  → POST /send-backup-email { backup_id, recipient_email }
  → Edge Function:
      1. تتحقق من admin role (users.role = 'admin')
      2. تجلب backup_history row → verify status = 'completed'
      3. تُنشئ Signed URL (86400s = 24h expiry) لملف JSON.gz
      4. تُحمّل وتفك ضغط ملف JSON.gz من Storage
      5. تُحوّل كل table array → CSV (UTF-8 BOM، comma، RFC 4180)
      6. تُضغط كل CSVs في ZIP واحد (jszip)
      7. تتحقق من الحجم: ZIP raw > 25MB → return 413 (لا بريد يُرسَل)
      8. ترسل email عبر Resend: HTML RTL + Signed URL في البدي + ZIP كـ attachment
  → toast نجاح / عرض خطأ inline في Modal
```

## No New Tables

لا `email_send_log` — الإرسال لحظي وتسجيله خارج نطاق هذه المرحلة.
