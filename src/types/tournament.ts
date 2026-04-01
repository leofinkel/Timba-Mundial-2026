export type GroupName =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L';

export interface Team {
  id: string;
  name: string;
  code: string;
  flagUrl: string;
  /** Set after the draw; `null` until groups are assigned. */
  groupId: GroupName | null;
}

export type Confederation =
  | 'AFC'
  | 'CAF'
  | 'CONCACAF'
  | 'CONMEBOL'
  | 'OFC'
  | 'UEFA';

export interface GroupMatch {
  id: string;
  groupId: GroupName;
  matchday: 1 | 2 | 3;
  homeTeam: Team;
  awayTeam: Team;
  homeGoals: number | null;
  awayGoals: number | null;
  playedAt: string | null;
}

export interface GroupStanding {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: 1 | 2 | 3 | 4;
}

export interface Group {
  id: GroupName;
  name: string;
  teams: Team[];
  matches: GroupMatch[];
  standings: GroupStanding[];
}

export type KnockoutRound =
  | 'round-of-32'
  | 'round-of-16'
  | 'quarter-finals'
  | 'semi-finals'
  | 'third-place'
  | 'final';

export type KnockoutRoundConfig = {
  readonly id: KnockoutRound;
  readonly name: string;
  readonly matchCount: number;
};

export interface KnockoutMatch {
  id: string;
  round: KnockoutRound;
  matchNumber: number;
  homeTeam: Team | null;
  awayTeam: Team | null;
  homeGoals: number | null;
  awayGoals: number | null;
  winner: Team | null;
  homeSource: string;
  awaySource: string;
}

export interface Tournament {
  groups: Group[];
  knockoutMatches: KnockoutMatch[];
}

/** Official line score persisted on `matches` (read model for results/scoring). */
export type FinishedMatchResult = {
  matchId: string;
  stage: string;
  groupId: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeGoals: number;
  awayGoals: number;
  winnerTeamId: string | null;
  playedAt: string | null;
};

/** Admin-maintained honor results (`real_results` row). */
export type OfficialSpecialResultsInput = {
  topScorer: string;
  bestPlayer: string;
  championTeamId: string;
  runnerUpTeamId: string;
  thirdPlaceTeamId: string;
  fourthPlaceTeamId: string;
};
