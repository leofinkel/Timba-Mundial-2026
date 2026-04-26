-- =============================================================================
-- Honor: ganador de predicción **primero por goles** (acorde con scoringService TS);
-- si empate, winner_team_id del pronóstico.
-- Subcampeón: solo si acertó el 2.º puesto y **no** acertó al campeón (no sumar 100
-- extra cuando el perdedor predicho es el subcampeón al haber acertado campeón).
-- Data: al final se limpian resultados desde 16avos. public.matches no tiene updated_at.
-- Luego: recargar y ejecutar recalculate_all_scores().
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
  v_final_w           TEXT;
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

  -- Champion: predicted winner of final (goles primero, igual que TS)
  IF v_official_champ IS NOT NULL THEN
    SELECT
      CASE
        WHEN pm.home_goals > pm.away_goals THEN m.home_team_id
        WHEN pm.away_goals > pm.home_goals THEN m.away_team_id
        WHEN pm.home_goals = pm.away_goals
          AND pm.winner_team_id IN (m.home_team_id, m.away_team_id) THEN pm.winner_team_id
        ELSE NULL
      END
    INTO v_predicted_champ
    FROM public.prediction_matches pm
    JOIN public.matches m ON m.id = pm.match_id
    WHERE pm.prediction_id = v_prediction_id
      AND (m.match_number = 104 OR m.stage = 'final')
    LIMIT 1;
    IF v_predicted_champ = v_official_champ THEN v_champion_pts := 180; END IF;
  END IF;

  -- Runner-up: perdedor predicho = subcampeón real, y **no** acierta campeón
  IF v_official_ru IS NOT NULL THEN
    WITH pw AS (
      SELECT
        CASE
          WHEN pm.home_goals > pm.away_goals THEN m.home_team_id
          WHEN pm.away_goals > pm.home_goals THEN m.away_team_id
          WHEN pm.home_goals = pm.away_goals
            AND pm.winner_team_id IN (m.home_team_id, m.away_team_id) THEN pm.winner_team_id
          ELSE NULL
        END AS w,
        m.home_team_id AS h,
        m.away_team_id AS a
      FROM public.prediction_matches pm
      JOIN public.matches m ON m.id = pm.match_id
      WHERE pm.prediction_id = v_prediction_id
        AND (m.match_number = 104 OR m.stage = 'final')
      LIMIT 1
    )
    SELECT
      w,
      CASE
        WHEN w = h THEN a
        WHEN w = a THEN h
        ELSE NULL
      END
    INTO v_final_w, v_final_other
    FROM pw;
    IF v_final_other IS NOT NULL
       AND v_final_other = v_official_ru
       AND (v_final_w IS DISTINCT FROM v_official_champ)
    THEN
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
        AND (
          CASE
            WHEN pm.home_goals > pm.away_goals THEN m.home_team_id
            WHEN pm.away_goals > pm.home_goals THEN m.away_team_id
            WHEN pm.home_goals = pm.away_goals
              AND pm.winner_team_id IN (m.home_team_id, m.away_team_id) THEN pm.winner_team_id
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
      SELECT
        CASE
          WHEN pm.home_goals > pm.away_goals THEN m.home_team_id
          WHEN pm.away_goals > pm.home_goals THEN m.away_team_id
          WHEN pm.home_goals = pm.away_goals
            AND pm.winner_team_id IN (m.home_team_id, m.away_team_id) THEN pm.winner_team_id
          ELSE NULL
        END AS w,
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

UPDATE public.matches
SET
  home_goals = NULL,
  away_goals = NULL,
  winner_team_id = NULL
WHERE stage IN (
  'round-of-16',
  'quarter-finals',
  'semi-finals',
  'third-place',
  'final'
);

UPDATE public.real_results
SET
  champion_team_id = NULL,
  runner_up_team_id = NULL,
  third_place_team_id = NULL,
  fourth_place_team_id = NULL,
  updated_at = now();

