import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, Lock } from 'lucide-react';

import { getCurrentUser } from '@/actions/auth';
import { getUserPredictionAction } from '@/actions/predictions';
import { getTournament } from '@/services/fixtureService';
import type { Tournament } from '@/types/tournament';
import { FixturePredictionTabs } from '@/components/fixture/FixturePredictionTabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PREDICTION_DEADLINE } from '@/constants/tournament';

const deadlineDate = parseISO(PREDICTION_DEADLINE);

const FixturePage = async () => {
  let tournament: Tournament | null = null;
  const [userResult, tournamentResult] = await Promise.allSettled([
    getCurrentUser(),
    getTournament(),
  ]);

  const user =
    userResult.status === 'fulfilled' && userResult.value.success
      ? userResult.value.data
      : null;
  tournament =
    tournamentResult.status === 'fulfilled' ? tournamentResult.value : null;

  const predictionResult = user ? await getUserPredictionAction() : null;
  const prediction = predictionResult?.success ? predictionResult.data : null;

  const deadlinePassed = Date.now() > deadlineDate.getTime();
  const isLocked = prediction?.isLocked ?? false;
  const isPaid = user?.paymentStatus === 'paid';
  const canSave = isPaid && !isLocked && !deadlinePassed;

  let saveDisabledReason: string | undefined;
  if (!user) {
    saveDisabledReason = 'Iniciá sesión para guardar tu predicción.';
  } else if (!isPaid) {
    saveDisabledReason = 'Pagá la entrada para poder guardar tu predicción.';
  } else if (isLocked) {
    saveDisabledReason = 'Tu predicción está bloqueada.';
  } else if (deadlinePassed) {
    saveDisabledReason = 'Pasó la fecha límite para guardar cambios.';
  }

  return (
    <div className="dark relative -mx-4 -my-6 min-h-screen space-y-8 overflow-hidden bg-zinc-950 px-4 py-10 text-zinc-50 sm:-mx-6 sm:-my-8 sm:px-6 sm:py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-10%,rgba(16,185,129,0.2),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 top-1/4 h-60 w-60 rounded-full bg-emerald-500/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-6xl space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Fixture</h1>
        <p className="mt-1 text-sm text-zinc-400 sm:text-base">
          Cargá los 72 partidos de grupo. Después completá eliminatorias, goleador y figura.
        </p>
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2">
        {!user ? (
          <Badge className="border-zinc-700 bg-zinc-800/80 text-zinc-100">Modo invitado</Badge>
        ) : null}
        {isLocked ? (
          <Badge className="gap-1 border-zinc-700 bg-zinc-800/80 text-zinc-100">
            <Lock className="size-3" />
            Bloqueada
          </Badge>
        ) : (
          <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-200">
            Editable
          </Badge>
        )}
        {deadlinePassed ? (
          <Badge className="gap-1 border-transparent bg-red-600 text-white">
            <AlertTriangle className="size-3" />
            Cierre vencido
          </Badge>
        ) : (
          <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
            Límite: {format(deadlineDate, "d MMM yyyy", { locale: es })}
          </Badge>
        )}
      </div>

      {(deadlinePassed || isLocked) && (
        <Card className="relative mx-auto w-full max-w-6xl border-amber-500/30 bg-amber-500/10 shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-base text-amber-200">Importante</CardTitle>
            <CardDescription className="text-amber-100/90">
              {deadlinePassed
                ? 'El plazo oficial de predicciones finalizó. Solo podrás ver tu planilla cuando el editor esté listo.'
                : 'Tu planilla está bloqueada: no se aplicarán nuevos cambios.'}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className="relative mx-auto w-full max-w-6xl border-zinc-800/80 bg-zinc-900/50 shadow-md backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg text-white">Tu planilla</CardTitle>
          <CardDescription className="text-zinc-400">
            {prediction
              ? `Última actualización: ${format(parseISO(prediction.updatedAt), "d MMM yyyy, HH:mm", { locale: es })}`
              : 'Aún no tenés predicciones guardadas.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FixturePredictionTabs
            isLoggedIn={!!user}
            saveDisabled={!canSave}
            saveDisabledReason={saveDisabledReason}
            tournament={tournament}
            initialPrediction={prediction}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default FixturePage;
