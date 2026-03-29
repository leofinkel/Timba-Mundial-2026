import { Trophy } from 'lucide-react';

import { getCurrentUser } from '@/actions/auth';
import { RankingsLeaderboard } from '@/components/rankings/RankingsLeaderboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PRIZE_DISTRIBUTION } from '@/constants/scoring';
import { getLeaderboard } from '@/services/rankingService';

const RankingsPage = async () => {
  const userResult = await getCurrentUser();
  if (!userResult.success || !userResult.data) {
    return null;
  }
  const user = userResult.data;

  const leaderboard = await getLeaderboard();
  const { prizePool } = leaderboard;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-emerald-950 sm:text-3xl">
          Posiciones
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Ranking en vivo y reparto del pozo entre los tres primeros.
        </p>
      </div>

      <Card className="from-emerald-600/10 border-emerald-950/10 overflow-hidden bg-gradient-to-br via-background to-emerald-600/5 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Trophy className="text-emerald-600 size-6" />
            Pozo de premios
          </CardTitle>
          <CardDescription>
            Distribución: 1.er lugar {Math.round(PRIZE_DISTRIBUTION.first * 100)}% · 2.º{' '}
            {Math.round(PRIZE_DISTRIBUTION.second * 100)}% · 3.er{' '}
            {Math.round(PRIZE_DISTRIBUTION.third * 100)}%
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-emerald-600/15 bg-background/80 p-4 shadow-sm">
            <p className="text-muted-foreground text-xs font-medium uppercase">Pozo total</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">{prizePool.totalPool}</p>
          </div>
          <div className="rounded-xl border border-emerald-600/15 bg-background/80 p-4 shadow-sm">
            <p className="text-muted-foreground text-xs font-medium uppercase">1.er premio (70%)</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">{prizePool.firstPrize}</p>
          </div>
          <div className="rounded-xl border border-emerald-600/15 bg-background/80 p-4 shadow-sm">
            <p className="text-muted-foreground text-xs font-medium uppercase">2.º premio (20%)</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">{prizePool.secondPrize}</p>
          </div>
          <div className="rounded-xl border border-emerald-600/15 bg-background/80 p-4 shadow-sm">
            <p className="text-muted-foreground text-xs font-medium uppercase">3.er premio (10%)</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">{prizePool.thirdPrize}</p>
          </div>
        </CardContent>
      </Card>

      <RankingsLeaderboard leaderboard={leaderboard} currentUserId={user.id} />
    </div>
  );
};

export default RankingsPage;
