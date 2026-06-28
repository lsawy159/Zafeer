# Zafeer — Operations Runbook

## الفهرس

1. [استعادة حساب Admin المفقود](#1-admin-recovery)
2. [تسريب service-role-key](#2-service-role-key-rotation)
3. [انقطاع قاعدة البيانات](#3-db-outage)
4. [rollback للـ deployment](#4-deploy-rollback)
5. [فشل الـ backup](#5-backup-failure)
6. [Sentry alerts + uptime](#6-monitoring)

---

## 1. Admin Recovery

**السيناريو**: لا يوجد admin يستطيع تسجيل الدخول.

```sql
-- من Supabase SQL Editor (بصلاحية service_role)
UPDATE public.users
SET role = 'admin', is_active = true
WHERE email = 'ahmad.alsawy159@gmail.com';

-- تحقق
SELECT id, email, role, is_active FROM public.users WHERE email = 'ahmad.alsawy159@gmail.com';
```

**إذا فُقد الحساب من auth.users كلياً**:

1. Supabase Dashboard → Authentication → Users → "Invite user"
2. بعد التسجيل → نفّذ الـ SQL أعلاه

---

## 2. Service-Role-Key Rotation

**السيناريو**: تسريب `SUPABASE_SERVICE_ROLE_KEY`.

```
خطوات (بالترتيب — لا تتخطَّ):
1. Supabase Dashboard → Settings → API → Regenerate service_role key
2. GitHub → Settings → Secrets → حدّث SUPABASE_SERVICE_ROLE_KEY (تستخدمه workflows + e2e cleanup)
3. Vercel → Project Settings → Environment Variables → حدّث
4. Edge Functions بتاخد service_role تلقائيًا من منصة Supabase — مفيش redeploy مطلوب للمفتاح
5. سجّل الحادثة في security_events table:
```

```sql
INSERT INTO public.security_events (event_type, severity, description, metadata)
VALUES ('key_rotation', 'high', 'service_role_key rotated due to suspected leak',
        '{"rotated_by": "ahmed", "date": "YYYY-MM-DD"}'::jsonb);
```

---

## 3. DB Outage Triage

**السيناريو**: الموقع يعطي errors من قاعدة البيانات.

```
1. تحقق Supabase Status: https://status.supabase.com
   - إذا Supabase down → انتظر (لا شيء تعمله)

2. إذا Supabase up — تحقق من الـ connection pool:
   Supabase Dashboard → Database → Connections

3. تحقق Edge Function logs:
   Supabase Dashboard → Edge Functions → اختر الدالة → Logs

4. تحقق الـ Sentry للـ error:
   https://sentry.io → Projects → zafeer
```

---

## 4. Deploy Rollback

**السيناريو**: deploy جديد كسر production.

### zafeer (Vercel)

```
Vercel Dashboard → Deployments → اختر الـ deployment السابق → "Promote to Production"
```

### إلغاء migration خاطئ

```sql
-- اكتب migration عكسي في supabase/migrations/YYYYMMDDHHMMSS_revert_xxx.sql
-- طبّقه كـ migration واحد عبر MCP apply_migration (يطبّق SQL ويسجّله في الـ ledger).
-- ⛔ لا تستخدم `supabase db push` أبداً على production — راجع "سياسة تغيير قاعدة البيانات" تحت.
```

---

## سياسة تغيير قاعدة البيانات (إلزامية — Spec 080 US2)

**⛔ ممنوع منعاً باتاً تشغيل `supabase db push` أو أي "رفع كل الـ migrations" دفعة واحدة ضد production.**

**السبب (مؤكَّد بالفحص 2026-06-28):**

- سجل الـ migrations في production (`supabase_migrations.schema_migrations`) فيه 98 نسخة بأرقام 14-خانة.
- الملفات المحلية 99 ملف بأسماء مختلطة: 68 بـ 14-خانة + 31 باسم قديم قصير + 7 أرقامها غير موجودة في الـ ledger.
- `db push` يقارن أسماء الملفات بالـ ledger، فيحاول إعادة تطبيق عشرات الملفات على production ← أخطاء أو تلف بيانات.
- تم التحقق أن **كل** تغييرات الـ schema مطبّقة فعلاً على production (لا نقص schema) — التعارض في التسمية فقط.

**الطريقة المعتمدة الوحيدة لتغيير قاعدة البيانات:**

1. اكتب migration واحد في `supabase/migrations/`.
2. طبّقه على staging أولاً وتحقق منه.
3. طبّقه على production كـ **migration واحد** عبر **MCP `apply_migration`** (يطبّق SQL ويسجّله) — وليس `db push`.
4. وثّق rollback (migration عكسي) قبل التطبيق.

**تنظيف الـ ledger (اختياري، أولوية منخفضة):** لجعل الـ ledger مطابقاً تماماً لأسماء الملفات يلزم
`supabase migration repair --status applied <version>` لكل نسخة غير متطابقة — يتطلب كلمة مرور قاعدة
بيانات production والتنفيذ على staging أولاً. غير ضروري للأمان (القاعدة أعلاه تكفي لإزالة الخطر).

---

## 5. Backup Failure

**السيناريو**: GitHub Actions backup job failed.

```
1. راجع logs: GitHub → Actions → Database Backup → آخر run
2. أسباب شائعة:
   - DB_PASSWORD تغيّر → حدّث secret
   - R2_ACCESS_KEY_ID انتهت صلاحيته → أنشئ key جديد في Cloudflare
   - Supabase DB host تغيّر (نادر) → Supabase Dashboard → Database → Connection string

3. شغّل backup يدوياً:
   GitHub → Actions → Database Backup → "Run workflow"

4. تحقق من backup_history table:
```

```sql
SELECT * FROM public.backup_history ORDER BY created_at DESC LIMIT 5;
```

---

## 6. Monitoring

### Sentry Alerts (يُعدّ مرة واحدة)

```
Sentry Dashboard → Alerts → Create Alert Rule:
- Condition: error rate > 10/min in last 5 min
- Action: Notify Slack channel #zafeer-alerts
- Environment: production
```

### Uptime Monitoring (BetterStack أو UptimeRobot)

```
Monitors to create:
- Name: Zafeer API    | URL: https://api.zafeer.app/healthz    | interval: 1min
- Name: Zafeer Web    | URL: https://zafeer.vercel.app         | interval: 5min

Alert contacts: ahmad.alsawy159@gmail.com
```

---

## روابط سريعة

| الخدمة | الرابط |
|--------|--------|
| Supabase Dashboard | https://supabase.com/dashboard |
| Supabase Status | https://status.supabase.com |
| GitHub Actions | https://github.com/<org>/zafeer/actions |
| Sentry | https://sentry.io |
| Cloudflare R2 | https://dash.cloudflare.com |
