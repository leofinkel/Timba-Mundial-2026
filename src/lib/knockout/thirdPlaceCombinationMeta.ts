/**
 * FIFA / Excel "Tabla combinaciones" indexing: the 495 rows are ordered by the
 * four group letters whose third-placed teams do **not** qualify, sorted
 * lexicographically (C(12,4) = 495). Row / línea N uses the N-th such quartet.
 *
 * The eight qualifying groups are the complement in A–L; their sorted string
 * is the matrix key in {@link THIRD_PLACE_COMBINATION_MATRIX}.
 */

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('');

function combinations4From12(): string[] {
  const out: string[] = [];
  const rec = (start: number, acc: string) => {
    if (acc.length === 4) {
      out.push(acc);
      return;
    }
    for (let i = start; i < 12; i++) {
      rec(i + 1, acc + GROUP_LETTERS[i]);
    }
  };
  rec(0, '');
  return out.sort();
}

/** Sorted C(12,4) keys, same order as línea 1…495 in the official spreadsheet. */
const EXCLUDED_FOUR_KEYS_SORTED: readonly string[] = combinations4From12();

/** For each R32 match that has a best-third slot, the fixed opponent source (home) — third is always away in these fixtures (seed). */
export const R32_OPPONENT_SOURCE_FOR_THIRD_SLOT: Readonly<Record<number, string>> = {
  74: '1E',
  77: '1I',
  79: '1A',
  80: '1L',
  81: '1D',
  82: '1G',
  85: '1B',
  87: '1K',
} as const;

export const normalizeThirdPlaceGroupId = (groupId: string): string => {
  const g = groupId.trim().toUpperCase();
  if (!/^[A-L]$/.test(g)) {
    throw new Error(`Invalid group id for third-place matrix: "${groupId}"`);
  }
  return g;
};

export const qualifyingGroupsKey = (qualifyingGroups: string[]): string =>
  [...new Set(qualifyingGroups.map(normalizeThirdPlaceGroupId))].sort().join('');

export const excludedGroupsKeyFromQualifyingKey = (qualifyingKey: string): string => {
  if (qualifyingKey.length !== 8) {
    throw new Error(`Qualifying key must be 8 letters; got ${qualifyingKey.length}`);
  }
  const have = new Set(qualifyingKey.split(''));
  const excluded = GROUP_LETTERS.filter((l) => !have.has(l));
  if (excluded.length !== 4) {
    throw new Error('Internal error: expected 4 excluded groups');
  }
  return excluded.join('');
};

/** 1-based línea in the 495-row table (same as sorted index of excluded-four key + 1). */
export const combinationLineFromExcludedKey = (excludedFourSorted: string): number => {
  const idx = EXCLUDED_FOUR_KEYS_SORTED.indexOf(excludedFourSorted);
  if (idx < 0) {
    throw new Error(`Unknown excluded-groups key: "${excludedFourSorted}"`);
  }
  return idx + 1;
};

export type ThirdPlaceCombinationMeta = {
  readonly qualifyingKey: string;
  readonly excludedKey: string;
  readonly combinationLine: number;
};

export const getThirdPlaceCombinationMeta = (
  qualifyingGroups: string[],
): ThirdPlaceCombinationMeta => {
  const qualifyingKey = qualifyingGroupsKey(qualifyingGroups);
  if (qualifyingKey.length !== 8) {
    throw new Error(
      `Third-place allocation requires 8 distinct qualifying groups; got key "${qualifyingKey}"`,
    );
  }
  const excludedKey = excludedGroupsKeyFromQualifyingKey(qualifyingKey);
  return {
    qualifyingKey,
    excludedKey,
    combinationLine: combinationLineFromExcludedKey(excludedKey),
  };
};
