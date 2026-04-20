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
  pred_home_team_id?: string | null;
  pred_away_team_id?: string | null;
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

/** Elimina la fila `predictions` y dependencias (CASCADE). Devuelve si había fila. */
export const deletePredictionByUserId = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('predictions')
    .delete()
    .eq('user_id', userId)
    .select('id');

  if (error) throw new Error(`predictions.delete by user failed: ${error.message}`);
  return (data?.length ?? 0) > 0;
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

export const listSubmittedPredictionUserIds = async (
  supabase: SupabaseClient,
): Promise<string[]> => {
  const { data, error } = await supabase.rpc('list_submitted_prediction_user_ids');

  if (error) {
    throw new Error(`list_submitted_prediction_user_ids rpc failed: ${error.message}`);
  }
  return ((data ?? []) as { user_id: string }[]).map((r) => r.user_id);
};

type ProfileSnippet = {
  display_name: string;
  email: string;
  avatar_url: string | null;
};

type SubmittedPredictionProfileRow = {
  user_id: string;
  submitted_at: string;
  updated_at: string;
  profiles: ProfileSnippet | ProfileSnippet[] | null;
};

export const listSubmittedPredictionsWithProfilesForAdmin = async (
  supabase: SupabaseClient,
): Promise<
  Array<{
    userId: string;
    displayName: string;
    email: string;
    avatarUrl: string | null;
    submittedAt: string;
    updatedAt: string;
  }>
> => {
  const { data, error } = await supabase
    .from('predictions')
    .select('user_id, submitted_at, updated_at, profiles(display_name, email, avatar_url)')
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false });

  if (error) {
    throw new Error(`predictions.select submitted for admin failed: ${error.message}`);
  }

  return ((data ?? []) as SubmittedPredictionProfileRow[]).map((row) => {
    const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      userId: row.user_id,
      displayName: prof?.display_name ?? '—',
      email: prof?.email ?? '—',
      avatarUrl: prof?.avatar_url ?? null,
      submittedAt: row.submitted_at,
      updatedAt: row.updated_at,
    };
  });
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
    .select(
      'id, prediction_id, match_id, home_goals, away_goals, winner_team_id, pred_home_team_id, pred_away_team_id, matches ( id, stage, home_team_id, away_team_id )',
    )
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

export const replacePredictionBestThirdQualifiers = async (
  supabase: SupabaseClient,
  predictionId: string,
  rows: Array<{
    combination_line: number;
    qualifying_groups_key: string;
    excluded_groups_key: string;
    rank_pos: number;
    group_id: string;
    team_id: string;
    round_of_32_match_number: number;
    opponent_source: string;
  }>,
): Promise<void> => {
  const { error: delError } = await supabase
    .from('prediction_best_third_place_qualifiers')
    .delete()
    .eq('prediction_id', predictionId);

  if (delError) {
    throw new Error(
      `prediction_best_third_place_qualifiers.delete failed: ${delError.message}`,
    );
  }

  if (rows.length === 0) return;

  const now = new Date().toISOString();
  const withParent = rows.map((r) => ({
    prediction_id: predictionId,
    updated_at: now,
    combination_line: r.combination_line,
    qualifying_groups_key: r.qualifying_groups_key,
    excluded_groups_key: r.excluded_groups_key,
    rank_pos: r.rank_pos,
    group_id: r.group_id,
    team_id: r.team_id,
    round_of_32_match_number: r.round_of_32_match_number,
    opponent_source: r.opponent_source,
  }));

  const { error: insError } = await supabase
    .from('prediction_best_third_place_qualifiers')
    .insert(withParent);

  if (insError) {
    throw new Error(
      `prediction_best_third_place_qualifiers.insert failed: ${insError.message}`,
    );
  }
};

export const upsertPredictionMatch = async (
  supabase: SupabaseClient,
  row: {
    prediction_id: string;
    match_id: string;
    home_goals: number;
    away_goals: number;
    winner_team_id: string | null;
    pred_home_team_id?: string | null;
    pred_away_team_id?: string | null;
  },
): Promise<void> => {
  const { error } = await supabase.from('prediction_matches').upsert(
    {
      prediction_id: row.prediction_id,
      match_id: row.match_id,
      home_goals: row.home_goals,
      away_goals: row.away_goals,
      winner_team_id: row.winner_team_id,
      pred_home_team_id: row.pred_home_team_id ?? null,
      pred_away_team_id: row.pred_away_team_id ?? null,
    },
    { onConflict: 'prediction_id,match_id' },
  );

  if (error) throw new Error(`prediction_matches.upsert failed: ${error.message}`);
};

export const deletePredictionMatch = async (
  supabase: SupabaseClient,
  predictionId: string,
  matchId: string,
): Promise<void> => {
  const { error } = await supabase
    .from('prediction_matches')
    .delete()
    .eq('prediction_id', predictionId)
    .eq('match_id', matchId);

  if (error) throw new Error(`prediction_matches.delete failed: ${error.message}`);
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
