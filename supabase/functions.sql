-- =============================================================================
-- Timba Mundial 2026 — Database Functions & Views
-- Group standings calculation + Prediction scoring
-- Run after schema.sql and seed.sql
-- =============================================================================

-- =============================================================================
-- SECTION 1: Group Standings View
-- Computes points, goal difference, goals for/against per team from real results.
-- Standard FIFA rules: 3 pts win, 1 pt draw, 0 pts loss.
-- Ordered by: points DESC, goal_difference DESC, goals_for DESC.
-- =============================================================================

CREATE OR REPLACE VIEW public.group_standings AS
WITH team_matches AS (
  SELECT
    m.group_id,
    t.id AS team_id,
    t.name AS team_name,
    t.code AS team_code,
    CASE
      WHEN m.home_team_id = t.id THEN m.home_goals
      ELSE m.away_goals
    END AS goals_for,
    CASE
      WHEN m.home_team_id = t.id THEN m.away_goals
      ELSE m.home_goals
    END AS goals_against
  FROM public.teams t
  JOIN public.matches m
    ON m.stage = 'group'
    AND m.group_id = t.group_id
    AND (m.home_team_id = t.id OR m.away_team_id = t.id)
    AND m.home_goals IS NOT NULL
    AND m.away_goals IS NOT NULL
)
SELECT
  t.group_id,
  t.id AS team_id,
  t.name AS team_name,
  t.code AS team_code,
  COALESCE(s.played, 0)::INTEGER AS played,
  COALESCE(s.won, 0)::INTEGER AS won,
  COALESCE(s.drawn, 0)::INTEGER AS drawn,
  COALESCE(s.lost, 0)::INTEGER AS lost,
  COALESCE(s.goals_for, 0)::INTEGER AS goals_for,
  COALESCE(s.goals_against, 0)::INTEGER AS goals_against,
  (COALESCE(s.goals_for, 0) - COALESCE(s.goals_against, 0))::INTEGER AS goal_difference,
  (COALESCE(s.won, 0) * 3 + COALESCE(s.drawn, 0))::INTEGER AS points,
  ROW_NUMBER() OVER (
    PARTITION BY t.group_id
    ORDER BY
      (COALESCE(s.won, 0) * 3 + COALESCE(s.drawn, 0)) DESC,
      (COALESCE(s.goals_for, 0) - COALESCE(s.goals_against, 0)) DESC,
      COALESCE(s.goals_for, 0) DESC,
      t.name ASC
  )::INTEGER AS position
FROM public.teams t
LEFT JOIN (
  SELECT
    tm.team_id,
    COUNT(*)::INTEGER AS played,
    COUNT(*) FILTER (WHERE tm.goals_for > tm.goals_against)::INTEGER AS won,
    COUNT(*) FILTER (WHERE tm.goals_for = tm.goals_against)::INTEGER AS drawn,
    COUNT(*) FILTER (WHERE tm.goals_for < tm.goals_against)::INTEGER AS lost,
    SUM(tm.goals_for)::INTEGER AS goals_for,
    SUM(tm.goals_against)::INTEGER AS goals_against
  FROM team_matches tm
  GROUP BY tm.team_id
) s ON s.team_id = t.id
WHERE t.group_id IS NOT NULL
ORDER BY t.group_id, position;

COMMENT ON VIEW public.group_standings IS
  'Live group table computed from played match results. Position via pts > GD > GF.';

-- =============================================================================
-- SECTION 2: Prediction Group Standings
-- Same logic but applied to a user prediction set.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_prediction_group_standings(p_prediction_id UUID)
RETURNS TABLE (
  group_id TEXT,
  team_id TEXT,
  team_name TEXT,
  played BIGINT,
  won BIGINT,
  drawn BIGINT,
  lost BIGINT,
  goals_for BIGINT,
  goals_against BIGINT,
  goal_difference BIGINT,
  points BIGINT,
  "position" BIGINT
)
LANGUAGE sql
STABLE
AS $$
  WITH pred_matches AS (
    SELECT
      m.group_id,
      m.home_team_id,
      m.away_team_id,
      pm.home_goals,
      pm.away_goals
    FROM public.prediction_matches pm
    JOIN public.matches m ON m.id = pm.match_id
    WHERE pm.prediction_id = p_prediction_id
      AND m.stage = 'group'
  ),
  team_results AS (
    SELECT
      pm.group_id,
      t.id AS team_id,
      t.name AS team_name,
      CASE
        WHEN pm.home_team_id = t.id THEN pm.home_goals
        ELSE pm.away_goals
      END AS gf,
      CASE
        WHEN pm.home_team_id = t.id THEN pm.away_goals
        ELSE pm.home_goals
      END AS ga
    FROM public.teams t
    JOIN pred_matches pm
      ON pm.home_team_id = t.id OR pm.away_team_id = t.id
  )
  SELECT
    tr.group_id,
    tr.team_id,
    tr.team_name,
    COUNT(*) AS played,
    COUNT(*) FILTER (WHERE tr.gf > tr.ga) AS won,
    COUNT(*) FILTER (WHERE tr.gf = tr.ga) AS drawn,
    COUNT(*) FILTER (WHERE tr.gf < tr.ga) AS lost,
    COALESCE(SUM(tr.gf), 0) AS goals_for,
    COALESCE(SUM(tr.ga), 0) AS goals_against,
    (COALESCE(SUM(tr.gf), 0) - COALESCE(SUM(tr.ga), 0)) AS goal_difference,
    (COUNT(*) FILTER (WHERE tr.gf > tr.ga) * 3
     + COUNT(*) FILTER (WHERE tr.gf = tr.ga)) AS points,
    ROW_NUMBER() OVER (
      PARTITION BY tr.group_id
      ORDER BY
        (COUNT(*) FILTER (WHERE tr.gf > tr.ga) * 3
         + COUNT(*) FILTER (WHERE tr.gf = tr.ga)) DESC,
        (COALESCE(SUM(tr.gf), 0) - COALESCE(SUM(tr.ga), 0)) DESC,
        COALESCE(SUM(tr.gf), 0) DESC,
        tr.team_name ASC
    ) AS position
  FROM team_results tr
  GROUP BY tr.group_id, tr.team_id, tr.team_name;
$$;

COMMENT ON FUNCTION public.get_prediction_group_standings(UUID) IS
  'Computes group standings from a user predicted match scores.';

-- =============================================================================
-- SECTION 3: Score Calculation Function
-- Computes all scoring categories for one user and upserts into user_scores.
--
-- Scoring rules (from game_rules):
--   Group match winner/draw correct:   1 pt each  (72 group matches)
--   Exact score bonus:                +5 pts each
--   Group position correct:            5 pts each  (12 groups x 4 positions)
--   Round of 32 correct winner:       10 pts each  (16 matches)
--   Round of 16 correct winner:       20 pts each  (8 matches)
--   Quarter-finals correct winner:    35 pts each  (4 matches)
--   Semi-finals correct winner:       50 pts each  (2 matches)
--   Finalist correct (in final):     100 pts each  (2 teams)
--   Champion:                        180 pts
--   Runner-up:                       100 pts
--   Third place:                     100 pts
--   Fourth place:                    100 pts
--   Top scorer:                      100 pts
--   Best player:                     100 pts
-- =============================================================================

CREATE OR REPLACE FUNCTION public.calculate_user_score(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prediction_id     UUID;
  v_group_match_pts   INTEGER := 0;
  v_exact_result_pts  INTEGER := 0;
  v_group_pos_pts     INTEGER := 0;
  v_r32_pts           INTEGER := 0;
  v_r16_pts           INTEGER := 0;
  v_qf_pts            INTEGER := 0;
  v_sf_pts            INTEGER := 0;
  v_finalist_pts      INTEGER := 0;
  v_champion_pts      INTEGER := 0;
  v_runner_up_pts     INTEGER := 0;
  v_third_pts         INTEGER := 0;
  v_fourth_pts        INTEGER := 0;
  v_scorer_pts        INTEGER := 0;
  v_player_pts        INTEGER := 0;
  v_total             INTEGER := 0;
  v_real              RECORD;
  v_pred_special      RECORD;
  v_predicted_champ   TEXT;
  v_predicted_runnerup TEXT;
  v_predicted_third   TEXT;
  v_predicted_fourth  TEXT;
BEGIN
  SELECT id INTO v_prediction_id
  FROM public.predictions
  WHERE user_id = p_user_id;

  IF v_prediction_id IS NULL THEN
    RETURN;
  END IF;

  -- =========================================================================
  -- 1) GROUP MATCH POINTS: winner/draw correct (+1) and exact score (+5)
  -- =========================================================================
  SELECT
    COALESCE(SUM(
      CASE WHEN (
        (m.home_goals > m.away_goals AND pm.home_goals > pm.away_goals) OR
        (m.home_goals < m.away_goals AND pm.home_goals < pm.away_goals) OR
        (m.home_goals = m.away_goals AND pm.home_goals = pm.away_goals)
      ) THEN 1 ELSE 0 END
    ), 0),
    COALESCE(SUM(
      CASE WHEN m.home_goals = pm.home_goals
            AND m.away_goals = pm.away_goals
      THEN 5 ELSE 0 END
    ), 0)
  INTO v_group_match_pts, v_exact_result_pts
  FROM public.prediction_matches pm
  JOIN public.matches m ON m.id = pm.match_id
  WHERE pm.prediction_id = v_prediction_id
    AND m.stage = 'group'
    AND m.home_goals IS NOT NULL
    AND m.away_goals IS NOT NULL;

  -- =========================================================================
  -- 2) GROUP POSITION POINTS: 5 pts per team in correct final position
  -- =========================================================================
  SELECT COALESCE(COUNT(*) * 5, 0)::INTEGER
  INTO v_group_pos_pts
  FROM public.prediction_group_standings pgs
  JOIN public.group_standings gs
    ON gs.group_id = pgs.group_id
    AND gs.team_id = pgs.team_id
    AND gs.position = pgs.position
  WHERE pgs.prediction_id = v_prediction_id;

  -- =========================================================================
  -- 3) KNOCKOUT POINTS: correct advancing team per round
  --    Compare predicted winner_team_id vs actual winner_team_id per match.
  -- =========================================================================

  SELECT COALESCE(COUNT(*) * 10, 0)::INTEGER
  INTO v_r32_pts
  FROM public.prediction_matches pm
  JOIN public.matches m ON m.id = pm.match_id
  WHERE pm.prediction_id = v_prediction_id
    AND m.stage = 'round-of-32'
    AND m.winner_team_id IS NOT NULL
    AND pm.winner_team_id = m.winner_team_id;

  SELECT COALESCE(COUNT(*) * 20, 0)::INTEGER
  INTO v_r16_pts
  FROM public.prediction_matches pm
  JOIN public.matches m ON m.id = pm.match_id
  WHERE pm.prediction_id = v_prediction_id
    AND m.stage = 'round-of-16'
    AND m.winner_team_id IS NOT NULL
    AND pm.winner_team_id = m.winner_team_id;

  SELECT COALESCE(COUNT(*) * 35, 0)::INTEGER
  INTO v_qf_pts
  FROM public.prediction_matches pm
  JOIN public.matches m ON m.id = pm.match_id
  WHERE pm.prediction_id = v_prediction_id
    AND m.stage = 'quarter-finals'
    AND m.winner_team_id IS NOT NULL
    AND pm.winner_team_id = m.winner_team_id;

  SELECT COALESCE(COUNT(*) * 50, 0)::INTEGER
  INTO v_sf_pts
  FROM public.prediction_matches pm
  JOIN public.matches m ON m.id = pm.match_id
  WHERE pm.prediction_id = v_prediction_id
    AND m.stage = 'semi-finals'
    AND m.winner_team_id IS NOT NULL
    AND pm.winner_team_id = m.winner_team_id;

  -- =========================================================================
  -- 4) FINALIST POINTS: 100 pts per team correctly predicted in the final.
  --    User's predicted finalists = their semi-final winner picks.
  --    Actual finalists = teams in the real final match.
  -- =========================================================================
  SELECT COALESCE(COUNT(*) * 100, 0)::INTEGER
  INTO v_finalist_pts
  FROM (
    SELECT pm.winner_team_id AS predicted_finalist
    FROM public.prediction_matches pm
    JOIN public.matches m ON m.id = pm.match_id
    WHERE pm.prediction_id = v_prediction_id
      AND m.stage = 'semi-finals'
      AND pm.winner_team_id IS NOT NULL
  ) pf
  WHERE pf.predicted_finalist IN (
    SELECT mf.home_team_id FROM public.matches mf WHERE mf.stage = 'final' AND mf.home_team_id IS NOT NULL
    UNION
    SELECT mf.away_team_id FROM public.matches mf WHERE mf.stage = 'final' AND mf.away_team_id IS NOT NULL
  );

  -- =========================================================================
  -- 5) CHAMPION / RUNNER-UP / THIRD / FOURTH from real_results
  -- =========================================================================
  SELECT * INTO v_real FROM public.real_results LIMIT 1;
  SELECT * INTO v_pred_special
  FROM public.prediction_specials WHERE prediction_id = v_prediction_id;

  IF v_real IS NOT NULL THEN
    -- Champion = user's predicted final match winner
    IF v_real.champion_team_id IS NOT NULL THEN
      SELECT pm.winner_team_id INTO v_predicted_champ
      FROM public.prediction_matches pm
      JOIN public.matches m ON m.id = pm.match_id
      WHERE pm.prediction_id = v_prediction_id
        AND m.stage = 'final'
      LIMIT 1;

      IF v_predicted_champ = v_real.champion_team_id THEN
        v_champion_pts := 180;
      END IF;
    END IF;

    -- Runner-up = the other finalist in user's prediction (SF winner that is NOT champion)
    IF v_real.runner_up_team_id IS NOT NULL THEN
      SELECT pm.winner_team_id INTO v_predicted_runnerup
      FROM public.prediction_matches pm
      JOIN public.matches m ON m.id = pm.match_id
      WHERE pm.prediction_id = v_prediction_id
        AND m.stage = 'semi-finals'
        AND pm.winner_team_id IS NOT NULL
        AND pm.winner_team_id <> COALESCE(v_predicted_champ, '')
      LIMIT 1;

      IF v_predicted_runnerup = v_real.runner_up_team_id THEN
        v_runner_up_pts := 100;
      END IF;
    END IF;

    -- Third place = user's predicted third-place match winner
    IF v_real.third_place_team_id IS NOT NULL THEN
      SELECT pm.winner_team_id INTO v_predicted_third
      FROM public.prediction_matches pm
      JOIN public.matches m ON m.id = pm.match_id
      WHERE pm.prediction_id = v_prediction_id
        AND m.stage = 'third-place'
      LIMIT 1;

      IF v_predicted_third = v_real.third_place_team_id THEN
        v_third_pts := 100;
      END IF;
    END IF;

    -- Fourth place = the other team in user's third-place match (the loser)
    -- That is the SF loser that is NOT the third-place winner.
    IF v_real.fourth_place_team_id IS NOT NULL THEN
      SELECT pm.winner_team_id INTO v_predicted_fourth
      FROM public.prediction_matches pm
      JOIN public.matches m ON m.id = pm.match_id
      WHERE pm.prediction_id = v_prediction_id
        AND m.stage = 'semi-finals'
        AND pm.winner_team_id IS NULL
      LIMIT 1;

      -- Simpler: SF losers are the teams NOT selected as winners.
      -- Fourth = the SF loser that is NOT the third-place winner.
      -- We check from prediction: the two SF losers are implicit.
      -- But since we don't store them explicitly, we use a different approach:
      -- if any of the user's QF winners that lost in their predicted SF
      -- matches the real fourth-place team, award points.
      PERFORM 1
      FROM public.prediction_matches pm_qf
      JOIN public.matches m_qf ON m_qf.id = pm_qf.match_id
      WHERE pm_qf.prediction_id = v_prediction_id
        AND m_qf.stage = 'quarter-finals'
        AND pm_qf.winner_team_id = v_real.fourth_place_team_id
        AND pm_qf.winner_team_id NOT IN (
          SELECT pm_sf.winner_team_id
          FROM public.prediction_matches pm_sf
          JOIN public.matches m_sf ON m_sf.id = pm_sf.match_id
          WHERE pm_sf.prediction_id = v_prediction_id
            AND m_sf.stage = 'semi-finals'
            AND pm_sf.winner_team_id IS NOT NULL
        );

      IF FOUND THEN
        v_fourth_pts := 100;
      END IF;
    END IF;

    -- Top scorer (case-insensitive comparison)
    IF v_real.top_scorer IS NOT NULL
       AND v_pred_special IS NOT NULL
       AND lower(trim(v_pred_special.top_scorer)) = lower(trim(v_real.top_scorer))
    THEN
      v_scorer_pts := 100;
    END IF;

    -- Best player (case-insensitive comparison)
    IF v_real.best_player IS NOT NULL
       AND v_pred_special IS NOT NULL
       AND lower(trim(v_pred_special.best_player)) = lower(trim(v_real.best_player))
    THEN
      v_player_pts := 100;
    END IF;
  END IF;

  -- =========================================================================
  -- 6) TOTAL & UPSERT into user_scores
  -- =========================================================================
  v_total := v_group_match_pts + v_exact_result_pts + v_group_pos_pts
           + v_r32_pts + v_r16_pts + v_qf_pts + v_sf_pts
           + v_finalist_pts + v_champion_pts + v_runner_up_pts
           + v_third_pts + v_fourth_pts + v_scorer_pts + v_player_pts;

  INSERT INTO public.user_scores (
    user_id, group_match_points, exact_result_bonus, group_position_points,
    round_of_32_points, round_of_16_points, quarter_final_points,
    semi_final_points, finalist_points, champion_points, runner_up_points,
    third_place_points, fourth_place_points, top_scorer_points,
    best_player_points, total_points
  ) VALUES (
    p_user_id, v_group_match_pts, v_exact_result_pts, v_group_pos_pts,
    v_r32_pts, v_r16_pts, v_qf_pts, v_sf_pts, v_finalist_pts,
    v_champion_pts, v_runner_up_pts, v_third_pts, v_fourth_pts,
    v_scorer_pts, v_player_pts, v_total
  )
  ON CONFLICT (user_id) DO UPDATE SET
    group_match_points    = EXCLUDED.group_match_points,
    exact_result_bonus    = EXCLUDED.exact_result_bonus,
    group_position_points = EXCLUDED.group_position_points,
    round_of_32_points    = EXCLUDED.round_of_32_points,
    round_of_16_points    = EXCLUDED.round_of_16_points,
    quarter_final_points  = EXCLUDED.quarter_final_points,
    semi_final_points     = EXCLUDED.semi_final_points,
    finalist_points       = EXCLUDED.finalist_points,
    champion_points       = EXCLUDED.champion_points,
    runner_up_points      = EXCLUDED.runner_up_points,
    third_place_points    = EXCLUDED.third_place_points,
    fourth_place_points   = EXCLUDED.fourth_place_points,
    top_scorer_points     = EXCLUDED.top_scorer_points,
    best_player_points    = EXCLUDED.best_player_points,
    total_points          = EXCLUDED.total_points;
END;
$$;

COMMENT ON FUNCTION public.calculate_user_score(UUID) IS
  'Computes all scoring categories for one user and upserts into user_scores.';

-- =============================================================================
-- SECTION 4: Batch score recalculation + ranking
-- =============================================================================

CREATE OR REPLACE FUNCTION public.recalculate_all_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN
    SELECT DISTINCT p.user_id
    FROM public.predictions p
    WHERE p.is_locked = true
  LOOP
    PERFORM public.calculate_user_score(v_user.user_id);
  END LOOP;

  UPDATE public.user_scores us
  SET rank = ranked.r
  FROM (
    SELECT user_id, DENSE_RANK() OVER (ORDER BY total_points DESC) AS r
    FROM public.user_scores
  ) ranked
  WHERE us.user_id = ranked.user_id;
END;
$$;

COMMENT ON FUNCTION public.recalculate_all_scores() IS
  'Recalculates scores for all locked predictions and assigns leaderboard ranks.';

-- =============================================================================
-- SECTION 5: Knockout Advance Function
-- Propagates the winning (and losing) team to the next bracket match.
-- =============================================================================

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

-- =============================================================================
-- SECTION 6: Best Third-Place Teams + Auto-Populate Round of 32
-- =============================================================================

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
  -- Only proceed when all 72 group matches have results
  SELECT COUNT(*) INTO v_played_count
  FROM public.matches
  WHERE stage = 'group'
    AND home_goals IS NOT NULL
    AND away_goals IS NOT NULL;

  IF v_played_count < 72 THEN
    RETURN 0;
  END IF;

  -- Skip if already populated
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
    -- Resolve home_source (always a direct 1X or 2X pattern)
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

    -- Resolve away_source (direct 1X/2X only; 3-... resolved by the app service)
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
  'Fills R32 home/away for 1st/2nd place teams from group standings. Returns slot count updated. Third-place slots are resolved by the app service.';
