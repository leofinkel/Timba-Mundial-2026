import 'server-only';

import { ENTRY_FEE, PRIZE_DISTRIBUTION } from '@/constants/scoring';
import { createServiceLogger } from '@/lib/logger';
import { createServerClient } from '@/lib/supabase/server';
import * as predictionRepository from '@/repositories/predictionRepository';
import * as profileRepository from '@/repositories/profileRepository';
import * as userScoreRepository from '@/repositories/userScoreRepository';
import type { UserScoreBreakdown } from '@/types/scoring';
import type { Leaderboard, PrizePool, RankingEntry } from '@/types/ranking';

const log = createServiceLogger('rankingService');

const zeroBreakdown = (userId: string): UserScoreBreakdown => ({
  userId,
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
  totalPoints: 0,
  rank: null,
  updatedAt: new Date().toISOString(),
});

export const getPrizePool = async (): Promise<PrizePool> => {
  try {
    const supabase = await createServerClient();
    const paidUsersCount = await profileRepository.countPaidProfiles(supabase);
    const totalPool = paidUsersCount * ENTRY_FEE;
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
    const [scores, submittedUserIds, leaderboardProfiles, prizePool] = await Promise.all([
      userScoreRepository.listScoresOrderedByPoints(supabase),
      predictionRepository.listSubmittedPredictionUserIds(supabase),
      profileRepository.listProfilesForPublicLeaderboard(supabase),
      getPrizePool(),
    ]);

    const nameByUser = new Map(leaderboardProfiles.map((p) => [p.id, p.displayName]));
    const avatarByUser = new Map(leaderboardProfiles.map((p) => [p.id, p.avatarUrl]));

    const scoreByUserId = new Map(scores.map((s) => [s.userId, s]));
    const combined: UserScoreBreakdown[] = [...scores];
    for (const uid of submittedUserIds) {
      if (!scoreByUserId.has(uid)) {
        combined.push(zeroBreakdown(uid));
      }
    }

    combined.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      const nameA = nameByUser.get(a.userId) ?? '';
      const nameB = nameByUser.get(b.userId) ?? '';
      return nameA.localeCompare(nameB, 'es');
    });

    let competitionRank = 1;
    const entries: RankingEntry[] = combined.map((s, i) => {
      if (i > 0 && combined[i].totalPoints < combined[i - 1].totalPoints) {
        competitionRank = i + 1;
      }
      return {
        rank: s.rank ?? competitionRank,
        userId: s.userId,
        displayName: nameByUser.get(s.userId) ?? 'Unknown',
        avatarUrl: avatarByUser.get(s.userId) ?? null,
        totalPoints: s.totalPoints,
        previousRank: null,
        movement: 'same' as const,
        breakdown: s,
      };
    });

    const lastUpdated =
      combined[0]?.updatedAt ?? new Date().toISOString();

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
