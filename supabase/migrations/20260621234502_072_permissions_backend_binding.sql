-- ============================================================
-- 072: Permissions Backend Binding (Spec 071)
-- Bind payroll / obligation / adhkar write authorization to granted
-- permissions instead of admin-only. user_has_permission() keeps the
-- admin bypass; Deny-by-Default preserved. No FOR ALL USING(true).
--
-- Mapping (see specs/071-permissions-backend-binding/contracts/rls-policies.md):
--   payroll_runs           : insert=create, update=edit, delete=delete
--   dependent payroll tbls  : insert/update = create OR edit ; delete = edit OR delete
--   obligation tbls         : read = payroll.view OR revenue.view OR revenue.manage
--                             insert/update = payroll.create OR payroll.edit
--                             delete = payroll.delete OR revenue.manage
--   adhkar                  : insert=adhkar.create, update=adhkar.edit, delete=adhkar.delete
-- SELECT (*_read) policies on payroll tables remain unchanged (payroll.view).
-- ============================================================

-- ─── payroll_runs (strict CRUD) ──────────────────────────────
DROP POLICY IF EXISTS payroll_runs_write ON public.payroll_runs;

CREATE POLICY payroll_runs_insert ON public.payroll_runs
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT user_has_permission('payroll', 'create')));

CREATE POLICY payroll_runs_update ON public.payroll_runs
  FOR UPDATE TO authenticated
  USING ((SELECT user_has_permission('payroll', 'edit')))
  WITH CHECK ((SELECT user_has_permission('payroll', 'edit')));

CREATE POLICY payroll_runs_delete ON public.payroll_runs
  FOR DELETE TO authenticated
  USING ((SELECT user_has_permission('payroll', 'delete')));

-- ─── payroll_entries (dependent) ─────────────────────────────
DROP POLICY IF EXISTS payroll_entries_write ON public.payroll_entries;

CREATE POLICY payroll_entries_insert ON public.payroll_entries
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT user_has_permission('payroll', 'create'))
           OR (SELECT user_has_permission('payroll', 'edit')));

CREATE POLICY payroll_entries_update ON public.payroll_entries
  FOR UPDATE TO authenticated
  USING ((SELECT user_has_permission('payroll', 'create'))
      OR (SELECT user_has_permission('payroll', 'edit')))
  WITH CHECK ((SELECT user_has_permission('payroll', 'create'))
           OR (SELECT user_has_permission('payroll', 'edit')));

CREATE POLICY payroll_entries_delete ON public.payroll_entries
  FOR DELETE TO authenticated
  USING ((SELECT user_has_permission('payroll', 'edit'))
      OR (SELECT user_has_permission('payroll', 'delete')));

-- ─── payroll_entry_components (dependent) ────────────────────
DROP POLICY IF EXISTS payroll_entry_components_write ON public.payroll_entry_components;

CREATE POLICY payroll_entry_components_insert ON public.payroll_entry_components
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT user_has_permission('payroll', 'create'))
           OR (SELECT user_has_permission('payroll', 'edit')));

CREATE POLICY payroll_entry_components_update ON public.payroll_entry_components
  FOR UPDATE TO authenticated
  USING ((SELECT user_has_permission('payroll', 'create'))
      OR (SELECT user_has_permission('payroll', 'edit')))
  WITH CHECK ((SELECT user_has_permission('payroll', 'create'))
           OR (SELECT user_has_permission('payroll', 'edit')));

CREATE POLICY payroll_entry_components_delete ON public.payroll_entry_components
  FOR DELETE TO authenticated
  USING ((SELECT user_has_permission('payroll', 'edit'))
      OR (SELECT user_has_permission('payroll', 'delete')));

-- ─── payroll_slips (dependent) ───────────────────────────────
DROP POLICY IF EXISTS payroll_slips_write ON public.payroll_slips;

CREATE POLICY payroll_slips_insert ON public.payroll_slips
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT user_has_permission('payroll', 'create'))
           OR (SELECT user_has_permission('payroll', 'edit')));

CREATE POLICY payroll_slips_update ON public.payroll_slips
  FOR UPDATE TO authenticated
  USING ((SELECT user_has_permission('payroll', 'create'))
      OR (SELECT user_has_permission('payroll', 'edit')))
  WITH CHECK ((SELECT user_has_permission('payroll', 'create'))
           OR (SELECT user_has_permission('payroll', 'edit')));

CREATE POLICY payroll_slips_delete ON public.payroll_slips
  FOR DELETE TO authenticated
  USING ((SELECT user_has_permission('payroll', 'edit'))
      OR (SELECT user_has_permission('payroll', 'delete')));

-- ─── payroll_entry_project_allocations (dependent) ───────────
DROP POLICY IF EXISTS manage_payroll_allocations ON public.payroll_entry_project_allocations;

CREATE POLICY payroll_allocations_insert ON public.payroll_entry_project_allocations
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT user_has_permission('payroll', 'create'))
           OR (SELECT user_has_permission('payroll', 'edit')));

CREATE POLICY payroll_allocations_update ON public.payroll_entry_project_allocations
  FOR UPDATE TO authenticated
  USING ((SELECT user_has_permission('payroll', 'create'))
      OR (SELECT user_has_permission('payroll', 'edit')))
  WITH CHECK ((SELECT user_has_permission('payroll', 'create'))
           OR (SELECT user_has_permission('payroll', 'edit')));

CREATE POLICY payroll_allocations_delete ON public.payroll_entry_project_allocations
  FOR DELETE TO authenticated
  USING ((SELECT user_has_permission('payroll', 'edit'))
      OR (SELECT user_has_permission('payroll', 'delete')));

-- ─── employee_obligation_headers (payroll ∪ revenue) ─────────
DROP POLICY IF EXISTS obligation_headers_write ON public.employee_obligation_headers;
DROP POLICY IF EXISTS obligation_headers_read  ON public.employee_obligation_headers;

CREATE POLICY obligation_headers_read ON public.employee_obligation_headers
  FOR SELECT TO authenticated
  USING ((SELECT user_has_permission('payroll', 'view'))
      OR (SELECT user_has_permission('revenue', 'view'))
      OR (SELECT user_has_permission('revenue', 'manage')));

CREATE POLICY obligation_headers_insert ON public.employee_obligation_headers
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT user_has_permission('payroll', 'create'))
           OR (SELECT user_has_permission('payroll', 'edit')));

CREATE POLICY obligation_headers_update ON public.employee_obligation_headers
  FOR UPDATE TO authenticated
  USING ((SELECT user_has_permission('payroll', 'create'))
      OR (SELECT user_has_permission('payroll', 'edit')))
  WITH CHECK ((SELECT user_has_permission('payroll', 'create'))
           OR (SELECT user_has_permission('payroll', 'edit')));

CREATE POLICY obligation_headers_delete ON public.employee_obligation_headers
  FOR DELETE TO authenticated
  USING ((SELECT user_has_permission('payroll', 'delete'))
      OR (SELECT user_has_permission('revenue', 'manage')));

-- ─── employee_obligation_lines (payroll ∪ revenue) ───────────
DROP POLICY IF EXISTS obligation_lines_write ON public.employee_obligation_lines;
DROP POLICY IF EXISTS obligation_lines_read  ON public.employee_obligation_lines;

CREATE POLICY obligation_lines_read ON public.employee_obligation_lines
  FOR SELECT TO authenticated
  USING ((SELECT user_has_permission('payroll', 'view'))
      OR (SELECT user_has_permission('revenue', 'view'))
      OR (SELECT user_has_permission('revenue', 'manage')));

CREATE POLICY obligation_lines_insert ON public.employee_obligation_lines
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT user_has_permission('payroll', 'create'))
           OR (SELECT user_has_permission('payroll', 'edit')));

CREATE POLICY obligation_lines_update ON public.employee_obligation_lines
  FOR UPDATE TO authenticated
  USING ((SELECT user_has_permission('payroll', 'create'))
      OR (SELECT user_has_permission('payroll', 'edit')))
  WITH CHECK ((SELECT user_has_permission('payroll', 'create'))
           OR (SELECT user_has_permission('payroll', 'edit')));

CREATE POLICY obligation_lines_delete ON public.employee_obligation_lines
  FOR DELETE TO authenticated
  USING ((SELECT user_has_permission('payroll', 'delete'))
      OR (SELECT user_has_permission('revenue', 'manage')));

-- ─── adhkar (honor permissions) ──────────────────────────────
DROP POLICY IF EXISTS adhkar_insert ON public.adhkar;
DROP POLICY IF EXISTS adhkar_update ON public.adhkar;
DROP POLICY IF EXISTS adhkar_delete ON public.adhkar;
-- adhkar_select (USING true) is intentionally kept.

CREATE POLICY adhkar_insert ON public.adhkar
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT user_has_permission('adhkar', 'create')));

CREATE POLICY adhkar_update ON public.adhkar
  FOR UPDATE TO authenticated
  USING ((SELECT user_has_permission('adhkar', 'edit')))
  WITH CHECK ((SELECT user_has_permission('adhkar', 'edit')));

CREATE POLICY adhkar_delete ON public.adhkar
  FOR DELETE TO authenticated
  USING ((SELECT user_has_permission('adhkar', 'delete')));
