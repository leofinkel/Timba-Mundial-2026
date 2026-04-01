'use server';

import { revalidatePath } from 'next/cache';

import { createServerClient } from '@/lib/supabase/server';
import { adminNewsPostSchema } from '@/lib/validation/schemas';
import { isAdmin } from '@/services/adminService';
import {
  createNewsWithAuth,
  deleteNewsWithAuth,
  listPublicNews,
  updateNewsWithAuth,
} from '@/services/newsService';
import type { NewsPost } from '@/types/news';

export const listNewsAction = async (): Promise<
  { success: true; data: NewsPost[] } | { success: false; error: string }
> => {
  try {
    const posts = await listPublicNews();
    return { success: true, data: posts };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const createNewsAction = async (
  input: unknown,
): Promise<{ success: true; data: null } | { success: false; error: string }> => {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) return { success: false, error: authError.message };
    if (!user) return { success: false, error: 'Not authenticated' };
    if (!(await isAdmin(user.id))) return { success: false, error: 'Forbidden' };

    const parsed = adminNewsPostSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: 'Datos inválidos para la noticia' };
    }

    await createNewsWithAuth(parsed.data, user.id);
    revalidatePath('/');
    revalidatePath('/dashboard');
    revalidatePath('/admin');
    return { success: true, data: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const updateNewsAction = async (
  id: string,
  input: unknown,
): Promise<{ success: true; data: null } | { success: false; error: string }> => {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) return { success: false, error: authError.message };
    if (!user) return { success: false, error: 'Not authenticated' };
    if (!(await isAdmin(user.id))) return { success: false, error: 'Forbidden' };

    const parsed = adminNewsPostSchema.safeParse(input);
    if (!parsed.success || !id.trim()) {
      return { success: false, error: 'Datos inválidos para la noticia' };
    }

    await updateNewsWithAuth({ id, ...parsed.data }, user.id);
    revalidatePath('/');
    revalidatePath('/dashboard');
    revalidatePath('/admin');
    return { success: true, data: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const deleteNewsAction = async (
  id: string,
): Promise<{ success: true; data: null } | { success: false; error: string }> => {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) return { success: false, error: authError.message };
    if (!user) return { success: false, error: 'Not authenticated' };
    if (!(await isAdmin(user.id))) return { success: false, error: 'Forbidden' };
    if (!id.trim()) return { success: false, error: 'Id inválido' };

    await deleteNewsWithAuth(id, user.id);
    revalidatePath('/');
    revalidatePath('/dashboard');
    revalidatePath('/admin');
    return { success: true, data: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};
