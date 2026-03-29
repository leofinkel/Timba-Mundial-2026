'use client';

import { Fragment, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Minus,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Leaderboard } from '@/types/ranking';
import type { UserScoreBreakdown } from '@/types/scoring';

interface RankingsLeaderboardProps {
  leaderboard: Leaderboard;
  currentUserId: string;
}

type BreakdownPointsKey = {
  [K in keyof UserScoreBreakdown]: UserScoreBreakdown[K] extends number ? K : never;
}[keyof UserScoreBreakdown];

const movementIcon = (movement: string) => {
  switch (movement) {
    case 'up':
      return <ChevronsUp className="size-4 text-emerald-600" aria-hidden />;
    case 'down':
      return <ChevronsDown className="size-4 text-red-600" aria-hidden />;
    case 'new':
      return <Badge variant="secondary" className="text-xs">Nuevo</Badge>;
    default:
      return <Minus className="text-muted-foreground size-4" aria-hidden />;
  }
};

const breakdownRows: { key: BreakdownPointsKey; label: string }[] = [
    { key: 'groupMatchPoints', label: 'Grupos: resultados' },
    { key: 'exactResultBonus', label: 'Bonus resultado exacto' },
    { key: 'groupPositionPoints', label: 'Posiciones en grupo' },
    { key: 'roundOf32Points', label: 'Dieciseisavos' },
    { key: 'roundOf16Points', label: 'Octavos' },
    { key: 'quarterFinalPoints', label: 'Cuartos' },
    { key: 'semiFinalPoints', label: 'Semifinales' },
    { key: 'finalistPoints', label: 'Finalistas' },
    { key: 'championPoints', label: 'Campeón' },
    { key: 'runnerUpPoints', label: 'Subcampeón' },
    { key: 'thirdPlacePoints', label: '3.er puesto' },
    { key: 'fourthPlacePoints', label: '4.º puesto' },
    { key: 'topScorerPoints', label: 'Goleador' },
    { key: 'bestPlayerPoints', label: 'Mejor jugador' },
  ];

export const RankingsLeaderboard = ({
  leaderboard,
  currentUserId,
}: RankingsLeaderboardProps) => {
  const [openUserId, setOpenUserId] = useState<string | null>(null);

  return (
    <Card className="border-emerald-950/10 overflow-hidden shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">Tabla de posiciones</CardTitle>
        <CardDescription>
          Actualizado:{' '}
          {new Date(leaderboard.lastUpdated).toLocaleString('es-AR', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-emerald-950/10 hover:bg-transparent">
                <TableHead className="w-10">#</TableHead>
                <TableHead className="w-12">Mov.</TableHead>
                <TableHead>Jugador</TableHead>
                <TableHead className="text-right">Pts</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                    Todavía no hay puntos cargados.
                  </TableCell>
                </TableRow>
              ) : (
                leaderboard.entries.map((entry) => {
                  const isSelf = entry.userId === currentUserId;
                  const open = openUserId === entry.userId;
                  return (
                    <Fragment key={entry.userId}>
                      <TableRow
                        className={cn(
                          'border-emerald-950/10 cursor-pointer transition-colors',
                          isSelf && 'bg-emerald-600/10 hover:bg-emerald-600/15',
                          !isSelf && 'hover:bg-emerald-950/[0.03]',
                        )}
                        onClick={() => setOpenUserId(open ? null : entry.userId)}
                      >
                        <TableCell className="font-bold tabular-nums text-emerald-900">
                          {entry.rank}
                        </TableCell>
                        <TableCell>{movementIcon(entry.movement)}</TableCell>
                        <TableCell>
                          <span className="font-medium">{entry.displayName}</span>
                          {isSelf ? (
                            <Badge className="ml-2 border-transparent bg-emerald-600 text-[10px] text-white">
                              Vos
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {entry.totalPoints}
                        </TableCell>
                        <TableCell>
                          {open ? (
                            <ChevronUp className="text-muted-foreground size-4" />
                          ) : (
                            <ChevronDown className="text-muted-foreground size-4" />
                          )}
                        </TableCell>
                      </TableRow>
                      {open ? (
                        <TableRow
                          key={`${entry.userId}-detail`}
                          className="bg-muted/40 hover:bg-muted/40"
                        >
                          <TableCell colSpan={5} className="p-4">
                            <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
                              Desglose de puntos
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {breakdownRows.map(({ key, label }) => (
                                <div
                                  key={key}
                                  className="flex justify-between gap-4 border-b border-emerald-950/5 py-1 text-sm last:border-0"
                                >
                                  <span className="text-muted-foreground">{label}</span>
                                  <span className="tabular-nums font-medium">
                                    {entry.breakdown[key]}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
