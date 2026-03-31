'use server';

import { revalidatePath } from 'next/cache';

import { createServerClient } from '@/lib/supabase/server';
import { updateProfileSchema } from '@/lib/validation/schemas';
import { updateUserProfile, updateUserAvatarUrl } from '@/services/authService';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const getAuthUserId = async (): Promise<string | null> => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
};

export const updateProfileAction = async (
  formData: FormData,
): Promise<{ success: true } | { success: false; error: string }> => {
  const userId = await getAuthUserId();
  if (!userId) return { success: false, error: 'No autenticado' };

  const parsed = updateProfileSchema.safeParse({
    displayName: String(formData.get('displayName') ?? ''),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(', '),
    };
  }

  try {
    await updateUserProfile(userId, { displayName: parsed.data.displayName });
    revalidatePath('/', 'layout');
    return { success: true };
  } catch {
    return { success: false, error: 'No se pudo actualizar el perfil' };
  }
};

export const uploadAvatarAction = async (
  formData: FormData,
): Promise<{ success: true; avatarUrl: string } | { success: false; error: string }> => {
  const userId = await getAuthUserId();
  if (!userId) return { success: false, error: 'No autenticado' };

  const file = formData.get('avatar') as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: 'No se seleccionó ningún archivo' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { success: false, error: 'Formato no permitido. Usá JPG, PNG o WebP' };
  }

  if (file.size > MAX_AVATAR_SIZE) {
    return { success: false, error: 'La imagen no puede superar 2 MB' };
  }

  try {
    const supabase = await createServerClient();
    const ext = file.name.split('.').pop() ?? 'jpg';
    const filePath = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      return { success: false, error: `Error al subir: ${uploadError.message}` };
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    await updateUserAvatarUrl(userId, avatarUrl);
    revalidatePath('/', 'layout');
    return { success: true, avatarUrl };
  } catch {
    return { success: false, error: 'No se pudo subir la imagen' };
  }
};

export const removeAvatarAction = async (): Promise<
  { success: true } | { success: false; error: string }
> => {
  const userId = await getAuthUserId();
  if (!userId) return { success: false, error: 'No autenticado' };

  try {
    const supabase = await createServerClient();

    const { data: files } = await supabase.storage
      .from('avatars')
      .list(userId);

    if (files && files.length > 0) {
      const paths = files.map((f) => `${userId}/${f.name}`);
      await supabase.storage.from('avatars').remove(paths);
    }

    await updateUserAvatarUrl(userId, null);
    revalidatePath('/', 'layout');
    return { success: true };
  } catch {
    return { success: false, error: 'No se pudo eliminar la foto' };
  }
};
