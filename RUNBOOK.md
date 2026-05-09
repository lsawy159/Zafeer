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
2. GitHub → Settings → Secrets → حدّث SUPABASE_SERVICE_ROLE_KEY
3. Fly.io / Render → Environment Variables → حدّث نفس المفتاح
4. Vercel → Project Settings → Environment Variables → حدّث
5. أعِد deploy للـ api-server (يلتقط المفتاح الجديد)
6. تحقق من health: GET https://api.zafeer.app/healthz
7. سجّل الحادثة في security_events table:
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
   - إذا ممتلئ: api-server restarts يحرر connections

3. تحقق api-server logs:
   fly logs -a zafeer-api    (أو Render dashboard)

4. تحقق الـ Sentry للـ error:
   https://sentry.io → Projects → zafeer

5. آخر حل — restart api-server:
   fly machine restart -a zafeer-api
```

---

## 4. Deploy Rollback

**السيناريو**: deploy جديد كسر production.

### api-server (Fly.io)

```bash
# شوف releases
fly releases -a zafeer-api

# rollback لـ version سابق
fly deploy -a zafeer-api --image <previous-image-id>
```

### sawtracker (Vercel)

```
Vercel Dashboard → Deployments → اختر الـ deployment السابق → "Promote to Production"
```

### إلغاء migration خاطئ

```sql
-- اكتب migration عكسي في supabase/migrations/YYYYMMDDHHMMSS_revert_xxx.sql
-- ثم طبّقه عبر MCP أو CLI
supabase db push
```

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
