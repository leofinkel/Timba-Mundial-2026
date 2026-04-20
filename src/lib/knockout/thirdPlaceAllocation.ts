/**
 * Third-place allocation for FIFA World Cup 2026 (48 teams, 12 groups).
 * Ranking: pts → GD → GF → fair play (card weights) → FIFA ranking.
 * Bracket: official 495-combination matrix (Annex C / project Excel). Matrix keys
 * are the eight qualifying group letters sorted; FIFA "línea" = index of the
 * complementary four excluded letters among C(12,4) sorted + 1 (see thirdPlaceCombinationMeta).
 */

import { THIRD_PLACE_COMBINATION_MATRIX } from '@/constants/thirdPlaceBracketMatrix';
import {
  normalizeThirdPlaceGroupId,
  qualifyingGroupsKey,
} from '@/lib/knockout/thirdPlaceCombinationMeta';

const DEFAULT_FIFA_RANK_FALLBACK = 999;

export type ThirdPlaceTeam = {
  groupId: string;
  teamId: string;
  /**
   * FIFA tiebreaker after ranking: alphabetical by team name (same as `get_best_third_place_teams` SQL).
   */
  tiebreakName: string;
  points: number;
  goalDifference: number;
  goalsFor: number;
  /**
   * FIFA fair-play sum for the group stage (yellow -1, indirect red -3, direct red -4).
   * Higher is better (closer to zero from below).
   */
  fairPlayScore: number;
  /** FIFA men's ranking position at tournament start; lower is better. */
  fifaRank: number;
};

/** Card counts in the group stage — used to build fairPlayScore. */
export type ThirdPlaceDiscipline = {
  yellowCards: number;
  /** Second yellow / indirect red card */
  redCardsIndirect: number;
  redCardsDirect: number;
};

/**
 * FIFA disciplinary points for fair-play comparison (Regulations).
 * Returns a single sum: higher value = better fair play.
 */
export const computeFairPlayScore = (d: ThirdPlaceDiscipline): number =>
  -1 * d.yellowCards - 3 * d.redCardsIndirect - 4 * d.redCardsDirect;

export const rankThirdPlaceTeams = (thirds: ThirdPlaceTeam[]): ThirdPlaceTeam[] =>
  [...thirds].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference)
      return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    if (b.fairPlayScore !== a.fairPlayScore) return b.fairPlayScore - a.fairPlayScore;
    if (a.fifaRank !== b.fifaRank) return a.fifaRank - b.fifaRank;
    return a.tiebreakName.localeCompare(b.tiebreakName, 'en');
  });

/**
 * Build ThirdPlaceTeam with neutral tiebreakers when discipline / FIFA rank are unknown.
 */
export const buildThirdPlaceRow = (
  base: Omit<ThirdPlaceTeam, 'fairPlayScore' | 'fifaRank'> & {
    fairPlayScore?: number;
    fifaRank?: number | null;
    tiebreakName?: string;
  },
): ThirdPlaceTeam => ({
  ...base,
  tiebreakName: base.tiebreakName ?? base.teamId,
  fairPlayScore: base.fairPlayScore ?? 0,
  fifaRank: base.fifaRank ?? DEFAULT_FIFA_RANK_FALLBACK,
});

/**
 * Assign each qualifying third-placed team to its Round-of-32 match number
 * using the FIFA combination matrix (not graph matching).
 */
export const lookupOfficialThirdPlaceAllocation = (
  qualifyingGroups: string[],
): Map<string, number> => {
  const key = qualifyingGroupsKey(qualifyingGroups);
  if (key.length !== 8) {
    throw new Error(
      `Third-place allocation requires 8 distinct qualifying groups; got key "${key}"`,
    );
  }
  const row = THIRD_PLACE_COMBINATION_MATRIX[key];
  if (!row) {
    throw new Error(`No third-place matrix row for combination "${key}"`);
  }
  return new Map(
    Object.entries(row).map(([g, n]) => [
      normalizeThirdPlaceGroupId(g),
      Number(n),
    ]),
  );
};

/**
 * Which group's best-third team plays the third-place slot in a given R32 match
 * (inverse of {@link lookupOfficialThirdPlaceAllocation}).
 */
export const buildR32MatchNumberToThirdPlaceGroup = (
  allocation: Map<string, number>,
): Map<number, string> => {
  const inv = new Map<number, string>();
  for (const [group, mn] of allocation) {
    inv.set(Number(mn), group);
  }
  return inv;
};

/**
 * Resolves the team id for the best-third slot in a Round-of-32 match.
 * `matchNumber` may be string (e.g. from JSON/DB); allocation values are always numeric.
 */
export const resolveThirdPlaceTeamForR32Match = (
  allocation: Map<string, number>,
  thirdTeamByGroup: Map<string, string>,
  matchNumber: number | string,
): string | null => {
  const target = Number(matchNumber);
  if (Number.isNaN(target)) return null;
  for (const [group, mn] of allocation) {
    if (Number(mn) === target) {
      return thirdTeamByGroup.get(group) ?? null;
    }
  }
  return null;
};

/**
 * @deprecated Prefer {@link lookupOfficialThirdPlaceAllocation}. Kept for tests / tooling.
 * Eligible third slots per R32 match (third is always away in these fixtures).
 */
export const THIRD_PLACE_SLOTS = [
  { matchNumber: 74, eligibleGroups: ['A', 'B', 'C', 'D', 'F'] },
  { matchNumber: 77, eligibleGroups: ['C', 'D', 'F', 'G', 'H'] },
  { matchNumber: 79, eligibleGroups: ['C', 'E', 'F', 'H', 'I'] },
  { matchNumber: 80, eligibleGroups: ['E', 'H', 'I', 'J', 'K'] },
  { matchNumber: 81, eligibleGroups: ['B', 'E', 'F', 'I', 'J'] },
  { matchNumber: 82, eligibleGroups: ['A', 'E', 'H', 'I', 'J'] },
  { matchNumber: 85, eligibleGroups: ['E', 'F', 'G', 'I', 'J'] },
  { matchNumber: 87, eligibleGroups: ['D', 'E', 'I', 'J', 'L'] },
] as const;

export const solveBipartiteMatching = (
  qualifyingGroups: string[],
  slots: readonly { matchNumber: number; eligibleGroups: readonly string[] }[] = THIRD_PLACE_SLOTS,
): Map<string, number> => {
  const adj = new Map<string, number[]>();
  for (const group of qualifyingGroups) {
    const eligible: number[] = [];
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].eligibleGroups.includes(group)) {
        eligible.push(i);
      }
    }
    adj.set(group, eligible);
  }

  const slotAssignment = new Array<string | null>(slots.length).fill(null);

  const augment = (group: string, visited: Set<number>): boolean => {
    for (const slotIdx of adj.get(group) ?? []) {
      if (visited.has(slotIdx)) continue;
      visited.add(slotIdx);
      const current = slotAssignment[slotIdx];
      if (current === null || augment(current, visited)) {
        slotAssignment[slotIdx] = group;
        return true;
      }
    }
    return false;
  };

  for (const group of qualifyingGroups) {
    augment(group, new Set());
  }

  const result = new Map<string, number>();
  for (let i = 0; i < slots.length; i++) {
    const g = slotAssignment[i];
    if (g) result.set(g, slots[i].matchNumber);
  }
  return result;
};

/** DB uses `3-ABCDF` placeholders; `3` alone is accepted for legacy rows. */
export const isThirdPlaceKnockoutSource = (src: string | null | undefined): boolean =>
  !!src && (src === '3' || src.startsWith('3-'));

export const resolveDirectSource = (
  source: string,
  standingsByGroup: Map<string, string[]>,
): string | null => {
  const m = source.match(/^([12])([A-L])$/);
  if (!m) return null;
  const position = parseInt(m[1], 10);
  const groupId = normalizeThirdPlaceGroupId(m[2]);
  const order = standingsByGroup.get(groupId);
  if (!order || order.length < position) return null;
  return order[position - 1] ?? null;
};

export const buildRoundOf32Allocation = (
  standingsByGroup: Map<string, string[]>,
): Map<number, { homeTeamId: string | null; awayTeamId: string | null }> => {
  const thirds: ThirdPlaceTeam[] = [];
  for (const [groupId, order] of standingsByGroup) {
    if (order.length >= 3) {
      thirds.push({
        groupId,
        teamId: order[2],
        tiebreakName: order[2],
        points: 0,
        goalDifference: 0,
        goalsFor: 0,
        fairPlayScore: 0,
        fifaRank: DEFAULT_FIFA_RANK_FALLBACK,
      });
    }
  }

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

  const result = new Map<
    number,
    { homeTeamId: string | null; awayTeamId: string | null }
  >();

  const R32_SOURCES: Array<{
    matchNumber: number;
    homeSrc: string;
    awaySrc: string;
  }> = [
    { matchNumber: 73, homeSrc: '2A', awaySrc: '2B' },
    { matchNumber: 74, homeSrc: '1E', awaySrc: '3' },
    { matchNumber: 75, homeSrc: '1F', awaySrc: '2C' },
    { matchNumber: 76, homeSrc: '1C', awaySrc: '2F' },
    { matchNumber: 77, homeSrc: '1I', awaySrc: '3' },
    { matchNumber: 78, homeSrc: '2E', awaySrc: '2I' },
    { matchNumber: 79, homeSrc: '1A', awaySrc: '3' },
    { matchNumber: 80, homeSrc: '1L', awaySrc: '3' },
    { matchNumber: 81, homeSrc: '1D', awaySrc: '3' },
    { matchNumber: 82, homeSrc: '1G', awaySrc: '3' },
    { matchNumber: 83, homeSrc: '2K', awaySrc: '2L' },
    { matchNumber: 84, homeSrc: '1H', awaySrc: '2J' },
    { matchNumber: 85, homeSrc: '1B', awaySrc: '3' },
    { matchNumber: 86, homeSrc: '1J', awaySrc: '2H' },
    { matchNumber: 87, homeSrc: '1K', awaySrc: '3' },
    { matchNumber: 88, homeSrc: '2D', awaySrc: '2G' },
  ];

  for (const s of R32_SOURCES) {
    const homeTeamId = resolveDirectSource(s.homeSrc, standingsByGroup);
    let awayTeamId: string | null = null;

    if (s.awaySrc === '3' || s.awaySrc.startsWith('3-')) {
      awayTeamId = resolveThirdPlaceTeamForR32Match(
        allocation,
        thirdTeamByGroup,
        s.matchNumber,
      );
    } else {
      awayTeamId = resolveDirectSource(s.awaySrc, standingsByGroup);
    }

    result.set(s.matchNumber, { homeTeamId, awayTeamId });
  }

  return result;
};
