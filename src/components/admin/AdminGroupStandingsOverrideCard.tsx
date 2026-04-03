'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
  clearGroupStandingsOverrideAction,
  saveGroupStandingsOverrideAction,
} from '@/actions/results';
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
import { GROUP_NAMES } from '@/constants/tournament';
import type { GroupName, Tournament } from '@/types/tournament';

interface AdminGroupStandingsOverrideCardProps {
  tournament: Tournament;
  initialOverrides: Partial<Record<GroupName, string[]>>;
}

const defaultOrderForGroup = (
  tournament: Tournament,
  groupId: GroupName,
): [string, string, string, string] => {
  const teams = tournament.groups.find((g) => g.id === groupId)?.teams ?? [];
  const ids = teams.map((t) => t.id);
  while (ids.length < 4) ids.push('');
  return [ids[0]!, ids[1]!, ids[2]!, ids[3]!];
};

export const AdminGroupStandingsOverrideCard = ({
  tournament,
  initialOverrides,
}: AdminGroupStandingsOverrideCardProps) => {
  const router = useRouter();
  const [groupId, setGroupId] = useState<GroupName>('A');
  const [order, setOrder] = useState<[string, string, string, string]>(() =>
    defaultOrderForGroup(tournament, 'A'),
  );
  const [pending, startTransition] = useTransition();

  const syncOrderFromProps = useCallback(
    (gid: GroupName) => {
      const saved = initialOverrides[gid];
      if (saved && saved.length === 4) {
        setOrder([saved[0]!, saved[1]!, saved[2]!, saved[3]!]);
        return;
      }
      setOrder(defaultOrderForGroup(tournament, gid));
    },
    [initialOverrides, tournament],
  );

  useEffect(() => {
    syncOrderFromProps(groupId);
  }, [groupId, syncOrderFromProps]);

  const teamsInGroup = useMemo(() => {
    return tournament.groups.find((g) => g.id === groupId)?.teams ?? [];
  }, [tournament.groups, groupId]);

  const hasOverride = initialOverrides[groupId]?.length === 4;

  const setPosition = (index: 0 | 1 | 2 | 3, teamId: string) => {
    setOrder((prev) => {
      const next = [...prev] as [string, string, string, string];
      next[index] = teamId;
      return next;
    });
  };

  const submit = () => {
    startTransition(async () => {
      const res = await saveGroupStandingsOverrideAction(groupId, [...order]);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Posiciones del grupo guardadas — se usan para puntos de posición');
      router.refresh();
    });
  };

  const clearOverride = () => {
    startTransition(async () => {
      const res = await clearGroupStandingsOverrideAction(groupId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Override quitado — se vuelve al orden según resultados');
      syncOrderFromProps(groupId);
      router.refresh();
    });
  };

  return (
    <Card className="border-zinc-800/80 shadow-md">
      <CardHeader>
        <CardTitle>Posiciones finales por grupo (override)</CardTitle>
        <CardDescription>
          Si FIFA / desempates requieren un orden distinto al calculado por goles, definí 1.º a 4.º
          acá. Solo aplica cuando hay exactamente 4 equipos asignados (reemplaza la tabla calculada
          para puntos de posición y para el bracket automático).
          {hasOverride ? (
            <span className="ml-1 text-emerald-400">Este grupo tiene override activo.</span>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Grupo</Label>
          <Select value={groupId} onValueChange={(v) => setGroupId(v as GroupName)}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUP_NAMES.map((g) => (
                <SelectItem key={g} value={g}>
                  Grupo {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {teamsInGroup.length === 4 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['1.º', 0],
                ['2.º', 1],
                ['3.º', 2],
                ['4.º', 3],
              ] as const
            ).map(([label, idx]) => (
              <div key={label} className="space-y-2">
                <Label>{label}</Label>
                <Select value={order[idx]} onValueChange={(v) => setPosition(idx, v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Equipo…" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamsInGroup.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            El grupo no tiene 4 equipos en el fixture cargado.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            className="bg-emerald-600 text-white hover:bg-emerald-600/90"
            disabled={pending || teamsInGroup.length !== 4}
            onClick={submit}
          >
            Guardar posiciones
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || !hasOverride}
            onClick={clearOverride}
          >
            Quitar override
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
