-- Fix auth_rls_initplan WARN: wrap auth.uid() in SELECT for better query planning
-- Affected tables: read_alerts, snoozed_alerts, user_sessions, users

DROP POLICY IF EXISTS read_alerts_own ON public.read_alerts;
CREATE POLICY read_alerts_own ON public.read_alerts
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS snoozed_alerts_own ON public.snoozed_alerts;
CREATE POLICY snoozed_alerts_own ON public.snoozed_alerts
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS user_sessions_own_or_admin ON public.user_sessions;
CREATE POLICY user_sessions_own_or_admin ON public.user_sessions
  USING ((user_id = (SELECT auth.uid())) OR (SELECT is_admin()));

DROP POLICY IF EXISTS users_self_or_admin_read ON public.users;
CREATE POLICY users_self_or_admin_read ON public.users
  FOR SELECT
  USING ((id = (SELECT auth.uid())) OR (SELECT is_admin()));
