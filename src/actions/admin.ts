'use server';

import { revalidatePath } from 'next/cache';

import { createServerClient } from '@/lib/supabase/server';
import {
  adminClassificationUpdateSchema,
  adminGameRuleSchema,
  adminMatchSchema,
  paymentStatusUpdateSchema,
} from '@/lib/validation/schemas';
import {
  createGameRuleWithAuth,
  createMatchWithAuth,
  deleteClassificationWithAuth,
  deleteGameRuleWithAuth,
  deleteMatchWithAuth,
  getAllUsers,
  getDashboardStats,
  isAdmin,
  listClassificationForAdmin,
  listGameRulesForAdmin,
  listAllMatchesForAdmin,
  updateGameRuleWithAuth,
  updateMatchWithAuth,
  updatePaymentStatus,
  upsertClassificationWithAuth,
} from '@/services/adminService';
import type {
  AdminClassificationEntry,
  AdminClassificationUpdateInput,
  AdminGameRule,
  AdminMatchInput,
  AdminMatchUpdateInput,
} from '@/types/admin';
import type { UserProfile } from '@/types/auth';
import type { DashboardStats } from '@/services/adminService';

export const getAllUsersAction = async (): Promise<
  { success: true; data: UserProfile[] } | { success: false; error: string }
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

    const admin = await isAdmin(user.id);
    if (!admin) {
      return { success: false, error: 'Forbidden' };
    }

    const users = await getAllUsers();
    return { success: true, data: users };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const updatePaymentStatusAction = async (
  userId: string,
  status: unknown,
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

    const statusParsed = paymentStatusUpdateSchema.safeParse(status);
    if (!statusParsed.success) {
      return { success: false, error: 'Invalid payment status' };
    }

    if (!userId.trim()) {
      return { success: false, error: 'Invalid user id' };
    }

    await updatePaymentStatus(userId, statusParsed.data, user.id);

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/dashboard');
    revalidatePath('/fixture');
    revalidatePath('/perfil');
    return { success: true, data: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const getAdminDashboardAction = async (): Promise<
  { success: true; data: DashboardStats } | { success: false; error: string }
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

    const admin = await isAdmin(user.id);
    if (!admin) {
      return { success: false, error: 'Forbidden' };
    }

    const stats = await getDashboardStats();
    return { success: true, data: stats };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const getGameRulesAdminAction = async (): Promise<
  { success: true; data: AdminGameRule[] } | { success: false; error: string }
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

    const admin = await isAdmin(user.id);
    if (!admin) {
      return { success: false, error: 'Forbidden' };
    }

    const rules = await listGameRulesForAdmin();
    return { success: true, data: rules };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const createGameRuleAction = async (
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

    const parsed = adminGameRuleSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: 'Datos inválidos para reglamento' };
    }

    await createGameRuleWithAuth(parsed.data, user.id);
    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true, data: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const updateGameRuleAction = async (
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

    const parsed = adminGameRuleSchema.safeParse(input);
    if (!parsed.success || !id) {
      return { success: false, error: 'Datos inválidos para reglamento' };
    }

    await updateGameRuleWithAuth({ id, ...parsed.data }, user.id);
    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true, data: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const deleteGameRuleAction = async (
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

    await deleteGameRuleWithAuth(id, user.id);
    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true, data: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const getAdminMatchesAction = async (): Promise<
  { success: true; data: Awaited<ReturnType<typeof listAllMatchesForAdmin>> } | {
    success: false;
    error: string;
  }
> => {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) return { success: false, error: authError.message };
    if (!user) return { success: false, error: 'Not authenticated' };
    if (!(await isAdmin(user.id))) return { success: false, error: 'Forbidden' };

    const matches = await listAllMatchesForAdmin();
    return { success: true, data: matches };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const createAdminMatchAction = async (
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

    const parsed = adminMatchSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: 'Datos inválidos del partido' };

    await createMatchWithAuth(parsed.data as AdminMatchInput, user.id);
    revalidatePath('/admin');
    revalidatePath('/fixture');
    return { success: true, data: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const updateAdminMatchAction = async (
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

    const parsed = adminMatchSchema.safeParse(input);
    if (!parsed.success || !id.trim()) {
      return { success: false, error: 'Datos inválidos del partido' };
    }

    await updateMatchWithAuth({ id, ...(parsed.data as AdminMatchInput) } as AdminMatchUpdateInput, user.id);
    revalidatePath('/admin');
    revalidatePath('/fixture');
    return { success: true, data: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const deleteAdminMatchAction = async (
  matchId: string,
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
    if (!matchId.trim()) return { success: false, error: 'Id inválido de partido' };

    await deleteMatchWithAuth(matchId, user.id);
    revalidatePath('/admin');
    revalidatePath('/fixture');
    return { success: true, data: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const getClassificationAdminAction = async (): Promise<
  { success: true; data: AdminClassificationEntry[] } | { success: false; error: string }
> => {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) return { success: false, error: authError.message };
    if (!user) return { success: false, error: 'Not authenticated' };
    if (!(await isAdmin(user.id))) return { success: false, error: 'Forbidden' };

    const data = await listClassificationForAdmin();
    return { success: true, data };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const upsertClassificationAdminAction = async (
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

    const parsed = adminClassificationUpdateSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: 'Datos inválidos de clasificación' };

    await upsertClassificationWithAuth(parsed.data as AdminClassificationUpdateInput, user.id);
    revalidatePath('/admin');
    revalidatePath('/rankings');
    return { success: true, data: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};

export const deleteClassificationAdminAction = async (
  userId: string,
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
    if (!userId.trim()) return { success: false, error: 'Id inválido de usuario' };

    await deleteClassificationWithAuth(userId, user.id);
    revalidatePath('/admin');
    revalidatePath('/rankings');
    return { success: true, data: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};
