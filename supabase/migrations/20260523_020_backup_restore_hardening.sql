-- Forward-only hardening for backup/restore
-- Keeps the restore pipeline stable across existing and fresh environments.

ALTER TABLE public.restore_staging ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.restore_staging FROM anon, authenticated, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.restore_staging TO service_role;

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
  v_total_records int := 0;
  v_tables_restored int := 0;
  v_chunk_record record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_type', 'unauthorized',
      'error_message', 'AUTH_REQUIRED'
    );
  END IF;

  SELECT role INTO v_role
  FROM public.users
  WHERE id = v_user_id;

  IF v_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_type', 'unauthorized',
      'error_message', 'ADMIN_ROLE_REQUIRED'
    );
  END IF;

  PERFORM 1
  FROM public.restore_history
  WHERE id = p_restore_history_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_type', 'invalid_restore_history',
      'error_message', 'RESTORE_HISTORY_NOT_FOUND'
    );
  END IF;

  SELECT ARRAY_AGG(DISTINCT table_name ORDER BY table_name)
  INTO v_tables
  FROM public.restore_staging
  WHERE session_id = p_session_id;

  IF v_tables IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_type', 'missing_staging',
      'error_message', 'RESTORE_STAGING_NOT_FOUND'
    );
  END IF;

  UPDATE public.restore_history
  SET status = 'restoring_data'
  WHERE id = p_restore_history_id;

  FOREACH v_table IN ARRAY v_tables LOOP
    EXECUTE format('TRUNCATE public.%I CASCADE', v_table);

    FOR v_chunk_record IN
      SELECT data
      FROM public.restore_staging
      WHERE session_id = p_session_id
        AND table_name = v_table
      ORDER BY chunk_index
    LOOP
      FOR v_row IN SELECT jsonb_array_elements(v_chunk_record.data) LOOP
        EXECUTE format(
          'INSERT INTO public.%I SELECT * FROM jsonb_populate_record(null::public.%I, $1)',
          v_table,
          v_table
        )
        USING v_row;
        v_total_records := v_total_records + 1;
      END LOOP;
    END LOOP;

    v_tables_restored := v_tables_restored + 1;
  END LOOP;

  DELETE FROM public.restore_staging
  WHERE session_id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'tables_restored', v_tables_restored,
    'records_restored', v_total_records
  );

EXCEPTION WHEN OTHERS THEN
  DELETE FROM public.restore_staging
  WHERE session_id = p_session_id;

  RETURN jsonb_build_object(
    'success', false,
    'error_type', 'restore_failed',
    'error_message', SQLERRM
  );
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
