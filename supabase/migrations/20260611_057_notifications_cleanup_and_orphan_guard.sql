-- =============================================================
-- 057: تحسين تنظيف البيانات اليتيمة
-- 1) تحديث soft_delete_employees: يحذف notifications أيضاً
-- 2) RPC دورية: cleanup_orphaned_notifications
-- 3) pg_cron: تنظيف تلقائي كل أول الشهر
-- =============================================================

-- 1) تحديث soft_delete_employees لتشمل notifications
CREATE OR REPLACE FUNCTION public.soft_delete_employees(p_employee_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_deleted_count integer := 0;
  v_emp_id        uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF p_employee_ids IS NULL OR cardinality(p_employee_ids) = 0 THEN
    RETURN 0;
  END IF;

  IF NOT public.user_has_permission('employees', 'delete') THEN
    RAISE EXCEPTION 'Employee delete permission required'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.employees
     SET is_deleted = true,
         deleted_at = COALESCE(deleted_at, now()),
         updated_at = now()
   WHERE id = ANY(p_employee_ids)
     AND COALESCE(is_deleted, false) = false;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- تنظيف كل البيانات المرتبطة بالموظفين المحذوفين
  DELETE FROM public.notifications
   WHERE entity_type = 'employee'
     AND entity_id = ANY(p_employee_ids);

  FOREACH v_emp_id IN ARRAY p_employee_ids LOOP
    DELETE FROM public.snoozed_alerts
     WHERE alert_id LIKE '%' || v_emp_id::text || '%';

    DELETE FROM public.read_alerts
     WHERE alert_id LIKE '%' || v_emp_id::text || '%';
  END LOOP;

  RETURN v_deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_employees(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_employees(uuid[]) TO authenticated;

COMMENT ON FUNCTION public.soft_delete_employees(uuid[]) IS
  'Soft-deletes employees preserving payroll/obligation history. Cleans up notifications, snoozed_alerts, and read_alerts.';


-- 2) RPC تنظيف يدوي/دوري للبيانات اليتيمة
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_deleted_emp     integer := 0;
  v_deleted_company integer := 0;
BEGIN
  -- حذف إشعارات موظفين مش موجودين
  DELETE FROM public.notifications
   WHERE entity_type = 'employee'
     AND entity_id NOT IN (SELECT id FROM public.employees);
  GET DIAGNOSTICS v_deleted_emp = ROW_COUNT;

  -- حذف إشعارات شركات مش موجودة
  DELETE FROM public.notifications
   WHERE entity_type = 'company'
     AND entity_id NOT IN (SELECT id FROM public.companies);
  GET DIAGNOSTICS v_deleted_company = ROW_COUNT;

  RETURN jsonb_build_object(
    'deleted_employee_notifications', v_deleted_emp,
    'deleted_company_notifications',  v_deleted_company,
    'ran_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_orphaned_notifications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_notifications() TO authenticated;

COMMENT ON FUNCTION public.cleanup_orphaned_notifications() IS
  'يحذف الإشعارات التي لا يوجد لها موظف أو شركة مقابلة. يُشغَّل تلقائياً كل أول الشهر.';


-- 3) pg_cron: تنظيف تلقائي كل أول الشهر الساعة 3 صباحاً
SELECT cron.schedule(
  'cleanup-orphaned-notifications-monthly',
  '0 3 1 * *',
  $$SELECT public.cleanup_orphaned_notifications()$$
);
