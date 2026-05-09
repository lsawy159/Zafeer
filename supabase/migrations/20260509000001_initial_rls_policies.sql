-- Migration: Initial RLS policies snapshot
-- Date: 2026-05-09
-- Purpose: Document current production RLS state for version control
--
-- Current policy model: all authenticated users have full access to all tables.
-- This is intentional for Phase 0 (single-tenant app, auth handled by api-server middleware).
-- Granular role-based RLS is planned in Phase US2/US7.
--
-- Access pattern:
--   - authenticated role: full SELECT/INSERT/UPDATE/DELETE on all business tables
--   - anon role: INSERT-only on login_attempts and security_events (rate-limiting)
--   - saved_searches: user-owned (each user sees only their own rows)

-- ──────────────────────────────────────────────────────────────────────────────
-- Business data tables (authenticated = full access)
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.companies;
CREATE POLICY authenticated_all_access ON public.companies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.projects;
CREATE POLICY authenticated_all_access ON public.projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.employees;
CREATE POLICY authenticated_all_access ON public.employees
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.transfer_procedures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.transfer_procedures;
CREATE POLICY authenticated_all_access ON public.transfer_procedures
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────────────
-- Payroll tables
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.payroll_runs;
CREATE POLICY authenticated_all_access ON public.payroll_runs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.payroll_entries;
CREATE POLICY authenticated_all_access ON public.payroll_entries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.payroll_entry_components ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.payroll_entry_components;
CREATE POLICY authenticated_all_access ON public.payroll_entry_components
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.payroll_slips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.payroll_slips;
CREATE POLICY authenticated_all_access ON public.payroll_slips
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.employee_obligation_headers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.employee_obligation_headers;
CREATE POLICY authenticated_all_access ON public.employee_obligation_headers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.employee_obligation_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.employee_obligation_lines;
CREATE POLICY authenticated_all_access ON public.employee_obligation_lines
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────────────
-- Notification & alert tables
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.notifications;
CREATE POLICY authenticated_all_access ON public.notifications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.read_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.read_alerts;
CREATE POLICY authenticated_all_access ON public.read_alerts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.daily_alert_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.daily_alert_logs;
CREATE POLICY authenticated_all_access ON public.daily_alert_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.daily_excel_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.daily_excel_logs;
CREATE POLICY authenticated_all_access ON public.daily_excel_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────────────
-- Audit & security tables
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.activity_log;
CREATE POLICY authenticated_all_access ON public.activity_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.audit_log;
CREATE POLICY authenticated_all_access ON public.audit_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- security_events: authenticated can read/write; anon can INSERT only (for pre-auth security logging)
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.security_events;
DROP POLICY IF EXISTS anon_insert_security_events ON public.security_events;
CREATE POLICY authenticated_all_access ON public.security_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY anon_insert_security_events ON public.security_events
  FOR INSERT TO anon WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────────────
-- Auth & session tables
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.users;
CREATE POLICY authenticated_all_access ON public.users
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.user_sessions;
CREATE POLICY authenticated_all_access ON public.user_sessions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- login_rate_limits: authenticated full access; anon INSERT only (for pre-auth lockout)
ALTER TABLE public.login_rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.login_rate_limits;
CREATE POLICY authenticated_all_access ON public.login_rate_limits
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- login_attempts: authenticated full access; anon INSERT only (logs failed attempts before auth)
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.login_attempts;
DROP POLICY IF EXISTS anon_insert_login_attempts ON public.login_attempts;
CREATE POLICY authenticated_all_access ON public.login_attempts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY anon_insert_login_attempts ON public.login_attempts
  FOR INSERT TO anon WITH CHECK (true);

-- saved_searches: each user sees only their own rows (user_id = auth.uid())
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS owner_all_access ON public.saved_searches;
CREATE POLICY owner_all_access ON public.saved_searches
  FOR ALL USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- System tables
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.system_settings;
CREATE POLICY authenticated_all_access ON public.system_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.email_queue;
CREATE POLICY authenticated_all_access ON public.email_queue
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all_access ON public.backup_history;
CREATE POLICY authenticated_all_access ON public.backup_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
