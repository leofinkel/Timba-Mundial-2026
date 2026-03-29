import type { KnockoutRound } from '@/types/tournament';

/** Short column titles for the horizontal knockout bracket UI. */
export const KNOCKOUT_BRACKET_COLUMN_LABELS: Record<KnockoutRound, string> = {
  'round-of-32': 'Dieciseisavos',
  'round-of-16': 'Octavos',
  'quarter-finals': 'Cuartos',
  'semi-finals': 'Semis',
  'third-place': '3er puesto',
  final: 'Final',
};
