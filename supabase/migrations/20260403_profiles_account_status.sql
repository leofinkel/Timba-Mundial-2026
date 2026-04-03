-- Account status for admin ban/unban; leaderboard RPCs exclude banned users.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active'
  CHECK (account_status IN ('active', 'banned'));

COMMENT ON COLUMN public.profiles.account_status IS 'active = normal; banned = suspended by admin (auth ban + app block).';

CREATE OR REPLACE FUNCTION public.count_paid_profiles()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.profiles
  WHERE payment_status = 'paid'
    AND account_status = 'active';
$$;

COMMENT ON FUNCTION public.count_paid_profiles() IS
  'Paid profiles with active account (excludes banned). SECURITY DEFINER bypasses RLS.';

CREATE OR REPLACE FUNCTION public.list_profile_display_names()
RETURNS TABLE(id UUID, display_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name
  FROM public.profiles p
  WHERE p.account_status = 'active'
  ORDER BY p.created_at;
$$;

COMMENT ON FUNCTION public.list_profile_display_names() IS
  'Returns id + display_name for active profiles. SECURITY DEFINER bypasses RLS.';

CREATE OR REPLACE FUNCTION public.list_profiles_for_public_leaderboard()
RETURNS TABLE(id UUID, display_name TEXT, avatar_url TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE p.account_status = 'active'
  ORDER BY p.created_at;
$$;

COMMENT ON FUNCTION public.list_profiles_for_public_leaderboard() IS
  'Display names and avatars for active users on leaderboard. SECURITY DEFINER bypasses RLS.';
