-- ════════════════════════════════════════════════════════════════════
-- Spec 075d: إيميل للمدير عند التنبيهات الأمنية الحرجة
-- مطبّق على الـ remote عبر Supabase MCP بتاريخ 2026-06-23.
--
-- ⚠️ لا يلمس أي منطق إيميل قائم (emailQueueService / validateQueueModeConstraint
-- / process-email-queue worker). يضيف صفاً فقط في email_queue — وهو الواجهة
-- المعتمدة للطابور — والـ worker الساعي (process-email-queue-hourly) يبعته.
-- constraint وضع digest في الفرونت فقط ولا تنطبق على الإدخال المباشر للجدول.
--
-- معزول بالكامل بـ EXCEPTION WHEN others → مستحيل يكسر إدخال security_events
-- أو مسار الدخول. مقصور على قائمة بيضاء من الأحداث (يتجنّب ضجيج access_denied).
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.notify_admin_critical_security_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_addr text;
BEGIN
  IF NEW.event_type NOT IN (
    'repeated_failed_login', 'activity_log_deleted',
    'bulk_employee_delete', 'bulk_project_delete'
  ) THEN
    RETURN NEW;
  END IF;

  BEGIN
    -- admin_email مخزّن jsonb مزدوج الترميز ("...") — نفك الاقتباس
    SELECT nullif(trim(both '"' from trim(setting_value #>> '{}')), '')
    INTO admin_addr
    FROM public.system_settings
    WHERE setting_key = 'admin_email'
    LIMIT 1;

    IF admin_addr IS NOT NULL AND position('@' in admin_addr) > 1 THEN
      INSERT INTO public.email_queue (to_emails, subject, html_content, priority)
      VALUES (
        ARRAY[admin_addr],
        'تنبيه أمني: ' || coalesce(NEW.description, NEW.event_type),
        '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif">'
          || '<h3 style="color:#b91c1c">⚠️ تنبيه أمني</h3>'
          || '<p>' || coalesce(NEW.description, NEW.event_type) || '</p>'
          || '<p>الخطورة: ' || NEW.severity || '</p>'
          || '<p>الوقت: ' || NEW.created_at || '</p>'
          || '<hr><p style="color:#6b7280;font-size:12px">رسالة تلقائية من نظام زفير — راجع لوحة تدقيق الأمان.</p>'
          || '</div>',
        'high'
      );
    END IF;
  EXCEPTION WHEN others THEN
    NULL; -- لا تكسر التسجيل الأمني مهما حدث
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_critical_security_event ON public.security_events;
CREATE TRIGGER trg_notify_admin_critical_security_event
  AFTER INSERT ON public.security_events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_critical_security_event();

-- ROLLBACK:
--   DROP TRIGGER IF EXISTS trg_notify_admin_critical_security_event ON public.security_events;
--   DROP FUNCTION IF EXISTS public.notify_admin_critical_security_event();
