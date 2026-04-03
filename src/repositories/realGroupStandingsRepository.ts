import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

export type RealGroupStandingRow = {
  group_id: string;
  team_id: string;
  position: number;
};

export const listAllRealGroupStandings = async (
  supabase: SupabaseClient,
): Promise<RealGroupStandingRow[]> => {
  const { data, error } = await supabase
    .from('real_group_standings')
    .select('group_id, team_id, position')
    .order('group_id', { ascending: true })
    .order('position', { ascending: true });

  if (error) {
    throw new Error(`real_group_standings.select failed: ${error.message}`);
  }

  return (data ?? []) as RealGroupStandingRow[];
};

export const deleteRealGroupStandingsByGroupId = async (
  supabase: SupabaseClient,
  groupId: string,
): Promise<void> => {
  const { error } = await supabase.from('real_group_standings').delete().eq('group_id', groupId);

  if (error) {
    throw new Error(`real_group_standings.delete failed: ${error.message}`);
  }
};

export const replaceRealGroupStandingsForGroup = async (
  supabase: SupabaseClient,
  groupId: string,
  rows: { teamId: string; position: number }[],
): Promise<void> => {
  const { error: delError } = await supabase
    .from('real_group_standings')
    .delete()
    .eq('group_id', groupId);

  if (delError) {
    throw new Error(`real_group_standings.delete failed: ${delError.message}`);
  }

  if (rows.length === 0) return;

  const { error: insError } = await supabase.from('real_group_standings').insert(
    rows.map((r) => ({
      group_id: groupId,
      team_id: r.teamId,
      position: r.position,
    })),
  );

  if (insError) {
    throw new Error(`real_group_standings.insert failed: ${insError.message}`);
  }
};
