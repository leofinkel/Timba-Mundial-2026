import {
  orderGroupStandings,
  type GroupMatchScore,
} from '@/lib/fixture/groupStandingsOrdering';
import type {
  ComputedGroupStandings,
  GroupMatch,
  GroupStanding,
  Team,
} from '@/types/tournament';

export type GroupMatchScoresInput = Record<
  string,
  { homeGoals: number | null; awayGoals: number | null }
>;

type MutableRow = {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

const buildMatchScores = (
  matches: GroupMatch[],
  predictions: GroupMatchScoresInput,
): GroupMatchScore[] => {
  const out: GroupMatchScore[] = [];
  for (const m of matches) {
    const p = predictions[m.id];
    if (!p || p.homeGoals === null || p.awayGoals === null) continue;
    const hg = p.homeGoals;
    const ag = p.awayGoals;
    if (!Number.isFinite(hg) || !Number.isFinite(ag) || hg < 0 || ag < 0) continue;
    out.push({
      homeTeamId: m.homeTeam.id,
      awayTeamId: m.awayTeam.id,
      homeGoals: hg,
      awayGoals: ag,
    });
  }
  return out;
};

export const computeGroupStandingsFromPredictions = (
  teams: Team[],
  matches: GroupMatch[],
  predictions: GroupMatchScoresInput,
): ComputedGroupStandings => {
  const rows = new Map<string, MutableRow>();
  for (const t of teams) {
    rows.set(t.id, {
      team: t,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    });
  }

  for (const m of matches) {
    const p = predictions[m.id];
    if (!p || p.homeGoals === null || p.awayGoals === null) continue;
    const hg = p.homeGoals;
    const ag = p.awayGoals;
    if (!Number.isFinite(hg) || !Number.isFinite(ag) || hg < 0 || ag < 0) continue;
    const home = rows.get(m.homeTeam.id);
    const away = rows.get(m.awayTeam.id);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += hg;
    home.goalsAgainst += ag;
    away.goalsFor += ag;
    away.goalsAgainst += hg;

    if (hg > ag) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (hg < ag) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  const matchScores = buildMatchScores(matches, predictions);
  const overallRows = [...rows.values()].map((r) => ({
    teamId: r.team.id,
    points: r.points,
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
  }));

  const { order, unresolvedClusters } = orderGroupStandings(overallRows, matchScores);
  const rowById = rows;

  const standings: GroupStanding[] = order.map((teamId, idx) => {
    const r = rowById.get(teamId)!;
    return {
      team: r.team,
      played: r.played,
      won: r.won,
      drawn: r.drawn,
      lost: r.lost,
      goalsFor: r.goalsFor,
      goalsAgainst: r.goalsAgainst,
      goalDifference: r.goalsFor - r.goalsAgainst,
      points: r.points,
      position: (idx + 1) as GroupStanding['position'],
    };
  });

  return {
    standings,
    unresolvedTieClusters: unresolvedClusters,
  };
};

export const reorderStandingsByTeamOrder = (
  standings: GroupStanding[],
  teamOrder: string[],
): GroupStanding[] => {
  const byId = new Map(standings.map((s) => [s.team.id, s]));
  return teamOrder.map((id, idx) => {
    const row = byId.get(id);
    if (!row) {
      throw new Error(`reorderStandingsByTeamOrder: unknown team id ${id}`);
    }
    return {
      ...row,
      position: (idx + 1) as GroupStanding['position'],
    };
  });
};
