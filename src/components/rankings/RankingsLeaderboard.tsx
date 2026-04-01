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
import { OtherUserPredictionsDialog } from '@/components/rankings/OtherUserPredictionsDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Leaderboard } from '@/types/ranking';
import type { UserScoreBreakdown } from '@/types/scoring';
import type { Tournament } from '@/types/tournament';

interface RankingsLeaderboardProps {
  leaderboard: Leaderboard;
  currentUserId: string;
  tournament: Tournament;
  viewerPaid: boolean;
  canViewOthersPredictions: boolean;
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
      return <Badge className="border-emerald-500/30 bg-emerald-500/15 text-xs text-emerald-200">Nuevo</Badge>;
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

const displayNameInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || '?';
};

export const RankingsLeaderboard = ({
  leaderboard,
  currentUserId,
  tournament,
  viewerPaid,
  canViewOthersPredictions,
}: RankingsLeaderboardProps) => {
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [predictionDialogOpen, setPredictionDialogOpen] = useState(false);
  const [predictionTarget, setPredictionTarget] = useState<{
    id: string;
    displayName: string;
  } | null>(null);

  const showNameLinks = canViewOthersPredictions && viewerPaid;

  return (
    <Card className="mx-auto w-full max-w-5xl overflow-hidden border-zinc-800/80 bg-zinc-900/50 shadow-md backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg text-white">Tabla de posiciones</CardTitle>
        <CardDescription className="text-zinc-400">
          Actualizado:{' '}
          {new Date(leaderboard.lastUpdated).toLocaleString('es-AR', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
          {showNameLinks ? (
            <>
              {' '}
              · Tocá el nombre de otro jugador para ver sus pronósticos (solo lectura).
            </>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800/80 bg-emerald-500/10 hover:bg-emerald-500/10">
                <TableHead className="w-10 text-zinc-300">#</TableHead>
                <TableHead className="w-12 text-zinc-300">Mov.</TableHead>
                <TableHead className="text-zinc-300">Jugador</TableHead>
                <TableHead className="text-right text-zinc-300">Pts</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-zinc-500">
                    Todavía no hay jugadores con planilla cargada en la clasificación.
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
                          'cursor-pointer border-zinc-800/80 transition-colors',
                          isSelf && 'bg-emerald-500/15 hover:bg-emerald-500/20',
                          !isSelf && 'hover:bg-zinc-800/60',
                        )}
                        onClick={() => setOpenUserId(open ? null : entry.userId)}
                      >
                        <TableCell className="font-bold tabular-nums text-emerald-300">
                          {entry.rank}
                        </TableCell>
                        <TableCell>{movementIcon(entry.movement)}</TableCell>
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-2">
                            <Avatar size="sm" className="border border-zinc-700/80">
                              {entry.avatarUrl ? (
                                <AvatarImage
                                  src={entry.avatarUrl}
                                  alt=""
                                  className="object-cover"
                                />
                              ) : null}
                              <AvatarFallback className="bg-zinc-800 text-[10px] text-zinc-200">
                                {displayNameInitials(entry.displayName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                              {showNameLinks && !isSelf ? (
                                <button
                                  type="button"
                                  className="min-w-0 truncate text-left font-medium text-emerald-300 underline-offset-2 hover:underline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPredictionTarget({
                                      id: entry.userId,
                                      displayName: entry.displayName,
                                    });
                                    setPredictionDialogOpen(true);
                                  }}
                                >
                                  {entry.displayName}
                                </button>
                              ) : (
                                <span className="min-w-0 truncate font-medium text-zinc-100">
                                  {entry.displayName}
                                </span>
                              )}
                              {isSelf ? (
                                <Badge className="shrink-0 border-transparent bg-emerald-600 text-[10px] text-white">
                                  Vos
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-zinc-100">
                          {entry.totalPoints}
                        </TableCell>
                        <TableCell>
                          {open ? (
                            <ChevronUp className="size-4 text-zinc-500" />
                          ) : (
                            <ChevronDown className="size-4 text-zinc-500" />
                          )}
                        </TableCell>
                      </TableRow>
                      {open ? (
                        <TableRow
                          key={`${entry.userId}-detail`}
                          className="bg-zinc-950/50 hover:bg-zinc-950/50"
                        >
                          <TableCell colSpan={5} className="p-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                              Desglose de puntos
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {breakdownRows.map(({ key, label }) => (
                                <div
                                  key={key}
                                  className="flex justify-between gap-4 border-b border-zinc-800/80 py-1 text-sm last:border-0"
                                >
                                  <span className="text-zinc-400">{label}</span>
                                  <span className="font-medium tabular-nums text-zinc-100">
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

      <OtherUserPredictionsDialog
        open={predictionDialogOpen}
        onOpenChange={(open) => {
          setPredictionDialogOpen(open);
          if (!open) {
            setPredictionTarget(null);
          }
        }}
        targetUserId={predictionTarget?.id ?? null}
        targetDisplayName={predictionTarget?.displayName ?? ''}
        tournament={tournament}
      />
    </Card>
  );
};
