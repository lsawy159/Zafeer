-- ════════════════════════════════════════════════════════════════════
-- Spec 075a: التقاط IP + الجهاز (user_agent) تلقائياً من ترويسات الطلب
-- مطبّق على الـ remote عبر Supabase MCP بتاريخ 2026-06-23.
-- يوسّع trigger activity_log_set_actor (074) — يغطي كل insert بلا تعديل واجهة.
-- آمن: لو الترويسات غير متاحة (service_role/DB مباشر) لا يفشل، يسيبها NULL.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.activity_log_set_actor()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  hdrs json;
  fwd  text;
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  IF NEW.actor_type IS NULL THEN
    NEW.actor_type := CASE
      WHEN NEW.user_id IS NOT NULL THEN 'user'
      ELSE 'system'
    END;
  END IF;

  BEGIN
    hdrs := current_setting('request.headers', true)::json;
  EXCEPTION WHEN others THEN
    hdrs := NULL;
  END;

  IF hdrs IS NOT NULL THEN
    IF NEW.ip_address IS NULL THEN
      fwd := coalesce(hdrs->>'cf-connecting-ip', hdrs->>'x-real-ip', hdrs->>'x-forwarded-for');
      IF fwd IS NOT NULL AND length(trim(fwd)) > 0 THEN
        NEW.ip_address := trim(split_part(fwd, ',', 1));
      END IF;
    END IF;

    IF NEW.user_agent IS NULL THEN
      NEW.user_agent := hdrs->>'user-agent';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ROLLBACK: إعادة نسخة 074 من الدالة (بدون كتلة الترويسات).
