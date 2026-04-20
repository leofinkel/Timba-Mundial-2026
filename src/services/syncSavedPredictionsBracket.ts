import 'server-only';

import type { GroupMatchScoresInput } from '@/lib/fixture/computeGroupStandingsFromPredictions';
import { buildCalculatedStandingsForPrediction } from '@/lib/fixture/buildCalculatedStandingsForPrediction';
import { isGroupStagePredictionComplete } from '@/lib/fixture/isGroupStagePredictionComplete';
import { buildPredictionBestThirdQualifierRows } from '@/lib/knockout/buildPredictionBestThirdQualifierRows';
import { resolvePredictionKnockoutBracket } from '@/lib/knockout/resolvePredictionKnockoutBracket';
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

    const matchNumberToId = new Map<number, string>(
      tournament.knockoutMatches.map((m) => [m.matchNumber, m.id]),
    );

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
        .select('match_id, home_goals, away_goals, winner_team_id, pred_home_team_id, pred_away_team_id')
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

      try {
        await predictionRepository.replacePredictionBestThirdQualifiers(
          supabase,
          predictionId,
          buildPredictionBestThirdQualifierRows(calculatedStandings),
        );
      } catch (e) {
        log.warn(
          { predictionId, err: e instanceof Error ? e.message : String(e) },
          'prediction_best_third_place_qualifiers sync skipped',
        );
      }

      const pmByMatchId = new Map((pmRows ?? []).map((r) => [r.match_id, r] as const));

      const resolved = resolvePredictionKnockoutBracket({
        knockoutMatches: tournament.knockoutMatches,
        groupMatchIds,
        calculatedStandings,
        predictionMatchRows: (pmRows ?? []).map((r) => ({
          match_id: r.match_id,
          home_goals: r.home_goals,
          away_goals: r.away_goals,
          winner_team_id: r.winner_team_id,
        })),
        matchNumberToId,
      });

      clearedInvalidWinners += resolved.clearedInvalidWinners;

      for (const m of tournament.knockoutMatches) {
        const row = pmByMatchId.get(m.id);
        const ha = resolved.homeAwayByMatchId.get(m.id);
        const haHome = ha?.home?.trim() ? ha.home : null;
        const haAway = ha?.away?.trim() ? ha.away : null;

        await predictionRepository.upsertPredictionMatch(supabase, {
          prediction_id: predictionId,
          match_id: m.id,
          home_goals: row?.home_goals ?? 0,
          away_goals: row?.away_goals ?? 0,
          winner_team_id: resolved.winnerByMatchId.get(m.id) ?? null,
          pred_home_team_id: haHome,
          pred_away_team_id: haAway,
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
