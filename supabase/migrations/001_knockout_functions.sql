-- =============================================================================
-- Timba Mundial 2026 — Migration 001: Knockout Functions
-- SAFE: No table drops, no data loss. Only adds/replaces functions.
-- Run this in Supabase SQL Editor on an existing database.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) advance_knockout_winner(match_id, winner_team_id)
--    After setting a knockout winner, propagates the winning team (and loser
--    for third-place match) to the next bracket match.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.advance_knockout_winner(
  p_match_id UUID,
  p_winner_team_id TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_number INTEGER;
  v_home_team_id TEXT;
  v_away_team_id TEXT;
  v_loser_team_id TEXT;
  v_win_src TEXT;
  v_lose_src TEXT;
  v_next RECORD;
BEGIN
  SELECT match_number, home_team_id, away_team_id
  INTO v_match_number, v_home_team_id, v_away_team_id
  FROM public.matches WHERE id = p_match_id;

  IF v_match_number IS NULL THEN RETURN; END IF;

  v_win_src  := 'W' || v_match_number;
  v_lose_src := 'RU' || v_match_number;

  IF v_home_team_id = p_winner_team_id THEN
    v_loser_team_id := v_away_team_id;
  ELSE
    v_loser_team_id := v_home_team_id;
  END IF;

  FOR v_next IN
    SELECT id, home_source, away_source
    FROM public.matches
    WHERE home_source IN (v_win_src, v_lose_src)
       OR away_source IN (v_win_src, v_lose_src)
  LOOP
    IF v_next.home_source = v_win_src THEN
      UPDATE public.matches SET home_team_id = p_winner_team_id WHERE id = v_next.id;
    END IF;
    IF v_next.away_source = v_win_src THEN
      UPDATE public.matches SET away_team_id = p_winner_team_id WHERE id = v_next.id;
    END IF;
    IF v_next.home_source = v_lose_src AND v_loser_team_id IS NOT NULL THEN
      UPDATE public.matches SET home_team_id = v_loser_team_id WHERE id = v_next.id;
    END IF;
    IF v_next.away_source = v_lose_src AND v_loser_team_id IS NOT NULL THEN
      UPDATE public.matches SET away_team_id = v_loser_team_id WHERE id = v_next.id;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.advance_knockout_winner(UUID, TEXT) IS
  'Advances the winning (and losing) team to the next bracket match after a knockout result.';

-- -----------------------------------------------------------------------------
-- 2) get_best_third_place_teams()
--    Returns the 8 best third-place teams from group standings,
--    ranked by points, goal difference, goals for.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_best_third_place_teams()
RETURNS TABLE (
  rank_pos  INTEGER,
  group_id  TEXT,
  team_id   TEXT,
  team_name TEXT,
  points    INTEGER,
  goal_difference INTEGER,
  goals_for INTEGER
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY gs.points DESC, gs.goal_difference DESC, gs.goals_for DESC, gs.team_name ASC
    )::INTEGER AS rank_pos,
    gs.group_id,
    gs.team_id,
    gs.team_name,
    gs.points,
    gs.goal_difference,
    gs.goals_for
  FROM public.group_standings gs
  WHERE gs.position = 3
  ORDER BY gs.points DESC, gs.goal_difference DESC, gs.goals_for DESC, gs.team_name ASC
  LIMIT 8;
$$;

COMMENT ON FUNCTION public.get_best_third_place_teams() IS
  'Returns the 8 best third-place teams from group standings, ranked by pts > GD > GF.';

-- -----------------------------------------------------------------------------
-- 3) populate_round_of_32_direct_slots()
--    When all 72 group matches have results, fills R32 matches for
--    1st and 2nd place teams. Third-place allocation is handled by
--    the app service layer (bipartite matching in TypeScript).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.populate_round_of_32_direct_slots()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_played_count INTEGER;
  v_updated      INTEGER := 0;
  v_match        RECORD;
  v_src_pos      INTEGER;
  v_src_group    TEXT;
  v_team         TEXT;
BEGIN
  SELECT COUNT(*) INTO v_played_count
  FROM public.matches
  WHERE stage = 'group'
    AND home_goals IS NOT NULL
    AND away_goals IS NOT NULL;

  IF v_played_count < 72 THEN
    RETURN 0;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.matches
    WHERE stage = 'round-of-32' AND home_team_id IS NOT NULL
    LIMIT 1
  ) THEN
    RETURN 0;
  END IF;

  FOR v_match IN
    SELECT id, match_number, home_source, away_source
    FROM public.matches
    WHERE stage = 'round-of-32'
    ORDER BY match_number
  LOOP
    IF v_match.home_source ~ '^[12][A-L]$' THEN
      v_src_pos   := CAST(LEFT(v_match.home_source, 1) AS INTEGER);
      v_src_group := RIGHT(v_match.home_source, 1);

      SELECT gs.team_id INTO v_team
      FROM public.group_standings gs
      WHERE gs.group_id = v_src_group AND gs.position = v_src_pos;

      IF v_team IS NOT NULL THEN
        UPDATE public.matches SET home_team_id = v_team WHERE id = v_match.id;
        v_updated := v_updated + 1;
      END IF;
    END IF;

    IF v_match.away_source ~ '^[12][A-L]$' THEN
      v_src_pos   := CAST(LEFT(v_match.away_source, 1) AS INTEGER);
      v_src_group := RIGHT(v_match.away_source, 1);

      SELECT gs.team_id INTO v_team
      FROM public.group_standings gs
      WHERE gs.group_id = v_src_group AND gs.position = v_src_pos;

      IF v_team IS NOT NULL THEN
        UPDATE public.matches SET away_team_id = v_team WHERE id = v_match.id;
        v_updated := v_updated + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_updated;
END;
$$;

COMMENT ON FUNCTION public.populate_round_of_32_direct_slots() IS
  'Fills R32 home/away for 1st/2nd place teams from group standings. Third-place slots are resolved by the app service.';

-- =============================================================================
-- DONE! Verify with:
--   SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema = 'public'
--     AND routine_name IN (
--       'advance_knockout_winner',
--       'get_best_third_place_teams',
--       'populate_round_of_32_direct_slots'
--     );
-- Should return 3 rows.
-- =============================================================================
