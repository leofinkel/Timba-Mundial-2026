import 'server-only';

import { SCORING_RULES } from '@/constants/scoring';
import { actualWinnerFromMatch, predictedWinner } from '@/lib/scoring/computeUserScore';
import { normalizeSpecialPredictionPlayerName } from '@/lib/scoring/normalizeSpecialPredictionPlayerName';
import { createServiceLogger } from '@/lib/logger';
import { createServerClient } from '@/lib/supabase/server';
import type { UserScoreBreakdown } from '@/types/scoring';

const log = createServiceLogger('scoringService');

type MatchRow = {
  id: string;
  match_number: number;
  stage: string;
  group_id: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_goals: number | null;
  away_goals: number | null;
  winner_team_id: string | null;
};

type PredMatchRow = {
  match_id: string;
  home_goals: number;
  away_goals: number;
  winner_team_id: string | null;
  pred_home_team_id: string | null;
  pred_away_team_id: string | null;
};

type StandingRow = { group_id: string; team_id: string; position: number };

type SpecialRow = { top_scorer: string; best_player: string };

/** Solo goleador / figura en `real_results`. Campeón, podio, 4.º: partidos 103 y 104. */
type RealResultsRow = {
  top_scorer: string | null;
  best_player: string | null;
};

type OfficialHonor = {
  champion_team_id: string;
  runner_up_team_id: string;
  third_place_team_id: string;
  fourth_place_team_id: string;
};

const loserOfOfficialMatch = (
  home: string | null,
  away: string | null,
  winner: string | null,
): string | null => {
  if (!home || !away || !winner) return null;
  if (winner === home) return away;
  if (winner === away) return home;
  return null;
};

/** Partido 104 = final, 103 = 3.º/4.º; si faltan números, se usa el único partido por stage. */
const deriveOfficialHonorFromMatches = (matches: MatchRow[]): OfficialHonor | null => {
  const m104 = matches.find((m) => m.match_number === 104) ?? matches.find((m) => m.stage === 'final');
  const m103 = matches.find((m) => m.match_number === 103) ?? matches.find((m) => m.stage === 'third-place');
  if (!m104 || !m103) return null;
  if (!m104.home_team_id || !m104.away_team_id || !m103.home_team_id || !m103.away_team_id) {
    return null;
  }
  const w104 = actualWinnerFromMatch(m104);
  const w103 = actualWinnerFromMatch(m103);
  if (!w104 || !w103) return null;
  const ru = loserOfOfficialMatch(
    m104.home_team_id,
    m104.away_team_id,
    w104,
  );
  const fourth = loserOfOfficialMatch(
    m103.home_team_id,
    m103.away_team_id,
    w103,
  );
  if (!ru || !fourth) return null;
  return {
    champion_team_id: w104,
    runner_up_team_id: ru,
    third_place_team_id: w103,
    fourth_place_team_id: fourth,
  };
};

type MutableBreakdown = {
  groupMatchPoints: number;
  exactResultBonus: number;
  groupPositionPoints: number;
  roundOf32Points: number;
  roundOf16Points: number;
  quarterFinalPoints: number;
  semiFinalPoints: number;
  finalistPoints: number;
  championPoints: number;
  runnerUpPoints: number;
  thirdPlacePoints: number;
  fourthPlacePoints: number;
  topScorerPoints: number;
  bestPlayerPoints: number;
};

type KnockoutBreakdownKey =
  | 'roundOf32Points'
  | 'roundOf16Points'
  | 'quarterFinalPoints'
  | 'semiFinalPoints'
  | 'finalistPoints';

const emptyBreakdown = (): MutableBreakdown => ({
  groupMatchPoints: 0,
  exactResultBonus: 0,
  groupPositionPoints: 0,
  roundOf32Points: 0,
  roundOf16Points: 0,
  quarterFinalPoints: 0,
  semiFinalPoints: 0,
  finalistPoints: 0,
  championPoints: 0,
  runnerUpPoints: 0,
  thirdPlacePoints: 0,
  fourthPlacePoints: 0,
  topScorerPoints: 0,
  bestPlayerPoints: 0,
});

const outcomeSide = (hg: number, ag: number): 'home' | 'away' | 'draw' =>
  hg > ag ? 'home' : hg < ag ? 'away' : 'draw';

const knockoutBucket = (stage: string): KnockoutBreakdownKey | null => {
  switch (stage) {
    case 'round-of-32':
      return 'roundOf32Points';
    case 'round-of-16':
      return 'roundOf16Points';
    case 'quarter-finals':
      return 'quarterFinalPoints';
    case 'semi-finals':
      return 'semiFinalPoints';
    case 'final':
      return 'finalistPoints';
    default:
      return null;
  }
};

const knockoutUnitPoints = (stage: string): number => {
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
    default:
      return 0;
  }
};

const stageTeamsFromPrediction = (
  predMatches: PredMatchRow[],
  matches: MatchRow[],
  stage: string,
): Set<string> => {
  const matchIdSet = new Set(
    matches.filter((m) => m.stage === stage).map((m) => m.id),
  );
  const teams = new Set<string>();
  for (const pm of predMatches) {
    if (!matchIdSet.has(pm.match_id)) continue;
    if (pm.pred_home_team_id) teams.add(pm.pred_home_team_id);
    if (pm.pred_away_team_id) teams.add(pm.pred_away_team_id);
  }
  return teams;
};

const stageTeamsFromOfficial = (matches: MatchRow[], stage: string): Set<string> => {
  const teams = new Set<string>();
  for (const m of matches) {
    if (m.stage !== stage) continue;
    if (m.home_team_id) teams.add(m.home_team_id);
    if (m.away_team_id) teams.add(m.away_team_id);
  }
  return teams;
};

const scoreKnockoutQualifiedTeams = (
  predMatches: PredMatchRow[],
  matches: MatchRow[],
): Pick<
  MutableBreakdown,
  | 'roundOf32Points'
  | 'roundOf16Points'
  | 'quarterFinalPoints'
  | 'semiFinalPoints'
  | 'finalistPoints'
> => {
  const stages = [
    'round-of-32',
    'round-of-16',
    'quarter-finals',
    'semi-finals',
    'final',
  ] as const;

  const out = {
    roundOf32Points: 0,
    roundOf16Points: 0,
    quarterFinalPoints: 0,
    semiFinalPoints: 0,
    finalistPoints: 0,
  };

  for (const stage of stages) {
    const bucket = knockoutBucket(stage);
    const unitPoints = knockoutUnitPoints(stage);
    if (!bucket || unitPoints <= 0) continue;

    const predicted = stageTeamsFromPrediction(predMatches, matches, stage);
    const actual = stageTeamsFromOfficial(matches, stage);

    let hits = 0;
    for (const teamId of predicted) {
      if (actual.has(teamId)) hits += 1;
    }
    out[bucket] = hits * unitPoints;
  }

  return out;
};

/** Final 1–4 per group from group_standings; only groups with exactly 4 rows count. */
const buildFinalGroupPositions = (
  rows: { group_id: string; team_id: string; position: number }[],
): Map<string, Map<string, number>> => {
  const byGroup = new Map<string, { team_id: string; position: number }[]>();
  for (const r of rows) {
    const arr = byGroup.get(r.group_id) ?? [];
    arr.push({ team_id: r.team_id, position: r.position });
    byGroup.set(r.group_id, arr);
  }
  const out = new Map<string, Map<string, number>>();
  for (const [gid, arr] of byGroup) {
    if (arr.length !== 4) continue;
    const m = new Map<string, number>();
    for (const row of arr) {
      m.set(row.team_id, row.position);
    }
    out.set(gid, m);
  }
  return out;
};

/** Group position points only when every group-stage match in that group has a result. */
const groupHasAllGroupMatchesPlayed = (matches: MatchRow[], groupId: string): boolean => {
  const inGroup = matches.filter((m) => m.stage === 'group' && m.group_id === groupId);
  if (inGroup.length === 0) return false;
  return inGroup.every(
    (m) => m.home_goals != null && m.away_goals != null,
  );
};

const filterGroupPositionsByCompleteGroups = (
  groupPositions: Map<string, Map<string, number>>,
  matches: MatchRow[],
): Map<string, Map<string, number>> => {
  const out = new Map<string, Map<string, number>>();
  for (const [gid, posMap] of groupPositions) {
    if (groupHasAllGroupMatchesPlayed(matches, gid)) {
      out.set(gid, posMap);
    }
  }
  return out;
};

const computeForPrediction = (params: {
  userId: string;
  predMatches: PredMatchRow[];
  standings: StandingRow[];
  specials: SpecialRow | null;
  matches: MatchRow[];
  real: RealResultsRow | null;
  finalGroupPositions: Map<string, Map<string, number>>;
}): MutableBreakdown => {
  const b = emptyBreakdown();
  const matchById = new Map(params.matches.map((m) => [m.id, m]));

  for (const pm of params.predMatches) {
    const m = matchById.get(pm.match_id);
    if (!m || m.home_goals === null || m.away_goals === null) {
      continue;
    }

    if (m.stage === 'group') {
      const oPred = outcomeSide(pm.home_goals, pm.away_goals);
      const oAct = outcomeSide(m.home_goals, m.away_goals);
      if (oPred === oAct) {
        b.groupMatchPoints += SCORING_RULES.groupMatch.correctOutcome;
      }
      if (
        pm.home_goals === m.home_goals &&
        pm.away_goals === m.away_goals
      ) {
        b.exactResultBonus += SCORING_RULES.groupMatch.exactResult;
      }
      continue;
    }

  }

  const knockoutByQualifiedTeams = scoreKnockoutQualifiedTeams(
    params.predMatches,
    params.matches,
  );
  b.roundOf32Points = knockoutByQualifiedTeams.roundOf32Points;
  b.roundOf16Points = knockoutByQualifiedTeams.roundOf16Points;
  b.quarterFinalPoints = knockoutByQualifiedTeams.quarterFinalPoints;
  b.semiFinalPoints = knockoutByQualifiedTeams.semiFinalPoints;
  b.finalistPoints = knockoutByQualifiedTeams.finalistPoints;

  for (const [gid, actualPosByTeam] of params.finalGroupPositions) {
    const predicted = params.standings.filter((s) => s.group_id === gid);
    for (const s of predicted) {
      const aPos = actualPosByTeam.get(s.team_id);
      if (aPos != null && aPos === s.position) {
        b.groupPositionPoints += SCORING_RULES.groupPosition;
      }
    }
  }

  const final =
    params.matches.find((m) => m.match_number === 104) ??
    params.matches.find((m) => m.stage === 'final');
  const third =
    params.matches.find((m) => m.match_number === 103) ??
    params.matches.find((m) => m.stage === 'third-place');
  const finalPred = final
    ? params.predMatches.find((p) => p.match_id === final.id)
    : undefined;
  const thirdPred = third
    ? params.predMatches.find((p) => p.match_id === third.id)
    : undefined;
  const honor = deriveOfficialHonorFromMatches(params.matches);
  const rr = params.real;

  if (honor && finalPred && final) {
    const predChamp = predictedWinner(finalPred, final);
    if (predChamp && predChamp === honor.champion_team_id) {
      b.championPoints += SCORING_RULES.honorBoard.champion;
    }
  }

  if (honor && final && final.home_team_id && final.away_team_id && finalPred) {
    const predWin = predictedWinner(finalPred, final);
    if (predWin) {
      const other =
        predWin === final.home_team_id ? final.away_team_id : final.home_team_id;
      if (other === honor.runner_up_team_id) {
        b.runnerUpPoints += SCORING_RULES.honorBoard.runnerUp;
      }
    }
  }

  if (honor && thirdPred && third) {
    const predThirdW = predictedWinner(thirdPred, third);
    if (predThirdW && predThirdW === honor.third_place_team_id) {
      b.thirdPlacePoints += SCORING_RULES.honorBoard.thirdPlace;
    }
  }

  if (honor && third && third.home_team_id && third.away_team_id && thirdPred) {
    const predWin = predictedWinner(thirdPred, third);
    if (predWin) {
      const predLoser = loserOfOfficialMatch(
        third.home_team_id,
        third.away_team_id,
        predWin,
      );
      if (predLoser && predLoser === honor.fourth_place_team_id) {
        b.fourthPlacePoints += SCORING_RULES.honorBoard.fourthPlace;
      }
    }
  }

  if (params.specials && rr) {
    if (
      rr.top_scorer &&
      normalizeSpecialPredictionPlayerName(params.specials.top_scorer) ===
        normalizeSpecialPredictionPlayerName(rr.top_scorer)
    ) {
      b.topScorerPoints += SCORING_RULES.honorBoard.topScorer;
    }
    if (
      rr.best_player &&
      normalizeSpecialPredictionPlayerName(params.specials.best_player) ===
        normalizeSpecialPredictionPlayerName(rr.best_player)
    ) {
      b.bestPlayerPoints += SCORING_RULES.honorBoard.bestPlayer;
    }
  }

  return b;
};

const totalFromBreakdown = (b: MutableBreakdown): number =>
  b.groupMatchPoints +
  b.exactResultBonus +
  b.groupPositionPoints +
  b.roundOf32Points +
  b.roundOf16Points +
  b.quarterFinalPoints +
  b.semiFinalPoints +
  b.finalistPoints +
  b.championPoints +
  b.runnerUpPoints +
  b.thirdPlacePoints +
  b.fourthPlacePoints +
  b.topScorerPoints +
  b.bestPlayerPoints;

const persistUserScore = async (
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  b: MutableBreakdown,
) => {
  const total = totalFromBreakdown(b);
  const { error } = await supabase.from('user_scores').upsert(
    {
      user_id: userId,
      group_match_points: b.groupMatchPoints,
      exact_result_bonus: b.exactResultBonus,
      group_position_points: b.groupPositionPoints,
      round_of_32_points: b.roundOf32Points,
      round_of_16_points: b.roundOf16Points,
      quarter_final_points: b.quarterFinalPoints,
      semi_final_points: b.semiFinalPoints,
      finalist_points: b.finalistPoints,
      champion_points: b.championPoints,
      runner_up_points: b.runnerUpPoints,
      third_place_points: b.thirdPlacePoints,
      fourth_place_points: b.fourthPlacePoints,
      top_scorer_points: b.topScorerPoints,
      best_player_points: b.bestPlayerPoints,
      total_points: total,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    log.error({ err: error, userId }, 'persistUserScore failed');
    throw new Error(error.message);
  }
};

const recomputeRanks = async (
  supabase: Awaited<ReturnType<typeof createServerClient>>,
) => {
  const { data: rows, error } = await supabase
    .from('user_scores')
    .select('id, total_points')
    .order('total_points', { ascending: false });

  if (error) {
    log.error({ err: error }, 'recomputeRanks load failed');
    throw new Error(error.message);
  }

  let rank = 1;
  for (const row of rows ?? []) {
    const { error: upErr } = await supabase
      .from('user_scores')
      .update({ rank })
      .eq('id', row.id);
    if (upErr) {
      log.error({ err: upErr, id: row.id }, 'recomputeRanks update failed');
      throw new Error(upErr.message);
    }
    rank += 1;
  }
};

export const calculateAllScores = async (): Promise<{
  updatedUsers: number;
}> => {
  try {
    const supabase = await createServerClient();

    const { data: preds, error: pe } = await supabase
      .from('predictions')
      .select('id, user_id');

    if (pe) {
      log.error({ err: pe }, 'calculateAllScores predictions failed');
      throw new Error(pe.message);
    }

    const { data: matches, error: me } = await supabase
      .from('matches')
      .select(
        'id, match_number, stage, group_id, home_team_id, away_team_id, home_goals, away_goals, winner_team_id',
      );

    if (me) {
      log.error({ err: me }, 'calculateAllScores matches failed');
      throw new Error(me.message);
    }

    const { data: real, error: re } = await supabase
      .from('real_results')
      .select('top_scorer, best_player')
      .limit(1)
      .maybeSingle();

    if (re) {
      log.error({ err: re }, 'calculateAllScores real_results failed');
      throw new Error(re.message);
    }

    const predictionIds = (preds ?? []).map((p) => p.id);
    if (predictionIds.length === 0) {
      log.info('calculateAllScores: no predictions');
      return { updatedUsers: 0 };
    }

    const { data: allPm, error: pme } = await supabase
      .from('prediction_matches')
      .select(
        'prediction_id, match_id, home_goals, away_goals, winner_team_id, pred_home_team_id, pred_away_team_id',
      )
      .in('prediction_id', predictionIds);

    if (pme) {
      log.error({ err: pme }, 'calculateAllScores prediction_matches failed');
      throw new Error(pme.message);
    }

    const { data: allGs, error: gse } = await supabase
      .from('prediction_group_standings')
      .select('prediction_id, group_id, team_id, position')
      .in('prediction_id', predictionIds);

    if (gse) {
      log.error({ err: gse }, 'calculateAllScores standings failed');
      throw new Error(gse.message);
    }

    const { data: allSp, error: spe } = await supabase
      .from('prediction_specials')
      .select('prediction_id, top_scorer, best_player')
      .in('prediction_id', predictionIds);

    if (spe) {
      log.error({ err: spe }, 'calculateAllScores specials failed');
      throw new Error(spe.message);
    }

    const pmByPred = new Map<string, PredMatchRow[]>();
    for (const row of allPm ?? []) {
      const list = pmByPred.get(row.prediction_id) ?? [];
      list.push({
        match_id: row.match_id,
        home_goals: row.home_goals,
        away_goals: row.away_goals,
        winner_team_id: row.winner_team_id,
        pred_home_team_id: row.pred_home_team_id,
        pred_away_team_id: row.pred_away_team_id,
      });
      pmByPred.set(row.prediction_id, list);
    }

    const gsByPred = new Map<string, StandingRow[]>();
    for (const row of allGs ?? []) {
      const list = gsByPred.get(row.prediction_id) ?? [];
      list.push({
        group_id: row.group_id,
        team_id: row.team_id,
        position: row.position,
      });
      gsByPred.set(row.prediction_id, list);
    }

    const spByPred = new Map<string, SpecialRow>();
    for (const row of allSp ?? []) {
      spByPred.set(row.prediction_id, {
        top_scorer: row.top_scorer,
        best_player: row.best_player,
      });
    }

    const matchRows = (matches ?? []) as MatchRow[];
    const { data: groupStandingsRows, error: gserr } = await supabase
      .from('group_standings')
      .select('group_id, team_id, position');

    if (gserr) {
      log.error({ err: gserr }, 'calculateAllScores group_standings failed');
      throw new Error(gserr.message);
    }

    const finalGroupPositions = filterGroupPositionsByCompleteGroups(
      buildFinalGroupPositions(groupStandingsRows ?? []),
      matchRows,
    );

    let updated = 0;
    for (const p of preds ?? []) {
      const b = computeForPrediction({
        userId: p.user_id,
        predMatches: pmByPred.get(p.id) ?? [],
        standings: gsByPred.get(p.id) ?? [],
        specials: spByPred.get(p.id) ?? null,
        matches: matchRows,
        real: (real as RealResultsRow | null) ?? null,
        finalGroupPositions,
      });

      await persistUserScore(supabase, p.user_id, b);
      updated += 1;
    }

    await recomputeRanks(supabase);
    log.info({ updatedUsers: updated }, 'calculateAllScores completed');
    return { updatedUsers: updated };
  } catch (err) {
    log.error({ err }, 'calculateAllScores failed');
    throw err instanceof Error ? err : new Error('calculateAllScores failed');
  }
};

export const calculateUserScore = async (
  userId: string,
): Promise<UserScoreBreakdown> => {
  try {
    const supabase = await createServerClient();

    const { data: pred, error: pe } = await supabase
      .from('predictions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (pe) {
      log.error({ err: pe, userId }, 'calculateUserScore prediction query failed');
      throw new Error(pe.message);
    }

    if (!pred) {
      throw new Error('No prediction found for user');
    }

    const { data: matches, error: me } = await supabase
      .from('matches')
      .select(
        'id, match_number, stage, group_id, home_team_id, away_team_id, home_goals, away_goals, winner_team_id',
      );

    if (me) {
      throw new Error(me.message);
    }

    const { data: real, error: re } = await supabase
      .from('real_results')
      .select('top_scorer, best_player')
      .limit(1)
      .maybeSingle();

    if (re) {
      throw new Error(re.message);
    }

    const { data: pm, error: pme } = await supabase
      .from('prediction_matches')
      .select(
        'match_id, home_goals, away_goals, winner_team_id, pred_home_team_id, pred_away_team_id',
      )
      .eq('prediction_id', pred.id);

    if (pme) {
      throw new Error(pme.message);
    }

    const { data: gs, error: gse } = await supabase
      .from('prediction_group_standings')
      .select('group_id, team_id, position')
      .eq('prediction_id', pred.id);

    if (gse) {
      throw new Error(gse.message);
    }

    const { data: sp, error: spe } = await supabase
      .from('prediction_specials')
      .select('top_scorer, best_player')
      .eq('prediction_id', pred.id)
      .maybeSingle();

    if (spe) {
      throw new Error(spe.message);
    }

    const matchRows = (matches ?? []) as MatchRow[];
    const { data: groupStandingsRows, error: gserr } = await supabase
      .from('group_standings')
      .select('group_id, team_id, position');

    if (gserr) {
      throw new Error(gserr.message);
    }

    const finalGroupPositions = filterGroupPositionsByCompleteGroups(
      buildFinalGroupPositions(groupStandingsRows ?? []),
      matchRows,
    );

    const b = computeForPrediction({
      userId,
      predMatches: (pm ?? []) as PredMatchRow[],
      standings: gs ?? [],
      specials: sp,
      matches: matchRows,
      real: (real as RealResultsRow | null) ?? null,
      finalGroupPositions,
    });

    await persistUserScore(supabase, userId, b);
    await recomputeRanks(supabase);

    const total = totalFromBreakdown(b);
    log.info({ userId, total }, 'calculateUserScore completed');

    const { data: row, error: se } = await supabase
      .from('user_scores')
      .select(
        'rank, updated_at, group_match_points, exact_result_bonus, group_position_points, round_of_32_points, round_of_16_points, quarter_final_points, semi_final_points, finalist_points, champion_points, runner_up_points, third_place_points, fourth_place_points, top_scorer_points, best_player_points, total_points',
      )
      .eq('user_id', userId)
      .single();

    if (se || !row) {
      throw new Error(se?.message ?? 'Failed to reload score row');
    }

    return {
      userId,
      groupMatchPoints: row.group_match_points,
      exactResultBonus: row.exact_result_bonus,
      groupPositionPoints: row.group_position_points,
      roundOf32Points: row.round_of_32_points,
      roundOf16Points: row.round_of_16_points,
      quarterFinalPoints: row.quarter_final_points,
      semiFinalPoints: row.semi_final_points,
      finalistPoints: row.finalist_points,
      championPoints: row.champion_points,
      runnerUpPoints: row.runner_up_points,
      thirdPlacePoints: row.third_place_points,
      fourthPlacePoints: row.fourth_place_points,
      topScorerPoints: row.top_scorer_points,
      bestPlayerPoints: row.best_player_points,
      totalPoints: row.total_points,
      rank: row.rank,
      updatedAt: row.updated_at,
    };
  } catch (err) {
    log.error({ err, userId }, 'calculateUserScore failed');
    throw err instanceof Error ? err : new Error('calculateUserScore failed');
  }
};

export const getScoreBreakdown = async (
  userId: string,
): Promise<UserScoreBreakdown | null> => {
  try {
    const supabase = await createServerClient();
    const { data: row, error } = await supabase
      .from('user_scores')
      .select(
        'rank, updated_at, group_match_points, exact_result_bonus, group_position_points, round_of_32_points, round_of_16_points, quarter_final_points, semi_final_points, finalist_points, champion_points, runner_up_points, third_place_points, fourth_place_points, top_scorer_points, best_player_points, total_points',
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      log.error({ err: error, userId }, 'getScoreBreakdown query failed');
      throw new Error(error.message);
    }

    if (!row) {
      return null;
    }

    return {
      userId,
      groupMatchPoints: row.group_match_points,
      exactResultBonus: row.exact_result_bonus,
      groupPositionPoints: row.group_position_points,
      roundOf32Points: row.round_of_32_points,
      roundOf16Points: row.round_of_16_points,
      quarterFinalPoints: row.quarter_final_points,
      semiFinalPoints: row.semi_final_points,
      finalistPoints: row.finalist_points,
      championPoints: row.champion_points,
      runnerUpPoints: row.runner_up_points,
      thirdPlacePoints: row.third_place_points,
      fourthPlacePoints: row.fourth_place_points,
      topScorerPoints: row.top_scorer_points,
      bestPlayerPoints: row.best_player_points,
      totalPoints: row.total_points,
      rank: row.rank,
      updatedAt: row.updated_at,
    };
  } catch (err) {
    log.error({ err, userId }, 'getScoreBreakdown failed');
    throw err instanceof Error ? err : new Error('getScoreBreakdown failed');
  }
};
