'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronRight, Trophy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TeamFlag } from '@/components/fixture/TeamFlag';
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

const UTC_MINUS_5_OFFSET_MS = -5 * 60 * 60 * 1000;

const formatMatchDate = (isoDate: string): string => {
  const utc = new Date(isoDate);
  const local = new Date(utc.getTime() + UTC_MINUS_5_OFFSET_MS);
  const day = format(local, 'd MMM', { locale: es });
  const hours = local.getUTCHours().toString().padStart(2, '0');
  const mins = local.getUTCMinutes().toString().padStart(2, '0');
  return `${day} · ${hours}:${mins} hs`;
};

const TeamSlot = ({ team, label }: { team: Team | null; label: string }) => {
  if (!team) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-border/60 bg-muted/20 px-2 py-1.5">
        <span className="text-xs italic text-muted-foreground">{label}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/70 bg-background/80 px-2 py-1.5">
      <TeamFlag team={team} />
      <span className="truncate text-sm font-medium">{team.name}</span>
    </div>
  );
};

export const KnockoutMatchCard = ({
  match,
  prediction,
  allTeams,
  onChange,
  disabled = false,
}: KnockoutMatchCardProps) => {
  const homeResolved =
    match.homeTeam ??
    allTeams.find((t) => t.id === prediction.homeTeamId) ??
    null;
  const awayResolved =
    match.awayTeam ??
    allTeams.find((t) => t.id === prediction.awayTeamId) ??
    null;

  const bothResolved = !!homeResolved && !!awayResolved;

  const winner =
    bothResolved && prediction.winnerId
      ? allTeams.find((t) => t.id === prediction.winnerId) ?? null
      : null;

  return (
    <Card className="gap-0 overflow-hidden border-border/80 bg-gradient-to-br from-background via-background to-emerald-500/5 py-0 shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Partido {match.matchNumber}
        </span>
        {match.playedAt && (
          <span className="text-[10px] tabular-nums text-muted-foreground/70">
            {formatMatchDate(match.playedAt)}
          </span>
        )}
        <ChevronRight className="size-3.5 text-emerald-600/60" aria-hidden />
      </div>

      <div className="space-y-3 p-3">
        <div className="grid gap-1 text-[11px] leading-tight text-muted-foreground">
          <span>
            <span className="font-medium text-foreground/80">Local:</span>{' '}
            {match.homeSource}
          </span>
          <span>
            <span className="font-medium text-foreground/80">Visitante:</span>{' '}
            {match.awaySource}
          </span>
        </div>

        <div className="space-y-2">
          <TeamSlot team={homeResolved} label="Por definir…" />

          <div className="flex items-center justify-center">
            <span className="text-xs font-semibold text-muted-foreground">VS</span>
          </div>

          <TeamSlot team={awayResolved} label="Por definir…" />
        </div>

        {bothResolved ? (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              ¿Quién gana?
            </span>
            <Select
              disabled={disabled}
              value={prediction.winnerId || UNSET}
              onValueChange={(v) => {
                if (v === UNSET) return;
                onChange(match.id, { winnerId: v });
              }}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Elegir ganador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET} disabled>
                  Elegir…
                </SelectItem>
                <SelectItem value={homeResolved!.id}>
                  <span className="flex items-center gap-2">
                    <TeamFlag team={homeResolved!} size="sm" />
                    {homeResolved!.name}
                  </span>
                </SelectItem>
                <SelectItem value={awayResolved!.id}>
                  <span className="flex items-center gap-2">
                    <TeamFlag team={awayResolved!} size="sm" />
                    {awayResolved!.name}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {winner ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-2">
            <Trophy className="size-3.5 shrink-0 text-amber-500" aria-hidden />
            <span className="text-xs text-muted-foreground">
              Pasa a la siguiente ronda:
            </span>
            <Badge
              variant="secondary"
              className="max-w-full truncate bg-emerald-600/15 text-emerald-900 dark:text-emerald-100"
            >
              {winner.name}
            </Badge>
          </div>
        ) : null}
      </div>
    </Card>
  );
};
