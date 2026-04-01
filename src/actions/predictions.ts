'use server';

import { revalidatePath } from 'next/cache';

import { createServerClient } from '@/lib/supabase/server';
import {
  savePredictionsSchema,
  saveSpecialPredictionsSchema,
  targetUserIdSchema,
  type SavePredictionsSchemaInferred,
  type SaveSpecialPredictionsSchemaInferred,
} from '@/lib/validation/schemas';
import {
  getOtherUserPredictionForViewer,
  getPredictionStatus,
  getUserPrediction,
  lockPrediction,
  savePredictions,
  saveSpecialPredictions,
} from '@/services/predictionService';
import type {
  GetOtherUserPredictionForViewerErrorCode,
  PredictionStatus,
  UserPrediction,
  UserPredictionView,
} from '@/types/prediction';

const formatZodIssues = (issues: { message: string }[]) =>
  issues.map((i) => i.message).join(', ');

export const savePredictionsAction = async (
  data: SavePredictionsSchemaInferred,
): Promise<{ success: true; data: null } | { success: false; error: string }> => {
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

  const parsed = savePredictionsSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: formatZodIssues(parsed.error.issues) || 'Invalid input',
    };
  }

  const result = await savePredictions(user.id, parsed.data);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath('/');
  revalidatePath('/dashboard');
  revalidatePath('/fixture');
  revalidatePath('/rankings');
  return { success: true, data: null };
};

export const saveSpecialPredictionsAction = async (
  data: SaveSpecialPredictionsSchemaInferred,
): Promise<{ success: true; data: null } | { success: false; error: string }> => {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) return { success: false, error: authError.message };
  if (!user) return { success: false, error: 'Not authenticated' };

  const parsed = saveSpecialPredictionsSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: formatZodIssues(parsed.error.issues) || 'Invalid input',
    };
  }

  const result = await saveSpecialPredictions(
    user.id,
    parsed.data.topScorer.trim(),
    parsed.data.bestPlayer.trim(),
  );

  if (!result.success) return { success: false, error: result.error };

  revalidatePath('/fixture');
  revalidatePath('/rankings');
  return { success: true, data: null };
};

export const getOtherUserPredictionForViewerAction = async (
  targetUserId: string,
): Promise<
  | { success: true; data: UserPredictionView | null }
  | { success: false; error: string; code?: GetOtherUserPredictionForViewerErrorCode }
> => {
  try {
    const parsed = targetUserIdSchema.safeParse(targetUserId);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'ID inválido' };
    }

    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return { success: false, error: authError.message };
    }
    if (!user) {
      return { success: false, error: 'Tenés que iniciar sesión.' };
    }

    const result = await getOtherUserPredictionForViewer(user.id, parsed.data);
    if (!result.ok) {
      return { success: false, error: result.message, code: result.code };
    }
    return { success: true, data: result.prediction };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const getUserPredictionAction = async (): Promise<
  { success: true; data: UserPrediction | null } | { success: false; error: string }
> => {
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

    const prediction = await getUserPrediction(user.id);
    return { success: true, data: prediction };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const getPredictionStatusAction = async (): Promise<
  { success: true; data: PredictionStatus } | { success: false; error: string }
> => {
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

    const status = await getPredictionStatus(user.id);
    return { success: true, data: status };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const lockPredictionAction = async (): Promise<
  { success: true; data: null } | { success: false; error: string }
> => {
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

    await lockPrediction(user.id);

    revalidatePath('/');
    revalidatePath('/dashboard');
    revalidatePath('/fixture');
    revalidatePath('/rankings');
    return { success: true, data: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};
