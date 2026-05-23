-- Make generated in-app notifications use system_settings.notification_thresholds.
-- This keeps /alerts, /notifications, CSV reports, and company status on one threshold source.

CREATE OR REPLACE FUNCTION generate_expiry_notifications()
RETURNS SETOF notifications
LANGUAGE plpgsql
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_thresholds jsonb;
  v_types text[] := ARRAY[
    'residence_expiry',
    'contract_expiry',
    'health_insurance_expiry',
    'hired_worker_contract_expiry',
    'commercial_registration_expiry',
    'power_subscription_expiry',
    'moqeem_subscription_expiry'
  ];

  v_residence_urgent int := 7;
  v_residence_high int := 15;
  v_residence_medium int := 30;
  v_contract_urgent int := 7;
  v_contract_high int := 15;
  v_contract_medium int := 30;
  v_health_urgent int := 30;
  v_health_high int := 45;
  v_health_medium int := 60;
  v_hired_urgent int := 7;
  v_hired_high int := 15;
  v_hired_medium int := 30;
  v_commercial_urgent int := 7;
  v_commercial_high int := 15;
  v_commercial_medium int := 30;
  v_power_urgent int := 7;
  v_power_high int := 15;
  v_power_medium int := 30;
  v_moqeem_urgent int := 7;
  v_moqeem_high int := 15;
  v_moqeem_medium int := 30;
BEGIN
  SELECT setting_value
  INTO v_thresholds
  FROM system_settings
  WHERE setting_key = 'notification_thresholds'
  LIMIT 1;

  v_thresholds := COALESCE(v_thresholds, '{}'::jsonb);

  v_residence_urgent := COALESCE(NULLIF(v_thresholds ->> 'residence_urgent_days', '')::int, v_residence_urgent);
  v_residence_high := COALESCE(NULLIF(v_thresholds ->> 'residence_high_days', '')::int, v_residence_high);
  v_residence_medium := COALESCE(NULLIF(v_thresholds ->> 'residence_medium_days', '')::int, v_residence_medium);
  v_contract_urgent := COALESCE(NULLIF(v_thresholds ->> 'contract_urgent_days', '')::int, v_contract_urgent);
  v_contract_high := COALESCE(NULLIF(v_thresholds ->> 'contract_high_days', '')::int, v_contract_high);
  v_contract_medium := COALESCE(NULLIF(v_thresholds ->> 'contract_medium_days', '')::int, v_contract_medium);
  v_health_urgent := COALESCE(NULLIF(v_thresholds ->> 'health_insurance_urgent_days', '')::int, v_health_urgent);
  v_health_high := COALESCE(NULLIF(v_thresholds ->> 'health_insurance_high_days', '')::int, v_health_high);
  v_health_medium := COALESCE(NULLIF(v_thresholds ->> 'health_insurance_medium_days', '')::int, v_health_medium);
  v_hired_urgent := COALESCE(NULLIF(v_thresholds ->> 'hired_worker_contract_urgent_days', '')::int, v_contract_urgent);
  v_hired_high := COALESCE(NULLIF(v_thresholds ->> 'hired_worker_contract_high_days', '')::int, v_contract_high);
  v_hired_medium := COALESCE(NULLIF(v_thresholds ->> 'hired_worker_contract_medium_days', '')::int, v_contract_medium);
  v_commercial_urgent := COALESCE(NULLIF(v_thresholds ->> 'commercial_reg_urgent_days', '')::int, v_commercial_urgent);
  v_commercial_high := COALESCE(NULLIF(v_thresholds ->> 'commercial_reg_high_days', '')::int, v_commercial_high);
  v_commercial_medium := COALESCE(NULLIF(v_thresholds ->> 'commercial_reg_medium_days', '')::int, v_commercial_medium);
  v_power_urgent := COALESCE(NULLIF(v_thresholds ->> 'power_subscription_urgent_days', '')::int, v_commercial_urgent);
  v_power_high := COALESCE(NULLIF(v_thresholds ->> 'power_subscription_high_days', '')::int, v_commercial_high);
  v_power_medium := COALESCE(NULLIF(v_thresholds ->> 'power_subscription_medium_days', '')::int, v_commercial_medium);
  v_moqeem_urgent := COALESCE(NULLIF(v_thresholds ->> 'moqeem_subscription_urgent_days', '')::int, v_commercial_urgent);
  v_moqeem_high := COALESCE(NULLIF(v_thresholds ->> 'moqeem_subscription_high_days', '')::int, v_commercial_high);
  v_moqeem_medium := COALESCE(NULLIF(v_thresholds ->> 'moqeem_subscription_medium_days', '')::int, v_commercial_medium);

  DROP TABLE IF EXISTS expiry_notification_candidates;

  CREATE TEMP TABLE expiry_notification_candidates (
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    priority text NOT NULL,
    days_remaining int NOT NULL,
    target_date date NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO expiry_notification_candidates
  SELECT
    'residence_expiry',
    'إقامة موظف على وشك الانتهاء',
    CASE WHEN days_remaining < 0
      THEN 'انتهت إقامة الموظف ' || name || ' منذ ' || ABS(days_remaining) || ' يوم'
      ELSE 'إقامة الموظف ' || name || ' ستنتهي خلال ' || days_remaining || ' يوم'
    END,
    'employee',
    id,
    CASE WHEN days_remaining <= v_residence_urgent THEN 'critical'
         WHEN days_remaining <= v_residence_high THEN 'high'
         WHEN days_remaining <= v_residence_medium THEN 'medium'
         ELSE 'low' END,
    days_remaining,
    target_date
  FROM (
    SELECT e.id, e.name, e.residence_expiry AS target_date, (e.residence_expiry - v_today) AS days_remaining
    FROM employees e
    WHERE e.is_deleted = false AND e.residence_expiry IS NOT NULL
  ) s
  WHERE days_remaining <= v_residence_medium;

  INSERT INTO expiry_notification_candidates
  SELECT
    'contract_expiry',
    'عقد موظف على وشك الانتهاء',
    CASE WHEN days_remaining < 0
      THEN 'انتهى عقد الموظف ' || name || ' منذ ' || ABS(days_remaining) || ' يوم'
      ELSE 'عقد الموظف ' || name || ' سينتهي خلال ' || days_remaining || ' يوم'
    END,
    'employee',
    id,
    CASE WHEN days_remaining <= v_contract_urgent THEN 'critical'
         WHEN days_remaining <= v_contract_high THEN 'high'
         WHEN days_remaining <= v_contract_medium THEN 'medium'
         ELSE 'low' END,
    days_remaining,
    target_date
  FROM (
    SELECT e.id, e.name, e.contract_expiry AS target_date, (e.contract_expiry - v_today) AS days_remaining
    FROM employees e
    WHERE e.is_deleted = false AND e.contract_expiry IS NOT NULL
  ) s
  WHERE days_remaining <= v_contract_medium;

  INSERT INTO expiry_notification_candidates
  SELECT
    'health_insurance_expiry',
    'تأمين صحي على وشك الانتهاء',
    CASE WHEN days_remaining < 0
      THEN 'انتهى التأمين الصحي للموظف ' || name || ' منذ ' || ABS(days_remaining) || ' يوم'
      ELSE 'التأمين الصحي للموظف ' || name || ' سينتهي خلال ' || days_remaining || ' يوم'
    END,
    'employee',
    id,
    CASE WHEN days_remaining <= v_health_urgent THEN 'critical'
         WHEN days_remaining <= v_health_high THEN 'high'
         WHEN days_remaining <= v_health_medium THEN 'medium'
         ELSE 'low' END,
    days_remaining,
    target_date
  FROM (
    SELECT e.id, e.name, e.health_insurance_expiry AS target_date, (e.health_insurance_expiry - v_today) AS days_remaining
    FROM employees e
    WHERE e.is_deleted = false AND e.health_insurance_expiry IS NOT NULL
  ) s
  WHERE days_remaining <= v_health_medium;

  INSERT INTO expiry_notification_candidates
  SELECT
    'hired_worker_contract_expiry',
    'عقد أجير على وشك الانتهاء',
    CASE WHEN days_remaining < 0
      THEN 'انتهى عقد أجير للموظف ' || name || ' منذ ' || ABS(days_remaining) || ' يوم'
      ELSE 'عقد أجير للموظف ' || name || ' سينتهي خلال ' || days_remaining || ' يوم'
    END,
    'employee',
    id,
    CASE WHEN days_remaining <= v_hired_urgent THEN 'critical'
         WHEN days_remaining <= v_hired_high THEN 'high'
         WHEN days_remaining <= v_hired_medium THEN 'medium'
         ELSE 'low' END,
    days_remaining,
    target_date
  FROM (
    SELECT e.id, e.name, e.hired_worker_contract_expiry AS target_date, (e.hired_worker_contract_expiry - v_today) AS days_remaining
    FROM employees e
    WHERE e.is_deleted = false AND e.hired_worker_contract_expiry IS NOT NULL
  ) s
  WHERE days_remaining <= v_hired_medium;

  INSERT INTO expiry_notification_candidates
  SELECT
    'commercial_registration_expiry',
    'سجل تجاري على وشك الانتهاء',
    CASE WHEN days_remaining < 0
      THEN 'انتهى السجل التجاري للمؤسسة ' || name || ' منذ ' || ABS(days_remaining) || ' يوم'
      ELSE 'السجل التجاري للمؤسسة ' || name || ' سينتهي خلال ' || days_remaining || ' يوم'
    END,
    'company',
    id,
    CASE WHEN days_remaining <= v_commercial_urgent THEN 'critical'
         WHEN days_remaining <= v_commercial_high THEN 'high'
         WHEN days_remaining <= v_commercial_medium THEN 'medium'
         ELSE 'low' END,
    days_remaining,
    target_date
  FROM (
    SELECT c.id, c.name, c.commercial_registration_expiry::date AS target_date, (c.commercial_registration_expiry::date - v_today) AS days_remaining
    FROM companies c
    WHERE c.commercial_registration_expiry IS NOT NULL
  ) s
  WHERE days_remaining <= v_commercial_medium;

  INSERT INTO expiry_notification_candidates
  SELECT
    'power_subscription_expiry',
    'اشتراك قوى على وشك الانتهاء',
    CASE WHEN days_remaining < 0
      THEN 'انتهى اشتراك قوى للمؤسسة ' || name || ' منذ ' || ABS(days_remaining) || ' يوم'
      ELSE 'اشتراك قوى للمؤسسة ' || name || ' سينتهي خلال ' || days_remaining || ' يوم'
    END,
    'company',
    id,
    CASE WHEN days_remaining <= v_power_urgent THEN 'critical'
         WHEN days_remaining <= v_power_high THEN 'high'
         WHEN days_remaining <= v_power_medium THEN 'medium'
         ELSE 'low' END,
    days_remaining,
    target_date
  FROM (
    SELECT c.id, c.name, c.ending_subscription_power_date::date AS target_date, (c.ending_subscription_power_date::date - v_today) AS days_remaining
    FROM companies c
    WHERE c.ending_subscription_power_date IS NOT NULL
  ) s
  WHERE days_remaining <= v_power_medium;

  INSERT INTO expiry_notification_candidates
  SELECT
    'moqeem_subscription_expiry',
    'اشتراك مقيم على وشك الانتهاء',
    CASE WHEN days_remaining < 0
      THEN 'انتهى اشتراك مقيم للمؤسسة ' || name || ' منذ ' || ABS(days_remaining) || ' يوم'
      ELSE 'اشتراك مقيم للمؤسسة ' || name || ' سينتهي خلال ' || days_remaining || ' يوم'
    END,
    'company',
    id,
    CASE WHEN days_remaining <= v_moqeem_urgent THEN 'critical'
         WHEN days_remaining <= v_moqeem_high THEN 'high'
         WHEN days_remaining <= v_moqeem_medium THEN 'medium'
         ELSE 'low' END,
    days_remaining,
    target_date
  FROM (
    SELECT c.id, c.name, c.ending_subscription_moqeem_date::date AS target_date, (c.ending_subscription_moqeem_date::date - v_today) AS days_remaining
    FROM companies c
    WHERE c.ending_subscription_moqeem_date IS NOT NULL
  ) s
  WHERE days_remaining <= v_moqeem_medium;

  INSERT INTO notifications (type, title, message, entity_type, entity_id, priority, days_remaining, target_date)
  SELECT type, title, message, entity_type, entity_id, priority, days_remaining, target_date
  FROM expiry_notification_candidates
  ON CONFLICT (entity_type, entity_id, type) DO UPDATE SET
    title = EXCLUDED.title,
    message = EXCLUDED.message,
    priority = EXCLUDED.priority,
    days_remaining = EXCLUDED.days_remaining,
    target_date = EXCLUDED.target_date,
    is_archived = false;

  UPDATE notifications n
  SET is_archived = true
  WHERE n.is_archived = false
    AND n.type = ANY(v_types)
    AND NOT EXISTS (
      SELECT 1
      FROM expiry_notification_candidates c
      WHERE c.type = n.type
        AND c.entity_type = n.entity_type
        AND c.entity_id = n.entity_id
    );

  RETURN QUERY
    SELECT *
    FROM notifications
    WHERE is_archived = false
    ORDER BY
      CASE priority
        WHEN 'critical' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'high' THEN 3
        WHEN 'medium' THEN 4
        ELSE 5
      END,
      days_remaining ASC NULLS LAST;
END;
$$;
