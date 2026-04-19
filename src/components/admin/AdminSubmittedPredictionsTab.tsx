'use client';

import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteUserPredictionAsAdminAction, syncSavedPredictionsBracketAdminAction } from '@/actions/admin';
import { OtherUserPredictionsDialog } from '@/components/rankings/OtherUserPredictionsDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<AdminSubmittedPredictionUser | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AdminSubmittedPredictionUser | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deletePending, setDeletePending] = useState(false);
  const [syncPending, setSyncPending] = useState(false);

  const resetDeleteDialog = () => {
    setDeleteTarget(null);
    setDeleteStep(1);
    setDeletePending(false);
  };

  const handleDeleteConfirmFinal = async () => {
    if (!deleteTarget) return;
    setDeletePending(true);
    const res = await deleteUserPredictionAsAdminAction(deleteTarget.userId);
    setDeletePending(false);
    if (res.success) {
      const removedUserId = deleteTarget.userId;
      toast.success('Pronóstico eliminado.');
      resetDeleteDialog();
      if (target?.userId === removedUserId) {
        setOpen(false);
        setTarget(null);
      }
      router.refresh();
      return;
    }
    toast.error(res.error === 'Forbidden' ? 'No tenés permiso.' : res.error);
  };

  const handleSyncBracket = async () => {
    setSyncPending(true);
    const res = await syncSavedPredictionsBracketAdminAction();
    setSyncPending(false);
    if (res.success) {
      const rpcNote =
        res.data.scoreRpcErrors > 0
          ? ` Aviso: ${res.data.scoreRpcErrors} errores al recalcular puntajes (RPC).`
          : '';
      toast.success(
        `Sincronizado: ${res.data.processedPredictions} planillas con 72/72 grupos; ` +
          `omitidas (grupo incompleto): ${res.data.skippedIncompleteGroup}; ` +
          `ganadores KO invalidados: ${res.data.clearedInvalidWinners}.${rpcNote}`,
      );
      router.refresh();
      return;
    }
    toast.error(res.error === 'Forbidden' ? 'No tenés permiso.' : res.error);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Jugadores que guardaron su planilla al menos una vez. Podés abrir la vista de solo lectura de
        sus pronósticos en cualquier momento. Como admin podés borrar una planilla (doble
        confirmación).
      </p>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
        <p className="text-sm text-zinc-300">
          Tras cambiar la lógica de mejores terceros / bracket, sincronizá las planillas guardadas:
          recalcula tablas de grupo, valida ganadores de eliminatoria y recalcula puntajes.
        </p>
        <Button
          type="button"
          variant="secondary"
          disabled={syncPending}
          onClick={() => void handleSyncBracket()}
          className="shrink-0 border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
        >
          {syncPending ? 'Sincronizando…' : 'Sincronizar planillas (nueva lógica)'}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800/80">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800/80 hover:bg-transparent">
              <TableHead>Jugador</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Último guardado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
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
                    <div className="flex flex-wrap items-center justify-end gap-2">
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-red-900/80 text-red-300 hover:bg-red-950/40 hover:text-red-200"
                        onClick={() => {
                          setDeleteTarget(u);
                          setDeleteStep(1);
                        }}
                      >
                        <Trash2 className="mr-1 size-4" aria-hidden />
                        Borrar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(next) => {
          if (!next) resetDeleteDialog();
        }}
      >
        <DialogContent className="border-zinc-800/80 bg-zinc-950 text-zinc-50 sm:max-w-md">
          {deleteStep === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">¿Borrar pronóstico?</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Vas a borrar la planilla guardada de{' '}
                  <span className="font-medium text-zinc-200">{deleteTarget?.displayName}</span>. Para
                  continuar se pedirá una segunda confirmación.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  className="border-zinc-600"
                  onClick={resetDeleteDialog}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="bg-red-700 text-white hover:bg-red-600"
                  onClick={() => setDeleteStep(2)}
                >
                  Continuar
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">Confirmación final</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Se eliminarán todos los datos del pronóstico de{' '}
                  <span className="font-medium text-zinc-200">{deleteTarget?.displayName}</span>{' '}
                  (partidos, posiciones y especiales). Esta acción no se puede deshacer.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  className="border-zinc-600"
                  onClick={() => setDeleteStep(1)}
                  disabled={deletePending}
                >
                  Volver
                </Button>
                <Button
                  type="button"
                  className="bg-red-700 text-white hover:bg-red-600"
                  disabled={deletePending}
                  onClick={() => void handleDeleteConfirmFinal()}
                >
                  {deletePending ? 'Borrando…' : 'Borrar definitivamente'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

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
