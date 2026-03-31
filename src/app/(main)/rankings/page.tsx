import { Trophy } from 'lucide-react';

import { getCurrentUser } from '@/actions/auth';
import { RankingsLeaderboard } from '@/components/rankings/RankingsLeaderboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PRIZE_DISTRIBUTION } from '@/constants/scoring';
import { getLeaderboard } from '@/services/rankingService';

const RankingsPage = async () => {
  const userResult = await getCurrentUser();
  const user = userResult.success ? userResult.data : null;

  const leaderboard = await getLeaderboard();
  const { prizePool } = leaderboard;

  return (
    <div className="dark relative -mx-4 -my-6 min-h-screen space-y-8 overflow-hidden bg-zinc-950 px-4 py-10 text-zinc-50 sm:-mx-6 sm:-my-8 sm:px-6 sm:py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_95%_55%_at_50%_-10%,rgba(16,185,129,0.2),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-1/3 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-5xl space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Posiciones
        </h1>
        <p className="mt-1 text-sm text-zinc-400 sm:text-base">
          Ranking en vivo y reparto del pozo entre los tres primeros.
        </p>
      </div>

      <Card className="relative mx-auto w-full max-w-5xl overflow-hidden border-zinc-800/80 bg-gradient-to-br from-emerald-500/15 via-zinc-900/70 to-zinc-950 shadow-md backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-white sm:text-xl">
            <Trophy className="size-6 text-emerald-300" />
            Pozo de premios
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Distribución: 1.er lugar {Math.round(PRIZE_DISTRIBUTION.first * 100)}% · 2.º{' '}
            {Math.round(PRIZE_DISTRIBUTION.second * 100)}% · 3.er{' '}
            {Math.round(PRIZE_DISTRIBUTION.third * 100)}%
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-zinc-400">Pozo total</p>
            <p className="mt-1 text-2xl font-bold text-emerald-300">{prizePool.totalPool}</p>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-zinc-400">1.er premio (70%)</p>
            <p className="mt-1 text-2xl font-bold text-emerald-300">{prizePool.firstPrize}</p>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-zinc-400">2.º premio (20%)</p>
            <p className="mt-1 text-2xl font-bold text-emerald-300">{prizePool.secondPrize}</p>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-zinc-400">3.er premio (10%)</p>
            <p className="mt-1 text-2xl font-bold text-emerald-300">{prizePool.thirdPrize}</p>
          </div>
        </CardContent>
      </Card>

      <RankingsLeaderboard leaderboard={leaderboard} currentUserId={user?.id ?? ''} />
    </div>
  );
};

export default RankingsPage;
