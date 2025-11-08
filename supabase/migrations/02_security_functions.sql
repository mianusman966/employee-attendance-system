-- Security helper functions for profiles access and role retrieval
-- This migration defines non-recursive, SECURITY DEFINER helpers to be
-- called from RLS policies or via RPC from the app.

-- 1) Admin check function (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin(u uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r text;
BEGIN
  SELECT role::text INTO r FROM public.profiles WHERE id = u;
  RETURN r = 'admin';
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- 2) RPC to get the current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r text;
BEGIN
  SELECT role::text INTO r
  FROM public.profiles
  WHERE id = auth.uid();
  RETURN r;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
