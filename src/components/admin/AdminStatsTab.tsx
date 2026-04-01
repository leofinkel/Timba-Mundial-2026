'use client';

import { BarChart3, CreditCard, Goal, Users } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminStatsTabProps {
  totalUsers: number;
  paidUsers: number;
  predictionsSubmitted: number;
  matchesWithResults: number;
}

export const AdminStatsTab = ({
  totalUsers,
  paidUsers,
  predictionsSubmitted,
  matchesWithResults,
}: AdminStatsTabProps) => {
  const cards = [
    {
      title: 'Usuarios totales',
      value: totalUsers,
      description: 'Cuentas registradas',
      Icon: Users,
    },
    {
      title: 'Pagos confirmados',
      value: paidUsers,
      description: 'Habilitados para jugar',
      Icon: CreditCard,
    },
    {
      title: 'Predicciones enviadas',
      value: predictionsSubmitted,
      description: 'Planillas con submit',
      Icon: BarChart3,
    },
    {
      title: 'Partidos jugados',
      value: matchesWithResults,
      description: 'Con resultado cargado',
      Icon: Goal,
    },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(({ title, value, description, Icon }) => (
        <Card key={title} className="border-zinc-800/80 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="text-emerald-600 size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-900">{value}</p>
            <CardDescription className="mt-1">{description}</CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
