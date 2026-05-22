# Research: تفعيل نظام الإشعارات الفعلي

**Branch**: `019-activate-notifications` | **Date**: 2026-05-21

## قرار 1: أين يعيش منطق الإشعارات اليومية؟

**السؤال**: هل نُشغّل المنطق من client-side (comprehensiveExpiryAlertService) أم من Supabase Edge Function؟

**القرار**: **Supabase Edge Function جديدة** (`daily-notification-run`)

**الأسباب**:
- Edge Function تُشغَّل بـ pg_cron مستقلة عن المتصفح — لا تحتاج أحداً يفتح التطبيق
- نفس نمط `send-backup-email` المُطبَّق بالفعل في المشروع
- `comprehensiveExpiryAlertService.ts` يبقى للاستخدام اليدوي من الواجهة (زر "توليد الإشعارات")

**البديل المرفوض**: client-side service — يستوجب تشغيل المتصفح، لا يصلح كـ cron job حقيقي

---

## قرار 2: إرسال الإيميل — مباشر أم عبر email_queue؟

**السؤال**: هل تُرسِل Edge Function مباشرة عبر Resend أم تُضيف للـ email_queue؟

**القرار**: **إرسال مباشر عبر Resend** في الـ Edge Function للإشعار اليومي

**الأسباب**:
- `send-backup-email` نفس النمط، يعمل بنجاح في الإنتاج
- email_queue لا يوجد معالج له حالياً — إضافة للـ queue دون معالجة يعني رسائل لا تُرسَل
- `process-email-queue` Edge Function ستُنشأ كـ Step 2 منفصل لمعالجة الرسائل الأخرى المُصفَّفة من الواجهة

**البديل المرفوض**: email_queue → بدون معالج، الرسائل تتراكم وتظل pending

---

## قرار 3: توليد الإشعارات — أي مسار يبقى؟

**السؤال**: نحتفظ بـ `comprehensiveExpiryAlertService.ts` أم بـ `generate_expiry_notifications()` RPC؟

**القرار**: **كلاهما يبقى بأدوار مختلفة لا تتعارض**

- `generate_expiry_notifications()` RPC → يكتب في جدول `notifications` (in-app) — يُستدعى من صفحة Notifications ومن Edge Function
- `comprehensiveExpiryAlertService.ts` → يُستدعى من الواجهة يدوياً (manual trigger)، يبقى client-side
- Edge Function الجديدة → تستدعي RPC لتوليد in-app notifications + ترسل إيميل مباشرة

**الفصل الواضح**: in-app = RPC + notifications table، email = Resend في Edge Function

---

## قرار 4: مصدر إيميل المسؤول

**القرار**: `system_settings` key = `admin_email`

- Edge Function تقرأ `admin_email` من `system_settings`
- إذا غاب المفتاح: لا إرسال + تسجيل في logs
- يُحذف `PRIMARY_ADMIN_EMAIL` الثابت من `notificationTypes.ts` و `emailQueueService.ts` تدريجياً

---

## قرار 5: ساعات الصمت

**القرار**: Edge Function تتحقق من ساعات الصمت قبل إرسال الإيميل

- تقرأ `quiet_hours_start` و `quiet_hours_end` من `system_settings`
- القيم الافتراضية: `23:50` و `08:30`
- المنطقة الزمنية: `Asia/Riyadh` (متوافق مع الدستور — السوق الخليجي)
- معالجة العبور عبر منتصف الليل: إذا start > end فالفترة تمتد عبر اليوم

**In-app notifications**: تُولَّد بغض النظر عن ساعات الصمت (تظهر بمجرد فتح التطبيق)

---

## قرار 6: التحكم في الإشعارات (محدّث 2026-05-22)

**القرار السابق**: ~~جدول `notification_mutes` — محذوف من النطاق~~

**القرار الحالي**: **snooze per-document** عبر حقلَين في جدول `notifications`
- `snoozed_until` TIMESTAMPTZ: تأجيل لتاريخ محدد
- `is_deferred` BOOLEAN: تعطيل مفتوح (حتى يُفعَّل يدوياً)

**الأسباب**: لا إيقاف كلي لكيان — المسؤول يتحكم بالوثيقة المحددة فقط. بسيط أكثر، لا جدول إضافي.

---

## قرار 7: صيغة تقرير CSV (US5)

**القرار**: ZIP يحتوي ملفَّي CSV (لا xlsx) — نفس JSZip + arrayToCsv من send-backup-email

**الأسباب**:
- نمط مُجرَّب بالفعل في الإنتاج (send-backup-email)
- لا تبعية إضافية على xlsx libraries
- Excel يفتح CSV بـ UTF-8 BOM بشكل صحيح للعربية

---

## قرار 8: مصدر بيانات تقرير CSV (US5)

**القرار**: قراءة مباشرة من جداول `employees` + `companies` (لا من جدول `notifications`)

**الأسباب**:
- جدول notifications قد لا يحتوي كل التفاصيل المطلوبة في الأعمدة (تواريخ منفصلة لكل وثيقة)
- نفس منطق حساب الخطورة المُستَخدَم في النظام كله (notification_thresholds)
- تصفية الإشعارات المؤجلة عبر `snoozed_until/is_deferred` في نفس الـ Edge Function

---

## قرار 9: مكان منطق CSV في الدورة اليومية (US5)

**القرار**: منطق CSV مُضمَّن مباشرة في `daily-notification-run` (لا HTTP call بين Functions)

**الأسباب**:
- تجنُّب round-trip بين Edge Functions
- helper functions (`daysUntil`, `getSeverityLevel`, `getEntitySeverity`) مُشتَركة بين الملفين عبر استيراد محلي أو نسخة منطق
- زمن استجابة أقل + سيناريو فشل واحد فقط

**البديل المرفوض**: استدعاء `send-alert-report` من `daily-notification-run` عبر HTTP — تأخير غير ضروري

---

## ملخص المكونات الجديدة

| المكون | النوع | الوصف |
|--------|-------|-------|
| `daily-notification-run` | Edge Function | pg_cron daily, quiet hours check, RPC call, Resend email + CSV ZIP attachment |
| `process-email-queue` | Edge Function | معالج طابور الإيميلات المعلّقة |
| `send-alert-report` | Edge Function | تقرير CSV (استدعاء يدوي من الواجهة) |
| `snoozed_until` + `is_deferred` | notifications table columns | تأجيل وثيقة بعينها (per-document snooze) |
| `admin_email` | system_settings key | إيميل المسؤول (بدلاً من hardcoded) |
| `csv_report_last_sent` | system_settings key | آخر تاريخ إرسال ناجح للتقرير CSV |
