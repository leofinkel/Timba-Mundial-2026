import type { GroupName, KnockoutRoundConfig } from '@/types/tournament';

export const TOTAL_GROUPS = 12 as const;

export const TEAMS_PER_GROUP = 4 as const;

/** 6 partidos por grupo × 12 grupos */
export const GROUP_MATCHES_COUNT = 72 as const;

export const TOTAL_MATCHES = 104 as const;

/** 16 + 8 + 4 + 2 + 1 + 1 (dieciseisavos → final + tercer puesto) */
export const KNOCKOUT_MATCHES_COUNT = 32 as const;

export const PREDICTION_DEADLINE = '2026-05-25T23:59:59Z' as const;

export const GROUP_NAMES = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
] as const satisfies readonly GroupName[];

export const KNOCKOUT_ROUNDS = [
  {
    id: 'round-of-32',
    name: 'Dieciseisavos de Final',
    matchCount: 16,
  },
  {
    id: 'round-of-16',
    name: 'Octavos de Final',
    matchCount: 8,
  },
  {
    id: 'quarter-finals',
    name: 'Cuartos de Final',
    matchCount: 4,
  },
  {
    id: 'semi-finals',
    name: 'Semifinales',
    matchCount: 2,
  },
  {
    id: 'third-place',
    name: 'Tercer Puesto',
    matchCount: 1,
  },
  {
    id: 'final',
    name: 'Final',
    matchCount: 1,
  },
] as const satisfies readonly KnockoutRoundConfig[];
