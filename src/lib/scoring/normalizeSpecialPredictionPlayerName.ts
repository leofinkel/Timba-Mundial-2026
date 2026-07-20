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

/**
 * Compares goleador / figura names, accepting either "Nombre Apellido" or
 * just "Apellido" on either side (falls back to matching the last word).
 */
export const specialPredictionNamesMatch = (a: string, b: string): boolean => {
  const na = normalizeSpecialPredictionPlayerName(a);
  const nb = normalizeSpecialPredictionPlayerName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const lastWord = (s: string) => s.slice(s.lastIndexOf(' ') + 1);
  return lastWord(na) === lastWord(nb);
};
