-- إصلاح: إضافة SET search_path = public لمنع security_mutable_search_path warning
-- الجسم مطابق تماماً للـ function في 039b — تغيير السطر الواحد فقط
CREATE OR REPLACE FUNCTION check_allocation_invariant()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public   -- ← الإضافة الوحيدة
AS $$
DECLARE
  pe RECORD;
  total_cost NUMERIC;
  total_days NUMERIC;
BEGIN
  SELECT gross_amount, attendance_days INTO pe
  FROM payroll_entries WHERE id = NEW.payroll_entry_id;

  SELECT COALESCE(SUM(allocated_cost), 0), COALESCE(SUM(days_allocated), 0)
    INTO total_cost, total_days
  FROM payroll_entry_project_allocations
  WHERE payroll_entry_id = NEW.payroll_entry_id;

  IF ABS(total_cost - pe.gross_amount::NUMERIC) > 0.01 THEN
    RAISE EXCEPTION 'allocated_cost sum (%) != gross_amount (%)', total_cost, pe.gross_amount;
  END IF;
  IF ABS(total_days - pe.attendance_days::NUMERIC) > 0.01 THEN
    RAISE EXCEPTION 'days_allocated sum (%) != attendance_days (%)', total_days, pe.attendance_days;
  END IF;
  RETURN NEW;
END $$;
