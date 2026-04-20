/**
 * Verifies Excel col A (línea) matches combinationLineFromExcludedKey for each row.
 * Run: npx tsx scripts/verify-combination-lines.ts
 */
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  combinationLineFromExcludedKey,
  excludedGroupsKeyFromQualifyingKey,
  qualifyingGroupsKey,
} from '../src/lib/knockout/thirdPlaceCombinationMeta';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('');

const wb = XLSX.readFile(path.join(root, 'Tabla combinaciones tercer puesto.xlsx'));
const sheet = wb.Sheets[wb.SheetNames[0]!]!;
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];

let bad = 0;
for (let i = 1; i < rows.length; i++) {
  const dataRow = rows[i];
  if (!dataRow?.length) continue;
  const excelLine = parseInt(String(dataRow[0] ?? '').trim(), 10);
  if (Number.isNaN(excelLine)) continue;
  const qualifying: string[] = [];
  for (let c = 0; c < 12; c++) {
    const cell = dataRow[1 + c];
    if (cell == null || cell === '') continue;
    qualifying.push(GROUP_LETTERS[c]!);
  }
  const key = qualifyingGroupsKey(qualifying);
  const excluded = excludedGroupsKeyFromQualifyingKey(key);
  const computedLine = combinationLineFromExcludedKey(excluded);
  if (computedLine !== excelLine) {
    console.error(
      `Row ${i + 1}: Excel línea=${excelLine} computed=${computedLine} excluded=${excluded} key=${key}`,
    );
    bad++;
  }
}
console.log(bad === 0 ? 'OK: All 495 líneas match combinationLineFromExcludedKey.' : `Mismatches: ${bad}`);
process.exit(bad === 0 ? 0 : 1);
