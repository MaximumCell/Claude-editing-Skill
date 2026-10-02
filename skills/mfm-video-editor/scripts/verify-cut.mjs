// Checks every join ("seam") in work/cut-preview.wav for the defects that survive a whole-file
// transcript: a word said twice across a join, a clipped first word, an audible pop, and a
// retake left in by mistake.
//
// Why windows: one whole-file transcription smooths over exactly these defects. So a short
// window around each seam is cut out, the windows are joined into one "seam reel" with silence
// between them, and that reel is transcribed in a single pass.
//
// Usage: node verify-cut.mjs <videoDir> [--window 1.5]
// Needs: work/edl.json and work/cut-preview.wav (run cut-plan.mjs --preview first)
// Output: work/seam-check.md (read it) and work/seam-check-report.json

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fail, fmtTime, parseArgs, readJson, readPcm, run, videoPaths, writeJson } from './lib.mjs';

const args = parseArgs();
const videoDir = args._[0] ?? fail('Usage: node verify-cut.mjs <videoDir>');
const vp = videoPaths(videoDir);
const W = Number(args.window ?? 1.5);
const GAP = 2.5; // silence between windows: wide, because local Whisper word times can be ~1 s off
const POP_DB = 3; // seam louder than both sides by this much => possible pop

const edl = readJson(path.join(vp.work, 'edl.json'));
const preview = path.join(vp.work, 'cut-preview.wav');
if (!fs.existsSync(preview)) fail('Missing work/cut-preview.wav. Run: node cut-plan.mjs <videoDir> --preview');

// Seams in output time, with the source time on each side.
const seams = [];
let t = 0;
edl.keep.forEach((k, i) => {
  t += k.end - k.start;
  if (i < edl.keep.length - 1) seams.push({ at: t, srcOut: k.end, srcIn: edl.keep[i + 1].start });
});
if (!seams.length) { console.log('No seams: nothing was cut.'); process.exit(0); }
const total = t;

// 1. Pops: peak level right at the seam vs just before and after it.
const RATE = 16000;
const pcm = await readPcm(preview, RATE);
const peakDb = (a, b) => {
  let p = 0;
  for (let i = Math.max(0, Math.floor(a * RATE)); i < Math.min(pcm.length, Math.floor(b * RATE)); i++) p = Math.max(p, Math.abs(pcm[i]));
  return p > 0 ? 20 * Math.log10(p) : -120;
};
for (const s of seams) {
  const at = peakDb(s.at - 0.03, s.at + 0.03), before = peakDb(s.at - 0.25, s.at - 0.05), after = peakDb(s.at + 0.05, s.at + 0.25);
  s.pop = at > before + POP_DB && at > after + POP_DB;
  s.levels = { at: +at.toFixed(1), before: +before.toFixed(1), after: +after.toFixed(1) };
}

// 2. Seam reel: each window [at - W, at + W] separated by silence, then one transcription pass.
let off = 0;
const parts = [], labels = [];
seams.forEach((s, i) => {
  s.winStart = Math.max(0, s.at - W);
  s.winEnd = Math.min(total, s.at + W);
  s.reelStart = off;
  parts.push(`[w${i}]atrim=${s.winStart.toFixed(3)}:${s.winEnd.toFixed(3)},asetpts=PTS-STARTPTS[c${i}]`);
  labels.push(`[c${i}]`, '[gap]');
  off += s.winEnd - s.winStart + GAP;
});
const filter = path.join(vp.work, 'seam-filter.txt');
fs.writeFileSync(filter, [
  `[0:a]aresample=16000,aformat=channel_layouts=mono,asplit=${seams.length}${seams.map((_, i) => `[w${i}]`).join('')}`,
  ...parts,
  `anullsrc=r=16000:cl=mono,atrim=0:${GAP},asplit=${seams.length}${seams.map((_, i) => `[g${i}]`).join('')}`,
  `${seams.map((_, i) => `[c${i}][g${i}]`).join('')}concat=n=${seams.length * 2}:v=0:a=1[out]`,
].join(';\n'));
const reel = path.join(vp.work, 'seam-reel.wav');
run('ffmpeg', ['-v', 'error', '-y', '-i', preview, '-/filter_complex', filter, '-map', '[out]', reel]);

const tr = spawnSync(process.execPath, [path.join(import.meta.dirname, 'transcribe.mjs'), vp.dir, '--input', 'work/seam-reel.wav', '--out', 'seam-check'], { stdio: 'inherit' });
if (tr.status !== 0) fail('Transcribing the seam reel failed.');
const words = readJson(path.join(vp.work, 'seam-check.json')).words.filter((w) => w.type !== 'event');

// 3. Per seam: text around the join, repeated n-grams, weak first words.
const norm = (x) => x.toLowerCase().replace(/[\p{P}]/gu, '');
const report = seams.map((s, i) => {
  const len = s.winEnd - s.winStart;
  const seamInReel = s.reelStart + (s.at - s.winStart);
  const ws = words.filter((w) => w.start >= s.reelStart - 0.05 && w.start <= s.reelStart + len + 0.05);
  const toks = ws.map((w) => norm(w.text));
  const repeats = [];
  for (let n = Math.min(6, Math.floor(toks.length / 2)); n >= 1; n--) {
    for (let a = 0; a + 2 * n <= toks.length; a++) {
      const x = toks.slice(a, a + n).join(' '), y = toks.slice(a + n, a + 2 * n).join(' ');
      if (x && x === y && !repeats.some((r) => r.includes(x))) repeats.push(x);
    }
  }
  const head = ws.filter((w) => w.start >= seamInReel - 0.05 && w.start <= seamInReel + 0.3);
  const weakHead = head.filter((w) => w.confidence < 0.4).map((w) => w.text);
  const firstAfter = ws.findIndex((w) => w.start >= seamInReel);
  const text = ws.map((w, j) => (j === firstAfter ? `‖ ${w.text}` : w.text)).join(' ');
  const flags = [];
  if (repeats.length) flags.push(`REPEAT: "${repeats.join('", "')}"`);
  if (weakHead.length) flags.push(`WEAK START: "${weakHead.join(' ')}" (clipped word or false start?)`);
  if (s.pop) flags.push(`POP: ${s.levels.at} dB vs ${s.levels.before}/${s.levels.after}`);
  return { seam: i + 1, at: +s.at.toFixed(2), source: { out: s.srcOut, in: s.srcIn }, text: text || '(no speech)', flags };
});

// 4. Whole-cut check: consecutive sentences that start with the same 4+ words = retake left in.
const retakes = [];
const full = path.join(vp.work, 'cut-check.json');
if (fs.existsSync(full)) {
  const cw = readJson(full).words.filter((w) => w.type !== 'event').map((w) => norm(w.text));
  for (let a = 0; a < cw.length; a++) {
    for (let b = a + 4; b < Math.min(cw.length, a + 60); b++) {
      let n = 0;
      while (b + n < cw.length && a + n < b && cw[a + n] === cw[b + n]) n++;
      if (n >= 4) { retakes.push(cw.slice(a, a + n).join(' ')); a = b + n; break; }
    }
  }
}

const flagged = report.filter((r) => r.flags.length);
const md = [
  `# Seam check: ${seams.length} joins, ${flagged.length} flagged`,
  '',
  'Times are in the cut (output) timeline. `‖` marks the join.',
  'Flags are mechanical. Judge each one against the source before changing anything: Urdu reduplication',
  '(e.g. "کر کر کے", "جلدی جلدی") is a deliberate repeat, not a seam error.',
  '',
  ...(retakes.length ? ['## Possible retakes left in (from work/cut-check.json)', ...retakes.map((r) => `- "${r}…" appears twice`), ''] : []),
  '## Flagged',
  ...(flagged.length ? flagged.map((r) => `- **${fmtTime(r.at)}** (source ${fmtTime(r.source.out)} → ${fmtTime(r.source.in)}): ${r.flags.join('; ')}\n  > ${r.text}`) : ['- none']),
  '',
  '## All seams',
  ...report.map((r) => `- ${fmtTime(r.at)}: ${r.text}`),
].join('\n');
fs.writeFileSync(path.join(vp.work, 'seam-check.md'), md);
writeJson(path.join(vp.work, 'seam-check-report.json'), { seams: report, retakes });
console.log(`Checked ${seams.length} seams: ${flagged.length} flagged${retakes.length ? `, ${retakes.length} possible retake(s) left in` : ''}. Read work/seam-check.md`);
