-- 021: Soft-delete employees through a permission-checked RPC.
-- Employee rows are kept because payroll and obligation history reference them.

CREATE OR REPLACE FUNCTION public.soft_delete_employees(p_employee_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_deleted_count integer := 0;
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
  RETURN v_deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_employees(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_employees(uuid[]) TO authenticated;

COMMENT ON FUNCTION public.soft_delete_employees(uuid[]) IS
  'Soft-deletes employees using employees.delete permission while preserving referenced payroll and obligation history.';
