export type UserRole = 'user' | 'admin';

export type PaymentStatus = 'pending' | 'paid';

export type AccountStatus = 'active' | 'banned';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  paymentStatus: PaymentStatus;
  accountStatus: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
