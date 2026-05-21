# Research: إرسال النسخة الاحتياطية بالبريد الإلكتروني

**Branch**: `017-backup-email-send` | **Date**: 2026-05-21

## Decision 1: خدمة البريد الإلكتروني

- **Decision**: استخدام Resend (resend.com)
- **Rationale**: المعيار الصناعي مع Supabase Edge Functions — SDK رسمي لـ Deno، تكامل مباشر مع SMTP، طبقة مجانية كافية (3000 بريد/شهر)، سهولة التثبيت عبر `https://esm.sh/resend@latest`
- **Alternatives considered**:
  - SendGrid: ثقيل، يحتاج SMTP setup أكثر
  - Nodemailer: لا يعمل في Deno Edge Runtime بدون workaround
  - Supabase built-in SMTP: محدود ولا يدعم attachments كاملاً

## Decision 2: طريقة إرسال الملف

- **Decision**: إرسال **Signed URL** للتحميل (صالح 24 ساعة) — لا attachment مباشر
- **Rationale**: ملفات الـ backup قد تتجاوز 10MB (حد المرفقات في معظم خدمات البريد). الـ Signed URL أكثر أماناً وأبسط تقنياً — Supabase Storage يدعمها نيتياً
- **Alternatives considered**:
  - إرفاق الملف مباشراً: يفشل مع ملفات كبيرة، يزيد حجم الطلب إلى Edge Function
  - Base64 encoding في الـ email body: أسوأ — يضخّم الحجم 33%

## Decision 3: معمارية الـ Edge Function

- **Decision**: Edge Function جديدة `send-backup-email` (منفصلة عن `automated-backup`)
- **Rationale**: separation of concerns — `automated-backup` مسؤولة عن إنشاء النسخة فقط. الإرسال حدث مستقل قابل للاستدعاء على أي نسخة موجودة
- **Alternatives considered**:
  - إضافة email sending إلى `automated-backup`: يخلط مسؤوليتين، يصعّب الـ testing

## Decision 4: واجهة المستخدم

- **Decision**: زر "إرسال بالبريد" في `BackupListItem.tsx` (مقتصر على النسخ `completed` فقط) + Modal منفصل `SendEmailModal.tsx`
- **Rationale**: نفس نمط زر "تحميل JSON" و"تحميل CSV" الموجود — اتساق في UX
- **Alternatives considered**:
  - زر في مستوى `BackupTab`: يُبهم أي نسخة سيُرسل — أقل وضوحاً

## Decision 5: بيانات جديدة مطلوبة

- **Decision**: لا جداول جديدة مطلوبة
- **Rationale**: الإرسال عملية لحظية (fire-and-forget). تسجيل الإرسال في `backup_history` يمكن عبر عمود جديد `last_emailed_at` اختياري فقط — لكن خارج نطاق هذه المرحلة
- **Alternatives considered**:
  - جدول `email_send_log`: مبالغة لهذا الاستخدام

## Environment Variables المطلوبة

- `RESEND_API_KEY` — مفتاح Resend API (يُضاف لـ Supabase secrets)
- `RESEND_FROM_EMAIL` — عنوان المُرسِل (مثل `noreply@zafeer.app`) — يحتاج domain verified في Resend
