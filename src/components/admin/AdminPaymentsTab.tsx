'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
  banUserAction,
  deleteUserAction,
  unbanUserAction,
  updatePaymentStatusAction,
} from '@/actions/admin';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PaymentStatus, UserProfile } from '@/types/auth';
import { MoreHorizontal } from 'lucide-react';

interface AdminPaymentsTabProps {
  users: UserProfile[];
  currentAdminId: string;
}

const PaymentToggle = ({ user }: { user: UserProfile }) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const paid = user.paymentStatus === 'paid';

  const onCheckedChange = (checked: boolean) => {
    const status: PaymentStatus = checked ? 'paid' : 'pending';
    startTransition(async () => {
      const res = await updatePaymentStatusAction(user.id, status);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(checked ? 'Marcado como pagado' : 'Marcado como pendiente');
      router.refresh();
    });
  };

  return (
    <Switch checked={paid} onCheckedChange={onCheckedChange} disabled={pending} />
  );
};

const UserModerationMenu = ({
  target,
  currentAdminId,
}: {
  target: UserProfile;
  currentAdminId: string;
}) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isSelf = target.id === currentAdminId;
  const isOtherAdmin = target.role === 'admin';
  const cannotModerate = isSelf || isOtherAdmin;

  const run = async (action: () => Promise<{ success: boolean; error?: string }>, okMsg: string) => {
    startTransition(async () => {
      const res = await action();
      if (!res.success) {
        toast.error(res.error ?? 'Error');
        return;
      }
      toast.success(okMsg);
      setDeleteOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 border-zinc-700"
            disabled={cannotModerate || pending}
            aria-label="Acciones de usuario"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="border-zinc-800 bg-zinc-950 text-zinc-100">
          {target.accountStatus === 'banned' ? (
            <DropdownMenuItem
              className="cursor-pointer focus:bg-zinc-900"
              onSelect={() =>
                run(() => unbanUserAction(target.id), 'Usuario reactivado')
              }
            >
              Reactivar cuenta
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className="cursor-pointer text-amber-200 focus:bg-zinc-900"
              onSelect={() =>
                run(() => banUserAction(target.id), 'Usuario suspendido')
              }
            >
              Suspender cuenta
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="cursor-pointer text-red-300 focus:bg-zinc-900"
            onSelect={() => setDeleteOpen(true)}
          >
            Eliminar definitivamente…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar usuario</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Se borrará la cuenta de <strong className="text-zinc-200">{target.displayName}</strong>{' '}
              ({target.email}), incluidos pronósticos y datos asociados. Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="border-zinc-700"
              onClick={() => setDeleteOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={cannotModerate || pending}
              onClick={() =>
                run(() => deleteUserAction(target.id), 'Usuario eliminado')
              }
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const AdminPaymentsTab = ({ users, currentAdminId }: AdminPaymentsTabProps) => {
  return (
    <div className="rounded-lg border border-zinc-800/80 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800/80 hover:bg-transparent">
            <TableHead>Jugador</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Cuenta</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Pago</TableHead>
            <TableHead className="w-[52px] text-right"> </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id} className="border-zinc-800/80">
              <TableCell className="font-medium">{u.displayName}</TableCell>
              <TableCell className="text-muted-foreground max-w-[200px] truncate">
                {u.email}
              </TableCell>
              <TableCell>
                <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                  {u.role === 'admin' ? 'Admin' : 'Usuario'}
                </Badge>
              </TableCell>
              <TableCell>
                {u.accountStatus === 'banned' ? (
                  <Badge variant="destructive">Suspendida</Badge>
                ) : (
                  <Badge className="border-transparent bg-zinc-700 text-zinc-100">Activa</Badge>
                )}
              </TableCell>
              <TableCell>
                {u.paymentStatus === 'paid' ? (
                  <Badge className="border-transparent bg-emerald-600 text-white">Pagó</Badge>
                ) : (
                  <Badge variant="destructive">Pendiente</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <PaymentToggle user={u} />
              </TableCell>
              <TableCell className="text-right">
                <UserModerationMenu target={u} currentAdminId={currentAdminId} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
