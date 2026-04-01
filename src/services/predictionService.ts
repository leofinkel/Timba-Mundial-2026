import 'server-only';

import { PREDICTION_DEADLINE } from '@/constants/tournament';
import { createServiceLogger } from '@/lib/logger';
import { createServerClient } from '@/lib/supabase/server';
import * as predictionRepository from '@/repositories/predictionRepository';
import * as profileRepository from '@/repositories/profileRepository';
import type {
  GroupMatchPrediction,
  KnockoutMatchPrediction,
  PredictionStatus,
  SavePredictionsPayload,
  SavePredictionsResult,
  UserPrediction,
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

const mapRowsToUserPrediction = async (
  supabase: SupabaseServer,
  userId: string,
  pred: predictionRepository.PredictionRow,
): Promise<UserPrediction> => {
  const joined = await predictionRepository.listPredictionMatchesWithMatches(
    supabase,
    pred.id,
  );

  const groupPredictions: GroupMatchPrediction[] = [];
  const knockoutPredictions: KnockoutMatchPrediction[] = [];

  for (const row of joined) {
    const m = row.matches;
    if (!m) continue;
    if (m.stage === 'group') {
      groupPredictions.push({
        matchId: row.match_id,
        homeGoals: row.home_goals,
        awayGoals: row.away_goals,
      });
    } else {
      knockoutPredictions.push({
        matchId: row.match_id,
        homeTeamId: m.home_team_id ?? '',
        awayTeamId: m.away_team_id ?? '',
        homeGoals: row.home_goals,
        awayGoals: row.away_goals,
        winnerId: row.winner_team_id ?? '',
      });
    }
  }

  const standingRows = await predictionRepository.listGroupStandingsRows(
    supabase,
    pred.id,
  );
  const standingsMap = buildStandingsMap(standingRows);

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
      await predictionRepository.upsertPredictionMatch(supabase, {
        prediction_id: pred.id,
        match_id: g.matchId,
        home_goals: g.homeGoals,
        away_goals: g.awayGoals,
        winner_team_id: null,
      });
    }

    const ko = data.knockoutPredictions ?? [];
    for (const k of ko) {
      await predictionRepository.upsertPredictionMatch(supabase, {
        prediction_id: pred.id,
        match_id: k.matchId,
        home_goals: k.homeGoals,
        away_goals: k.awayGoals,
        winner_team_id: k.winnerId || null,
      });
    }

    if (data.groupStandingsByGroup) {
      await predictionRepository.replaceGroupStandings(
        supabase,
        pred.id,
        data.groupStandingsByGroup,
      );
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
