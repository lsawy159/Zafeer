-- 043: Preview RPC for bulk employee delete.
-- Args go in POST body via supabase.rpc() → no URL length limit.
CREATE OR REPLACE FUNCTION public.bulk_delete_employee_preview(p_employee_ids uuid[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF p_employee_ids IS NULL OR cardinality(p_employee_ids) = 0 THEN
    RETURN json_build_object(
      'totalPayrollEntries', 0,
      'totalExtractLines', 0,
      'obligationHeaders', '[]'::json
    );
  END IF;

  IF NOT public.user_has_permission('employees', 'delete') THEN
    RAISE EXCEPTION 'Employee delete permission required'
      USING ERRCODE = '42501';
  END IF;

  RETURN json_build_object(
    'totalPayrollEntries',
      (SELECT COUNT(*) FROM public.payroll_entries WHERE employee_id = ANY(p_employee_ids)),
    'totalExtractLines',
      (SELECT COUNT(*) FROM public.extract_invoice_lines WHERE employee_id = ANY(p_employee_ids)),
    'obligationHeaders',
      COALESCE(
        (SELECT json_agg(row_to_json(h))
         FROM (
           SELECT id, employee_id, obligation_type, title,
                  total_amount, currency_code, status
           FROM public.employee_obligation_headers
           WHERE employee_id = ANY(p_employee_ids)
         ) h
        ),
        '[]'::json
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.bulk_delete_employee_preview(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bulk_delete_employee_preview(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.bulk_delete_employee_preview(uuid[]) TO authenticated;

COMMENT ON FUNCTION public.bulk_delete_employee_preview(uuid[]) IS
  'Returns preview counts (payroll entries, extract lines) and obligation headers for bulk employee delete. Args in POST body → no URL length limit.';
