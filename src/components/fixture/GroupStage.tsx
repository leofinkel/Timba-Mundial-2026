'use client';

import { useMemo } from 'react';

import { GROUP_NAMES, GROUP_MATCHES_COUNT } from '@/constants/tournament';
import type { GroupPredictionState } from '@/hooks/useFixturePredictions';
import type { Group, GroupName, GroupStanding } from '@/types/tournament';

import { GroupAccordion } from '@/components/fixture/GroupAccordion';

type GroupStageProps = {
  groups: Group[];
  groupPredictions: GroupPredictionState;
  calculatedStandings: Record<GroupName, GroupStanding[]>;
  onGroupMatchUpdate: (matchId: string, home: number | null, away: number | null) => void;
  disabled?: boolean;
};

export const GroupStage = ({
  groups,
  groupPredictions,
  calculatedStandings,
  onGroupMatchUpdate,
  disabled = false,
}: GroupStageProps) => {
  const sortedGroups = useMemo(() => {
    const order = new Map(GROUP_NAMES.map((g, i) => [g, i] as const));
    return [...groups].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }, [groups]);

  const completedCount = useMemo(() => {
    let n = 0;
    for (const g of groups) {
      for (const m of g.matches) {
        const p = groupPredictions[m.id];
        if (p?.homeGoals !== null && p?.awayGoals !== null) n += 1;
      }
    }
    return n;
  }, [groups, groupPredictions]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-background to-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-foreground">
          Fase de grupos
        </p>
        <p className="text-sm tabular-nums text-muted-foreground">
          <span className="font-semibold text-emerald-700 dark:text-emerald-300">
            {completedCount}
          </span>
          <span> / {GROUP_MATCHES_COUNT} partidos completados</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedGroups.map((g) => (
          <GroupAccordion
            key={g.id}
            group={g}
            groupPredictions={groupPredictions}
            standings={calculatedStandings[g.id] ?? []}
            onGroupMatchUpdate={onGroupMatchUpdate}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
};
