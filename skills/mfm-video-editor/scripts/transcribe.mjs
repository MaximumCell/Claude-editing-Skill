// Transcribes the master audio (mic.*, else camera.*) with word-level timestamps.
//
// Provider: ElevenLabs Scribe v2 when ELEVENLABS_API_KEY is set in <studio>/.env (exact word
// times, keeps filler words, tags coughs/laughs, strong Urdu + English code-switching),
// otherwise local Whisper (free, offline, slower, approximate word times).
//
// Usage: node transcribe.mjs <videoDir> [--input <file>] [--out <name>] [--provider elevenlabs|whisper] [--force]
// Results are cached: an unchanged input with the same settings is never transcribed (or paid for) twice.
// Output (in <videoDir>/work/):
//   <name>.json       { provider, timing: "exact"|"approx", words: [{ text, start, end, confidence, type }] }
//                     type: "word" or "event" (e.g. "(cough)", ElevenLabs only)
//   <name>.txt        one sentence per line: [mm:ss.ss] text   (for Claude to read)
//   <name>-words.tsv  start  end  confidence  word            (exact times for removals)
// --input/--out let you re-transcribe a rendered cut (e.g. work/cut-preview.wav) to verify it.

import fs from 'node:fs';
import path from 'node:path';
import { fail, fileKey, fmtTime, loadConfig, loadEnv, parseArgs, requireFromEngine, run, videoPaths, writeJson } from './lib.mjs';

const args = parseArgs();
const videoDir = args._[0] ?? fail('Usage: node transcribe.mjs <videoDir>');
const vp = videoPaths(videoDir);
const cfg = loadConfig();
loadEnv(cfg);

const input = args.input ? path.resolve(vp.dir, args.input) : (vp.mic ?? vp.camera ?? fail('No mic.* or camera.* found.'));
const name = args.out ?? 'transcript';
const provider = args.provider ?? (process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'whisper');

// Product and brand names the speaker uses, so they're spelled right (one per line).
const keytermsFile = path.join(cfg.studioDir, 'keyterms.txt');
const keyterms = fs.existsSync(keytermsFile)
  ? fs.readFileSync(keytermsFile, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#')).slice(0, 1000)
  : [];

// Cache: never re-transcribe (or re-pay for) an unchanged input with the same settings.
const cacheKey = [fileKey(input), provider, provider === 'whisper' ? cfg.whisperModel : 'scribe_v2', cfg.language, keyterms.join(',')].join('|');
const outJson = path.join(vp.work, `${name}.json`);
if (!args.force && fs.existsSync(outJson) && JSON.parse(fs.readFileSync(outJson, 'utf8')).cacheKey === cacheKey) {
  console.log(`work/${name}.json is up to date for this input (use --force to redo).`);
  process.exit(0);
}

let result;
if (provider === 'elevenlabs') result = await elevenlabs();
else if (provider === 'whisper') result = await whisper();
else fail(`Unknown provider "${provider}". Use elevenlabs or whisper.`);

async function elevenlabs() {
  if (!process.env.ELEVENLABS_API_KEY) fail(`ELEVENLABS_API_KEY is empty in ${path.join(cfg.studioDir, '.env')}`);
  // 16 kHz mono FLAC: lossless for speech and ~10x smaller than the raw WAV, so uploads are fast.
  const flac = path.join(vp.work, `${name}-upload.flac`);
  run('ffmpeg', ['-v', 'error', '-y', '-i', input, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'flac', flac]);
  const form = new FormData();
  form.append('model_id', 'scribe_v2');
  form.append('file', await fs.openAsBlob(flac), path.basename(flac));
  if (cfg.language && cfg.language !== 'auto') form.append('language_code', cfg.language);
  form.append('tag_audio_events', 'true');
  form.append('timestamps_granularity', 'word');
  form.append('num_speakers', '1');
  for (const k of keyterms) form.append('keyterms', k);
  console.log(`Transcribing ${path.basename(input)} with ElevenLabs Scribe v2 (language: ${cfg.language}, ${keyterms.length} keyterms)...`);
  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }, body: form,
  });
  if (!res.ok) fail(`ElevenLabs returned ${res.status}: ${(await res.text()).slice(0, 500)}\nRe-run with --provider whisper to transcribe locally.`);
  const raw = await res.json();
  writeJson(path.join(vp.work, `${name}-raw.json`), raw);
  fs.rmSync(flac, { force: true });
  const words = raw.words
    .filter((w) => w.type === 'word' || w.type === 'audio_event')
    .map((w) => ({
      text: w.type === 'audio_event' ? `(${w.text.replace(/[()]/g, '')})` : w.text.trim(),
      start: +w.start.toFixed(3), end: +w.end.toFixed(3),
      confidence: +Math.exp(w.logprob ?? 0).toFixed(3),
      type: w.type === 'audio_event' ? 'event' : 'word',
    }));
  return { provider: 'elevenlabs', timing: 'exact', language: raw.language_code, words };
}

async function whisper() {
  const { transcribe } = requireFromEngine(cfg, '@remotion/install-whisper-cpp');
  // whisper.cpp needs 16 kHz mono 16-bit WAV.
  const wav16 = path.join(vp.work, `${name}-16k.wav`);
  run('ffmpeg', ['-v', 'error', '-y', '-i', input, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', wav16]);
  console.log(`Transcribing ${path.basename(input)} with local Whisper ${cfg.whisperModel} (language: ${cfg.language})...`);
  const raw = await transcribe({
    inputPath: wav16,
    whisperPath: path.join(cfg.engineDir, 'whisper'),
    whisperCppVersion: cfg.whisperCppVersion,
    model: cfg.whisperModel,
    modelFolder: path.join(cfg.engineDir, 'whisper-models'),
    tokenLevelTimestamps: true,
    language: cfg.language === 'auto' ? null : cfg.language,
    additionalArgs: keyterms.length ? [['--prompt', keyterms.join(', ')]] : [],
    printOutput: false,
    onProgress: (p) => process.stdout.write(`\r  ${Math.round(p * 100)}%`),
  });
  console.log('');
  writeJson(path.join(vp.work, `${name}-raw.json`), raw);
  // Word times come from token DTW timestamps (can be off by up to ~1 s; cut-plan.mjs snaps
  // edges to real pauses). Word TEXT comes from the segment text, never from joined tokens:
  // on Urdu and other non-Latin scripts a token can hold half of a multi-byte character, so
  // gluing tokens back together produces corrupted text.
  const words = [];
  for (const seg of raw.transcription) {
    if (/^\s*\[/.test(seg.text)) continue; // [BLANK_AUDIO], [Music], ...
    const segWords = seg.text.trim().split(/\s+/).filter(Boolean);
    const starts = []; // DTW time of each token that begins a word
    let minP = 1;
    for (const tok of seg.tokens) {
      if (tok.text.startsWith('[_') || tok.text.trim() === '') continue;
      if (tok.text.startsWith(' ') || starts.length === 0) starts.push({ t: tok.t_dtw >= 0 ? tok.t_dtw / 100 : tok.offsets.from / 1000, p: tok.p });
      else starts[starts.length - 1].p = Math.min(starts[starts.length - 1].p, tok.p);
      minP = Math.min(minP, tok.p);
    }
    const a = seg.offsets.from / 1000, b = seg.offsets.to / 1000;
    segWords.forEach((text, i) => {
      // Token boundaries usually match words 1:1. If they don't (split characters), spread the
      // words evenly across the segment instead and mark them low-confidence.
      const s = starts.length === segWords.length ? starts[i] : { t: a + ((b - a) * i) / segWords.length, p: Math.min(minP, 0.3) };
      words.push({ text, start: +s.t.toFixed(2), end: +s.t.toFixed(2), confidence: +s.p.toFixed(3), type: 'word' });
    });
  }
  // Newer whisper.cpp emits punctuation as its own word ("money ."): attach it to the word before.
  for (let i = words.length - 1; i > 0; i--) {
    if (/^[\p{P}]+$/u.test(words[i].text)) { words[i - 1].text += words[i].text; words.splice(i, 1); }
  }
  // Whisper gives no real word ends: use the next word's time, capped at 1 s.
  words.forEach((w, i) => { w.end = +Math.min(words[i + 1]?.start ?? w.start + 0.5, w.start + 1).toFixed(2); });
  return { provider: 'whisper', timing: 'approx', language: raw.result.language, words };
}

// Readable transcript: one line per sentence (break on end punctuation, incl. Urdu ۔ and ؟, or a pause).
const { words } = result;
const lines = [];
let cur = [];
words.forEach((w, i) => {
  cur.push(w);
  const next = words[i + 1];
  const gap = next ? next.start - (result.timing === 'exact' ? w.end : w.start + 0.08 * w.text.length) : 0;
  if (!next || /[.?!۔؟]$/.test(w.text) || gap > 0.7) {
    lines.push(`[${fmtTime(cur[0].start)}] ${cur.map((x) => x.text).join(' ')}`);
    cur = [];
  }
});

writeJson(outJson, { source: path.relative(vp.dir, input), cacheKey, ...result });
fs.writeFileSync(path.join(vp.work, `${name}.txt`), lines.join('\n'));
fs.writeFileSync(path.join(vp.work, `${name}-words.tsv`),
  words.map((w) => `${w.start.toFixed(2)}\t${w.end.toFixed(2)}\t${w.confidence.toFixed(2)}\t${w.text}`).join('\n'));
console.log(`Wrote work/${name}.json (${words.length} words, ${result.provider}, ${result.timing} timing), ${name}.txt (${lines.length} sentences), ${name}-words.tsv`);
