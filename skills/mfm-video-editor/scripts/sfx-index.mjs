// Indexes every sound in <studio>/sfx and <studio>/music: duration, where its loudest moment
// is, and how loud it is.
//
// Why: many library sounds start with a quiet lead-in, so placing the FILE on the visual puts
// the actual hit late, and a window that skips the peak is silent in the mix while every level
// check passes. Place each sound so that start = visual time - peakAt.
//
// Usage: node sfx-index.mjs [--force]
// Output: <studio>/sfx-index.json  { "<path relative to studio>": { category, duration, peakAt, peakDb, loudDb } }
//   category: first folder under sfx/ or music/ (e.g. "sfx/whoosh")
//   loudDb:   level of the loudest 100 ms, to compare files against each other

import fs from 'node:fs';
import path from 'node:path';
import { fileKey, loadConfig, parseArgs, readPcm, writeJson } from './lib.mjs';

const args = parseArgs();
const cfg = loadConfig();
const indexFile = path.join(cfg.studioDir, 'sfx-index.json');
const old = !args.force && fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : {};

const walk = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : /\.(wav|mp3|m4a|aac|flac|ogg)$/i.test(e.name) ? [p] : [];
}) : []);
const files = [...walk(path.join(cfg.studioDir, 'sfx')), ...walk(path.join(cfg.studioDir, 'music'))];

const RATE = 16000, WIN = RATE / 10;
const index = {};
let fresh = 0;
for (const f of files) {
  const rel = path.relative(cfg.studioDir, f).replaceAll('\\', '/');
  const key = fileKey(f);
  if (old[rel]?.key === key) { index[rel] = old[rel]; continue; }
  const pcm = await readPcm(f, RATE);
  let peak = 0, peakI = 0;
  for (let i = 0; i < pcm.length; i++) if (Math.abs(pcm[i]) > peak) { peak = Math.abs(pcm[i]); peakI = i; }
  let loud = 0;
  for (let i = 0; i + WIN <= pcm.length; i += WIN / 2) {
    let e = 0; for (let j = 0; j < WIN; j++) e += pcm[i + j] ** 2;
    loud = Math.max(loud, e / WIN);
  }
  const parts = rel.split('/');
  index[rel] = {
    category: parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0],
    duration: +(pcm.length / RATE).toFixed(3),
    peakAt: +(peakI / RATE).toFixed(3),
    peakDb: +(20 * Math.log10(peak || 1e-9)).toFixed(1),
    loudDb: +(10 * Math.log10(loud || 1e-12)).toFixed(1),
    key,
  };
  fresh++;
}
writeJson(indexFile, index);

const byCat = {};
for (const v of Object.values(index)) byCat[v.category] = (byCat[v.category] ?? 0) + 1;
console.log(`Indexed ${files.length} sounds (${fresh} new or changed) -> ${indexFile}`);
for (const [c, n] of Object.entries(byCat).sort()) console.log(`  ${c.padEnd(16)} ${n}`);
const late = Object.entries(index).filter(([, v]) => v.category.startsWith('sfx') && v.peakAt > 0.15);
if (late.length) console.log(`${late.length} SFX peak more than 0.15 s after they start: always offset them by peakAt.`);
const quiet = Object.entries(index).filter(([, v]) => v.category.startsWith('sfx') && v.peakDb < -12);
if (quiet.length) console.log(`${quiet.length} SFX peak below -12 dBFS: they will need gain to be heard over the voice.`);
