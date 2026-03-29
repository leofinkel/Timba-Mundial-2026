import type { GroupMatch, GroupStanding, Team } from '@/types/tournament';

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

export const computeGroupStandingsFromPredictions = (
  teams: Team[],
  matches: GroupMatch[],
  predictions: GroupMatchScoresInput,
): GroupStanding[] => {
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

  const sorted = [...rows.values()].sort((a, b) => {
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (b.points !== a.points) return b.points - a.points;
    if (gdB !== gdA) return gdB - gdA;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.team.name.localeCompare(b.team.name, 'es');
  });

  return sorted.map((r, idx) => ({
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
  }));
};
