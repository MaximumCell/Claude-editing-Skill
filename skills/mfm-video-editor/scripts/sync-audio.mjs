// Audio-syncs camera.* and screens/* to the master audio (mic.wav) by cross-correlation.
//
// Usage: node sync-audio.mjs <videoDir>
// Output: <videoDir>/work/sync.json
//   offset: master time = file time + offset (seconds)
//   drift:  extra seconds of offset per second of file (clock drift between devices)
//
// How: both signals are reduced to a 1 kHz loudness envelope (robust across different mics),
// a 30 s chunk of each file is located inside the master with FFT cross-correlation,
// and this is done near the start and near the end of the file to measure drift.

import { ffprobeDuration, fmtTime, hasAudioStream, parseArgs, readPcm, videoPaths, writeJson, fail } from './lib.mjs';
import path from 'node:path';

const ENV_RATE = 1000; // envelope samples per second -> 1 ms resolution
const PCM_RATE = 8000;
const CHUNK_SEC = 30;
const MIN_CONFIDENCE = 1.5; // best peak / second-best peak

const args = parseArgs();
const videoDir = args._[0] ?? fail('Usage: node sync-audio.mjs <videoDir>');
const vp = videoPaths(videoDir);

const master = vp.mic ?? vp.camera ?? fail('No mic.* or camera.* in the video folder.');
const targets = [];
if (vp.mic && vp.camera) targets.push({ file: vp.camera, role: 'camera' });
for (const s of vp.screens) targets.push({ file: s, role: 'screen' });

function envelope(pcm) {
  const step = PCM_RATE / ENV_RATE;
  const n = Math.floor(pcm.length / step);
  const env = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < step; j++) s += Math.abs(pcm[i * step + j]);
    env[i] = s / step;
  }
  // Remove slow loudness changes (100 ms moving mean) so different mic gains still match.
  const w = 100;
  const pre = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + env[i];
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - w), b = Math.min(n, i + w);
    out[i] = env[i] - (pre[b] - pre[a]) / (b - a);
  }
  return out;
}

function fft(re, im, inverse) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (2 * Math.PI / len) * (inverse ? 1 : -1);
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const a = i + j, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

let masterSpec = null; // cached FFT of the master envelope
function locate(masterEnv, chunk) {
  const n = masterEnv.length, m = chunk.length;
  let N = 1;
  while (N < n + m) N <<= 1;
  if (!masterSpec || masterSpec.N !== N) {
    const re = new Float64Array(N), im = new Float64Array(N);
    re.set(masterEnv);
    fft(re, im, false);
    masterSpec = { N, re, im };
  }
  const xr = new Float64Array(N), xi = new Float64Array(N);
  xr.set(chunk);
  fft(xr, xi, false);
  for (let i = 0; i < N; i++) { // Y * conj(X)
    const yr = masterSpec.re[i], yi = masterSpec.im[i];
    const r = yr * xr[i] + yi * xi[i];
    const im2 = yi * xr[i] - yr * xi[i];
    xr[i] = r; xi[i] = im2;
  }
  fft(xr, xi, true);
  // Normalize by master energy under the window so loud passages don't win by default.
  const pre = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + masterEnv[i] ** 2;
  let best = -Infinity, bestK = 0;
  const scores = new Float64Array(Math.max(0, n - m + 1));
  for (let k = 0; k <= n - m; k++) {
    const e = Math.sqrt(pre[k + m] - pre[k]) || 1;
    scores[k] = xr[k] / e;
    if (scores[k] > best) { best = scores[k]; bestK = k; }
  }
  let second = 0;
  const guard = 0.2 * ENV_RATE;
  for (let k = 0; k < scores.length; k++) if (Math.abs(k - bestK) > guard && scores[k] > second) second = scores[k];
  return { lagSec: bestK / ENV_RATE, confidence: second > 0 ? best / second : Infinity };
}

console.log(`Master audio: ${path.basename(master)}`);
const masterDuration = ffprobeDuration(master);
const masterEnv = envelope(await readPcm(master, PCM_RATE));

const results = [];
for (const t of targets) {
  const duration = ffprobeDuration(t.file);
  const entry = { file: path.relative(vp.dir, t.file), role: t.role, duration };
  if (!hasAudioStream(t.file)) {
    results.push({ ...entry, status: 'no-audio', note: 'No audio track: cannot sync automatically. Place by transcript context or ask the user.' });
    console.log(`  ${entry.file}: no audio track, skipped`);
    continue;
  }
  const chunk = Math.min(CHUNK_SEC, duration * 0.4);
  const probes = duration > chunk * 3 ? [duration * 0.1, duration * 0.9 - chunk] : [Math.max(0, (duration - chunk) / 2)];
  const found = [];
  for (const p of probes) {
    const env = envelope(await readPcm(t.file, PCM_RATE, { start: p, duration: chunk }));
    const { lagSec, confidence } = locate(masterEnv, env);
    found.push({ at: p, offset: lagSec - p, confidence });
  }
  const good = found.filter((f) => f.confidence >= MIN_CONFIDENCE);
  let status = 'ok', offset, drift = 0, note;
  if (!good.length) {
    status = 'low-confidence';
    offset = found[0].offset;
    note = 'Audio match is weak (different recording? long silence?). Verify visually before using.';
  } else if (good.length === 2) {
    offset = good[0].offset;
    drift = (good[1].offset - good[0].offset) / (good[1].at - good[0].at);
    if (Math.abs(good[1].offset - good[0].offset) > 2) {
      status = 'mismatch';
      note = 'Start and end match different places: file may be paused/edited. Sync segments separately.';
      drift = 0;
    }
  } else offset = good[0].offset;
  // Express offset at file time 0, correcting for drift measured at the first probe.
  offset = offset - drift * found[0].at;
  const driftMsPerMin = drift * 60000;
  const r = { ...entry, status, offset: +offset.toFixed(4), drift: +drift.toExponential(3), driftMsPerMin: +driftMsPerMin.toFixed(2), probes: found, note };
  results.push(r);
  console.log(`  ${entry.file}: ${status}  starts at master ${fmtTime(Math.max(0, offset))}${offset < 0 ? ` (file begins ${(-offset).toFixed(2)}s before master)` : ''}  drift ${driftMsPerMin.toFixed(1)} ms/min  confidence ${found.map((f) => f.confidence.toFixed(1)).join('/')}`);
}

const out = path.join(vp.work, 'sync.json');
writeJson(out, { master: path.relative(vp.dir, master), masterDuration, files: results });
console.log(`Wrote ${out}`);
