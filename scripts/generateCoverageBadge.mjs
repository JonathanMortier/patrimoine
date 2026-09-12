import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const summaryPath = process.argv[2] || resolve(ROOT, 'coverage', 'coverage-summary.json');

let summary;
try {
  summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
} catch (e) {
  console.error(`Impossible de lire ${summaryPath}:`, e.message);
  process.exit(1);
}

const pct = summary?.total?.lines?.pct ?? null;
if (pct === null) {
  console.error('Coverage total.lines.pct introuvable dans le résumé.');
  process.exit(1);
}

const rounded = Math.round(pct * 10) / 10;
const color = rounded >= 90 ? '2ea44f' : rounded >= 75 ? 'bf8700' : rounded >= 50 ? 'dfb317' : 'e05d44';

const label = 'coverage';
const value = `${rounded}%`;

const width = 200;
const labelWidth = 80;
const valueWidth = 120;
const height = 20;
const font = '11px DejaVu Sans, Verdana, sans-serif';

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" role="img" aria-label="${label}: ${value}">` +
  `<title>${label}: ${value}</title>` +
  `<linearGradient id="s" x2="0" y2="100%">` +
  `<stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>` +
  `<clipPath id="r"><rect width="${width}" height="${height}" rx="3" fill="#fff"/></clipPath>` +
  `<g clip-path="url(#r)">` +
  `<rect width="${labelWidth}" height="${height}" fill="#555"/><rect x="${labelWidth}" width="${valueWidth}" height="${height}" fill="#${color}"/>` +
  `<rect width="${width}" height="${height}" fill="url(#s)"/></g>` +
  `<g fill="#fff" text-anchor="middle" font-family="${font}">` +
  `<text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>` +
  `<text x="${labelWidth / 2}" y="14">${label}</text>` +
  `<text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>` +
  `<text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>` +
  `</g></svg>`;

const outDir = resolve(ROOT, 'badges');
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, 'coverage.svg');
writeFileSync(outPath, svg);
console.log(`Badge écrit: ${outPath} (${value})`);