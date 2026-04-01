import type { UserScoreBreakdown } from '@/types/scoring';

export interface RankingEntry {
  rank: number;
  userId: string;
  displayName: string;
  /** Public URL from storage; null if no avatar. */
  avatarUrl: string | null;
  totalPoints: number;
  previousRank: number | null;
  movement: 'up' | 'down' | 'same' | 'new';
  breakdown: UserScoreBreakdown;
}

export interface PrizePool {
  totalPool: number;
  firstPrize: number;
  secondPrize: number;
  thirdPrize: number;
  paidUsersCount: number;
}

export interface Leaderboard {
  entries: RankingEntry[];
  prizePool: PrizePool;
  lastUpdated: string;
}
