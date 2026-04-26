import 'server-only';

import { createServiceLogger } from '@/lib/logger';
import { createServerClient } from '@/lib/supabase/server';
import { advanceKnockoutWinner, populateRoundOf32 } from '@/services/knockoutService';
import type { FinishedMatchResult, OfficialSpecialResultsInput } from '@/types/tournament';

import { isAdmin } from '@/services/adminService';

const log = createServiceLogger('resultService');

const winnerFromGoals = (
  homeGoals: number,
  awayGoals: number,
  homeTeamId: string | null,
  awayTeamId: string | null,
): string | null => {
  if (homeGoals > awayGoals) return homeTeamId;
  if (awayGoals > homeGoals) return awayTeamId;
  return null;
};

export const saveMatchResult = async (
  matchId: string,
  homeGoals: number,
  awayGoals: number,
  adminId: string,
  winnerOverride?: string,
): Promise<FinishedMatchResult> => {
  try {
    const admin = await isAdmin(adminId);
    if (!admin) {
      log.warn({ adminId, matchId }, 'saveMatchResult denied');
      throw new Error('Only admins can save match results');
    }

    const supabase = await createServerClient();
    const { data: match, error: fetchErr } = await supabase
      .from('matches')
      .select('id, stage, group_id, home_team_id, away_team_id, played_at')
      .eq('id', matchId)
      .single();

    if (fetchErr || !match) {
      log.error({ err: fetchErr, matchId }, 'saveMatchResult match not found');
      throw new Error(fetchErr?.message ?? 'Match not found');
    }

    const isKnockout = match.stage !== 'group';
    let winnerTeamId = winnerFromGoals(
      homeGoals,
      awayGoals,
      match.home_team_id,
      match.away_team_id,
    );

    if (isKnockout && !winnerTeamId && winnerOverride) {
      winnerTeamId = winnerOverride;
    }

    const { data: updated, error: upErr } = await supabase
      .from('matches')
      .update({
        home_goals: homeGoals,
        away_goals: awayGoals,
        winner_team_id: winnerTeamId,
        played_at: new Date().toISOString(),
      })
      .eq('id', matchId)
      .select(
        'id, stage, group_id, home_team_id, away_team_id, home_goals, away_goals, winner_team_id, played_at',
      )
      .single();

    if (upErr || !updated) {
      log.error({ err: upErr, matchId }, 'saveMatchResult update failed');
      throw new Error(upErr?.message ?? 'Failed to save result');
    }

    log.info({ matchId, adminId, stage: match.stage }, 'Match result saved');

    if (match.stage === 'group') {
      try {
        await populateRoundOf32();
      } catch (e) {
        log.error({ err: e }, 'Auto-populate R32 failed (non-blocking)');
      }
    } else if (updated.winner_team_id) {
      try {
        await advanceKnockoutWinner(matchId, updated.winner_team_id);
      } catch (e) {
        log.error({ err: e }, 'Auto-advance knockout failed (non-blocking)');
      }
    }

    return {
      matchId: updated.id,
      stage: updated.stage,
      groupId: updated.group_id,
      homeTeamId: updated.home_team_id,
      awayTeamId: updated.away_team_id,
      homeGoals: updated.home_goals as number,
      awayGoals: updated.away_goals as number,
      winnerTeamId: updated.winner_team_id,
      playedAt: updated.played_at,
    };
  } catch (err) {
    log.error({ err, matchId, adminId }, 'saveMatchResult failed');
    throw err instanceof Error ? err : new Error('saveMatchResult failed');
  }
};

/** Admin-only: clear an entered result (goals, winner, played_at). */
export const clearMatchResult = async (matchId: string, adminId: string): Promise<void> => {
  const admin = await isAdmin(adminId);
  if (!admin) {
    log.warn({ adminId, matchId }, 'clearMatchResult denied');
    throw new Error('Only admins can clear match results');
  }

  const supabase = await createServerClient();
  const { error } = await supabase
    .from('matches')
    .update({
      home_goals: null,
      away_goals: null,
      winner_team_id: null,
      played_at: null,
    })
    .eq('id', matchId);

  if (error) {
    log.error({ err: error, matchId }, 'clearMatchResult update failed');
    throw new Error(error.message);
  }

  log.info({ matchId, adminId }, 'Match result cleared');
};

/** Admin-only: set the winner of a knockout match (no scores) and advance. */
export const saveKnockoutWinner = async (
  matchId: string,
  winnerTeamId: string,
  adminId: string,
): Promise<FinishedMatchResult> => {
  try {
    const admin = await isAdmin(adminId);
    if (!admin) {
      log.warn({ adminId, matchId }, 'saveKnockoutWinner denied');
      throw new Error('Only admins can set knockout winners');
    }

    const supabase = await createServerClient();
    const { data: updated, error: upErr } = await supabase
      .from('matches')
      .update({ winner_team_id: winnerTeamId })
      .eq('id', matchId)
      .select(
        'id, stage, group_id, home_team_id, away_team_id, home_goals, away_goals, winner_team_id, played_at',
      )
      .single();

    if (upErr || !updated) {
      log.error({ err: upErr, matchId }, 'saveKnockoutWinner update failed');
      throw new Error(upErr?.message ?? 'Failed to set knockout winner');
    }

    log.info({ matchId, winnerTeamId, adminId }, 'Knockout winner set');

    await advanceKnockoutWinner(matchId, winnerTeamId);

    return {
      matchId: updated.id,
      stage: updated.stage,
      groupId: updated.group_id,
      homeTeamId: updated.home_team_id,
      awayTeamId: updated.away_team_id,
      homeGoals: updated.home_goals ?? 0,
      awayGoals: updated.away_goals ?? 0,
      winnerTeamId: updated.winner_team_id,
      playedAt: updated.played_at,
    };
  } catch (err) {
    log.error({ err, matchId, adminId }, 'saveKnockoutWinner failed');
    throw err instanceof Error ? err : new Error('saveKnockoutWinner failed');
  }
};

export const getMatchResults = async (
  stage?: string,
): Promise<FinishedMatchResult[]> => {
  try {
    const supabase = await createServerClient();
    let q = supabase
      .from('matches')
      .select(
        'id, stage, group_id, home_team_id, away_team_id, home_goals, away_goals, winner_team_id, played_at',
      )
      .not('home_goals', 'is', null)
      .not('away_goals', 'is', null)
      .order('played_at', { ascending: true });

    if (stage) {
      q = q.eq('stage', stage);
    }

    const { data, error } = await q;

    if (error) {
      log.error({ err: error, stage }, 'getMatchResults query failed');
      throw new Error(`Failed to load match results: ${error.message}`);
    }

    return (data ?? []).map((row) => ({
      matchId: row.id,
      stage: row.stage,
      groupId: row.group_id,
      homeTeamId: row.home_team_id,
      awayTeamId: row.away_team_id,
      homeGoals: row.home_goals as number,
      awayGoals: row.away_goals as number,
      winnerTeamId: row.winner_team_id,
      playedAt: row.played_at,
    }));
  } catch (err) {
    log.error({ err, stage }, 'getMatchResults failed');
    throw err instanceof Error ? err : new Error('getMatchResults failed');
  }
};

export const saveSpecialResults = async (
  data: OfficialSpecialResultsInput,
  adminId: string,
): Promise<{ id: string; updatedAt: string }> => {
  try {
    const admin = await isAdmin(adminId);
    if (!admin) {
      log.warn({ adminId }, 'saveSpecialResults denied');
      throw new Error('Only admins can save special results');
    }

    const supabase = await createServerClient();
    const { data: existing, error: exErr } = await supabase
      .from('real_results')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (exErr) {
      log.error({ err: exErr }, 'saveSpecialResults load failed');
      throw new Error(exErr.message);
    }

    const payload = {
      top_scorer: data.topScorer,
      best_player: data.bestPlayer,
      champion_team_id: data.championTeamId,
      runner_up_team_id: data.runnerUpTeamId,
      third_place_team_id: data.thirdPlaceTeamId,
      fourth_place_team_id: data.fourthPlaceTeamId,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { data: row, error } = await supabase
        .from('real_results')
        .update(payload)
        .eq('id', existing.id)
        .select('id, updated_at')
        .single();

      if (error || !row) {
        log.error({ err: error }, 'saveSpecialResults update failed');
        throw new Error(error?.message ?? 'Update failed');
      }

      log.info({ adminId }, 'Special results updated');
      return { id: row.id, updatedAt: row.updated_at };
    }

    const { data: row, error } = await supabase
      .from('real_results')
      .insert(payload)
      .select('id, updated_at')
      .single();

    if (error || !row) {
      log.error({ err: error }, 'saveSpecialResults insert failed');
      throw new Error(error?.message ?? 'Insert failed');
    }

    log.info({ adminId }, 'Special results created');
    return { id: row.id, updatedAt: row.updated_at };
  } catch (err) {
    log.error({ err, adminId }, 'saveSpecialResults failed');
    throw err instanceof Error ? err : new Error('saveSpecialResults failed');
  }
};

/**
 * Admin-only: clear all official match results, knockout team assignments (R32+),
 * special real_results, best-third table and optional group-override rows; then
 * callers should run `calculateAllScores()`.
 */
export const resetAllOfficialResults = async (adminId: string): Promise<void> => {
  const admin = await isAdmin(adminId);
  if (!admin) {
    log.warn({ adminId }, 'resetAllOfficialResults denied');
    throw new Error('Only admins can reset official results');
  }

  const supabase = await createServerClient();

  const { error: btpErr } = await supabase
    .from('best_third_place_qualifiers')
    .delete()
    .not('id', 'is', null);
  if (btpErr) {
    log.warn({ err: btpErr }, 'reset: best_third_place_qualifiers delete');
  }

  const { error: rgsErr } = await supabase
    .from('real_group_standings')
    .delete()
    .not('group_id', 'is', null);
  if (rgsErr) {
    log.warn({ err: rgsErr }, 'reset: real_group_standings delete');
  }

  const { error: koErr } = await supabase
    .from('matches')
    .update({ home_team_id: null, away_team_id: null })
    .neq('stage', 'group');
  if (koErr) {
    log.error({ err: koErr }, 'reset: knockout team slots clear failed');
    throw new Error(koErr.message);
  }

  const { error: resErr } = await supabase
    .from('matches')
    .update({
      home_goals: null,
      away_goals: null,
      winner_team_id: null,
      played_at: null,
    })
    .gte('match_number', 1);
  if (resErr) {
    log.error({ err: resErr }, 'reset: clear match results failed');
    throw new Error(resErr.message);
  }

  const { error: rrErr } = await supabase.from('real_results').delete().not('id', 'is', null);
  if (rrErr) {
    log.error({ err: rrErr }, 'reset: real_results delete failed');
    throw new Error(rrErr.message);
  }

  log.info({ adminId }, 'All official results and related data cleared');
};
