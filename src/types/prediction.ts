import type { GroupName } from '@/types/tournament';

export interface GroupMatchPrediction {
  matchId: string;
  homeGoals: number;
  awayGoals: number;
}

export interface KnockoutMatchPrediction {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
  winnerId: string;
}

export interface SpecialPrediction {
  topScorer: string;
  bestPlayer: string;
}

export interface UserPrediction {
  id: string;
  userId: string;
  groupPredictions: GroupMatchPrediction[];
  knockoutPredictions: KnockoutMatchPrediction[];
  specialPredictions: SpecialPrediction;
  predictedGroupStandings: Map<GroupName, string[]>;
  isLocked: boolean;
  submittedAt: string | null;
  updatedAt: string;
}

export type PredictionStatus = 'draft' | 'submitted' | 'locked';

/** Payload for persisting a user's full prediction sheet (service layer). */
export type SavePredictionsPayload = {
  groupPredictions: GroupMatchPrediction[];
  knockoutPredictions?: KnockoutMatchPrediction[];
  specialPredictions: SpecialPrediction;
  /** When set, replaces predicted group positions in DB (1 = index 0 … 4 = index 3). */
  groupStandingsByGroup?: Record<GroupName, string[]>;
};

export type SavePredictionsResult =
  | { success: true; prediction: UserPrediction }
  | { success: false; error: string };
