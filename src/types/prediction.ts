import type { GroupName } from '@/types/tournament';

export interface GroupMatchPrediction {
  matchId: string;
  homeGoals: number;
  awayGoals: number;
}

/** Payload de guardado: partidos sin cargar van con goles en null (no se persiste 0-0 por defecto). */
export type SaveGroupMatchPrediction = {
  matchId: string;
  homeGoals: number | null;
  awayGoals: number | null;
};

export interface KnockoutMatchPrediction {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
  winnerId: string;
  /**
   * Partidos 103 (3.º/4.º) y 104 (final): orden explícito (3.º–4.º y campeón–subcampeón).
   * Los goles se sincronizan con `honorFirstTeamId` (1.º o 3.º).
   */
  honorFirstTeamId?: string;
  honorSecondTeamId?: string;
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

/** Forma serializable para el cliente (p. ej. server actions); Map no se serializa bien. */
export type UserPredictionView = Omit<UserPrediction, 'predictedGroupStandings'> & {
  predictedGroupStandings: Partial<Record<GroupName, string[]>>;
};

export type GetOtherUserPredictionForViewerErrorCode = 'not_paid' | 'too_early' | 'same_user';

export type GetOtherUserPredictionForViewerResult =
  | { ok: true; prediction: UserPredictionView | null }
  | { ok: false; code: GetOtherUserPredictionForViewerErrorCode; message: string };

export type PredictionStatus = 'draft' | 'submitted' | 'locked';

/** Payload for persisting a user's full prediction sheet (service layer). */
export type SavePredictionsPayload = {
  groupPredictions: SaveGroupMatchPrediction[];
  knockoutPredictions?: KnockoutMatchPrediction[];
  specialPredictions: SpecialPrediction;
  /** When set, replaces predicted group positions in DB (1 = index 0 … 4 = index 3). */
  groupStandingsByGroup?: Record<GroupName, string[]>;
};

export type SavePredictionsResult =
  | { success: true; prediction: UserPrediction }
  | { success: false; error: string };
