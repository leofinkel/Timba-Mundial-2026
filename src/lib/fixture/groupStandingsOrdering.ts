/**
 * Orden de tabla de grupo: puntos, diferencia de goles, goles a favor,
 * luego criterios entre equipos empatados (mini-liga y partido directo si aplica).
 * Si aún así queda empate, se marca como no resuelto (requiere orden manual).
 */

export type GroupMatchScore = {
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
};

type H2HAcc = { pts: number; gf: number; ga: number };

const h2hKey = (s: H2HAcc): string => {
  const gd = s.gf - s.ga;
  return `${s.pts}:${gd}:${s.gf}`;
};

const compareH2H = (h2h: Map<string, H2HAcc>, a: string, b: string): number => {
  const A = h2h.get(a)!;
  const B = h2h.get(b)!;
  const gdA = A.gf - A.ga;
  const gdB = B.gf - B.ga;
  if (B.pts !== A.pts) return B.pts - A.pts;
  if (gdB !== gdA) return gdB - gdA;
  if (B.gf !== A.gf) return B.gf - A.gf;
  return 0;
};

const computeH2H = (teamIds: string[], matches: GroupMatchScore[]): Map<string, H2HAcc> => {
  const set = new Set(teamIds);
  const stats = new Map<string, H2HAcc>();
  for (const id of teamIds) {
    stats.set(id, { pts: 0, gf: 0, ga: 0 });
  }
  for (const m of matches) {
    if (!set.has(m.homeTeamId) || !set.has(m.awayTeamId)) continue;
    const hg = m.homeGoals;
    const ag = m.awayGoals;
    const home = stats.get(m.homeTeamId)!;
    const away = stats.get(m.awayTeamId)!;
    home.gf += hg;
    home.ga += ag;
    away.gf += ag;
    away.ga += hg;
    if (hg > ag) {
      home.pts += 3;
    } else if (hg < ag) {
      away.pts += 3;
    } else {
      home.pts += 1;
      away.pts += 1;
    }
  }
  return stats;
};

const findDirectMatch = (
  a: string,
  b: string,
  matches: GroupMatchScore[],
): GroupMatchScore | null => {
  for (const m of matches) {
    if (m.homeTeamId === a && m.awayTeamId === b) return m;
    if (m.homeTeamId === b && m.awayTeamId === a) return m;
  }
  return null;
};

const sortIdsDeterministic = (ids: string[]): string[] => [...ids].sort((x, y) => x.localeCompare(y));

/**
 * Resuelve el orden dentro de un subconjunto de equipos empatados en la tabla general
 * usando solo partidos entre ellos (y recursivamente).
 */
const resolveTiedSubset = (
  teamIds: string[],
  matches: GroupMatchScore[],
): { order: string[]; ambiguous: boolean } => {
  if (teamIds.length <= 1) {
    return { order: [...teamIds], ambiguous: false };
  }

  const h2h = computeH2H(teamIds, matches);
  const sorted = [...teamIds].sort((a, b) => compareH2H(h2h, a, b));

  const runs: string[][] = [];
  let start = 0;
  while (start < sorted.length) {
    let end = start + 1;
    const k0 = h2hKey(h2h.get(sorted[start])!);
    while (end < sorted.length && h2hKey(h2h.get(sorted[end])!) === k0) {
      end += 1;
    }
    runs.push(sorted.slice(start, end));
    start = end;
  }

  if (runs.length === 1 && runs[0].length === teamIds.length) {
    if (teamIds.length === 2) {
      const m = findDirectMatch(teamIds[0], teamIds[1], matches);
      if (!m) {
        return { order: sortIdsDeterministic(teamIds), ambiguous: true };
      }
      if (m.homeGoals === m.awayGoals) {
        return { order: sortIdsDeterministic(teamIds), ambiguous: true };
      }
      const homeWins = m.homeGoals > m.awayGoals;
      const first = homeWins ? m.homeTeamId : m.awayTeamId;
      const second = first === m.homeTeamId ? m.awayTeamId : m.homeTeamId;
      return { order: [first, second], ambiguous: false };
    }
    return { order: sortIdsDeterministic(teamIds), ambiguous: true };
  }

  const out: string[] = [];
  let ambiguous = false;
  for (const run of runs) {
    if (run.length === 1) {
      out.push(run[0]);
    } else {
      const sub = resolveTiedSubset(run, matches);
      if (sub.ambiguous) ambiguous = true;
      out.push(...sub.order);
    }
  }
  return { order: out, ambiguous };
};

export type OverallRow = {
  teamId: string;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
};

const sameOverall = (a: OverallRow, b: OverallRow): boolean => {
  const gdA = a.goalsFor - a.goalsAgainst;
  const gdB = b.goalsFor - b.goalsAgainst;
  return a.points === b.points && gdA === gdB && a.goalsFor === b.goalsFor;
};

/**
 * Orden final de teamIds y clusters que siguen empatados tras aplicar todos los criterios.
 */
export const orderGroupStandings = (
  overallRows: OverallRow[],
  matches: GroupMatchScore[],
): { order: string[]; unresolvedClusters: string[][] } => {
  if (overallRows.length === 0) {
    return { order: [], unresolvedClusters: [] };
  }

  const sorted = [...overallRows].sort((a, b) => {
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (b.points !== a.points) return b.points - a.points;
    if (gdB !== gdA) return gdB - gdA;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return 0;
  });

  const finalOrder: string[] = [];
  const unresolvedClusters: string[][] = [];

  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && sameOverall(sorted[i], sorted[j])) {
      j += 1;
    }
    const run = sorted.slice(i, j).map((r) => r.teamId);
    if (run.length === 1) {
      finalOrder.push(run[0]);
    } else {
      const { order, ambiguous } = resolveTiedSubset(run, matches);
      finalOrder.push(...order);
      if (ambiguous) {
        unresolvedClusters.push(run);
      }
    }
    i = j;
  }

  return { order: finalOrder, unresolvedClusters };
};
