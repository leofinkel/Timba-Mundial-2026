import 'server-only';

import { createServiceLogger } from '@/lib/logger';
import { createServerClient } from '@/lib/supabase/server';
import type {
  Group,
  GroupMatch,
  GroupName,
  KnockoutMatch,
  KnockoutRound,
  Team,
  Tournament,
} from '@/types/tournament';

const log = createServiceLogger('fixtureService');

type TeamRow = {
  id: string;
  name: string;
  code: string;
  flag_url: string | null;
  group_id: string | null;
};

type MatchRow = {
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
};

const mapTeamRow = (row: TeamRow): Team => ({
  id: row.id,
  name: row.name,
  code: row.code,
  flagUrl: row.flag_url ?? '',
  groupId: (row.group_id as GroupName) ?? null,
});

export const getTournament = async (): Promise<Tournament> => {
  const supabase = await createServerClient();

  const [teamsResult, matchesResult] = await Promise.all([
    supabase.from('teams').select('*').order('id'),
    supabase.from('matches').select('*').order('match_number', { ascending: true }),
  ]);

  if (teamsResult.error) {
    log.error({ err: teamsResult.error }, 'getTournament teams query failed');
    throw new Error(`Failed to load teams: ${teamsResult.error.message}`);
  }
  if (matchesResult.error) {
    log.error({ err: matchesResult.error }, 'getTournament matches query failed');
    throw new Error(`Failed to load matches: ${matchesResult.error.message}`);
  }

  const teamRows = (teamsResult.data ?? []) as TeamRow[];
  const matchRows = (matchesResult.data ?? []) as MatchRow[];

  const teamsById = new Map(teamRows.map((r) => [r.id, mapTeamRow(r)]));

  const groupMap = new Map<GroupName, { teams: Team[]; matches: GroupMatch[] }>();

  for (const t of teamRows) {
    if (!t.group_id) continue;
    const gid = t.group_id as GroupName;
    if (!groupMap.has(gid)) groupMap.set(gid, { teams: [], matches: [] });
    groupMap.get(gid)!.teams.push(mapTeamRow(t));
  }

  for (const m of matchRows) {
    if (m.stage !== 'group' || !m.group_id) continue;
    const gid = m.group_id as GroupName;
    const home = m.home_team_id ? teamsById.get(m.home_team_id) : undefined;
    const away = m.away_team_id ? teamsById.get(m.away_team_id) : undefined;
    if (!home || !away) continue;

    if (!groupMap.has(gid)) groupMap.set(gid, { teams: [], matches: [] });
    groupMap.get(gid)!.matches.push({
      id: m.id,
      groupId: gid,
      matchday: (m.matchday ?? 1) as 1 | 2 | 3,
      homeTeam: home,
      awayTeam: away,
      homeGoals: m.home_goals,
      awayGoals: m.away_goals,
    });
  }

  const groups: Group[] = [...groupMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([gid, { teams, matches }]) => ({
      id: gid,
      name: `Grupo ${gid}`,
      teams,
      matches: matches.sort((a, b) => a.matchday - b.matchday),
      standings: [],
    }));

  const knockoutMatches: KnockoutMatch[] = matchRows
    .filter((m) => m.stage !== 'group')
    .map((m) => ({
      id: m.id,
      round: m.stage as KnockoutRound,
      matchNumber: m.match_number,
      homeTeam: m.home_team_id ? teamsById.get(m.home_team_id) ?? null : null,
      awayTeam: m.away_team_id ? teamsById.get(m.away_team_id) ?? null : null,
      homeGoals: m.home_goals,
      awayGoals: m.away_goals,
      winner: m.winner_team_id ? teamsById.get(m.winner_team_id) ?? null : null,
      homeSource: m.home_source ?? '',
      awaySource: m.away_source ?? '',
    }));

  log.info(
    { groups: groups.length, knockoutMatches: knockoutMatches.length },
    'getTournament loaded',
  );

  return { groups, knockoutMatches };
};
