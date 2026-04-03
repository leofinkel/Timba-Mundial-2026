-- Admin override for final group positions (FIFA tie-break etc.).
-- When a group has exactly 4 rows here, public.group_standings uses these positions
-- instead of the computed table from match results (stats columns still from matches).

CREATE TABLE IF NOT EXISTS public.real_group_standings (
  group_id TEXT NOT NULL CHECK (
    group_id IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L')
  ),
  team_id TEXT NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, team_id),
  UNIQUE (group_id, position)
);

COMMENT ON TABLE public.real_group_standings IS
  'Optional admin-defined final order per group. If a group has exactly 4 rows, scoring and bracket resolution use this order instead of computed standings.';

CREATE INDEX IF NOT EXISTS idx_real_group_standings_group_id ON public.real_group_standings (group_id);

ALTER TABLE public.real_group_standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "real_group_standings_select_authenticated"
  ON public.real_group_standings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "real_group_standings_write_admin"
  ON public.real_group_standings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

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
),
computed AS (
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
    )::INTEGER AS computed_position
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
),
active_override AS (
  SELECT rgs.group_id
  FROM public.real_group_standings rgs
  GROUP BY rgs.group_id
  HAVING COUNT(*) = 4
)
SELECT
  c.group_id,
  c.team_id,
  c.team_name,
  c.team_code,
  c.played,
  c.won,
  c.drawn,
  c.lost,
  c.goals_for,
  c.goals_against,
  c.goal_difference,
  c.points,
  CASE
    WHEN a.group_id IS NOT NULL AND r.position IS NOT NULL THEN r.position
    ELSE c.computed_position
  END AS position
FROM computed c
LEFT JOIN active_override a ON a.group_id = c.group_id
LEFT JOIN public.real_group_standings r
  ON r.group_id = c.group_id
  AND r.team_id = c.team_id
ORDER BY c.group_id, position;

COMMENT ON VIEW public.group_standings IS
  'Group table: stats from match results; position from admin override (4 rows) when set, else computed (pts > GD > GF).';
