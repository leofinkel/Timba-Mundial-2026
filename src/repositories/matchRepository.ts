import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

export type MatchRow = {
  id: string;
  stage: string;
  group_id: string | null;
  match_number: number;
  matchday: number | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_goals: number | null;
  away_goals: number | null;
  winner_team_id: string | null;
  home_source: string | null;
  away_source: string | null;
  played_at: string | null;
  created_at: string;
};

export const updateMatchResult = async (
  supabase: SupabaseClient,
  matchId: string,
  homeGoals: number,
  awayGoals: number,
): Promise<MatchRow> => {
  const { data: existing, error: fetchError } = await supabase
    .from('matches')
    .select('home_team_id, away_team_id')
    .eq('id', matchId)
    .single();

  if (fetchError) throw new Error(`matches.select failed: ${fetchError.message}`);

  const homeId = (existing as { home_team_id: string | null }).home_team_id;
  const awayId = (existing as { away_team_id: string | null }).away_team_id;

  let winnerTeamId: string | null = null;
  if (homeGoals > awayGoals) winnerTeamId = homeId;
  else if (awayGoals > homeGoals) winnerTeamId = awayId;
  else winnerTeamId = null;

  const { data, error } = await supabase
    .from('matches')
    .update({
      home_goals: homeGoals,
      away_goals: awayGoals,
      winner_team_id: winnerTeamId,
    })
    .eq('id', matchId)
    .select('*')
    .single();

  if (error) throw new Error(`matches.update result failed: ${error.message}`);
  return data as MatchRow;
};

export const listMatches = async (
  supabase: SupabaseClient,
  stage?: string,
): Promise<MatchRow[]> => {
  let q = supabase.from('matches').select('*').order('match_number', { ascending: true });
  if (stage) q = q.eq('stage', stage);

  const { data, error } = await q;

  if (error) throw new Error(`matches.select failed: ${error.message}`);
  return (data as MatchRow[]) ?? [];
};

export const countMatchesWithResults = async (
  supabase: SupabaseClient,
): Promise<number> => {
  const { count, error } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .not('home_goals', 'is', null)
    .not('away_goals', 'is', null);

  if (error) throw new Error(`matches.count with results failed: ${error.message}`);
  return count ?? 0;
};

export const createMatch = async (
  supabase: SupabaseClient,
  input: Omit<MatchRow, 'id' | 'home_goals' | 'away_goals' | 'winner_team_id' | 'created_at'>,
): Promise<MatchRow> => {
  const { data, error } = await supabase
    .from('matches')
    .insert({
      stage: input.stage,
      group_id: input.group_id,
      match_number: input.match_number,
      matchday: input.matchday,
      home_team_id: input.home_team_id,
      away_team_id: input.away_team_id,
      home_source: input.home_source,
      away_source: input.away_source,
      played_at: input.played_at,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`matches.insert failed: ${error.message}`);
  }

  return data as MatchRow;
};

export const updateMatch = async (
  supabase: SupabaseClient,
  id: string,
  input: Omit<MatchRow, 'id' | 'home_goals' | 'away_goals' | 'winner_team_id' | 'created_at'>,
): Promise<MatchRow> => {
  const { data, error } = await supabase
    .from('matches')
    .update({
      stage: input.stage,
      group_id: input.group_id,
      match_number: input.match_number,
      matchday: input.matchday,
      home_team_id: input.home_team_id,
      away_team_id: input.away_team_id,
      home_source: input.home_source,
      away_source: input.away_source,
      played_at: input.played_at,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(`matches.update failed: ${error.message}`);
  }

  return data as MatchRow;
};

export const deleteMatch = async (
  supabase: SupabaseClient,
  id: string,
): Promise<void> => {
  const { error } = await supabase.from('matches').delete().eq('id', id);
  if (error) {
    throw new Error(`matches.delete failed: ${error.message}`);
  }
};
