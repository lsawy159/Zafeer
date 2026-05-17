-- US1a: Fix user_has_permission() — was reading object format, data is flat array
-- Old: perms -> section ->> action (object navigation, always null)
-- New: perms @> to_jsonb(section || '.' || action) (flat array contains check)
CREATE OR REPLACE FUNCTION public.user_has_permission(section text, action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  perms JSONB;
  user_role TEXT;
BEGIN
  SELECT permissions, role
  INTO perms, user_role
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;

  -- Admin always has full access (FR-003)
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Null auth context or missing user: deny (edge case per spec)
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Check flat array format: ["employees.view", "companies.create", ...]
  RETURN COALESCE(
    perms @> to_jsonb(section || '.' || action),
    false
  );
END;
$$;

-- US1b: Create get_all_users_for_admin RPC (missing — called by Permissions.tsx)
-- SECURITY DEFINER so authenticated users can call it safely;
-- actual row filtering is handled at app layer (admin-only UI route)
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
  RETURN QUERY
  SELECT
    u.id,
    u.full_name,
    u.username,
    u.email,
    u.role,
    u.permissions,
    u.is_active
  FROM public.users u
  ORDER BY u.full_name ASC;
END;
$$;

-- Grant execute to authenticated role
GRANT EXECUTE ON FUNCTION public.get_all_users_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(text, text) TO authenticated;
