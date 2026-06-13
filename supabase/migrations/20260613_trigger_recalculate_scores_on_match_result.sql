-- Trigger: recalculate all user scores automatically whenever a match result is saved.
-- This ensures scores stay current regardless of whether the application layer
-- successfully calls recalculate_all_scores() — the DB handles it directly.

CREATE OR REPLACE FUNCTION public.fn_recalculate_scores_on_match_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalculate_all_scores();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_on_match_result ON public.matches;

CREATE TRIGGER trg_recalculate_on_match_result
  AFTER UPDATE OF home_goals, away_goals ON public.matches
  FOR EACH ROW
  WHEN (NEW.home_goals IS NOT NULL AND NEW.away_goals IS NOT NULL)
  EXECUTE FUNCTION public.fn_recalculate_scores_on_match_result();

COMMENT ON FUNCTION public.fn_recalculate_scores_on_match_result() IS
  'Trigger function: recalculates all user scores after a match result (home_goals, away_goals) is set.';
