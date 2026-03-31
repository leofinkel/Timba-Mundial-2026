'use client';

import { createContext, useContext } from 'react';

import type { UserProfile } from '@/types/auth';

const MainUserContext = createContext<UserProfile | null>(null);

interface MainUserProviderProps {
  user: UserProfile | null;
  children: React.ReactNode;
}

export const MainUserProvider = ({ user, children }: MainUserProviderProps) => {
  return <MainUserContext.Provider value={user}>{children}</MainUserContext.Provider>;
};

export const useMainUser = (): UserProfile | null => useContext(MainUserContext);
