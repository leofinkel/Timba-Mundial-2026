-- ============================================================================
-- Remove admin override behavior for final group positions.
-- Group standings position must always come from played match results.
-- ============================================================================

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
