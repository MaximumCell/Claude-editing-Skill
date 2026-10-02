// First-run setup for a PC: creates the MFM-Studio folder, the engine (npm deps + Whisper),
// saves the config, and installs the official Remotion agent skills.
//
// Usage:
//   node setup.mjs --studio "D:/MFM-Studio" --language en [--model medium] [--skip-remotion-skills]
//   node setup.mjs --check          (verify an existing setup, change nothing)

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  CONFIG_PATH, WHISPER_CPP_VERSION, fail, has, loadConfig, parseArgs, requireFromEngine, saveConfig,
} from './lib.mjs';

const REMOTION_VERSION = '4.0.532'; // pin all @remotion/* packages to one version
const STUDIO_FOLDERS = [
  'brand/logos', 'brand/fonts', 'logos-cache', 'broll', 'sfx', 'music', 'videos',
];

const args = parseArgs();

// ---- 1. System tools ----
const node = Number(process.versions.node.split('.')[0]);
const tools = {
  node: node >= 22 ? `v${process.versions.node}` : null,
  ffmpeg: has('ffmpeg', '-version'),
  ffprobe: has('ffprobe', '-version'),
  'yt-dlp': has('yt-dlp'),
  git: has('git'),
};
console.log('System tools:');
for (const [k, v] of Object.entries(tools)) console.log(`  ${v ? 'OK     ' : 'MISSING'} ${k}${v ? `  (${v})` : ''}`);
const missing = Object.entries(tools).filter(([k, v]) => !v && k !== 'git').map(([k]) => k);
if (missing.length) {
  fail(`Install the missing tools first (winget install OpenJS.NodeJS.LTS / Gyan.FFmpeg / yt-dlp.yt-dlp), then re-run setup.`);
}

if (args.check) {
  const cfg = loadConfig();
  const ok = (p) => (fs.existsSync(p) ? 'OK     ' : 'MISSING');
  console.log(`\nConfig: ${CONFIG_PATH}`);
  console.log(`  ${ok(cfg.studioDir)} studio   ${cfg.studioDir}`);
  console.log(`  ${ok(path.join(cfg.engineDir, 'node_modules'))} engine   ${cfg.engineDir}`);
  console.log(`  ${ok(path.join(cfg.studioDir, '.env'))} .env`);
  for (const f of STUDIO_FOLDERS) console.log(`  ${ok(path.join(cfg.studioDir, f))} ${f}`);
  process.exit(0);
}

// ---- 2. Studio folder + config ----
let existing = null;
if (fs.existsSync(CONFIG_PATH)) existing = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const studioDir = path.resolve(args.studio ?? existing?.studioDir ?? fail('Pass --studio <path> (where the MFM-Studio folder should live).'));
const language = args.language ?? existing?.language ?? fail('Pass --language <code> (spoken language of the videos, e.g. en, ur, hi, or auto).');
const whisperModel = args.model ?? existing?.whisperModel ?? 'medium';

for (const f of STUDIO_FOLDERS) fs.mkdirSync(path.join(studioDir, f), { recursive: true });
const envFile = path.join(studioDir, '.env');
if (!fs.existsSync(envFile)) {
  fs.writeFileSync(envFile, '# Shared team keys. Never commit or share this file publicly.\nAI_IMAGE_API_KEY=\nEPIDEMIC_API_KEY=\n');
}
const cfg = { studioDir, language, whisperModel, whisperCppVersion: WHISPER_CPP_VERSION, remotionVersion: REMOTION_VERSION };
saveConfig(cfg);
cfg.engineDir = path.join(studioDir, '.engine');
console.log(`\nStudio: ${studioDir}\nConfig saved: ${CONFIG_PATH}`);

// ---- 3. Engine: npm deps ----
fs.mkdirSync(cfg.engineDir, { recursive: true });
const pkgPath = path.join(cfg.engineDir, 'package.json');
const pkg = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, 'utf8')) : { name: 'mfm-engine', private: true };
pkg.dependencies = { ...(pkg.dependencies ?? {}), '@remotion/install-whisper-cpp': REMOTION_VERSION };
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log('\nInstalling engine packages (npm)...');
const npm = spawnSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: cfg.engineDir, stdio: 'inherit', shell: true });
if (npm.status !== 0) fail('npm install failed in the engine folder.');

// ---- 4. Whisper.cpp + model ----
const { installWhisperCpp, downloadWhisperModel } = requireFromEngine(cfg, '@remotion/install-whisper-cpp');
const whisperDir = path.join(cfg.engineDir, 'whisper');
const modelDir = path.join(cfg.engineDir, 'whisper-models');
fs.mkdirSync(modelDir, { recursive: true });
console.log(`\nInstalling whisper.cpp ${WHISPER_CPP_VERSION}...`);
// installWhisperCpp downloads its zip into the current working directory.
process.chdir(cfg.engineDir);
// Remotion expects <whisper>/build/bin/whisper-cli.exe for versions >= 1.7.4, but the official
// Windows zip unpacks to <whisper>/Release/. A folder without that exe (old version) is replaced.
const cliExe = path.join(whisperDir, 'build', 'bin', 'whisper-cli.exe');
if (fs.existsSync(whisperDir) && !fs.existsSync(cliExe)) fs.rmSync(whisperDir, { recursive: true, force: true });
if (!fs.existsSync(cliExe)) {
  await installWhisperCpp({ to: whisperDir, version: WHISPER_CPP_VERSION, printOutput: true });
  const release = path.join(whisperDir, 'Release');
  if (!fs.existsSync(cliExe) && fs.existsSync(release)) {
    // Copy, not rename: antivirus often still holds the freshly unzipped files.
    fs.cpSync(release, path.dirname(cliExe), { recursive: true });
    try { fs.rmSync(release, { recursive: true, force: true }); } catch { /* harmless leftover */ }
  }
  if (!fs.existsSync(cliExe)) fail(`whisper.cpp installed but ${cliExe} is missing.`);
} else console.log('whisper.cpp already installed.');
console.log(`Downloading Whisper model "${whisperModel}" (can be over 1 GB, one time only)...`);
await downloadWhisperModel({ model: whisperModel, folder: modelDir, printOutput: false });

// ---- 5. Official Remotion agent skills ----
if (!args['skip-remotion-skills']) {
  console.log('\nInstalling official Remotion agent skills (remotion-dev/skills)...');
  const r = spawnSync('npx', ['-y', 'skills', 'add', 'remotion-dev/skills', '-g', '-y', '-a', 'claude-code'], { stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    console.warn('WARNING: could not install remotion-dev/skills automatically. Run manually:\n  npx skills add remotion-dev/skills -g');
  }
}

console.log(`\nSetup complete.
Next:
  1. Put the shared team keys in ${envFile}
  2. Copy logos to brand/logos, fonts to brand/fonts, B-roll to broll/, Epidemic files to sfx/ and music/
  3. Create a video folder: ${path.join(studioDir, 'videos', '<date-slug>')} with camera.mp4, mic.wav, screens/`);
