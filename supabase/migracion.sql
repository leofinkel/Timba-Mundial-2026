-- =============================================================================
-- Migración segura (NO usa deploy-all.sql, NO borra tablas ni datos)
--
-- Qué hace:
--   - list_profiles_for_public_leaderboard: nombres + avatar_url para el ranking
--   - list_submitted_prediction_user_ids: usuarios que guardaron planilla (submitted_at)
--
-- Cómo aplicar:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Pegar este archivo completo → Run
--
-- Idempotente: podés ejecutarlo más de una vez (solo reemplaza las funciones).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.list_profiles_for_public_leaderboard()
RETURNS TABLE(id UUID, display_name TEXT, avatar_url TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.avatar_url
  FROM public.profiles p
  ORDER BY p.created_at;
$$;

COMMENT ON FUNCTION public.list_profiles_for_public_leaderboard() IS
  'Display names and avatars for leaderboard. SECURITY DEFINER bypasses RLS.';

CREATE OR REPLACE FUNCTION public.list_submitted_prediction_user_ids()
RETURNS TABLE(user_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.user_id
  FROM public.predictions pr
  WHERE pr.submitted_at IS NOT NULL;
$$;

COMMENT ON FUNCTION public.list_submitted_prediction_user_ids() IS
  'Users who saved/submitted a prediction sheet at least once. SECURITY DEFINER bypasses RLS.';
