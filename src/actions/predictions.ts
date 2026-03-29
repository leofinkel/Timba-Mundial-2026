'use server';

import { revalidatePath } from 'next/cache';

import { createServerClient } from '@/lib/supabase/server';
import {
  savePredictionsSchema,
  type SavePredictionsSchemaInferred,
} from '@/lib/validation/schemas';
import {
  getPredictionStatus,
  getUserPrediction,
  lockPrediction,
  savePredictions,
} from '@/services/predictionService';
import type { PredictionStatus, UserPrediction } from '@/types/prediction';

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
