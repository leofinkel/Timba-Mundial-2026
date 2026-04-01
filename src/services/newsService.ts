import 'server-only';

import { createServiceLogger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';
import {
  createNewsPost,
  deleteNewsPost,
  listNewsPosts,
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
    const posts = await listNewsPosts(supabase, limit);
    log.debug({ count: posts.length }, 'listPublicNews');
    return posts;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.warn({ err: message }, 'listPublicNews failed');
    return [];
  }
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
  input: { id: string; title: string; body: string },
  adminId: string,
): Promise<NewsPost> => {
  await assertAdmin(adminId);
  const supabase = await createServerClient();
  const post = await updateNewsPost(supabase, input);
  log.info({ postId: post.id, adminId }, 'News post updated');
  return post;
};

export const deleteNewsWithAuth = async (
  id: string,
  adminId: string,
): Promise<void> => {
  await assertAdmin(adminId);
  const supabase = await createServerClient();
  await deleteNewsPost(supabase, id);
  log.info({ postId: id, adminId }, 'News post deleted');
};
