import 'server-only';

import { createServiceLogger } from '@/lib/logger';
import {
  buildThirdPlaceRow,
  isThirdPlaceKnockoutSource,
  lookupOfficialThirdPlaceAllocation,
  rankThirdPlaceTeams,
  resolveDirectSource,
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

type TeamRankingRow = {
  id: string;
  fifa_ranking: number | null;
  group_stage_fair_play_score: number | null;
};

const GROUP_MATCH_TOTAL = 72;

/**
 * When all 72 group-stage matches have results, fills Round-of-32 `home_team_id` /
 * `away_team_id` from standings + official third-place matrix (495 combinations).
 * Idempotent: skips matches that already have a stored result; refills any still-open slot
 * (e.g. after a partial run or standings correction before 16avos are played).
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

  const [{ data: standings, error: standErr }, { data: teamRanking, error: teamErr }] =
    await Promise.all([
      supabase
        .from('group_standings')
        .select('group_id, team_id, position, points, goal_difference, goals_for'),
      supabase.from('teams').select('id, fifa_ranking, group_stage_fair_play_score'),
    ]);

  if (standErr || !standings) {
    log.error({ err: standErr }, 'populateRoundOf32: standings query failed');
    throw new Error(standErr?.message ?? 'No standings data');
  }
  if (teamErr) {
    log.error({ err: teamErr }, 'populateRoundOf32: teams ranking query failed');
    throw new Error(teamErr.message);
  }

  const typedStandings = standings as StandingRow[];
  const teamMeta = new Map(
    ((teamRanking ?? []) as TeamRankingRow[]).map((t) => [t.id, t]),
  );

  const standingsByGroup = new Map<string, string[]>();
  for (const s of typedStandings) {
    if (!standingsByGroup.has(s.group_id)) standingsByGroup.set(s.group_id, []);
    const arr = standingsByGroup.get(s.group_id)!;
    arr[s.position - 1] = s.team_id;
  }

  const thirds: ThirdPlaceTeam[] = typedStandings
    .filter((s) => s.position === 3)
    .map((s) => {
      const tr = teamMeta.get(s.team_id);
      return buildThirdPlaceRow({
        groupId: s.group_id,
        teamId: s.team_id,
        points: s.points,
        goalDifference: s.goal_difference,
        goalsFor: s.goals_for,
        fairPlayScore: tr?.group_stage_fair_play_score ?? undefined,
        fifaRank: tr?.fifa_ranking ?? undefined,
      });
    });

  const ranked = rankThirdPlaceTeams(thirds);
  const qualifying = ranked.slice(0, 8);
  const qualifyingGroups = qualifying.map((t) => t.groupId);
  const allocation = lookupOfficialThirdPlaceAllocation(qualifyingGroups);

  const thirdTeamByGroup = new Map<string, string>();
  for (const t of qualifying) {
    thirdTeamByGroup.set(t.groupId, t.teamId);
  }

  const { data: r32Matches, error: r32Err } = await supabase
    .from('matches')
    .select(
      'id, match_number, home_source, away_source, home_goals, away_goals, home_team_id, away_team_id',
    )
    .eq('stage', 'round-of-32')
    .order('match_number');

  if (r32Err || !r32Matches) {
    log.error({ err: r32Err }, 'populateRoundOf32: R32 query failed');
    throw new Error(r32Err?.message ?? 'No R32 matches');
  }

  const resolveThirdForMatch = (matchNumber: number): string | null => {
    for (const [group, matchNum] of allocation) {
      if (matchNum === matchNumber) return thirdTeamByGroup.get(group) ?? null;
    }
    return null;
  };

  let updatedRows = 0;

  for (const m of r32Matches) {
    if (m.home_goals != null && m.away_goals != null) {
      continue;
    }

    let homeComputed: string | null = null;
    let awayComputed: string | null = null;

    if (m.home_source) {
      if (isThirdPlaceKnockoutSource(m.home_source)) {
        homeComputed = resolveThirdForMatch(m.match_number);
      } else {
        homeComputed = resolveDirectSource(m.home_source, standingsByGroup);
      }
    }

    if (m.away_source) {
      if (isThirdPlaceKnockoutSource(m.away_source)) {
        awayComputed = resolveThirdForMatch(m.match_number);
      } else {
        awayComputed = resolveDirectSource(m.away_source, standingsByGroup);
      }
    }

    const nextHome = homeComputed ?? m.home_team_id ?? null;
    const nextAway = awayComputed ?? m.away_team_id ?? null;

    if (nextHome === m.home_team_id && nextAway === m.away_team_id) {
      continue;
    }

    const { error: upErr } = await supabase
      .from('matches')
      .update({ home_team_id: nextHome, away_team_id: nextAway })
      .eq('id', m.id);

    if (upErr) {
      log.error({ err: upErr, matchNumber: m.match_number }, 'R32 team update failed');
    } else {
      updatedRows += 1;
    }
  }

  log.info(
    { qualifyingThirds: qualifyingGroups.join(','), updatedRows },
    'Round of 32 populated',
  );
  return updatedRows > 0;
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
