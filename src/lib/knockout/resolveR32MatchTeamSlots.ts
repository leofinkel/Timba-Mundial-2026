import {
  buildThirdPlaceRow,
  isThirdPlaceKnockoutSource,
  lookupOfficialThirdPlaceAllocation,
  rankThirdPlaceTeams,
  resolveDirectSource,
  resolveThirdPlaceTeamForR32Match,
} from '@/lib/knockout/thirdPlaceAllocation';
import type { ThirdPlaceTeam } from '@/lib/knockout/thirdPlaceAllocation';
import { normalizeThirdPlaceGroupId } from '@/lib/knockout/thirdPlaceCombinationMeta';
import type { GroupName, GroupStanding, KnockoutMatch } from '@/types/tournament';

export type ThirdPlaceResolutionContext = {
  allocation: Map<string, number>;
  thirdTeamByGroup: Map<string, string>;
  standingsByGroup: Map<string, string[]>;
};

export const sortStandingsByPosition = (rows: GroupStanding[]): GroupStanding[] =>
  [...rows].sort((a, b) => a.position - b.position);

export const buildThirdPlaceResolutionFromStandings = (
  standings: Record<GroupName, GroupStanding[]>,
): ThirdPlaceResolutionContext => {
  const standingsByGroup = new Map<string, string[]>();
  for (const [g, rows] of Object.entries(standings)) {
    const sorted = sortStandingsByPosition(rows);
    standingsByGroup.set(
      normalizeThirdPlaceGroupId(g),
      sorted.map((r) => r.team.id),
    );
  }

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

  const ranked = rankThirdPlaceTeams(thirds);
  const qualifying = ranked.slice(0, 8);
  const qualifyingGroups = qualifying.map((t) =>
    normalizeThirdPlaceGroupId(t.groupId),
  );
  const allocation = lookupOfficialThirdPlaceAllocation(qualifyingGroups);

  const thirdTeamByGroup = new Map<string, string>();
  for (const t of qualifying) {
    thirdTeamByGroup.set(normalizeThirdPlaceGroupId(t.groupId), t.teamId);
  }

  return { allocation, thirdTeamByGroup, standingsByGroup };
};

/**
 * Resolve Round-of-32 home/away team ids from predicted group standings + official third-place matrix.
 */
export const resolveR32MatchTeamSlotsFromStandings = (
  knockoutMatches: KnockoutMatch[],
  standings: Record<GroupName, GroupStanding[]>,
): Record<string, { homeTeamId: string; awayTeamId: string }> => {
  const { allocation, thirdTeamByGroup, standingsByGroup } =
    buildThirdPlaceResolutionFromStandings(standings);

  const result: Record<string, { homeTeamId: string; awayTeamId: string }> = {};

  for (const m of knockoutMatches) {
    if (m.round !== 'round-of-32') continue;

    let homeTeamId = '';
    let awayTeamId = '';

    if (m.homeSource) {
      if (isThirdPlaceKnockoutSource(m.homeSource)) {
        homeTeamId =
          resolveThirdPlaceTeamForR32Match(
            allocation,
            thirdTeamByGroup,
            m.matchNumber,
          ) ?? '';
      } else {
        homeTeamId = resolveDirectSource(m.homeSource, standingsByGroup) ?? '';
      }
    }

    if (m.awaySource) {
      if (isThirdPlaceKnockoutSource(m.awaySource)) {
        awayTeamId =
          resolveThirdPlaceTeamForR32Match(
            allocation,
            thirdTeamByGroup,
            m.matchNumber,
          ) ?? '';
      } else {
        awayTeamId = resolveDirectSource(m.awaySource, standingsByGroup) ?? '';
      }
    }

    if (homeTeamId || awayTeamId) {
      result[m.id] = { homeTeamId, awayTeamId };
    }
  }

  return result;
};
