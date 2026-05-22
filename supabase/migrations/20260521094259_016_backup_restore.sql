-- Migration: 016_backup_restore
-- Applied: 2026-05-21 via MCP (branch: 016-backup-restore-csv)
-- Purpose: restore_history + restore_staging + backup_history enhancements + PL/pgSQL restore RPC

-- ─── backup_history: add table_record_counts ────────────────────────────────
ALTER TABLE public.backup_history
  ADD COLUMN IF NOT EXISTS table_record_counts jsonb;

-- ─── system_settings: add maintenance_until ─────────────────────────────────
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS maintenance_until timestamptz;

-- ─── restore_history ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.restore_history (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id        uuid NOT NULL REFERENCES public.backup_history(id),
  executed_by      uuid NOT NULL,
  snapshot_id      uuid REFERENCES public.backup_history(id),
  status           text NOT NULL DEFAULT 'pending',
  started_at       timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz,
  tables_restored  int,
  records_restored int,
  error_message    text,
  notes            text
);

ALTER TABLE public.restore_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_restore_history"
  ON public.restore_history
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- ─── restore_staging ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.restore_staging (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL,
  table_name  text NOT NULL,
  data        jsonb NOT NULL,
  chunk_index int NOT NULL DEFAULT 0,
  chunk_total int NOT NULL DEFAULT 1,
  created_at  timestamptz DEFAULT now()
);
-- no RLS — service_role only, always cleaned up in restore Edge Function finally block

-- ─── Advisory lock helpers ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.try_backup_lock()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN pg_try_advisory_lock(9182736455);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_backup_lock()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_unlock(9182736455);
END;
$$;

-- ─── is_maintenance_active ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_maintenance_active()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_until timestamptz;
BEGIN
  SELECT maintenance_until INTO v_until
  FROM public.system_settings
  LIMIT 1;
  RETURN v_until IS NOT NULL AND v_until > now();
END;
$$;

-- ─── admin_restore_backup RPC ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_restore_backup(
  p_session_id uuid,
  p_restore_history_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_role text;
  v_tables text[];
  v_table text;
  v_rows jsonb[];
  v_row jsonb;
  v_total_records int := 0;
  v_tables_restored int := 0;
  v_chunk_data jsonb;
  v_chunk_record record;
BEGIN
  -- auth check
  v_user_id := auth.uid();
  SELECT role INTO v_role FROM public.users WHERE id = v_user_id;
  IF v_role != 'admin' THEN
    RAISE EXCEPTION 'غير مصرح: صلاحية المدير مطلوبة';
  END IF;

  -- get distinct tables from staging in order
  SELECT ARRAY_AGG(DISTINCT table_name ORDER BY table_name)
  INTO v_tables
  FROM public.restore_staging
  WHERE session_id = p_session_id;

  IF v_tables IS NULL THEN
    RAISE EXCEPTION 'لا بيانات في staging للجلسة: %', p_session_id;
  END IF;

  -- update status to restoring_data
  UPDATE public.restore_history
  SET status = 'restoring_data'
  WHERE id = p_restore_history_id;

  -- restore each table
  FOREACH v_table IN ARRAY v_tables LOOP
    -- truncate target (only safe after snapshot)
    EXECUTE format('TRUNCATE public.%I CASCADE', v_table);

    -- insert from staging chunks in order
    FOR v_chunk_record IN
      SELECT data FROM public.restore_staging
      WHERE session_id = p_session_id AND table_name = v_table
      ORDER BY chunk_index
    LOOP
      FOR v_row IN SELECT jsonb_array_elements(v_chunk_record.data) LOOP
        EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_record(null::public.%I, $1)', v_table, v_table)
        USING v_row;
        v_total_records := v_total_records + 1;
      END LOOP;
    END LOOP;

    v_tables_restored := v_tables_restored + 1;
  END LOOP;

  -- cleanup staging
  DELETE FROM public.restore_staging WHERE session_id = p_session_id;

  -- finalize
  UPDATE public.restore_history
  SET status = 'completed',
      completed_at = now(),
      tables_restored = v_tables_restored,
      records_restored = v_total_records
  WHERE id = p_restore_history_id;

  RETURN jsonb_build_object(
    'success', true,
    'tables_restored', v_tables_restored,
    'records_restored', v_total_records
  );

EXCEPTION WHEN OTHERS THEN
  UPDATE public.restore_history
  SET status = 'failed', error_message = SQLERRM, completed_at = now()
  WHERE id = p_restore_history_id;
  DELETE FROM public.restore_staging WHERE session_id = p_session_id;
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.try_backup_lock() FROM anon, public;
REVOKE ALL ON FUNCTION public.release_backup_lock() FROM anon, public;
REVOKE ALL ON FUNCTION public.is_maintenance_active() FROM anon, public;
REVOKE ALL ON FUNCTION public.admin_restore_backup(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.try_backup_lock() TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_backup_lock() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_maintenance_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restore_backup(uuid, uuid) TO authenticated;
