export type ScoringGroupMatchRules = {
  readonly correctOutcome: number;
  readonly exactResult: number;
};

export type ScoringKnockoutRules = {
  readonly roundOf32: number;
  readonly roundOf16: number;
  readonly quarterFinals: number;
  readonly semiFinals: number;
  readonly finalists: number;
};

export type ScoringHonorBoardRules = {
  readonly champion: number;
  readonly runnerUp: number;
  readonly thirdPlace: number;
  readonly fourthPlace: number;
  readonly topScorer: number;
  readonly bestPlayer: number;
};

export type ScoringRules = {
  readonly groupMatch: ScoringGroupMatchRules;
  readonly groupPosition: number;
  readonly knockout: ScoringKnockoutRules;
  readonly honorBoard: ScoringHonorBoardRules;
};

export type PrizeDistribution = {
  readonly first: number;
  readonly second: number;
  readonly third: number;
};

/** Persisted breakdown in `user_scores` (camelCase domain shape). */
export type UserScoreBreakdown = {
  userId: string;
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
  totalPoints: number;
  rank: number | null;
  updatedAt: string;
};
