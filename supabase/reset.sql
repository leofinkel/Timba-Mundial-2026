-- Timba Mundial 2026 - Reset app schema objects
-- Use this only in development/staging when you need to rerun schema.sql from scratch.

-- 1) Remove trigger on auth.users created by schema.sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2) Drop app tables (CASCADE removes dependent policies/triggers/indexes)
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

-- 3) Drop views and functions from functions.sql
DROP VIEW IF EXISTS public.group_standings CASCADE;
DROP FUNCTION IF EXISTS public.get_prediction_group_standings(UUID);
DROP FUNCTION IF EXISTS public.calculate_user_score(UUID);
DROP FUNCTION IF EXISTS public.recalculate_all_scores();
DROP FUNCTION IF EXISTS public.advance_knockout_winner(UUID, TEXT);
DROP FUNCTION IF EXISTS public.populate_round_of_32_direct_slots();
DROP FUNCTION IF EXISTS public.get_best_third_place_teams();

-- 4) Drop helper/trigger functions from schema.sql
DROP FUNCTION IF EXISTS public.owns_prediction(UUID);
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.set_updated_at();
