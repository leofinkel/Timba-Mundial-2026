'use server';

import { revalidatePath } from 'next/cache';

import { createServerClient } from '@/lib/supabase/server';
import {
  adminResultSchema,
  knockoutResultSchema,
  saveSpecialResultsSchema,
} from '@/lib/validation/schemas';
import type { SaveSpecialResultsSchemaInferred } from '@/lib/validation/schemas';
import { isAdmin } from '@/services/adminService';
import { saveKnockoutWinner, saveMatchResult, saveSpecialResults } from '@/services/resultService';
import { calculateAllScores } from '@/services/scoringService';

const formatZodIssues = (issues: { message: string }[]) =>
  issues.map((i) => i.message).join(', ');

const revalidateAll = () => {
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/fixture');
  revalidatePath('/rankings');
};

export const saveMatchResultAction = async (
  matchId: string,
  homeGoals: number,
  awayGoals: number,
  winnerOverride?: string,
): Promise<{ success: true; data: null } | { success: false; error: string }> => {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) return { success: false, error: authError.message };
    if (!user) return { success: false, error: 'Not authenticated' };

    const admin = await isAdmin(user.id);
    if (!admin) return { success: false, error: 'Forbidden' };

    const parsed = adminResultSchema.safeParse({ matchId, homeGoals, awayGoals });
    if (!parsed.success) {
      return {
        success: false,
        error: formatZodIssues(parsed.error.issues) || 'Invalid input',
      };
    }

    await saveMatchResult(
      parsed.data.matchId,
      parsed.data.homeGoals,
      parsed.data.awayGoals,
      user.id,
      winnerOverride,
    );

    await calculateAllScores();
    revalidateAll();
    return { success: true, data: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const saveKnockoutWinnerAction = async (
  matchId: string,
  winnerTeamId: string,
): Promise<{ success: true; data: null } | { success: false; error: string }> => {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) return { success: false, error: authError.message };
    if (!user) return { success: false, error: 'Not authenticated' };

    const admin = await isAdmin(user.id);
    if (!admin) return { success: false, error: 'Forbidden' };

    const parsed = knockoutResultSchema.safeParse({ matchId, winnerTeamId });
    if (!parsed.success) {
      return {
        success: false,
        error: formatZodIssues(parsed.error.issues) || 'Invalid input',
      };
    }

    await saveKnockoutWinner(parsed.data.matchId, parsed.data.winnerTeamId, user.id);

    await calculateAllScores();
    revalidateAll();
    return { success: true, data: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const saveSpecialResultsAction = async (
  data: SaveSpecialResultsSchemaInferred,
): Promise<{ success: true; data: null } | { success: false; error: string }> => {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const admin = await isAdmin(user.id);
    if (!admin) {
      return { success: false, error: 'Forbidden' };
    }

    const parsed = saveSpecialResultsSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: formatZodIssues(parsed.error.issues) || 'Invalid input',
      };
    }

    await saveSpecialResults(parsed.data, user.id);

    await calculateAllScores();

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/dashboard');
    revalidatePath('/rankings');
    return { success: true, data: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};
