'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { saveMatchResultAction, saveSpecialResultsAction } from '@/actions/results';
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

interface MatchOption {
  id: string;
  label: string;
  homeGoals: number | null;
  awayGoals: number | null;
}

interface TeamOption {
  id: string;
  name: string;
}

interface AdminResultsTabProps {
  matchOptions: MatchOption[];
  teams: TeamOption[];
}

export const AdminResultsTab = ({ matchOptions, teams }: AdminResultsTabProps) => {
  const [matchId, setMatchId] = useState(matchOptions[0]?.id ?? '');
  const [homeGoals, setHomeGoals] = useState('0');
  const [awayGoals, setAwayGoals] = useState('0');
  const [pendingMatch, startMatchTransition] = useTransition();

  const [championTeamId, setChampionTeamId] = useState(teams[0]?.id ?? '');
  const [runnerUpTeamId, setRunnerUpTeamId] = useState(teams[1]?.id ?? teams[0]?.id ?? '');
  const [thirdPlaceTeamId, setThirdPlaceTeamId] = useState(teams[2]?.id ?? teams[0]?.id ?? '');
  const [fourthPlaceTeamId, setFourthPlaceTeamId] = useState(teams[3]?.id ?? teams[0]?.id ?? '');
  const [topScorer, setTopScorer] = useState('');
  const [bestPlayer, setBestPlayer] = useState('');
  const [pendingSpecial, startSpecialTransition] = useTransition();

  const selected = useMemo(
    () => matchOptions.find((m) => m.id === matchId),
    [matchOptions, matchId],
  );

  const submitMatch = () => {
    const home = Number.parseInt(homeGoals, 10);
    const away = Number.parseInt(awayGoals, 10);
    if (!matchId || Number.isNaN(home) || Number.isNaN(away)) {
      toast.error('Completá partido y goles válidos');
      return;
    }
    startMatchTransition(async () => {
      const res = await saveMatchResultAction(matchId, home, away);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Resultado guardado');
    });
  };

  const submitSpecial = () => {
    if (!topScorer.trim() || !bestPlayer.trim()) {
      toast.error('Completá goleador y mejor jugador');
      return;
    }
    if (!championTeamId || !runnerUpTeamId || !thirdPlaceTeamId || !fourthPlaceTeamId) {
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
          <Button
            type="button"
            className="bg-emerald-600 text-white hover:bg-emerald-600/90"
            disabled={pendingMatch}
            onClick={submitMatch}
          >
            Guardar resultado
          </Button>
        </CardContent>
      </Card>

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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[min(50vh,280px)]">
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[min(50vh,280px)]">
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[min(50vh,280px)]">
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[min(50vh,280px)]">
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
