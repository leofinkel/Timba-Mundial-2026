import {
  computeGroupStandingsFromPredictions,
  reorderStandingsByTeamOrder,
  type GroupMatchScoresInput,
} from '@/lib/fixture/computeGroupStandingsFromPredictions';
import type { GroupName, GroupStanding, Tournament } from '@/types/tournament';

const isValidTeamOrder = (order: string[] | undefined, groupTeamIds: string[]): boolean => {
  if (!order || order.length !== groupTeamIds.length) return false;
  const set = new Set(order);
  if (set.size !== order.length) return false;
  return groupTeamIds.every((id) => set.has(id));
};

/**
 * Same rules as the fixture hook: raw standings when no tie clusters; otherwise optional
 * manual order from saved `prediction_group_standings` when valid.
 */
export const buildCalculatedStandingsForPrediction = (
  tournament: Tournament,
  groupPredictions: GroupMatchScoresInput,
  manualGroupOrder: Partial<Record<GroupName, string[]>>,
): Record<GroupName, GroupStanding[]> => {
  const out = {} as Record<GroupName, GroupStanding[]>;
  for (const g of tournament.groups) {
    const raw = computeGroupStandingsFromPredictions(g.teams, g.matches, groupPredictions);
    const teamIds = g.teams.map((t) => t.id);
    const manual = manualGroupOrder[g.id];
    if (raw.unresolvedTieClusters.length === 0) {
      out[g.id] = raw.standings;
    } else if (isValidTeamOrder(manual, teamIds)) {
      out[g.id] = reorderStandingsByTeamOrder(raw.standings, manual!);
    } else {
      out[g.id] = raw.standings;
    }
  }
  return out;
};
