import {
  isThirdPlaceKnockoutSource,
  resolveDirectSource,
  resolveThirdPlaceTeamForR32Match,
} from '@/lib/knockout/thirdPlaceAllocation';
import type { KnockoutMatch } from '@/types/tournament';

export type KnockoutSlotResolutionContext = {
  standingsByGroup: Map<string, string[]>;
  thirdTeamByGroup: Map<string, string>;
  allocation: Map<string, number>;
  winnerByMatchId: Map<string, string>;
  homeAwayByMatchId: Map<string, { home: string; away: string }>;
  matchNumberToId: Map<number, string>;
};

export const resolveKnockoutSourceToTeamId = (
  source: string,
  ctx: KnockoutSlotResolutionContext,
  slotMatchNumber: number,
): string => {
  const s = source.trim();
  if (!s) return '';

  const w = s.match(/^W(\d+)$/);
  if (w) {
    const mid = ctx.matchNumberToId.get(parseInt(w[1], 10));
    if (!mid) return '';
    return ctx.winnerByMatchId.get(mid) ?? '';
  }

  const ru = s.match(/^RU(\d+)$/);
  if (ru) {
    const mid = ctx.matchNumberToId.get(parseInt(ru[1], 10));
    if (!mid) return '';
    const teams = ctx.homeAwayByMatchId.get(mid);
    const wid = ctx.winnerByMatchId.get(mid);
    if (!teams || !wid) return '';
    if (wid !== teams.home && wid !== teams.away) return '';
    return wid === teams.home ? teams.away : teams.home;
  }

  if (isThirdPlaceKnockoutSource(s)) {
    return (
      resolveThirdPlaceTeamForR32Match(
        ctx.allocation,
        ctx.thirdTeamByGroup,
        slotMatchNumber,
      ) ?? ''
    );
  }

  return resolveDirectSource(s, ctx.standingsByGroup) ?? '';
};

/**
 * Fills home/away for every knockout match after R32 using sources (Wxx, RUxx, 1A, 3…).
 * R32 slots must already be present in `homeAwayByMatchId`.
 */
export const fillKnockoutHomeAwayAfterR32 = (
  knockoutMatches: KnockoutMatch[],
  ctx: KnockoutSlotResolutionContext,
): void => {
  const ordered = knockoutMatches
    .filter((m) => m.round !== 'round-of-32')
    .sort((a, b) => a.matchNumber - b.matchNumber);

  for (const m of ordered) {
    const home = resolveKnockoutSourceToTeamId(m.homeSource, ctx, m.matchNumber);
    const away = resolveKnockoutSourceToTeamId(m.awaySource, ctx, m.matchNumber);
    ctx.homeAwayByMatchId.set(m.id, { home, away });
  }
};
