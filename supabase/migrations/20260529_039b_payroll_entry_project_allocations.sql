-- 039b: جدول توزيع تكاليف الموظف على أكثر من مشروع
CREATE TABLE IF NOT EXISTS payroll_entry_project_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_entry_id UUID NOT NULL REFERENCES payroll_entries(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id),
  days_allocated NUMERIC(6,2) NOT NULL CHECK (days_allocated > 0),
  allocated_cost NUMERIC(12,2) NOT NULL CHECK (allocated_cost >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(payroll_entry_id, project_id)
);

-- DB trigger للـ invariant (C4): SUM يجب = gross_amount و attendance_days
CREATE OR REPLACE FUNCTION check_allocation_invariant()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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

CREATE CONSTRAINT TRIGGER trg_allocation_invariant
  AFTER INSERT OR UPDATE ON payroll_entry_project_allocations
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_allocation_invariant();

-- RLS
ALTER TABLE payroll_entry_project_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_payroll_allocations" ON payroll_entry_project_allocations
  FOR SELECT USING (user_has_permission('payroll', 'view'));

CREATE POLICY "manage_payroll_allocations" ON payroll_entry_project_allocations
  FOR ALL USING (is_admin());

-- Index للأداء
CREATE INDEX IF NOT EXISTS idx_payroll_allocations_project
  ON payroll_entry_project_allocations(project_id, payroll_entry_id);
