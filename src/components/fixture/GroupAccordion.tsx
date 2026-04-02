'use client';

import { useMemo } from 'react';

import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { GroupMatchCard } from '@/components/fixture/GroupMatchCard';
import { TeamFlag } from '@/components/fixture/TeamFlag';
import type { GroupPredictionState } from '@/hooks/useFixturePredictions';
import type { Group, GroupStanding } from '@/types/tournament';

type GroupAccordionProps = {
  group: Group;
  groupPredictions: GroupPredictionState;
  standings: GroupStanding[];
  unresolvedTieClusters: string[][];
  onMoveTeamInGroupOrder: (teamId: string, direction: 'up' | 'down') => void;
  onGroupMatchUpdate: (matchId: string, home: number | null, away: number | null) => void;
  disabled?: boolean;
};

export const GroupAccordion = ({
  group,
  groupPredictions,
  standings,
  unresolvedTieClusters,
  onMoveTeamInGroupOrder,
  onGroupMatchUpdate,
  disabled = false,
}: GroupAccordionProps) => {
  const { completed, total } = useMemo(() => {
    let c = 0;
    for (const m of group.matches) {
      const p = groupPredictions[m.id];
      if (p?.homeGoals !== null && p?.awayGoals !== null) c += 1;
    }
    return { completed: c, total: group.matches.length };
  }, [group.matches, groupPredictions]);

  const hasUnresolvedTies = unresolvedTieClusters.length > 0;

  const clusterMoveHints = useMemo(() => {
    const map = new Map<
      string,
      { canUp: boolean; canDown: boolean }
    >();
    for (const cluster of unresolvedTieClusters) {
      const indices = cluster
        .map((id) => standings.findIndex((s) => s.team.id === id))
        .filter((i) => i >= 0)
        .sort((a, b) => a - b);
      for (let k = 0; k < indices.length; k += 1) {
        const row = standings[indices[k]];
        if (!row) continue;
        map.set(row.team.id, {
          canUp: k > 0,
          canDown: k < indices.length - 1,
        });
      }
    }
    return map;
  }, [standings, unresolvedTieClusters]);

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem
        value={group.id}
        className="rounded-xl border border-border/60 bg-card/50 px-4 shadow-sm backdrop-blur-sm"
      >
        <AccordionTrigger className="py-3.5 hover:no-underline">
          <div className="flex w-full items-center justify-between pr-2">
            <div className="flex items-center gap-2.5">
              <span className="text-base font-bold tracking-tight">{group.name}</span>
              <Badge
                variant="secondary"
                className="bg-emerald-600/15 text-xs text-emerald-300"
              >
                {completed}/{total} partidos
              </Badge>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pb-4">
          <div className="flex flex-col gap-1.5">
            {group.matches.map((m) => {
              const p = groupPredictions[m.id];
              return (
                <GroupMatchCard
                  key={m.id}
                  match={m}
                  homeGoals={p?.homeGoals ?? null}
                  awayGoals={p?.awayGoals ?? null}
                  onScoresChange={onGroupMatchUpdate}
                  disabled={disabled}
                />
              );
            })}
          </div>

          <div className="rounded-lg border border-border/50 bg-zinc-900/40 p-2.5">
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tabla según tu pronóstico
            </p>
            {hasUnresolvedTies ? (
              <div className="mb-3 flex gap-2 rounded-md border border-amber-500/35 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-100">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
                <p>
                  Hay equipos empatados en puntos, diferencia de goles, goles a favor y criterios
                  entre ellos. Usá las flechas para definir el orden dentro del grupo y guardá la
                  predicción.
                </p>
              </div>
            ) : null}
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="h-7 w-8 px-1 text-center text-[11px]">#</TableHead>
                  <TableHead className="h-7 px-1 text-[11px]">Equipo</TableHead>
                  <TableHead className="h-7 px-1 text-center text-[11px]">Pts</TableHead>
                  <TableHead className="h-7 px-1 text-center text-[11px]">DG</TableHead>
                <TableHead className="h-7 px-1 text-center text-[11px]">GF</TableHead>
                {hasUnresolvedTies ? (
                  <TableHead className="h-7 w-[72px] px-0 text-center text-[11px]">
                    Orden
                  </TableHead>
                ) : null}
              </TableRow>
              </TableHeader>
              <TableBody>
                {standings.map((row) => (
                  <TableRow key={row.team.id} className="border-border/30 text-xs">
                    <TableCell className="px-1 text-center font-medium tabular-nums text-muted-foreground">
                      {row.position}
                    </TableCell>
                    <TableCell className="px-1">
                      <div className="flex items-center gap-1.5">
                        <TeamFlag team={row.team} size="sm" />
                        <span className="font-medium">{row.team.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-1 text-center font-semibold tabular-nums">{row.points}</TableCell>
                    <TableCell className="px-1 text-center tabular-nums text-muted-foreground">
                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                    </TableCell>
                    <TableCell className="px-1 text-center tabular-nums text-muted-foreground">{row.goalsFor}</TableCell>
                    {hasUnresolvedTies ? (
                      <TableCell className="px-0 py-1">
                        {(() => {
                          const hint = clusterMoveHints.get(row.team.id);
                          if (!hint) {
                            return <span className="text-muted-foreground/40">—</span>;
                          }
                          return (
                            <div className="flex justify-center gap-0.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                disabled={disabled || !hint.canUp}
                                onClick={() => onMoveTeamInGroupOrder(row.team.id, 'up')}
                                aria-label={`Subir ${row.team.name} en la tabla`}
                              >
                                <ChevronUp className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                disabled={disabled || !hint.canDown}
                                onClick={() => onMoveTeamInGroupOrder(row.team.id, 'down')}
                                aria-label={`Bajar ${row.team.name} en la tabla`}
                              >
                                <ChevronDown className="size-4" />
                              </Button>
                            </div>
                          );
                        })()}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
