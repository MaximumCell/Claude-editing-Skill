// Builds the cut list (EDL) for the master audio: removes silences automatically, plus any
// ranges Claude marked for removal (fillers, retakes) in work/removals.json.
// Each removal edge is snapped to a real pause found in the audio. How far it may move depends on
// work/transcript.json "timing": "exact" (ElevenLabs) moves edges at most 0.15-0.3 s; "approx"
// (local Whisper, word times can be ~1 s off) searches ±0.4 s for fillers and ±1.2 s for sentences.
// Every final cut point is then snapped to the quietest 10 ms within ±80 ms so words are never clipped.
//   start = time of the first word to remove, end = time of the first word to keep.
//   Optional "kind": "filler" | "sentence" (default: "filler" if reason starts with "filler").
//
// Usage: node cut-plan.mjs <videoDir> [--threshold -40] [--min-silence 0.35] [--preview]
//   removals.json (optional): [{ "start": 12.3, "end": 14.1, "reason": "retake" }, ...]
// Output: work/edl.json  { keep: [{ start, end }], removedSeconds, ... }  (master-audio time)
//         work/cut-preview.wav with --preview (re-transcribe it to verify the cut). Every join gets a
//         10 ms fade out/in so cuts never click; the final render must do the same (edl.fadeMs).

import fs from 'node:fs';
import path from 'node:path';
import { fail, ffprobeDuration, parseArgs, readPcm, run, videoPaths, writeJson } from './lib.mjs';

const args = parseArgs();
const videoDir = args._[0] ?? fail('Usage: node cut-plan.mjs <videoDir>');
const vp = videoPaths(videoDir);
const master = vp.mic ?? vp.camera ?? fail('No mic.* or camera.* found.');
const threshold = Number(args.threshold ?? -40); // dB
const minSilence = Number(args['min-silence'] ?? 0.35); // s
const PAD_BEFORE = 0.08, PAD_AFTER = 0.12, SNAP = 0.08, MIN_KEEP = 0.25;

const duration = ffprobeDuration(master);
const FADE = 0.01;
const transcriptFile = path.join(vp.work, 'transcript.json');
const timing = fs.existsSync(transcriptFile) ? JSON.parse(fs.readFileSync(transcriptFile, 'utf8')).timing ?? 'approx' : 'approx';

// 1. Silences from ffmpeg silencedetect.
const sd = run('ffmpeg', ['-v', 'info', '-i', master, '-af', `silencedetect=noise=${threshold}dB:d=${minSilence}`, '-f', 'null', '-']);
const silences = [];
let s0 = null;
for (const line of sd.stderr.split(/\r?\n/)) {
  const a = line.match(/silence_start: ([\d.]+)/); if (a) s0 = parseFloat(a[1]);
  const b = line.match(/silence_end: ([\d.]+)/); if (b && s0 !== null) { silences.push({ start: s0, end: parseFloat(b[1]), reason: 'silence' }); s0 = null; }
}
if (s0 !== null) silences.push({ start: s0, end: duration, reason: 'silence' });

// 2. Claude's removals (fillers / retakes).
const removalsFile = path.join(vp.work, 'removals.json');
const removals = fs.existsSync(removalsFile) ? JSON.parse(fs.readFileSync(removalsFile, 'utf8')) : [];

// Quietest 10 ms frame in [t - before, t + after].
const RATE = 16000, FRAME = RATE / 100;
const pcm = await readPcm(master, RATE);
const quietest = (t, before = SNAP, after = SNAP) => {
  let best = t, bestE = Infinity;
  for (let c = t - before; c <= t + after; c += 0.01) {
    const i = Math.round(c * RATE);
    if (i < 0 || i + FRAME > pcm.length) continue;
    let e = 0; for (let j = 0; j < FRAME; j++) e += pcm[i + j] ** 2;
    if (e < bestE) { bestE = e; best = c; }
  }
  return Math.max(0, Math.min(duration, best));
};

// Pause map: 10 ms frames quieter than (noise floor + 12 dB), in runs of >= 30 ms.
const frameDb = [];
for (let i = 0; i + FRAME <= pcm.length; i += FRAME) {
  let e = 0; for (let j = 0; j < FRAME; j++) e += pcm[i + j] ** 2;
  frameDb.push(10 * Math.log10(e / FRAME + 1e-12));
}
const floor = [...frameDb].sort((a, b) => a - b)[Math.floor(frameDb.length * 0.1)];
const pauses = [];
for (let i = 0, start = -1; i <= frameDb.length; i++) {
  const quiet = i < frameDb.length && frameDb[i] < floor + 12;
  if (quiet && start < 0) start = i;
  if (!quiet && start >= 0) { if (i - start >= 3) pauses.push({ start: start / 100, end: i / 100 }); start = -1; }
}
const snapEdge = (t, kind) => {
  const [minLen, range] = timing === 'exact'
    ? (kind === 'filler' ? [0.02, 0.15] : [0.05, 0.3])
    : (kind === 'filler' ? [0.03, 0.4] : [0.15, 1.2]);
  let best = null, bestD = Infinity;
  for (const p of pauses) {
    if (p.end - p.start < minLen) continue;
    const d = t < p.start ? p.start - t : t > p.end ? t - p.end : 0;
    if (d < bestD) { bestD = d; best = p; }
  }
  if (best && bestD <= range) return (best.start + best.end) / 2;
  return timing === 'exact' ? quietest(t, 0.1, 0.03) : quietest(t, 0.5, 0.1);
};
const kindOf = (r) => r.kind ?? (/^\s*filler/i.test(r.reason ?? '') ? 'filler' : 'sentence');

// 3. Merge all removal ranges (silences keep a little breathing room around speech).
const ranges = [
  ...silences.map((r) => ({ ...r, start: r.start + PAD_AFTER, end: r.end - PAD_BEFORE })),
  ...removals.map((r) => ({ ...r, start: snapEdge(r.start, kindOf(r)), end: snapEdge(r.end, kindOf(r)) })),
].filter((r) => r.end > r.start).sort((a, b) => a.start - b.start);
const merged = [];
for (const r of ranges) {
  const last = merged[merged.length - 1];
  if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
  else merged.push({ start: r.start, end: r.end });
}

const keep = [];
let cursor = 0;
for (const r of merged) {
  const a = quietest(r.start), b = quietest(r.end);
  if (a - cursor >= MIN_KEEP) keep.push({ start: +cursor.toFixed(3), end: +a.toFixed(3) });
  cursor = Math.max(cursor, b);
}
if (duration - cursor >= MIN_KEEP) keep.push({ start: +cursor.toFixed(3), end: +duration.toFixed(3) });

const kept = keep.reduce((s, k) => s + (k.end - k.start), 0);
writeJson(path.join(vp.work, 'edl.json'), {
  master: path.relative(vp.dir, master), duration, keptSeconds: +kept.toFixed(2), removedSeconds: +(duration - kept).toFixed(2),
  fadeMs: FADE * 1000, timing, settings: { threshold, minSilence }, silences: silences.length, removals: removals.length, keep,
});
console.log(`Kept ${kept.toFixed(1)}s of ${duration.toFixed(1)}s in ${keep.length} segments (${silences.length} silences, ${removals.length} manual removals).`);

// 5. Optional audio preview of the cut, for re-transcription checks.
if (args.preview) {
  // Trim each kept segment, fade its edges, then concatenate.
  const parts = keep.map((k, i) => {
    const len = k.end - k.start;
    return `[s${i}]atrim=${k.start}:${k.end},asetpts=PTS-STARTPTS,afade=t=in:d=${FADE},afade=t=out:st=${(len - FADE).toFixed(3)}:d=${FADE}[k${i}]`;
  });
  const filter = path.join(vp.work, 'cut-filter.txt');
  fs.writeFileSync(filter, [
    `[0:a]asplit=${keep.length}${keep.map((_, i) => `[s${i}]`).join('')}`,
    ...parts,
    `${keep.map((_, i) => `[k${i}]`).join('')}concat=n=${keep.length}:v=0:a=1[out]`,
  ].join(';\n'));
  run('ffmpeg', ['-v', 'error', '-y', '-i', master, '-/filter_complex', filter, '-map', '[out]', path.join(vp.work, 'cut-preview.wav')]);
  console.log('Wrote work/cut-preview.wav');
}
