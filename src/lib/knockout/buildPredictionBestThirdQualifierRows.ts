import {
  buildThirdPlaceRow,
  lookupOfficialThirdPlaceAllocation,
  rankThirdPlaceTeams,
} from '@/lib/knockout/thirdPlaceAllocation';
import type { ThirdPlaceTeam } from '@/lib/knockout/thirdPlaceAllocation';
import {
  getThirdPlaceCombinationMeta,
  normalizeThirdPlaceGroupId,
  R32_OPPONENT_SOURCE_FOR_THIRD_SLOT,
} from '@/lib/knockout/thirdPlaceCombinationMeta';
import type { GroupName, GroupStanding } from '@/types/tournament';

import { sortStandingsByPosition } from '@/lib/knockout/resolveR32MatchTeamSlots';

export type PredictionBestThirdQualifierInsertRow = {
  combination_line: number;
  qualifying_groups_key: string;
  excluded_groups_key: string;
  rank_pos: number;
  group_id: string;
  team_id: string;
  round_of_32_match_number: number;
  opponent_source: string;
};

export const buildPredictionBestThirdQualifierRows = (
  standings: Record<GroupName, GroupStanding[]>,
): PredictionBestThirdQualifierInsertRow[] => {
  const thirds = Object.entries(standings)
    .map(([groupId, rows]) => {
      const third = sortStandingsByPosition(rows).find((r) => r.position === 3);
      if (!third) return null;
      return buildThirdPlaceRow({
        groupId,
        teamId: third.team.id,
        tiebreakName: third.team.name,
        points: third.points,
        goalDifference: third.goalDifference,
        goalsFor: third.goalsFor,
        fairPlayScore: third.team.groupStageFairPlayScore ?? undefined,
        fifaRank: third.team.fifaRanking ?? undefined,
      });
    })
    .filter((row): row is ThirdPlaceTeam => row !== null);

  const qualifying = rankThirdPlaceTeams(thirds).slice(0, 8);
  const qualifyingGroups = qualifying.map((t) =>
    normalizeThirdPlaceGroupId(t.groupId),
  );
  const allocation = lookupOfficialThirdPlaceAllocation(qualifyingGroups);
  const combinationMeta = getThirdPlaceCombinationMeta(qualifyingGroups);

  return qualifying.map((t, i) => {
    const matchNum = allocation.get(normalizeThirdPlaceGroupId(t.groupId));
    if (matchNum == null) {
      throw new Error(`No matrix slot for third of group ${t.groupId}`);
    }
    const opponentSource = R32_OPPONENT_SOURCE_FOR_THIRD_SLOT[matchNum];
    if (!opponentSource) {
      throw new Error(`No opponent source for R32 match ${matchNum}`);
    }
    return {
      combination_line: combinationMeta.combinationLine,
      qualifying_groups_key: combinationMeta.qualifyingKey,
      excluded_groups_key: combinationMeta.excludedKey,
      rank_pos: i + 1,
      group_id: t.groupId,
      team_id: t.teamId,
      round_of_32_match_number: matchNum,
      opponent_source: opponentSource,
    };
  });
};
