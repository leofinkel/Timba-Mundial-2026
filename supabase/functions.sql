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
  'Group table derived from played match results only (pts > GD > GF), without admin overrides.';

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
-- Never updates prediction_* rows. User picks are always read from prediction_*;
-- official data in matches and real_results is only the reference for comparison.
--
-- Scoring rules (from game_rules):
--   Group match winner/draw correct:   1 pt each  (72 group matches)
--   Exact score bonus:                +5 pts each
--   Group position correct:            5 pts each  (12 groups x 4 positions)
--   R32+ qualified teams:              by stage (10 / 20 / 35 / 50 / 100)
--   Champion / runner-up / 3rd / 4th:  honor from matches 104 / 103 vs prediction
--   Top scorer / best player:          vs real_results (admin)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.calculate_user_score(p_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  v_final_other       TEXT;
  v_third_loser       TEXT;
  v_official_champ    TEXT;
  v_official_ru       TEXT;
  v_official_third    TEXT;
  v_official_fourth   TEXT;
BEGIN
  SELECT id INTO v_prediction_id FROM public.predictions WHERE user_id = p_user_id;
  IF v_prediction_id IS NULL THEN RETURN; END IF;

  -- 1) Group match points + exact score bonus
  SELECT
    COALESCE(SUM(CASE WHEN (
      (m.home_goals > m.away_goals AND pm.home_goals > pm.away_goals) OR
      (m.home_goals < m.away_goals AND pm.home_goals < pm.away_goals) OR
      (m.home_goals = m.away_goals AND pm.home_goals = pm.away_goals)
    ) THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN m.home_goals = pm.home_goals AND m.away_goals = pm.away_goals THEN 5 ELSE 0 END), 0)
  INTO v_group_match_pts, v_exact_result_pts
  FROM public.prediction_matches pm
  JOIN public.matches m ON m.id = pm.match_id
  WHERE pm.prediction_id = v_prediction_id AND m.stage = 'group'
    AND m.home_goals IS NOT NULL AND m.away_goals IS NOT NULL;

  -- 2) Group position points: use group_standings only when group is complete
  SELECT COALESCE(COUNT(*) * 5, 0)::INTEGER INTO v_group_pos_pts
  FROM public.prediction_group_standings pgs
  JOIN public.group_standings gs
    ON gs.group_id = pgs.group_id AND gs.team_id = pgs.team_id AND gs.position = pgs.position
  WHERE pgs.prediction_id = v_prediction_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.matches um
      WHERE um.stage = 'group'
        AND um.group_id = pgs.group_id
        AND (um.home_goals IS NULL OR um.away_goals IS NULL)
    );

  -- 3) Knockout points by qualified teams in each stage slots
  -- Round of 32: 10 points per correctly predicted qualified team.
  SELECT COALESCE(COUNT(*) * 10, 0)::INTEGER INTO v_r32_pts
  FROM (
    SELECT DISTINCT team_id
    FROM (
      SELECT pm.pred_home_team_id AS team_id
      FROM public.prediction_matches pm
      JOIN public.matches m ON m.id = pm.match_id
      WHERE pm.prediction_id = v_prediction_id
        AND m.stage = 'round-of-32'
        AND pm.pred_home_team_id IS NOT NULL
      UNION ALL
      SELECT pm.pred_away_team_id AS team_id
      FROM public.prediction_matches pm
      JOIN public.matches m ON m.id = pm.match_id
      WHERE pm.prediction_id = v_prediction_id
        AND m.stage = 'round-of-32'
        AND pm.pred_away_team_id IS NOT NULL
    ) predicted_r32
  ) p
  WHERE p.team_id IN (
    SELECT team_id
    FROM (
      SELECT m.home_team_id AS team_id
      FROM public.matches m
      WHERE m.stage = 'round-of-32'
        AND m.home_team_id IS NOT NULL
      UNION ALL
      SELECT m.away_team_id AS team_id
      FROM public.matches m
      WHERE m.stage = 'round-of-32'
        AND m.away_team_id IS NOT NULL
    ) actual_r32
  );

  -- Round of 16: 20 points per correctly predicted qualified team.
  SELECT COALESCE(COUNT(*) * 20, 0)::INTEGER INTO v_r16_pts
  FROM (
    SELECT DISTINCT team_id
    FROM (
      SELECT pm.pred_home_team_id AS team_id
      FROM public.prediction_matches pm
      JOIN public.matches m ON m.id = pm.match_id
      WHERE pm.prediction_id = v_prediction_id
        AND m.stage = 'round-of-16'
        AND pm.pred_home_team_id IS NOT NULL
      UNION ALL
      SELECT pm.pred_away_team_id AS team_id
      FROM public.prediction_matches pm
      JOIN public.matches m ON m.id = pm.match_id
      WHERE pm.prediction_id = v_prediction_id
        AND m.stage = 'round-of-16'
        AND pm.pred_away_team_id IS NOT NULL
    ) predicted_r16
  ) p
  WHERE p.team_id IN (
    SELECT team_id
    FROM (
      SELECT m.home_team_id AS team_id
      FROM public.matches m
      WHERE m.stage = 'round-of-16'
        AND m.home_team_id IS NOT NULL
      UNION ALL
      SELECT m.away_team_id AS team_id
      FROM public.matches m
      WHERE m.stage = 'round-of-16'
        AND m.away_team_id IS NOT NULL
    ) actual_r16
  );

  -- Quarter-finals: 35 points per correctly predicted qualified team.
  SELECT COALESCE(COUNT(*) * 35, 0)::INTEGER INTO v_qf_pts
  FROM (
    SELECT DISTINCT team_id
    FROM (
      SELECT pm.pred_home_team_id AS team_id
      FROM public.prediction_matches pm
      JOIN public.matches m ON m.id = pm.match_id
      WHERE pm.prediction_id = v_prediction_id
        AND m.stage = 'quarter-finals'
        AND pm.pred_home_team_id IS NOT NULL
      UNION ALL
      SELECT pm.pred_away_team_id AS team_id
      FROM public.prediction_matches pm
      JOIN public.matches m ON m.id = pm.match_id
      WHERE pm.prediction_id = v_prediction_id
        AND m.stage = 'quarter-finals'
        AND pm.pred_away_team_id IS NOT NULL
    ) predicted_qf
  ) p
  WHERE p.team_id IN (
    SELECT team_id
    FROM (
      SELECT m.home_team_id AS team_id
      FROM public.matches m
      WHERE m.stage = 'quarter-finals'
        AND m.home_team_id IS NOT NULL
      UNION ALL
      SELECT m.away_team_id AS team_id
      FROM public.matches m
      WHERE m.stage = 'quarter-finals'
        AND m.away_team_id IS NOT NULL
    ) actual_qf
  );

  -- Semi-finals: 50 points per correctly predicted qualified team.
  SELECT COALESCE(COUNT(*) * 50, 0)::INTEGER INTO v_sf_pts
  FROM (
    SELECT DISTINCT team_id
    FROM (
      SELECT pm.pred_home_team_id AS team_id
      FROM public.prediction_matches pm
      JOIN public.matches m ON m.id = pm.match_id
      WHERE pm.prediction_id = v_prediction_id
        AND m.stage = 'semi-finals'
        AND pm.pred_home_team_id IS NOT NULL
      UNION ALL
      SELECT pm.pred_away_team_id AS team_id
      FROM public.prediction_matches pm
      JOIN public.matches m ON m.id = pm.match_id
      WHERE pm.prediction_id = v_prediction_id
        AND m.stage = 'semi-finals'
        AND pm.pred_away_team_id IS NOT NULL
    ) predicted_sf
  ) p
  WHERE p.team_id IN (
    SELECT team_id
    FROM (
      SELECT m.home_team_id AS team_id
      FROM public.matches m
      WHERE m.stage = 'semi-finals'
        AND m.home_team_id IS NOT NULL
      UNION ALL
      SELECT m.away_team_id AS team_id
      FROM public.matches m
      WHERE m.stage = 'semi-finals'
        AND m.away_team_id IS NOT NULL
    ) actual_sf
  );

  -- 4) Finalist points (100 per correctly predicted team in final slots)
  SELECT COALESCE(COUNT(*) * 100, 0)::INTEGER INTO v_finalist_pts
  FROM (
    SELECT DISTINCT team_id
    FROM (
      SELECT pm.pred_home_team_id AS team_id
      FROM public.prediction_matches pm
      JOIN public.matches m ON m.id = pm.match_id
      WHERE pm.prediction_id = v_prediction_id
        AND m.stage = 'final'
        AND pm.pred_home_team_id IS NOT NULL
      UNION ALL
      SELECT pm.pred_away_team_id AS team_id
      FROM public.prediction_matches pm
      JOIN public.matches m ON m.id = pm.match_id
      WHERE pm.prediction_id = v_prediction_id
        AND m.stage = 'final'
        AND pm.pred_away_team_id IS NOT NULL
    ) predicted_final
  ) p
  WHERE p.team_id IN (
    SELECT team_id
    FROM (
      SELECT m.home_team_id AS team_id
      FROM public.matches m
      WHERE m.stage = 'final'
        AND m.home_team_id IS NOT NULL
      UNION ALL
      SELECT m.away_team_id AS team_id
      FROM public.matches m
      WHERE m.stage = 'final'
        AND m.away_team_id IS NOT NULL
    ) actual_final
  );

  -- 5) Honor desde partidos 103 y 104; goleador/figura desde real_results
  SELECT * INTO v_real FROM public.real_results LIMIT 1;
  SELECT * INTO v_pred_special FROM public.prediction_specials WHERE prediction_id = v_prediction_id;

  WITH oc AS (
    SELECT
      f.home_team_id AS h,
      f.away_team_id AS a,
      COALESCE(
        CASE
          WHEN f.winner_team_id IN (f.home_team_id, f.away_team_id) THEN f.winner_team_id
        END,
        CASE
          WHEN f.home_goals > f.away_goals THEN f.home_team_id
          WHEN f.away_goals > f.home_goals THEN f.away_team_id
          ELSE NULL
        END
      ) AS w
    FROM public.matches f
    WHERE f.match_number = 104
      AND f.home_team_id IS NOT NULL
      AND f.away_team_id IS NOT NULL
      AND (
        (f.winner_team_id IS NOT NULL AND f.winner_team_id IN (f.home_team_id, f.away_team_id))
        OR (f.home_goals IS NOT NULL AND f.away_goals IS NOT NULL)
      )
    LIMIT 1
  )
  SELECT
    w,
    CASE
      WHEN w = h THEN a
      WHEN w = a THEN h
      ELSE NULL
    END
  INTO v_official_champ, v_official_ru
  FROM oc;

  WITH ot AS (
    SELECT
      t.home_team_id AS h,
      t.away_team_id AS a,
      COALESCE(
        CASE
          WHEN t.winner_team_id IN (t.home_team_id, t.away_team_id) THEN t.winner_team_id
        END,
        CASE
          WHEN t.home_goals > t.away_goals THEN t.home_team_id
          WHEN t.away_goals > t.home_goals THEN t.away_team_id
          ELSE NULL
        END
      ) AS w
    FROM public.matches t
    WHERE t.match_number = 103
      AND t.home_team_id IS NOT NULL
      AND t.away_team_id IS NOT NULL
      AND (
        (t.winner_team_id IS NOT NULL AND t.winner_team_id IN (t.home_team_id, t.away_team_id))
        OR (t.home_goals IS NOT NULL AND t.away_goals IS NOT NULL)
      )
    LIMIT 1
  )
  SELECT
    w,
    CASE
      WHEN w = h THEN a
      WHEN w = a THEN h
      ELSE NULL
    END
  INTO v_official_third, v_official_fourth
  FROM ot;

  -- Champion: predicted winner of final
  IF v_official_champ IS NOT NULL THEN
    SELECT COALESCE(
      CASE
        WHEN pm.winner_team_id IN (m.home_team_id, m.away_team_id) THEN pm.winner_team_id
      END,
      CASE
        WHEN pm.home_goals > pm.away_goals THEN m.home_team_id
        WHEN pm.away_goals > pm.home_goals THEN m.away_team_id
        ELSE NULL
      END
    ) INTO v_predicted_champ
    FROM public.prediction_matches pm
    JOIN public.matches m ON m.id = pm.match_id
    WHERE pm.prediction_id = v_prediction_id
      AND (m.match_number = 104 OR m.stage = 'final')
    LIMIT 1;
    IF v_predicted_champ = v_official_champ THEN v_champion_pts := 180; END IF;
  END IF;

  -- Runner-up: other predicted finalist
  IF v_official_ru IS NOT NULL THEN
    WITH pw AS (
      SELECT COALESCE(
        CASE
          WHEN pm.winner_team_id IN (m.home_team_id, m.away_team_id) THEN pm.winner_team_id
        END,
        CASE
          WHEN pm.home_goals > pm.away_goals THEN m.home_team_id
          WHEN pm.away_goals > pm.home_goals THEN m.away_team_id
          ELSE NULL
        END
      ) AS w,
        m.home_team_id AS h,
        m.away_team_id AS a
      FROM public.prediction_matches pm
      JOIN public.matches m ON m.id = pm.match_id
      WHERE pm.prediction_id = v_prediction_id
        AND (m.match_number = 104 OR m.stage = 'final')
      LIMIT 1
    )
    SELECT
      CASE
        WHEN w = h THEN a
        WHEN w = a THEN h
        ELSE NULL
      END INTO v_final_other
    FROM pw;
    IF v_final_other IS NOT NULL AND v_final_other = v_official_ru THEN
      v_runner_up_pts := 100;
    END IF;
  END IF;

  -- Third: predicted winner of 3rd-place match
  IF v_official_third IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.prediction_matches pm
      JOIN public.matches m ON m.id = pm.match_id
      WHERE pm.prediction_id = v_prediction_id
        AND (m.match_number = 103 OR m.stage = 'third-place')
        AND COALESCE(
          CASE
            WHEN pm.winner_team_id IN (m.home_team_id, m.away_team_id) THEN pm.winner_team_id
          END,
          CASE
            WHEN pm.home_goals > pm.away_goals THEN m.home_team_id
            WHEN pm.away_goals > pm.home_goals THEN m.away_team_id
            ELSE NULL
          END
        ) = v_official_third
    ) THEN
      v_third_pts := 100;
    END IF;
  END IF;

  -- Fourth: predicted loser of 3rd-place match
  IF v_official_fourth IS NOT NULL THEN
    WITH pw AS (
      SELECT COALESCE(
        CASE
          WHEN pm.winner_team_id IN (m.home_team_id, m.away_team_id) THEN pm.winner_team_id
        END,
        CASE
          WHEN pm.home_goals > pm.away_goals THEN m.home_team_id
          WHEN pm.away_goals > pm.home_goals THEN m.away_team_id
          ELSE NULL
        END
      ) AS w,
        m.home_team_id AS h,
        m.away_team_id AS a
      FROM public.prediction_matches pm
      JOIN public.matches m ON m.id = pm.match_id
      WHERE pm.prediction_id = v_prediction_id
        AND (m.match_number = 103 OR m.stage = 'third-place')
      LIMIT 1
    )
    SELECT
      CASE
        WHEN w = h THEN a
        WHEN w = a THEN h
        ELSE NULL
      END INTO v_third_loser
    FROM pw;
    IF v_third_loser IS NOT NULL AND v_third_loser = v_official_fourth THEN
      v_fourth_pts := 100;
    END IF;
  END IF;

  IF v_real IS NOT NULL THEN
    -- Top scorer: case-insensitive; trim; collapse internal whitespace
    IF v_real.top_scorer IS NOT NULL AND v_pred_special IS NOT NULL
       AND lower(regexp_replace(trim(v_pred_special.top_scorer), '[[:space:]]+', ' ', 'g'))
         = lower(regexp_replace(trim(v_real.top_scorer), '[[:space:]]+', ' ', 'g'))
    THEN v_scorer_pts := 100; END IF;

    -- Best player: same normalization as top scorer
    IF v_real.best_player IS NOT NULL AND v_pred_special IS NOT NULL
       AND lower(regexp_replace(trim(v_pred_special.best_player), '[[:space:]]+', ' ', 'g'))
         = lower(regexp_replace(trim(v_real.best_player), '[[:space:]]+', ' ', 'g'))
    THEN v_player_pts := 100; END IF;
  END IF;

  -- 6) Total & upsert
  v_total := v_group_match_pts + v_exact_result_pts + v_group_pos_pts
           + v_r32_pts + v_r16_pts + v_qf_pts + v_sf_pts + v_finalist_pts
           + v_champion_pts + v_runner_up_pts + v_third_pts + v_fourth_pts
           + v_scorer_pts + v_player_pts;

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
  'Read-only w.r.t. predictions: reads prediction_* vs official matches/real_results, upserts only user_scores.';

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

-- =============================================================================
-- SECTION: Public ranking helpers (SECURITY DEFINER — bypass RLS for any caller)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.count_paid_profiles()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.profiles
  WHERE payment_status = 'paid' AND account_status = 'active';
$$;

COMMENT ON FUNCTION public.count_paid_profiles() IS
  'Paid profiles with active account (excludes banned). SECURITY DEFINER bypasses RLS so any authenticated user can call it.';

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
  'Returns id + display_name for active profiles. SECURITY DEFINER bypasses RLS for public leaderboard.';

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

CREATE OR REPLACE FUNCTION public.list_submitted_prediction_user_ids()
RETURNS TABLE(user_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.user_id
  FROM public.predictions pr
  WHERE pr.submitted_at IS NOT NULL;
$$;

COMMENT ON FUNCTION public.list_submitted_prediction_user_ids() IS
  'Users who saved/submitted a prediction sheet at least once. SECURITY DEFINER bypasses RLS.';
