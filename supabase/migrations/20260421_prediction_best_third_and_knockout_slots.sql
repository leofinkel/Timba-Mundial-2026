-- Per-prediction snapshot of the 8 best third-placed teams (FIFA matrix + slots)
-- and persisted predicted home/away for knockout matches (R32 → final) so reload
-- keeps the bracket built from the user’s group stage.

CREATE TABLE public.prediction_best_third_place_qualifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  prediction_id UUID NOT NULL REFERENCES public.predictions (id) ON DELETE CASCADE,
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
  opponent_source TEXT NOT NULL,
  UNIQUE (prediction_id, rank_pos)
);

CREATE INDEX idx_prediction_best_third_prediction_id
  ON public.prediction_best_third_place_qualifiers (prediction_id);

COMMENT ON TABLE public.prediction_best_third_place_qualifiers IS
  'User-predicted best 8 group thirds + FIFA combination row; drives R32 third slots for that prediction.';

ALTER TABLE public.prediction_matches
  ADD COLUMN IF NOT EXISTS pred_home_team_id TEXT REFERENCES public.teams (id),
  ADD COLUMN IF NOT EXISTS pred_away_team_id TEXT REFERENCES public.teams (id);

COMMENT ON COLUMN public.prediction_matches.pred_home_team_id IS
  'Predicted home team for this knockout slot (from group stage + matrix + prior winners).';
COMMENT ON COLUMN public.prediction_matches.pred_away_team_id IS
  'Predicted away team for this knockout slot.';

ALTER TABLE public.prediction_best_third_place_qualifiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prediction_best_third_own_or_admin"
  ON public.prediction_best_third_place_qualifiers
  FOR ALL
  TO authenticated
  USING (public.owns_prediction (prediction_id) OR public.is_admin ())
  WITH CHECK (public.owns_prediction (prediction_id) OR public.is_admin ());
