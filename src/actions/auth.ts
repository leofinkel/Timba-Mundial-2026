'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';
import { loginSchema, registerSchema } from '@/lib/validation/schemas';
import { getUserProfile } from '@/services/authService';
import type { UserProfile } from '@/types/auth';

const formatZodIssues = (issues: { message: string }[]) =>
  issues.map((i) => i.message).join(', ');

export const loginAction = async (
  formData: FormData,
): Promise<{ success: true; data: null } | { success: false; error: string }> => {
  const parsed = loginSchema.safeParse({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: formatZodIssues(parsed.error.issues) || 'Invalid input',
    };
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: parsed.data.password,
  });

  if (error && /email not confirmed/i.test(error.message)) {
    const adminClient = createAdminClient();
    const { data: usersData, error: listUsersError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (!listUsersError) {
      const userToConfirm = usersData.users.find(
        (user) => user.email?.trim().toLowerCase() === normalizedEmail,
      );

      if (userToConfirm) {
        const { error: confirmError } = await adminClient.auth.admin.updateUserById(
          userToConfirm.id,
          {
            email_confirm: true,
          },
        );

        if (!confirmError) {
          const { error: retryError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: parsed.data.password,
          });

          if (!retryError) {
            revalidatePath('/', 'layout');
            return { success: true, data: null };
          }
        }
      }
    }
  }

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/', 'layout');
  return { success: true, data: null };
};

export const registerAction = async (
  formData: FormData,
): Promise<{ success: true; data: null } | { success: false; error: string }> => {
  const parsed = registerSchema.safeParse({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
    confirmPassword: String(formData.get('confirmPassword') ?? ''),
    firstName: String(formData.get('firstName') ?? ''),
    lastName: String(formData.get('lastName') ?? ''),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: formatZodIssues(parsed.error.issues) || 'Invalid input',
    };
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const displayName = `${parsed.data.firstName} ${parsed.data.lastName}`.trim();

  const supabase = await createServerClient();
  const { data: signUpData, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: parsed.data.password,
    options: {
      data: {
        full_name: displayName,
        display_name: displayName,
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (signUpData.user && !signUpData.session) {
    const adminClient = createAdminClient();
    const { error: confirmError } = await adminClient.auth.admin.updateUserById(
      signUpData.user.id,
      { email_confirm: true },
    );

    if (!confirmError) {
      await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: parsed.data.password,
      });
    }
  }

  revalidatePath('/', 'layout');
  return { success: true, data: null };
};

export const logoutAction = async (): Promise<void> => {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
};

export const getCurrentUser = async (): Promise<
  { success: true; data: UserProfile | null } | { success: false; error: string }
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
      return { success: true, data: null };
    }

    const profile = await getUserProfile(user.id);
    return { success: true, data: profile };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
};
