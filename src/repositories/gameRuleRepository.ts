import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { AdminGameRule } from '@/types/admin';

type GameRuleRow = {
  id: string;
  title: string;
  content: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const mapRow = (row: GameRuleRow): AdminGameRule => ({
  id: row.id,
  title: row.title,
  content: row.content,
  sortOrder: row.sort_order,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const listGameRules = async (
  supabase: SupabaseClient,
): Promise<AdminGameRule[]> => {
  const { data, error } = await supabase
    .from('game_rules')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`game_rules.select failed: ${error.message}`);
  }

  return (data as GameRuleRow[]).map(mapRow);
};

export const createGameRule = async (
  supabase: SupabaseClient,
  input: Pick<AdminGameRule, 'title' | 'content' | 'sortOrder' | 'isActive'>,
): Promise<AdminGameRule> => {
  const { data, error } = await supabase
    .from('game_rules')
    .insert({
      title: input.title,
      content: input.content,
      sort_order: input.sortOrder,
      is_active: input.isActive,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`game_rules.insert failed: ${error.message}`);
  }

  return mapRow(data as GameRuleRow);
};

export const updateGameRule = async (
  supabase: SupabaseClient,
  input: Pick<AdminGameRule, 'id' | 'title' | 'content' | 'sortOrder' | 'isActive'>,
): Promise<AdminGameRule> => {
  const { data, error } = await supabase
    .from('game_rules')
    .update({
      title: input.title,
      content: input.content,
      sort_order: input.sortOrder,
      is_active: input.isActive,
    })
    .eq('id', input.id)
    .select('*')
    .single();

  if (error) {
    throw new Error(`game_rules.update failed: ${error.message}`);
  }

  return mapRow(data as GameRuleRow);
};

export const deleteGameRule = async (
  supabase: SupabaseClient,
  id: string,
): Promise<void> => {
  const { error } = await supabase.from('game_rules').delete().eq('id', id);
  if (error) {
    throw new Error(`game_rules.delete failed: ${error.message}`);
  }
};
