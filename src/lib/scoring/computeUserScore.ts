import { SCORING_RULES } from '@/constants/scoring';
import { orderGroupStandings } from '@/lib/fixture/groupStandingsOrdering';
import { normalizeSpecialPredictionPlayerName } from '@/lib/scoring/normalizeSpecialPredictionPlayerName';
import type { MatchRow } from '@/repositories/matchRepository';

/** Mínimo para 103/104: compatible con el `MatchRow` “delgado” de scoringService. */
export type MatchForHonorResolve = {
  match_number: number;
  stage: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_goals: number | null;
  away_goals: number | null;
  winner_team_id: string | null;
};
import type { RealResultsRow } from '@/repositories/realResultsRepository';
import type { GroupName } from '@/types/tournament';

type PredMatch = {
  match_id: string;
  home_goals: number;
  away_goals: number;
  winner_team_id: string | null;
  pred_home_team_id?: string | null;
  pred_away_team_id?: string | null;
};

/** Campos mínimos para inferir ganador (partidos oficiales o contexto de predicción). */
export type ScoringMatchLike = {
  home_team_id: string | null;
  away_team_id: string | null;
  home_goals: number | null;
  away_goals: number | null;
  winner_team_id: string | null;
};

const outcome = (h: number, a: number): 'h' | 'a' | 'd' => {
  if (h > a) return 'h';
  if (a > h) return 'a';
  return 'd';
};

export const actualWinnerFromMatch = (m: ScoringMatchLike): string | null => {
  if (m.home_goals == null || m.away_goals == null) return null;
  if (
    m.winner_team_id &&
    m.home_team_id &&
    m.away_team_id &&
    (m.winner_team_id === m.home_team_id || m.winner_team_id === m.away_team_id)
  ) {
    return m.winner_team_id;
  }
  if (m.home_goals > m.away_goals) return m.home_team_id;
  if (m.away_goals > m.home_goals) return m.away_team_id;
  return null;
};

/**
 * Ganador de la predicción: primero por goles (lo que el usuario puso en el partido);
 * si empate, acepta `winner_team_id` solo si es local o visita del partido oficial
 * (p. ej. penales en el pronóstico).
 */
export const predictedWinner = (p: PredMatch, m: ScoringMatchLike): string | null => {
  if (!m.home_team_id || !m.away_team_id) return null;
  const h = p.home_goals;
  const a = p.away_goals;
  if (h > a) return m.home_team_id;
  if (a > h) return m.away_team_id;
  if (h === a) {
    if (
      p.winner_team_id &&
      (p.winner_team_id === m.home_team_id || p.winner_team_id === m.away_team_id)
    ) {
      return p.winner_team_id;
    }
    return null;
  }
  return null;
};

export type OfficialHonorFromBracket = {
  champion_team_id: string | null;
  runner_up_team_id: string | null;
  third_place_team_id: string | null;
  fourth_place_team_id: string | null;
};

export const loserInMatch = (
  homeTeamId: string | null,
  awayTeamId: string | null,
  winnerTeamId: string | null,
): string | null => {
  if (!homeTeamId || !awayTeamId || !winnerTeamId) return null;
  if (winnerTeamId === homeTeamId) return awayTeamId;
  if (winnerTeamId === awayTeamId) return homeTeamId;
  return null;
};

/** Oficial: partidos 103/104 (goles) o, si aún no hay resultado, columnas de `real_results`. */
export const resolveOfficialHonor = (
  matches: MatchForHonorResolve[],
  real: {
    champion_team_id?: string | null;
    runner_up_team_id?: string | null;
    third_place_team_id?: string | null;
    fourth_place_team_id?: string | null;
  } | null,
): OfficialHonorFromBracket => {
  const m104 = matches.find((x) => x.match_number === 104) ?? matches.find((x) => x.stage === 'final');
  const m103 = matches.find((x) => x.match_number === 103) ?? matches.find((x) => x.stage === 'third-place');

  let champion_team_id: string | null = null;
  let runner_up_team_id: string | null = null;
  if (m104?.home_team_id && m104.away_team_id) {
    if (m104.home_goals != null && m104.away_goals != null) {
      const w = actualWinnerFromMatch(m104);
      if (w) {
        champion_team_id = w;
        runner_up_team_id = loserInMatch(m104.home_team_id, m104.away_team_id, w);
      } else {
        champion_team_id = real?.champion_team_id ?? null;
        runner_up_team_id = real?.runner_up_team_id ?? null;
      }
    } else {
      champion_team_id = real?.champion_team_id ?? null;
      runner_up_team_id = real?.runner_up_team_id ?? null;
    }
  } else {
    champion_team_id = real?.champion_team_id ?? null;
    runner_up_team_id = real?.runner_up_team_id ?? null;
  }

  let third_place_team_id: string | null = null;
  let fourth_place_team_id: string | null = null;
  if (m103?.home_team_id && m103.away_team_id) {
    if (m103.home_goals != null && m103.away_goals != null) {
      const w = actualWinnerFromMatch(m103);
      if (w) {
        third_place_team_id = w;
        fourth_place_team_id = loserInMatch(m103.home_team_id, m103.away_team_id, w);
      } else {
        third_place_team_id = real?.third_place_team_id ?? null;
        fourth_place_team_id = real?.fourth_place_team_id ?? null;
      }
    } else {
      third_place_team_id = real?.third_place_team_id ?? null;
      fourth_place_team_id = real?.fourth_place_team_id ?? null;
    }
  } else {
    third_place_team_id = real?.third_place_team_id ?? null;
    fourth_place_team_id = real?.fourth_place_team_id ?? null;
  }

  return {
    champion_team_id,
    runner_up_team_id,
    third_place_team_id,
    fourth_place_team_id,
  };
};

export const scoreGroupMatches = (
  officialById: Map<string, MatchRow>,
  preds: PredMatch[],
): { groupMatchPoints: number; exactBonus: number } => {
  let groupMatchPoints = 0;
  let exactBonus = 0;

  for (const p of preds) {
    const m = officialById.get(p.match_id);
    if (!m || m.stage !== 'group') continue;
    if (m.home_goals == null || m.away_goals == null) continue;

    const oh = outcome(m.home_goals, m.away_goals);
    const ph = outcome(p.home_goals, p.away_goals);
    if (oh === ph) {
      groupMatchPoints += SCORING_RULES.groupMatch.correctOutcome;
      if (p.home_goals === m.home_goals && p.away_goals === m.away_goals) {
        exactBonus += SCORING_RULES.groupMatch.exactResult;
      }
    }
  }

  return { groupMatchPoints, exactBonus };
};

const tallyGroup = (groupId: GroupName, matches: MatchRow[]) => {
  const stats: Record<string, { gf: number; ga: number; pts: number; mp: number }> = {};

  const add = (tid: string | null, gf: number, ga: number, w: number, d: number) => {
    if (!tid) return;
    if (!stats[tid]) stats[tid] = { gf: 0, ga: 0, pts: 0, mp: 0 };
    stats[tid].gf += gf;
    stats[tid].ga += ga;
    stats[tid].pts += w * 3 + d;
    stats[tid].mp += 1;
  };

  for (const m of matches) {
    if (m.group_id !== groupId) continue;
    if (m.home_goals == null || m.away_goals == null) continue;
    const h = m.home_goals;
    const a = m.away_goals;
    if (h > a) {
      add(m.home_team_id, h, a, 1, 0);
      add(m.away_team_id, a, h, 0, 0);
    } else if (a > h) {
      add(m.away_team_id, a, h, 1, 0);
      add(m.home_team_id, h, a, 0, 0);
    } else {
      add(m.home_team_id, h, a, 0, 1);
      add(m.away_team_id, a, h, 0, 1);
    }
  }

  return stats;
};

const sortTeamsByTable = (
  stats: Record<string, { gf: number; ga: number; pts: number; mp: number }>,
  groupMatches: MatchRow[],
  groupId: GroupName,
): string[] => {
  const matchScores: {
    homeTeamId: string;
    awayTeamId: string;
    homeGoals: number;
    awayGoals: number;
  }[] = [];
  for (const m of groupMatches) {
    if (m.group_id !== groupId) continue;
    if (m.home_goals == null || m.away_goals == null || !m.home_team_id || !m.away_team_id) {
      continue;
    }
    matchScores.push({
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      homeGoals: m.home_goals,
      awayGoals: m.away_goals,
    });
  }
  const overallRows = Object.keys(stats).map((teamId) => ({
    teamId,
    points: stats[teamId].pts,
    goalsFor: stats[teamId].gf,
    goalsAgainst: stats[teamId].ga,
  }));
  return orderGroupStandings(overallRows, matchScores).order;
};

export const computeActualGroupPositions = (
  groupMatches: MatchRow[],
): Map<GroupName, Map<string, number>> => {
  const byGroup = new Map<GroupName, MatchRow[]>();
  for (const m of groupMatches) {
    if (m.stage !== 'group' || !m.group_id) continue;
    const g = m.group_id as GroupName;
    const arr = byGroup.get(g) ?? [];
    arr.push(m);
    byGroup.set(g, arr);
  }

  const result = new Map<GroupName, Map<string, number>>();

  for (const [gid, ms] of byGroup) {
    if (ms.filter((x) => x.home_goals != null && x.away_goals != null).length < 6) {
      continue;
    }
    const stats = tallyGroup(gid, ms);
    const order = sortTeamsByTable(stats, ms, gid);
    const pos = new Map<string, number>();
    order.forEach((tid, idx) => pos.set(tid, idx + 1));
    result.set(gid, pos);
  }

  return result;
};

export const scoreGroupPositions = (
  actual: Map<GroupName, Map<string, number>>,
  predictedRows: { group_id: string; team_id: string; position: number }[],
): number => {
  let pts = 0;
  const predicted = new Map<string, Map<string, number>>();
  for (const r of predictedRows) {
    const g = r.group_id as GroupName;
    if (!predicted.has(g)) predicted.set(g, new Map());
    predicted.get(g)!.set(r.team_id, r.position);
  }

  for (const [gid, actualPos] of actual) {
    const pred = predicted.get(gid);
    if (!pred) continue;
    for (const [teamId, pPos] of pred) {
      const aPos = actualPos.get(teamId);
      if (aPos != null && aPos === pPos) {
        pts += SCORING_RULES.groupPosition;
      }
    }
  }

  return pts;
};

const knockoutPointsForStage = (stage: string): number => {
  switch (stage) {
    case 'round-of-32':
      return SCORING_RULES.knockout.roundOf32;
    case 'round-of-16':
      return SCORING_RULES.knockout.roundOf16;
    case 'quarter-finals':
      return SCORING_RULES.knockout.quarterFinals;
    case 'semi-finals':
      return SCORING_RULES.knockout.semiFinals;
    case 'final':
      return SCORING_RULES.knockout.finalists;
    case 'third-place':
      return SCORING_RULES.knockout.semiFinals;
    default:
      return 0;
  }
};

export const scoreKnockoutRounds = (
  officialById: Map<string, MatchRow>,
  preds: PredMatch[],
): {
  r32: number;
  r16: number;
  qf: number;
  sf: number;
  fin: number;
} => {
  const acc = { r32: 0, r16: 0, qf: 0, sf: 0, fin: 0 };

  for (const p of preds) {
    const m = officialById.get(p.match_id);
    if (!m || m.stage === 'group') continue;
    if (m.home_goals == null || m.away_goals == null) continue;

    const aw = actualWinnerFromMatch(m);
    const pw = predictedWinner(p, m);
    if (!aw || !pw) continue;
    if (aw !== pw) continue;

    const per = knockoutPointsForStage(m.stage);
    if (m.stage === 'round-of-32') acc.r32 += per;
    else if (m.stage === 'round-of-16') acc.r16 += per;
    else if (m.stage === 'quarter-finals') acc.qf += per;
    else if (m.stage === 'semi-finals') acc.sf += per;
    else if (m.stage === 'final' || m.stage === 'third-place') acc.fin += per;
  }

  return acc;
};

export const scoreSpecialStrings = (
  predTop: string,
  predBest: string,
  real: RealResultsRow | null,
): { top: number; best: number } => {
  if (!real) return { top: 0, best: 0 };
  let top = 0;
  let best = 0;
  if (
    real.top_scorer &&
    normalizeSpecialPredictionPlayerName(predTop) ===
      normalizeSpecialPredictionPlayerName(real.top_scorer)
  ) {
    top = SCORING_RULES.honorBoard.topScorer;
  }
  if (
    real.best_player &&
    normalizeSpecialPredictionPlayerName(predBest) ===
      normalizeSpecialPredictionPlayerName(real.best_player)
  ) {
    best = SCORING_RULES.honorBoard.bestPlayer;
  }
  return { top, best };
};

export const scoreHonorFromBracket = (
  preds: PredMatch[],
  officialById: Map<string, MatchRow>,
  real: RealResultsRow | null,
): {
  champion: number;
  runnerUp: number;
  third: number;
  fourth: number;
} => {
  const empty = { champion: 0, runnerUp: 0, third: 0, fourth: 0 };
  const matches = [...officialById.values()];
  const honor = resolveOfficialHonor(matches, real);

  const finalM = matches.find((m) => m.match_number === 104) ?? matches.find((m) => m.stage === 'final');
  const thirdM = matches.find((m) => m.match_number === 103) ?? matches.find((m) => m.stage === 'third-place');
  if (!finalM?.id) return empty;

  const predFinal = preds.find((p) => p.match_id === finalM.id);
  const predThird = thirdM?.id ? preds.find((p) => p.match_id === thirdM.id) : undefined;

  const predictedHonorPair = (
    pred: PredMatch | undefined,
    official: MatchRow | undefined,
  ): { first: string | null; second: string | null } => {
    if (!pred) return { first: null, second: null };
    const homeTeamId = pred.pred_home_team_id ?? official?.home_team_id ?? null;
    const awayTeamId = pred.pred_away_team_id ?? official?.away_team_id ?? null;
    if (!homeTeamId || !awayTeamId) return { first: null, second: null };

    const first = predictedWinner(pred, {
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      home_goals: null,
      away_goals: null,
      winner_team_id: null,
    });
    if (!first) return { first: null, second: null };
    const second = loserInMatch(homeTeamId, awayTeamId, first);
    return { first, second };
  };

  const predictedFinal = predictedHonorPair(predFinal, finalM);
  const predictedThird = predictedHonorPair(predThird, thirdM);

  let champion = 0;
  if (
    honor.champion_team_id &&
    predictedFinal.first &&
    honor.champion_team_id === predictedFinal.first
  ) {
    champion = SCORING_RULES.honorBoard.champion;
  }

  let runnerUp = 0;
  if (
    honor.runner_up_team_id &&
    predictedFinal.second &&
    predictedFinal.second === honor.runner_up_team_id
  ) {
    runnerUp = SCORING_RULES.honorBoard.runnerUp;
  }

  let third = 0;
  if (
    honor.third_place_team_id &&
    predictedThird.first &&
    predictedThird.first === honor.third_place_team_id
  ) {
    third = SCORING_RULES.honorBoard.thirdPlace;
  }

  let fourth = 0;
  if (
    honor.fourth_place_team_id &&
    predictedThird.second &&
    predictedThird.second === honor.fourth_place_team_id
  ) {
    fourth = SCORING_RULES.honorBoard.fourthPlace;
  }

  return { champion, runnerUp, third, fourth };
};

export const buildMatchMap = (matches: MatchRow[]): Map<string, MatchRow> => {
  const map = new Map<string, MatchRow>();
  for (const m of matches) map.set(m.id, m);
  return map;
};
