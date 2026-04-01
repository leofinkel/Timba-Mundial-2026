import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { NewsPost } from '@/types/news';

type NewsPostRow = {
  id: string;
  title: string;
  body: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  profiles: { display_name: string } | null;
};

const mapRow = (row: NewsPostRow): NewsPost => ({
  id: row.id,
  title: row.title,
  body: row.body,
  authorId: row.author_id,
  authorName: row.profiles?.display_name ?? 'Admin',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const listNewsPosts = async (
  supabase: SupabaseClient,
  limit = 10,
): Promise<NewsPost[]> => {
  const { data, error } = await supabase
    .from('news_posts')
    .select('*, profiles:author_id(display_name)')
    .order('created_at', { ascending: false })
    .limit(limit);

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
  input: { id: string; title: string; body: string },
): Promise<NewsPost> => {
  const { data, error } = await supabase
    .from('news_posts')
    .update({ title: input.title, body: input.body })
    .eq('id', input.id)
    .select('*, profiles:author_id(display_name)')
    .single();

  if (error) {
    throw new Error(`news_posts.update failed: ${error.message}`);
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
