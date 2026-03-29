import type {
  RoundOf32MatchTemplate,
  ThirdPlaceBracketMatrix,
} from '@/types/bracket';

/**
 * TODO: Reemplazar con la matriz oficial de la FIFA para mejores terceros (48 equipos / 12 grupos).
 * PLACEHOLDER: sin entradas — la lógica de cruces debe actualizarse cuando FIFA publique la tabla.
 */
export const THIRD_PLACE_BRACKET_MATRIX: ThirdPlaceBracketMatrix = {};

/**
 * TODO: Sustituir por la llave real de dieciseisavos de la FIFA 2026.
 * PLACEHOLDER: emparejamiento cruzado simple 1º vs 2º entre pares de grupos adyacentes (A–B, C–D, …)
 * más cuatro partidos genéricos para huecos de mejores terceros (texto libre, a reasignar).
 */
export const ROUND_OF_32_TEMPLATE = [
  { id: 'r32-m01', homeSource: '1A', awaySource: '2B' },
  { id: 'r32-m02', homeSource: '1B', awaySource: '2A' },
  { id: 'r32-m03', homeSource: '1C', awaySource: '2D' },
  { id: 'r32-m04', homeSource: '1D', awaySource: '2C' },
  { id: 'r32-m05', homeSource: '1E', awaySource: '2F' },
  { id: 'r32-m06', homeSource: '1F', awaySource: '2E' },
  { id: 'r32-m07', homeSource: '1G', awaySource: '2H' },
  { id: 'r32-m08', homeSource: '1H', awaySource: '2G' },
  { id: 'r32-m09', homeSource: '1I', awaySource: '2J' },
  { id: 'r32-m10', homeSource: '1J', awaySource: '2I' },
  { id: 'r32-m11', homeSource: '1K', awaySource: '2L' },
  { id: 'r32-m12', homeSource: '1L', awaySource: '2K' },
  {
    id: 'r32-m13',
    homeSource: '3-PLACEHOLDER-1',
    awaySource: '3-PLACEHOLDER-2',
  },
  {
    id: 'r32-m14',
    homeSource: '3-PLACEHOLDER-3',
    awaySource: '3-PLACEHOLDER-4',
  },
  {
    id: 'r32-m15',
    homeSource: '3-PLACEHOLDER-5',
    awaySource: '3-PLACEHOLDER-6',
  },
  {
    id: 'r32-m16',
    homeSource: '3-PLACEHOLDER-7',
    awaySource: '3-PLACEHOLDER-8',
  },
] as const satisfies readonly RoundOf32MatchTemplate[];
