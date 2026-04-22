-- =============================================================================
-- Puntos por posición de grupo: exigir además que todos los partidos de ese
-- grupo tengan resultado cargado (alineado con app scoringService.ts).
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

  -- 2) Group position points: 4 filas en real_group_standings + todos los partidos del grupo
  SELECT COALESCE(COUNT(*) * 5, 0)::INTEGER INTO v_group_pos_pts
  FROM public.prediction_group_standings pgs
  JOIN public.group_standings gs
    ON gs.group_id = pgs.group_id AND gs.team_id = pgs.team_id AND gs.position = pgs.position
  WHERE pgs.prediction_id = v_prediction_id
    AND EXISTS (
      SELECT 1
      FROM public.real_group_standings r
      WHERE r.group_id = pgs.group_id
      GROUP BY r.group_id
      HAVING COUNT(*) = 4
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.matches um
      WHERE um.stage = 'group'
        AND um.group_id = pgs.group_id
        AND (um.home_goals IS NULL OR um.away_goals IS NULL)
    );

  -- 3) Knockout: correct advancing team per round
  SELECT COALESCE(COUNT(*) * 10, 0)::INTEGER INTO v_r32_pts
  FROM public.prediction_matches pm JOIN public.matches m ON m.id = pm.match_id
  WHERE pm.prediction_id = v_prediction_id AND m.stage = 'round-of-32'
    AND m.winner_team_id IS NOT NULL AND pm.winner_team_id = m.winner_team_id;

  SELECT COALESCE(COUNT(*) * 20, 0)::INTEGER INTO v_r16_pts
  FROM public.prediction_matches pm JOIN public.matches m ON m.id = pm.match_id
  WHERE pm.prediction_id = v_prediction_id AND m.stage = 'round-of-16'
    AND m.winner_team_id IS NOT NULL AND pm.winner_team_id = m.winner_team_id;

  SELECT COALESCE(COUNT(*) * 35, 0)::INTEGER INTO v_qf_pts
  FROM public.prediction_matches pm JOIN public.matches m ON m.id = pm.match_id
  WHERE pm.prediction_id = v_prediction_id AND m.stage = 'quarter-finals'
    AND m.winner_team_id IS NOT NULL AND pm.winner_team_id = m.winner_team_id;

  SELECT COALESCE(COUNT(*) * 50, 0)::INTEGER INTO v_sf_pts
  FROM public.prediction_matches pm JOIN public.matches m ON m.id = pm.match_id
  WHERE pm.prediction_id = v_prediction_id AND m.stage = 'semi-finals'
    AND m.winner_team_id IS NOT NULL AND pm.winner_team_id = m.winner_team_id;

  -- 4) Finalist points (100 per correct team in the final)
  SELECT COALESCE(COUNT(*) * 100, 0)::INTEGER INTO v_finalist_pts
  FROM (
    SELECT pm.winner_team_id AS predicted_finalist
    FROM public.prediction_matches pm JOIN public.matches m ON m.id = pm.match_id
    WHERE pm.prediction_id = v_prediction_id AND m.stage = 'semi-finals' AND pm.winner_team_id IS NOT NULL
  ) pf
  WHERE pf.predicted_finalist IN (
    SELECT mf.home_team_id FROM public.matches mf WHERE mf.stage = 'final' AND mf.home_team_id IS NOT NULL
    UNION
    SELECT mf.away_team_id FROM public.matches mf WHERE mf.stage = 'final' AND mf.away_team_id IS NOT NULL
  );

  -- 5) Champion / Runner-up / Third / Fourth
  SELECT * INTO v_real FROM public.real_results LIMIT 1;
  SELECT * INTO v_pred_special FROM public.prediction_specials WHERE prediction_id = v_prediction_id;

  IF v_real IS NOT NULL THEN
    -- Champion
    IF v_real.champion_team_id IS NOT NULL THEN
      SELECT pm.winner_team_id INTO v_predicted_champ
      FROM public.prediction_matches pm JOIN public.matches m ON m.id = pm.match_id
      WHERE pm.prediction_id = v_prediction_id AND m.stage = 'final' LIMIT 1;
      IF v_predicted_champ = v_real.champion_team_id THEN v_champion_pts := 180; END IF;
    END IF;

    -- Runner-up (user's other SF winner that isn't the predicted champion)
    IF v_real.runner_up_team_id IS NOT NULL THEN
      PERFORM 1 FROM public.prediction_matches pm JOIN public.matches m ON m.id = pm.match_id
      WHERE pm.prediction_id = v_prediction_id AND m.stage = 'semi-finals'
        AND pm.winner_team_id = v_real.runner_up_team_id;
      IF FOUND THEN v_runner_up_pts := 100; END IF;
    END IF;

    -- Third place
    IF v_real.third_place_team_id IS NOT NULL THEN
      PERFORM 1 FROM public.prediction_matches pm JOIN public.matches m ON m.id = pm.match_id
      WHERE pm.prediction_id = v_prediction_id AND m.stage = 'third-place'
        AND pm.winner_team_id = v_real.third_place_team_id;
      IF FOUND THEN v_third_pts := 100; END IF;
    END IF;

    -- Fourth place (QF winner that lost the SF and then lost the third-place match)
    IF v_real.fourth_place_team_id IS NOT NULL THEN
      PERFORM 1 FROM public.prediction_matches pm JOIN public.matches m ON m.id = pm.match_id
      WHERE pm.prediction_id = v_prediction_id AND m.stage = 'quarter-finals'
        AND pm.winner_team_id = v_real.fourth_place_team_id
        AND pm.winner_team_id NOT IN (
          SELECT pm2.winner_team_id FROM public.prediction_matches pm2
          JOIN public.matches m2 ON m2.id = pm2.match_id
          WHERE pm2.prediction_id = v_prediction_id AND m2.stage = 'semi-finals' AND pm2.winner_team_id IS NOT NULL
        );
      IF FOUND THEN v_fourth_pts := 100; END IF;
    END IF;

    -- Top scorer: case-insensitive; trim; collapse internal whitespace (match app)
    IF v_real.top_scorer IS NOT NULL AND v_pred_special IS NOT NULL
       AND lower(regexp_replace(trim(v_pred_special.top_scorer), '[[:space:]]+', ' ', 'g'))
         = lower(regexp_replace(trim(v_real.top_scorer), '[[:space:]]+', ' ', 'g'))
    THEN v_scorer_pts := 100; END IF;

    -- Best player (same normalization as top scorer)
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
  'Computes all scoring categories for one user and upserts into user_scores.';
