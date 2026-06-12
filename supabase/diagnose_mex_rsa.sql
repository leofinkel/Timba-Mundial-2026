-- Diagnóstico: México 2–0 Sudáfrica (match_number = 1) vs puntos asignados.
-- Ejecutar en el SQL editor de Supabase.

WITH mex_rsa AS (
  SELECT id, home_goals, away_goals
  FROM public.matches
  WHERE match_number = 1
    AND home_team_id = 'mex'
    AND away_team_id = 'rsa'
  LIMIT 1
),
preds AS (
  SELECT
    pr.display_name,
    p.user_id,
    pm.home_goals AS pred_home,
    pm.away_goals AS pred_away,
    m.home_goals AS real_home,
    m.away_goals AS real_away,
    CASE
      WHEN pm.home_goals > pm.away_goals AND m.home_goals > m.away_goals THEN 1
      WHEN pm.home_goals < pm.away_goals AND m.home_goals < m.away_goals THEN 1
      WHEN pm.home_goals = pm.away_goals AND m.home_goals = m.away_goals THEN 1
      ELSE 0
    END AS should_outcome_pt,
    CASE
      WHEN pm.home_goals = m.home_goals AND pm.away_goals = m.away_goals THEN 5
      ELSE 0
    END AS should_exact_pt,
    COALESCE(us.group_match_points, 0) AS got_group_pts,
    COALESCE(us.exact_result_bonus, 0) AS got_exact_pts,
    COALESCE(us.total_points, 0) AS total_pts
  FROM public.predictions p
  JOIN public.profiles pr ON pr.id = p.user_id
  LEFT JOIN public.prediction_matches pm
    ON pm.prediction_id = p.id
   AND pm.match_id = (SELECT id FROM mex_rsa)
  LEFT JOIN mex_rsa m ON true
  LEFT JOIN public.user_scores us ON us.user_id = p.user_id
  WHERE p.submitted_at IS NOT NULL
)
SELECT *
FROM preds
ORDER BY should_outcome_pt DESC, should_exact_pt DESC, display_name;
