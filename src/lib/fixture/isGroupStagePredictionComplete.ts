import type { Tournament } from '@/types/tournament';
import type { GroupMatchScoresInput } from '@/lib/fixture/computeGroupStandingsFromPredictions';

/** True when every group match has a valid predicted score (required before deriving R32 from standings). */
export const isGroupStagePredictionComplete = (
  groups: Tournament['groups'],
  predictions: GroupMatchScoresInput,
): boolean => {
  for (const g of groups) {
    for (const m of g.matches) {
      const p = predictions[m.id];
      if (!p || p.homeGoals === null || p.awayGoals === null) return false;
      const hg = p.homeGoals;
      const ag = p.awayGoals;
      if (!Number.isFinite(hg) || !Number.isFinite(ag) || hg < 0 || ag < 0) return false;
    }
  }
  return true;
};
