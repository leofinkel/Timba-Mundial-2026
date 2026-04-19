import 'server-only';

import { SCORING_RULES } from '@/constants/scoring';
import { GROUP_NAMES } from '@/constants/tournament';
import { orderGroupStandings } from '@/lib/fixture/groupStandingsOrdering';
import { normalizeSpecialPredictionPlayerName } from '@/lib/scoring/normalizeSpecialPredictionPlayerName';
import { createServiceLogger } from '@/lib/logger';
import { createServerClient } from '@/lib/supabase/server';
import type { UserScoreBreakdown } from '@/types/scoring';

const log = createServiceLogger('scoringService');

type MatchRow = {
  id: string;
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
};

type StandingRow = { group_id: string; team_id: string; position: number };

type SpecialRow = { top_scorer: string; best_player: string };

type RealResultsRow = {
  top_scorer: string | null;
  best_player: string | null;
  champion_team_id: string | null;
  runner_up_team_id: string | null;
  third_place_team_id: string | null;
  fourth_place_team_id: string | null;
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

const knockoutBucket = (stage: string): keyof MutableBreakdown | null => {
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
    case 'third-place':
      return 'semiFinalPoints';
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
    case 'third-place':
      return SCORING_RULES.knockout.semiFinals;
    default:
      return 0;
  }
};

type TeamAcc = {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  pts: number;
};

const bumpTable = (
  table: Map<string, TeamAcc>,
  homeId: string,
  awayId: string,
  hg: number,
  ag: number,
) => {
  const home =
    table.get(homeId) ??
    ({
      teamId: homeId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      pts: 0,
    } satisfies TeamAcc);
  const away =
    table.get(awayId) ??
    ({
      teamId: awayId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      pts: 0,
    } satisfies TeamAcc);

  home.played += 1;
  away.played += 1;
  home.gf += hg;
  home.ga += ag;
  away.gf += ag;
  away.ga += hg;

  if (hg > ag) {
    home.won += 1;
    away.lost += 1;
    home.pts += 3;
  } else if (hg < ag) {
    away.won += 1;
    home.lost += 1;
    away.pts += 3;
  } else {
    home.drawn += 1;
    away.drawn += 1;
    home.pts += 1;
    away.pts += 1;
  }

  table.set(homeId, home);
  table.set(awayId, away);
};

const standingsOrderForGroup = (
  groupId: string,
  matches: MatchRow[],
): string[] => {
  const table = new Map<string, TeamAcc>();
  const groupMatchScores: {
    homeTeamId: string;
    awayTeamId: string;
    homeGoals: number;
    awayGoals: number;
  }[] = [];

  for (const m of matches) {
    if (m.stage !== 'group' || m.group_id !== groupId) {
      continue;
    }
    if (
      m.home_goals === null ||
      m.away_goals === null ||
      !m.home_team_id ||
      !m.away_team_id
    ) {
      continue;
    }
    bumpTable(table, m.home_team_id, m.away_team_id, m.home_goals, m.away_goals);
    groupMatchScores.push({
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      homeGoals: m.home_goals,
      awayGoals: m.away_goals,
    });
  }

  const overallRows = [...table.values()].map((r) => ({
    teamId: r.teamId,
    points: r.pts,
    goalsFor: r.gf,
    goalsAgainst: r.ga,
  }));

  return orderGroupStandings(overallRows, groupMatchScores).order;
};

const computeForPrediction = (params: {
  userId: string;
  predMatches: PredMatchRow[];
  standings: StandingRow[];
  specials: SpecialRow | null;
  matches: MatchRow[];
  real: RealResultsRow | null;
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

    const bucket = knockoutBucket(m.stage);
    const pts = knockoutUnitPoints(m.stage);
    if (
      bucket &&
      pts > 0 &&
      pm.winner_team_id &&
      m.winner_team_id &&
      pm.winner_team_id === m.winner_team_id
    ) {
      const k = bucket;
      b[k] += pts;
    }
  }

  for (const gid of GROUP_NAMES) {
    const actualOrder = standingsOrderForGroup(gid, params.matches);
    if (actualOrder.length === 0) {
      continue;
    }
    const predicted = params.standings.filter((s) => s.group_id === gid);
    for (const s of predicted) {
      const idx = s.position - 1;
      if (idx >= 0 && actualOrder[idx] === s.team_id) {
        b.groupPositionPoints += SCORING_RULES.groupPosition;
      }
    }
  }

  const final = params.matches.find((m) => m.stage === 'final');
  const third = params.matches.find((m) => m.stage === 'third-place');
  const finalPred = final
    ? params.predMatches.find((p) => p.match_id === final.id)
    : undefined;
  const thirdPred = third
    ? params.predMatches.find((p) => p.match_id === third.id)
    : undefined;
  const rr = params.real;

  if (rr?.champion_team_id && finalPred?.winner_team_id) {
    if (finalPred.winner_team_id === rr.champion_team_id) {
      b.championPoints += SCORING_RULES.honorBoard.champion;
    }
  }

  if (
    rr?.runner_up_team_id &&
    final &&
    final.home_team_id &&
    final.away_team_id &&
    finalPred?.winner_team_id
  ) {
    const other =
      finalPred.winner_team_id === final.home_team_id
        ? final.away_team_id
        : finalPred.winner_team_id === final.away_team_id
          ? final.home_team_id
          : null;
    if (other && other === rr.runner_up_team_id) {
      b.runnerUpPoints += SCORING_RULES.honorBoard.runnerUp;
    }
  }

  if (rr?.third_place_team_id && thirdPred?.winner_team_id) {
    if (thirdPred.winner_team_id === rr.third_place_team_id) {
      b.thirdPlacePoints += SCORING_RULES.honorBoard.thirdPlace;
    }
  }

  if (
    rr?.fourth_place_team_id &&
    third &&
    third.home_team_id &&
    third.away_team_id &&
    thirdPred?.winner_team_id
  ) {
    const loser =
      thirdPred.winner_team_id === third.home_team_id
        ? third.away_team_id
        : thirdPred.winner_team_id === third.away_team_id
          ? third.home_team_id
          : null;
    if (loser && loser === rr.fourth_place_team_id) {
      b.fourthPlacePoints += SCORING_RULES.honorBoard.fourthPlace;
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
        'id, stage, group_id, home_team_id, away_team_id, home_goals, away_goals, winner_team_id',
      );

    if (me) {
      log.error({ err: me }, 'calculateAllScores matches failed');
      throw new Error(me.message);
    }

    const { data: real, error: re } = await supabase
      .from('real_results')
      .select(
        'top_scorer, best_player, champion_team_id, runner_up_team_id, third_place_team_id, fourth_place_team_id',
      )
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
      .select('prediction_id, match_id, home_goals, away_goals, winner_team_id')
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

    let updated = 0;
    for (const p of preds ?? []) {
      const b = computeForPrediction({
        userId: p.user_id,
        predMatches: pmByPred.get(p.id) ?? [],
        standings: gsByPred.get(p.id) ?? [],
        specials: spByPred.get(p.id) ?? null,
        matches: (matches ?? []) as MatchRow[],
        real: (real as RealResultsRow | null) ?? null,
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
        'id, stage, group_id, home_team_id, away_team_id, home_goals, away_goals, winner_team_id',
      );

    if (me) {
      throw new Error(me.message);
    }

    const { data: real, error: re } = await supabase
      .from('real_results')
      .select(
        'top_scorer, best_player, champion_team_id, runner_up_team_id, third_place_team_id, fourth_place_team_id',
      )
      .limit(1)
      .maybeSingle();

    if (re) {
      throw new Error(re.message);
    }

    const { data: pm, error: pme } = await supabase
      .from('prediction_matches')
      .select('match_id, home_goals, away_goals, winner_team_id')
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

    const b = computeForPrediction({
      userId,
      predMatches: (pm ?? []) as PredMatchRow[],
      standings: gs ?? [],
      specials: sp,
      matches: (matches ?? []) as MatchRow[],
      real: (real as RealResultsRow | null) ?? null,
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
