'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { updatePaymentStatusAction } from '@/actions/admin';
import { Badge } from '@/components/ui/badge';
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

interface AdminPaymentsTabProps {
  users: UserProfile[];
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

export const AdminPaymentsTab = ({ users }: AdminPaymentsTabProps) => {
  return (
    <div className="rounded-lg border border-zinc-800/80 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800/80 hover:bg-transparent">
            <TableHead>Jugador</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Pago</TableHead>
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
                {u.paymentStatus === 'paid' ? (
                  <Badge className="border-transparent bg-emerald-600 text-white">Pagó</Badge>
                ) : (
                  <Badge variant="destructive">Pendiente</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <PaymentToggle user={u} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
