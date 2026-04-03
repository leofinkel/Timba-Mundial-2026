'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
  clearMatchResultAction,
  saveKnockoutWinnerAction,
  saveMatchResultAction,
  saveSpecialResultsAction,
} from '@/actions/results';
import { AdminGroupStandingsOverrideCard } from '@/components/admin/AdminGroupStandingsOverrideCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { GroupName, Tournament } from '@/types/tournament';

interface MatchOption {
  id: string;
  label: string;
  homeGoals: number | null;
  awayGoals: number | null;
  stage: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  winnerTeamId: string | null;
}

interface TeamOption {
  id: string;
  name: string;
}

interface AdminResultsTabProps {
  matchOptions: MatchOption[];
  teams: TeamOption[];
  tournament: Tournament;
  groupStandingOverrides: Partial<Record<GroupName, string[]>>;
}

const UNSET = '__unset__';

export const AdminResultsTab = ({
  matchOptions,
  teams,
  tournament,
  groupStandingOverrides,
}: AdminResultsTabProps) => {
  const router = useRouter();
  const [matchId, setMatchId] = useState(matchOptions[0]?.id ?? '');
  const [homeGoals, setHomeGoals] = useState('0');
  const [awayGoals, setAwayGoals] = useState('0');
  const [winnerOverride, setWinnerOverride] = useState(UNSET);
  const [pendingMatch, startMatchTransition] = useTransition();

  const [championTeamId, setChampionTeamId] = useState(UNSET);
  const [runnerUpTeamId, setRunnerUpTeamId] = useState(UNSET);
  const [thirdPlaceTeamId, setThirdPlaceTeamId] = useState(UNSET);
  const [fourthPlaceTeamId, setFourthPlaceTeamId] = useState(UNSET);
  const [topScorer, setTopScorer] = useState('');
  const [bestPlayer, setBestPlayer] = useState('');
  const [pendingSpecial, startSpecialTransition] = useTransition();

  const selected = useMemo(
    () => matchOptions.find((m) => m.id === matchId),
    [matchOptions, matchId],
  );

  useEffect(() => {
    const m = matchOptions.find((x) => x.id === matchId);
    if (!m) return;
    setHomeGoals(m.homeGoals != null ? String(m.homeGoals) : '0');
    setAwayGoals(m.awayGoals != null ? String(m.awayGoals) : '0');
    if (m.stage !== 'group' && m.homeTeamId && m.awayTeamId) {
      if (m.winnerTeamId && (m.winnerTeamId === m.homeTeamId || m.winnerTeamId === m.awayTeamId)) {
        setWinnerOverride(m.winnerTeamId);
      } else {
        setWinnerOverride(UNSET);
      }
    } else {
      setWinnerOverride(UNSET);
    }
  }, [matchId, matchOptions]);

  const isKnockout = selected ? selected.stage !== 'group' : false;
  const hasStoredResult =
    !!selected &&
    (selected.homeGoals != null ||
      selected.awayGoals != null ||
      (selected.stage !== 'group' && selected.winnerTeamId != null));
  const isDraw =
    homeGoals !== '' &&
    awayGoals !== '' &&
    Number.parseInt(homeGoals, 10) === Number.parseInt(awayGoals, 10);

  const knockoutTeams = useMemo(() => {
    if (!selected || !isKnockout) return [];
    return teams.filter(
      (t) => t.id === selected.homeTeamId || t.id === selected.awayTeamId,
    );
  }, [selected, isKnockout, teams]);

  const submitMatch = () => {
    const home = Number.parseInt(homeGoals, 10);
    const away = Number.parseInt(awayGoals, 10);
    if (!matchId || Number.isNaN(home) || Number.isNaN(away)) {
      toast.error('Completá partido y goles válidos');
      return;
    }
    if (isKnockout && home === away && winnerOverride === UNSET) {
      toast.error('En eliminatorias con empate, seleccioná un ganador (penales)');
      return;
    }
    startMatchTransition(async () => {
      const override = isKnockout && home === away && winnerOverride !== UNSET
        ? winnerOverride
        : undefined;
      const res = await saveMatchResultAction(matchId, home, away, override);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Resultado guardado — equipos avanzados automáticamente');
      router.refresh();
    });
  };

  const submitKnockoutWinner = () => {
    if (!matchId || winnerOverride === UNSET) {
      toast.error('Seleccioná el ganador');
      return;
    }
    startMatchTransition(async () => {
      const res = await saveKnockoutWinnerAction(matchId, winnerOverride);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Ganador guardado — equipo avanzado automáticamente');
      router.refresh();
    });
  };

  const clearResult = () => {
    if (!matchId) return;
    startMatchTransition(async () => {
      const res = await clearMatchResultAction(matchId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Resultado borrado');
      setHomeGoals('0');
      setAwayGoals('0');
      setWinnerOverride(UNSET);
      router.refresh();
    });
  };

  const submitSpecial = () => {
    if (!topScorer.trim() || !bestPlayer.trim()) {
      toast.error('Completá goleador y mejor jugador');
      return;
    }
    if (
      championTeamId === UNSET ||
      runnerUpTeamId === UNSET ||
      thirdPlaceTeamId === UNSET ||
      fourthPlaceTeamId === UNSET
    ) {
      toast.error('Seleccioná las cuatro selecciones');
      return;
    }
    startSpecialTransition(async () => {
      const res = await saveSpecialResultsAction({
        championTeamId,
        runnerUpTeamId,
        thirdPlaceTeamId,
        fourthPlaceTeamId,
        topScorer: topScorer.trim(),
        bestPlayer: bestPlayer.trim(),
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Resultados especiales guardados');
      router.refresh();
    });
  };

  if (matchOptions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No hay partidos cargados en la base todavía.</p>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="border-zinc-800/80 shadow-md">
        <CardHeader>
          <CardTitle>Resultados de partido</CardTitle>
          <CardDescription>
            Elegí el encuentro y cargá el marcador oficial.
            {isKnockout && (
              <span className="ml-1 text-emerald-400">
                (Eliminatoria — el ganador avanza automáticamente)
              </span>
            )}
            {selected &&
              (selected.homeGoals != null || selected.awayGoals != null) &&
              ` Actual: ${selected.homeGoals ?? '—'} - ${selected.awayGoals ?? '—'}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Partido</Label>
            <Select value={matchId} onValueChange={setMatchId}>
              <SelectTrigger className="w-full max-w-xl">
                <SelectValue placeholder="Seleccionar…" />
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="h-[min(60vh,320px)]">
                  {matchOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label htmlFor="home-goals">Local</Label>
              <Input
                id="home-goals"
                type="number"
                min={0}
                className="w-24"
                value={homeGoals}
                onChange={(e) => setHomeGoals(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="away-goals">Visitante</Label>
              <Input
                id="away-goals"
                type="number"
                min={0}
                className="w-24"
                value={awayGoals}
                onChange={(e) => setAwayGoals(e.target.value)}
              />
            </div>
          </div>

          {isKnockout && isDraw && knockoutTeams.length === 2 ? (
            <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
              <Label className="text-amber-200">Ganador por penales (empate)</Label>
              <Select value={winnerOverride} onValueChange={setWinnerOverride}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Seleccionar ganador…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNSET} disabled>
                    Seleccionar…
                  </SelectItem>
                  {knockoutTeams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-600/90"
              disabled={pendingMatch}
              onClick={submitMatch}
            >
              Guardar resultado
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pendingMatch || !hasStoredResult}
              onClick={clearResult}
            >
              Borrar resultado
            </Button>

            {isKnockout && knockoutTeams.length === 2 ? (
              <>
                <Separator orientation="vertical" className="h-9" />
                <div className="flex items-end gap-2">
                  <Select value={winnerOverride} onValueChange={setWinnerOverride}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Ganador directo…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNSET} disabled>
                        Seleccionar…
                      </SelectItem>
                      {knockoutTeams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pendingMatch || winnerOverride === UNSET}
                    onClick={submitKnockoutWinner}
                  >
                    Solo ganador
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <AdminGroupStandingsOverrideCard
        tournament={tournament}
        initialOverrides={groupStandingOverrides}
      />

      <Card className="border-zinc-800/80 shadow-md">
        <CardHeader>
          <CardTitle>Resultados especiales</CardTitle>
          <CardDescription>Honor board del torneo (campeón, figuras, etc.)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Campeón</Label>
              <Select value={championTeamId} onValueChange={setChampionTeamId}>
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
              <Select value={runnerUpTeamId} onValueChange={setRunnerUpTeamId}>
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
              <Select value={thirdPlaceTeamId} onValueChange={setThirdPlaceTeamId}>
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
              <Select value={fourthPlaceTeamId} onValueChange={setFourthPlaceTeamId}>
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
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="top-scorer">Goleador</Label>
              <Input
                id="top-scorer"
                value={topScorer}
                onChange={(e) => setTopScorer(e.target.value)}
                placeholder="Nombre del jugador"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="best-player">Mejor jugador</Label>
              <Input
                id="best-player"
                value={bestPlayer}
                onChange={(e) => setBestPlayer(e.target.value)}
                placeholder="Nombre del jugador"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={pendingSpecial}
            onClick={submitSpecial}
          >
            Guardar especiales
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
