// Shared helpers for the mfm-video-editor scripts.
// Node 22+, no npm dependencies here: scripts must run straight from the plugin folder.

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

export const CONFIG_PATH =
  process.env.MFM_CONFIG ?? path.join(os.homedir(), '.mfm-video-editor', 'config.json');

export const WHISPER_CPP_VERSION = '1.9.2'; // newest release with Windows binaries; needed for large-v3-turbo DTW

export function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fail(`No config at ${CONFIG_PATH}. Run setup first: node scripts/setup.mjs --studio <path>`);
  }
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  cfg.engineDir = path.join(cfg.studioDir, '.engine');
  return cfg;
}

export function saveConfig(cfg) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  const { engineDir, ...persisted } = cfg;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(persisted, null, 2));
}

// npm packages are installed in <studio>/.engine, not next to these scripts,
// because the plugin folder is replaced on every /plugin update.
export function requireFromEngine(cfg, pkg) {
  const req = createRequire(path.join(cfg.engineDir, 'package.json'));
  return req(pkg);
}

// Loads <studio>/.env into process.env (keys stay out of the repo).
export function loadEnv(cfg) {
  const envPath = path.join(cfg.studioDir, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) args[key] = true;
      else { args[key] = next; i++; }
    } else args._.push(a);
  }
  return args;
}

export function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

export function has(cmd, flag = '--version') {
  const r = spawnSync(cmd, [flag], { encoding: 'utf8' });
  return r.status === 0 ? (r.stdout || r.stderr).split(/\r?\n/)[0].trim() : null;
}

export function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28, ...opts });
  if (r.status !== 0) fail(`${cmd} ${args.join(' ')}\n${r.stderr || r.stdout}`);
  return r;
}

export function ffprobeDuration(file) {
  const r = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return parseFloat(r.stdout.trim());
}

// Width/height as the video is DISPLAYED. Phone footage often stores landscape pixels plus a
// rotation flag, so the raw stream says 1920x1080 for a vertical video; trusting it letterboxes
// the whole edit without any error.
export function probeVideo(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  const j = JSON.parse(r.stdout);
  const s = j.streams?.[0];
  if (!s) return null;
  const rotation = Math.abs(Number(s.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? s.tags?.rotate ?? 0)) % 180;
  const [w, h] = rotation === 90 ? [s.height, s.width] : [s.width, s.height];
  const rate = (x) => { const [a, b] = String(x ?? '0/1').split('/').map(Number); return b ? a / b : 0; };
  const fps = rate(s.r_frame_rate), avgFps = rate(s.avg_frame_rate);
  return {
    width: w, height: h, rotation, fps: +fps.toFixed(3), avgFps: +avgFps.toFixed(3),
    vfr: avgFps > 0 && Math.abs(fps - avgFps) > 0.05, duration: parseFloat(j.format?.duration ?? s.duration ?? 0),
  };
}

// Cache key for "is this the same input as last time": path + size + modified time.
export function fileKey(file) {
  const st = fs.statSync(file);
  return `${path.resolve(file)}|${st.size}|${Math.floor(st.mtimeMs)}`;
}

export function hasAudioStream(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return r.status === 0 && r.stdout.trim().length > 0;
}

// Decodes audio to mono float32 PCM at `rate` Hz. `start`/`duration` in seconds (optional).
export function readPcm(file, rate, { start, duration } = {}) {
  return new Promise((resolve, reject) => {
    const args = ['-v', 'error'];
    if (start !== undefined) args.push('-ss', String(start));
    args.push('-i', file);
    if (duration !== undefined) args.push('-t', String(duration));
    args.push('-vn', '-ac', '1', '-ar', String(rate), '-f', 'f32le', '-');
    const p = spawn('ffmpeg', args);
    const chunks = [];
    let err = '';
    p.stdout.on('data', (c) => chunks.push(c));
    p.stderr.on('data', (c) => (err += c));
    p.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg failed on ${file}: ${err}`));
      const buf = Buffer.concat(chunks);
      const out = new Float32Array(buf.length / 4);
      for (let i = 0; i < out.length; i++) out[i] = buf.readFloatLE(i * 4);
      resolve(out);
    });
  });
}

// Standard per-video folder layout inside the Studio.
export function videoPaths(videoDir) {
  const dir = path.resolve(videoDir);
  if (!fs.existsSync(dir)) fail(`Video folder not found: ${dir}`);
  const work = path.join(dir, 'work');
  const out = path.join(dir, 'out');
  fs.mkdirSync(work, { recursive: true });
  fs.mkdirSync(out, { recursive: true });
  const find = (base) => {
    for (const ext of ['.mp4', '.mov', '.mkv', '.wav', '.mp3', '.m4a']) {
      const f = path.join(dir, base + ext);
      if (fs.existsSync(f)) return f;
    }
    return null;
  };
  const screensDir = path.join(dir, 'screens');
  const screens = fs.existsSync(screensDir)
    ? fs.readdirSync(screensDir).filter((f) => /\.(mp4|mov|mkv)$/i.test(f)).map((f) => path.join(screensDir, f))
    : [];
  return { dir, work, out, camera: find('camera'), mic: find('mic'), screens };
}

export function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export function readJson(file) {
  if (!fs.existsSync(file)) fail(`Missing ${file}. Run the earlier pipeline step first.`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export const fmtTime = (s) => {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${(s - m * 60).toFixed(2).padStart(5, '0')}`;
};
