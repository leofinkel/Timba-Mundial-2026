'use client';

import Image from 'next/image';
import { ChevronRight, Trophy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { KnockoutMatchPrediction } from '@/types/prediction';
import type { KnockoutMatch, Team } from '@/types/tournament';

type KnockoutMatchCardProps = {
  match: KnockoutMatch;
  prediction: KnockoutMatchPrediction;
  allTeams: Team[];
  onChange: (matchId: string, patch: Partial<KnockoutMatchPrediction>) => void;
  disabled?: boolean;
};

const UNSET = '__unset__';

const parseGoalInput = (raw: string): number => {
  if (raw === '') return 0;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return 0;
  return Math.min(99, Math.max(0, n));
};

const TeamFlag = ({ team, className }: { team: Team; className?: string }) =>
  team.flagUrl ? (
    <Image
      src={team.flagUrl}
      alt=""
      width={24}
      height={18}
      className={cn('h-5 w-6 shrink-0 rounded-sm border border-border/60 object-cover', className)}
    />
  ) : (
    <span className="flex h-5 w-6 shrink-0 items-center justify-center rounded-sm border border-dashed border-muted-foreground/40 text-[8px] text-muted-foreground">
      —
    </span>
  );

export const KnockoutMatchCard = ({
  match,
  prediction,
  allTeams,
  onChange,
  disabled = false,
}: KnockoutMatchCardProps) => {
  const homeResolved =
    match.homeTeam ?? allTeams.find((t) => t.id === prediction.homeTeamId) ?? null;
  const awayResolved =
    match.awayTeam ?? allTeams.find((t) => t.id === prediction.awayTeamId) ?? null;

  const homeOptions = allTeams.filter((t) => t.id !== prediction.awayTeamId);
  const awayOptions = allTeams.filter((t) => t.id !== prediction.homeTeamId);

  const winner =
    homeResolved && awayResolved && prediction.winnerId
      ? allTeams.find((t) => t.id === prediction.winnerId) ?? null
      : null;

  const isTie = prediction.homeGoals === prediction.awayGoals;
  const showTiebreak = isTie && !!homeResolved && !!awayResolved;

  return (
    <Card className="gap-0 overflow-hidden border-border/80 bg-gradient-to-br from-background via-background to-emerald-500/5 py-0 shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Partido {match.matchNumber}
        </span>
        <ChevronRight className="size-3.5 text-emerald-600/60" aria-hidden />
      </div>

      <div className="space-y-3 p-3">
        <div className="grid gap-1 text-[11px] leading-tight text-muted-foreground">
          <span>
            <span className="font-medium text-foreground/80">Local:</span> {match.homeSource}
          </span>
          <span>
            <span className="font-medium text-foreground/80">Visitante:</span> {match.awaySource}
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Local</Label>
            {match.homeTeam ? (
              <div className="flex items-center gap-2 rounded-md border border-border/70 bg-background/80 px-2 py-1.5">
                <TeamFlag team={match.homeTeam} />
                <span className="truncate text-sm font-medium">{match.homeTeam.name}</span>
              </div>
            ) : (
              <Select
                disabled={disabled}
                value={prediction.homeTeamId || UNSET}
                onValueChange={(v) => {
                  if (v === UNSET) return;
                  onChange(match.id, { homeTeamId: v });
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Elegir equipo local" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNSET} disabled>
                    Elegir…
                  </SelectItem>
                  {homeOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-center gap-1.5 px-1">
            <Input
              type="text"
              inputMode="numeric"
              maxLength={2}
              disabled={disabled}
              className="h-9 w-10 text-center text-sm tabular-nums"
              value={String(prediction.homeGoals)}
              onChange={(e) =>
                onChange(match.id, { homeGoals: parseGoalInput(e.target.value) })
              }
              aria-label="Goles local"
            />
            <span className="text-muted-foreground">—</span>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={2}
              disabled={disabled}
              className="h-9 w-10 text-center text-sm tabular-nums"
              value={String(prediction.awayGoals)}
              onChange={(e) =>
                onChange(match.id, { awayGoals: parseGoalInput(e.target.value) })
              }
              aria-label="Goles visitante"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Visitante</Label>
            {match.awayTeam ? (
              <div className="flex items-center gap-2 rounded-md border border-border/70 bg-background/80 px-2 py-1.5">
                <TeamFlag team={match.awayTeam} />
                <span className="truncate text-sm font-medium">{match.awayTeam.name}</span>
              </div>
            ) : (
              <Select
                disabled={disabled}
                value={prediction.awayTeamId || UNSET}
                onValueChange={(v) => {
                  if (v === UNSET) return;
                  onChange(match.id, { awayTeamId: v });
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Elegir equipo visitante" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNSET} disabled>
                    Elegir…
                  </SelectItem>
                  {awayOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {showTiebreak && homeResolved && awayResolved ? (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ganador (empate)</Label>
            <Select
              disabled={disabled}
              value={
                prediction.winnerId === homeResolved.id || prediction.winnerId === awayResolved.id
                  ? prediction.winnerId
                  : homeResolved.id
              }
              onValueChange={(v) => onChange(match.id, { winnerId: v })}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Elegir ganador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={homeResolved.id}>{homeResolved.name}</SelectItem>
                <SelectItem value={awayResolved.id}>{awayResolved.name}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {winner && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-2">
            <Trophy className="size-3.5 shrink-0 text-amber-500" aria-hidden />
            <span className="text-xs text-muted-foreground">Pasa a la siguiente ronda:</span>
            <Badge
              variant="secondary"
              className="max-w-full truncate bg-emerald-600/15 text-emerald-900 dark:text-emerald-100"
            >
              {winner.name}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
};
