'use client';

import Image from 'next/image';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
        'gap-0 border bg-gradient-to-br from-background via-background to-emerald-500/5 py-3 shadow-sm transition-colors',
        matchesOfficial && 'border-emerald-500/70 ring-1 ring-emerald-500/40',
        !matchesOfficial && 'border-border/80',
      )}
    >
      <div className="flex flex-col gap-3 px-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {match.homeTeam.flagUrl ? (
            <Image
              src={match.homeTeam.flagUrl}
              alt=""
              width={28}
              height={20}
              className="h-5 w-7 shrink-0 rounded-sm border border-border/60 object-cover"
            />
          ) : (
            <span className="flex h-5 w-7 shrink-0 items-center justify-center rounded-sm border border-dashed border-muted-foreground/40 text-[10px] text-muted-foreground">
              —
            </span>
          )}
          <span className="truncate text-sm font-medium">{match.homeTeam.name}</span>
        </div>

        <div className="flex shrink-0 items-center justify-center gap-1.5 sm:mx-1">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor={`hg-${match.id}`} className="sr-only">
              Goles local
            </Label>
            <Input
              id={`hg-${match.id}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              disabled={disabled}
              maxLength={2}
              className="h-8 w-11 max-w-[3rem] text-center text-sm tabular-nums"
              value={homeGoals === null ? '' : String(homeGoals)}
              onChange={(e) => {
                const v = parseGoalInput(e.target.value);
                onScoresChange(match.id, v, awayGoals);
              }}
            />
          </div>
          <span className="pb-1 text-muted-foreground">—</span>
          <div className="flex flex-col gap-0.5">
            <Label htmlFor={`ag-${match.id}`} className="sr-only">
              Goles visitante
            </Label>
            <Input
              id={`ag-${match.id}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              disabled={disabled}
              maxLength={2}
              className="h-8 w-11 max-w-[3rem] text-center text-sm tabular-nums"
              value={awayGoals === null ? '' : String(awayGoals)}
              onChange={(e) => {
                const v = parseGoalInput(e.target.value);
                onScoresChange(match.id, homeGoals, v);
              }}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-row-reverse">
          <span className="truncate text-right text-sm font-medium">{match.awayTeam.name}</span>
          {match.awayTeam.flagUrl ? (
            <Image
              src={match.awayTeam.flagUrl}
              alt=""
              width={28}
              height={20}
              className="h-5 w-7 shrink-0 rounded-sm border border-border/60 object-cover"
            />
          ) : (
            <span className="flex h-5 w-7 shrink-0 items-center justify-center rounded-sm border border-dashed border-muted-foreground/40 text-[10px] text-muted-foreground">
              —
            </span>
          )}
        </div>
      </div>

      {hasRealResult && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/50 px-3 pt-2">
          <span className="text-xs text-muted-foreground">Resultado real:</span>
          <Badge variant="outline" className="font-mono text-xs tabular-nums">
            {match.homeGoals} — {match.awayGoals}
          </Badge>
          {predictionComplete && !matchesOfficial && (
            <span className="text-xs text-muted-foreground">Tu pronóstico difiere</span>
          )}
        </div>
      )}
    </Card>
  );
};
