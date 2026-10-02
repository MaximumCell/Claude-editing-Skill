// Probes every source in a video folder and flags problems that would otherwise fail silently
// later: rotated phone footage, variable frame rate, mismatched fps, missing audio.
//
// Usage: node inventory.mjs <videoDir>
// Output: <videoDir>/work/inventory.json  { format: "long"|"short", fps, files: [...], warnings: [...] }

import fs from 'node:fs';
import path from 'node:path';
import { fail, ffprobeDuration, hasAudioStream, parseArgs, probeVideo, videoPaths, writeJson } from './lib.mjs';

const args = parseArgs();
const videoDir = args._[0] ?? fail('Usage: node inventory.mjs <videoDir>');
const vp = videoPaths(videoDir);
if (!vp.camera && !vp.mic) fail('No camera.* or mic.* in the video folder.');

const files = [];
const warnings = [];
const add = (file, role) => {
  const rel = path.relative(vp.dir, file);
  const audio = hasAudioStream(file);
  const v = /\.(wav|mp3|m4a)$/i.test(file) ? null : probeVideo(file);
  const entry = { file: rel, role, audio, duration: +(v?.duration || ffprobeDuration(file)).toFixed(3), ...(v ?? {}) };
  files.push(entry);
  if (v?.rotation) warnings.push(`${rel}: stored rotated ${v.rotation}°; displayed size is ${v.width}x${v.height}. Always use the displayed size.`);
  if (v?.vfr) warnings.push(`${rel}: variable frame rate (${v.fps} vs avg ${v.avgFps}). Convert to constant before rendering: ffmpeg -i in -vf fps=${Math.round(v.avgFps)} -c:a copy out`);
  if (!audio && role !== 'screen') warnings.push(`${rel}: has no audio track.`);
};
if (vp.camera) add(vp.camera, 'camera');
if (vp.mic) add(vp.mic, 'mic');
for (const s of vp.screens) add(s, 'screen');

const cam = files.find((f) => f.role === 'camera');
const notes = fs.existsSync(path.join(vp.dir, 'notes.txt')) ? fs.readFileSync(path.join(vp.dir, 'notes.txt'), 'utf8') : '';
const format = (cam && cam.height > cam.width) || /\bshort\b/i.test(notes) ? 'short' : 'long';
const fps = cam?.avgFps ? Math.round(cam.avgFps) : 30;
for (const f of files) {
  if (f.role === 'screen' && f.avgFps && Math.abs(f.avgFps - fps) > 1) {
    warnings.push(`${f.file}: ${Math.round(f.avgFps)} fps vs camera ${fps} fps. It will be resampled; fast scrolling may judder.`);
  }
}

writeJson(path.join(vp.work, 'inventory.json'), { format, fps, files, warnings });
console.log(`Format: ${format} (${format === 'short' ? '1080x1920' : '1920x1080'}), ${fps} fps, ${files.length} files`);
for (const f of files) console.log(`  ${f.role.padEnd(6)} ${f.file}  ${f.width ? `${f.width}x${f.height} ${f.avgFps}fps ` : ''}${f.duration}s${f.audio ? '' : '  (no audio)'}`);
for (const w of warnings) console.log(`WARNING: ${w}`);
