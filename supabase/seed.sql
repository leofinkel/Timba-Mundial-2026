-- =============================================================================
-- Timba Mundial 2026 — Seed data
-- Generated from WCup_2026_4.1_en.xlsx
-- Run after supabase/schema.sql
-- =============================================================================

-- =============================================================================
-- SECTION: Game Rules
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.game_rules) THEN
    INSERT INTO public.game_rules (title, content, sort_order, is_active)
    VALUES
      (
        'Fase de Grupos',
        E'Acierto de ganador o empate: 1 punto por partido (72 partidos de fase de grupos).\nAcierto de resultado exacto: +5 puntos extra por partido.\nPosiciones finales del grupo: 5 puntos por cada equipo en su posicion correcta.',
        10,
        true
      ),
      (
        'Condiciones de Guardado',
        E'La fecha limite de guardado es el 25 de mayo de 2026; despues se bloquea el formulario.\nGoleador del Mundial y Figura del Mundial son campos obligatorios para finalizar el guardado.',
        20,
        true
      ),
      (
        'Eliminatorias',
        E'Dieciseisavos de final: 10 puntos por equipo clasificado acertado.\nOctavos de final: 20 puntos por equipo clasificado acertado.\nCuartos de final: 35 puntos por equipo clasificado acertado.\nSemifinales: 50 puntos por equipo clasificado acertado.\nFinalistas: 100 puntos por equipo clasificado acertado.',
        30,
        true
      ),
      (
        'Cuadro de Honor',
        E'Campeon: 180 puntos.\nSubcampeon: 100 puntos.\nTercer puesto: 100 puntos.\nCuarto puesto: 100 puntos.\nGoleador del Mundial: 100 puntos.\nFigura del Mundial: 100 puntos.',
        40,
        true
      ),
      (
        'Premios',
        E'1.er puesto: 70% del pozo acumulado.\n2.o puesto: 20% del pozo acumulado.\n3.er puesto: 10% del pozo acumulado.',
        50,
        true
      );
  END IF;
END $$;

-- =============================================================================
-- SECTION: Teams (48 teams, 12 groups of 4)
-- =============================================================================
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
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  flag_url = EXCLUDED.flag_url,
  group_id = EXCLUDED.group_id;

-- =============================================================================
-- SECTION: Matches (104 total — 72 group stage + 32 knockout)
-- =============================================================================
-- Timestamps are in UTC.
-- Knockout matches use home_source/away_source until teams are determined.
-- =============================================================================

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
  stage = EXCLUDED.stage,
  group_id = EXCLUDED.group_id,
  matchday = EXCLUDED.matchday,
  home_team_id = EXCLUDED.home_team_id,
  away_team_id = EXCLUDED.away_team_id,
  home_source = EXCLUDED.home_source,
  away_source = EXCLUDED.away_source,
  played_at = EXCLUDED.played_at;

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
  stage = EXCLUDED.stage,
  group_id = EXCLUDED.group_id,
  matchday = EXCLUDED.matchday,
  home_team_id = EXCLUDED.home_team_id,
  away_team_id = EXCLUDED.away_team_id,
  home_source = EXCLUDED.home_source,
  away_source = EXCLUDED.away_source,
  played_at = EXCLUDED.played_at;

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
  stage = EXCLUDED.stage,
  group_id = EXCLUDED.group_id,
  matchday = EXCLUDED.matchday,
  home_team_id = EXCLUDED.home_team_id,
  away_team_id = EXCLUDED.away_team_id,
  home_source = EXCLUDED.home_source,
  away_source = EXCLUDED.away_source,
  played_at = EXCLUDED.played_at;

-- Quarter-Finals (4 matches)
INSERT INTO public.matches (match_number, stage, group_id, matchday, home_team_id, away_team_id, home_source, away_source, played_at) VALUES
  (97, 'quarter-finals', NULL, NULL, NULL, NULL, 'W89', 'W90', '2026-07-09 22:00:00+00'),
  (98, 'quarter-finals', NULL, NULL, NULL, NULL, 'W93', 'W94', '2026-07-10 21:00:00+00'),
  (99, 'quarter-finals', NULL, NULL, NULL, NULL, 'W91', 'W92', '2026-07-11 23:00:00+00'),
  (100, 'quarter-finals', NULL, NULL, NULL, NULL, 'W95', 'W96', '2026-07-12 03:00:00+00')
ON CONFLICT (match_number) DO UPDATE SET
  stage = EXCLUDED.stage,
  group_id = EXCLUDED.group_id,
  matchday = EXCLUDED.matchday,
  home_team_id = EXCLUDED.home_team_id,
  away_team_id = EXCLUDED.away_team_id,
  home_source = EXCLUDED.home_source,
  away_source = EXCLUDED.away_source,
  played_at = EXCLUDED.played_at;

-- Semi-Finals (2 matches)
INSERT INTO public.matches (match_number, stage, group_id, matchday, home_team_id, away_team_id, home_source, away_source, played_at) VALUES
  (101, 'semi-finals', NULL, NULL, NULL, NULL, 'W97', 'W98', '2026-07-14 21:00:00+00'),
  (102, 'semi-finals', NULL, NULL, NULL, NULL, 'W99', 'W100', '2026-07-15 21:00:00+00')
ON CONFLICT (match_number) DO UPDATE SET
  stage = EXCLUDED.stage,
  group_id = EXCLUDED.group_id,
  matchday = EXCLUDED.matchday,
  home_team_id = EXCLUDED.home_team_id,
  away_team_id = EXCLUDED.away_team_id,
  home_source = EXCLUDED.home_source,
  away_source = EXCLUDED.away_source,
  played_at = EXCLUDED.played_at;

-- Third Place (1 match)
INSERT INTO public.matches (match_number, stage, group_id, matchday, home_team_id, away_team_id, home_source, away_source, played_at) VALUES
  (103, 'third-place', NULL, NULL, NULL, NULL, 'RU101', 'RU102', '2026-07-18 23:00:00+00')
ON CONFLICT (match_number) DO UPDATE SET
  stage = EXCLUDED.stage,
  group_id = EXCLUDED.group_id,
  matchday = EXCLUDED.matchday,
  home_team_id = EXCLUDED.home_team_id,
  away_team_id = EXCLUDED.away_team_id,
  home_source = EXCLUDED.home_source,
  away_source = EXCLUDED.away_source,
  played_at = EXCLUDED.played_at;

-- Final (1 match)
INSERT INTO public.matches (match_number, stage, group_id, matchday, home_team_id, away_team_id, home_source, away_source, played_at) VALUES
  (104, 'final', NULL, NULL, NULL, NULL, 'W101', 'W102', '2026-07-19 21:00:00+00')
ON CONFLICT (match_number) DO UPDATE SET
  stage = EXCLUDED.stage,
  group_id = EXCLUDED.group_id,
  matchday = EXCLUDED.matchday,
  home_team_id = EXCLUDED.home_team_id,
  away_team_id = EXCLUDED.away_team_id,
  home_source = EXCLUDED.home_source,
  away_source = EXCLUDED.away_source,
  played_at = EXCLUDED.played_at;

