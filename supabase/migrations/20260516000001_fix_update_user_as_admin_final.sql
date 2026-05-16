-- Fix: update_user_as_admin broken on PostgreSQL 17 when PostgREST sets
-- `SET role='authenticated'` before RPC calls — bare column names (role, id,
-- email, etc.) become ambiguous with session variables.
-- Fix strategy:
--   1. Read current row into explicit PL/pgSQL locals first
--   2. UPDATE uses only locals/params — no bare column refs in expressions
--   3. Use table alias (u.) everywhere to eliminate remaining ambiguity
--   4. Add SET search_path for consistency with other SECURITY DEFINER functions
--   5. Remove non-existent updated_at column from SET/RETURNING/return type

DROP FUNCTION IF EXISTS public.update_user_as_admin(UUID, TEXT, TEXT, TEXT, JSONB, BOOLEAN);

CREATE FUNCTION public.update_user_as_admin(
  p_user_id         UUID,
  p_new_email       TEXT    DEFAULT NULL,
  p_new_full_name   TEXT    DEFAULT NULL,
  p_new_role        TEXT    DEFAULT NULL,
  p_new_permissions JSONB   DEFAULT NULL,
  p_new_is_active   BOOLEAN DEFAULT NULL
) RETURNS TABLE (
  id          UUID,
  email       TEXT,
  username    TEXT,
  full_name   TEXT,
  role        TEXT,
  permissions JSONB,
  is_active   BOOLEAN,
  created_at  TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_caller_id             UUID;
  v_caller_role           TEXT;
  v_cur_email             TEXT;
  v_cur_full_name         TEXT;
  v_cur_role              TEXT;
  v_cur_permissions       JSONB;
  v_cur_is_active         BOOLEAN;
  v_effective_permissions JSONB;
BEGIN
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  SELECT u.role INTO v_caller_role
  FROM public.users u
  WHERE u.id = v_caller_id;

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admins can update user roles and permissions';
  END IF;

  IF p_new_role = 'admin' THEN
    RAISE EXCEPTION 'Cannot promote user to admin. Only one admin is allowed.';
  END IF;

  IF p_new_role IS NOT NULL AND p_new_role NOT IN ('admin', 'manager', 'user') THEN
    RAISE EXCEPTION 'Invalid role: %', p_new_role;
  END IF;

  SELECT u.email, u.full_name, u.role, u.permissions, u.is_active
  INTO v_cur_email, v_cur_full_name, v_cur_role, v_cur_permissions, v_cur_is_active
  FROM public.users u
  WHERE u.id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF p_new_permissions IS NULL THEN
    v_effective_permissions := v_cur_permissions;
  ELSIF jsonb_typeof(p_new_permissions) = 'array' THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(val) ORDER BY val), '[]'::jsonb)
    INTO v_effective_permissions
    FROM (
      SELECT DISTINCT val
      FROM jsonb_array_elements_text(p_new_permissions) AS val
      WHERE val ~ '^[a-zA-Z][a-zA-Z0-9_]*\.[a-zA-Z][a-zA-Z0-9_]*$'
    ) dedup;
  ELSIF jsonb_typeof(p_new_permissions) = 'object' THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(pkey) ORDER BY pkey), '[]'::jsonb)
    INTO v_effective_permissions
    FROM (
      SELECT DISTINCT format('%s.%s', sec.key, act.key) AS pkey
      FROM jsonb_each(p_new_permissions) AS sec(key, value)
      CROSS JOIN LATERAL jsonb_each(sec.value) AS act(key, value)
      WHERE jsonb_typeof(sec.value) = 'object'
        AND act.value = 'true'::jsonb
    ) flattened;
  ELSE
    v_effective_permissions := '[]'::jsonb;
  END IF;

  RETURN QUERY
  UPDATE public.users AS u
  SET
    email       = COALESCE(p_new_email,     v_cur_email),
    full_name   = COALESCE(p_new_full_name, v_cur_full_name),
    role        = COALESCE(p_new_role,      v_cur_role),
    permissions = v_effective_permissions,
    is_active   = COALESCE(p_new_is_active, v_cur_is_active)
  WHERE u.id = p_user_id
  RETURNING
    u.id, u.email, u.username, u.full_name, u.role,
    u.permissions, u.is_active, u.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_as_admin(UUID, TEXT, TEXT, TEXT, JSONB, BOOLEAN) TO authenticated;
