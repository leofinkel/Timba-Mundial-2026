/**
 * Normalizes goleador / figura names for score comparison.
 * Comparisons are case-insensitive; leading/trailing trim; internal runs of
 * whitespace collapse to a single space.
 */
export const normalizeSpecialPredictionPlayerName = (s: string): string =>
  s.trim().toLowerCase().replace(/\s+/g, ' ');
