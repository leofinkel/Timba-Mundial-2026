'use server';

import { getTournament } from '@/services/fixtureService';
import type { Tournament } from '@/types/tournament';

export const getTournamentAction = async (): Promise<
  { success: true; data: Tournament } | { success: false; error: string }
> => {
  try {
    const tournament = await getTournament();
    return { success: true, data: tournament };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};
