CREATE OR REPLACE FUNCTION upsert_payroll_allocations(
  p_entry_id   UUID,
  p_rows       JSONB    -- [{project_id, days_allocated, allocated_cost, notes?}]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_project_ids UUID[];
BEGIN
  -- استخراج project_ids الجديدة
  SELECT ARRAY(SELECT (elem->>'project_id')::UUID FROM jsonb_array_elements(p_rows) AS elem)
  INTO v_next_project_ids;

  -- حذف الصفوف القديمة غير الموجودة في المجموعة الجديدة
  -- ملاحظة: p_rows=[] → v_next_project_ids='{}' → يحذف الكل (مقصود: مسح allocations)
  DELETE FROM payroll_entry_project_allocations
  WHERE payroll_entry_id = p_entry_id
    AND project_id <> ALL(v_next_project_ids);

  -- upsert الصفوف الجديدة/المحدَّثة (no-op إذا كان p_rows فارغاً)
  INSERT INTO payroll_entry_project_allocations
    (payroll_entry_id, project_id, days_allocated, allocated_cost, notes)
  SELECT
    p_entry_id,
    (elem->>'project_id')::UUID,
    (elem->>'days_allocated')::NUMERIC,
    (elem->>'allocated_cost')::NUMERIC,
    elem->>'notes'
  FROM jsonb_array_elements(p_rows) AS elem
  ON CONFLICT (payroll_entry_id, project_id)
  DO UPDATE SET
    days_allocated = EXCLUDED.days_allocated,
    allocated_cost = EXCLUDED.allocated_cost,
    notes         = EXCLUDED.notes,
    updated_at    = now();
  -- الـ DEFERRABLE trigger يُفعَّل عند COMMIT هذه الـ transaction الواحدة
  -- ملاحظة: trigger يُفعَّل على INSERT/UPDATE فقط — مسار المسح الكامل (p_rows=[])
  -- لا trigger بعد DELETE الخالص، لكن الحالة النهائية (فارغة) صالحة بطبيعتها
END;
$$;

-- RLS: نفس صلاحيات manage_payroll_allocations في 039b
GRANT EXECUTE ON FUNCTION upsert_payroll_allocations(UUID, JSONB) TO authenticated;
REVOKE EXECUTE ON FUNCTION upsert_payroll_allocations(UUID, JSONB) FROM anon;
