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

- **Decision**: **Hybrid** — Signed URL للـ JSON (صالح 24 ساعة) + ملف ZIP مرفق مباشرة يحتوي على CSVs (≤ 25MB raw قبل base64 encoding)
- **Rationale**: المستخدم يريد ZIP جاهز في الإيميل بدون خطوة تحميل إضافية. Resend يدعم attachments حتى ~40MB فعلياً — وضعنا cap 25MB raw (≈33MB بعد base64) يُبقينا تحت الحد بهامش أمان. ملفات النسخ للأنظمة الداخلية الصغيرة عادةً أقل من 5MB.
- **Alternatives considered**:
  - Signed URL فقط بدون attachment: يحتاج المستخدم خطوة تحميل إضافية — رُفض بطلب المستخدم
  - رفع ZIP إلى Storage وإرسال Signed URL له: أعقد بلا فائدة، يُلوّث التخزين بملفات مؤقتة
  - Base64 encoding في الـ email body: أسوأ من attachment — يضخّم الحجم 33% دون فائدة

## Decision 6: تنسيق ملفات CSV

- **Decision**: UTF-8 مع BOM، فاصلة (comma) كـ delimiter، RFC 4180 quoting
- **Rationale**: UTF-8 BOM ضروري لعرض النصوص العربية بشكل صحيح في Excel. RFC 4180 comma هو المعيار — Spreadsheet apps تقبله.
- **Alternatives considered**:
  - UTF-8 بدون BOM: Excel قد يُشوّه الأحرف العربية
  - Semicolon delimiter: بعض Excel locales تتوقعه، لكن RFC 4180 أكثر توافقاً

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
- `SUPABASE_URL` و `SUPABASE_SERVICE_ROLE_KEY` — **تُحقَنان تلقائياً** من Supabase Runtime في كل Edge Function — لا يلزم إضافتهما يدوياً
