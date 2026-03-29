export interface AdminDashboardStats {
  totalUsers: number;
  paidUsers: number;
  pendingPayments: number;
  predictionsSubmitted: number;
  lockedPredictions: number;
}

export interface AdminGameRule {
  id: string;
  title: string;
  content: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminMatchInput {
  stage: string;
  groupId?: string | null;
  matchNumber: number;
  matchday?: number | null;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  homeSource?: string | null;
  awaySource?: string | null;
  playedAt?: string | null;
}

export interface AdminMatchUpdateInput extends AdminMatchInput {
  id: string;
}

export interface AdminClassificationEntry {
  userId: string;
  displayName: string;
  email: string;
  totalPoints: number;
  rank: number | null;
  updatedAt: string;
}

export interface AdminClassificationUpdateInput {
  userId: string;
  totalPoints: number;
  rank?: number | null;
}
