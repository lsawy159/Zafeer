-- Migration 060: Backup scheduling
-- Adds: pg_cron jobs + RPCs to wire backup_schedule_* settings into actual execution
-- refresh_next_backup_at: called by frontend after settings save (backupService.ts:140)
-- run_scheduled_backup:   called by cron daily, self-gates on frequency
-- cleanup_old_backups:    called by cron daily, deletes DB rows beyond retention

-- ─── Helper: read one backup setting (strips JSON quotes) ───────────────────
CREATE OR REPLACE FUNCTION public._backup_setting(p_key text)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT btrim(COALESCE(setting_value::text, ''), '"')
  FROM public.system_settings
  WHERE setting_key = p_key
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public._backup_setting(text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public._backup_setting(text) TO service_role;

-- ─── RPC: refresh_next_backup_at ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_next_backup_at()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_enabled   boolean;
  v_frequency text;
  v_hour      int;
  v_day       int;
  v_next      timestamptz;
  v_now       timestamptz := now();
BEGIN
  v_enabled   := (public._backup_setting('backup_schedule_enabled') = 'true');
  v_frequency := COALESCE(NULLIF(public._backup_setting('backup_frequency'), ''), 'daily');
  v_hour      := COALESCE(NULLIF(public._backup_setting('backup_schedule_hour'), '')::int, 5);
  v_day       := COALESCE(NULLIF(public._backup_setting('backup_schedule_day'), '')::int, 0);

  IF NOT v_enabled THEN
    INSERT INTO public.system_settings (setting_key, setting_value)
    VALUES ('backup_next_run_at', 'null'::jsonb)
    ON CONFLICT (setting_key) DO UPDATE SET setting_value = 'null'::jsonb;
    RETURN;
  END IF;

  -- Candidate: today at v_hour UTC; push to tomorrow if already passed
  v_next := date_trunc('day', v_now AT TIME ZONE 'UTC') + (v_hour || ' hours')::interval;
  IF v_next <= v_now THEN
    v_next := v_next + interval '1 day';
  END IF;

  IF v_frequency = 'weekly' THEN
    -- Roll forward until DOW matches (0=Sunday, per BackupTab.tsx DAY_LABELS)
    WHILE extract(dow FROM v_next AT TIME ZONE 'UTC')::int != v_day LOOP
      v_next := v_next + interval '1 day';
    END LOOP;
  ELSIF v_frequency = 'monthly' THEN
    -- 1st of next month at v_hour UTC
    v_next := date_trunc('month', v_now + interval '1 month') + (v_hour || ' hours')::interval;
  END IF;

  -- to_json(timestamptz) → JSON string "2026-06-14T05:00:00+00:00" (matches cleanStr in backupService.ts:67)
  INSERT INTO public.system_settings (setting_key, setting_value)
  VALUES ('backup_next_run_at', to_json(v_next)::jsonb)
  ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_next_backup_at() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.refresh_next_backup_at() TO authenticated;

-- ─── RPC: cleanup_old_backups ────────────────────────────────────────────────
-- Note: storage.objects deletion is best-effort; missing files do not abort row delete
-- pre-restore-snapshot backups are excluded (needed for rollback reference)
CREATE OR REPLACE FUNCTION public.cleanup_old_backups()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_retention int;
  v_rec       RECORD;
  v_deleted   int := 0;
BEGIN
  v_retention := COALESCE(NULLIF(public._backup_setting('backup_retention_days'), '')::int, 30);

  FOR v_rec IN
    SELECT id, file_path
    FROM public.backup_history
    WHERE status = 'completed'
      AND backup_type != 'pre-restore-snapshot'
      AND started_at < now() - (v_retention || ' days')::interval
  LOOP
    BEGIN
      DELETE FROM storage.objects
      WHERE bucket_id = 'backups' AND name = v_rec.file_path;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    DELETE FROM public.backup_history WHERE id = v_rec.id;
    v_deleted := v_deleted + 1;
  END LOOP;

  RETURN v_deleted;
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_old_backups() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.cleanup_old_backups() TO service_role;

-- ─── RPC: run_scheduled_backup ───────────────────────────────────────────────
-- Called by pg_cron daily at 05:00 UTC. Self-gates on frequency.
-- Note: cron fires at a fixed hour; changing backup_schedule_hour in UI affects
-- next_run_at display but does NOT move the cron trigger (see Risk 5 in plan).
CREATE OR REPLACE FUNCTION public.run_scheduled_backup()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_enabled   boolean;
  v_frequency text;
  v_day       int;
  v_now       timestamptz := now();
BEGIN
  v_enabled   := (public._backup_setting('backup_schedule_enabled') = 'true');
  v_frequency := COALESCE(NULLIF(public._backup_setting('backup_frequency'), ''), 'daily');
  v_day       := COALESCE(NULLIF(public._backup_setting('backup_schedule_day'), '')::int, 0);

  IF NOT v_enabled THEN RETURN; END IF;

  -- Frequency gate: daily always proceeds; weekly/monthly check date
  IF v_frequency = 'weekly'  AND extract(dow FROM v_now AT TIME ZONE 'UTC')::int != v_day THEN RETURN; END IF;
  IF v_frequency = 'monthly' AND extract(day FROM v_now AT TIME ZONE 'UTC')::int != 1     THEN RETURN; END IF;

  -- Fire-and-forget: pg_net does not wait for Edge Function response
  PERFORM net.http_post(
    url     := 'https://acnkrijhndgbnxabfklx.supabase.co/functions/v1/automated-backup',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjbmtyaWpobmRnYm54YWJma2x4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MTYyNjEsImV4cCI6MjA5MzQ5MjI2MX0.9pxvsUVVvMeqr1NhUJ5x_T-0eVRMV4o0OSqkRvkk4c4'
    ),
    body    := '{"backup_type":"scheduled"}',
    timeout_milliseconds := 55000
  );

  -- Stamp last-run time + roll next_run_at forward
  INSERT INTO public.system_settings (setting_key, setting_value)
  VALUES ('backup_last_run_at', to_json(v_now)::jsonb)
  ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

  PERFORM public.refresh_next_backup_at();
END;
$$;
REVOKE ALL ON FUNCTION public.run_scheduled_backup() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.run_scheduled_backup() TO service_role;

-- ─── pg_cron jobs ────────────────────────────────────────────────────────────
DO $$ BEGIN PERFORM cron.unschedule('scheduled-backup-daily');    EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('cleanup-old-backups-daily'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Daily backup at 05:00 UTC (matches default backup_schedule_hour = 5)
SELECT cron.schedule(
  'scheduled-backup-daily',
  '0 5 * * *',
  $$ SELECT public.run_scheduled_backup(); $$
);

-- Daily cleanup at 05:30 UTC (after backup dispatched)
SELECT cron.schedule(
  'cleanup-old-backups-daily',
  '30 5 * * *',
  $$ SELECT public.cleanup_old_backups(); $$
);

-- ─── Seed missing rows + initialize next_run_at ──────────────────────────────
INSERT INTO public.system_settings (setting_key, setting_value)
VALUES
  ('backup_last_run_at', 'null'::jsonb),
  ('backup_next_run_at', 'null'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Set next_run_at immediately based on current settings
SELECT public.refresh_next_backup_at();
