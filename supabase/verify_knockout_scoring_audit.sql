-- =============================================================================
-- Auditoria de puntajes eliminatorios (equipos clasificados por fase)
-- Uso:
-- 1) Ejecutar primero la migracion + recalculate_all_scores().
-- 2) Correr este script para detectar diferencias entre esperado y guardado.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) Resumen global: usuarios con diferencias en alguna fase eliminatoria
-- ---------------------------------------------------------------------------
WITH expected AS (
  SELECT
    p.user_id,
    -- Dieciseisavos (round-of-32): 10 por equipo clasificado acertado
    (
      SELECT COALESCE(COUNT(*) * 10, 0)::INTEGER
      FROM (
        SELECT DISTINCT team_id
        FROM (
          SELECT pm.pred_home_team_id AS team_id
          FROM public.prediction_matches pm
          JOIN public.matches m ON m.id = pm.match_id
          WHERE pm.prediction_id = p.id
            AND m.stage = 'round-of-32'
            AND pm.pred_home_team_id IS NOT NULL
          UNION ALL
          SELECT pm.pred_away_team_id AS team_id
          FROM public.prediction_matches pm
          JOIN public.matches m ON m.id = pm.match_id
          WHERE pm.prediction_id = p.id
            AND m.stage = 'round-of-32'
            AND pm.pred_away_team_id IS NOT NULL
        ) pred
      ) pred_r32
      WHERE pred_r32.team_id IN (
        SELECT team_id FROM (
          SELECT m.home_team_id AS team_id
          FROM public.matches m
          WHERE m.stage = 'round-of-32' AND m.home_team_id IS NOT NULL
          UNION ALL
          SELECT m.away_team_id AS team_id
          FROM public.matches m
          WHERE m.stage = 'round-of-32' AND m.away_team_id IS NOT NULL
        ) act
      )
    ) AS expected_r32_points,

    -- Octavos (round-of-16): 20 por equipo clasificado acertado
    (
      SELECT COALESCE(COUNT(*) * 20, 0)::INTEGER
      FROM (
        SELECT DISTINCT team_id
        FROM (
          SELECT pm.pred_home_team_id AS team_id
          FROM public.prediction_matches pm
          JOIN public.matches m ON m.id = pm.match_id
          WHERE pm.prediction_id = p.id
            AND m.stage = 'round-of-16'
            AND pm.pred_home_team_id IS NOT NULL
          UNION ALL
          SELECT pm.pred_away_team_id AS team_id
          FROM public.prediction_matches pm
          JOIN public.matches m ON m.id = pm.match_id
          WHERE pm.prediction_id = p.id
            AND m.stage = 'round-of-16'
            AND pm.pred_away_team_id IS NOT NULL
        ) pred
      ) pred_r16
      WHERE pred_r16.team_id IN (
        SELECT team_id FROM (
          SELECT m.home_team_id AS team_id
          FROM public.matches m
          WHERE m.stage = 'round-of-16' AND m.home_team_id IS NOT NULL
          UNION ALL
          SELECT m.away_team_id AS team_id
          FROM public.matches m
          WHERE m.stage = 'round-of-16' AND m.away_team_id IS NOT NULL
        ) act
      )
    ) AS expected_r16_points,

    -- Cuartos (quarter-finals): 35 por equipo clasificado acertado
    (
      SELECT COALESCE(COUNT(*) * 35, 0)::INTEGER
      FROM (
        SELECT DISTINCT team_id
        FROM (
          SELECT pm.pred_home_team_id AS team_id
          FROM public.prediction_matches pm
          JOIN public.matches m ON m.id = pm.match_id
          WHERE pm.prediction_id = p.id
            AND m.stage = 'quarter-finals'
            AND pm.pred_home_team_id IS NOT NULL
          UNION ALL
          SELECT pm.pred_away_team_id AS team_id
          FROM public.prediction_matches pm
          JOIN public.matches m ON m.id = pm.match_id
          WHERE pm.prediction_id = p.id
            AND m.stage = 'quarter-finals'
            AND pm.pred_away_team_id IS NOT NULL
        ) pred
      ) pred_qf
      WHERE pred_qf.team_id IN (
        SELECT team_id FROM (
          SELECT m.home_team_id AS team_id
          FROM public.matches m
          WHERE m.stage = 'quarter-finals' AND m.home_team_id IS NOT NULL
          UNION ALL
          SELECT m.away_team_id AS team_id
          FROM public.matches m
          WHERE m.stage = 'quarter-finals' AND m.away_team_id IS NOT NULL
        ) act
      )
    ) AS expected_qf_points,

    -- Semifinales (semi-finals): 50 por equipo clasificado acertado
    (
      SELECT COALESCE(COUNT(*) * 50, 0)::INTEGER
      FROM (
        SELECT DISTINCT team_id
        FROM (
          SELECT pm.pred_home_team_id AS team_id
          FROM public.prediction_matches pm
          JOIN public.matches m ON m.id = pm.match_id
          WHERE pm.prediction_id = p.id
            AND m.stage = 'semi-finals'
            AND pm.pred_home_team_id IS NOT NULL
          UNION ALL
          SELECT pm.pred_away_team_id AS team_id
          FROM public.prediction_matches pm
          JOIN public.matches m ON m.id = pm.match_id
          WHERE pm.prediction_id = p.id
            AND m.stage = 'semi-finals'
            AND pm.pred_away_team_id IS NOT NULL
        ) pred
      ) pred_sf
      WHERE pred_sf.team_id IN (
        SELECT team_id FROM (
          SELECT m.home_team_id AS team_id
          FROM public.matches m
          WHERE m.stage = 'semi-finals' AND m.home_team_id IS NOT NULL
          UNION ALL
          SELECT m.away_team_id AS team_id
          FROM public.matches m
          WHERE m.stage = 'semi-finals' AND m.away_team_id IS NOT NULL
        ) act
      )
    ) AS expected_sf_points,

    -- Finalistas (final): 100 por equipo clasificado acertado
    (
      SELECT COALESCE(COUNT(*) * 100, 0)::INTEGER
      FROM (
        SELECT DISTINCT team_id
        FROM (
          SELECT pm.pred_home_team_id AS team_id
          FROM public.prediction_matches pm
          JOIN public.matches m ON m.id = pm.match_id
          WHERE pm.prediction_id = p.id
            AND m.stage = 'final'
            AND pm.pred_home_team_id IS NOT NULL
          UNION ALL
          SELECT pm.pred_away_team_id AS team_id
          FROM public.prediction_matches pm
          JOIN public.matches m ON m.id = pm.match_id
          WHERE pm.prediction_id = p.id
            AND m.stage = 'final'
            AND pm.pred_away_team_id IS NOT NULL
        ) pred
      ) pred_final
      WHERE pred_final.team_id IN (
        SELECT team_id FROM (
          SELECT m.home_team_id AS team_id
          FROM public.matches m
          WHERE m.stage = 'final' AND m.home_team_id IS NOT NULL
          UNION ALL
          SELECT m.away_team_id AS team_id
          FROM public.matches m
          WHERE m.stage = 'final' AND m.away_team_id IS NOT NULL
        ) act
      )
    ) AS expected_finalist_points
  FROM public.predictions p
)
SELECT
  pr.display_name,
  e.user_id,
  COALESCE(us.round_of_32_points, 0) AS stored_r32_points,
  e.expected_r32_points,
  (e.expected_r32_points - COALESCE(us.round_of_32_points, 0)) AS diff_r32,
  COALESCE(us.round_of_16_points, 0) AS stored_r16_points,
  e.expected_r16_points,
  (e.expected_r16_points - COALESCE(us.round_of_16_points, 0)) AS diff_r16,
  COALESCE(us.quarter_final_points, 0) AS stored_qf_points,
  e.expected_qf_points,
  (e.expected_qf_points - COALESCE(us.quarter_final_points, 0)) AS diff_qf,
  COALESCE(us.semi_final_points, 0) AS stored_sf_points,
  e.expected_sf_points,
  (e.expected_sf_points - COALESCE(us.semi_final_points, 0)) AS diff_sf,
  COALESCE(us.finalist_points, 0) AS stored_finalist_points,
  e.expected_finalist_points,
  (e.expected_finalist_points - COALESCE(us.finalist_points, 0)) AS diff_finalists
FROM expected e
JOIN public.profiles pr ON pr.id = e.user_id
LEFT JOIN public.user_scores us ON us.user_id = e.user_id
WHERE
  COALESCE(us.round_of_32_points, 0) <> e.expected_r32_points
  OR COALESCE(us.round_of_16_points, 0) <> e.expected_r16_points
  OR COALESCE(us.quarter_final_points, 0) <> e.expected_qf_points
  OR COALESCE(us.semi_final_points, 0) <> e.expected_sf_points
  OR COALESCE(us.finalist_points, 0) <> e.expected_finalist_points
ORDER BY pr.display_name ASC;

-- ---------------------------------------------------------------------------
-- B) Resumen de cobertura real por fase (sanity check de llaves oficiales)
-- ---------------------------------------------------------------------------
SELECT
  m.stage,
  COUNT(*) AS matches_in_stage,
  COUNT(*) FILTER (WHERE m.home_team_id IS NOT NULL AND m.away_team_id IS NOT NULL) AS matches_with_slots_filled
FROM public.matches m
WHERE m.stage IN ('round-of-32', 'round-of-16', 'quarter-finals', 'semi-finals', 'final')
GROUP BY m.stage
ORDER BY
  CASE m.stage
    WHEN 'round-of-32' THEN 1
    WHEN 'round-of-16' THEN 2
    WHEN 'quarter-finals' THEN 3
    WHEN 'semi-finals' THEN 4
    WHEN 'final' THEN 5
    ELSE 99
  END;
