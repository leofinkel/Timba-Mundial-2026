/**
 * Third-place allocation logic for FIFA 2026 World Cup (48 teams, 12 groups).
 * 8 best third-place teams qualify for the Round of 32.
 * Each R32 slot accepts thirds from specific groups — we use bipartite matching
 * (augmenting-paths) to find a valid assignment for any qualifying combination.
 */

export type ThirdPlaceTeam = {
  groupId: string;
  teamId: string;
  points: number;
  goalDifference: number;
  goalsFor: number;
};

export type ThirdPlaceSlot = {
  matchNumber: number;
  eligibleGroups: string[];
};

/**
 * R32 slots that receive a best-third team (always as the away side).
 * Parsed from the official bracket in seed.sql.
 */
export const THIRD_PLACE_SLOTS: ThirdPlaceSlot[] = [
  { matchNumber: 74, eligibleGroups: ['A', 'B', 'C', 'D', 'F'] },
  { matchNumber: 77, eligibleGroups: ['C', 'D', 'F', 'G', 'H'] },
  { matchNumber: 79, eligibleGroups: ['C', 'E', 'F', 'H', 'I'] },
  { matchNumber: 80, eligibleGroups: ['E', 'H', 'I', 'J', 'K'] },
  { matchNumber: 81, eligibleGroups: ['B', 'E', 'F', 'I', 'J'] },
  { matchNumber: 82, eligibleGroups: ['A', 'E', 'H', 'I', 'J'] },
  { matchNumber: 85, eligibleGroups: ['E', 'F', 'G', 'I', 'J'] },
  { matchNumber: 87, eligibleGroups: ['D', 'E', 'I', 'J', 'L'] },
];

export const rankThirdPlaceTeams = (
  thirds: ThirdPlaceTeam[],
): ThirdPlaceTeam[] =>
  [...thirds].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference)
      return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

/**
 * Solve the assignment of qualifying groups to R32 slots using
 * augmenting-path bipartite matching (tiny 8×8 graph).
 * @returns Map of groupLetter → matchNumber
 */
export const solveBipartiteMatching = (
  qualifyingGroups: string[],
  slots: ThirdPlaceSlot[] = THIRD_PLACE_SLOTS,
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

/**
 * Resolve a direct source like "1A" or "2B" to the team ID using ordered standings.
 * @param standingsByGroup Map of groupLetter → [pos1TeamId, pos2TeamId, pos3TeamId, pos4TeamId]
 */
export const resolveDirectSource = (
  source: string,
  standingsByGroup: Map<string, string[]>,
): string | null => {
  const m = source.match(/^([12])([A-L])$/);
  if (!m) return null;
  const position = parseInt(m[1], 10);
  const groupId = m[2];
  const order = standingsByGroup.get(groupId);
  if (!order || order.length < position) return null;
  return order[position - 1] ?? null;
};

/**
 * Build full R32 allocation from group standings.
 * @param standingsByGroup Map of groupLetter → [pos1TeamId, pos2TeamId, pos3TeamId, pos4TeamId]
 * @returns Map of matchNumber → { homeTeamId, awayTeamId }
 */
export const buildRoundOf32Allocation = (
  standingsByGroup: Map<string, string[]>,
): Map<number, { homeTeamId: string | null; awayTeamId: string | null }> => {
  const thirds: ThirdPlaceTeam[] = [];
  for (const [groupId, order] of standingsByGroup) {
    if (order.length >= 3) {
      thirds.push({
        groupId,
        teamId: order[2],
        points: 0,
        goalDifference: 0,
        goalsFor: 0,
      });
    }
  }

  const ranked = rankThirdPlaceTeams(thirds);
  const qualifying = ranked.slice(0, 8);
  const qualifyingGroups = qualifying.map((t) => t.groupId).sort();
  const allocation = solveBipartiteMatching(qualifyingGroups);

  const thirdTeamByGroup = new Map<string, string>();
  for (const t of qualifying) {
    thirdTeamByGroup.set(t.groupId, t.teamId);
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

    if (s.awaySrc === '3') {
      for (const [group, matchNum] of allocation) {
        if (matchNum === s.matchNumber) {
          awayTeamId = thirdTeamByGroup.get(group) ?? null;
          break;
        }
      }
    } else {
      awayTeamId = resolveDirectSource(s.awaySrc, standingsByGroup);
    }

    result.set(s.matchNumber, { homeTeamId, awayTeamId });
  }

  return result;
};
