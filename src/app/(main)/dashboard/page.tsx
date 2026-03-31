import Link from 'next/link';
import { differenceInSeconds, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Lock,
  Medal,
  Send,
  Sparkles,
  Wallet,
} from 'lucide-react';

import { getCurrentUser } from '@/actions/auth';
import { getPredictionStatusAction } from '@/actions/predictions';
import { PREDICTION_DEADLINE } from '@/constants/tournament';
import { PRIZE_DISTRIBUTION } from '@/constants/scoring';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getPrizePool, getUserRank } from '@/services/rankingService';
import type { PredictionStatus } from '@/types/prediction';

const deadlineDate = parseISO(PREDICTION_DEADLINE);

const statusMeta = (status: PredictionStatus) => {
  switch (status) {
    case 'draft':
      return {
        label: 'Borrador',
        description: 'Podés seguir editando hasta el cierre.',
        Icon: Clock,
        badgeClass: 'bg-amber-500/15 text-amber-900 border-amber-500/30',
      };
    case 'submitted':
      return {
        label: 'Enviada',
        description: 'Ya registramos tu planilla; seguí atento al cierre.',
        Icon: Send,
        badgeClass: 'bg-sky-500/15 text-sky-900 border-sky-500/30',
      };
    case 'locked':
      return {
        label: 'Bloqueada',
        description: 'No se pueden hacer más cambios.',
        Icon: Lock,
        badgeClass: 'bg-zinc-500/15 text-zinc-800 border-zinc-500/30',
      };
    default:
      return {
        label: status,
        description: '',
        Icon: Clock,
        badgeClass: '',
      };
  }
};

const DashboardPage = async () => {
  const userResult = await getCurrentUser();
  if (!userResult.success || !userResult.data) {
    return null;
  }
  const user = userResult.data;

  const [statusResult, userRank, prizePool] = await Promise.all([
    getPredictionStatusAction(),
    getUserRank(user.id),
    getPrizePool(),
  ]);

  const predictionStatus: PredictionStatus =
    statusResult.success && statusResult.data ? statusResult.data : 'draft';
  const meta = statusMeta(predictionStatus);
  const StatusIcon = meta.Icon;

  const now = new Date();
  const deadlinePassed = now.getTime() > deadlineDate.getTime();
  const secondsLeft = Math.max(0, differenceInSeconds(deadlineDate, now));
  const daysLeft = Math.floor(secondsLeft / 86400);
  const hoursLeft = Math.floor((secondsLeft % 86400) / 3600);
  const showCountdown = predictionStatus !== 'locked' && !deadlinePassed;

  const isPaid = user.paymentStatus === 'paid';
  const hasScoring = userRank.totalPoints > 0 || userRank.rank !== null;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-emerald-950 sm:text-3xl">
          ¡Hola, {user.displayName}! 👋
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
          Seguí el Mundial 2026 con tu grupo: completá el fixture, sumá puntos y escalá posiciones.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          className={`border-emerald-950/10 shadow-md ${isPaid ? 'ring-emerald-600/20 ring-1' : 'ring-red-500/15 ring-1'}`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="text-emerald-600 size-5" />
              Estado de pago
            </CardTitle>
            <CardDescription>Habilitación para jugar el prode</CardDescription>
          </CardHeader>
          <CardContent>
            {isPaid ? (
              <div className="flex flex-col items-start gap-3">
                <div className="bg-emerald-600/10 flex size-16 items-center justify-center rounded-2xl">
                  <CheckCircle2 className="text-emerald-600 size-10" />
                </div>
                <Badge className="border-transparent bg-emerald-600 text-white">Habilitado</Badge>
                <p className="text-muted-foreground text-sm">Ya podés guardar y competir.</p>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <div className="bg-red-500/10 flex size-16 items-center justify-center rounded-2xl">
                  <AlertTriangle className="text-red-600 size-10" />
                </div>
                <Badge className="border-transparent bg-red-600 text-white">
                  Pendiente de pago
                </Badge>
                <p className="text-muted-foreground text-sm">
                  Coordiná con el organizador para activar tu cuenta.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-emerald-950/10 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="text-emerald-600 size-5" />
              Predicción
            </CardTitle>
            <CardDescription>Estado de tu planilla</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant="outline" className={meta.badgeClass}>
              <StatusIcon className="mr-1 size-3" />
              {meta.label}
            </Badge>
            <p className="text-muted-foreground text-sm">{meta.description}</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-950/10 shadow-md sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Medal className="text-emerald-600 size-5" />
              Tu posición
            </CardTitle>
            <CardDescription>
              {hasScoring ? 'Puntos acumulados en el torneo' : 'Cuando empiecen a jugarse partidos'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasScoring ? (
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold tabular-nums text-emerald-800">
                  {userRank.rank != null ? `#${userRank.rank}` : '—'}
                </span>
                <span className="text-muted-foreground text-sm">
                  {userRank.totalPoints} pts totales
                </span>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Todavía no hay puntos registrados. Volvé después del inicio del Mundial.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="from-emerald-600/8 border-emerald-950/10 overflow-hidden bg-gradient-to-br to-transparent shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="text-emerald-600 size-5" />
            Pozo de premios
          </CardTitle>
          <CardDescription>
            Reparto: 1º {Math.round(PRIZE_DISTRIBUTION.first * 100)}% · 2º{' '}
            {Math.round(PRIZE_DISTRIBUTION.second * 100)}% · 3º{' '}
            {Math.round(PRIZE_DISTRIBUTION.third * 100)}%
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-xs uppercase">Pozo total</p>
            <p className="text-2xl font-bold text-emerald-800">{prizePool.totalPool}</p>
            <p className="text-muted-foreground text-xs">unidades × jugadores al día</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase">1.er premio</p>
            <p className="text-xl font-semibold">{prizePool.firstPrize}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase">Jugadores habilitados</p>
            <p className="text-xl font-semibold">{prizePool.paidUsersCount}</p>
          </div>
        </CardContent>
      </Card>

      {showCountdown ? (
        <Card className="border-emerald-600/25 bg-emerald-600/5 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CalendarClock className="text-emerald-600 size-5 shrink-0" />
              Cierre de predicciones
            </CardTitle>
            <CardDescription>
              {format(deadlineDate, "d 'de' MMMM yyyy, HH:mm 'hs' (zzz)", { locale: es })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-emerald-800">
              Faltan{' '}
              <span className="tabular-nums">
                {daysLeft}d {hoursLeft}h
              </span>
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Asegurate de guardar y bloquear antes del límite.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          asChild
          size="lg"
          className="bg-emerald-600 text-white hover:bg-emerald-600/90"
        >
          <Link href="/fixture" className="gap-2">
            Completar Fixture
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="border-emerald-600/40">
          <Link href="/rankings" className="gap-2">
            Ver Posiciones
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default DashboardPage;
