import 'server-only';

import { isViewOthersPredictionsWindowOpen, PREDICTION_DEADLINE } from '@/constants/tournament';
import type { GroupMatchScoresInput } from '@/lib/fixture/computeGroupStandingsFromPredictions';
import { buildCalculatedStandingsForPrediction } from '@/lib/fixture/buildCalculatedStandingsForPrediction';
import { isGroupStagePredictionComplete } from '@/lib/fixture/isGroupStagePredictionComplete';
import { honorPairFromWinnerAndOpponent } from '@/lib/knockout/honorMatchPrediction';
import { buildPredictionBestThirdQualifierRows } from '@/lib/knockout/buildPredictionBestThirdQualifierRows';
import { resolvePredictionKnockoutBracket } from '@/lib/knockout/resolvePredictionKnockoutBracket';
import { predictedWinner } from '@/lib/scoring/computeUserScore';
import { createServiceLogger } from '@/lib/logger';
import { createServerClient } from '@/lib/supabase/server';
import * as predictionRepository from '@/repositories/predictionRepository';
import * as profileRepository from '@/repositories/profileRepository';
import { getTournament } from '@/services/fixtureService';
import type {
  GetOtherUserPredictionForViewerResult,
  GroupMatchPrediction,
  KnockoutMatchPrediction,
  PredictionStatus,
  SavePredictionsPayload,
  SavePredictionsResult,
  UserPrediction,
  UserPredictionView,
} from '@/types/prediction';
import type { GroupName } from '@/types/tournament';

type SupabaseServer = Awaited<ReturnType<typeof createServerClient>>;

const log = createServiceLogger('predictionService');

const deadlinePassed = (): boolean =>
  Date.now() > new Date(PREDICTION_DEADLINE).getTime();

const buildStandingsMap = (
  rows: { group_id: string; team_id: string; position: number }[],
): Map<GroupName, string[]> => {
  const byGroup = new Map<GroupName, Map<number, string>>();
  for (const r of rows) {
    const g = r.group_id as GroupName;
    if (!byGroup.has(g)) byGroup.set(g, new Map());
    byGroup.get(g)!.set(r.position, r.team_id);
  }
  const result = new Map<GroupName, string[]>();
  for (const [g, posMap] of byGroup) {
    const order: string[] = [];
    for (let p = 1; p <= 4; p += 1) {
      const tid = posMap.get(p);
      if (tid) order.push(tid);
    }
    result.set(g, order);
  }
  return result;
};

const toUserPredictionView = (p: UserPrediction): UserPredictionView => ({
  ...p,
  predictedGroupStandings: Object.fromEntries(
    p.predictedGroupStandings,
  ) as UserPredictionView['predictedGroupStandings'],
});

const mapRowsToUserPrediction = async (
  supabase: SupabaseServer,
  userId: string,
  pred: predictionRepository.PredictionRow,
): Promise<UserPrediction> => {
  const joined = await predictionRepository.listPredictionMatchesWithMatches(
    supabase,
    pred.id,
  );

  const tournament = await getTournament();
  const groupMatchIds = new Set(
    tournament.groups.flatMap((g) => g.matches.map((m) => m.id)),
  );
  const matchNumberToId = new Map<number, string>(
    tournament.knockoutMatches.map((m) => [m.matchNumber, m.id]),
  );

  const groupPredictions: GroupMatchPrediction[] = [];
  const groupPredictionsById: GroupMatchScoresInput = {};
  const knockoutRowsByMatchId = new Map<
    string,
    {
      home_goals: number;
      away_goals: number;
      winner_team_id: string | null;
      pred_home_team_id?: string | null;
      pred_away_team_id?: string | null;
    }
  >();

  for (const row of joined) {
    const m = row.matches;
    if (!m) continue;
    if (m.stage === 'group') {
      groupPredictionsById[row.match_id] = {
        homeGoals: row.home_goals,
        awayGoals: row.away_goals,
      };
      groupPredictions.push({
        matchId: row.match_id,
        homeGoals: row.home_goals,
        awayGoals: row.away_goals,
      });
    } else {
      knockoutRowsByMatchId.set(row.match_id, row);
    }
  }

  const standingRows = await predictionRepository.listGroupStandingsRows(
    supabase,
    pred.id,
  );
  const standingsMap = buildStandingsMap(standingRows);
  const manualOrder = Object.fromEntries(standingsMap) as Partial<
    Record<GroupName, string[]>
  >;

  let resolvedKnockout:
    | ReturnType<typeof resolvePredictionKnockoutBracket>
    | null = null;
  if (isGroupStagePredictionComplete(tournament.groups, groupPredictionsById)) {
    const calculatedStandings = buildCalculatedStandingsForPrediction(
      tournament,
      groupPredictionsById,
      manualOrder,
    );
    resolvedKnockout = resolvePredictionKnockoutBracket({
      knockoutMatches: tournament.knockoutMatches,
      groupMatchIds,
      calculatedStandings,
      predictionMatchRows: [...knockoutRowsByMatchId.entries()].map(([matchId, row]) => ({
        match_id: matchId,
        home_goals: row.home_goals,
        away_goals: row.away_goals,
        winner_team_id: row.winner_team_id,
      })),
      matchNumberToId,
    });
  }

  const knockoutPredictions: KnockoutMatchPrediction[] = [];
  const knockoutRowsToHeal: Array<{
    matchId: string;
    homeGoals: number;
    awayGoals: number;
    winnerTeamId: string | null;
    predHomeTeamId: string | null;
    predAwayTeamId: string | null;
  }> = [];
  for (const m of tournament.knockoutMatches) {
    const row = knockoutRowsByMatchId.get(m.id);
    if (!row) continue;
    const resolvedHomeAway = resolvedKnockout?.homeAwayByMatchId.get(m.id);
    const resolvedHomeTeamId =
      resolvedHomeAway?.home?.trim() || row.pred_home_team_id?.trim() || '';
    const resolvedAwayTeamId =
      resolvedHomeAway?.away?.trim() || row.pred_away_team_id?.trim() || '';
    let resolvedWinnerId =
      resolvedKnockout?.winnerByMatchId.get(m.id) ?? row.winner_team_id ?? '';

    let honorFirstTeamId = '';
    let honorSecondTeamId = '';
    if ((m.matchNumber === 103 || m.matchNumber === 104) && resolvedHomeTeamId && resolvedAwayTeamId) {
      const pw = predictedWinner(
        {
          match_id: m.id,
          home_goals: row.home_goals,
          away_goals: row.away_goals,
          winner_team_id: row.winner_team_id,
        },
        {
          home_team_id: resolvedHomeTeamId,
          away_team_id: resolvedAwayTeamId,
          home_goals: null,
          away_goals: null,
          winner_team_id: null,
        },
      );
      if (pw) {
        resolvedWinnerId = pw;
        const pair = honorPairFromWinnerAndOpponent(
          resolvedHomeTeamId,
          resolvedAwayTeamId,
          pw,
        );
        honorFirstTeamId = pair.honorFirstTeamId;
        honorSecondTeamId = pair.honorSecondTeamId;
      } else {
        const rw = row.winner_team_id;
        if (rw && (rw === resolvedHomeTeamId || rw === resolvedAwayTeamId)) {
          resolvedWinnerId = rw;
          const pair = honorPairFromWinnerAndOpponent(
            resolvedHomeTeamId,
            resolvedAwayTeamId,
            rw,
          );
          honorFirstTeamId = pair.honorFirstTeamId;
          honorSecondTeamId = pair.honorSecondTeamId;
        }
      }
    }

    knockoutPredictions.push({
      matchId: m.id,
      homeTeamId: resolvedHomeTeamId,
      awayTeamId: resolvedAwayTeamId,
      homeGoals: row.home_goals,
      awayGoals: row.away_goals,
      winnerId: resolvedWinnerId,
      honorFirstTeamId,
      honorSecondTeamId,
    });

    if (
      resolvedKnockout &&
      (row.pred_home_team_id !== (resolvedHomeTeamId || null) ||
        row.pred_away_team_id !== (resolvedAwayTeamId || null) ||
        row.winner_team_id !== (resolvedWinnerId || null))
    ) {
      knockoutRowsToHeal.push({
        matchId: m.id,
        homeGoals: row.home_goals,
        awayGoals: row.away_goals,
        winnerTeamId: resolvedWinnerId || null,
        predHomeTeamId: resolvedHomeTeamId || null,
        predAwayTeamId: resolvedAwayTeamId || null,
      });
    }
  }

  if (knockoutRowsToHeal.length > 0) {
    for (const row of knockoutRowsToHeal) {
      await predictionRepository.upsertPredictionMatch(supabase, {
        prediction_id: pred.id,
        match_id: row.matchId,
        home_goals: row.homeGoals,
        away_goals: row.awayGoals,
        winner_team_id: row.winnerTeamId,
        pred_home_team_id: row.predHomeTeamId,
        pred_away_team_id: row.predAwayTeamId,
      });
    }
    log.info(
      { userId, predictionId: pred.id, healedMatches: knockoutRowsToHeal.length },
      'mapRowsToUserPrediction: healed knockout slots from group-stage recalculation',
    );
  }

  const specials = await predictionRepository.getPredictionSpecials(
    supabase,
    pred.id,
  );

  return {
    id: pred.id,
    userId,
    groupPredictions,
    knockoutPredictions,
    specialPredictions: {
      topScorer: specials?.top_scorer ?? '',
      bestPlayer: specials?.best_player ?? '',
    },
    predictedGroupStandings: standingsMap,
    isLocked: pred.is_locked,
    submittedAt: pred.submitted_at,
    updatedAt: pred.updated_at,
  };
};

export const getUserPrediction = async (
  userId: string,
): Promise<UserPrediction | null> => {
  try {
    const supabase = await createServerClient();
    const pred = await predictionRepository.getPredictionByUserId(supabase, userId);
    if (!pred) {
      log.debug({ userId }, 'getUserPrediction: none');
      return null;
    }
    const full = await mapRowsToUserPrediction(supabase, userId, pred);
    log.debug({ userId, predictionId: pred.id }, 'getUserPrediction');
    return full;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ userId, err: message }, 'getUserPrediction failed');
    throw new Error(`getUserPrediction failed: ${message}`);
  }
};

export const getOtherUserPredictionForViewer = async (
  viewerUserId: string,
  targetUserId: string,
): Promise<GetOtherUserPredictionForViewerResult> => {
  try {
    if (viewerUserId === targetUserId) {
      return {
        ok: false,
        code: 'same_user',
        message: 'Usá la página Fixture para ver tu propia planilla.',
      };
    }

    const supabase = await createServerClient();
    const paid = await profileRepository.isPaymentPaid(supabase, viewerUserId);
    if (!paid) {
      log.warn({ viewerUserId }, 'getOtherUserPredictionForViewer: viewer not paid');
      return {
        ok: false,
        code: 'not_paid',
        message: 'Solo los jugadores con entrada paga pueden ver pronósticos de otros.',
      };
    }

    if (!isViewOthersPredictionsWindowOpen()) {
      return {
        ok: false,
        code: 'too_early',
        message:
          'Podrás ver los pronósticos de otros jugadores a partir del 26 de mayo de 2026.',
      };
    }

    const raw = await getUserPrediction(targetUserId);
    const prediction = raw ? toUserPredictionView(raw) : null;
    log.debug(
      { viewerUserId, targetUserId, hasPrediction: !!prediction },
      'getOtherUserPredictionForViewer',
    );
    return { ok: true, prediction };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error(
      { viewerUserId, targetUserId, err: message },
      'getOtherUserPredictionForViewer failed',
    );
    throw new Error(`getOtherUserPredictionForViewer failed: ${message}`);
  }
};

export const getUserPredictionForAdmin = async (
  adminUserId: string,
  targetUserId: string,
): Promise<UserPredictionView | null> => {
  try {
    const supabase = await createServerClient();
    const isAdmin = await profileRepository.hasAdminRole(supabase, adminUserId);
    if (!isAdmin) {
      log.warn({ adminUserId }, 'getUserPredictionForAdmin: not admin');
      throw new Error('Forbidden');
    }
    const raw = await getUserPrediction(targetUserId);
    return raw ? toUserPredictionView(raw) : null;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ adminUserId, targetUserId, err: message }, 'getUserPredictionForAdmin failed');
    throw err instanceof Error ? err : new Error('getUserPredictionForAdmin failed');
  }
};

export const deleteUserPredictionForAdmin = async (
  adminUserId: string,
  targetUserId: string,
): Promise<{ deleted: boolean }> => {
  try {
    const supabase = await createServerClient();
    const admin = await profileRepository.hasAdminRole(supabase, adminUserId);
    if (!admin) {
      log.warn({ adminUserId }, 'deleteUserPredictionForAdmin: not admin');
      throw new Error('Forbidden');
    }
    const deleted = await predictionRepository.deletePredictionByUserId(
      supabase,
      targetUserId,
    );
    if (deleted) {
      log.info({ adminUserId, targetUserId }, 'deleteUserPredictionForAdmin');
    } else {
      log.warn({ adminUserId, targetUserId }, 'deleteUserPredictionForAdmin: no row');
    }
    return { deleted };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ adminUserId, targetUserId, err: message }, 'deleteUserPredictionForAdmin failed');
    throw err instanceof Error ? err : new Error('deleteUserPredictionForAdmin failed');
  }
};

export const savePredictions = async (
  userId: string,
  data: SavePredictionsPayload,
): Promise<SavePredictionsResult> => {
  try {
    const supabase = await createServerClient();

    const paid = await profileRepository.isPaymentPaid(supabase, userId);
    if (!paid) {
      log.warn({ userId }, 'savePredictions: not paid');
      return { success: false, error: 'User must be marked as paid' };
    }

    if (deadlinePassed()) {
      log.warn({ userId }, 'savePredictions: deadline passed');
      return { success: false, error: 'Prediction deadline has passed' };
    }

    const existing = await predictionRepository.getPredictionByUserId(
      supabase,
      userId,
    );
    if (existing?.is_locked) {
      return { success: false, error: 'Prediction is locked' };
    }

    const pred = await predictionRepository.upsertPredictionRow(supabase, userId);

    for (const g of data.groupPredictions) {
      const hg = g.homeGoals;
      const ag = g.awayGoals;
      if (
        hg !== null &&
        ag !== null &&
        Number.isFinite(hg) &&
        Number.isFinite(ag) &&
        hg >= 0 &&
        ag >= 0
      ) {
        await predictionRepository.upsertPredictionMatch(supabase, {
          prediction_id: pred.id,
          match_id: g.matchId,
          home_goals: hg,
          away_goals: ag,
          winner_team_id: null,
          pred_home_team_id: null,
          pred_away_team_id: null,
        });
      } else {
        await predictionRepository.deletePredictionMatch(supabase, pred.id, g.matchId);
      }
    }

    if (data.groupStandingsByGroup) {
      await predictionRepository.replaceGroupStandings(
        supabase,
        pred.id,
        data.groupStandingsByGroup,
      );
    }

    const tournament = await getTournament();
    const groupMatchIds = new Set(
      tournament.groups.flatMap((g) => g.matches.map((m) => m.id)),
    );

    const groupPredictions: GroupMatchScoresInput = {};
    for (const g of data.groupPredictions) {
      const hg = g.homeGoals;
      const ag = g.awayGoals;
      if (
        hg !== null &&
        ag !== null &&
        Number.isFinite(hg) &&
        Number.isFinite(ag) &&
        hg >= 0 &&
        ag >= 0
      ) {
        groupPredictions[g.matchId] = { homeGoals: hg, awayGoals: ag };
      }
    }

    const groupComplete = isGroupStagePredictionComplete(
      tournament.groups,
      groupPredictions,
    );

    const manualOrder = data.groupStandingsByGroup ?? {};

    if (groupComplete) {
      const calculatedStandings = buildCalculatedStandingsForPrediction(
        tournament,
        groupPredictions,
        manualOrder,
      );
      await predictionRepository.replacePredictionBestThirdQualifiers(
        supabase,
        pred.id,
        buildPredictionBestThirdQualifierRows(calculatedStandings),
      );

      const matchNumberToId = new Map<number, string>(
        tournament.knockoutMatches.map((m) => [m.matchNumber, m.id]),
      );

      const predictionMatchRows = (data.knockoutPredictions ?? []).map((k) => ({
        match_id: k.matchId,
        home_goals: k.homeGoals,
        away_goals: k.awayGoals,
        winner_team_id: k.winnerId ? k.winnerId : null,
      }));

      const resolved = resolvePredictionKnockoutBracket({
        knockoutMatches: tournament.knockoutMatches,
        groupMatchIds,
        calculatedStandings,
        predictionMatchRows,
        matchNumberToId,
      });

      const clientKoById = new Map(
        (data.knockoutPredictions ?? []).map((k) => [k.matchId, k] as const),
      );

      for (const m of tournament.knockoutMatches) {
        const client = clientKoById.get(m.id);
        const ha = resolved.homeAwayByMatchId.get(m.id);
        let winnerId = resolved.winnerByMatchId.get(m.id) ?? null;
        if (
          (m.matchNumber === 103 || m.matchNumber === 104) &&
          client?.winnerId &&
          ha
        ) {
          const c = client.winnerId;
          if (c === ha.home || c === ha.away) {
            winnerId = c;
          }
        }
        await predictionRepository.upsertPredictionMatch(supabase, {
          prediction_id: pred.id,
          match_id: m.id,
          home_goals: client?.homeGoals ?? 0,
          away_goals: client?.awayGoals ?? 0,
          winner_team_id: winnerId,
          pred_home_team_id: ha?.home?.trim() ? ha.home : null,
          pred_away_team_id: ha?.away?.trim() ? ha.away : null,
        });
      }
    } else {
      await predictionRepository.replacePredictionBestThirdQualifiers(supabase, pred.id, []);
      const ko = data.knockoutPredictions ?? [];
      for (const k of ko) {
        await predictionRepository.upsertPredictionMatch(supabase, {
          prediction_id: pred.id,
          match_id: k.matchId,
          home_goals: k.homeGoals,
          away_goals: k.awayGoals,
          winner_team_id: k.winnerId || null,
          pred_home_team_id: null,
          pred_away_team_id: null,
        });
      }
    }

    await predictionRepository.upsertPredictionSpecials(
      supabase,
      pred.id,
      data.specialPredictions.topScorer,
      data.specialPredictions.bestPlayer,
    );

    const full = await mapRowsToUserPrediction(supabase, userId, pred);
    log.info({ userId, predictionId: pred.id }, 'savePredictions');
    return { success: true, prediction: full };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ userId, err: message }, 'savePredictions failed');
    return { success: false, error: message };
  }
};

export const saveSpecialPredictions = async (
  userId: string,
  topScorer: string,
  bestPlayer: string,
): Promise<{ success: true } | { success: false; error: string }> => {
  try {
    const supabase = await createServerClient();

    const paid = await profileRepository.isPaymentPaid(supabase, userId);
    if (!paid) {
      log.warn({ userId }, 'saveSpecialPredictions: not paid');
      return { success: false, error: 'User must be marked as paid' };
    }

    if (deadlinePassed()) {
      log.warn({ userId }, 'saveSpecialPredictions: deadline passed');
      return { success: false, error: 'Prediction deadline has passed' };
    }

    const existing = await predictionRepository.getPredictionByUserId(supabase, userId);
    if (existing?.is_locked) {
      return { success: false, error: 'Prediction is locked' };
    }

    const pred = await predictionRepository.upsertPredictionRow(supabase, userId);
    await predictionRepository.upsertPredictionSpecials(supabase, pred.id, topScorer, bestPlayer);

    log.info({ userId, predictionId: pred.id }, 'saveSpecialPredictions');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ userId, err: message }, 'saveSpecialPredictions failed');
    return { success: false, error: message };
  }
};

export const lockPrediction = async (
  userId: string,
): Promise<UserPrediction> => {
  try {
    const supabase = await createServerClient();
    const pred = await predictionRepository.getPredictionByUserId(supabase, userId);
    if (!pred) throw new Error('No prediction to lock');
    const updated = await predictionRepository.lockPredictionRow(supabase, pred.id);
    log.info({ userId, predictionId: pred.id }, 'lockPrediction');
    return mapRowsToUserPrediction(supabase, userId, updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ userId, err: message }, 'lockPrediction failed');
    throw new Error(`lockPrediction failed: ${message}`);
  }
};

export const canUserSubmit = async (userId: string): Promise<boolean> => {
  try {
    const supabase = await createServerClient();
    const paid = await profileRepository.isPaymentPaid(supabase, userId);
    const pred = await predictionRepository.getPredictionByUserId(supabase, userId);
    if (pred?.is_locked) return false;
    return paid && !deadlinePassed();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ userId, err: message }, 'canUserSubmit failed');
    throw new Error(`canUserSubmit failed: ${message}`);
  }
};

export const getPredictionStatus = async (
  userId: string,
): Promise<PredictionStatus> => {
  try {
    const supabase = await createServerClient();
    const pred = await predictionRepository.getPredictionByUserId(supabase, userId);
    if (!pred) return 'draft';
    if (pred.is_locked) return 'locked';
    if (pred.submitted_at) return 'submitted';
    return 'draft';
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ userId, err: message }, 'getPredictionStatus failed');
    throw new Error(`getPredictionStatus failed: ${message}`);
  }
};
