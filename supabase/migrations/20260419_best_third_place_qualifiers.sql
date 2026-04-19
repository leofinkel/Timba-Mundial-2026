-- Snapshot of the 8 best third-placed teams after the group stage, with FIFA
-- combination metadata (línea 1–495 = lexicographic index of the four excluded
-- groups) and each team’s R32 slot + opponent source (e.g. 1B).

CREATE TABLE public.best_third_place_qualifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  combination_line SMALLINT NOT NULL CHECK (
    combination_line >= 1
    AND combination_line <= 495
  ),
  qualifying_groups_key TEXT NOT NULL,
  excluded_groups_key TEXT NOT NULL,
  rank_pos SMALLINT NOT NULL CHECK (rank_pos >= 1 AND rank_pos <= 8),
  group_id TEXT NOT NULL,
  team_id TEXT NOT NULL REFERENCES public.teams (id),
  round_of_32_match_number SMALLINT NOT NULL,
  opponent_source TEXT NOT NULL
);

CREATE INDEX idx_best_third_place_qualifiers_updated
  ON public.best_third_place_qualifiers (updated_at DESC);

COMMENT ON TABLE public.best_third_place_qualifiers IS
  'Eight best group thirds after tiebreakers; combination_line matches FIFA/Excel row (sorted excluded-four index + 1).';

ALTER TABLE public.best_third_place_qualifiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "best_third_place_qualifiers_select_public"
  ON public.best_third_place_qualifiers
  FOR SELECT
  USING (true);

CREATE POLICY "best_third_place_qualifiers_write_admin"
  ON public.best_third_place_qualifiers
  FOR ALL
  TO authenticated
  USING (public.is_admin ())
  WITH CHECK (public.is_admin ());
