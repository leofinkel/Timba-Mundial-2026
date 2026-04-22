import 'server-only';

import { createServiceLogger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';
import { validateNewsImageFile } from '@/lib/newsImage';
import {
  createNewsPost,
  deleteNewsPost,
  getNewsPostImagePath,
  listNewsPosts,
  setNewsPostImagePath,
  setNewsPostVisibility,
  updateNewsPost,
} from '@/repositories/newsRepository';
import { hasAdminRole } from '@/repositories/profileRepository';
import type { NewsPost } from '@/types/news';

const log = createServiceLogger('newsService');

const assertAdmin = async (adminId: string) => {
  const supabase = await createServerClient();
  const ok = await hasAdminRole(supabase, adminId);
  if (!ok) throw new Error('Forbidden: admin role required');
};

export const listPublicNews = async (limit = 10): Promise<NewsPost[]> => {
  try {
    const supabase = createAdminClient();
    const posts = await listNewsPosts(supabase, { limit, onlyVisible: true });
    log.debug({ count: posts.length }, 'listPublicNews');
    return posts;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.warn({ err: message }, 'listPublicNews failed');
    return [];
  }
};

export const listAllNewsForAdmin = async (limit = 200): Promise<NewsPost[]> => {
  const supabase = createAdminClient();
  return listNewsPosts(supabase, { limit, onlyVisible: false });
};

export const createNewsWithAuth = async (
  input: { title: string; body: string },
  adminId: string,
): Promise<NewsPost> => {
  await assertAdmin(adminId);
  const supabase = await createServerClient();
  const post = await createNewsPost(supabase, { ...input, authorId: adminId });
  log.info({ postId: post.id, adminId }, 'News post created');
  return post;
};

export const updateNewsWithAuth = async (
  input: { id: string; title: string; body: string; isVisible: boolean },
  adminId: string,
): Promise<NewsPost> => {
  await assertAdmin(adminId);
  const supabase = await createServerClient();
  const post = await updateNewsPost(supabase, input);
  log.info({ postId: post.id, adminId }, 'News post updated');
  return post;
};

export const setNewsVisibilityWithAuth = async (
  id: string,
  isVisible: boolean,
  adminId: string,
): Promise<NewsPost> => {
  await assertAdmin(adminId);
  const supabase = await createServerClient();
  const post = await setNewsPostVisibility(supabase, { id, isVisible });
  log.info({ postId: post.id, isVisible, adminId }, 'News post visibility updated');
  return post;
};

export const deleteNewsWithAuth = async (
  id: string,
  adminId: string,
): Promise<void> => {
  await assertAdmin(adminId);
  const supabase = await createServerClient();
  const imagePath = await getNewsPostImagePath(supabase, id);
  if (imagePath) {
    const { error: removeErr } = await supabase.storage.from('news').remove([imagePath]);
    if (removeErr) {
      log.warn({ err: removeErr.message, postId: id }, 'Failed to remove news image from storage');
    }
  }
  await deleteNewsPost(supabase, id);
  log.info({ postId: id, adminId }, 'News post deleted');
};

export const uploadNewsImageWithAuth = async (
  postId: string,
  file: File,
  adminId: string,
): Promise<void> => {
  await assertAdmin(adminId);
  const validated = validateNewsImageFile(file);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const supabase = await createServerClient();
  const previousPath = await getNewsPostImagePath(supabase, postId);
  const objectPath = `${postId}/image.${validated.ext}`;

  const { error: uploadError } = await supabase.storage
    .from('news')
    .upload(objectPath, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    throw new Error(`Error al subir: ${uploadError.message}`);
  }

  if (previousPath && previousPath !== objectPath) {
    await supabase.storage.from('news').remove([previousPath]);
  }

  await setNewsPostImagePath(supabase, { id: postId, imagePath: objectPath });
  log.info({ postId, adminId, objectPath }, 'News post image set');
};

export const removeNewsImageWithAuth = async (postId: string, adminId: string): Promise<void> => {
  await assertAdmin(adminId);
  const supabase = await createServerClient();
  const path = await getNewsPostImagePath(supabase, postId);
  if (path) {
    const { error: removeErr } = await supabase.storage.from('news').remove([path]);
    if (removeErr) {
      log.warn({ err: removeErr.message, postId }, 'Failed to remove news image from storage');
    }
  }
  await setNewsPostImagePath(supabase, { id: postId, imagePath: null });
  log.info({ postId, adminId }, 'News post image removed');
};
