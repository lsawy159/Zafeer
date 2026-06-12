-- 055b: trigger يحوّل header obligation لـ completed لما كل lines تتسدد
-- السبب: لم يكن هناك آلية تلقائية لتحديث status الـ header

CREATE OR REPLACE FUNCTION fn_obligation_header_auto_complete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_total   INT;
  v_paid    INT;
BEGIN
  -- احسب إجمالي الـ lines وعدد المسدد منها على نفس الـ header
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE line_status = 'paid')
  INTO v_total, v_paid
  FROM employee_obligation_lines
  WHERE header_id = NEW.header_id
    AND line_status != 'cancelled';

  -- لو كل الـ lines مسددة → حوّل الـ header لـ completed
  IF v_total > 0 AND v_total = v_paid THEN
    UPDATE employee_obligation_headers
    SET status = 'completed'
    WHERE id = NEW.header_id
      AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_obligation_auto_complete ON employee_obligation_lines;

CREATE TRIGGER trg_obligation_auto_complete
  AFTER INSERT OR UPDATE OF line_status ON employee_obligation_lines
  FOR EACH ROW
  EXECUTE FUNCTION fn_obligation_header_auto_complete();

-- backfill: headers موجودة كل lines تبعها مسددة → حوّلها completed
UPDATE employee_obligation_headers h
SET status = 'completed'
WHERE h.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM employee_obligation_lines l
    WHERE l.header_id = h.id
      AND l.line_status != 'paid'
      AND l.line_status != 'cancelled'
  )
  AND EXISTS (
    SELECT 1 FROM employee_obligation_lines l
    WHERE l.header_id = h.id
      AND l.line_status = 'paid'
  );
