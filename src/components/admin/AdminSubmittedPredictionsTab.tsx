'use client';

import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye } from 'lucide-react';
import { useState } from 'react';

import { OtherUserPredictionsDialog } from '@/components/rankings/OtherUserPredictionsDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AdminSubmittedPredictionUser } from '@/types/admin';
import type { Tournament } from '@/types/tournament';

interface AdminSubmittedPredictionsTabProps {
  users: AdminSubmittedPredictionUser[];
  tournament: Tournament;
}

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || '?';
};

export const AdminSubmittedPredictionsTab = ({
  users,
  tournament,
}: AdminSubmittedPredictionsTabProps) => {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<AdminSubmittedPredictionUser | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Jugadores que guardaron su planilla al menos una vez. Podés abrir la vista de solo lectura de
        sus pronósticos en cualquier momento.
      </p>

      <div className="overflow-x-auto rounded-lg border border-zinc-800/80">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800/80 hover:bg-transparent">
              <TableHead>Jugador</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Último guardado</TableHead>
              <TableHead className="text-right">Planilla</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                  Todavía nadie guardó el fixture.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.userId} className="border-zinc-800/80">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar size="sm" className="border border-zinc-700/80">
                        {u.avatarUrl ? (
                          <AvatarImage src={u.avatarUrl} alt="" className="object-cover" />
                        ) : null}
                        <AvatarFallback className="bg-zinc-800 text-[10px] text-zinc-200">
                          {initials(u.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-zinc-100">{u.displayName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[220px] truncate text-sm">
                    {u.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(parseISO(u.updatedAt), "d MMM yyyy, HH:mm", { locale: es })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-zinc-600"
                      onClick={() => {
                        setTarget(u);
                        setOpen(true);
                      }}
                    >
                      <Eye className="mr-1 size-4" aria-hidden />
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <OtherUserPredictionsDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setTarget(null);
        }}
        targetUserId={target?.userId ?? null}
        targetDisplayName={target?.displayName ?? ''}
        tournament={tournament}
        fetchSource="admin"
      />
    </div>
  );
};
