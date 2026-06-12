-- Recalculate scores for every submitted prediction, not only is_locked rows.
-- All current users have submitted_at set but is_locked remains false until deadline.

CREATE OR REPLACE FUNCTION public.recalculate_all_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN
    SELECT DISTINCT p.user_id
    FROM public.predictions p
    WHERE p.submitted_at IS NOT NULL
  LOOP
    PERFORM public.calculate_user_score(v_user.user_id);
  END LOOP;

  UPDATE public.user_scores us
  SET rank = ranked.r
  FROM (
    SELECT user_id, DENSE_RANK() OVER (ORDER BY total_points DESC) AS r
    FROM public.user_scores
  ) ranked
  WHERE us.user_id = ranked.user_id;
END;
$$;

COMMENT ON FUNCTION public.recalculate_all_scores() IS
  'Recalculates scores for all submitted predictions and assigns leaderboard ranks.';
