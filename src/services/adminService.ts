import 'server-only';

import { createServiceLogger } from '@/lib/logger';
import { createServerClient } from '@/lib/supabase/server';
import * as gameRuleRepository from '@/repositories/gameRuleRepository';
import * as matchRepository from '@/repositories/matchRepository';
import type { MatchRow } from '@/repositories/matchRepository';
import * as predictionRepository from '@/repositories/predictionRepository';
import * as profileRepository from '@/repositories/profileRepository';
import * as userScoreRepository from '@/repositories/userScoreRepository';
import type {
  AdminClassificationEntry,
  AdminClassificationUpdateInput,
  AdminGameRule,
  AdminMatchInput,
  AdminMatchUpdateInput,
} from '@/types/admin';
import type { PaymentStatus, UserProfile } from '@/types/auth';

const log = createServiceLogger('adminService');

const assertAdmin = async (adminId: string) => {
  const supabase = await createServerClient();
  const ok = await profileRepository.hasAdminRole(supabase, adminId);
  if (!ok) throw new Error('Forbidden: admin role required');
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const supabase = await createServerClient();
    const users = await profileRepository.listAllProfiles(supabase);
    log.info({ count: users.length }, 'getAllUsers');
    return users;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ err: message }, 'getAllUsers failed');
    throw new Error(`getAllUsers failed: ${message}`);
  }
};

export const updatePaymentStatus = async (
  userId: string,
  status: PaymentStatus,
  adminId: string,
): Promise<UserProfile> => {
  try {
    await assertAdmin(adminId);
    const supabase = await createServerClient();
    const updated = await profileRepository.updatePaymentStatus(
      supabase,
      userId,
      status,
    );
    log.info({ userId, status, adminId }, 'updatePaymentStatus');
    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ userId, adminId, err: message }, 'updatePaymentStatus failed');
    throw new Error(`updatePaymentStatus failed: ${message}`);
  }
};

export const isAdmin = async (userId: string): Promise<boolean> => {
  try {
    const supabase = await createServerClient();
    return profileRepository.hasAdminRole(supabase, userId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ userId, err: message }, 'isAdmin failed');
    throw new Error(`isAdmin failed: ${message}`);
  }
};

export type DashboardStats = {
  totalUsers: number;
  paidUsers: number;
  predictionsSubmitted: number;
  matchesWithResults: number;
};

export const listAllMatchesForAdmin = async (): Promise<MatchRow[]> => {
  try {
    const supabase = await createServerClient();
    const rows = await matchRepository.listMatches(supabase);
    log.debug({ count: rows.length }, 'listAllMatchesForAdmin');
    return rows;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ err: message }, 'listAllMatchesForAdmin failed');
    throw new Error(`listAllMatchesForAdmin failed: ${message}`);
  }
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const supabase = await createServerClient();
    const [totalUsers, paidUsers, predictionsSubmitted, matchesWithResults] =
      await Promise.all([
        profileRepository.countAllProfiles(supabase),
        profileRepository.countPaidProfiles(supabase),
        predictionRepository.countPredictionsSubmitted(supabase),
        matchRepository.countMatchesWithResults(supabase),
      ]);

    const stats: DashboardStats = {
      totalUsers,
      paidUsers,
      predictionsSubmitted,
      matchesWithResults,
    };
    log.debug(stats, 'getDashboardStats');
    return stats;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ err: message }, 'getDashboardStats failed');
    throw new Error(`getDashboardStats failed: ${message}`);
  }
};

export const listGameRulesForAdmin = async (): Promise<AdminGameRule[]> => {
  try {
    const supabase = await createServerClient();
    const rows = await gameRuleRepository.listGameRules(supabase);
    log.debug({ count: rows.length }, 'listGameRulesForAdmin');
    return rows;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ err: message }, 'listGameRulesForAdmin failed');
    throw new Error(`listGameRulesForAdmin failed: ${message}`);
  }
};

export const createGameRuleWithAuth = async (
  input: Pick<AdminGameRule, 'title' | 'content' | 'sortOrder' | 'isActive'>,
  adminId: string,
): Promise<AdminGameRule> => {
  try {
    await assertAdmin(adminId);
    const supabase = await createServerClient();
    const row = await gameRuleRepository.createGameRule(supabase, input);
    log.info({ adminId, id: row.id }, 'createGameRuleWithAuth');
    return row;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ adminId, err: message }, 'createGameRuleWithAuth failed');
    throw new Error(`createGameRuleWithAuth failed: ${message}`);
  }
};

export const updateGameRuleWithAuth = async (
  input: Pick<AdminGameRule, 'id' | 'title' | 'content' | 'sortOrder' | 'isActive'>,
  adminId: string,
): Promise<AdminGameRule> => {
  try {
    await assertAdmin(adminId);
    const supabase = await createServerClient();
    const row = await gameRuleRepository.updateGameRule(supabase, input);
    log.info({ adminId, id: row.id }, 'updateGameRuleWithAuth');
    return row;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ adminId, err: message }, 'updateGameRuleWithAuth failed');
    throw new Error(`updateGameRuleWithAuth failed: ${message}`);
  }
};

export const deleteGameRuleWithAuth = async (
  id: string,
  adminId: string,
): Promise<void> => {
  try {
    await assertAdmin(adminId);
    const supabase = await createServerClient();
    await gameRuleRepository.deleteGameRule(supabase, id);
    log.info({ adminId, id }, 'deleteGameRuleWithAuth');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ adminId, id, err: message }, 'deleteGameRuleWithAuth failed');
    throw new Error(`deleteGameRuleWithAuth failed: ${message}`);
  }
};

export const createMatchWithAuth = async (
  input: AdminMatchInput,
  adminId: string,
): Promise<MatchRow> => {
  try {
    await assertAdmin(adminId);
    const supabase = await createServerClient();
    const created = await matchRepository.createMatch(supabase, {
      stage: input.stage,
      group_id: input.groupId ?? null,
      match_number: input.matchNumber,
      matchday: input.matchday ?? null,
      home_team_id: input.homeTeamId ?? null,
      away_team_id: input.awayTeamId ?? null,
      home_source: input.homeSource ?? null,
      away_source: input.awaySource ?? null,
      played_at: input.playedAt ?? null,
    });
    log.info({ adminId, id: created.id }, 'createMatchWithAuth');
    return created;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ adminId, err: message }, 'createMatchWithAuth failed');
    throw new Error(`createMatchWithAuth failed: ${message}`);
  }
};

export const updateMatchWithAuth = async (
  input: AdminMatchUpdateInput,
  adminId: string,
): Promise<MatchRow> => {
  try {
    await assertAdmin(adminId);
    const supabase = await createServerClient();
    const updated = await matchRepository.updateMatch(supabase, input.id, {
      stage: input.stage,
      group_id: input.groupId ?? null,
      match_number: input.matchNumber,
      matchday: input.matchday ?? null,
      home_team_id: input.homeTeamId ?? null,
      away_team_id: input.awayTeamId ?? null,
      home_source: input.homeSource ?? null,
      away_source: input.awaySource ?? null,
      played_at: input.playedAt ?? null,
    });
    log.info({ adminId, id: updated.id }, 'updateMatchWithAuth');
    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ adminId, err: message }, 'updateMatchWithAuth failed');
    throw new Error(`updateMatchWithAuth failed: ${message}`);
  }
};

export const deleteMatchWithAuth = async (
  matchId: string,
  adminId: string,
): Promise<void> => {
  try {
    await assertAdmin(adminId);
    const supabase = await createServerClient();
    await matchRepository.deleteMatch(supabase, matchId);
    log.info({ adminId, matchId }, 'deleteMatchWithAuth');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ adminId, matchId, err: message }, 'deleteMatchWithAuth failed');
    throw new Error(`deleteMatchWithAuth failed: ${message}`);
  }
};

export const listClassificationForAdmin = async (): Promise<AdminClassificationEntry[]> => {
  try {
    const supabase = await createServerClient();
    const rows = await userScoreRepository.listAdminClassificationEntries(supabase);
    log.debug({ count: rows.length }, 'listClassificationForAdmin');
    return rows;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ err: message }, 'listClassificationForAdmin failed');
    throw new Error(`listClassificationForAdmin failed: ${message}`);
  }
};

export const upsertClassificationWithAuth = async (
  input: AdminClassificationUpdateInput,
  adminId: string,
): Promise<void> => {
  try {
    await assertAdmin(adminId);
    const supabase = await createServerClient();
    await userScoreRepository.upsertAdminClassificationEntry(supabase, {
      userId: input.userId,
      totalPoints: input.totalPoints,
      rank: input.rank ?? null,
    });
    log.info({ adminId, userId: input.userId }, 'upsertClassificationWithAuth');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ adminId, err: message }, 'upsertClassificationWithAuth failed');
    throw new Error(`upsertClassificationWithAuth failed: ${message}`);
  }
};

export const deleteClassificationWithAuth = async (
  userId: string,
  adminId: string,
): Promise<void> => {
  try {
    await assertAdmin(adminId);
    const supabase = await createServerClient();
    await userScoreRepository.deleteAdminClassificationEntry(supabase, userId);
    log.info({ adminId, userId }, 'deleteClassificationWithAuth');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ adminId, userId, err: message }, 'deleteClassificationWithAuth failed');
    throw new Error(`deleteClassificationWithAuth failed: ${message}`);
  }
};
