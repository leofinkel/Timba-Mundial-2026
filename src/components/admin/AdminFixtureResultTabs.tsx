'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import { saveSpecialResultsAction } from '@/actions/results';
import { AdminGroupStandingsOverrideCard } from '@/components/admin/AdminGroupStandingsOverrideCard';
import { GroupStage } from '@/components/fixture/GroupStage';
import { KnockoutBracket } from '@/components/fixture/KnockoutBracket';
import { SpecialPredictions } from '@/components/fixture/SpecialPredictions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { buildAllTeamsList, useAdminFixtureResults } from '@/hooks/useAdminFixtureResults';
import type { RealResultsRow } from '@/repositories/realResultsRepository';
import type { GroupName, Tournament } from '@/types/tournament';

const UNSET = '__unset__';

type TeamOption = { id: string; name: string };

type OfficialFormState = {
  championTeamId: string;
  runnerUpTeamId: string;
  thirdPlaceTeamId: string;
  fourthPlaceTeamId: string;
  topScorer: string;
  bestPlayer: string;
};

const rowToFormState = (row: RealResultsRow | null): OfficialFormState => ({
  championTeamId: row?.champion_team_id ?? UNSET,
  runnerUpTeamId: row?.runner_up_team_id ?? UNSET,
  thirdPlaceTeamId: row?.third_place_team_id ?? UNSET,
  fourthPlaceTeamId: row?.fourth_place_team_id ?? UNSET,
  topScorer: row?.top_scorer ?? '',
  bestPlayer: row?.best_player ?? '',
});

type AdminFixtureResultTabsProps = {
  tournament: Tournament;
  groupStandingOverrides: Partial<Record<GroupName, string[]>>;
  teams: TeamOption[];
  initialOfficialResults: RealResultsRow | null;
};

export const AdminFixtureResultTabs = ({
  tournament,
  groupStandingOverrides,
  teams,
  initialOfficialResults,
}: AdminFixtureResultTabsProps) => {
  const router = useRouter();
  const [specialForm, setSpecialForm] = useState<OfficialFormState>(() =>
    rowToFormState(initialOfficialResults),
  );

  useEffect(() => {
    setSpecialForm(rowToFormState(initialOfficialResults));
  }, [initialOfficialResults?.id, initialOfficialResults?.updated_at]);

  const {
    groupPredictions,
    knockoutPredictions,
    calculatedStandings,
    groupStandingsTieInfo,
    moveTeamInGroupOrder,
    updateGroupMatch,
    updateKnockoutMatch,
    applyMatchResults,
  } = useAdminFixtureResults({ tournament, groupStandingOverrides });

  const allTeams = buildAllTeamsList(tournament);
  const [pendingMatches, startMatchSave] = useTransition();
  const [pendingSpecial, startSpecialSave] = useTransition();

  const handleMatchSave = useCallback(() => {
    startMatchSave(async () => {
      const res = await applyMatchResults();
      if (!res.ok) {
        toast.error('No se pudo guardar');
        return;
      }
      if (res.errors.length) {
        toast.error(res.errors[0] ?? 'Error al guardar');
        return;
      }
      if (res.saved === 0) {
        toast.message('Nada que guardar: los resultados coinciden con el servidor');
      } else {
        toast.success(
          res.saved === 1
            ? '1 partido actualizado. Puntajes recalculados.'
            : `${res.saved} partidos actualizados. Puntajes recalculados.`,
        );
      }
      router.refresh();
    });
  }, [applyMatchResults, router]);

  const updateSpecial = useCallback((patch: Partial<OfficialFormState>) => {
    setSpecialForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSpecialSave = useCallback(() => {
    if (!specialForm.topScorer.trim() || !specialForm.bestPlayer.trim()) {
      toast.error('Completá goleador y mejor jugador');
      return;
    }
    if (
      specialForm.championTeamId === UNSET ||
      specialForm.runnerUpTeamId === UNSET ||
      specialForm.thirdPlaceTeamId === UNSET ||
      specialForm.fourthPlaceTeamId === UNSET
    ) {
      toast.error('Seleccioná las cuatro selecciones');
      return;
    }
    startSpecialSave(async () => {
      const res = await saveSpecialResultsAction({
        championTeamId: specialForm.championTeamId,
        runnerUpTeamId: specialForm.runnerUpTeamId,
        thirdPlaceTeamId: specialForm.thirdPlaceTeamId,
        fourthPlaceTeamId: specialForm.fourthPlaceTeamId,
        topScorer: specialForm.topScorer.trim(),
        bestPlayer: specialForm.bestPlayer.trim(),
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Resultados especiales guardados. Puntajes recalculados.');
      router.refresh();
    });
  }, [router, specialForm]);

  if (!tournament.groups.length && !tournament.knockoutMatches.length) {
    return (
      <p className="text-sm text-zinc-400">
        No hay partidos de fixture para cargar resultados.
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
            Resultados especiales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="mt-4">
          <GroupStage
            groups={tournament.groups}
            groupPredictions={groupPredictions}
            calculatedStandings={calculatedStandings}
            groupStandingsTieInfo={groupStandingsTieInfo}
            onMoveTeamInGroupOrder={moveTeamInGroupOrder}
            onGroupMatchUpdate={updateGroupMatch}
            disabled={pendingMatches}
          />
          <div className="mt-6">
            <AdminGroupStandingsOverrideCard
              tournament={tournament}
              initialOverrides={groupStandingOverrides}
            />
          </div>
        </TabsContent>

        <TabsContent value="knockout" className="mt-4">
          <KnockoutBracket
            matches={tournament.knockoutMatches}
            knockoutPredictions={knockoutPredictions}
            allTeams={allTeams}
            onKnockoutChange={updateKnockoutMatch}
            disabled={pendingMatches}
          />
        </TabsContent>

        <TabsContent value="specials" className="mt-4 space-y-6">
          <SpecialPredictions
            topScorer={specialForm.topScorer}
            bestPlayer={specialForm.bestPlayer}
            onTopScorerChange={(v) => updateSpecial({ topScorer: v })}
            onBestPlayerChange={(v) => updateSpecial({ bestPlayer: v })}
            disabled={pendingSpecial}
          />

          <Card className="border-zinc-800/80 shadow-md">
            <CardHeader>
              <CardTitle>Honor board</CardTitle>
              <CardDescription>Campeón, podio y cierre (comparan con predicción en puntajes)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Campeón</Label>
                  <Select
                    value={specialForm.championTeamId}
                    onValueChange={(v) => updateSpecial({ championTeamId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar…" />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[min(50vh,280px)]">
                        <SelectItem value={UNSET} disabled>
                          Seleccionar…
                        </SelectItem>
                        {teams.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subcampeón</Label>
                  <Select
                    value={specialForm.runnerUpTeamId}
                    onValueChange={(v) => updateSpecial({ runnerUpTeamId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar…" />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[min(50vh,280px)]">
                        <SelectItem value={UNSET} disabled>
                          Seleccionar…
                        </SelectItem>
                        {teams.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>3.er puesto</Label>
                  <Select
                    value={specialForm.thirdPlaceTeamId}
                    onValueChange={(v) => updateSpecial({ thirdPlaceTeamId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar…" />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[min(50vh,280px)]">
                        <SelectItem value={UNSET} disabled>
                          Seleccionar…
                        </SelectItem>
                        {teams.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>4.º puesto</Label>
                  <Select
                    value={specialForm.fourthPlaceTeamId}
                    onValueChange={(v) => updateSpecial({ fourthPlaceTeamId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar…" />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[min(50vh,280px)]">
                        <SelectItem value={UNSET} disabled>
                          Seleccionar…
                        </SelectItem>
                        {teams.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={pendingSpecial}
                onClick={handleSpecialSave}
              >
                Guardar honor board
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col gap-2 border-t border-zinc-800/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-400">
          Guardá el marcador de los partidos que cambiaste; se comparan con las
          planillas y se recalculan los puntos. En grupos, los puntos por posición
          solo cuentan cuando el grupo termina (todos los partidos con resultado)
          y el 1.º–4.º oficiales quedan guardados abajo o con override.
        </p>
        <Button
          type="button"
          size="lg"
          disabled={pendingMatches}
          onClick={handleMatchSave}
          className="bg-emerald-600 text-white hover:bg-emerald-600/90"
        >
          {pendingMatches ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          {pendingMatches ? 'Guardando...' : 'Guardar partidos oficiales'}
        </Button>
      </div>
    </div>
  );
};
