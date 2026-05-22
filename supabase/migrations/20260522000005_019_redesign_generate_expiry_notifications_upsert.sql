-- T037: Redesign generate_expiry_notifications() to UPSERT design
-- One notification per (entity_type, entity_id, type), updated daily.
-- Preserves snoozed_until + is_deferred on conflict (not in DO UPDATE).

CREATE OR REPLACE FUNCTION generate_expiry_notifications()
RETURNS SETOF notifications
LANGUAGE plpgsql
AS $$
DECLARE
  v_today date := CURRENT_DATE;
BEGIN

  -- ─── EMPLOYEES: residence_expiry ─────────────────────────────────────────
  INSERT INTO notifications (type, title, message, entity_type, entity_id, priority, days_remaining, target_date)
  SELECT
    'residence_expiry',
    'إقامة موظف على وشك الانتهاء',
    'إقامة الموظف ' || e.name || ' ستنتهي خلال ' || (e.residence_expiry - v_today) || ' يوم',
    'employee', e.id,
    CASE WHEN (e.residence_expiry - v_today) <= 7  THEN 'critical'
         WHEN (e.residence_expiry - v_today) <= 14 THEN 'high'
         WHEN (e.residence_expiry - v_today) <= 30 THEN 'medium'
         ELSE 'low' END,
    (e.residence_expiry - v_today),
    e.residence_expiry
  FROM employees e
  WHERE e.is_deleted = false
    AND e.residence_expiry IS NOT NULL
    AND (e.residence_expiry - v_today) BETWEEN 0 AND 60
  ON CONFLICT (entity_type, entity_id, type) DO UPDATE SET
    title = EXCLUDED.title,
    message = EXCLUDED.message,
    priority = EXCLUDED.priority,
    days_remaining = EXCLUDED.days_remaining,
    target_date = EXCLUDED.target_date,
    is_archived = false;

  UPDATE notifications SET is_archived = true
  WHERE type = 'residence_expiry' AND entity_type = 'employee' AND is_archived = false
    AND entity_id NOT IN (
      SELECT e.id FROM employees e
      WHERE e.is_deleted = false AND e.residence_expiry IS NOT NULL
        AND (e.residence_expiry - v_today) BETWEEN 0 AND 60
    );

  -- ─── EMPLOYEES: contract_expiry ──────────────────────────────────────────
  INSERT INTO notifications (type, title, message, entity_type, entity_id, priority, days_remaining, target_date)
  SELECT
    'contract_expiry',
    'عقد موظف على وشك الانتهاء',
    'عقد الموظف ' || e.name || ' سينتهي خلال ' || (e.contract_expiry - v_today) || ' يوم',
    'employee', e.id,
    CASE WHEN (e.contract_expiry - v_today) <= 7  THEN 'critical'
         WHEN (e.contract_expiry - v_today) <= 14 THEN 'high'
         WHEN (e.contract_expiry - v_today) <= 30 THEN 'medium'
         ELSE 'low' END,
    (e.contract_expiry - v_today),
    e.contract_expiry
  FROM employees e
  WHERE e.is_deleted = false
    AND e.contract_expiry IS NOT NULL
    AND (e.contract_expiry - v_today) BETWEEN 0 AND 60
  ON CONFLICT (entity_type, entity_id, type) DO UPDATE SET
    title = EXCLUDED.title,
    message = EXCLUDED.message,
    priority = EXCLUDED.priority,
    days_remaining = EXCLUDED.days_remaining,
    target_date = EXCLUDED.target_date,
    is_archived = false;

  UPDATE notifications SET is_archived = true
  WHERE type = 'contract_expiry' AND entity_type = 'employee' AND is_archived = false
    AND entity_id NOT IN (
      SELECT e.id FROM employees e
      WHERE e.is_deleted = false AND e.contract_expiry IS NOT NULL
        AND (e.contract_expiry - v_today) BETWEEN 0 AND 60
    );

  -- ─── EMPLOYEES: health_insurance_expiry ──────────────────────────────────
  INSERT INTO notifications (type, title, message, entity_type, entity_id, priority, days_remaining, target_date)
  SELECT
    'health_insurance_expiry',
    'تأمين صحي على وشك الانتهاء',
    'التأمين الصحي للموظف ' || e.name || ' سينتهي خلال ' || (e.health_insurance_expiry - v_today) || ' يوم',
    'employee', e.id,
    CASE WHEN (e.health_insurance_expiry - v_today) <= 7  THEN 'critical'
         WHEN (e.health_insurance_expiry - v_today) <= 14 THEN 'high'
         WHEN (e.health_insurance_expiry - v_today) <= 30 THEN 'medium'
         ELSE 'low' END,
    (e.health_insurance_expiry - v_today),
    e.health_insurance_expiry
  FROM employees e
  WHERE e.is_deleted = false
    AND e.health_insurance_expiry IS NOT NULL
    AND (e.health_insurance_expiry - v_today) BETWEEN 0 AND 60
  ON CONFLICT (entity_type, entity_id, type) DO UPDATE SET
    title = EXCLUDED.title,
    message = EXCLUDED.message,
    priority = EXCLUDED.priority,
    days_remaining = EXCLUDED.days_remaining,
    target_date = EXCLUDED.target_date,
    is_archived = false;

  UPDATE notifications SET is_archived = true
  WHERE type = 'health_insurance_expiry' AND entity_type = 'employee' AND is_archived = false
    AND entity_id NOT IN (
      SELECT e.id FROM employees e
      WHERE e.is_deleted = false AND e.health_insurance_expiry IS NOT NULL
        AND (e.health_insurance_expiry - v_today) BETWEEN 0 AND 60
    );

  -- ─── COMPANIES: commercial_registration_expiry ───────────────────────────
  INSERT INTO notifications (type, title, message, entity_type, entity_id, priority, days_remaining, target_date)
  SELECT
    'commercial_registration_expiry',
    'سجل تجاري على وشك الانتهاء',
    'السجل التجاري للمؤسسة ' || c.name || ' سينتهي خلال ' || (c.commercial_registration_expiry::date - v_today) || ' يوم',
    'company', c.id,
    CASE WHEN (c.commercial_registration_expiry::date - v_today) <= 7  THEN 'critical'
         WHEN (c.commercial_registration_expiry::date - v_today) <= 14 THEN 'high'
         WHEN (c.commercial_registration_expiry::date - v_today) <= 30 THEN 'medium'
         ELSE 'low' END,
    (c.commercial_registration_expiry::date - v_today),
    c.commercial_registration_expiry::date
  FROM companies c
  WHERE c.commercial_registration_expiry IS NOT NULL
    AND (c.commercial_registration_expiry::date - v_today) BETWEEN 0 AND 60
  ON CONFLICT (entity_type, entity_id, type) DO UPDATE SET
    title = EXCLUDED.title,
    message = EXCLUDED.message,
    priority = EXCLUDED.priority,
    days_remaining = EXCLUDED.days_remaining,
    target_date = EXCLUDED.target_date,
    is_archived = false;

  UPDATE notifications SET is_archived = true
  WHERE type = 'commercial_registration_expiry' AND entity_type = 'company' AND is_archived = false
    AND entity_id NOT IN (
      SELECT c.id FROM companies c
      WHERE c.commercial_registration_expiry IS NOT NULL
        AND (c.commercial_registration_expiry::date - v_today) BETWEEN 0 AND 60
    );

  RETURN QUERY
    SELECT * FROM notifications
    WHERE is_archived = false
    ORDER BY
      CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      days_remaining ASC NULLS LAST;
END;
$$;
