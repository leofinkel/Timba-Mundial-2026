/**
 * Compares THIRD_PLACE_COMBINATION_MATRIX with Tabla combinaciones tercer puesto.xlsx.
 * Run: npx tsx scripts/verify-third-place-matrix.ts
 */
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { THIRD_PLACE_COMBINATION_MATRIX } from '../src/constants/thirdPlaceBracketMatrix';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('');

/** Row 0 header cell → R32 match_number (must match seed.sql / thirdPlaceCombinationMeta). */
const headerToMatchNumber = (headerCell: string): number => {
  const t = String(headerCell).replace(/\s+/g, ' ').trim().toUpperCase();
  if (t.startsWith('1A')) return 79;
  if (t.startsWith('1B')) return 85;
  if (t.startsWith('1D')) return 81;
  if (t.startsWith('1E')) return 74;
  if (t.startsWith('1G')) return 82;
  if (t.startsWith('1I')) return 77;
  if (t.startsWith('1K')) return 87;
  if (t.startsWith('1L')) return 80;
  throw new Error(`Unknown winner column header: ${JSON.stringify(headerCell)}`);
};

type MatrixRow = Record<string, number>;

const parseDataRow = (
  headerRow: unknown[],
  dataRow: unknown[],
  rowIdx: number,
): { line: string; key: string; map: MatrixRow } => {
  const line = String(dataRow[0] ?? '').trim();
  const qualifying: string[] = [];
  for (let c = 0; c < 12; c++) {
    const cell = dataRow[1 + c];
    if (cell == null || cell === '') continue;
    const letter = GROUP_LETTERS[c];
    const v = String(cell).trim().toUpperCase();
    if (v !== letter) {
      throw new Error(`Row ${rowIdx}: expected ${letter} in group column ${c}, got ${JSON.stringify(cell)}`);
    }
    qualifying.push(letter);
  }
  if (qualifying.length !== 8) {
    throw new Error(`Row ${rowIdx}: expected 8 qualifying groups, got ${qualifying.length}`);
  }
  const key = [...qualifying].sort().join('');
  const map: MatrixRow = {};
  for (let j = 0; j < 8; j++) {
    const matchNum = headerToMatchNumber(String(headerRow[14 + j] ?? ''));
    const thirdRaw = dataRow[14 + j];
    const mm = String(thirdRaw ?? '').match(/^3([A-L])$/i);
    if (!mm) {
      throw new Error(`Row ${rowIdx}: bad third cell ${JSON.stringify(thirdRaw)}`);
    }
    const g = mm[1]!.toUpperCase();
    map[g] = matchNum;
  }
  return { line, key, map };
};

const wb = XLSX.readFile(path.join(root, 'Tabla combinaciones tercer puesto.xlsx'));
const sheet = wb.Sheets[wb.SheetNames[0]!]!;
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];
const headerRow = rows[0] ?? [];

let mismatches = 0;
for (let i = 1; i < rows.length; i++) {
  const dataRow = rows[i];
  if (!dataRow?.length) continue;
  const { line, key, map } = parseDataRow(headerRow, dataRow, i + 1);
  const existing = THIRD_PLACE_COMBINATION_MATRIX[key as keyof typeof THIRD_PLACE_COMBINATION_MATRIX];
  if (!existing) {
    console.error(`Line ${line}: missing key in TS matrix: ${key}`);
    mismatches++;
    continue;
  }
  for (const g of Object.keys(map)) {
    const a = map[g];
    const b = existing[g as keyof typeof existing];
    if (a !== b) {
      console.error(
        `Line ${line} key ${key}: group ${g} Excel=${a} TS=${b}`,
      );
      mismatches++;
    }
  }
  for (const g of Object.keys(existing)) {
    if (map[g] === undefined) {
      console.error(`Line ${line} key ${key}: TS has ${g} but Excel missing`);
      mismatches++;
    }
  }
}

console.log(mismatches === 0 ? 'OK: Excel matches THIRD_PLACE_COMBINATION_MATRIX (495 rows).' : `Done. Mismatches: ${mismatches}`);
process.exit(mismatches === 0 ? 0 : 1);
