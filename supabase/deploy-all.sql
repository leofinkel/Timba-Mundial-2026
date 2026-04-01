-- =============================================================================
-- Timba Mundial 2026 — DEPLOY ALL
-- Single file to run in Supabase SQL Editor.
-- Includes: reset + schema + seed + functions
-- =============================================================================

-- #####################################################################
-- STEP 1: RESET (clean slate)
-- #####################################################################

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP TABLE IF EXISTS public.news_posts CASCADE;
DROP TABLE IF EXISTS public.prediction_matches CASCADE;
DROP TABLE IF EXISTS public.prediction_group_standings CASCADE;
DROP TABLE IF EXISTS public.prediction_specials CASCADE;
DROP TABLE IF EXISTS public.predictions CASCADE;
DROP TABLE IF EXISTS public.user_scores CASCADE;
DROP TABLE IF EXISTS public.real_results CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.game_rules CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP VIEW IF EXISTS public.group_standings CASCADE;
DROP FUNCTION IF EXISTS public.get_prediction_group_standings(UUID);
DROP FUNCTION IF EXISTS public.calculate_user_score(UUID);
DROP FUNCTION IF EXISTS public.recalculate_all_scores();
DROP FUNCTION IF EXISTS public.owns_prediction(UUID);
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.set_updated_at();

-- #####################################################################
-- STEP 2: SCHEMA (tables, indexes, triggers, RLS)
-- #####################################################################

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

CREATE TABLE public.game_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  flag_url TEXT,
  group_id TEXT CHECK (
    group_id IS NULL
    OR group_id IN ('A','B','C','D','E','F','G','H','I','J','K','L')
  )
);

CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage TEXT NOT NULL CHECK (
    stage IN ('group','round-of-32','round-of-16','quarter-finals','semi-finals','third-place','final')
  ),
  group_id TEXT CHECK (
    group_id IS NULL
    OR group_id IN ('A','B','C','D','E','F','G','H','I','J','K','L')
  ),
  match_number INTEGER NOT NULL UNIQUE,
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
    home_team_id IS NULL OR away_team_id IS NULL OR home_team_id <> away_team_id
  )
);

CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE TABLE public.prediction_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES public.predictions (id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  home_goals INTEGER NOT NULL CHECK (home_goals >= 0),
  away_goals INTEGER NOT NULL CHECK (away_goals >= 0),
  winner_team_id TEXT REFERENCES public.teams (id),
  UNIQUE (prediction_id, match_id)
);

CREATE TABLE public.prediction_group_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES public.predictions (id) ON DELETE CASCADE,
  group_id TEXT NOT NULL CHECK (
    group_id IN ('A','B','C','D','E','F','G','H','I','J','K','L')
  ),
  team_id TEXT NOT NULL REFERENCES public.teams (id),
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 4),
  UNIQUE (prediction_id, group_id, position)
);

CREATE TABLE public.prediction_specials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES public.predictions (id) ON DELETE CASCADE,
  top_scorer TEXT NOT NULL,
  best_player TEXT NOT NULL,
  UNIQUE (prediction_id)
);

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

CREATE TABLE public.news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
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
CREATE INDEX idx_prediction_matches_prediction_id ON public.prediction_matches (prediction_id);
CREATE INDEX idx_prediction_matches_match_id ON public.prediction_matches (match_id);
CREATE INDEX idx_prediction_group_standings_prediction_id ON public.prediction_group_standings (prediction_id);
CREATE INDEX idx_prediction_group_standings_group_id ON public.prediction_group_standings (group_id);
CREATE INDEX idx_prediction_specials_prediction_id ON public.prediction_specials (prediction_id);
CREATE INDEX idx_user_scores_total_points_desc ON public.user_scores (total_points DESC NULLS LAST);
CREATE INDEX idx_user_scores_rank ON public.user_scores (rank);
CREATE INDEX idx_news_posts_created_at_desc ON public.news_posts (created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_game_rules_updated_at BEFORE UPDATE ON public.game_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_predictions_updated_at BEFORE UPDATE ON public.predictions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_user_scores_updated_at BEFORE UPDATE ON public.user_scores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_real_results_updated_at BEFORE UPDATE ON public.real_results FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_news_posts_updated_at BEFORE UPDATE ON public.news_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS helpers
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.owns_prediction(prediction_uuid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.predictions pr WHERE pr.id = prediction_uuid AND pr.user_id = auth.uid());
$$;

-- RLS
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
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_insert_own_or_admin" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "game_rules_select_public" ON public.game_rules FOR SELECT USING (true);
CREATE POLICY "game_rules_write_admin" ON public.game_rules FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "teams_select_public" ON public.teams FOR SELECT USING (true);
CREATE POLICY "teams_write_admin" ON public.teams FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "matches_select_public" ON public.matches FOR SELECT USING (true);
CREATE POLICY "matches_write_admin" ON public.matches FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "predictions_select_own_or_admin" ON public.predictions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "predictions_insert_own_or_admin" ON public.predictions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "predictions_update_own_or_admin" ON public.predictions FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "predictions_delete_own_or_admin" ON public.predictions FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "prediction_matches_own_or_admin" ON public.prediction_matches FOR ALL TO authenticated USING (public.owns_prediction(prediction_id) OR public.is_admin()) WITH CHECK (public.owns_prediction(prediction_id) OR public.is_admin());
CREATE POLICY "prediction_group_standings_own_or_admin" ON public.prediction_group_standings FOR ALL TO authenticated USING (public.owns_prediction(prediction_id) OR public.is_admin()) WITH CHECK (public.owns_prediction(prediction_id) OR public.is_admin());
CREATE POLICY "prediction_specials_own_or_admin" ON public.prediction_specials FOR ALL TO authenticated USING (public.owns_prediction(prediction_id) OR public.is_admin()) WITH CHECK (public.owns_prediction(prediction_id) OR public.is_admin());

CREATE POLICY "user_scores_select_own_or_admin" ON public.user_scores FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "user_scores_write_admin" ON public.user_scores FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "real_results_select_authenticated" ON public.real_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "real_results_write_admin" ON public.real_results FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "news_posts_select_public" ON public.news_posts FOR SELECT USING (true);
CREATE POLICY "news_posts_write_admin" ON public.news_posts FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- #####################################################################
-- STEP 3: SEED DATA (teams, matches, game rules)
-- #####################################################################

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.game_rules) THEN
    INSERT INTO public.game_rules (title, content, sort_order, is_active)
    VALUES
      ('Fase de Grupos', E'Acierto de ganador o empate: 1 punto por partido (72 partidos de fase de grupos).\nAcierto de resultado exacto: +5 puntos extra por partido.\nPosiciones finales del grupo: 5 puntos por cada equipo en su posicion correcta.', 10, true),
      ('Condiciones de Guardado', E'La fecha limite de guardado es el 25 de mayo de 2026; despues se bloquea el formulario.\nGoleador del Mundial y Figura del Mundial son campos obligatorios para finalizar el guardado.', 20, true),
      ('Eliminatorias', E'Dieciseisavos de final: 10 puntos por equipo clasificado acertado.\nOctavos de final: 20 puntos por equipo clasificado acertado.\nCuartos de final: 35 puntos por equipo clasificado acertado.\nSemifinales: 50 puntos por equipo clasificado acertado.\nFinalistas: 100 puntos por equipo clasificado acertado.', 30, true),
      ('Cuadro de Honor', E'Campeon: 180 puntos.\nSubcampeon: 100 puntos.\nTercer puesto: 100 puntos.\nCuarto puesto: 100 puntos.\nGoleador del Mundial: 100 puntos.\nFigura del Mundial: 100 puntos.', 40, true),
      ('Premios', E'1.er puesto: 70% del pozo acumulado.\n2.o puesto: 20% del pozo acumulado.\n3.er puesto: 10% del pozo acumulado.', 50, true);
  END IF;
END $$;

INSERT INTO public.teams (id, name, code, flag_url, group_id) VALUES
  ('mex', 'México', 'MEX', 'https://flagcdn.com/w80/mx.png', 'A'),
  ('rsa', 'Sudáfrica', 'RSA', 'https://flagcdn.com/w80/za.png', 'A'),
  ('kor', 'Rep. de Corea', 'KOR', 'https://flagcdn.com/w80/kr.png', 'A'),
  ('cze', 'Chequia', 'CZE', 'https://flagcdn.com/w80/cz.png', 'A'),
  ('can', 'Canadá', 'CAN', 'https://flagcdn.com/w80/ca.png', 'B'),
  ('bih', 'Bosnia Herzegovina', 'BIH', 'https://flagcdn.com/w80/ba.png', 'B'),
  ('qat', 'Qatar', 'QAT', 'https://flagcdn.com/w80/qa.png', 'B'),
  ('sui', 'Suiza', 'SUI', 'https://flagcdn.com/w80/ch.png', 'B'),
  ('bra', 'Brasil', 'BRA', 'https://flagcdn.com/w80/br.png', 'C'),
  ('mar', 'Marruecos', 'MAR', 'https://flagcdn.com/w80/ma.png', 'C'),
  ('hai', 'Haiti', 'HAI', 'https://flagcdn.com/w80/ht.png', 'C'),
  ('sco', 'Escocia', 'SCO', 'https://flagcdn.com/w80/gb-sct.png', 'C'),
  ('usa', 'EE.UU.', 'USA', 'https://flagcdn.com/w80/us.png', 'D'),
  ('par', 'Paraguay', 'PAR', 'https://flagcdn.com/w80/py.png', 'D'),
  ('aus', 'Australia', 'AUS', 'https://flagcdn.com/w80/au.png', 'D'),
  ('tur', 'Turquia', 'TUR', 'https://flagcdn.com/w80/tr.png', 'D'),
  ('ger', 'Alemania', 'GER', 'https://flagcdn.com/w80/de.png', 'E'),
  ('cuw', 'Curazao', 'CUW', 'https://flagcdn.com/w80/cw.png', 'E'),
  ('civ', 'Costa de Marfil', 'CIV', 'https://flagcdn.com/w80/ci.png', 'E'),
  ('ecu', 'Ecuador', 'ECU', 'https://flagcdn.com/w80/ec.png', 'E'),
  ('ned', 'Países Bajos', 'NED', 'https://flagcdn.com/w80/nl.png', 'F'),
  ('jpn', 'Japón', 'JPN', 'https://flagcdn.com/w80/jp.png', 'F'),
  ('swe', 'Suecia', 'SWE', 'https://flagcdn.com/w80/se.png', 'F'),
  ('tun', 'Túnez', 'TUN', 'https://flagcdn.com/w80/tn.png', 'F'),
  ('bel', 'Bélgica', 'BEL', 'https://flagcdn.com/w80/be.png', 'G'),
  ('egy', 'Egipto', 'EGY', 'https://flagcdn.com/w80/eg.png', 'G'),
  ('irn', 'IR Irán', 'IRN', 'https://flagcdn.com/w80/ir.png', 'G'),
  ('nzl', 'Nueva Zelanda', 'NZL', 'https://flagcdn.com/w80/nz.png', 'G'),
  ('esp', 'España', 'ESP', 'https://flagcdn.com/w80/es.png', 'H'),
  ('cpv', 'Cabo Verde', 'CPV', 'https://flagcdn.com/w80/cv.png', 'H'),
  ('ksa', 'Arabia Saudita', 'KSA', 'https://flagcdn.com/w80/sa.png', 'H'),
  ('uru', 'Uruguay', 'URU', 'https://flagcdn.com/w80/uy.png', 'H'),
  ('fra', 'Francia', 'FRA', 'https://flagcdn.com/w80/fr.png', 'I'),
  ('sen', 'Senegal', 'SEN', 'https://flagcdn.com/w80/sn.png', 'I'),
  ('irq', 'Irak', 'IRQ', 'https://flagcdn.com/w80/iq.png', 'I'),
  ('nor', 'Noruega', 'NOR', 'https://flagcdn.com/w80/no.png', 'I'),
  ('arg', 'Argentina', 'ARG', 'https://flagcdn.com/w80/ar.png', 'J'),
  ('alg', 'Argelia', 'ALG', 'https://flagcdn.com/w80/dz.png', 'J'),
  ('aut', 'Austria', 'AUT', 'https://flagcdn.com/w80/at.png', 'J'),
  ('jor', 'Jordán', 'JOR', 'https://flagcdn.com/w80/jo.png', 'J'),
  ('por', 'Portugal', 'POR', 'https://flagcdn.com/w80/pt.png', 'K'),
  ('rdc', 'RD Congo', 'RDC', 'https://flagcdn.com/w80/cd.png', 'K'),
  ('uzb', 'Uzbekistán', 'UZB', 'https://flagcdn.com/w80/uz.png', 'K'),
  ('col', 'Colombia', 'COL', 'https://flagcdn.com/w80/co.png', 'K'),
  ('eng', 'Inglaterra', 'ENG', 'https://flagcdn.com/w80/gb-eng.png', 'L'),
  ('cro', 'Croacia', 'CRO', 'https://flagcdn.com/w80/hr.png', 'L'),
  ('gha', 'Ghana', 'GHA', 'https://flagcdn.com/w80/gh.png', 'L'),
  ('pan', 'Panamá', 'PAN', 'https://flagcdn.com/w80/pa.png', 'L')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, flag_url = EXCLUDED.flag_url, group_id = EXCLUDED.group_id;

-- Group Stage (72 matches)
INSERT INTO public.matches (match_number, stage, group_id, matchday, home_team_id, away_team_id, home_source, away_source, played_at) VALUES
  (1, 'group', 'A', 1, 'mex', 'rsa', NULL, NULL, '2026-06-11 21:00:00+00'),
  (2, 'group', 'A', 1, 'kor', 'cze', NULL, NULL, '2026-06-12 04:00:00+00'),
  (3, 'group', 'B', 1, 'can', 'bih', NULL, NULL, '2026-06-12 21:00:00+00'),
  (4, 'group', 'D', 1, 'usa', 'par', NULL, NULL, '2026-06-13 03:00:00+00'),
  (5, 'group', 'C', 1, 'hai', 'sco', NULL, NULL, '2026-06-14 03:00:00+00'),
  (6, 'group', 'D', 1, 'aus', 'tur', NULL, NULL, '2026-06-14 06:00:00+00'),
  (7, 'group', 'C', 1, 'bra', 'mar', NULL, NULL, '2026-06-14 00:00:00+00'),
  (8, 'group', 'B', 1, 'qat', 'sui', NULL, NULL, '2026-06-13 21:00:00+00'),
  (9, 'group', 'E', 1, 'civ', 'ecu', NULL, NULL, '2026-06-15 01:00:00+00'),
  (10, 'group', 'E', 1, 'ger', 'cuw', NULL, NULL, '2026-06-14 19:00:00+00'),
  (11, 'group', 'F', 1, 'ned', 'jpn', NULL, NULL, '2026-06-14 22:00:00+00'),
  (12, 'group', 'F', 1, 'swe', 'tun', NULL, NULL, '2026-06-15 04:00:00+00'),
  (13, 'group', 'H', 1, 'ksa', 'uru', NULL, NULL, '2026-06-16 00:00:00+00'),
  (14, 'group', 'H', 1, 'esp', 'cpv', NULL, NULL, '2026-06-15 18:00:00+00'),
  (15, 'group', 'G', 1, 'irn', 'nzl', NULL, NULL, '2026-06-16 03:00:00+00'),
  (16, 'group', 'G', 1, 'bel', 'egy', NULL, NULL, '2026-06-15 21:00:00+00'),
  (17, 'group', 'I', 1, 'fra', 'sen', NULL, NULL, '2026-06-16 21:00:00+00'),
  (18, 'group', 'I', 1, 'irq', 'nor', NULL, NULL, '2026-06-17 00:00:00+00'),
  (19, 'group', 'J', 1, 'arg', 'alg', NULL, NULL, '2026-06-17 03:00:00+00'),
  (20, 'group', 'J', 1, 'aut', 'jor', NULL, NULL, '2026-06-17 06:00:00+00'),
  (21, 'group', 'L', 1, 'gha', 'pan', NULL, NULL, '2026-06-18 01:00:00+00'),
  (22, 'group', 'L', 1, 'eng', 'cro', NULL, NULL, '2026-06-17 22:00:00+00'),
  (23, 'group', 'K', 1, 'por', 'rdc', NULL, NULL, '2026-06-17 19:00:00+00'),
  (24, 'group', 'K', 1, 'uzb', 'col', NULL, NULL, '2026-06-18 04:00:00+00'),
  (25, 'group', 'A', 2, 'cze', 'rsa', NULL, NULL, '2026-06-18 18:00:00+00'),
  (26, 'group', 'B', 2, 'sui', 'bih', NULL, NULL, '2026-06-18 21:00:00+00'),
  (27, 'group', 'B', 2, 'can', 'qat', NULL, NULL, '2026-06-19 00:00:00+00'),
  (28, 'group', 'A', 2, 'mex', 'kor', NULL, NULL, '2026-06-19 03:00:00+00'),
  (29, 'group', 'C', 2, 'bra', 'hai', NULL, NULL, '2026-06-20 03:00:00+00'),
  (30, 'group', 'C', 2, 'sco', 'mar', NULL, NULL, '2026-06-20 00:00:00+00'),
  (31, 'group', 'D', 2, 'tur', 'par', NULL, NULL, '2026-06-20 06:00:00+00'),
  (32, 'group', 'D', 2, 'usa', 'aus', NULL, NULL, '2026-06-19 21:00:00+00'),
  (33, 'group', 'E', 2, 'ger', 'civ', NULL, NULL, '2026-06-20 22:00:00+00'),
  (34, 'group', 'E', 2, 'ecu', 'cuw', NULL, NULL, '2026-06-21 02:00:00+00'),
  (35, 'group', 'F', 2, 'ned', 'swe', NULL, NULL, '2026-06-20 19:00:00+00'),
  (36, 'group', 'F', 2, 'tun', 'jpn', NULL, NULL, '2026-06-21 06:00:00+00'),
  (37, 'group', 'H', 2, 'uru', 'cpv', NULL, NULL, '2026-06-22 00:00:00+00'),
  (38, 'group', 'H', 2, 'esp', 'ksa', NULL, NULL, '2026-06-21 18:00:00+00'),
  (39, 'group', 'G', 2, 'bel', 'irn', NULL, NULL, '2026-06-21 21:00:00+00'),
  (40, 'group', 'G', 2, 'nzl', 'egy', NULL, NULL, '2026-06-22 03:00:00+00'),
  (41, 'group', 'I', 2, 'nor', 'sen', NULL, NULL, '2026-06-23 02:00:00+00'),
  (42, 'group', 'I', 2, 'fra', 'irq', NULL, NULL, '2026-06-22 23:00:00+00'),
  (43, 'group', 'J', 2, 'arg', 'aut', NULL, NULL, '2026-06-22 19:00:00+00'),
  (44, 'group', 'J', 2, 'jor', 'alg', NULL, NULL, '2026-06-23 05:00:00+00'),
  (45, 'group', 'L', 2, 'eng', 'gha', NULL, NULL, '2026-06-23 22:00:00+00'),
  (46, 'group', 'L', 2, 'pan', 'cro', NULL, NULL, '2026-06-24 01:00:00+00'),
  (47, 'group', 'K', 2, 'por', 'uzb', NULL, NULL, '2026-06-23 19:00:00+00'),
  (48, 'group', 'K', 2, 'col', 'rdc', NULL, NULL, '2026-06-24 04:00:00+00'),
  (49, 'group', 'C', 3, 'sco', 'bra', NULL, NULL, '2026-06-25 00:00:00+00'),
  (50, 'group', 'C', 3, 'mar', 'hai', NULL, NULL, '2026-06-25 00:00:00+00'),
  (51, 'group', 'B', 3, 'sui', 'can', NULL, NULL, '2026-06-24 21:00:00+00'),
  (52, 'group', 'B', 3, 'bih', 'qat', NULL, NULL, '2026-06-24 21:00:00+00'),
  (53, 'group', 'A', 3, 'cze', 'mex', NULL, NULL, '2026-06-25 03:00:00+00'),
  (54, 'group', 'A', 3, 'rsa', 'kor', NULL, NULL, '2026-06-25 03:00:00+00'),
  (55, 'group', 'E', 3, 'cuw', 'civ', NULL, NULL, '2026-06-25 22:00:00+00'),
  (56, 'group', 'E', 3, 'ecu', 'ger', NULL, NULL, '2026-06-25 22:00:00+00'),
  (57, 'group', 'F', 3, 'jpn', 'swe', NULL, NULL, '2026-06-26 01:00:00+00'),
  (58, 'group', 'F', 3, 'tun', 'ned', NULL, NULL, '2026-06-26 01:00:00+00'),
  (59, 'group', 'D', 3, 'tur', 'usa', NULL, NULL, '2026-06-26 04:00:00+00'),
  (60, 'group', 'D', 3, 'par', 'aus', NULL, NULL, '2026-06-26 04:00:00+00'),
  (61, 'group', 'I', 3, 'nor', 'fra', NULL, NULL, '2026-06-26 21:00:00+00'),
  (62, 'group', 'I', 3, 'sen', 'irq', NULL, NULL, '2026-06-26 21:00:00+00'),
  (63, 'group', 'G', 3, 'egy', 'irn', NULL, NULL, '2026-06-27 05:00:00+00'),
  (64, 'group', 'G', 3, 'nzl', 'bel', NULL, NULL, '2026-06-27 05:00:00+00'),
  (65, 'group', 'H', 3, 'cpv', 'ksa', NULL, NULL, '2026-06-27 02:00:00+00'),
  (66, 'group', 'H', 3, 'uru', 'esp', NULL, NULL, '2026-06-27 02:00:00+00'),
  (67, 'group', 'L', 3, 'pan', 'eng', NULL, NULL, '2026-06-27 23:00:00+00'),
  (68, 'group', 'L', 3, 'cro', 'gha', NULL, NULL, '2026-06-27 23:00:00+00'),
  (69, 'group', 'J', 3, 'alg', 'aut', NULL, NULL, '2026-06-28 04:00:00+00'),
  (70, 'group', 'J', 3, 'jor', 'arg', NULL, NULL, '2026-06-28 04:00:00+00'),
  (71, 'group', 'K', 3, 'col', 'por', NULL, NULL, '2026-06-28 01:30:00+00'),
  (72, 'group', 'K', 3, 'rdc', 'uzb', NULL, NULL, '2026-06-28 01:30:00+00')
ON CONFLICT (match_number) DO UPDATE SET
  stage = EXCLUDED.stage, group_id = EXCLUDED.group_id, matchday = EXCLUDED.matchday,
  home_team_id = EXCLUDED.home_team_id, away_team_id = EXCLUDED.away_team_id,
  home_source = EXCLUDED.home_source, away_source = EXCLUDED.away_source, played_at = EXCLUDED.played_at;

-- Round of 32 (16 matches)
INSERT INTO public.matches (match_number, stage, group_id, matchday, home_team_id, away_team_id, home_source, away_source, played_at) VALUES
  (73, 'round-of-32', NULL, NULL, NULL, NULL, '2A', '2B', '2026-06-28 21:00:00+00'),
  (74, 'round-of-32', NULL, NULL, NULL, NULL, '1E', '3-ABCDF', '2026-06-29 22:30:00+00'),
  (75, 'round-of-32', NULL, NULL, NULL, NULL, '1F', '2C', '2026-06-30 03:00:00+00'),
  (76, 'round-of-32', NULL, NULL, NULL, NULL, '1C', '2F', '2026-06-29 19:00:00+00'),
  (77, 'round-of-32', NULL, NULL, NULL, NULL, '1I', '3-CDFGH', '2026-06-30 23:00:00+00'),
  (78, 'round-of-32', NULL, NULL, NULL, NULL, '2E', '2I', '2026-06-30 19:00:00+00'),
  (79, 'round-of-32', NULL, NULL, NULL, NULL, '1A', '3-CEFHI', '2026-07-01 03:00:00+00'),
  (80, 'round-of-32', NULL, NULL, NULL, NULL, '1L', '3-EHIJK', '2026-07-01 18:00:00+00'),
  (81, 'round-of-32', NULL, NULL, NULL, NULL, '1D', '3-BEFIJ', '2026-07-02 02:00:00+00'),
  (82, 'round-of-32', NULL, NULL, NULL, NULL, '1G', '3-AEHIJ', '2026-07-01 22:00:00+00'),
  (83, 'round-of-32', NULL, NULL, NULL, NULL, '2K', '2L', '2026-07-03 01:00:00+00'),
  (84, 'round-of-32', NULL, NULL, NULL, NULL, '1H', '2J', '2026-07-02 21:00:00+00'),
  (85, 'round-of-32', NULL, NULL, NULL, NULL, '1B', '3-EFGIJ', '2026-07-03 05:00:00+00'),
  (86, 'round-of-32', NULL, NULL, NULL, NULL, '1J', '2H', '2026-07-04 00:00:00+00'),
  (87, 'round-of-32', NULL, NULL, NULL, NULL, '1K', '3-DEIJL', '2026-07-04 03:30:00+00'),
  (88, 'round-of-32', NULL, NULL, NULL, NULL, '2D', '2G', '2026-07-03 20:00:00+00')
ON CONFLICT (match_number) DO UPDATE SET
  stage = EXCLUDED.stage, group_id = EXCLUDED.group_id, matchday = EXCLUDED.matchday,
  home_team_id = EXCLUDED.home_team_id, away_team_id = EXCLUDED.away_team_id,
  home_source = EXCLUDED.home_source, away_source = EXCLUDED.away_source, played_at = EXCLUDED.played_at;

-- Round of 16 (8 matches)
INSERT INTO public.matches (match_number, stage, group_id, matchday, home_team_id, away_team_id, home_source, away_source, played_at) VALUES
  (89, 'round-of-16', NULL, NULL, NULL, NULL, 'W74', 'W77', '2026-07-04 23:00:00+00'),
  (90, 'round-of-16', NULL, NULL, NULL, NULL, 'W73', 'W75', '2026-07-04 19:00:00+00'),
  (91, 'round-of-16', NULL, NULL, NULL, NULL, 'W76', 'W78', '2026-07-05 22:00:00+00'),
  (92, 'round-of-16', NULL, NULL, NULL, NULL, 'W79', 'W80', '2026-07-06 02:00:00+00'),
  (93, 'round-of-16', NULL, NULL, NULL, NULL, 'W83', 'W84', '2026-07-06 21:00:00+00'),
  (94, 'round-of-16', NULL, NULL, NULL, NULL, 'W81', 'W82', '2026-07-07 02:00:00+00'),
  (95, 'round-of-16', NULL, NULL, NULL, NULL, 'W86', 'W88', '2026-07-07 18:00:00+00'),
  (96, 'round-of-16', NULL, NULL, NULL, NULL, 'W85', 'W87', '2026-07-07 22:00:00+00')
ON CONFLICT (match_number) DO UPDATE SET
  stage = EXCLUDED.stage, group_id = EXCLUDED.group_id, matchday = EXCLUDED.matchday,
  home_team_id = EXCLUDED.home_team_id, away_team_id = EXCLUDED.away_team_id,
  home_source = EXCLUDED.home_source, away_source = EXCLUDED.away_source, played_at = EXCLUDED.played_at;

-- Quarter-Finals (4 matches)
INSERT INTO public.matches (match_number, stage, group_id, matchday, home_team_id, away_team_id, home_source, away_source, played_at) VALUES
  (97, 'quarter-finals', NULL, NULL, NULL, NULL, 'W89', 'W90', '2026-07-09 22:00:00+00'),
  (98, 'quarter-finals', NULL, NULL, NULL, NULL, 'W93', 'W94', '2026-07-10 21:00:00+00'),
  (99, 'quarter-finals', NULL, NULL, NULL, NULL, 'W91', 'W92', '2026-07-11 23:00:00+00'),
  (100, 'quarter-finals', NULL, NULL, NULL, NULL, 'W95', 'W96', '2026-07-12 03:00:00+00')
ON CONFLICT (match_number) DO UPDATE SET
  stage = EXCLUDED.stage, group_id = EXCLUDED.group_id, matchday = EXCLUDED.matchday,
  home_team_id = EXCLUDED.home_team_id, away_team_id = EXCLUDED.away_team_id,
  home_source = EXCLUDED.home_source, away_source = EXCLUDED.away_source, played_at = EXCLUDED.played_at;

-- Semi-Finals (2 matches)
INSERT INTO public.matches (match_number, stage, group_id, matchday, home_team_id, away_team_id, home_source, away_source, played_at) VALUES
  (101, 'semi-finals', NULL, NULL, NULL, NULL, 'W97', 'W98', '2026-07-14 21:00:00+00'),
  (102, 'semi-finals', NULL, NULL, NULL, NULL, 'W99', 'W100', '2026-07-15 21:00:00+00')
ON CONFLICT (match_number) DO UPDATE SET
  stage = EXCLUDED.stage, group_id = EXCLUDED.group_id, matchday = EXCLUDED.matchday,
  home_team_id = EXCLUDED.home_team_id, away_team_id = EXCLUDED.away_team_id,
  home_source = EXCLUDED.home_source, away_source = EXCLUDED.away_source, played_at = EXCLUDED.played_at;

-- Third Place (1 match)
INSERT INTO public.matches (match_number, stage, group_id, matchday, home_team_id, away_team_id, home_source, away_source, played_at) VALUES
  (103, 'third-place', NULL, NULL, NULL, NULL, 'RU101', 'RU102', '2026-07-18 23:00:00+00')
ON CONFLICT (match_number) DO UPDATE SET
  stage = EXCLUDED.stage, group_id = EXCLUDED.group_id, matchday = EXCLUDED.matchday,
  home_team_id = EXCLUDED.home_team_id, away_team_id = EXCLUDED.away_team_id,
  home_source = EXCLUDED.home_source, away_source = EXCLUDED.away_source, played_at = EXCLUDED.played_at;

-- Final (1 match)
INSERT INTO public.matches (match_number, stage, group_id, matchday, home_team_id, away_team_id, home_source, away_source, played_at) VALUES
  (104, 'final', NULL, NULL, NULL, NULL, 'W101', 'W102', '2026-07-19 21:00:00+00')
ON CONFLICT (match_number) DO UPDATE SET
  stage = EXCLUDED.stage, group_id = EXCLUDED.group_id, matchday = EXCLUDED.matchday,
  home_team_id = EXCLUDED.home_team_id, away_team_id = EXCLUDED.away_team_id,
  home_source = EXCLUDED.home_source, away_source = EXCLUDED.away_source, played_at = EXCLUDED.played_at;

-- #####################################################################
-- STEP 4: FUNCTIONS (group standings + scoring)
-- #####################################################################

-- Group standings view (live table from real match results)
CREATE OR REPLACE VIEW public.group_standings AS
WITH team_matches AS (
  SELECT
    m.group_id,
    t.id AS team_id,
    t.name AS team_name,
    t.code AS team_code,
    CASE WHEN m.home_team_id = t.id THEN m.home_goals ELSE m.away_goals END AS goals_for,
    CASE WHEN m.home_team_id = t.id THEN m.away_goals ELSE m.home_goals END AS goals_against
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

-- Prediction group standings function
CREATE OR REPLACE FUNCTION public.get_prediction_group_standings(p_prediction_id UUID)
RETURNS TABLE (
  group_id TEXT, team_id TEXT, team_name TEXT,
  played BIGINT, won BIGINT, drawn BIGINT, lost BIGINT,
  goals_for BIGINT, goals_against BIGINT, goal_difference BIGINT,
  points BIGINT, "position" BIGINT
)
LANGUAGE sql STABLE AS $$
  WITH pred_matches AS (
    SELECT m.group_id, m.home_team_id, m.away_team_id, pm.home_goals, pm.away_goals
    FROM public.prediction_matches pm
    JOIN public.matches m ON m.id = pm.match_id
    WHERE pm.prediction_id = p_prediction_id AND m.stage = 'group'
  ),
  team_results AS (
    SELECT
      pm.group_id, t.id AS team_id, t.name AS team_name,
      CASE WHEN pm.home_team_id = t.id THEN pm.home_goals ELSE pm.away_goals END AS gf,
      CASE WHEN pm.home_team_id = t.id THEN pm.away_goals ELSE pm.home_goals END AS ga
    FROM public.teams t
    JOIN pred_matches pm ON pm.home_team_id = t.id OR pm.away_team_id = t.id
  )
  SELECT
    tr.group_id, tr.team_id, tr.team_name,
    COUNT(*) AS played,
    COUNT(*) FILTER (WHERE tr.gf > tr.ga) AS won,
    COUNT(*) FILTER (WHERE tr.gf = tr.ga) AS drawn,
    COUNT(*) FILTER (WHERE tr.gf < tr.ga) AS lost,
    COALESCE(SUM(tr.gf), 0) AS goals_for,
    COALESCE(SUM(tr.ga), 0) AS goals_against,
    (COALESCE(SUM(tr.gf), 0) - COALESCE(SUM(tr.ga), 0)) AS goal_difference,
    (COUNT(*) FILTER (WHERE tr.gf > tr.ga) * 3 + COUNT(*) FILTER (WHERE tr.gf = tr.ga)) AS points,
    ROW_NUMBER() OVER (
      PARTITION BY tr.group_id
      ORDER BY
        (COUNT(*) FILTER (WHERE tr.gf > tr.ga) * 3 + COUNT(*) FILTER (WHERE tr.gf = tr.ga)) DESC,
        (COALESCE(SUM(tr.gf), 0) - COALESCE(SUM(tr.ga), 0)) DESC,
        COALESCE(SUM(tr.gf), 0) DESC,
        tr.team_name ASC
    ) AS position
  FROM team_results tr
  GROUP BY tr.group_id, tr.team_id, tr.team_name;
$$;

-- Score calculation for one user
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

  -- 2) Group position points (5 per correct position)
  SELECT COALESCE(COUNT(*) * 5, 0)::INTEGER INTO v_group_pos_pts
  FROM public.prediction_group_standings pgs
  JOIN public.group_standings gs
    ON gs.group_id = pgs.group_id AND gs.team_id = pgs.team_id AND gs.position = pgs.position
  WHERE pgs.prediction_id = v_prediction_id;

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

    -- Top scorer
    IF v_real.top_scorer IS NOT NULL AND v_pred_special IS NOT NULL
       AND lower(trim(v_pred_special.top_scorer)) = lower(trim(v_real.top_scorer))
    THEN v_scorer_pts := 100; END IF;

    -- Best player
    IF v_real.best_player IS NOT NULL AND v_pred_special IS NOT NULL
       AND lower(trim(v_pred_special.best_player)) = lower(trim(v_real.best_player))
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
END; $$;

-- Batch recalculation + ranking
CREATE OR REPLACE FUNCTION public.recalculate_all_scores()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user RECORD;
BEGIN
  FOR v_user IN SELECT DISTINCT p.user_id FROM public.predictions p WHERE p.is_locked = true
  LOOP
    PERFORM public.calculate_user_score(v_user.user_id);
  END LOOP;

  UPDATE public.user_scores us SET rank = ranked.r
  FROM (SELECT user_id, DENSE_RANK() OVER (ORDER BY total_points DESC) AS r FROM public.user_scores) ranked
  WHERE us.user_id = ranked.user_id;
END; $$;

-- #####################################################################
-- DONE! Verify with:
--   SELECT count(*) FROM public.teams;      -- should be 48
--   SELECT count(*) FROM public.matches;    -- should be 104
--   SELECT count(*) FROM public.game_rules; -- should be 5
-- #####################################################################
