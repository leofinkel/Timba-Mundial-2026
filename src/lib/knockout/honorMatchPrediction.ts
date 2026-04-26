import type { KnockoutMatch } from '@/types/tournament';

/** Final (104) o 3.º/4.º puesto (103); no hay ronda siguiente: el “ganador” es 1.º/3.º. */
export const isHonorPlacementMatch = (m: {
  matchNumber: number;
  round?: string;
}): boolean =>
  m.matchNumber === 103 ||
  m.matchNumber === 104 ||
  m.round === 'final' ||
  m.round === 'third-place';

/**
 * Sincroniza goles y `winnerId` con el 1.º/3.º puesto (siempre 1-0 o 0-1) para
 * que el motor de puntos (goles o desempate) coincida con el orden elegido.
 */
export const goalsAndWinnerForHonorFirst = (
  homeTeamId: string,
  awayTeamId: string,
  honorFirstTeamId: string,
): { homeGoals: number; awayGoals: number; winnerId: string } => {
  if (!honorFirstTeamId) {
    return { homeGoals: 0, awayGoals: 0, winnerId: '' };
  }
  if (honorFirstTeamId === homeTeamId) {
    return { homeGoals: 1, awayGoals: 0, winnerId: homeTeamId };
  }
  if (honorFirstTeamId === awayTeamId) {
    return { homeGoals: 0, awayGoals: 1, winnerId: awayTeamId };
  }
  return { homeGoals: 0, awayGoals: 0, winnerId: '' };
};

export const completedHonorPair = (
  homeTeamId: string,
  awayTeamId: string,
  honorFirstTeamId: string,
  honorSecondTeamId: string,
): boolean => {
  if (!homeTeamId || !awayTeamId || !honorFirstTeamId || !honorSecondTeamId) {
    return false;
  }
  if (honorFirstTeamId === honorSecondTeamId) return false;
  const set = new Set([honorFirstTeamId, honorSecondTeamId]);
  return set.size === 2 && set.has(homeTeamId) && set.has(awayTeamId);
};

/** A partir del ganador y el otro equipo, rellenar 1.º-2.º o 3.º-4.º. */
export const honorPairFromWinnerAndOpponent = (
  homeTeamId: string,
  awayTeamId: string,
  winnerId: string,
): { honorFirstTeamId: string; honorSecondTeamId: string } => {
  if (!winnerId) return { honorFirstTeamId: '', honorSecondTeamId: '' };
  if (winnerId === homeTeamId && awayTeamId) {
    return { honorFirstTeamId: homeTeamId, honorSecondTeamId: awayTeamId };
  }
  if (winnerId === awayTeamId && homeTeamId) {
    return { honorFirstTeamId: awayTeamId, honorSecondTeamId: homeTeamId };
  }
  return { honorFirstTeamId: '', honorSecondTeamId: '' };
};

export const matchLabelForHonorRole = (m: Pick<KnockoutMatch, 'matchNumber'>) => {
  if (m.matchNumber === 104) {
    return { first: 'Campeón (1.º)', second: 'Subcampeón (2.º)' } as const;
  }
  if (m.matchNumber === 103) {
    return { first: '3.º puesto', second: '4.º puesto' } as const;
  }
  return { first: '1.º puesto', second: '2.º puesto' } as const;
};
