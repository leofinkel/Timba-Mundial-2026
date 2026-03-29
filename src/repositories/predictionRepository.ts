import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { GroupName } from '@/types/tournament';

export type PredictionRow = {
  id: string;
  user_id: string;
  is_locked: boolean;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PredictionMatchRow = {
  id: string;
  prediction_id: string;
  match_id: string;
  home_goals: number;
  away_goals: number;
  winner_team_id: string | null;
};

export const getPredictionByUserId = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<PredictionRow | null> => {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`predictions.select by user failed: ${error.message}`);
  return data as PredictionRow | null;
};

export const upsertPredictionRow = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<PredictionRow> => {
  const now = new Date().toISOString();
  const existing = await getPredictionByUserId(supabase, userId);
  if (existing) {
    const { data, error } = await supabase
      .from('predictions')
      .update({ submitted_at: now })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`predictions.update submitted_at failed: ${error.message}`);
    }
    return data as PredictionRow;
  }

  const { data, error } = await supabase
    .from('predictions')
    .insert({ user_id: userId, submitted_at: now })
    .select('*')
    .single();

  if (error) throw new Error(`predictions.insert failed: ${error.message}`);
  return data as PredictionRow;
};

export const lockPredictionRow = async (
  supabase: SupabaseClient,
  predictionId: string,
): Promise<PredictionRow> => {
  const { data, error } = await supabase
    .from('predictions')
    .update({
      is_locked: true,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', predictionId)
    .select('*')
    .single();

  if (error) throw new Error(`predictions.lock failed: ${error.message}`);
  return data as PredictionRow;
};

export const listPredictionUserIds = async (
  supabase: SupabaseClient,
): Promise<string[]> => {
  const { data, error } = await supabase.from('predictions').select('user_id');

  if (error) throw new Error(`predictions.select user_ids failed: ${error.message}`);
  return (data as { user_id: string }[]).map((r) => r.user_id);
};

export const countPredictionsSubmitted = async (
  supabase: SupabaseClient,
): Promise<number> => {
  const { count, error } = await supabase
    .from('predictions')
    .select('*', { count: 'exact', head: true })
    .not('submitted_at', 'is', null);

  if (error) throw new Error(`predictions.count submitted failed: ${error.message}`);
  return count ?? 0;
};

type MatchJoinRow = {
  id: string;
  stage: string;
  home_team_id: string | null;
  away_team_id: string | null;
};

export const listPredictionMatchesWithMatches = async (
  supabase: SupabaseClient,
  predictionId: string,
): Promise<Array<PredictionMatchRow & { matches: MatchJoinRow }>> => {
  const { data, error } = await supabase
    .from('prediction_matches')
    .select('id, prediction_id, match_id, home_goals, away_goals, winner_team_id, matches ( id, stage, home_team_id, away_team_id )')
    .eq('prediction_id', predictionId);

  if (error) throw new Error(`prediction_matches.select join failed: ${error.message}`);

  return (data ?? []).map((row) => {
    const m = row.matches as MatchJoinRow | MatchJoinRow[] | null;
    const matchRow = Array.isArray(m) ? m[0] : m;
    return {
      ...(row as PredictionMatchRow),
      matches: matchRow as MatchJoinRow,
    };
  });
};

export const upsertPredictionMatch = async (
  supabase: SupabaseClient,
  row: {
    prediction_id: string;
    match_id: string;
    home_goals: number;
    away_goals: number;
    winner_team_id: string | null;
  },
): Promise<void> => {
  const { error } = await supabase.from('prediction_matches').upsert(
    {
      prediction_id: row.prediction_id,
      match_id: row.match_id,
      home_goals: row.home_goals,
      away_goals: row.away_goals,
      winner_team_id: row.winner_team_id,
    },
    { onConflict: 'prediction_id,match_id' },
  );

  if (error) throw new Error(`prediction_matches.upsert failed: ${error.message}`);
};

export const replaceGroupStandings = async (
  supabase: SupabaseClient,
  predictionId: string,
  byGroup: Record<GroupName, string[]>,
): Promise<void> => {
  const { error: delError } = await supabase
    .from('prediction_group_standings')
    .delete()
    .eq('prediction_id', predictionId);

  if (delError) {
    throw new Error(`prediction_group_standings.delete failed: ${delError.message}`);
  }

  const rows: {
    prediction_id: string;
    group_id: string;
    team_id: string;
    position: number;
  }[] = [];

  (Object.entries(byGroup) as [GroupName, string[]][]).forEach(([groupId, order]) => {
    order.forEach((teamId, idx) => {
      if (!teamId) return;
      rows.push({
        prediction_id: predictionId,
        group_id: groupId,
        team_id: teamId,
        position: idx + 1,
      });
    });
  });

  if (rows.length === 0) return;

  const { error: insError } = await supabase
    .from('prediction_group_standings')
    .insert(rows);

  if (insError) {
    throw new Error(`prediction_group_standings.insert failed: ${insError.message}`);
  }
};

export const upsertPredictionSpecials = async (
  supabase: SupabaseClient,
  predictionId: string,
  topScorer: string,
  bestPlayer: string,
): Promise<void> => {
  const { error } = await supabase.from('prediction_specials').upsert(
    {
      prediction_id: predictionId,
      top_scorer: topScorer,
      best_player: bestPlayer,
    },
    { onConflict: 'prediction_id' },
  );

  if (error) throw new Error(`prediction_specials.upsert failed: ${error.message}`);
};

export const getPredictionSpecials = async (
  supabase: SupabaseClient,
  predictionId: string,
): Promise<{ top_scorer: string; best_player: string } | null> => {
  const { data, error } = await supabase
    .from('prediction_specials')
    .select('top_scorer, best_player')
    .eq('prediction_id', predictionId)
    .maybeSingle();

  if (error) throw new Error(`prediction_specials.select failed: ${error.message}`);
  if (!data) return null;
  return data as { top_scorer: string; best_player: string };
};

export const listGroupStandingsRows = async (
  supabase: SupabaseClient,
  predictionId: string,
): Promise<{ group_id: string; team_id: string; position: number }[]> => {
  const { data, error } = await supabase
    .from('prediction_group_standings')
    .select('group_id, team_id, position')
    .eq('prediction_id', predictionId);

  if (error) {
    throw new Error(`prediction_group_standings.select failed: ${error.message}`);
  }

  return (data ?? []) as { group_id: string; team_id: string; position: number }[];
};
