-- 055a: trigger يملأ project_id تلقائياً من payroll_runs عند إضافة/تعديل payroll_entries
-- السبب: mutation الـ frontend لا يرسل project_id، فالـ view v_project_month_pnl تحسب تكلفة = 0

CREATE OR REPLACE FUNCTION fn_payroll_entry_fill_project_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- إذا project_id فارغ → اجلبه من الـ run إن كان scope_type = 'project'
  IF NEW.project_id IS NULL THEN
    SELECT CASE WHEN pr.scope_type = 'project' THEN pr.scope_id ELSE NULL END
    INTO NEW.project_id
    FROM payroll_runs pr
    WHERE pr.id = NEW.payroll_run_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payroll_entry_fill_project_id ON payroll_entries;

CREATE TRIGGER trg_payroll_entry_fill_project_id
  BEFORE INSERT OR UPDATE OF payroll_run_id ON payroll_entries
  FOR EACH ROW
  EXECUTE FUNCTION fn_payroll_entry_fill_project_id();

-- backfill للإدخالات الموجودة التي project_id فيها NULL
UPDATE payroll_entries pe
SET project_id = pr.scope_id
FROM payroll_runs pr
WHERE pe.payroll_run_id = pr.id
  AND pr.scope_type = 'project'
  AND pe.project_id IS NULL;
