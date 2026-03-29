'use client';

import { useCallback, useMemo, useState } from 'react';

import { savePredictionsAction } from '@/actions/predictions';
import {
  computeGroupStandingsFromPredictions,
  type GroupMatchScoresInput,
} from '@/lib/fixture/computeGroupStandingsFromPredictions';
import type {
  GroupMatchPrediction,
  KnockoutMatchPrediction,
  SpecialPrediction,
  UserPrediction,
} from '@/types/prediction';
import type { GroupName, KnockoutMatch, Tournament } from '@/types/tournament';

export type UseFixturePredictionsArgs = {
  tournament: Tournament;
  initialPrediction?: UserPrediction | null;
  isLocked?: boolean;
};

export type GroupPredictionState = GroupMatchScoresInput;

const buildGroupPredictionState = (
  groups: Tournament['groups'],
  initial?: GroupMatchPrediction[] | undefined,
): GroupPredictionState => {
  const byId = new Map(initial?.map((p) => [p.matchId, p]));
  const state: GroupPredictionState = {};
  for (const g of groups) {
    for (const m of g.matches) {
      const ex = byId.get(m.id);
      state[m.id] = {
        homeGoals: ex?.homeGoals ?? null,
        awayGoals: ex?.awayGoals ?? null,
      };
    }
  }
  return state;
};

const resolveKnockoutWinner = (
  homeTeamId: string,
  awayTeamId: string,
  homeGoals: number,
  awayGoals: number,
  previousWinnerId: string,
): string => {
  if (homeGoals > awayGoals) return homeTeamId;
  if (awayGoals > homeGoals) return awayTeamId;
  if (previousWinnerId === homeTeamId || previousWinnerId === awayTeamId) {
    return previousWinnerId;
  }
  return homeTeamId;
};

const buildKnockoutPredictionState = (
  matches: KnockoutMatch[],
  initial?: KnockoutMatchPrediction[] | undefined,
): Record<string, KnockoutMatchPrediction> => {
  const byId = new Map(initial?.map((p) => [p.matchId, p]));
  const state: Record<string, KnockoutMatchPrediction> = {};
  for (const m of matches) {
    const ex = byId.get(m.id);
    const homeTeamId = m.homeTeam?.id ?? ex?.homeTeamId ?? '';
    const awayTeamId = m.awayTeam?.id ?? ex?.awayTeamId ?? '';
    const homeGoals = ex?.homeGoals ?? 0;
    const awayGoals = ex?.awayGoals ?? 0;
    let winnerId = ex?.winnerId ?? '';
    if (homeTeamId && awayTeamId) {
      winnerId = resolveKnockoutWinner(homeTeamId, awayTeamId, homeGoals, awayGoals, winnerId);
    }
    state[m.id] = {
      matchId: m.id,
      homeTeamId,
      awayTeamId,
      homeGoals,
      awayGoals,
      winnerId,
    };
  }
  return state;
};

export const useFixturePredictions = ({
  tournament,
  initialPrediction,
  isLocked = false,
}: UseFixturePredictionsArgs) => {
  const [groupPredictions, setGroupPredictions] = useState<GroupPredictionState>(() =>
    buildGroupPredictionState(tournament.groups, initialPrediction?.groupPredictions),
  );
  const [knockoutPredictions, setKnockoutPredictions] = useState<
    Record<string, KnockoutMatchPrediction>
  >(() =>
    buildKnockoutPredictionState(
      tournament.knockoutMatches,
      initialPrediction?.knockoutPredictions,
    ),
  );
  const [specialPredictions, setSpecialPredictions] = useState<SpecialPrediction>(() => ({
    topScorer: initialPrediction?.specialPredictions.topScorer ?? '',
    bestPlayer: initialPrediction?.specialPredictions.bestPlayer ?? '',
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string | null>(null);

  const calculatedStandings = useMemo(() => {
    const out = {} as Record<GroupName, ReturnType<typeof computeGroupStandingsFromPredictions>>;
    for (const g of tournament.groups) {
      out[g.id] = computeGroupStandingsFromPredictions(g.teams, g.matches, groupPredictions);
    }
    return out;
  }, [tournament.groups, groupPredictions]);

  const updateGroupMatch = useCallback(
    (matchId: string, homeGoals: number | null, awayGoals: number | null) => {
      if (isLocked) return;
      setGroupPredictions((prev) => ({
        ...prev,
        [matchId]: { homeGoals, awayGoals },
      }));
    },
    [isLocked],
  );

  const updateKnockoutMatch = useCallback(
    (matchId: string, patch: Partial<KnockoutMatchPrediction>) => {
      if (isLocked) return;
      setKnockoutPredictions((prev) => {
        const cur = prev[matchId];
        if (!cur) return prev;
        const next: KnockoutMatchPrediction = { ...cur, ...patch };
        if (next.homeTeamId && next.awayTeamId) {
          if (next.homeGoals !== next.awayGoals) {
            next.winnerId =
              next.homeGoals > next.awayGoals ? next.homeTeamId : next.awayTeamId;
          } else if (next.winnerId !== next.homeTeamId && next.winnerId !== next.awayTeamId) {
            next.winnerId = next.homeTeamId;
          }
        }
        return { ...prev, [matchId]: next };
      });
    },
    [isLocked],
  );

  const updateSpecial = useCallback(
    (patch: Partial<SpecialPrediction>) => {
      if (isLocked) return;
      setSpecialPredictions((prev) => ({ ...prev, ...patch }));
    },
    [isLocked],
  );

  const save = useCallback(async () => {
    const top = specialPredictions.topScorer.trim();
    const best = specialPredictions.bestPlayer.trim();
    if (top.length < 2 || best.length < 2) {
      setErrors('El goleador y la figura del Mundial deben tener al menos 2 caracteres.');
      return;
    }

    setIsSaving(true);
    setErrors(null);
    try {
      const groupPredictionsPayload: GroupMatchPrediction[] = tournament.groups.flatMap((g) =>
        g.matches.map((m) => {
          const p = groupPredictions[m.id];
          return {
            matchId: m.id,
            homeGoals: p?.homeGoals ?? 0,
            awayGoals: p?.awayGoals ?? 0,
          };
        }),
      );

      const knockoutPredictionsPayload = tournament.knockoutMatches
        .map((m) => knockoutPredictions[m.id])
        .filter(
          (p): p is KnockoutMatchPrediction =>
            !!p &&
            p.homeTeamId.length > 0 &&
            p.awayTeamId.length > 0 &&
            p.winnerId.length > 0,
        );

      const result = await savePredictionsAction({
        groupPredictions: groupPredictionsPayload,
        knockoutPredictions:
          knockoutPredictionsPayload.length > 0 ? knockoutPredictionsPayload : undefined,
        specialPredictions: {
          topScorer: top,
          bestPlayer: best,
        },
      });

      if (!result.success) {
        setErrors(result.error);
        return;
      }
      setErrors(null);
    } finally {
      setIsSaving(false);
    }
  }, [
    groupPredictions,
    knockoutPredictions,
    specialPredictions,
    tournament.groups,
    tournament.knockoutMatches,
  ]);

  return {
    groupPredictions,
    knockoutPredictions,
    specialPredictions,
    updateGroupMatch,
    updateKnockoutMatch,
    updateSpecial,
    calculatedStandings,
    save,
    isSaving,
    errors,
  };
};
