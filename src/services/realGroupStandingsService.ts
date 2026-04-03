import 'server-only';

import { createServiceLogger } from '@/lib/logger';
import { createServerClient } from '@/lib/supabase/server';
import * as realGroupStandingsRepository from '@/repositories/realGroupStandingsRepository';
import type { RealGroupStandingRow } from '@/repositories/realGroupStandingsRepository';
import { isAdmin } from '@/services/adminService';
import { GROUP_NAMES } from '@/constants/tournament';
import type { GroupName } from '@/types/tournament';

const log = createServiceLogger('realGroupStandingsService');

const GROUP_LETTERS = new Set<string>(GROUP_NAMES);

export const listRealGroupStandingsGrouped = async (): Promise<
  Partial<Record<GroupName, string[]>>
> => {
  const supabase = await createServerClient();
  const rows = await realGroupStandingsRepository.listAllRealGroupStandings(supabase);
  const byGroup = new Map<string, RealGroupStandingRow[]>();
  for (const r of rows) {
    const list = byGroup.get(r.group_id) ?? [];
    list.push(r);
    byGroup.set(r.group_id, list);
  }
  const out: Partial<Record<GroupName, string[]>> = {};
  for (const [gid, list] of byGroup) {
    if (list.length !== 4) continue;
    const sorted = [...list].sort((a, b) => a.position - b.position);
    out[gid as GroupName] = sorted.map((x) => x.team_id);
  }
  return out;
};

/**
 * Saves exact order 1st → 4th for a group. Recomputes scores when used by scoring (via view).
 */
export const saveRealGroupStandingsOverrideWithAuth = async (
  adminId: string,
  groupId: GroupName,
  order: string[],
): Promise<void> => {
  const admin = await isAdmin(adminId);
  if (!admin) {
    log.warn({ adminId, groupId }, 'saveRealGroupStandingsOverride denied');
    throw new Error('Forbidden');
  }

  if (!GROUP_LETTERS.has(groupId)) {
    throw new Error('Invalid group');
  }

  if (order.length !== 4) {
    throw new Error('Tenés que definir las 4 posiciones');
  }

  const unique = new Set(order);
  if (unique.size !== 4) {
    throw new Error('Las cuatro posiciones deben ser equipos distintos');
  }

  const supabase = await createServerClient();
  const { data: groupTeams, error: teamErr } = await supabase
    .from('teams')
    .select('id')
    .eq('group_id', groupId);

  if (teamErr) {
    throw new Error(teamErr.message);
  }

  const expected = new Set((groupTeams ?? []).map((t) => t.id));
  if (expected.size !== 4) {
    throw new Error('El grupo no tiene 4 equipos en la base');
  }

  for (const id of order) {
    if (!expected.has(id)) {
      throw new Error('Todos los equipos deben pertenecer al grupo seleccionado');
    }
  }

  const rows = order.map((teamId, idx) => ({
    teamId,
    position: idx + 1,
  }));

  await realGroupStandingsRepository.replaceRealGroupStandingsForGroup(supabase, groupId, rows);
  log.info({ adminId, groupId }, 'Real group standings override saved');
};

export const clearRealGroupStandingsOverrideWithAuth = async (
  adminId: string,
  groupId: GroupName,
): Promise<void> => {
  const admin = await isAdmin(adminId);
  if (!admin) {
    log.warn({ adminId, groupId }, 'clearRealGroupStandingsOverride denied');
    throw new Error('Forbidden');
  }

  if (!GROUP_LETTERS.has(groupId)) {
    throw new Error('Invalid group');
  }

  const supabase = await createServerClient();
  await realGroupStandingsRepository.deleteRealGroupStandingsByGroupId(supabase, groupId);
  log.info({ adminId, groupId }, 'Real group standings override cleared');
};
