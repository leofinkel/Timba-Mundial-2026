import 'server-only';

import { createServiceLogger } from '@/lib/logger';
import { createServerClient } from '@/lib/supabase/server';
import * as profileRepository from '@/repositories/profileRepository';
import type { UserProfile } from '@/types/auth';

const log = createServiceLogger('authService');

export const getUserProfile = async (
  userId: string,
): Promise<UserProfile | null> => {
  try {
    const supabase = await createServerClient();
    const profile = await profileRepository.getProfileById(supabase, userId);
    log.debug({ userId, found: !!profile }, 'getUserProfile');
    return profile;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ userId, err: message }, 'getUserProfile failed');
    throw new Error(`getUserProfile failed: ${message}`);
  }
};

export const updateUserProfile = async (
  userId: string,
  data: { displayName?: string },
): Promise<UserProfile> => {
  try {
    if (data.displayName === undefined) {
      const supabase = await createServerClient();
      const current = await profileRepository.getProfileById(supabase, userId);
      if (!current) throw new Error('Profile not found');
      return current;
    }

    const supabase = await createServerClient();
    const updated = await profileRepository.updateProfileDisplayName(
      supabase,
      userId,
      data.displayName.trim(),
    );
    log.info({ userId }, 'updateUserProfile');
    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ userId, err: message }, 'updateUserProfile failed');
    throw new Error(`updateUserProfile failed: ${message}`);
  }
};

export const isUserPaid = async (userId: string): Promise<boolean> => {
  try {
    const supabase = await createServerClient();
    const paid = await profileRepository.isPaymentPaid(supabase, userId);
    log.debug({ userId, paid }, 'isUserPaid');
    return paid;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error({ userId, err: message }, 'isUserPaid failed');
    throw new Error(`isUserPaid failed: ${message}`);
  }
};
