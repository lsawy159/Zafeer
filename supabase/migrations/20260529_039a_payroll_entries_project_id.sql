-- 039a: إضافة project_id لـ payroll_entries + backfill من payroll_runs
ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

CREATE INDEX IF NOT EXISTS idx_payroll_entries_project_month
  ON payroll_entries(project_id, payroll_run_id);

-- backfill: إدخالات مسيرات نوعها 'project' تحصل على project_id مباشرة
UPDATE payroll_entries pe
SET project_id = pr.scope_id
FROM payroll_runs pr
WHERE pe.payroll_run_id = pr.id
  AND pr.scope_type = 'project'
  AND pe.project_id IS NULL;
-- الصفوف ذات scope_type != 'project' تبقى NULL — متعمَّد
