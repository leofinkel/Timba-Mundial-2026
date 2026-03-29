import 'server-only';

import { createServiceLogger } from '@/lib/logger';
import { createServerClient } from '@/lib/supabase/server';
import type { FinishedMatchResult, OfficialSpecialResultsInput } from '@/types/tournament';

import { isAdmin } from '@/services/adminService';

const log = createServiceLogger('resultService');

const winnerFromGoals = (
  homeGoals: number,
  awayGoals: number,
  homeTeamId: string | null,
  awayTeamId: string | null,
): string | null => {
  if (homeGoals > awayGoals) {
    return homeTeamId;
  }
  if (awayGoals > homeGoals) {
    return awayTeamId;
  }
  return null;
};

export const saveMatchResult = async (
  matchId: string,
  homeGoals: number,
  awayGoals: number,
  adminId: string,
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
      .select(
        'id, stage, group_id, home_team_id, away_team_id, played_at',
      )
      .eq('id', matchId)
      .single();

    if (fetchErr || !match) {
      log.error({ err: fetchErr, matchId }, 'saveMatchResult match not found');
      throw new Error(fetchErr?.message ?? 'Match not found');
    }

    const winnerTeamId = winnerFromGoals(
      homeGoals,
      awayGoals,
      match.home_team_id,
      match.away_team_id,
    );

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

    log.info({ matchId, adminId }, 'Match result saved');

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
