import type {
  RoundOf32MatchTemplate,
  ThirdPlaceBracketMatrix,
} from '@/types/bracket';

/**
 * Third-place bracket: official 495-combination matrix lives in
 * `src/constants/thirdPlaceBracketMatrix.ts` (lookup in thirdPlaceAllocation.ts).
 */
export const THIRD_PLACE_BRACKET_MATRIX: ThirdPlaceBracketMatrix = {};

/**
 * Round-of-32 bracket template matching the actual FIFA 2026 draw
 * (seed.sql match_number 73–88).
 */
export const ROUND_OF_32_TEMPLATE = [
  { id: 'r32-m73', homeSource: '2A', awaySource: '2B' },
  { id: 'r32-m74', homeSource: '1E', awaySource: '3' },
  { id: 'r32-m75', homeSource: '1F', awaySource: '2C' },
  { id: 'r32-m76', homeSource: '1C', awaySource: '2F' },
  { id: 'r32-m77', homeSource: '1I', awaySource: '3' },
  { id: 'r32-m78', homeSource: '2E', awaySource: '2I' },
  { id: 'r32-m79', homeSource: '1A', awaySource: '3' },
  { id: 'r32-m80', homeSource: '1L', awaySource: '3' },
  { id: 'r32-m81', homeSource: '1D', awaySource: '3' },
  { id: 'r32-m82', homeSource: '1G', awaySource: '3' },
  { id: 'r32-m83', homeSource: '2K', awaySource: '2L' },
  { id: 'r32-m84', homeSource: '1H', awaySource: '2J' },
  { id: 'r32-m85', homeSource: '1B', awaySource: '3' },
  { id: 'r32-m86', homeSource: '1J', awaySource: '2H' },
  { id: 'r32-m87', homeSource: '1K', awaySource: '3' },
  { id: 'r32-m88', homeSource: '2D', awaySource: '2G' },
] as const satisfies readonly RoundOf32MatchTemplate[];
