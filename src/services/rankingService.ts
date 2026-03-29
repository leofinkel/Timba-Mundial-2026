import 'server-only';

import { PRIZE_DISTRIBUTION } from '@/constants/scoring';
import { createServiceLogger } from '@/lib/logger';
import { createServerClient } from '@/lib/supabase/server';
import * as profileRepository from '@/repositories/profileRepository';
import * as userScoreRepository from '@/repositories/userScoreRepository';
import type { Leaderboard, PrizePool, RankingEntry } from '@/types/ranking';

const log = createServiceLogger('rankingService');

/** One abstract unit per paid user when no fixed entry fee exists in constants. */
const POOL_UNIT_PER_PAID_USER = 1;

export const getPrizePool = async (): Promise<PrizePool> => {
  try {
    const supabase = await createServerClient();
    const paidUsersCount = await profileRepository.countPaidProfiles(supabase);
    const totalPool = paidUsersCount * POOL_UNIT_PER_PAID_USER;
    const prizePool: PrizePool = {
      totalPool,
      firstPrize: totalPool * PRIZE_DISTRIBUTION.first,
      secondPrize: totalPool * PRIZE_DISTRIBUTION.second,
      thirdPrize: totalPool * PRIZE_DISTRIBUTION.third,
      paidUsersCount,
    };
    log.debug(prizePool, 'getPrizePool');
    return prizePool;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ err: message }, 'getPrizePool failed');
    throw new Error(`getPrizePool failed: ${message}`);
  }
};

export const getLeaderboard = async (): Promise<Leaderboard> => {
  try {
    const supabase = await createServerClient();
    const [scores, profiles, prizePool] = await Promise.all([
      userScoreRepository.listScoresOrderedByPoints(supabase),
      profileRepository.listAllProfiles(supabase),
      getPrizePool(),
    ]);

    const nameByUser = new Map(profiles.map((p) => [p.id, p.displayName]));

    const sorted = [...scores].sort((a, b) => b.totalPoints - a.totalPoints);

    let competitionRank = 1;
    const entries: RankingEntry[] = sorted.map((s, i) => {
      if (i > 0 && sorted[i].totalPoints < sorted[i - 1].totalPoints) {
        competitionRank = i + 1;
      }
      return {
        rank: s.rank ?? competitionRank,
        userId: s.userId,
        displayName: nameByUser.get(s.userId) ?? 'Unknown',
        totalPoints: s.totalPoints,
        previousRank: null,
        movement: 'same' as const,
        breakdown: s,
      };
    });

    const lastUpdated =
      sorted[0]?.updatedAt ?? new Date().toISOString();

    const board: Leaderboard = {
      entries,
      prizePool,
      lastUpdated,
    };
    log.info({ entries: entries.length }, 'getLeaderboard');
    return board;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ err: message }, 'getLeaderboard failed');
    throw new Error(`getLeaderboard failed: ${message}`);
  }
};

export const getUserRank = async (
  userId: string,
): Promise<{ rank: number | null; totalPoints: number }> => {
  try {
    const supabase = await createServerClient();
    const score = await userScoreRepository.getUserScoreByUserId(
      supabase,
      userId,
    );

    const result = {
      rank: score?.rank ?? null,
      totalPoints: score?.totalPoints ?? 0,
    };
    log.debug({ userId, ...result }, 'getUserRank');
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ userId, err: message }, 'getUserRank failed');
    throw new Error(`getUserRank failed: ${message}`);
  }
};
