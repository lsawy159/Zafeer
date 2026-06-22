-- 073: is_active enforcement (Spec 072)
-- Suspended users (is_active not true) are denied everywhere via the two shared
-- authorization helpers. Signatures / SECURITY DEFINER / search_path are unchanged,
-- so every dependent RLS policy and SECURITY DEFINER RPC keeps working structurally.
-- Suspension overrides the admin bypass; missing user / null auth → deny (Deny-by-Default).
-- The users self-read policy (id = auth.uid()) is intentionally NOT changed, so a
-- suspended user can still read their own row and the app can detect suspension.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN COALESCE(
    (SELECT role = 'admin' AND is_active IS TRUE
       FROM public.users WHERE id = auth.uid() LIMIT 1),
    false
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_has_permission(section text, action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  perms JSONB;
  user_role TEXT;
  active BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT permissions, role, is_active
  INTO perms, user_role, active
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;

  -- Missing user OR suspended → deny everything (overrides admin + grants)
  IF NOT FOUND OR active IS NOT TRUE THEN
    RETURN false;
  END IF;

  -- Active admin → full access
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Active non-admin → flat-array grant check
  RETURN COALESCE(perms @> to_jsonb(section || '.' || action), false);
END;
$function$;
