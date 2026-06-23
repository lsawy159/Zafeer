-- ════════════════════════════════════════════════════════════════════
-- Spec 074: فرض الـ actor الحقيقي على activity_log + سلامة البيانات
-- مطبّق على الـ remote عبر Supabase MCP بتاريخ 2026-06-23.
-- غير كاسرة: إضافات + trigger + تشديد سياسة INSERT. لا حذف/تعديل بيانات.
--
-- الجذر: inserts الفرونت كانت تسيب user_id فاضي، ومفيش default/trigger
--        → الفاعل يضيع (يُعرض "النظام"). الـ trigger هنا يختمه من auth.uid().
-- ════════════════════════════════════════════════════════════════════

-- 1) أعمدة جديدة (nullable — غير كاسرة)
ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS actor_type     text,
  ADD COLUMN IF NOT EXISTS correlation_id uuid;

-- 2) وسم الصفوف التاريخية اللي ضاع منها الـ actor
UPDATE public.activity_log
SET actor_type = 'legacy_unknown'
WHERE user_id IS NULL AND actor_type IS NULL;

-- 3) trigger BEFORE INSERT: يختم المستخدم الحقيقي من الجلسة لو الفرونت ما مرّرهوش
CREATE OR REPLACE FUNCTION public.activity_log_set_actor()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- املأ user_id من جلسة JWT لو المُستدعي ساب الحقل فاضي
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  -- نوع الفاعل الافتراضي
  IF NEW.actor_type IS NULL THEN
    NEW.actor_type := CASE
      WHEN NEW.user_id IS NOT NULL THEN 'user'
      ELSE 'system'
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_log_set_actor ON public.activity_log;
CREATE TRIGGER trg_activity_log_set_actor
  BEFORE INSERT ON public.activity_log
  FOR EACH ROW
  EXECUTE FUNCTION public.activity_log_set_actor();

-- 4) تشديد سياسة INSERT: منع انتحال actor
--    (الـ BEFORE trigger يملأ user_id أولاً، ثم يُقيَّم WITH CHECK على الصف النهائي)
--    service_role يتخطى RLS أصلاً فالمسارات السيرفرية مش متأثرة.
DROP POLICY IF EXISTS activity_log_insert ON public.activity_log;
CREATE POLICY activity_log_insert ON public.activity_log
  FOR INSERT
  WITH CHECK (
    user_id IS NOT DISTINCT FROM auth.uid()
    OR auth.uid() IS NULL
  );

-- ════════════════════════════════════════════════════════════════════
-- ROLLBACK (عند الحاجة):
--   DROP TRIGGER IF EXISTS trg_activity_log_set_actor ON public.activity_log;
--   DROP FUNCTION IF EXISTS public.activity_log_set_actor();
--   DROP POLICY IF EXISTS activity_log_insert ON public.activity_log;
--   CREATE POLICY activity_log_insert ON public.activity_log
--     FOR INSERT WITH CHECK (true);
--   ALTER TABLE public.activity_log DROP COLUMN IF EXISTS actor_type,
--                                   DROP COLUMN IF EXISTS correlation_id;
-- ════════════════════════════════════════════════════════════════════
