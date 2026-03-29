import type { GroupName } from '@/types/tournament';

/** Single round-of-32 pairing expressed as placement sources (e.g. "1A" = 1st in group A). */
export type RoundOf32MatchTemplate = {
  readonly id: string;
  readonly homeSource: string;
  readonly awaySource: string;
};

/**
 * For each group that supplies a best-third qualifier, where that team is slotted in Ro32.
 * TODO: Populate from official FIFA 2026 matrix when released.
 */
export type ThirdPlaceSlotAssignment = {
  readonly matchId: string;
  readonly side: 'home' | 'away';
};

export type ThirdPlaceBracketRow = Partial<
  Record<GroupName, ThirdPlaceSlotAssignment>
>;

/**
 * Key: canonical sorted list of the eight group letters that produced the best thirds,
 * e.g. "A,B,C,D,E,F,G,H".
 */
export type ThirdPlaceBracketMatrix = Readonly<
  Record<string, ThirdPlaceBracketRow>
>;
