-- ============================================================
-- US3 Part 2: Core operational tables — permission-based CRUD
-- FR-011: enforce write ops based on caller's permissions
-- user_has_permission() already has admin bypass (role='admin' → true)
-- ============================================================

-- ─── employees ───────────────────────────────────────────────
CREATE POLICY "employees_read" ON public.employees
  FOR SELECT TO authenticated
  USING ((SELECT user_has_permission('employees', 'view')));

CREATE POLICY "employees_insert" ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT user_has_permission('employees', 'create')));

CREATE POLICY "employees_update" ON public.employees
  FOR UPDATE TO authenticated
  USING ((SELECT user_has_permission('employees', 'edit')))
  WITH CHECK ((SELECT user_has_permission('employees', 'edit')));

CREATE POLICY "employees_delete" ON public.employees
  FOR DELETE TO authenticated
  USING ((SELECT user_has_permission('employees', 'delete')));

-- ─── companies ───────────────────────────────────────────────
CREATE POLICY "companies_read" ON public.companies
  FOR SELECT TO authenticated
  USING ((SELECT user_has_permission('companies', 'view')));

CREATE POLICY "companies_insert" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT user_has_permission('companies', 'create')));

CREATE POLICY "companies_update" ON public.companies
  FOR UPDATE TO authenticated
  USING ((SELECT user_has_permission('companies', 'edit')))
  WITH CHECK ((SELECT user_has_permission('companies', 'edit')));

CREATE POLICY "companies_delete" ON public.companies
  FOR DELETE TO authenticated
  USING ((SELECT user_has_permission('companies', 'delete')));

-- ─── projects ────────────────────────────────────────────────
CREATE POLICY "projects_read" ON public.projects
  FOR SELECT TO authenticated
  USING ((SELECT user_has_permission('projects', 'view')));

CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT user_has_permission('projects', 'create')));

CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING ((SELECT user_has_permission('projects', 'edit')))
  WITH CHECK ((SELECT user_has_permission('projects', 'edit')));

CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE TO authenticated
  USING ((SELECT user_has_permission('projects', 'delete')));

-- ─── transfer_procedures ─────────────────────────────────────
CREATE POLICY "transfer_procedures_read" ON public.transfer_procedures
  FOR SELECT TO authenticated
  USING ((SELECT user_has_permission('transferProcedures', 'view')));

CREATE POLICY "transfer_procedures_insert" ON public.transfer_procedures
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT user_has_permission('transferProcedures', 'create')));

CREATE POLICY "transfer_procedures_update" ON public.transfer_procedures
  FOR UPDATE TO authenticated
  USING ((SELECT user_has_permission('transferProcedures', 'edit')))
  WITH CHECK ((SELECT user_has_permission('transferProcedures', 'edit')));

CREATE POLICY "transfer_procedures_delete" ON public.transfer_procedures
  FOR DELETE TO authenticated
  USING ((SELECT user_has_permission('transferProcedures', 'delete')));

-- ─── payroll tables: read-only for non-admin, admin via UHP bypass ───────────
-- payroll section only has view/export actions → mutations locked to admin

CREATE POLICY "payroll_runs_read" ON public.payroll_runs
  FOR SELECT TO authenticated
  USING ((SELECT user_has_permission('payroll', 'view')));

CREATE POLICY "payroll_runs_write" ON public.payroll_runs
  FOR ALL TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "payroll_entries_read" ON public.payroll_entries
  FOR SELECT TO authenticated
  USING ((SELECT user_has_permission('payroll', 'view')));

CREATE POLICY "payroll_entries_write" ON public.payroll_entries
  FOR ALL TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "payroll_entry_components_read" ON public.payroll_entry_components
  FOR SELECT TO authenticated
  USING ((SELECT user_has_permission('payroll', 'view')));

CREATE POLICY "payroll_entry_components_write" ON public.payroll_entry_components
  FOR ALL TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "payroll_slips_read" ON public.payroll_slips
  FOR SELECT TO authenticated
  USING ((SELECT user_has_permission('payroll', 'view')));

CREATE POLICY "payroll_slips_write" ON public.payroll_slips
  FOR ALL TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "obligation_headers_read" ON public.employee_obligation_headers
  FOR SELECT TO authenticated
  USING ((SELECT user_has_permission('payroll', 'view')));

CREATE POLICY "obligation_headers_write" ON public.employee_obligation_headers
  FOR ALL TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "obligation_lines_read" ON public.employee_obligation_lines
  FOR SELECT TO authenticated
  USING ((SELECT user_has_permission('payroll', 'view')));

CREATE POLICY "obligation_lines_write" ON public.employee_obligation_lines
  FOR ALL TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));
