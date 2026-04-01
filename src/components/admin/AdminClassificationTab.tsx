'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
  deleteClassificationAdminAction,
  upsertClassificationAdminAction,
} from '@/actions/admin';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AdminClassificationEntry } from '@/types/admin';
import type { UserProfile } from '@/types/auth';

interface AdminClassificationTabProps {
  classification: AdminClassificationEntry[];
  users: UserProfile[];
}

export const AdminClassificationTab = ({ classification, users }: AdminClassificationTabProps) => {
  const [pending, startTransition] = useTransition();
  const [userId, setUserId] = useState(users[0]?.id ?? '');
  const [totalPoints, setTotalPoints] = useState('0');
  const [rank, setRank] = useState('');

  const createOrUpdate = () => {
    const points = Number.parseInt(totalPoints, 10);
    const rankValue = rank.trim() ? Number.parseInt(rank, 10) : null;

    if (!userId || Number.isNaN(points) || (rankValue !== null && Number.isNaN(rankValue))) {
      toast.error('Completá usuario y puntos válidos');
      return;
    }

    startTransition(async () => {
      const res = await upsertClassificationAdminAction({
        userId,
        totalPoints: points,
        rank: rankValue,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Clasificación guardada');
      setRank('');
      setTotalPoints('0');
    });
  };

  const remove = (targetUserId: string) => {
    startTransition(async () => {
      const res = await deleteClassificationAdminAction(targetUserId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Entrada eliminada');
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800/80 shadow-md">
        <CardHeader>
          <CardTitle>ABM de clasificación</CardTitle>
          <CardDescription>Alta/edición manual de puntos y puesto por usuario.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2 sm:col-span-2">
            <Label>Usuario</Label>
            {users.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay usuarios disponibles.</p>
            ) : (
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.displayName} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label>Puntos</Label>
            <Input
              type="number"
              min={0}
              value={totalPoints}
              onChange={(e) => setTotalPoints(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Puesto (opcional)</Label>
            <Input type="number" min={1} value={rank} onChange={(e) => setRank(e.target.value)} />
          </div>
          <div className="sm:col-span-4">
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-600/90"
              disabled={pending}
              onClick={createOrUpdate}
            >
              Guardar clasificación
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-zinc-800/80 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800/80 hover:bg-transparent">
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Puntos</TableHead>
              <TableHead className="text-right">Puesto</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classification.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-6 text-center">
                  No hay clasificación cargada todavía.
                </TableCell>
              </TableRow>
            ) : (
              classification.map((entry) => (
                <TableRow key={entry.userId} className="border-zinc-800/80">
                  <TableCell className="font-medium">{entry.displayName}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.email}</TableCell>
                  <TableCell className="text-right">{entry.totalPoints}</TableCell>
                  <TableCell className="text-right">{entry.rank ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={pending}
                      onClick={() => remove(entry.userId)}
                    >
                      Eliminar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
