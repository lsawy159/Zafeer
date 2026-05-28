-- 039d: v_project_month_pnl — تقرير الإيرادات والتكاليف والهامش لكل مشروع/شهر
-- المصدر المعتمد الوحيد: T008 في tasks.md
CREATE OR REPLACE VIEW v_project_month_pnl WITH (security_invoker = on) AS
WITH
-- CTE 1: إيرادات من المستخلصات (بمعزل تام)
revenue_cte AS (
  SELECT ei.project_id,
         ei.period_month,
         SUM(eil.amount) AS total_revenue
  FROM extract_invoices ei
  JOIN extract_invoice_lines eil ON eil.invoice_id = ei.id
  GROUP BY ei.project_id, ei.period_month
),
-- CTE 2: تكاليف العمالة — حالتان (FR-017)
-- فرع 1: موظف في مشروع واحد (لا سجل في allocations)
-- فرع 2: موظف موزَّع على أكثر من مشروع (سجلات في allocations)
labor_rows AS (
  SELECT pe.project_id,
         pr.payroll_month,
         pe.employee_id,
         pe.gross_amount         AS cost,
         pe.attendance_days::numeric AS payroll_days,
         pe.daily_rate_snapshot
  FROM payroll_entries pe
  JOIN payroll_runs pr ON pr.id = pe.payroll_run_id
  WHERE pe.project_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM payroll_entry_project_allocations pea
      WHERE pea.payroll_entry_id = pe.id
    )
  UNION ALL
  SELECT pea.project_id,
         pr.payroll_month,
         pe.employee_id,
         pea.allocated_cost      AS cost,
         pea.days_allocated      AS payroll_days,
         pe.daily_rate_snapshot
  FROM payroll_entry_project_allocations pea
  JOIN payroll_entries pe ON pe.id = pea.payroll_entry_id
  JOIN payroll_runs pr ON pr.id = pe.payroll_run_id
),
-- CTE 3: تجميع التكاليف + حساب الأيام المهدرة عبر LATERAL
-- LATERAL مقيَّد صراحةً بـ (employee_id + project_id + period_month) — H5
labor_cte AS (
  SELECT lr.project_id,
         lr.payroll_month,
         SUM(lr.cost) AS total_labor_cost,
         SUM(GREATEST(lr.payroll_days - COALESCE(ext.extract_days, 0), 0)) AS unbillable_days,
         SUM(lr.daily_rate_snapshot::numeric * GREATEST(lr.payroll_days - COALESCE(ext.extract_days, 0), 0)) AS unbillable_cost
  FROM labor_rows lr
  LEFT JOIN LATERAL (
    SELECT SUM(eil2.attendance_days) AS extract_days
    FROM extract_invoice_lines eil2
    JOIN extract_invoices ei2 ON ei2.id = eil2.invoice_id
    WHERE eil2.employee_id = lr.employee_id
      AND ei2.project_id  = lr.project_id
      AND ei2.period_month = lr.payroll_month
  ) ext ON true
  GROUP BY lr.project_id, lr.payroll_month
)
-- Final: FULL OUTER JOIN بعد التجميع (لا قبله) — يمنع Cartesian Product
-- يُظهر مشاريع بها رواتب فقط (هامش سالب) + مشاريع بها مستخلصات فقط (C3)
SELECT
  COALESCE(r.project_id, l.project_id) AS project_id,
  p.name AS project_name,
  COALESCE(r.period_month, l.payroll_month) AS period_month,
  COALESCE(r.total_revenue, 0) AS revenue,
  COALESCE(l.total_labor_cost, 0) AS labor_cost,
  COALESCE(r.total_revenue, 0) - COALESCE(l.total_labor_cost, 0) AS margin,
  CASE WHEN COALESCE(r.total_revenue, 0) > 0
       THEN ROUND(
         (COALESCE(r.total_revenue, 0) - COALESCE(l.total_labor_cost, 0))
         / COALESCE(r.total_revenue, 0) * 100, 2)
       ELSE NULL END AS margin_pct,
  COALESCE(l.unbillable_days, 0) AS unbillable_days,
  COALESCE(l.unbillable_cost, 0) AS unbillable_cost
FROM revenue_cte r
FULL OUTER JOIN labor_cte l
  ON r.project_id = l.project_id AND r.period_month = l.payroll_month
LEFT JOIN projects p ON p.id = COALESCE(r.project_id, l.project_id)
-- SC-004: security_invoker وحده يُورِّث RLS من payroll/extracts وليس من revenue
-- هذا الفلتر يضمن: مستخدم بدون revenue.view → 0 صفوف (يُطبَّق بعد FULL OUTER JOIN)
WHERE user_has_permission('revenue', 'view');
