-- Spec 078 / F-01: protect user-directory RPC from non-admin callers.
-- Keeps the existing result shape for the Permissions screen.

CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS TABLE (
  id uuid,
  full_name text,
  username text,
  email text,
  role text,
  permissions jsonb,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT u.id, u.full_name, u.username, u.email, u.role, u.permissions, u.is_active
  FROM public.users u
  ORDER BY u.full_name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_all_users_for_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_all_users_for_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_all_users_for_admin() TO authenticated;
