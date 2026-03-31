-- =============================================================================
-- Timba Mundial 2026 — PostgreSQL / Supabase schema
-- World Cup 2026 prediction app: profiles, fixtures, predictions, scoring.
-- =============================================================================

-- gen_random_uuid() is built into PostgreSQL 13+ (Supabase default).

-- =============================================================================
-- SECTION: Tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles: app user profile linked 1:1 with Supabase Auth.
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Application user profile; one row per auth user (id matches auth.users).';

-- -----------------------------------------------------------------------------
-- game_rules: admin-managed full game regulation sections.
-- -----------------------------------------------------------------------------
CREATE TABLE public.game_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.game_rules IS 'Admin-maintained complete regulation blocks shown in the app.';

-- -----------------------------------------------------------------------------
-- teams: national teams in the tournament.
-- -----------------------------------------------------------------------------
CREATE TABLE public.teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  flag_url TEXT,
  group_id TEXT CHECK (
    group_id IS NULL
    OR group_id IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L')
  )
);

COMMENT ON TABLE public.teams IS 'World Cup teams; id is a stable slug (e.g. arg), code is FIFA-style 3 letters.';

-- -----------------------------------------------------------------------------
-- matches: scheduled and played fixtures (group + knockout).
-- -----------------------------------------------------------------------------
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage TEXT NOT NULL CHECK (
    stage IN (
      'group',
      'round-of-32',
      'round-of-16',
      'quarter-finals',
      'semi-finals',
      'third-place',
      'final'
    )
  ),
  group_id TEXT CHECK (
    group_id IS NULL
    OR group_id IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L')
  ),
  match_number INTEGER NOT NULL,
  matchday INTEGER CHECK (matchday IS NULL OR matchday BETWEEN 1 AND 3),
  home_team_id TEXT REFERENCES public.teams (id),
  away_team_id TEXT REFERENCES public.teams (id),
  home_goals INTEGER CHECK (home_goals IS NULL OR home_goals >= 0),
  away_goals INTEGER CHECK (away_goals IS NULL OR away_goals >= 0),
  winner_team_id TEXT REFERENCES public.teams (id),
  home_source TEXT,
  away_source TEXT,
  played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT matches_teams_distinct CHECK (
    home_team_id IS NULL
    OR away_team_id IS NULL
    OR home_team_id <> away_team_id
  )
);

COMMENT ON TABLE public.matches IS 'Tournament matches; group stage uses group_id/matchday; knockout may use home_source/away_source before teams are known.';

-- -----------------------------------------------------------------------------
-- predictions: one bracket entry per user (locked after submit).
-- -----------------------------------------------------------------------------
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

COMMENT ON TABLE public.predictions IS 'User prediction sheet; UNIQUE(user_id) enforces one prediction set per profile.';

-- -----------------------------------------------------------------------------
-- prediction_matches: per-match score (and knockout winner) picks.
-- -----------------------------------------------------------------------------
CREATE TABLE public.prediction_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES public.predictions (id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  home_goals INTEGER NOT NULL CHECK (home_goals >= 0),
  away_goals INTEGER NOT NULL CHECK (away_goals >= 0),
  winner_team_id TEXT REFERENCES public.teams (id),
  UNIQUE (prediction_id, match_id)
);

COMMENT ON TABLE public.prediction_matches IS 'Predicted score per match; winner_team_id used when stage requires a winner (e.g. pens).';

-- -----------------------------------------------------------------------------
-- prediction_group_standings: predicted final order in each group (1–4).
-- -----------------------------------------------------------------------------
CREATE TABLE public.prediction_group_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES public.predictions (id) ON DELETE CASCADE,
  group_id TEXT NOT NULL CHECK (
    group_id IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L')
  ),
  team_id TEXT NOT NULL REFERENCES public.teams (id),
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 4),
  UNIQUE (prediction_id, group_id, position)
);

COMMENT ON TABLE public.prediction_group_standings IS 'User-predicted group table: which team finishes in each position.';

-- -----------------------------------------------------------------------------
-- prediction_specials: top scorer and best player picks.
-- -----------------------------------------------------------------------------
CREATE TABLE public.prediction_specials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES public.predictions (id) ON DELETE CASCADE,
  top_scorer TEXT NOT NULL,
  best_player TEXT NOT NULL,
  UNIQUE (prediction_id)
);

COMMENT ON TABLE public.prediction_specials IS 'Special predictions (player names) tied to one prediction set.';

-- -----------------------------------------------------------------------------
-- user_scores: computed points breakdown and leaderboard rank.
-- -----------------------------------------------------------------------------
CREATE TABLE public.user_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  group_match_points INTEGER NOT NULL DEFAULT 0,
  exact_result_bonus INTEGER NOT NULL DEFAULT 0,
  group_position_points INTEGER NOT NULL DEFAULT 0,
  round_of_32_points INTEGER NOT NULL DEFAULT 0,
  round_of_16_points INTEGER NOT NULL DEFAULT 0,
  quarter_final_points INTEGER NOT NULL DEFAULT 0,
  semi_final_points INTEGER NOT NULL DEFAULT 0,
  finalist_points INTEGER NOT NULL DEFAULT 0,
  champion_points INTEGER NOT NULL DEFAULT 0,
  runner_up_points INTEGER NOT NULL DEFAULT 0,
  third_place_points INTEGER NOT NULL DEFAULT 0,
  fourth_place_points INTEGER NOT NULL DEFAULT 0,
  top_scorer_points INTEGER NOT NULL DEFAULT 0,
  best_player_points INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

COMMENT ON TABLE public.user_scores IS 'Aggregated scoring per user; typically updated by server-side jobs, not directly by clients.';

-- -----------------------------------------------------------------------------
-- real_results: official tournament outcomes (admin-maintained).
-- -----------------------------------------------------------------------------
CREATE TABLE public.real_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  top_scorer TEXT,
  best_player TEXT,
  champion_team_id TEXT REFERENCES public.teams (id),
  runner_up_team_id TEXT REFERENCES public.teams (id),
  third_place_team_id TEXT REFERENCES public.teams (id),
  fourth_place_team_id TEXT REFERENCES public.teams (id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.real_results IS 'Canonical FIFA-style special results (champion, awards); used to score specials and finals.';

-- =============================================================================
-- SECTION: Indexes (frequent filters, joins, leaderboard)
-- =============================================================================

CREATE INDEX idx_profiles_email ON public.profiles (email);
CREATE INDEX idx_profiles_role ON public.profiles (role);
CREATE INDEX idx_game_rules_sort_order ON public.game_rules (sort_order);

CREATE INDEX idx_teams_group_id ON public.teams (group_id);

CREATE INDEX idx_matches_stage ON public.matches (stage);
CREATE INDEX idx_matches_group_id ON public.matches (group_id);
CREATE INDEX idx_matches_match_number ON public.matches (match_number);
CREATE INDEX idx_matches_played_at ON public.matches (played_at);
CREATE INDEX idx_matches_home_team_id ON public.matches (home_team_id);
CREATE INDEX idx_matches_away_team_id ON public.matches (away_team_id);

-- predictions.user_id and user_scores.user_id already indexed by UNIQUE constraints.

CREATE INDEX idx_prediction_matches_prediction_id ON public.prediction_matches (prediction_id);
CREATE INDEX idx_prediction_matches_match_id ON public.prediction_matches (match_id);

CREATE INDEX idx_prediction_group_standings_prediction_id ON public.prediction_group_standings (prediction_id);
CREATE INDEX idx_prediction_group_standings_group_id ON public.prediction_group_standings (group_id);

CREATE INDEX idx_prediction_specials_prediction_id ON public.prediction_specials (prediction_id);

CREATE INDEX idx_user_scores_total_points_desc ON public.user_scores (total_points DESC NULLS LAST);
CREATE INDEX idx_user_scores_rank ON public.user_scores (rank);

-- =============================================================================
-- SECTION: updated_at trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at() IS 'Sets NEW.updated_at to now() before row update.';

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_game_rules_updated_at
  BEFORE UPDATE ON public.game_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_predictions_updated_at
  BEFORE UPDATE ON public.predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_user_scores_updated_at
  BEFORE UPDATE ON public.user_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_real_results_updated_at
  BEFORE UPDATE ON public.real_results
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- SECTION: Auto-create profile on auth.users insert
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data ->> 'display_name'), ''),
      NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
      split_part(COALESCE(NEW.email, 'user'), '@', 1),
      'User'
    )
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'After signup, inserts a public.profiles row for the new auth user.';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- SECTION: RLS helpers (avoid recursive policy checks on profiles)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS 'True if the current auth user has role admin in profiles.';

CREATE OR REPLACE FUNCTION public.owns_prediction(prediction_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.predictions pr
    WHERE pr.id = prediction_uuid
      AND pr.user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.owns_prediction(UUID) IS 'True if prediction_uuid belongs to the current auth user.';

-- =============================================================================
-- SECTION: Row Level Security
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_group_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_specials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_results ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_insert_own_or_admin"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_delete_admin"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- game_rules: all authenticated can read; admins maintain
-- -----------------------------------------------------------------------------
CREATE POLICY "game_rules_select_authenticated"
  ON public.game_rules
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "game_rules_write_admin"
  ON public.game_rules
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- teams & matches: readable by any signed-in user; writes admin-only
-- -----------------------------------------------------------------------------
CREATE POLICY "teams_select_authenticated"
  ON public.teams
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "teams_write_admin"
  ON public.teams
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "matches_select_authenticated"
  ON public.matches
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "matches_write_admin"
  ON public.matches
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- predictions: users see/manage own; admins full access
-- -----------------------------------------------------------------------------
CREATE POLICY "predictions_select_own_or_admin"
  ON public.predictions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "predictions_insert_own_or_admin"
  ON public.predictions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "predictions_update_own_or_admin"
  ON public.predictions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "predictions_delete_own_or_admin"
  ON public.predictions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- -----------------------------------------------------------------------------
-- prediction_* children: same ownership as parent prediction (CRUD)
-- -----------------------------------------------------------------------------
CREATE POLICY "prediction_matches_own_or_admin"
  ON public.prediction_matches
  FOR ALL
  TO authenticated
  USING (public.owns_prediction(prediction_id) OR public.is_admin())
  WITH CHECK (public.owns_prediction(prediction_id) OR public.is_admin());

CREATE POLICY "prediction_group_standings_own_or_admin"
  ON public.prediction_group_standings
  FOR ALL
  TO authenticated
  USING (public.owns_prediction(prediction_id) OR public.is_admin())
  WITH CHECK (public.owns_prediction(prediction_id) OR public.is_admin());

CREATE POLICY "prediction_specials_own_or_admin"
  ON public.prediction_specials
  FOR ALL
  TO authenticated
  USING (public.owns_prediction(prediction_id) OR public.is_admin())
  WITH CHECK (public.owns_prediction(prediction_id) OR public.is_admin());

-- -----------------------------------------------------------------------------
-- user_scores: users read own; admins read/write; server role bypasses RLS
-- -----------------------------------------------------------------------------
CREATE POLICY "user_scores_select_own_or_admin"
  ON public.user_scores
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "user_scores_write_admin"
  ON public.user_scores
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- real_results: all authenticated can read; admins maintain
-- -----------------------------------------------------------------------------
CREATE POLICY "real_results_select_authenticated"
  ON public.real_results
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "real_results_write_admin"
  ON public.real_results
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
