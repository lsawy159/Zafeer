-- ════════════════════════════════════════════════════════════════════
-- Spec 075b: تنبيه أمني تلقائي عند محاولات دخول فاشلة متكررة
-- مطبّق على الـ remote عبر Supabase MCP بتاريخ 2026-06-23.
-- trigger على login_attempts (SECURITY DEFINER) → security_events بخطورة
-- critical عند العتبة. العتبة: 5 محاولات فاشلة لنفس البريد خلال 15 دقيقة.
-- يتجنّب الإغراق: تنبيه واحد لكل بريد خلال النافذة.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.detect_repeated_failed_logins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fail_count int;
  recent_alert_exists boolean;
BEGIN
  IF NEW.attempt_type <> 'failed' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO fail_count
  FROM public.login_attempts
  WHERE email = NEW.email
    AND attempt_type = 'failed'
    AND created_at > now() - interval '15 minutes';

  IF fail_count >= 5 THEN
    SELECT exists(
      SELECT 1 FROM public.security_events
      WHERE event_type = 'repeated_failed_login'
        AND is_resolved = false
        AND details->>'email' = NEW.email
        AND created_at > now() - interval '15 minutes'
    ) INTO recent_alert_exists;

    IF NOT recent_alert_exists THEN
      INSERT INTO public.security_events(event_type, severity, description, details, ip_address, is_resolved)
      VALUES (
        'repeated_failed_login',
        'critical',
        'محاولات دخول فاشلة متكررة (' || fail_count || ') للبريد ' || NEW.email,
        jsonb_build_object('email', NEW.email, 'fail_count', fail_count, 'window', '15m'),
        NEW.ip_address,
        false
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_detect_repeated_failed_logins ON public.login_attempts;
CREATE TRIGGER trg_detect_repeated_failed_logins
  AFTER INSERT ON public.login_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_repeated_failed_logins();

-- ROLLBACK:
--   DROP TRIGGER IF EXISTS trg_detect_repeated_failed_logins ON public.login_attempts;
--   DROP FUNCTION IF EXISTS public.detect_repeated_failed_logins();
