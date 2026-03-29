import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

export type RealResultsRow = {
  id: string;
  top_scorer: string | null;
  best_player: string | null;
  champion_team_id: string | null;
  runner_up_team_id: string | null;
  third_place_team_id: string | null;
  fourth_place_team_id: string | null;
  updated_at: string;
};

export const getLatestRealResults = async (
  supabase: SupabaseClient,
): Promise<RealResultsRow | null> => {
  const { data, error } = await supabase
    .from('real_results')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`real_results.select latest failed: ${error.message}`);
  return data as RealResultsRow | null;
};

export type SaveSpecialResultsInput = {
  topScorer: string | null;
  bestPlayer: string | null;
  championTeamId: string | null;
  runnerUpTeamId: string | null;
  thirdPlaceTeamId: string | null;
  fourthPlaceTeamId: string | null;
};

export const upsertLatestRealResults = async (
  supabase: SupabaseClient,
  input: SaveSpecialResultsInput,
): Promise<RealResultsRow> => {
  const latest = await getLatestRealResults(supabase);

  const payload = {
    top_scorer: input.topScorer,
    best_player: input.bestPlayer,
    champion_team_id: input.championTeamId,
    runner_up_team_id: input.runnerUpTeamId,
    third_place_team_id: input.thirdPlaceTeamId,
    fourth_place_team_id: input.fourthPlaceTeamId,
  };

  if (latest?.id) {
    const { data, error } = await supabase
      .from('real_results')
      .update(payload)
      .eq('id', latest.id)
      .select('*')
      .single();

    if (error) throw new Error(`real_results.update failed: ${error.message}`);
    return data as RealResultsRow;
  }

  const { data, error } = await supabase
    .from('real_results')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw new Error(`real_results.insert failed: ${error.message}`);
  return data as RealResultsRow;
};
