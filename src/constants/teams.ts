import type { GroupName, Team } from '@/types/tournament';

const flagUrl = (code: string) => `/flags/${code}.svg`;

/**
 * 48 selecciones: 42 clasificadas al sorteo (Wikipedia, estado previo a playoffs Mar 2026)
 * + 4 ganadores esperados UEFA (playoffs) + 2 ganadores esperados interconfederación.
 * Actualizar cuando FIFA confirme los 6 clasificados restantes.
 */
const AFC_TEAMS = [
  { id: 'aus', name: 'Australia', code: 'AUS' },
  { id: 'irn', name: 'Iran', code: 'IRN' },
  { id: 'jpn', name: 'Japan', code: 'JPN' },
  { id: 'jor', name: 'Jordan', code: 'JOR' },
  { id: 'qat', name: 'Qatar', code: 'QAT' },
  { id: 'ksa', name: 'Saudi Arabia', code: 'KSA' },
  { id: 'kor', name: 'South Korea', code: 'KOR' },
  { id: 'uzb', name: 'Uzbekistan', code: 'UZB' },
] as const;

const CAF_TEAMS = [
  { id: 'alg', name: 'Algeria', code: 'ALG' },
  { id: 'cpv', name: 'Cape Verde', code: 'CPV' },
  { id: 'egy', name: 'Egypt', code: 'EGY' },
  { id: 'gha', name: 'Ghana', code: 'GHA' },
  { id: 'civ', name: "Ivory Coast", code: 'CIV' },
  { id: 'mar', name: 'Morocco', code: 'MAR' },
  { id: 'rsa', name: 'South Africa', code: 'RSA' },
  { id: 'sen', name: 'Senegal', code: 'SEN' },
  { id: 'tun', name: 'Tunisia', code: 'TUN' },
] as const;

const CONCACAF_TEAMS = [
  { id: 'can', name: 'Canada', code: 'CAN' },
  { id: 'cuw', name: 'Curaçao', code: 'CUW' },
  { id: 'hai', name: 'Haiti', code: 'HAI' },
  { id: 'mex', name: 'Mexico', code: 'MEX' },
  { id: 'pan', name: 'Panama', code: 'PAN' },
  { id: 'usa', name: 'United States', code: 'USA' },
] as const;

const CONMEBOL_TEAMS = [
  { id: 'arg', name: 'Argentina', code: 'ARG' },
  { id: 'bra', name: 'Brazil', code: 'BRA' },
  { id: 'col', name: 'Colombia', code: 'COL' },
  { id: 'ecu', name: 'Ecuador', code: 'ECU' },
  { id: 'par', name: 'Paraguay', code: 'PAR' },
  { id: 'uru', name: 'Uruguay', code: 'URU' },
] as const;

const OFC_TEAMS = [{ id: 'nzl', name: 'New Zealand', code: 'NZL' }] as const;

/** 12 clasificados UEFA directos + 4 cupos vía playoffs (elegidos representativos). */
const UEFA_TEAMS = [
  { id: 'aut', name: 'Austria', code: 'AUT' },
  { id: 'bel', name: 'Belgium', code: 'BEL' },
  { id: 'cro', name: 'Croatia', code: 'CRO' },
  { id: 'eng', name: 'England', code: 'ENG' },
  { id: 'fra', name: 'France', code: 'FRA' },
  { id: 'ger', name: 'Germany', code: 'GER' },
  { id: 'ned', name: 'Netherlands', code: 'NED' },
  { id: 'nor', name: 'Norway', code: 'NOR' },
  { id: 'por', name: 'Portugal', code: 'POR' },
  { id: 'sco', name: 'Scotland', code: 'SCO' },
  { id: 'esp', name: 'Spain', code: 'ESP' },
  { id: 'sui', name: 'Switzerland', code: 'SUI' },
  { id: 'ita', name: 'Italy', code: 'ITA' },
  { id: 'den', name: 'Denmark', code: 'DEN' },
  { id: 'ukr', name: 'Ukraine', code: 'UKR' },
  { id: 'pol', name: 'Poland', code: 'POL' },
] as const;

/** Playoffs interconfederación (placeholders esperados — confirmar con FIFA). */
const INTERCONF_TEAMS = [
  { id: 'jam', name: 'Jamaica', code: 'JAM' },
  { id: 'bol', name: 'Bolivia', code: 'BOL' },
] as const;

const toTeam = (t: { id: string; name: string; code: string }): Team => ({
  id: t.id,
  name: t.name,
  code: t.code,
  flagUrl: flagUrl(t.code),
  groupId: null,
});

export const TEAMS: readonly Team[] = [
  ...AFC_TEAMS.map(toTeam),
  ...CAF_TEAMS.map(toTeam),
  ...CONCACAF_TEAMS.map(toTeam),
  ...CONMEBOL_TEAMS.map(toTeam),
  ...OFC_TEAMS.map(toTeam),
  ...UEFA_TEAMS.map(toTeam),
  ...INTERCONF_TEAMS.map(toTeam),
];

export const GROUP_ASSIGNMENTS: Record<GroupName, string[]> = {
  A: [],
  B: [],
  C: [],
  D: [],
  E: [],
  F: [],
  G: [],
  H: [],
  I: [],
  J: [],
  K: [],
  L: [],
};
