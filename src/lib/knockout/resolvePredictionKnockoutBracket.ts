import {
  buildThirdPlaceResolutionFromStandings,
  resolveR32MatchTeamSlotsFromStandings,
} from '@/lib/knockout/resolveR32MatchTeamSlots';
import {
  fillKnockoutHomeAwayAfterR32,
  type KnockoutSlotResolutionContext,
} from '@/lib/knockout/fillKnockoutHomeAwayAfterR32';
import type { GroupName, GroupStanding, KnockoutMatch } from '@/types/tournament';

export type PredictionMatchRowLike = {
  match_id: string;
  home_goals: number;
  away_goals: number;
  winner_team_id: string | null;
};

/**
 * Resolves predicted home/away for every knockout match (R32 from standings + matrix,
 * later rounds from saved winners) and clears winners that no longer fit slots.
 */
export const resolvePredictionKnockoutBracket = (params: {
  knockoutMatches: KnockoutMatch[];
  groupMatchIds: Set<string>;
  calculatedStandings: Record<GroupName, GroupStanding[]>;
  predictionMatchRows: PredictionMatchRowLike[];
  matchNumberToId: Map<number, string>;
}): {
  homeAwayByMatchId: Map<string, { home: string; away: string }>;
  winnerByMatchId: Map<string, string>;
  clearedInvalidWinners: number;
} => {
  const { knockoutMatches, groupMatchIds, calculatedStandings, predictionMatchRows, matchNumberToId } =
    params;

  const r32Slots = resolveR32MatchTeamSlotsFromStandings(
    knockoutMatches,
    calculatedStandings,
  );
  const tp = buildThirdPlaceResolutionFromStandings(calculatedStandings);

  const winnerByMatchId = new Map<string, string>();
  for (const row of predictionMatchRows) {
    if (groupMatchIds.has(row.match_id)) continue;
    if (row.winner_team_id) winnerByMatchId.set(row.match_id, row.winner_team_id);
  }

  const homeAwayByMatchId = new Map<string, { home: string; away: string }>();
  for (const [id, slots] of Object.entries(r32Slots)) {
    homeAwayByMatchId.set(id, { home: slots.homeTeamId, away: slots.awayTeamId });
  }

  const ctx: KnockoutSlotResolutionContext = {
    standingsByGroup: tp.standingsByGroup,
    thirdTeamByGroup: tp.thirdTeamByGroup,
    allocation: tp.allocation,
    winnerByMatchId,
    homeAwayByMatchId,
    matchNumberToId,
  };

  let clearedInvalidWinners = 0;
  for (let iter = 0; iter < 16; iter += 1) {
    fillKnockoutHomeAwayAfterR32(knockoutMatches, ctx);
    let changed = false;
    for (const m of knockoutMatches) {
      const wid = ctx.winnerByMatchId.get(m.id);
      if (!wid) continue;
      const ha = ctx.homeAwayByMatchId.get(m.id);
      if (!ha || (wid !== ha.home && wid !== ha.away)) {
        ctx.winnerByMatchId.delete(m.id);
        changed = true;
        clearedInvalidWinners += 1;
      }
    }
    if (!changed) break;
  }

  return {
    homeAwayByMatchId: ctx.homeAwayByMatchId,
    winnerByMatchId: ctx.winnerByMatchId,
    clearedInvalidWinners,
  };
};
