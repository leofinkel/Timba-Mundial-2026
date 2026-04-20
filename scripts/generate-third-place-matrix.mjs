/**
 * Optional: regenerates `thirdPlaceBracketMatrix.ts` from English Wikipedia wikitext
 * (Template:2026 FIFA World Cup third-place_table). Useful for cross-checks only.
 *
 * Canonical source in this repo is FIFA's table in `Tabla combinaciones tercer puesto.xlsx`
 * (compare/validate with `scripts/verify-third-place-matrix.ts` and `scripts/parse-third-xlsx.mjs`).
 *
 * Usage: node scripts/generate-third-place-matrix.mjs [path-to-raw-wikitext.txt]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const SLOT_MATCH_NUMBERS = [79, 85, 81, 74, 82, 77, 87, 80]; // 1A,1B,1D,1E,1G,1I,1K,1L

const parseCells = (line) =>
  line
    .replace(/^\|\s*/, '')
    .split(/\s*\|\|\s*/)
    .map((c) => c.trim().replace(/'''/g, ''));

const letterFromGroupCell = (cell) => {
  if (!cell || cell === '') return null;
  const m = cell.match(/^([A-L])$/);
  return m ? m[1] : null;
};

const letterFromThirdCell = (cell) => {
  const m = cell.trim().match(/^3([A-L])$/i);
  return m ? m[1].toUpperCase() : null;
};

const main = () => {
  const srcPath =
    process.argv[2] ||
    path.join(__dirname, 'data', 'third-place-wikipedia.raw.txt');

  const raw = fs.readFileSync(srcPath, 'utf8').replace(/\r\n/g, '\n');
  const chunks = raw.split(/\n\|-\n/).filter((c) => c.includes('scope="row"'));
  const matrix = {};

  for (const chunk of chunks) {
    const lines = chunk.split('\n').map((l) => l.trim());
    const numLine = lines.find((l) => l.startsWith('! scope="row"'));
    if (!numLine) continue;
    const nm = numLine.match(/! scope="row"\s*\|\s*(\d+)/);
    if (!nm) continue;
    const rowNum = parseInt(nm[1], 10);
    if (rowNum < 1 || rowNum > 495) continue;

    const cellLines = lines.filter(
      (l) =>
        l.startsWith('|') &&
        !l.startsWith('!') &&
        !l.includes('rowspan'),
    );

    let groupCells = [];
    let thirdCells = [];

    if (rowNum === 1) {
      if (cellLines.length < 2) throw new Error('Row 1: expected 2 cell lines');
      groupCells = parseCells(cellLines[0]);
      thirdCells = parseCells(cellLines[1]);
    } else {
      const all = parseCells(cellLines[0]);
      if (all.length < 20) {
        throw new Error(`Row ${rowNum}: expected ≥20 cells, got ${all.length}`);
      }
      groupCells = all.slice(0, 12);
      thirdCells = all.slice(12, 20);
    }

    if (groupCells.length !== 12 || thirdCells.length !== 8) {
      throw new Error(
        `Row ${rowNum}: bad lengths groups=${groupCells.length} thirds=${thirdCells.length}`,
      );
    }

    const qualifying = [];
    for (let i = 0; i < 12; i++) {
      const g = String.fromCharCode(65 + i);
      const cell = groupCells[i];
      const L = letterFromGroupCell(cell);
      if (L && L !== g) {
        throw new Error(`Row ${rowNum}: col ${g} cell "${cell}" has wrong letter`);
      }
      if (L) qualifying.push(L);
    }
    if (qualifying.length !== 8) {
      throw new Error(`Row ${rowNum}: expected 8 qualifying groups, got ${qualifying.length}`);
    }

    const key = [...qualifying].sort().join('');
    const rowMap = {};
    for (let i = 0; i < 8; i++) {
      const thirdLetter = letterFromThirdCell(thirdCells[i]);
      if (!thirdLetter) {
        throw new Error(`Row ${rowNum}: bad third cell "${thirdCells[i]}"`);
      }
      rowMap[thirdLetter] = SLOT_MATCH_NUMBERS[i];
    }
    if (Object.keys(rowMap).length !== 8) {
      throw new Error(`Row ${rowNum}: duplicate third mapping`);
    }
    matrix[key] = rowMap;
  }

  if (Object.keys(matrix).length !== 495) {
    throw new Error(`Expected 495 matrix rows, got ${Object.keys(matrix).length}`);
  }

  const json = JSON.stringify(matrix);
  const outPath = path.join(root, 'src', 'constants', 'thirdPlaceBracketMatrix.ts');
  const fileBody = `/** See repo root: Tabla combinaciones tercer puesto.xlsx + scripts/verify-third-place-matrix.ts. This file was produced by generate-third-place-matrix.mjs (wikitext). */\nexport const THIRD_PLACE_COMBINATION_MATRIX: Readonly<Record<string, Readonly<Record<string, number>>>> = ${json} as const;\n`;
  fs.writeFileSync(outPath, fileBody, 'utf8');
  console.log('Wrote', outPath, 'keys:', Object.keys(matrix).length);
};

main();
