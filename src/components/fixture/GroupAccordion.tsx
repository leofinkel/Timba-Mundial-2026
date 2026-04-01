'use client';

import { useMemo } from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
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
  onGroupMatchUpdate: (matchId: string, home: number | null, away: number | null) => void;
  disabled?: boolean;
};

export const GroupAccordion = ({
  group,
  groupPredictions,
  standings,
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

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem
        value={group.id}
        className="rounded-xl border border-border/80 bg-card/40 px-3 shadow-sm"
      >
        <AccordionTrigger className="py-3 hover:no-underline">
          <div className="flex w-full flex-col items-start gap-1 text-left sm:flex-row sm:items-center sm:justify-between sm:pr-2">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight">{group.name}</span>
              <Badge
                variant="secondary"
                className="bg-emerald-600/15 text-emerald-200"
              >
                {completed}/{total} partidos
              </Badge>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pb-4">
          <div className="flex flex-col gap-2">
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

          <div className="rounded-lg border border-border/70 bg-muted/20 p-2">
            <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tabla (según tu pronóstico)
            </p>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 w-8 px-1 text-center">Pos</TableHead>
                  <TableHead className="h-8 px-1">Equipo</TableHead>
                  <TableHead className="h-8 px-1 text-center">Pts</TableHead>
                  <TableHead className="h-8 px-1 text-center">DG</TableHead>
                  <TableHead className="h-8 px-1 text-center">GF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standings.map((row) => (
                  <TableRow key={row.team.id} className="text-xs sm:text-sm">
                    <TableCell className="px-1 text-center font-medium tabular-nums">
                      {row.position}
                    </TableCell>
                    <TableCell className="px-1">
                      <div className="flex items-center gap-1.5">
                        <TeamFlag team={row.team} size="sm" />
                        <span className="max-w-[100px] truncate font-medium">{row.team.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-1 text-center tabular-nums">{row.points}</TableCell>
                    <TableCell className="px-1 text-center tabular-nums">
                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                    </TableCell>
                    <TableCell className="px-1 text-center tabular-nums">{row.goalsFor}</TableCell>
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
