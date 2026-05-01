/**
 * Normalizes goleador / figura names for score comparison.
 * Comparisons are case-insensitive and accent-insensitive; punctuation and
 * separators are ignored; internal runs of whitespace collapse to a single space.
 */
export const normalizeSpecialPredictionPlayerName = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
