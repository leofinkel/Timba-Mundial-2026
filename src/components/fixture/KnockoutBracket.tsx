'use client';

import { Fragment, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';

import { KNOCKOUT_BRACKET_COLUMN_LABELS } from '@/constants/fixtureUi';
import { KNOCKOUT_ROUNDS } from '@/constants/tournament';
import type { KnockoutMatchPrediction } from '@/types/prediction';
import type { KnockoutMatch, Team } from '@/types/tournament';

import { KnockoutMatchCard } from '@/components/fixture/KnockoutMatchCard';

type KnockoutBracketProps = {
  matches: KnockoutMatch[];
  knockoutPredictions: Record<string, KnockoutMatchPrediction>;
  allTeams: Team[];
  onKnockoutChange: (matchId: string, patch: Partial<KnockoutMatchPrediction>) => void;
  disabled?: boolean;
};

export const KnockoutBracket = ({
  matches,
  knockoutPredictions,
  allTeams,
  onKnockoutChange,
  disabled = false,
}: KnockoutBracketProps) => {
  const byRound = useMemo(() => {
    const map = new Map<string, KnockoutMatch[]>();
    for (const r of KNOCKOUT_ROUNDS) {
      map.set(
        r.id,
        matches
          .filter((m) => m.round === r.id)
          .sort((a, b) => a.matchNumber - b.matchNumber),
      );
    }
    return map;
  }, [matches]);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-background px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">Llave eliminatoria</h2>
        <p className="text-xs text-muted-foreground">
          Deslizá horizontalmente en el celu · Marcá resultados y elegí equipos cuando falte el
          cruce
        </p>
      </div>

      <div className="-mx-1 flex overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
        <div className="flex min-w-min gap-0 px-1">
          {KNOCKOUT_ROUNDS.map((round, idx) => {
            const inRound = byRound.get(round.id) ?? [];
            return (
              <Fragment key={round.id}>
                {idx > 0 ? (
                  <div
                    className="flex w-7 shrink-0 flex-col items-center justify-center border-l border-dashed border-emerald-500/30 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent sm:w-10"
                    aria-hidden
                  >
                    <ChevronRight className="size-4 text-emerald-600/50 sm:size-5" />
                  </div>
                ) : null}
                <section className="flex w-[min(100vw-2rem,280px)] shrink-0 flex-col sm:w-[260px]">
                  <header className="sticky left-0 z-[1] mb-3 rounded-lg border border-border/60 bg-card/90 px-3 py-2 shadow-sm backdrop-blur-sm">
                    <h3 className="text-center text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      {KNOCKOUT_BRACKET_COLUMN_LABELS[round.id]}
                    </h3>
                    <p className="text-center text-[10px] text-muted-foreground">{round.name}</p>
                  </header>
                  <div className="flex flex-col gap-4">
                    {inRound.map((m) => {
                      const pred = knockoutPredictions[m.id];
                      if (!pred) return null;
                      return (
                        <KnockoutMatchCard
                          key={m.id}
                          match={m}
                          prediction={pred}
                          allTeams={allTeams}
                          onChange={onKnockoutChange}
                          disabled={disabled}
                        />
                      );
                    })}
                  </div>
                </section>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
