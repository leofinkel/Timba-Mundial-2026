import 'server-only';

import { createServiceLogger } from '@/lib/logger';
import {
  rankThirdPlaceTeams,
  resolveDirectSource,
  solveBipartiteMatching,
  THIRD_PLACE_SLOTS,
} from '@/lib/knockout/thirdPlaceAllocation';
import type { ThirdPlaceTeam } from '@/lib/knockout/thirdPlaceAllocation';
import { createServerClient } from '@/lib/supabase/server';

const log = createServiceLogger('knockoutService');

type StandingRow = {
  group_id: string;
  team_id: string;
  position: number;
  points: number;
  goal_difference: number;
  goals_for: number;
};

const GROUP_MATCH_TOTAL = 72;

/**
 * Checks whether all 72 group-stage matches have results,
 * and if so, populates every Round-of-32 match with the correct teams
 * based on group standings + best-third allocation.
 */
export const populateRoundOf32 = async (): Promise<boolean> => {
  const supabase = await createServerClient();

  const { count, error: countErr } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('stage', 'group')
    .not('home_goals', 'is', null)
    .not('away_goals', 'is', null);

  if (countErr) {
    log.error({ err: countErr }, 'populateRoundOf32: count failed');
    throw new Error(countErr.message);
  }

  if ((count ?? 0) < GROUP_MATCH_TOTAL) {
    log.debug({ played: count }, 'Group stage not yet complete');
    return false;
  }

  const { data: r32Check } = await supabase
    .from('matches')
    .select('home_team_id')
    .eq('stage', 'round-of-32')
    .not('home_team_id', 'is', null)
    .limit(1);

  if (r32Check && r32Check.length > 0) {
    log.debug('R32 already populated');
    return false;
  }

  const { data: standings, error: standErr } = await supabase
    .from('group_standings')
    .select('group_id, team_id, position, points, goal_difference, goals_for');

  if (standErr || !standings) {
    log.error({ err: standErr }, 'populateRoundOf32: standings query failed');
    throw new Error(standErr?.message ?? 'No standings data');
  }

  const typedStandings = standings as StandingRow[];

  const standingsByGroup = new Map<string, string[]>();
  for (const s of typedStandings) {
    if (!standingsByGroup.has(s.group_id)) standingsByGroup.set(s.group_id, []);
    const arr = standingsByGroup.get(s.group_id)!;
    arr[s.position - 1] = s.team_id;
  }

  const thirds: ThirdPlaceTeam[] = typedStandings
    .filter((s) => s.position === 3)
    .map((s) => ({
      groupId: s.group_id,
      teamId: s.team_id,
      points: s.points,
      goalDifference: s.goal_difference,
      goalsFor: s.goals_for,
    }));

  const ranked = rankThirdPlaceTeams(thirds);
  const qualifying = ranked.slice(0, 8);
  const qualifyingGroups = qualifying.map((t) => t.groupId).sort();
  const allocation = solveBipartiteMatching(qualifyingGroups, THIRD_PLACE_SLOTS);

  const thirdTeamByGroup = new Map<string, string>();
  for (const t of qualifying) {
    thirdTeamByGroup.set(t.groupId, t.teamId);
  }

  const { data: r32Matches, error: r32Err } = await supabase
    .from('matches')
    .select('id, match_number, home_source, away_source')
    .eq('stage', 'round-of-32')
    .order('match_number');

  if (r32Err || !r32Matches) {
    log.error({ err: r32Err }, 'populateRoundOf32: R32 query failed');
    throw new Error(r32Err?.message ?? 'No R32 matches');
  }

  for (const m of r32Matches) {
    let homeTeamId: string | null = null;
    let awayTeamId: string | null = null;

    if (m.home_source) {
      homeTeamId = resolveDirectSource(m.home_source, standingsByGroup);
    }

    if (m.away_source) {
      if (m.away_source.startsWith('3-')) {
        for (const [group, matchNum] of allocation) {
          if (matchNum === m.match_number) {
            awayTeamId = thirdTeamByGroup.get(group) ?? null;
            break;
          }
        }
      } else {
        awayTeamId = resolveDirectSource(m.away_source, standingsByGroup);
      }
    }

    if (homeTeamId || awayTeamId) {
      const update: Record<string, string | null> = {};
      if (homeTeamId) update.home_team_id = homeTeamId;
      if (awayTeamId) update.away_team_id = awayTeamId;

      const { error: upErr } = await supabase
        .from('matches')
        .update(update)
        .eq('id', m.id);

      if (upErr) {
        log.error({ err: upErr, matchNumber: m.match_number }, 'R32 team update failed');
      }
    }
  }

  log.info(
    { qualifyingThirds: qualifyingGroups.join(',') },
    'Round of 32 populated',
  );
  return true;
};

/**
 * After setting a knockout winner, advance that team to the next bracket match.
 * Also handles RU (runner-up / loser) references for the third-place match.
 */
export const advanceKnockoutWinner = async (
  matchId: string,
  winnerTeamId: string,
): Promise<void> => {
  const supabase = await createServerClient();

  const { data: match, error: mErr } = await supabase
    .from('matches')
    .select('match_number, home_team_id, away_team_id')
    .eq('id', matchId)
    .single();

  if (mErr || !match) {
    log.error({ err: mErr, matchId }, 'advanceKnockoutWinner: match not found');
    return;
  }

  const winSrc = `W${match.match_number}`;
  const loseSrc = `RU${match.match_number}`;
  const loserTeamId =
    match.home_team_id === winnerTeamId
      ? match.away_team_id
      : match.home_team_id;

  const { data: nextMatches, error: nErr } = await supabase
    .from('matches')
    .select('id, match_number, home_source, away_source')
    .or(
      `home_source.eq.${winSrc},away_source.eq.${winSrc},home_source.eq.${loseSrc},away_source.eq.${loseSrc}`,
    );

  if (nErr || !nextMatches || nextMatches.length === 0) {
    log.debug({ matchNumber: match.match_number }, 'No subsequent matches');
    return;
  }

  for (const nm of nextMatches) {
    const update: Record<string, string | null> = {};

    if (nm.home_source === winSrc) update.home_team_id = winnerTeamId;
    if (nm.away_source === winSrc) update.away_team_id = winnerTeamId;
    if (nm.home_source === loseSrc && loserTeamId)
      update.home_team_id = loserTeamId;
    if (nm.away_source === loseSrc && loserTeamId)
      update.away_team_id = loserTeamId;

    if (Object.keys(update).length > 0) {
      const { error: upErr } = await supabase
        .from('matches')
        .update(update)
        .eq('id', nm.id);

      if (upErr) {
        log.error({ err: upErr, toMatch: nm.match_number }, 'Advance failed');
      } else {
        log.info(
          { from: match.match_number, to: nm.match_number, update },
          'Team advanced',
        );
      }
    }
  }
};
