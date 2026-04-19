import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

/** Third-place columns O–V (0-based 14–21) → official R32 match_number */
const COL_TO_MATCH = {
  14: 79,
  15: 85,
  16: 81,
  17: 74,
  18: 82,
  19: 77,
  20: 87,
  21: 80,
};

function parseThirdCell(val) {
  const m = String(val).match(/^3([A-L])$/i);
  return m ? m[1].toUpperCase() : null;
}

function rowToMatrixEntry(rowCells) {
  const groups = [];
  for (let c = 1; c <= 12; c++) {
    const letter = rowCells.get(c);
    if (letter && /^[A-L]$/i.test(letter)) groups.push(letter.toUpperCase());
  }
  if (groups.length !== 8) return null;
  const key = [...groups].sort().join('');
  const alloc = {};
  for (const [col, matchNum] of Object.entries(COL_TO_MATCH)) {
    const ci = parseInt(col, 10);
    const cell = rowCells.get(ci);
    const g = parseThirdCell(cell ?? '');
    if (!g) return null;
    alloc[g] = matchNum;
  }
  return { key, alloc };
}

function loadMatrixFromRepo() {
  const p = path.join(root, 'src/constants/thirdPlaceBracketMatrix.ts');
  const text = fs.readFileSync(p, 'utf8');
  const marker = '= ';
  const start = text.indexOf(marker);
  const end = text.lastIndexOf(' as const');
  if (start === -1 || end === -1) throw new Error('Could not parse matrix file');
  return JSON.parse(text.slice(start + marker.length, end));
}
const sharedPath = path.join(root, 'xlsx_extract/xl/sharedStrings.xml');
const sheetPath = path.join(root, 'xlsx_extract/xl/worksheets/sheet1.xml');

if (!fs.existsSync(sharedPath) || !fs.existsSync(sheetPath)) {
  console.error(
    'Missing xlsx_extract/: unzip "Tabla combinaciones tercer puesto.xlsx" to xlsx_extract/ first.',
  );
  process.exit(1);
}

const readText = (p) => fs.readFileSync(p, 'utf8');

/** @returns {string[]} */
function parseSharedStrings(xml) {
  const strings = [];
  const re = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const tMatch = block.match(/<t[^>]*>([\s\S]*?)<\/t>/g);
    if (!tMatch) {
      strings.push('');
      continue;
    }
    const parts = tMatch.map((tag) => {
      const inner = tag.replace(/^<t[^>]*>/, '').replace(/<\/t>$/, '');
      return inner;
    });
    strings.push(parts.join(''));
  }
  return strings;
}

/** Cell ref A1 -> {c:0,r:0} */
function refToCoords(ref) {
  const m = ref.match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  let col = 0;
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { c: col - 1, r: parseInt(m[2], 10) - 1 };
}

function parseSheet(xml, shared) {
  const rows = new Map();
  const rowRe = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rm;
  while ((rm = rowRe.exec(xml))) {
    const r = parseInt(rm[1], 10) - 1;
    const inner = rm[2];
    const rowCells = new Map();
    const cRe = /<c[^>]*r="([A-Z]+\d+)"[^>]*(?:t="s")?[^>]*>(?:<v>([^<]*)<\/v>)?/g;
    let cm;
    while ((cm = cRe.exec(inner))) {
      const coords = refToCoords(cm[1]);
      if (!coords) continue;
      let val = cm[2] ?? '';
      const full = cm[0];
      if (full.includes('t="s"') && val !== '') {
        val = shared[parseInt(val, 10)] ?? val;
      }
      rowCells.set(coords.c, val.replace(/\r?\n/g, ' ').trim());
    }
    rows.set(r, rowCells);
  }
  return rows;
}

const shared = parseSharedStrings(readText(sharedPath));
const sheetXml = readText(sheetPath);
const grid = parseSheet(sheetXml, shared);

const matrix = loadMatrixFromRepo();
const matrixKeys = new Set(Object.keys(matrix));
let ok = 0;
const problems = [];
for (let r = 1; r <= 495; r++) {
  const row = grid.get(r);
  if (!row) {
    problems.push({ r: r + 1, msg: 'missing row' });
    continue;
  }
  const parsed = rowToMatrixEntry(row);
  if (!parsed) {
    problems.push({ r: r + 1, msg: 'parse row failed' });
    continue;
  }
  const expected = matrix[parsed.key];
  if (!expected) {
    problems.push({ r: r + 1, key: parsed.key, msg: 'key missing in matrix' });
    continue;
  }
  let rowOk = true;
  for (const g of Object.keys(parsed.alloc)) {
    if (expected[g] !== parsed.alloc[g]) {
      problems.push({
        r: r + 1,
        key: parsed.key,
        group: g,
        excel: parsed.alloc[g],
        code: expected[g],
      });
      rowOk = false;
    }
  }
  if (rowOk) ok++;
}
const excelKeys = new Set();
for (let r = 1; r <= 495; r++) {
  const parsed = rowToMatrixEntry(grid.get(r));
  if (parsed) excelKeys.add(parsed.key);
}
const onlyInMatrix = [...matrixKeys].filter((k) => !excelKeys.has(k));
const onlyInExcel = [...excelKeys].filter((k) => !matrixKeys.has(k));
console.log(
  JSON.stringify(
    {
      rowsCompared: 495,
      rowsMatch: ok,
      problemCount: problems.length,
      sampleProblems: problems.slice(0, 8),
      matrixKeyCount: matrixKeys.size,
      excelKeyCount: excelKeys.size,
      onlyInMatrix: onlyInMatrix.slice(0, 5),
      onlyInExcel: onlyInExcel.slice(0, 5),
    },
    null,
    2,
  ),
);
