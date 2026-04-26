'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  saveMatchResultAction,
} from '@/actions/results';
import {
  computeGroupStandingsFromPredictions,
  reorderStandingsByTeamOrder,
} from '@/lib/fixture/computeGroupStandingsFromPredictions';
import { isGroupStagePredictionComplete } from '@/lib/fixture/isGroupStagePredictionComplete';
import { resolveR32MatchTeamSlotsFromStandings } from '@/lib/knockout/resolveR32MatchTeamSlots';
import { KNOCKOUT_ROUNDS } from '@/constants/tournament';
import type { GroupMatchScoresInput } from '@/lib/fixture/computeGroupStandingsFromPredictions';
import type { KnockoutMatchPrediction } from '@/types/prediction';
import type { GroupName, GroupStanding, KnockoutMatch, Team, Tournament } from '@/types/tournament';

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

const buildGroupStateFromTournament = (groups: Tournament['groups']): GroupMatchScoresInput => {
  const state: GroupMatchScoresInput = {};
  for (const g of groups) {
    for (const m of g.matches) {
      state[m.id] = {
        homeGoals: m.homeGoals,
        awayGoals: m.awayGoals,
      };
    }
  }
  return state;
};

const buildKnockoutStateFromTournament = (
  matches: KnockoutMatch[],
): Record<string, KnockoutMatchPrediction> => {
  const state: Record<string, KnockoutMatchPrediction> = {};
  for (const m of matches) {
    state[m.id] = {
      matchId: m.id,
      homeTeamId: m.homeTeam?.id ?? '',
      awayTeamId: m.awayTeam?.id ?? '',
      homeGoals: m.homeGoals ?? 0,
      awayGoals: m.awayGoals ?? 0,
      winnerId: m.winner?.id ?? '',
    };
  }
  return state;
};

const naturalWinnerFromScore = (
  home: number,
  away: number,
  homeId: string,
  awayId: string,
): string | null => {
  if (home > away) return homeId;
  if (away > home) return awayId;
  return null;
};

const isValidTeamOrder = (order: string[] | undefined, groupTeamIds: string[]): boolean => {
  if (!order || order.length !== groupTeamIds.length) return false;
  const set = new Set(order);
  if (set.size !== order.length) return false;
  return groupTeamIds.every((id) => set.has(id));
};

export type UseAdminFixtureResultsArgs = {
  tournament: Tournament;
};

export const useAdminFixtureResults = ({
  tournament,
}: UseAdminFixtureResultsArgs) => {
  const [groupPredictions, setGroupPredictions] = useState<GroupMatchScoresInput>(() =>
    buildGroupStateFromTournament(tournament.groups),
  );
  const [knockoutPredictions, setKnockoutPredictions] = useState<
    Record<string, KnockoutMatchPrediction>
  >(() => buildKnockoutStateFromTournament(tournament.knockoutMatches));

  const [manualGroupOrder, setManualGroupOrder] = useState<
    Partial<Record<GroupName, string[]>>
  >({});

  useEffect(() => {
    setGroupPredictions(buildGroupStateFromTournament(tournament.groups));
    setKnockoutPredictions(buildKnockoutStateFromTournament(tournament.knockoutMatches));
    setManualGroupOrder({});
  }, [tournament]);

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

    const r32Teams = resolveR32MatchTeamSlotsFromStandings(
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
    [tournament.groups, rawGroupStandings, manualGroupOrder],
  );

  const updateGroupMatch = useCallback(
    (matchId: string, homeGoals: number | null, awayGoals: number | null) => {
      setGroupPredictions((prev) => ({
        ...prev,
        [matchId]: { homeGoals, awayGoals },
      }));
    },
    [],
  );

  const cascadeWinner = useCallback(
    (
      state: Record<string, KnockoutMatchPrediction>,
      matchId: string,
    ): Record<string, KnockoutMatchPrediction> =>
      cascadeKnockoutWinnerState(state, matchId, winnerSourceMap),
    [winnerSourceMap],
  );

  const updateKnockoutMatch = useCallback(
    (matchId: string, patch: Partial<KnockoutMatchPrediction>) => {
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
    [cascadeWinner],
  );

  const buildKnockoutSavePayload = useCallback(
    (
      m: KnockoutMatch,
      p: KnockoutMatchPrediction,
    ): { home: number; away: number; override?: string } | null => {
      if (!p.homeTeamId || !p.awayTeamId || !p.winnerId) return null;
      if (p.winnerId !== p.homeTeamId && p.winnerId !== p.awayTeamId) return null;

      const dbH = m.homeGoals;
      const dbA = m.awayGoals;

      let home = p.homeGoals;
      let away = p.awayGoals;
      if (dbH != null && dbA != null && home === 0 && away === 0) {
        home = dbH;
        away = dbA;
      }

      if (home === 0 && away === 0) {
        if (p.winnerId === p.homeTeamId) {
          home = 1;
          away = 0;
        } else {
          home = 0;
          away = 1;
        }
      } else {
        const implied = naturalWinnerFromScore(home, away, p.homeTeamId, p.awayTeamId);
        if (implied && implied !== p.winnerId) {
          if (p.winnerId === p.homeTeamId) {
            home = 1;
            away = 0;
          } else {
            home = 0;
            away = 1;
          }
        } else if (!implied && p.winnerId) {
          return { home: 1, away: 1, override: p.winnerId };
        }
      }

      if (home === away) {
        return { home, away, override: p.winnerId };
      }
      return { home, away };
    },
    [],
  );

  const applyMatchResults = useCallback(async (): Promise<{
    ok: true; saved: number; errors: string[]
  } | { ok: false; error: string }> => {
    const errors: string[] = [];
    let saved = 0;

    for (const g of tournament.groups) {
      for (const m of g.matches) {
        const p = groupPredictions[m.id];
        if (!p || p.homeGoals === null || p.awayGoals === null) continue;

        if (m.homeGoals === p.homeGoals && m.awayGoals === p.awayGoals) continue;

        const res = await saveMatchResultAction(m.id, p.homeGoals, p.awayGoals, undefined);
        if (!res.success) {
          errors.push(`Grupo ${g.id} · ${m.id}: ${res.error}`);
          continue;
        }
        saved += 1;
      }
    }

    for (const m of tournament.knockoutMatches) {
      const p = knockoutPredictions[m.id];
      if (!p) continue;
      const payload = buildKnockoutSavePayload(m, p);
      if (!payload) continue;

      const sameWinner = m.winner?.id === p.winnerId;
      const sameScores =
        m.homeGoals != null &&
        m.awayGoals != null &&
        m.homeGoals === payload.home &&
        m.awayGoals === payload.away;
      if (sameWinner && sameScores) continue;

      const res = await saveMatchResultAction(
        m.id,
        payload.home,
        payload.away,
        payload.override,
      );
      if (!res.success) {
        errors.push(`KO ${m.matchNumber}: ${res.error}`);
        continue;
      }
      saved += 1;
    }

    if (errors.length) {
      return { ok: true, saved, errors };
    }
    return { ok: true, saved, errors: [] };
  }, [
    tournament.groups,
    tournament.knockoutMatches,
    groupPredictions,
    knockoutPredictions,
    buildKnockoutSavePayload,
  ]);

  return {
    groupPredictions,
    knockoutPredictions,
    calculatedStandings,
    groupStandingsTieInfo,
    moveTeamInGroupOrder,
    updateGroupMatch,
    updateKnockoutMatch,
    applyMatchResults,
  };
};

export const buildAllTeamsList = (tournament: Tournament): Team[] =>
  tournament.groups.flatMap((g) => g.teams);

/** Equipos del torneo (fase de grupos), sin duplicar; orden alfabético para selects admin. */
export const buildTournamentTeamSelectOptions = (
  tournament: Tournament,
): { id: string; name: string }[] => {
  const byId = new Map<string, string>();
  for (const g of tournament.groups) {
    for (const t of g.teams) {
      if (!byId.has(t.id)) byId.set(t.id, t.name);
    }
  }
  return [...byId.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
};
