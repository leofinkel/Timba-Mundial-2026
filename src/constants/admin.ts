import { GROUP_NAMES, KNOCKOUT_ROUNDS } from '@/constants/tournament';

export const ADMIN_STAGE_OPTIONS = [
  { value: 'group', label: 'Fase de grupos' },
  ...KNOCKOUT_ROUNDS.map((round) => ({
    value: round.id,
    label: round.name,
  })),
] as const;

export const ADMIN_GROUP_OPTIONS = GROUP_NAMES.map((groupId) => ({
  value: groupId,
  label: `Grupo ${groupId}`,
}));
