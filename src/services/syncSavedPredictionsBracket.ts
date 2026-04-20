import 'server-only';

import type { GroupMatchScoresInput } from '@/lib/fixture/computeGroupStandingsFromPredictions';
import { buildCalculatedStandingsForPrediction } from '@/lib/fixture/buildCalculatedStandingsForPrediction';
import { isGroupStagePredictionComplete } from '@/lib/fixture/isGroupStagePredictionComplete';
import {
  fillKnockoutHomeAwayAfterR32,
  type KnockoutSlotResolutionContext,
} from '@/lib/knockout/fillKnockoutHomeAwayAfterR32';
import {
  buildThirdPlaceResolutionFromStandings,
  resolveR32MatchTeamSlotsFromStandings,
} from '@/lib/knockout/resolveR32MatchTeamSlots';
import { createServiceLogger } from '@/lib/logger';
import { createServerClient } from '@/lib/supabase/server';
import * as predictionRepository from '@/repositories/predictionRepository';
import { getTournament } from '@/services/fixtureService';
import type { GroupName } from '@/types/tournament';

const log = createServiceLogger('syncSavedPredictionsBracket');

export type SyncSavedPredictionsBracketResult = {
  processedPredictions: number;
  skippedIncompleteGroup: number;
  clearedInvalidWinners: number;
  scoreRpcErrors: number;
};

const rowsToManualGroupOrder = (
  rows: { group_id: string; team_id: string; position: number }[],
): Partial<Record<GroupName, string[]>> => {
  const byGroup = new Map<GroupName, Map<number, string>>();
  for (const r of rows) {
    const g = r.group_id as GroupName;
    if (!byGroup.has(g)) byGroup.set(g, new Map());
    byGroup.get(g)!.set(r.position, r.team_id);
  }
  const out: Partial<Record<GroupName, string[]>> = {};
  for (const [g, posMap] of byGroup) {
    const order: string[] = [];
    for (let p = 1; p <= 4; p += 1) {
      const tid = posMap.get(p);
      if (tid) order.push(tid);
    }
    out[g] = order;
  }
  return out;
};

export const syncAllSavedPredictionsBracketLogic =
  async (): Promise<SyncSavedPredictionsBracketResult> => {
    const supabase = await createServerClient();
    const tournament = await getTournament();

    const groupMatchIds = new Set(
      tournament.groups.flatMap((g) => g.matches.map((m) => m.id)),
    );

    const matchNumberToId = new Map<number, string>();
    for (const m of tournament.knockoutMatches) {
      matchNumberToId.set(m.matchNumber, m.id);
    }

    const { data: predictions, error: predErr } = await supabase
      .from('predictions')
      .select('id, user_id');

    if (predErr) {
      throw new Error(`predictions.select failed: ${predErr.message}`);
    }

    let processedPredictions = 0;
    let skippedIncompleteGroup = 0;
    let clearedInvalidWinners = 0;
    let scoreRpcErrors = 0;

    for (const pred of predictions ?? []) {
      const predictionId = pred.id as string;
      const userId = pred.user_id as string;

      const { data: pmRows, error: pmErr } = await supabase
        .from('prediction_matches')
        .select('match_id, home_goals, away_goals, winner_team_id')
        .eq('prediction_id', predictionId);

      if (pmErr) {
        log.error({ predictionId, err: pmErr.message }, 'prediction_matches load failed');
        continue;
      }

      const groupPredictions: GroupMatchScoresInput = {};
      for (const row of pmRows ?? []) {
        if (!groupMatchIds.has(row.match_id)) continue;
        groupPredictions[row.match_id] = {
          homeGoals: row.home_goals,
          awayGoals: row.away_goals,
        };
      }

      if (!isGroupStagePredictionComplete(tournament.groups, groupPredictions)) {
        skippedIncompleteGroup += 1;
        continue;
      }

      const standingRows = await predictionRepository.listGroupStandingsRows(
        supabase,
        predictionId,
      );
      const manualGroupOrder = rowsToManualGroupOrder(standingRows);

      const calculatedStandings = buildCalculatedStandingsForPrediction(
        tournament,
        groupPredictions,
        manualGroupOrder,
      );

      const groupStandingsByGroup = tournament.groups.reduce(
        (acc, g) => {
          const rows = calculatedStandings[g.id];
          if (rows?.length) {
            const sorted = [...rows].sort((a, b) => a.position - b.position);
            acc[g.id] = sorted.map((s) => s.team.id);
          }
          return acc;
        },
        {} as Record<GroupName, string[]>,
      );

      await predictionRepository.replaceGroupStandings(
        supabase,
        predictionId,
        groupStandingsByGroup,
      );

      const r32Slots = resolveR32MatchTeamSlotsFromStandings(
        tournament.knockoutMatches,
        calculatedStandings,
      );
      const tp = buildThirdPlaceResolutionFromStandings(calculatedStandings);

      const pmByMatchId = new Map(
        (pmRows ?? []).map((r) => [r.match_id, r] as const),
      );

      const winnerByMatchId = new Map<string, string>();
      for (const row of pmRows ?? []) {
        if (groupMatchIds.has(row.match_id)) continue;
        if (row.winner_team_id) winnerByMatchId.set(row.match_id, row.winner_team_id);
      }

      const homeAwayByMatchId = new Map<string, { home: string; away: string }>();
      for (const [id, slots] of Object.entries(r32Slots)) {
        homeAwayByMatchId.set(id, { home: slots.homeTeamId, away: slots.awayTeamId });
      }

      const initialWinners = new Map<string, string | null>();
      for (const m of tournament.knockoutMatches) {
        const row = pmByMatchId.get(m.id);
        initialWinners.set(m.id, row?.winner_team_id ?? null);
      }

      const ctx: KnockoutSlotResolutionContext = {
        standingsByGroup: tp.standingsByGroup,
        thirdTeamByGroup: tp.thirdTeamByGroup,
        allocation: tp.allocation,
        winnerByMatchId,
        homeAwayByMatchId,
        matchNumberToId,
      };

      let iterationCleared = 0;
      for (let iter = 0; iter < 16; iter += 1) {
        fillKnockoutHomeAwayAfterR32(tournament.knockoutMatches, ctx);
        let changed = false;
        for (const m of tournament.knockoutMatches) {
          const wid = winnerByMatchId.get(m.id);
          if (!wid) continue;
          const ha = ctx.homeAwayByMatchId.get(m.id);
          if (!ha || (wid !== ha.home && wid !== ha.away)) {
            winnerByMatchId.delete(m.id);
            changed = true;
            iterationCleared += 1;
          }
        }
        if (!changed) break;
      }
      clearedInvalidWinners += iterationCleared;

      for (const m of tournament.knockoutMatches) {
        const row = pmByMatchId.get(m.id);
        if (!row) continue;
        const before = initialWinners.get(m.id) ?? null;
        const after = winnerByMatchId.get(m.id) ?? null;
        if (before === after) continue;
        await predictionRepository.upsertPredictionMatch(supabase, {
          prediction_id: predictionId,
          match_id: m.id,
          home_goals: row.home_goals,
          away_goals: row.away_goals,
          winner_team_id: after,
        });
      }

      const { error: rpcErr } = await supabase.rpc('calculate_user_score', {
        p_user_id: userId,
      });
      if (rpcErr) {
        scoreRpcErrors += 1;
        log.warn({ userId, err: rpcErr.message }, 'calculate_user_score RPC failed');
      }

      processedPredictions += 1;
    }

    log.info(
      {
        processedPredictions,
        skippedIncompleteGroup,
        clearedInvalidWinners,
        scoreRpcErrors,
      },
      'syncSavedPredictionsBracket done',
    );

    return {
      processedPredictions,
      skippedIncompleteGroup,
      clearedInvalidWinners,
      scoreRpcErrors,
    };
  };
