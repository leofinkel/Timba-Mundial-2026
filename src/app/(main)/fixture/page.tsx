import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, Lock } from 'lucide-react';

import { getCurrentUser } from '@/actions/auth';
import { getUserPredictionAction } from '@/actions/predictions';
import { FixturePredictionTabs } from '@/components/fixture/FixturePredictionTabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PREDICTION_DEADLINE } from '@/constants/tournament';

const deadlineDate = parseISO(PREDICTION_DEADLINE);

const FixturePage = async () => {
  const userResult = await getCurrentUser();
  if (!userResult.success || !userResult.data) {
    return null;
  }
  const user = userResult.data;

  const predictionResult = await getUserPredictionAction();
  const prediction = predictionResult.success ? predictionResult.data : null;

  const deadlinePassed = Date.now() > deadlineDate.getTime();
  const isLocked = prediction?.isLocked ?? false;
  const isPaid = user.paymentStatus === 'paid';
  const canSave = isPaid && !isLocked && !deadlinePassed;

  let saveDisabledReason: string | undefined;
  if (!isPaid) {
    saveDisabledReason = 'Pagá la entrada para poder guardar tu predicción.';
  } else if (isLocked) {
    saveDisabledReason = 'Tu predicción está bloqueada.';
  } else if (deadlinePassed) {
    saveDisabledReason = 'Pasó la fecha límite para guardar cambios.';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-emerald-950 sm:text-3xl">Fixture</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Cargá marcadores y definiciones por fase. El guardado completo se habilitará en las
          próximas iteraciones.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isLocked ? (
          <Badge className="gap-1 border-transparent bg-zinc-700 text-white">
            <Lock className="size-3" />
            Bloqueada
          </Badge>
        ) : (
          <Badge className="border-emerald-600/40 bg-emerald-600/10 text-emerald-900">
            Editable
          </Badge>
        )}
        {deadlinePassed ? (
          <Badge className="gap-1 border-transparent bg-red-600 text-white">
            <AlertTriangle className="size-3" />
            Cierre vencido
          </Badge>
        ) : (
          <Badge variant="outline" className="border-emerald-600/30">
            Límite: {format(deadlineDate, "d MMM yyyy", { locale: es })}
          </Badge>
        )}
      </div>

      {(deadlinePassed || isLocked) && (
        <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-base text-amber-950">Importante</CardTitle>
            <CardDescription className="text-amber-950/80">
              {deadlinePassed
                ? 'El plazo oficial de predicciones finalizó. Solo podrás ver tu planilla cuando el editor esté listo.'
                : 'Tu planilla está bloqueada: no se aplicarán nuevos cambios.'}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className="border-emerald-950/10 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Tu planilla</CardTitle>
          <CardDescription>
            {prediction
              ? `Última actualización: ${format(parseISO(prediction.updatedAt), "d MMM yyyy, HH:mm", { locale: es })}`
              : 'Aún no tenés predicciones guardadas.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FixturePredictionTabs saveDisabled={!canSave} saveDisabledReason={saveDisabledReason} />
        </CardContent>
      </Card>
    </div>
  );
};

export default FixturePage;
