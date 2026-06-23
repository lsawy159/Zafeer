-- ════════════════════════════════════════════════════════════════════
-- Spec 075c: سياسة UPDATE للمدير على security_events
-- مطبّق على الـ remote عبر Supabase MCP بتاريخ 2026-06-23.
-- يسمح للمدير بتعليم التنبيه "تمت مراجعته" (is_resolved). القراءة admin فقط أصلاً.
-- ════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS security_events_admin_update ON public.security_events;
CREATE POLICY security_events_admin_update ON public.security_events
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ROLLBACK: DROP POLICY IF EXISTS security_events_admin_update ON public.security_events;
