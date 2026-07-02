-- Migration 084a: تنظيف دوري لجلسات user_sessions المنتهية (finding 3)
-- الأعراض: صفوف is_active=true تبقى للأبد بعد تجاوز expires_at (لا يوجد أي job
-- يصححها) — القراءات الحالية (SessionsManager/AuthContext) تصفّي بـ .gt('expires_at', now)
-- فلا تظهر كـ"نشطة" فعليًا، لكن الصف الخام يبقى غير محدَّث بلا logged_out_at ولا
-- is_active=false، وهذا يُبقي بيانات الجلسات غير دقيقة لأي استعلام مستقبلي لا يفلتر بنفس الطريقة.

CREATE OR REPLACE FUNCTION public.cleanup_expired_user_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  UPDATE public.user_sessions
     SET is_active = false,
         logged_out_at = COALESCE(logged_out_at, expires_at)
   WHERE is_active = true
     AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_user_sessions() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_user_sessions() TO service_role;

COMMENT ON FUNCTION public.cleanup_expired_user_sessions() IS
  'يصحح صفوف user_sessions المنتهية (expires_at تجاوزها) التي بقيت is_active=true بلا logged_out_at. يُشغَّل تلقائياً كل ساعة عبر pg_cron.';

-- pg_cron: تشغيل كل ساعة (الجلسات مدتها 8 ساعات — ساعة واحدة سقف تأخير معقول)
DO $$ BEGIN PERFORM cron.unschedule('cleanup-expired-user-sessions-hourly'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'cleanup-expired-user-sessions-hourly',
  '0 * * * *',
  $$SELECT public.cleanup_expired_user_sessions()$$
);
