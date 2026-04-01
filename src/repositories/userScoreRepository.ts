import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { AdminClassificationEntry } from '@/types/admin';
import type { UserScoreBreakdown } from '@/types/scoring';

type UserScoreRow = {
  id: string;
  user_id: string;
  group_match_points: number;
  exact_result_bonus: number;
  group_position_points: number;
  round_of_32_points: number;
  round_of_16_points: number;
  quarter_final_points: number;
  semi_final_points: number;
  finalist_points: number;
  champion_points: number;
  runner_up_points: number;
  third_place_points: number;
  fourth_place_points: number;
  top_scorer_points: number;
  best_player_points: number;
  total_points: number;
  rank: number | null;
  updated_at: string;
};

const mapRow = (row: UserScoreRow): UserScoreBreakdown => ({
  userId: row.user_id,
  groupMatchPoints: row.group_match_points,
  exactResultBonus: row.exact_result_bonus,
  groupPositionPoints: row.group_position_points,
  roundOf32Points: row.round_of_32_points,
  roundOf16Points: row.round_of_16_points,
  quarterFinalPoints: row.quarter_final_points,
  semiFinalPoints: row.semi_final_points,
  finalistPoints: row.finalist_points,
  championPoints: row.champion_points,
  runnerUpPoints: row.runner_up_points,
  thirdPlacePoints: row.third_place_points,
  fourthPlacePoints: row.fourth_place_points,
  topScorerPoints: row.top_scorer_points,
  bestPlayerPoints: row.best_player_points,
  totalPoints: row.total_points,
  rank: row.rank,
  updatedAt: row.updated_at,
});

export const getUserScoreByUserId = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<UserScoreBreakdown | null> => {
  const { data, error } = await supabase
    .from('user_scores')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`user_scores.select failed: ${error.message}`);
  if (!data) return null;
  return mapRow(data as UserScoreRow);
};

export const upsertUserScore = async (
  supabase: SupabaseClient,
  breakdown: Omit<UserScoreBreakdown, 'rank' | 'updatedAt'> & { rank?: number | null },
): Promise<UserScoreBreakdown> => {
  const payload = {
    user_id: breakdown.userId,
    group_match_points: breakdown.groupMatchPoints,
    exact_result_bonus: breakdown.exactResultBonus,
    group_position_points: breakdown.groupPositionPoints,
    round_of_32_points: breakdown.roundOf32Points,
    round_of_16_points: breakdown.roundOf16Points,
    quarter_final_points: breakdown.quarterFinalPoints,
    semi_final_points: breakdown.semiFinalPoints,
    finalist_points: breakdown.finalistPoints,
    champion_points: breakdown.championPoints,
    runner_up_points: breakdown.runnerUpPoints,
    third_place_points: breakdown.thirdPlacePoints,
    fourth_place_points: breakdown.fourthPlacePoints,
    top_scorer_points: breakdown.topScorerPoints,
    best_player_points: breakdown.bestPlayerPoints,
    total_points: breakdown.totalPoints,
    rank: breakdown.rank ?? null,
  };

  const { data, error } = await supabase
    .from('user_scores')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) throw new Error(`user_scores.upsert failed: ${error.message}`);
  return mapRow(data as UserScoreRow);
};

export const listScoresOrderedByPoints = async (
  supabase: SupabaseClient,
): Promise<UserScoreBreakdown[]> => {
  const { data, error } = await supabase.rpc('list_leaderboard_scores');

  if (error) throw new Error(`list_leaderboard_scores rpc failed: ${error.message}`);
  return ((data ?? []) as UserScoreRow[]).map(mapRow);
};

export const updateRanksBulk = async (
  supabase: SupabaseClient,
  userIdToRank: Map<string, number>,
): Promise<void> => {
  const updates = [...userIdToRank.entries()].map(([user_id, rank]) =>
    supabase.from('user_scores').update({ rank }).eq('user_id', user_id),
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(`user_scores.rank bulk update failed: ${failed.error.message}`);
};

type AdminClassificationRow = {
  user_id: string;
  total_points: number;
  rank: number | null;
  updated_at: string;
  profiles: Array<{
    display_name: string;
    email: string;
  }>;
};

export const listAdminClassificationEntries = async (
  supabase: SupabaseClient,
): Promise<AdminClassificationEntry[]> => {
  const { data, error } = await supabase
    .from('user_scores')
    .select('user_id, total_points, rank, updated_at, profiles(display_name, email)')
    .order('rank', { ascending: true, nullsFirst: false })
    .order('total_points', { ascending: false });

  if (error) {
    throw new Error(`user_scores.select for admin classification failed: ${error.message}`);
  }

  return ((data ?? []) as AdminClassificationRow[]).map((row) => ({
    userId: row.user_id,
    displayName: row.profiles[0]?.display_name ?? 'Sin perfil',
    email: row.profiles[0]?.email ?? '—',
    totalPoints: row.total_points,
    rank: row.rank,
    updatedAt: row.updated_at,
  }));
};

export const upsertAdminClassificationEntry = async (
  supabase: SupabaseClient,
  input: { userId: string; totalPoints: number; rank: number | null },
): Promise<void> => {
  const { error } = await supabase.from('user_scores').upsert(
    {
      user_id: input.userId,
      total_points: input.totalPoints,
      rank: input.rank,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    throw new Error(`user_scores.upsert admin classification failed: ${error.message}`);
  }
};

export const deleteAdminClassificationEntry = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<void> => {
  const { error } = await supabase.from('user_scores').delete().eq('user_id', userId);
  if (error) {
    throw new Error(`user_scores.delete admin classification failed: ${error.message}`);
  }
};
