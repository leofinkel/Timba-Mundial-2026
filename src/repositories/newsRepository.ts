import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { NewsPost } from '@/types/news';

type NewsPostRow = {
  id: string;
  title: string;
  body: string;
  image_path: string | null;
  author_id: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  profiles: { display_name: string } | null;
};

const mapRow = (row: NewsPostRow): NewsPost => ({
  id: row.id,
  title: row.title,
  body: row.body,
  imagePath: row.image_path,
  authorId: row.author_id,
  authorName: row.profiles?.display_name ?? 'Admin',
  isVisible: row.is_visible,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const listNewsPosts = async (
  supabase: SupabaseClient,
  options: { limit?: number; onlyVisible: boolean },
): Promise<NewsPost[]> => {
  const limit = options.limit ?? 10;
  let q = supabase
    .from('news_posts')
    .select('*, profiles:author_id(display_name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (options.onlyVisible) {
    q = q.eq('is_visible', true);
  }

  const { data, error } = await q;

  if (error) {
    throw new Error(`news_posts.select failed: ${error.message}`);
  }

  return (data as NewsPostRow[]).map(mapRow);
};

export const createNewsPost = async (
  supabase: SupabaseClient,
  input: { title: string; body: string; authorId: string },
): Promise<NewsPost> => {
  const { data, error } = await supabase
    .from('news_posts')
    .insert({
      title: input.title,
      body: input.body,
      author_id: input.authorId,
      is_visible: true,
    })
    .select('*, profiles:author_id(display_name)')
    .single();

  if (error) {
    throw new Error(`news_posts.insert failed: ${error.message}`);
  }

  return mapRow(data as NewsPostRow);
};

export const updateNewsPost = async (
  supabase: SupabaseClient,
  input: { id: string; title: string; body: string; isVisible: boolean },
): Promise<NewsPost> => {
  const { data, error } = await supabase
    .from('news_posts')
    .update({ title: input.title, body: input.body, is_visible: input.isVisible })
    .eq('id', input.id)
    .select('*, profiles:author_id(display_name)')
    .single();

  if (error) {
    throw new Error(`news_posts.update failed: ${error.message}`);
  }

  return mapRow(data as NewsPostRow);
};

export const setNewsPostVisibility = async (
  supabase: SupabaseClient,
  input: { id: string; isVisible: boolean },
): Promise<NewsPost> => {
  const { data, error } = await supabase
    .from('news_posts')
    .update({ is_visible: input.isVisible })
    .eq('id', input.id)
    .select('*, profiles:author_id(display_name)')
    .single();

  if (error) {
    throw new Error(`news_posts.update visibility failed: ${error.message}`);
  }

  return mapRow(data as NewsPostRow);
};

export const deleteNewsPost = async (
  supabase: SupabaseClient,
  id: string,
): Promise<void> => {
  const { error } = await supabase.from('news_posts').delete().eq('id', id);
  if (error) {
    throw new Error(`news_posts.delete failed: ${error.message}`);
  }
};

export const getNewsPostImagePath = async (
  supabase: SupabaseClient,
  id: string,
): Promise<string | null> => {
  const { data, error } = await supabase
    .from('news_posts')
    .select('image_path')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`news_posts.select image_path failed: ${error.message}`);
  }

  return data?.image_path ?? null;
};

export const setNewsPostImagePath = async (
  supabase: SupabaseClient,
  input: { id: string; imagePath: string | null },
): Promise<NewsPost> => {
  const { data, error } = await supabase
    .from('news_posts')
    .update({ image_path: input.imagePath })
    .eq('id', input.id)
    .select('*, profiles:author_id(display_name)')
    .single();

  if (error) {
    throw new Error(`news_posts.update image_path failed: ${error.message}`);
  }

  return mapRow(data as NewsPostRow);
};
