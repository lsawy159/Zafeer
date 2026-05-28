-- 039c: index لأداء CashPositionPanel على employee_obligation_lines
CREATE INDEX IF NOT EXISTS idx_obligation_lines_due_month_status
  ON employee_obligation_lines(due_month, line_status);
