-- When soft-deleting employees, also remove their snoozed and read alerts.
-- Alert IDs have format: <type>_<employee_uuid>_<date>
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

  -- Clean up snoozed and read alerts for deleted employees
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
  'Soft-deletes employees preserving payroll/obligation history. Also cleans up snoozed and read alerts.';
