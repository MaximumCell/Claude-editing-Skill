// Transcribes the master audio (mic.*, else camera.*) with word-level timestamps.
//
// Usage: node transcribe.mjs <videoDir> [--input <file>] [--out <name>]
// Output: <videoDir>/work/transcript.json  { words: [{ text, start, end, confidence }] }
//         <videoDir>/work/transcript.txt   one line per segment with timestamps (for Claude to read)
// --input/--out let you re-transcribe a rendered cut (e.g. work/cut-preview.wav) to verify it.

import fs from 'node:fs';
import path from 'node:path';
import { fail, fmtTime, loadConfig, parseArgs, requireFromEngine, run, videoPaths, writeJson } from './lib.mjs';

const args = parseArgs();
const videoDir = args._[0] ?? fail('Usage: node transcribe.mjs <videoDir>');
const vp = videoPaths(videoDir);
const cfg = loadConfig();
const { transcribe } = requireFromEngine(cfg, '@remotion/install-whisper-cpp');

const input = args.input ? path.resolve(vp.dir, args.input) : (vp.mic ?? vp.camera ?? fail('No mic.* or camera.* found.'));
const name = args.out ?? 'transcript';

// whisper.cpp needs 16 kHz mono 16-bit WAV.
const wav16 = path.join(vp.work, `${name}-16k.wav`);
run('ffmpeg', ['-v', 'error', '-y', '-i', input, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', wav16]);

console.log(`Transcribing ${path.basename(input)} with model ${cfg.whisperModel} (language: ${cfg.language})...`);
const result = await transcribe({
  inputPath: wav16,
  whisperPath: path.join(cfg.engineDir, 'whisper'),
  whisperCppVersion: cfg.whisperCppVersion,
  model: cfg.whisperModel,
  modelFolder: path.join(cfg.engineDir, 'whisper-models'),
  tokenLevelTimestamps: true,
  language: cfg.language === 'auto' ? null : cfg.language,
  printOutput: false,
  onProgress: (p) => process.stdout.write(`\r  ${Math.round(p * 100)}%`),
});
console.log('');
writeJson(path.join(vp.work, `${name}-raw.json`), result);

// Merge whisper tokens into words: a token starting with a space begins a new word.
// Word time `t` is the DTW timestamp: it usually lands 0.2-0.4 s after the word starts and
// can drift further on the last word before a pause, so treat it as approximate.
// cut-plan.mjs snaps removal edges to the real pauses in the audio.
const words = [];
for (const seg of result.transcription) {
  if (/^\s*\[/.test(seg.text)) continue; // [BLANK_AUDIO], [Music], ...
  for (const tok of seg.tokens) {
    if (tok.text.startsWith('[_') || tok.text.trim() === '') continue; // special tokens
    const t = tok.t_dtw >= 0 ? tok.t_dtw / 100 : tok.offsets.from / 1000;
    const startsWord = tok.text.startsWith(' ') || words.length === 0;
    if (startsWord) words.push({ text: tok.text.trim(), t: +t.toFixed(2), confidence: +tok.p.toFixed(3) });
    else {
      const w = words[words.length - 1];
      w.text += tok.text;
      w.confidence = Math.min(w.confidence, +tok.p.toFixed(3));
    }
  }
}

// Readable transcript: one line per sentence (break on end punctuation, incl. Urdu ۔ and ؟, or a 0.7 s gap).
const lines = [];
let cur = [];
words.forEach((w, i) => {
  cur.push(w);
  const next = words[i + 1];
  if (!next || /[.?!۔؟]$/.test(w.text) || next.t - w.t > 0.7 + 0.08 * w.text.length) {
    lines.push(`[${fmtTime(cur[0].t)}] ${cur.map((x) => x.text).join(' ')}`);
    cur = [];
  }
});

writeJson(path.join(vp.work, `${name}.json`), { source: path.relative(vp.dir, input), language: result.result.language, words });
fs.writeFileSync(path.join(vp.work, `${name}.txt`), lines.join('\n'));
fs.writeFileSync(path.join(vp.work, `${name}-words.tsv`), words.map((w) => `${w.t.toFixed(2)}\t${w.confidence.toFixed(2)}\t${w.text}`).join('\n'));
console.log(`Wrote work/${name}.json (${words.length} words), ${name}.txt (${lines.length} sentences), ${name}-words.tsv`);
