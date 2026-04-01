'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TeamFlag } from '@/components/fixture/TeamFlag';
import { cn } from '@/lib/utils';
import type { GroupMatch } from '@/types/tournament';

type GroupMatchCardProps = {
  match: GroupMatch;
  homeGoals: number | null;
  awayGoals: number | null;
  onScoresChange: (matchId: string, home: number | null, away: number | null) => void;
  disabled?: boolean;
};

const clampGoal = (n: number) => Math.min(99, Math.max(0, n));

const parseGoalInput = (raw: string): number | null => {
  if (raw === '') return null;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return null;
  return clampGoal(n);
};

const UTC_MINUS_5_OFFSET_MS = -5 * 60 * 60 * 1000;

const formatMatchDate = (isoDate: string): string => {
  const utc = new Date(isoDate);
  const local = new Date(utc.getTime() + UTC_MINUS_5_OFFSET_MS);
  const day = format(local, "d MMM", { locale: es });
  const hours = local.getUTCHours().toString().padStart(2, '0');
  const mins = local.getUTCMinutes().toString().padStart(2, '0');
  return `${day} · ${hours}:${mins} hs`;
};

export const GroupMatchCard = ({
  match,
  homeGoals,
  awayGoals,
  onScoresChange,
  disabled = false,
}: GroupMatchCardProps) => {
  const hasRealResult =
    match.homeGoals !== null && match.awayGoals !== null && Number.isFinite(match.homeGoals) && Number.isFinite(match.awayGoals);
  const predictionComplete = homeGoals !== null && awayGoals !== null;
  const matchesOfficial =
    hasRealResult &&
    predictionComplete &&
    homeGoals === match.homeGoals &&
    awayGoals === match.awayGoals;

  return (
    <Card
      className={cn(
        'gap-0 border py-2.5 shadow-sm transition-colors',
        matchesOfficial && 'border-emerald-500/70 bg-emerald-500/5 ring-1 ring-emerald-500/40',
        !matchesOfficial && 'border-border/60 bg-card/60',
      )}
    >
      {match.playedAt && (
        <p className="px-3 pb-1 text-[11px] tabular-nums text-muted-foreground/70">
          {formatMatchDate(match.playedAt)}
        </p>
      )}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 px-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <TeamFlag team={match.homeTeam} />
          <span className="truncate text-sm font-medium leading-tight">{match.homeTeam.name}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Label htmlFor={`hg-${match.id}`} className="sr-only">Goles local</Label>
          <Input
            id={`hg-${match.id}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            disabled={disabled}
            maxLength={2}
            className="h-8 w-10 rounded-md border-border/60 bg-zinc-900/60 text-center text-sm tabular-nums focus:border-emerald-500/50 focus:ring-emerald-500/30"
            value={homeGoals === null ? '' : String(homeGoals)}
            onChange={(e) => {
              const v = parseGoalInput(e.target.value);
              onScoresChange(match.id, v, awayGoals);
            }}
          />
          <span className="text-xs text-muted-foreground/60">vs</span>
          <Label htmlFor={`ag-${match.id}`} className="sr-only">Goles visitante</Label>
          <Input
            id={`ag-${match.id}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            disabled={disabled}
            maxLength={2}
            className="h-8 w-10 rounded-md border-border/60 bg-zinc-900/60 text-center text-sm tabular-nums focus:border-emerald-500/50 focus:ring-emerald-500/30"
            value={awayGoals === null ? '' : String(awayGoals)}
            onChange={(e) => {
              const v = parseGoalInput(e.target.value);
              onScoresChange(match.id, homeGoals, v);
            }}
          />
        </div>

        <div className="flex items-center justify-end gap-2 overflow-hidden">
          <span className="truncate text-right text-sm font-medium leading-tight">{match.awayTeam.name}</span>
          <TeamFlag team={match.awayTeam} />
        </div>
      </div>

      {hasRealResult && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 border-t border-border/40 px-3 pt-1.5">
          <span className="text-xs text-muted-foreground">Real:</span>
          <Badge variant="outline" className="h-5 font-mono text-[11px] tabular-nums">
            {match.homeGoals} – {match.awayGoals}
          </Badge>
          {predictionComplete && !matchesOfficial && (
            <span className="text-[11px] text-amber-400/80">Difiere</span>
          )}
        </div>
      )}
    </Card>
  );
};
