'use client';

import { useMemo, useState, useTransition } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';

import {
  createAdminMatchAction,
  deleteAdminMatchAction,
  updateAdminMatchAction,
} from '@/actions/admin';
import { ADMIN_GROUP_OPTIONS, ADMIN_STAGE_OPTIONS } from '@/constants/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MatchRow } from '@/repositories/matchRepository';

interface TeamOption {
  id: string;
  name: string;
}

interface AdminFixtureTabProps {
  matches: MatchRow[];
  teams: TeamOption[];
}

type MatchFormState = {
  stage: string;
  groupId: string | null;
  matchNumber: string;
  matchday: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeSource: string;
  awaySource: string;
  playedAt: string;
};

const emptyForm: MatchFormState = {
  stage: 'group',
  groupId: 'A',
  matchNumber: '1',
  matchday: '1',
  homeTeamId: null,
  awayTeamId: null,
  homeSource: '',
  awaySource: '',
  playedAt: '',
};

const toPayload = (form: MatchFormState) => ({
  stage: form.stage,
  groupId: form.stage === 'group' ? form.groupId : null,
  matchNumber: Number.parseInt(form.matchNumber, 10),
  matchday: form.stage === 'group' ? Number.parseInt(form.matchday, 10) : null,
  homeTeamId: form.homeTeamId,
  awayTeamId: form.awayTeamId,
  homeSource: form.homeSource.trim() || null,
  awaySource: form.awaySource.trim() || null,
  playedAt: form.playedAt ? new Date(form.playedAt).toISOString() : null,
});

export const AdminFixtureTab = ({ matches, teams }: AdminFixtureTabProps) => {
  const [pending, startTransition] = useTransition();
  const [newForm, setNewForm] = useState<MatchFormState>(emptyForm);
  const sortedMatches = useMemo(
    () => [...matches].sort((a, b) => a.match_number - b.match_number),
    [matches],
  );

  const createMatch = () => {
    const payload = toPayload(newForm);
    if (Number.isNaN(payload.matchNumber) || (payload.matchday != null && Number.isNaN(payload.matchday))) {
      toast.error('Completá número y fecha válidos');
      return;
    }

    startTransition(async () => {
      const res = await createAdminMatchAction(payload);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Partido creado');
      setNewForm(emptyForm);
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800/80 shadow-md">
        <CardHeader>
          <CardTitle>Alta de partido</CardTitle>
          <CardDescription>ABM del fixture: crear, editar y eliminar cruces.</CardDescription>
        </CardHeader>
        <CardContent>
          <MatchForm form={newForm} setForm={setNewForm} teams={teams} />
          <Button
            type="button"
            className="mt-4 bg-emerald-600 text-white hover:bg-emerald-600/90"
            disabled={pending}
            onClick={createMatch}
          >
            Crear partido
          </Button>
        </CardContent>
      </Card>

      <ScrollArea className="h-[60vh] pr-3">
        <div className="space-y-4">
          {sortedMatches.map((match) => (
            <MatchEditorCard key={match.id} match={match} teams={teams} pending={pending} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

interface MatchEditorCardProps {
  match: MatchRow;
  teams: TeamOption[];
  pending: boolean;
}

const MatchEditorCard = ({ match, teams, pending }: MatchEditorCardProps) => {
  const [form, setForm] = useState<MatchFormState>({
    stage: match.stage,
    groupId: match.group_id,
    matchNumber: String(match.match_number),
    matchday: match.matchday ? String(match.matchday) : '1',
    homeTeamId: match.home_team_id,
    awayTeamId: match.away_team_id,
    homeSource: match.home_source ?? '',
    awaySource: match.away_source ?? '',
    playedAt: match.played_at ? new Date(match.played_at).toISOString().slice(0, 16) : '',
  });
  const [submitting, startTransition] = useTransition();

  const save = () => {
    const payload = toPayload(form);
    if (Number.isNaN(payload.matchNumber) || (payload.matchday != null && Number.isNaN(payload.matchday))) {
      toast.error('Datos inválidos');
      return;
    }

    startTransition(async () => {
      const res = await updateAdminMatchAction(match.id, payload);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Partido actualizado');
    });
  };

  const remove = () => {
    startTransition(async () => {
      const res = await deleteAdminMatchAction(match.id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Partido eliminado');
    });
  };

  return (
    <Card className="border-zinc-800/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Partido #{match.match_number}</CardTitle>
      </CardHeader>
      <CardContent>
        <MatchForm form={form} setForm={setForm} teams={teams} />
        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" disabled={pending || submitting} onClick={save}>
            Guardar
          </Button>
          <Button type="button" variant="destructive" disabled={pending || submitting} onClick={remove}>
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface MatchFormProps {
  form: MatchFormState;
  setForm: Dispatch<SetStateAction<MatchFormState>>;
  teams: TeamOption[];
}

const MatchForm = ({ form, setForm, teams }: MatchFormProps) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>Fase</Label>
        <Select value={form.stage} onValueChange={(value) => setForm((prev) => ({ ...prev, stage: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ADMIN_STAGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Número de partido</Label>
        <Input
          type="number"
          min={1}
          value={form.matchNumber}
          onChange={(e) => setForm((prev) => ({ ...prev, matchNumber: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label>Grupo</Label>
        <Select
          value={form.groupId ?? 'none'}
          onValueChange={(value) => setForm((prev) => ({ ...prev, groupId: value === 'none' ? null : value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin grupo</SelectItem>
            {ADMIN_GROUP_OPTIONS.map((group) => (
              <SelectItem key={group.value} value={group.value}>
                {group.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Fecha (UTC)</Label>
        <Input
          type="datetime-local"
          value={form.playedAt}
          onChange={(e) => setForm((prev) => ({ ...prev, playedAt: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label>Local</Label>
        <Select
          value={form.homeTeamId ?? 'none'}
          onValueChange={(value) => setForm((prev) => ({ ...prev, homeTeamId: value === 'none' ? null : value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">TBD</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Visitante</Label>
        <Select
          value={form.awayTeamId ?? 'none'}
          onValueChange={(value) => setForm((prev) => ({ ...prev, awayTeamId: value === 'none' ? null : value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">TBD</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Fuente local</Label>
        <Input
          value={form.homeSource}
          onChange={(e) => setForm((prev) => ({ ...prev, homeSource: e.target.value }))}
          placeholder="Ej: 1A"
        />
      </div>

      <div className="space-y-2">
        <Label>Fuente visitante</Label>
        <Input
          value={form.awaySource}
          onChange={(e) => setForm((prev) => ({ ...prev, awaySource: e.target.value }))}
          placeholder="Ej: 2C"
        />
      </div>
    </div>
  );
};
