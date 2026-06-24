-- 076: DB security + performance hardening (safe group)
-- DB-only | idempotent | reversible | zero data writes
-- مطابق لـ supabase/migrations/20260623_076_db_security_perf_hardening.sql
-- التحقق الفعلي من تعريفات DB الحيّة: 2026-06-23

-- =====================================================================
-- US1 (FR-001/FR-002): تثبيت search_path على 5 دوال داخلية
-- ALTER FUNCTION ... SET فقط — لا تغيير جسم أي دالة.
-- pg_temp إلزامي (generate_expiry_notifications تستخدم TEMP TABLE).
-- =====================================================================
ALTER FUNCTION public.set_updated_at()                    SET search_path = public, pg_temp;
ALTER FUNCTION public.activity_log_set_actor()            SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_payroll_entry_fill_project_id()  SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_obligation_header_auto_complete() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_expiry_notifications()     SET search_path = public, pg_temp;

-- =====================================================================
-- US2 (FR-003/FR-004): تحسين أداء سياستَي الإدخال (initplan)
-- لفّ auth.uid() بـ (select auth.uid()) — نفس الأدوار/الأمر/الشرط المنطقي.
-- =====================================================================
DROP POLICY IF EXISTS activity_log_insert ON public.activity_log;
CREATE POLICY activity_log_insert ON public.activity_log
  FOR INSERT TO public
  WITH CHECK (
    (NOT (user_id IS DISTINCT FROM (select auth.uid())))
    OR ((select auth.uid()) IS NULL)
  );

DROP POLICY IF EXISTS audit_log_self_insert ON public.audit_log;
CREATE POLICY audit_log_self_insert ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================================
-- US3 (FR-005): فهارس مغطّية للمفاتيح الأجنبية الأربعة
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_adhkar_created_by             ON public.adhkar(created_by);
CREATE INDEX IF NOT EXISTS idx_employee_leaves_created_by    ON public.employee_leaves(created_by);
CREATE INDEX IF NOT EXISTS idx_restore_history_backup_id     ON public.restore_history(backup_id);
CREATE INDEX IF NOT EXISTS idx_restore_history_snapshot_id   ON public.restore_history(snapshot_id);

-- =====================================================================
-- ROLLBACK (مرجعي — لا يُنفَّذ مع الـ migration) — SC-007
-- =====================================================================
-- BEGIN;
-- ALTER FUNCTION public.set_updated_at()                    RESET search_path;
-- ALTER FUNCTION public.activity_log_set_actor()            RESET search_path;
-- ALTER FUNCTION public.fn_payroll_entry_fill_project_id()  RESET search_path;
-- ALTER FUNCTION public.fn_obligation_header_auto_complete() RESET search_path;
-- ALTER FUNCTION public.generate_expiry_notifications()     RESET search_path;
-- DROP POLICY IF EXISTS activity_log_insert ON public.activity_log;
-- CREATE POLICY activity_log_insert ON public.activity_log FOR INSERT TO public
--   WITH CHECK ((NOT (user_id IS DISTINCT FROM auth.uid())) OR (auth.uid() IS NULL));
-- DROP POLICY IF EXISTS audit_log_self_insert ON public.audit_log;
-- CREATE POLICY audit_log_self_insert ON public.audit_log FOR INSERT TO authenticated
--   WITH CHECK (user_id = auth.uid());
-- DROP INDEX IF EXISTS public.idx_adhkar_created_by;
-- DROP INDEX IF EXISTS public.idx_employee_leaves_created_by;
-- DROP INDEX IF EXISTS public.idx_restore_history_backup_id;
-- DROP INDEX IF EXISTS public.idx_restore_history_snapshot_id;
-- COMMIT;
