-- =============================================================================
-- 20260418_third_place_ranking_and_matrix
--
-- Ejecución: Supabase Dashboard → SQL Editor → pegar ESTE ARCHIVO COMPLETO → Run.
--
-- Incluye DROP antes de recrear la RPC (evita error 42P13 al cambiar columnas
-- de salida). Primero DROP simple; luego un DO que borra cualquier sobrecarga.
--
-- Columnas: idempotente (IF NOT EXISTS). UPDATE de fifa_ranking: re-ejecutable.
-- =============================================================================

-- Third-place tiebreakers (FIFA Regulations): pts, GD, GF, fair play, FIFA ranking.
-- Seeded fifa_ranking is approximate (Dec 2024 snapshot); update before kickoff as needed.

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS fifa_ranking INTEGER,
  ADD COLUMN IF NOT EXISTS group_stage_fair_play_score INTEGER;

COMMENT ON COLUMN public.teams.fifa_ranking IS
  'FIFA men''s ranking position at tournament start (lower = better).';
COMMENT ON COLUMN public.teams.group_stage_fair_play_score IS
  'Group-stage fair-play sum (yellow -1, indirect red -3, direct red -4); higher is better.';

UPDATE public.teams SET fifa_ranking = 1 WHERE id = 'arg';
UPDATE public.teams SET fifa_ranking = 2 WHERE id = 'fra';
UPDATE public.teams SET fifa_ranking = 3 WHERE id = 'eng';
UPDATE public.teams SET fifa_ranking = 4 WHERE id = 'bel';
UPDATE public.teams SET fifa_ranking = 5 WHERE id = 'bra';
UPDATE public.teams SET fifa_ranking = 6 WHERE id = 'esp';
UPDATE public.teams SET fifa_ranking = 7 WHERE id = 'ned';
UPDATE public.teams SET fifa_ranking = 8 WHERE id = 'por';
UPDATE public.teams SET fifa_ranking = 9 WHERE id = 'cro';
UPDATE public.teams SET fifa_ranking = 10 WHERE id = 'col';
UPDATE public.teams SET fifa_ranking = 11 WHERE id = 'uru';
UPDATE public.teams SET fifa_ranking = 12 WHERE id = 'mar';
UPDATE public.teams SET fifa_ranking = 13 WHERE id = 'ger';
UPDATE public.teams SET fifa_ranking = 14 WHERE id = 'usa';
UPDATE public.teams SET fifa_ranking = 15 WHERE id = 'mex';
UPDATE public.teams SET fifa_ranking = 16 WHERE id = 'jpn';
UPDATE public.teams SET fifa_ranking = 17 WHERE id = 'sui';
UPDATE public.teams SET fifa_ranking = 18 WHERE id = 'sen';
UPDATE public.teams SET fifa_ranking = 19 WHERE id = 'irn';
UPDATE public.teams SET fifa_ranking = 20 WHERE id = 'kor';
UPDATE public.teams SET fifa_ranking = 21 WHERE id = 'aut';
UPDATE public.teams SET fifa_ranking = 22 WHERE id = 'aus';
UPDATE public.teams SET fifa_ranking = 23 WHERE id = 'swe';
UPDATE public.teams SET fifa_ranking = 24 WHERE id = 'ecu';
UPDATE public.teams SET fifa_ranking = 25 WHERE id = 'tun';
UPDATE public.teams SET fifa_ranking = 26 WHERE id = 'civ';
UPDATE public.teams SET fifa_ranking = 27 WHERE id = 'alg';
UPDATE public.teams SET fifa_ranking = 28 WHERE id = 'pan';
UPDATE public.teams SET fifa_ranking = 29 WHERE id = 'can';
UPDATE public.teams SET fifa_ranking = 30 WHERE id = 'qat';
UPDATE public.teams SET fifa_ranking = 31 WHERE id = 'sco';
UPDATE public.teams SET fifa_ranking = 32 WHERE id = 'nor';
UPDATE public.teams SET fifa_ranking = 33 WHERE id = 'par';
UPDATE public.teams SET fifa_ranking = 34 WHERE id = 'egy';
UPDATE public.teams SET fifa_ranking = 35 WHERE id = 'irq';
UPDATE public.teams SET fifa_ranking = 36 WHERE id = 'rdc';
UPDATE public.teams SET fifa_ranking = 37 WHERE id = 'uzb';
UPDATE public.teams SET fifa_ranking = 38 WHERE id = 'gha';
UPDATE public.teams SET fifa_ranking = 39 WHERE id = 'rsa';
UPDATE public.teams SET fifa_ranking = 40 WHERE id = 'cze';
UPDATE public.teams SET fifa_ranking = 41 WHERE id = 'tur';
UPDATE public.teams SET fifa_ranking = 42 WHERE id = 'bih';
UPDATE public.teams SET fifa_ranking = 43 WHERE id = 'cuw';
UPDATE public.teams SET fifa_ranking = 44 WHERE id = 'nzl';
UPDATE public.teams SET fifa_ranking = 45 WHERE id = 'ksa';
UPDATE public.teams SET fifa_ranking = 46 WHERE id = 'cpv';
UPDATE public.teams SET fifa_ranking = 47 WHERE id = 'hai';
UPDATE public.teams SET fifa_ranking = 48 WHERE id = 'jor';

-- -----------------------------------------------------------------------------
-- get_best_third_place_teams: DROP obligatorio si cambia RETURNS TABLE
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_best_third_place_teams() CASCADE;

-- Por si existiera otra firma con el mismo nombre (borra todas las variantes en public).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS schemaname,
           p.proname,
           pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_best_third_place_teams'
  LOOP
    EXECUTE format(
      'DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
      r.schemaname,
      r.proname,
      r.args
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.get_best_third_place_teams()
RETURNS TABLE (
  rank_pos  INTEGER,
  group_id  TEXT,
  team_id   TEXT,
  team_name TEXT,
  points    INTEGER,
  goal_difference INTEGER,
  goals_for INTEGER,
  fair_play_score INTEGER,
  fifa_ranking INTEGER
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY
        gs.points DESC,
        gs.goal_difference DESC,
        gs.goals_for DESC,
        COALESCE(t.group_stage_fair_play_score, 0) DESC,
        COALESCE(t.fifa_ranking, 999) ASC,
        gs.team_name ASC
    )::INTEGER AS rank_pos,
    gs.group_id,
    gs.team_id,
    gs.team_name,
    gs.points,
    gs.goal_difference,
    gs.goals_for,
    COALESCE(t.group_stage_fair_play_score, 0)::INTEGER AS fair_play_score,
    COALESCE(t.fifa_ranking, 999)::INTEGER AS fifa_ranking
  FROM public.group_standings gs
  JOIN public.teams t ON t.id = gs.team_id
  WHERE gs.position = 3
  ORDER BY
    gs.points DESC,
    gs.goal_difference DESC,
    gs.goals_for DESC,
    COALESCE(t.group_stage_fair_play_score, 0) DESC,
    COALESCE(t.fifa_ranking, 999) ASC,
    gs.team_name ASC
  LIMIT 8;
$$;

COMMENT ON FUNCTION public.get_best_third_place_teams() IS
  'Returns the 8 best third-place teams: pts, GD, GF, fair play, FIFA ranking.';
