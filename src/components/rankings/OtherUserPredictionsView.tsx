'use client';

import { useMemo } from 'react';

import { KNOCKOUT_ROUNDS } from '@/constants/tournament';
import type { UserPredictionView } from '@/types/prediction';
import type { GroupName, KnockoutRound, Tournament } from '@/types/tournament';

interface OtherUserPredictionsViewProps {
  displayName: string;
  prediction: UserPredictionView | null;
  tournament: Tournament;
}

const buildTeamMap = (tournament: Tournament) => {
  const m = new Map<string, { name: string; code: string }>();
  for (const g of tournament.groups) {
    for (const t of g.teams) {
      m.set(t.id, { name: t.name, code: t.code });
    }
  }
  for (const km of tournament.knockoutMatches) {
    if (km.homeTeam) m.set(km.homeTeam.id, { name: km.homeTeam.name, code: km.homeTeam.code });
    if (km.awayTeam) m.set(km.awayTeam.id, { name: km.awayTeam.name, code: km.awayTeam.code });
  }
  return m;
};

export const OtherUserPredictionsView = ({
  displayName,
  prediction,
  tournament,
}: OtherUserPredictionsViewProps) => {
  const teamById = useMemo(() => buildTeamMap(tournament), [tournament]);

  const groupPredByMatchId = useMemo(
    () => new Map(prediction?.groupPredictions.map((p) => [p.matchId, p]) ?? []),
    [prediction],
  );

  const koPredByMatchId = useMemo(
    () => new Map(prediction?.knockoutPredictions.map((p) => [p.matchId, p]) ?? []),
    [prediction],
  );

  const koByRound = useMemo(() => {
    const map = new Map<KnockoutRound, typeof tournament.knockoutMatches>();
    for (const m of tournament.knockoutMatches) {
      const arr = map.get(m.round) ?? [];
      arr.push(m);
      map.set(m.round, arr);
    }
    return map;
  }, [tournament]);

  const labelForTeamId = (id: string, fallbackFromMatch: string | null) => {
    if (fallbackFromMatch) return fallbackFromMatch;
    if (!id) return 'Por definir';
    const t = teamById.get(id);
    return t ? `${t.name} (${t.code})` : id;
  };

  if (!prediction) {
    return (
      <p className="text-sm text-zinc-400">
        {displayName} todavía no tiene pronósticos guardados.
      </p>
    );
  }

  return (
    <div className="space-y-6 text-sm">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Especiales
        </p>
        <ul className="space-y-1 text-zinc-200">
          <li>
            <span className="text-zinc-500">Goleador: </span>
            {prediction.specialPredictions.topScorer || '—'}
          </li>
          <li>
            <span className="text-zinc-500">Mejor jugador: </span>
            {prediction.specialPredictions.bestPlayer || '—'}
          </li>
        </ul>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Fase de grupos
        </p>
        <div className="space-y-4">
          {tournament.groups.map((group) => (
            <div key={group.id}>
              <p className="mb-1 font-medium text-emerald-400/90">Grupo {group.id}</p>
              <ul className="divide-y divide-zinc-800/80 rounded-md border border-zinc-800/80">
                {group.matches.map((m) => {
                  const pr = groupPredByMatchId.get(m.id);
                  return (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 text-zinc-200"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {m.homeTeam.name} ({m.homeTeam.code}) — {m.awayTeam.name} ({m.awayTeam.code})
                      </span>
                      <span className="shrink-0 tabular-nums font-medium text-zinc-100">
                        {pr ? `${pr.homeGoals} - ${pr.awayGoals}` : '—'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Eliminatorias
        </p>
        <div className="space-y-4">
          {KNOCKOUT_ROUNDS.map((round) => {
            const matches = koByRound.get(round.id);
            if (!matches?.length) return null;
            return (
              <div key={round.id}>
                <p className="mb-1 font-medium text-emerald-400/90">{round.name}</p>
                <ul className="divide-y divide-zinc-800/80 rounded-md border border-zinc-800/80">
                  {matches.map((m) => {
                    const pr = koPredByMatchId.get(m.id);
                    const homeLabel = labelForTeamId(
                      pr?.homeTeamId ?? '',
                      m.homeTeam ? `${m.homeTeam.name} (${m.homeTeam.code})` : null,
                    );
                    const awayLabel = labelForTeamId(
                      pr?.awayTeamId ?? '',
                      m.awayTeam ? `${m.awayTeam.name} (${m.awayTeam.code})` : null,
                    );
                    return (
                      <li
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 text-zinc-200"
                      >
                        <span className="min-w-0 flex-1 text-xs sm:text-sm">
                          {homeLabel} — {awayLabel}
                        </span>
                        <span className="shrink-0 tabular-nums font-medium text-zinc-100">
                          {pr ? `${pr.homeGoals} - ${pr.awayGoals}` : '—'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {prediction.predictedGroupStandings &&
        Object.keys(prediction.predictedGroupStandings).length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Posiciones por grupo (predichas)
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.entries(prediction.predictedGroupStandings) as [GroupName, string[]][]).map(
              ([gid, teamIds]) => (
                <div key={gid} className="rounded-md border border-zinc-800/80 p-2">
                  <p className="mb-1 text-xs font-medium text-emerald-400/90">Grupo {gid}</p>
                  <ol className="list-decimal pl-4 text-xs text-zinc-300">
                    {teamIds.map((tid) => (
                      <li key={tid}>
                        {teamById.get(tid)?.name ?? tid}
                      </li>
                    ))}
                  </ol>
                </div>
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
