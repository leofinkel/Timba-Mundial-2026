'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { savePredictionsAction } from '@/actions/predictions';
import {
  computeGroupStandingsFromPredictions,
  reorderStandingsByTeamOrder,
  type GroupMatchScoresInput,
} from '@/lib/fixture/computeGroupStandingsFromPredictions';
import {
  resolveDirectSource,
  THIRD_PLACE_SLOTS,
  rankThirdPlaceTeams,
  solveBipartiteMatching,
} from '@/lib/knockout/thirdPlaceAllocation';
import type {
  GroupMatchPrediction,
  KnockoutMatchPrediction,
  SpecialPrediction,
  UserPrediction,
} from '@/types/prediction';
import { KNOCKOUT_ROUNDS } from '@/constants/tournament';
import type { GroupName, GroupStanding, KnockoutMatch, Tournament } from '@/types/tournament';

const KNOCKOUT_ROUND_SORT_INDEX = new Map(
  KNOCKOUT_ROUNDS.map((r, i) => [r.id, i] as const),
);

const sortKnockoutMatchesForPropagation = (matches: KnockoutMatch[]): KnockoutMatch[] =>
  [...matches].sort((a, b) => {
    const ia = KNOCKOUT_ROUND_SORT_INDEX.get(a.round) ?? 0;
    const ib = KNOCKOUT_ROUND_SORT_INDEX.get(b.round) ?? 0;
    if (ia !== ib) return ia - ib;
    return a.matchNumber - b.matchNumber;
  });

/**
 * Propagates a match winner (and loser for RU slots) to subsequent bracket matches.
 * Must match the behaviour of interactive picks so reload restores full bracket slots.
 */
const cascadeKnockoutWinnerState = (
  state: Record<string, KnockoutMatchPrediction>,
  matchId: string,
  winnerSourceMap: Map<string, Array<{ matchId: string; side: 'home' | 'away' }>>,
): Record<string, KnockoutMatchPrediction> => {
  const pred = state[matchId];
  if (!pred?.winnerId) return state;

  const targets = winnerSourceMap.get(matchId) ?? [];
  let next = state;

  for (const t of targets) {
    const target = next[t.matchId];
    if (!target) continue;

    const teamKey = t.side === 'home' ? 'homeTeamId' : 'awayTeamId';
    if (target[teamKey] !== pred.winnerId) {
      if (next === state) next = { ...state };
      let winnerId = target.winnerId;
      if (
        winnerId &&
        winnerId !== (t.side === 'home' ? pred.winnerId : target.homeTeamId) &&
        winnerId !== (t.side === 'away' ? pred.winnerId : target.awayTeamId)
      ) {
        winnerId = '';
      }
      next[t.matchId] = { ...target, [teamKey]: pred.winnerId, winnerId };
      next = cascadeKnockoutWinnerState(next, t.matchId, winnerSourceMap);
    }
  }

  const loserTargets = winnerSourceMap.get(`RU:${matchId}`) ?? [];
  const loserId =
    pred.homeTeamId === pred.winnerId ? pred.awayTeamId : pred.homeTeamId;

  if (loserId) {
    for (const t of loserTargets) {
      const target = next[t.matchId];
      if (!target) continue;
      const teamKey = t.side === 'home' ? 'homeTeamId' : 'awayTeamId';
      if (target[teamKey] !== loserId) {
        if (next === state) next = { ...state };
        next[t.matchId] = { ...target, [teamKey]: loserId };
      }
    }
  }

  return next;
};

export type UseFixturePredictionsArgs = {
  tournament: Tournament;
  initialPrediction?: UserPrediction | null;
  isLocked?: boolean;
};

export type GroupPredictionState = GroupMatchScoresInput;

/** True when every group match has a valid predicted score (required before deriving R32 from standings). */
const isGroupStagePredictionComplete = (
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

/** Strip user-predicted teams; keep only slots fixed by the tournament (official results in DB). */
const clearKnockoutToOfficialOnly = (
  matches: KnockoutMatch[],
  prev: Record<string, KnockoutMatchPrediction>,
): Record<string, KnockoutMatchPrediction> => {
  let changed = false;
  const next = { ...prev };
  for (const m of matches) {
    const cur = next[m.id];
    if (!cur) continue;
    const home = m.homeTeam?.id ?? '';
    const away = m.awayTeam?.id ?? '';
    let winnerId = cur.winnerId;
    if (!home || !away) {
      winnerId = '';
    } else if (winnerId && winnerId !== home && winnerId !== away) {
      winnerId = '';
    }
    if (cur.homeTeamId !== home || cur.awayTeamId !== away || cur.winnerId !== winnerId) {
      changed = true;
      next[m.id] = { ...cur, homeTeamId: home, awayTeamId: away, winnerId };
    }
  }
  return changed ? next : prev;
};

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
    state[m.id] = {
      matchId: m.id,
      homeTeamId,
      awayTeamId,
      homeGoals: 0,
      awayGoals: 0,
      winnerId: ex?.winnerId ?? '',
    };
  }
  return state;
};

/**
 * Build a map: matchId → list of next-match slots that depend on this match's winner.
 * Parses sources like "W73" to find which subsequent matches reference a given match.
 */
const buildWinnerSourceMap = (
  knockoutMatches: KnockoutMatch[],
): Map<string, Array<{ matchId: string; side: 'home' | 'away' }>> => {
  const numToId = new Map<number, string>();
  for (const m of knockoutMatches) numToId.set(m.matchNumber, m.id);

  const map = new Map<string, Array<{ matchId: string; side: 'home' | 'away' }>>();

  for (const m of knockoutMatches) {
    for (const [source, side] of [
      [m.homeSource, 'home'] as const,
      [m.awaySource, 'away'] as const,
    ]) {
      const wMatch = source.match(/^W(\d+)$/);
      if (wMatch) {
        const srcId = numToId.get(parseInt(wMatch[1], 10));
        if (srcId) {
          const arr = map.get(srcId) ?? [];
          arr.push({ matchId: m.id, side });
          map.set(srcId, arr);
        }
      }
      const ruMatch = source.match(/^RU(\d+)$/);
      if (ruMatch) {
        const srcId = numToId.get(parseInt(ruMatch[1], 10));
        if (srcId) {
          const arr = map.get(`RU:${srcId}`) ?? [];
          arr.push({ matchId: m.id, side });
          map.set(`RU:${srcId}`, arr);
        }
      }
    }
  }
  return map;
};

/**
 * Resolve R32 teams from predicted group standings.
 */
const resolveR32Teams = (
  knockoutMatches: KnockoutMatch[],
  standings: Record<GroupName, GroupStanding[]>,
): Record<string, { homeTeamId: string; awayTeamId: string }> => {
  const standingsByGroup = new Map<string, string[]>();
  for (const [g, rows] of Object.entries(standings)) {
    standingsByGroup.set(
      g,
      rows.map((r) => r.team.id),
    );
  }

  const thirds = Object.entries(standings)
    .map(([groupId, rows]) => {
      const third = rows[2];
      if (!third) return null;
      return {
        groupId,
        teamId: third.team.id,
        points: third.points,
        goalDifference: third.goalDifference,
        goalsFor: third.goalsFor,
      };
    })
    .filter(Boolean) as Array<{
    groupId: string;
    teamId: string;
    points: number;
    goalDifference: number;
    goalsFor: number;
  }>;

  const ranked = rankThirdPlaceTeams(thirds);
  const qualifying = ranked.slice(0, 8);
  const qualifyingGroups = qualifying.map((t) => t.groupId).sort();
  const allocation = solveBipartiteMatching(qualifyingGroups, THIRD_PLACE_SLOTS);

  const thirdTeamByGroup = new Map<string, string>();
  for (const t of qualifying) thirdTeamByGroup.set(t.groupId, t.teamId);

  const result: Record<string, { homeTeamId: string; awayTeamId: string }> = {};

  for (const m of knockoutMatches) {
    if (m.round !== 'round-of-32') continue;

    let homeTeamId = m.homeTeam?.id ?? '';
    let awayTeamId = m.awayTeam?.id ?? '';

    if (!homeTeamId && m.homeSource) {
      homeTeamId = resolveDirectSource(m.homeSource, standingsByGroup) ?? '';
    }

    if (!awayTeamId && m.awaySource) {
      if (m.awaySource.startsWith('3-')) {
        for (const [group, matchNum] of allocation) {
          if (matchNum === m.matchNumber) {
            awayTeamId = thirdTeamByGroup.get(group) ?? '';
            break;
          }
        }
      } else {
        awayTeamId = resolveDirectSource(m.awaySource, standingsByGroup) ?? '';
      }
    }

    if (homeTeamId || awayTeamId) {
      result[m.id] = { homeTeamId, awayTeamId };
    }
  }

  return result;
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

  const initManualGroupOrder = (): Partial<Record<GroupName, string[]>> => {
    const pgs = initialPrediction?.predictedGroupStandings;
    if (!pgs) return {};
    if (pgs instanceof Map) {
      return Object.fromEntries(pgs) as Partial<Record<GroupName, string[]>>;
    }
    if (typeof pgs === 'object' && pgs !== null) {
      return pgs as Partial<Record<GroupName, string[]>>;
    }
    return {};
  };

  const [manualGroupOrder, setManualGroupOrder] =
    useState<Partial<Record<GroupName, string[]>>>(initManualGroupOrder);

  const rawGroupStandings = useMemo(() => {
    const out = {} as Record<
      GroupName,
      ReturnType<typeof computeGroupStandingsFromPredictions>
    >;
    for (const g of tournament.groups) {
      out[g.id] = computeGroupStandingsFromPredictions(g.teams, g.matches, groupPredictions);
    }
    return out;
  }, [tournament.groups, groupPredictions]);

  const isValidTeamOrder = (order: string[] | undefined, groupTeamIds: string[]): boolean => {
    if (!order || order.length !== groupTeamIds.length) return false;
    const set = new Set(order);
    if (set.size !== order.length) return false;
    return groupTeamIds.every((id) => set.has(id));
  };

  useEffect(() => {
    setManualGroupOrder((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const g of tournament.groups) {
        if (rawGroupStandings[g.id].unresolvedTieClusters.length === 0 && next[g.id]) {
          delete next[g.id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [rawGroupStandings, tournament.groups]);

  const calculatedStandings = useMemo(() => {
    const out = {} as Record<GroupName, GroupStanding[]>;
    for (const g of tournament.groups) {
      const raw = rawGroupStandings[g.id];
      const teamIds = g.teams.map((t) => t.id);
      const manual = manualGroupOrder[g.id];
      if (raw.unresolvedTieClusters.length === 0) {
        out[g.id] = raw.standings;
      } else if (isValidTeamOrder(manual, teamIds)) {
        out[g.id] = reorderStandingsByTeamOrder(raw.standings, manual!);
      } else {
        out[g.id] = raw.standings;
      }
    }
    return out;
  }, [rawGroupStandings, manualGroupOrder, tournament.groups]);

  const groupStandingsTieInfo = useMemo(() => {
    const out = {} as Record<GroupName, { unresolvedTieClusters: string[][] }>;
    for (const g of tournament.groups) {
      out[g.id] = {
        unresolvedTieClusters: rawGroupStandings[g.id].unresolvedTieClusters,
      };
    }
    return out;
  }, [rawGroupStandings, tournament.groups]);

  const winnerSourceMap = useMemo(
    () => buildWinnerSourceMap(tournament.knockoutMatches),
    [tournament.knockoutMatches],
  );

  const isGroupStageComplete = useMemo(
    () => isGroupStagePredictionComplete(tournament.groups, groupPredictions),
    [tournament.groups, groupPredictions],
  );

  useEffect(() => {
    if (!isGroupStageComplete) {
      setKnockoutPredictions((prev) =>
        clearKnockoutToOfficialOnly(tournament.knockoutMatches, prev),
      );
      return;
    }

    const r32Teams = resolveR32Teams(
      tournament.knockoutMatches,
      calculatedStandings,
    );

    setKnockoutPredictions((prev) => {
      let next = { ...prev };
      let changed = false;

      for (const [matchId, teams] of Object.entries(r32Teams)) {
        const cur = next[matchId];
        if (!cur) continue;
        if (cur.homeTeamId !== teams.homeTeamId || cur.awayTeamId !== teams.awayTeamId) {
          changed = true;
          let winnerId = cur.winnerId;
          if (
            winnerId &&
            winnerId !== teams.homeTeamId &&
            winnerId !== teams.awayTeamId
          ) {
            winnerId = '';
          }
          next[matchId] = { ...cur, ...teams, winnerId };
        }
      }

      const ordered = sortKnockoutMatchesForPropagation(tournament.knockoutMatches);
      for (const m of ordered) {
        if (!next[m.id]?.winnerId) continue;
        const propagated = cascadeKnockoutWinnerState(next, m.id, winnerSourceMap);
        if (propagated !== next) {
          next = propagated;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [
    isGroupStageComplete,
    calculatedStandings,
    tournament.knockoutMatches,
    winnerSourceMap,
  ]);

  const moveTeamInGroupOrder = useCallback(
    (groupId: GroupName, teamId: string, direction: 'up' | 'down') => {
      if (isLocked) return;
      const g = tournament.groups.find((x) => x.id === groupId);
      if (!g) return;
      const raw = rawGroupStandings[groupId];
      const cluster = raw.unresolvedTieClusters.find((c) => c.includes(teamId));
      if (!cluster) return;

      const teamIds = g.teams.map((t) => t.id);
      const baseOrder =
        isValidTeamOrder(manualGroupOrder[groupId], teamIds) && manualGroupOrder[groupId]
          ? [...manualGroupOrder[groupId]!]
          : raw.standings.map((s) => s.team.id);

      const indices = cluster
        .map((id) => baseOrder.indexOf(id))
        .filter((i) => i >= 0)
        .sort((a, b) => a - b);
      const myIdx = baseOrder.indexOf(teamId);
      const posInCluster = indices.indexOf(myIdx);
      if (posInCluster < 0) return;

      if (direction === 'up' && posInCluster > 0) {
        const swapIdx = indices[posInCluster - 1];
        const next = [...baseOrder];
        [next[myIdx], next[swapIdx]] = [next[swapIdx], next[myIdx]];
        setManualGroupOrder((prev) => ({ ...prev, [groupId]: next }));
      } else if (direction === 'down' && posInCluster < indices.length - 1) {
        const swapIdx = indices[posInCluster + 1];
        const next = [...baseOrder];
        [next[myIdx], next[swapIdx]] = [next[swapIdx], next[myIdx]];
        setManualGroupOrder((prev) => ({ ...prev, [groupId]: next }));
      }
    },
    [isLocked, tournament.groups, rawGroupStandings, manualGroupOrder],
  );

  const cascadeWinner = useCallback(
    (
      state: Record<string, KnockoutMatchPrediction>,
      matchId: string,
    ): Record<string, KnockoutMatchPrediction> =>
      cascadeKnockoutWinnerState(state, matchId, winnerSourceMap),
    [winnerSourceMap],
  );

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

        const updated: KnockoutMatchPrediction = { ...cur, ...patch };
        let next = { ...prev, [matchId]: updated };

        if (patch.winnerId) {
          next = cascadeWinner(next, matchId);
        }

        return next;
      });
    },
    [isLocked, cascadeWinner],
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

    setIsSaving(true);
    setErrors(null);
    try {
      const groupPredictionsPayload = tournament.groups.flatMap((g) =>
        g.matches.map((m) => {
          const p = groupPredictions[m.id];
          return {
            matchId: m.id,
            homeGoals: p?.homeGoals ?? null,
            awayGoals: p?.awayGoals ?? null,
          };
        }),
      );

      const knockoutPredictionsPayload: KnockoutMatchPrediction[] =
        tournament.knockoutMatches.map((m) => {
          const p = knockoutPredictions[m.id];
          return {
            matchId: m.id,
            homeTeamId: p?.homeTeamId ?? '',
            awayTeamId: p?.awayTeamId ?? '',
            homeGoals: p?.homeGoals ?? 0,
            awayGoals: p?.awayGoals ?? 0,
            winnerId: p?.winnerId ?? '',
          };
        });

      const groupStandingsByGroup = tournament.groups.reduce(
        (acc, g) => {
          const rows = calculatedStandings[g.id];
          if (rows?.length) {
            acc[g.id] = rows.map((s) => s.team.id);
          }
          return acc;
        },
        {} as Record<GroupName, string[]>,
      );

      const result = await savePredictionsAction({
        groupPredictions: groupPredictionsPayload,
        knockoutPredictions:
          knockoutPredictionsPayload.length > 0 ? knockoutPredictionsPayload : undefined,
        specialPredictions: { topScorer: top, bestPlayer: best },
        groupStandingsByGroup,
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
    calculatedStandings,
  ]);

  return {
    groupPredictions,
    knockoutPredictions,
    specialPredictions,
    updateGroupMatch,
    updateKnockoutMatch,
    updateSpecial,
    calculatedStandings,
    groupStandingsTieInfo,
    moveTeamInGroupOrder,
    save,
    isSaving,
    errors,
  };
};
