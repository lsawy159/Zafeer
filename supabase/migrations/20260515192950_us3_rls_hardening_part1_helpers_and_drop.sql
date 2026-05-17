-- ============================================================
-- US3 Part 1: Helper function + Drop all permissive policies
-- FR-009 (admin bypass) + FR-010 (replace authenticated_all_access)
-- ============================================================

-- is_admin(): STABLE + SECURITY DEFINER avoids RLS recursion on users table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role = 'admin' FROM public.users WHERE id = auth.uid() LIMIT 1),
    false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Drop all existing authenticated_all_access policies (FR-010: replace, not supplement)
DROP POLICY IF EXISTS authenticated_all_access ON public.activity_log;
DROP POLICY IF EXISTS authenticated_all_access ON public.audit_log;
DROP POLICY IF EXISTS authenticated_all_access ON public.backup_history;
DROP POLICY IF EXISTS authenticated_all_access ON public.companies;
DROP POLICY IF EXISTS authenticated_all_access ON public.daily_alert_logs;
DROP POLICY IF EXISTS authenticated_all_access ON public.daily_excel_logs;
DROP POLICY IF EXISTS authenticated_all_access ON public.email_queue;
DROP POLICY IF EXISTS authenticated_all_access ON public.employee_obligation_headers;
DROP POLICY IF EXISTS authenticated_all_access ON public.employee_obligation_lines;
DROP POLICY IF EXISTS authenticated_all_access ON public.employees;
DROP POLICY IF EXISTS authenticated_all_access ON public.login_attempts;
DROP POLICY IF EXISTS authenticated_all_access ON public.login_rate_limits;
DROP POLICY IF EXISTS authenticated_all_access ON public.notifications;
DROP POLICY IF EXISTS authenticated_all_access ON public.payroll_entries;
DROP POLICY IF EXISTS authenticated_all_access ON public.payroll_entry_components;
DROP POLICY IF EXISTS authenticated_all_access ON public.payroll_runs;
DROP POLICY IF EXISTS authenticated_all_access ON public.payroll_slips;
DROP POLICY IF EXISTS authenticated_all_access ON public.projects;
DROP POLICY IF EXISTS authenticated_all_access ON public.read_alerts;
DROP POLICY IF EXISTS authenticated_all_access ON public.security_events;
DROP POLICY IF EXISTS authenticated_all_access ON public.system_settings;
DROP POLICY IF EXISTS authenticated_all_access ON public.transfer_procedures;
DROP POLICY IF EXISTS authenticated_all_access ON public.user_sessions;
DROP POLICY IF EXISTS authenticated_all_access ON public.users;
