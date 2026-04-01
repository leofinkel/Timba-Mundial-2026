import type { PrizeDistribution, ScoringRules } from '@/types/scoring';

export const SCORING_RULES = {
  groupMatch: {
    /** Acertar ganador o empate: 1 punto */
    correctOutcome: 1,
    /** Resultado exacto: +5 extra (total 6 con el punto de outcome) */
    exactResult: 5,
  },
  /** Cada equipo en posición correcta del grupo */
  groupPosition: 5,
  knockout: {
    roundOf32: 10,
    roundOf16: 20,
    quarterFinals: 35,
    semiFinals: 50,
    finalists: 100,
  },
  honorBoard: {
    champion: 180,
    runnerUp: 100,
    thirdPlace: 100,
    fourthPlace: 100,
    topScorer: 100,
    bestPlayer: 100,
  },
} as const satisfies ScoringRules;

/** Valor de inscripción por jugador (ARS). */
export const ENTRY_FEE = 20_000;

export const PRIZE_DISTRIBUTION = {
  first: 0.7,
  second: 0.2,
  third: 0.1,
} as const satisfies PrizeDistribution;
