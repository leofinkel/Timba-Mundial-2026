-- Recalcula puntajes y ranking para todos los usuarios con predicción bloqueada.
-- Ejecutar después de migrar calculate_user_score.

BEGIN;

SELECT public.recalculate_all_scores();

COMMIT;

-- Verificación rápida (top 20).
SELECT
  p.display_name,
  us.total_points,
  us.rank,
  us.updated_at
FROM public.user_scores us
JOIN public.profiles p ON p.id = us.user_id
ORDER BY us.rank ASC, us.updated_at DESC
LIMIT 20;
