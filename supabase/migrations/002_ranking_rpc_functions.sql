-- =============================================================================
-- Migration 002: SECURITY DEFINER functions for public ranking data
-- These bypass RLS so any authenticated user can see the leaderboard & prize pool.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.count_paid_profiles()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM public.profiles WHERE payment_status = 'paid';
$$;

COMMENT ON FUNCTION public.count_paid_profiles() IS
  'Returns the number of profiles with payment_status = paid. SECURITY DEFINER bypasses RLS.';

-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_profile_display_names()
RETURNS TABLE(id UUID, display_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name FROM public.profiles p ORDER BY p.created_at;
$$;

COMMENT ON FUNCTION public.list_profile_display_names() IS
  'Returns id + display_name for all profiles. SECURITY DEFINER bypasses RLS for public leaderboard.';

-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_leaderboard_scores()
RETURNS TABLE(
  user_id UUID,
  group_match_points INTEGER,
  exact_result_bonus INTEGER,
  group_position_points INTEGER,
  round_of_32_points INTEGER,
  round_of_16_points INTEGER,
  quarter_final_points INTEGER,
  semi_final_points INTEGER,
  finalist_points INTEGER,
  champion_points INTEGER,
  runner_up_points INTEGER,
  third_place_points INTEGER,
  fourth_place_points INTEGER,
  top_scorer_points INTEGER,
  best_player_points INTEGER,
  total_points INTEGER,
  rank INTEGER,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.user_id, s.group_match_points, s.exact_result_bonus,
    s.group_position_points, s.round_of_32_points, s.round_of_16_points,
    s.quarter_final_points, s.semi_final_points, s.finalist_points,
    s.champion_points, s.runner_up_points, s.third_place_points,
    s.fourth_place_points, s.top_scorer_points, s.best_player_points,
    s.total_points, s.rank, s.updated_at
  FROM public.user_scores s
  ORDER BY s.total_points DESC;
$$;

COMMENT ON FUNCTION public.list_leaderboard_scores() IS
  'Returns all user_scores ordered by total_points DESC. SECURITY DEFINER bypasses RLS for the public leaderboard.';
