'use client';

import { useCallback, useEffect, useRef } from 'react';

import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import { GroupStage } from '@/components/fixture/GroupStage';
import { KnockoutBracket } from '@/components/fixture/KnockoutBracket';
import { SpecialPredictions } from '@/components/fixture/SpecialPredictions';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFixturePredictions } from '@/hooks/useFixturePredictions';
import type { UserPrediction } from '@/types/prediction';
import type { Tournament } from '@/types/tournament';

interface FixturePredictionTabsProps {
  isLoggedIn: boolean;
  saveDisabled: boolean;
  saveDisabledReason?: string;
  tournament: Tournament | null;
  initialPrediction?: UserPrediction | null;
}

export const FixturePredictionTabs = ({
  isLoggedIn,
  saveDisabled,
  saveDisabledReason,
  tournament,
  initialPrediction,
}: FixturePredictionTabsProps) => {
  const fallbackTournament: Tournament = tournament ?? { groups: [], knockoutMatches: [] };

  const {
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
  } = useFixturePredictions({
    tournament: fallbackTournament,
    initialPrediction: initialPrediction ?? undefined,
    isLocked: saveDisabled,
  });

  const allTeams = fallbackTournament.groups.flatMap((g) => g.teams);

  const justSaved = useRef(false);

  const handleSave = useCallback(async () => {
    justSaved.current = true;
    await save();
  }, [save]);

  useEffect(() => {
    if (isSaving || !justSaved.current) return;
    justSaved.current = false;
    if (errors) {
      toast.error(errors);
    } else {
      toast.success('Predicción guardada correctamente.');
    }
  }, [isSaving, errors]);

  if (!tournament) {
    return (
      <p className="py-12 text-center text-sm text-zinc-400">
        No se pudieron cargar los datos del fixture. Intentá recargar la página.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="groups" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-2 border border-zinc-800/80 bg-zinc-900/50 p-2 sm:grid-cols-3">
          <TabsTrigger
            value="groups"
            className="text-zinc-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            Fase de Grupos
          </TabsTrigger>
          <TabsTrigger
            value="knockout"
            className="text-zinc-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            Eliminatorias
          </TabsTrigger>
          <TabsTrigger
            value="specials"
            className="text-zinc-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            Predicciones Especiales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="mt-4">
          <GroupStage
            groups={tournament.groups}
            groupPredictions={groupPredictions}
            calculatedStandings={calculatedStandings}
            onGroupMatchUpdate={updateGroupMatch}
            disabled={saveDisabled || isSaving}
          />
        </TabsContent>

        <TabsContent value="knockout" className="mt-4">
          <KnockoutBracket
            matches={tournament.knockoutMatches}
            knockoutPredictions={knockoutPredictions}
            allTeams={allTeams}
            onKnockoutChange={updateKnockoutMatch}
            disabled={saveDisabled || isSaving}
          />
        </TabsContent>

        <TabsContent value="specials" className="mt-4">
          <SpecialPredictions
            topScorer={specialPredictions.topScorer}
            bestPlayer={specialPredictions.bestPlayer}
            onTopScorerChange={(v) => updateSpecial({ topScorer: v })}
            onBestPlayerChange={(v) => updateSpecial({ bestPlayer: v })}
            disabled={saveDisabled || isSaving}
          />
        </TabsContent>
      </Tabs>

      {isLoggedIn && (
        <div className="flex flex-col gap-2 border-t border-zinc-800/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-400">
            {saveDisabled && saveDisabledReason
              ? saveDisabledReason
              : 'Guardá cuando termines de cargar el fixture.'}
          </p>
          <Button
            type="button"
            size="lg"
            disabled={saveDisabled || isSaving}
            onClick={handleSave}
            className="bg-emerald-600 text-white hover:bg-emerald-600/90"
          >
            {isSaving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            {isSaving ? 'Guardando...' : 'Guardar predicción'}
          </Button>
        </div>
      )}
    </div>
  );
};
