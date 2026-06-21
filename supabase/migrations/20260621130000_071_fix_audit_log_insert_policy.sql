-- ============================================================
-- 071: audit_log INSERT policy (fix silent 42501 on login/logout audit)
-- Root cause: audit_log had RLS enabled with ONLY an admin SELECT policy
-- and NO INSERT policy -> every client insert denied (Postgres deny-by-default).
-- securityLogger.logAudit() (login/logout) failed silently with 42501.
--
-- Fix: allow authenticated users to insert ONLY their own audit rows
-- (user_id = auth.uid()). Read stays admin-only. service_role still bypasses.
-- Principle IV (RLS on, self-scoped, not a privileged delete/bulk/role op) +
-- Principle VII (audit user_id tracks the acting team member = allowed).
-- ============================================================

DROP POLICY IF EXISTS "audit_log_self_insert" ON public.audit_log;

CREATE POLICY "audit_log_self_insert" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
