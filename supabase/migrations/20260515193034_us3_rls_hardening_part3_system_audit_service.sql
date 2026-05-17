-- ============================================================
-- US3 Part 3: Notifications, Audit, System, and Service-only tables
-- FR-012 (audit read-only) + FR-013 (service-only = no authenticated)
-- FR-016 (no employees.id = auth.uid() — Principle VII)
-- ============================================================

-- ─── notifications: system-generated alerts (FR-011) ─────────
-- Frontend reads; service_role/pg_cron writes (bypasses RLS)
CREATE POLICY "notifications_read" ON public.notifications
  FOR SELECT TO authenticated
  USING ((SELECT user_has_permission('alerts', 'view')));

-- Admin can mutate notifications from UI (e.g., manual dismissal)
CREATE POLICY "notifications_admin_write" ON public.notifications
  FOR ALL TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

-- ─── read_alerts: owner-scoped ───────────────────────────────
-- Each user manages only their own "read" markers
CREATE POLICY "read_alerts_own" ON public.read_alerts
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── activity_log: read-only for permissioned users (FR-012) ─
CREATE POLICY "activity_log_read" ON public.activity_log
  FOR SELECT TO authenticated
  USING ((SELECT user_has_permission('activityLogs', 'view')));
-- No INSERT/UPDATE/DELETE from authenticated — service_role only

-- ─── audit_log: admin-only read (contains sensitive data) ────
CREATE POLICY "audit_log_admin_read" ON public.audit_log
  FOR SELECT TO authenticated
  USING ((SELECT is_admin()));
-- No write from authenticated

-- ─── security_events: admin read only (FR-012) ───────────────
-- Preserves existing anon_insert_security_events policy (not dropped)
CREATE POLICY "security_events_admin_read" ON public.security_events
  FOR SELECT TO authenticated
  USING ((SELECT is_admin()));

-- ─── login_attempts: admin read only (FR-012) ────────────────
-- Preserves existing anon_insert_login_attempts policy (not dropped)
CREATE POLICY "login_attempts_admin_read" ON public.login_attempts
  FOR SELECT TO authenticated
  USING ((SELECT is_admin()));

-- ─── system_settings: admin only ─────────────────────────────
CREATE POLICY "system_settings_admin" ON public.system_settings
  FOR ALL TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

-- ─── login_rate_limits: admin only (auth system table) ───────
CREATE POLICY "login_rate_limits_admin" ON public.login_rate_limits
  FOR ALL TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

-- ─── user_sessions: own session OR admin ─────────────────────
CREATE POLICY "user_sessions_own_or_admin" ON public.user_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR (SELECT is_admin()))
  WITH CHECK (user_id = auth.uid() OR (SELECT is_admin()));

-- ─── users: own row read + admin full read ───────────────────
-- Writes handled by Express admin API via service_role (bypasses RLS)
-- get_all_users_for_admin() is SECURITY DEFINER — bypasses this policy
CREATE POLICY "users_self_or_admin_read" ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR (SELECT is_admin()));

-- ─── service-only tables: NO authenticated policies (FR-013) ─
-- email_queue, backup_history, daily_alert_logs, daily_excel_logs
-- service_role bypasses RLS — no policy needed for service operations
-- authenticated role gets nothing on these tables (deny by default)
-- (no CREATE POLICY statements for these tables — intentional)

-- ─── saved_searches: existing owner_all_access retained (FR-014) ─
-- Policy was not dropped in Part 1 — intentionally preserved
