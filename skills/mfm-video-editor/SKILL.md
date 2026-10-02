---
name: mfm-video-editor
description: Automatically edits Make First Million / Aaghaz videos with Remotion. Takes a raw recording folder (camera, separate mic WAV, screen recordings), audio-syncs everything, cuts silences/fillers/retakes (Urdu + English), and adds branded motion graphics, keyword callouts, punch-in zooms, B-roll, logos, and Epidemic Sound SFX/music, then renders long-form 16:9 or Shorts 9:16. Use this whenever the user asks to edit, cut, clean up, sync, render, or add graphics/B-roll/SFX to a video or recording folder, mentions MFM-Studio, Make First Million, Aaghaz, or a videos/<slug> folder, or wants a talking-head video turned into a finished YouTube video or Short, even if they don't name the skill.
---

# MFM Video Editor

Turns a raw recording session into a finished, on-brand video, **fully automatically**: the user drops in a folder and gets a render back, then asks for fixes. Don't stop to ask for approval between steps. Ask only when something is genuinely missing or broken (a missing file, a failed sync, an empty asset folder the edit depends on).

Scripts live in `scripts/` next to this file. Run them with `node <skill-dir>/scripts/<name>.mjs`.

## References (read before editing)

| File | Read when |
|---|---|
| `references/brand.md` | Always, before building any graphic |
| `references/style-rules.md` | Always: pacing, cleanup, layouts, callouts, graphics vocabulary, Shorts |
| `references/sfx-rules.md` | When placing SFX and music |
| `references/broll-sourcing.md` | When the edit needs B-roll |
| `references/logo-sourcing.md` | When a company or product logo is needed |

Also use the official Remotion skills (`remotion-best-practices` and friends, installed by setup) for correct Remotion code: timing, `<OffthreadVideo>`, `<Audio>`, fonts, `staticFile`, and rendering.

## Folder layout

```
<studio>/                      path in %USERPROFILE%\.mfm-video-editor\config.json
  brand/logos  brand/fonts  logos-cache  broll  sfx  music  .env  .engine
  videos/<date-slug>/
    camera.mp4                 single camera (16:9 long-form, or 9:16 for Shorts)
    mic.wav                    separate mic = MASTER audio
    screens/*.mp4              screen recordings from the same session
    broll/                     optional video-specific B-roll
    notes.txt                  optional: topic, links, must-keep moments, format
    work/                      generated: sync.json, transcript.*, removals.json, edl.json, plan.json
    out/                       final.mp4, edit-report.md, sources.md
```

**Format**: a 9:16 `camera.*` (height > width) or "short" in notes.txt means a **Short**. Otherwise it's long-form 16:9.

## Pipeline

### 0. Setup check
Run `node scripts/setup.mjs --check`. If there's no config yet, ask the user only for the Studio path, then run:
`node scripts/setup.mjs --studio "<path>" --language ur --model large-v3-turbo`
(The channel speaks mostly Urdu with some English. `ur` handles the mix better than `auto`.)

### 1. Sync
`node scripts/sync-audio.mjs <videoDir>` → `work/sync.json`.
- `offset`: master time = file time + offset. Apply drift if `|driftMsPerMin| > 1`: master time = file time × (1 + drift) + offset, so play that video with `playbackRate = 1 / (1 + drift)`.
- For `low-confidence`, `mismatch`, or `no-audio` files: try placing them using the transcript (what's being discussed when the screen shows X). If you still can't, leave that file out and list it in the edit report. Don't guess silently.

### 2. Transcribe
`node scripts/transcribe.mjs <videoDir>` → three files in `work/`:
- `transcript.txt`: one sentence per line, `[mm:ss.ss] text`. Read it fully before deciding anything. It's mostly Urdu script with English terms mixed in.
- `transcript-words.tsv`: `time  confidence  word`, one per line. Use it for exact word times (fillers inside sentences).
- `transcript.json`: the same words, for scripts.

Word times are **approximate**: often 0.2–0.4 s off and sometimes up to ~1 s (worst around pauses). That's expected. The cut script snaps edges to real pauses in the audio. Retakes (whole sentences) cut reliably; single-word removals near long pauses can miss, which is why step 4's re-transcription check is mandatory.

Transcription speed: `large-v3-turbo` runs at roughly 2–3× real time on a laptop CPU without an NVIDIA GPU (a 20-min video ≈ 45–60 min). Tell the user it's running; don't switch models on your own.

### 3. Decide removals (fillers & retakes)
Following `style-rules.md` §1, write `work/removals.json`:
```json
[{ "start": 12.30, "end": 18.10, "reason": "retake: repeated 'AI agents kya hain'" },
 { "start": 31.02, "end": 31.60, "reason": "filler: matlab" }]
```
- `start` = time of the **first word to remove**; `end` = time of the **first word to keep** after it (both straight from `transcript-words.tsv`). The script snaps each edge to the real pause just before that word.
- Times are in master (mic) time. Silences are handled by the script, so don't list them.

### 4. Cut
`node scripts/cut-plan.mjs <videoDir> --preview` → `work/edl.json` (keep segments) and `work/cut-preview.wav`.
Verify the cut: `node scripts/transcribe.mjs <videoDir> --input work/cut-preview.wav --out cut-check`, then compare `cut-check.txt` with the original. Every kept sentence must be intact (no chopped words). If a word got clipped, adjust `removals.json` or `--threshold`/`--min-silence` and re-run.

### 5. Edit plan
Write `work/plan.json`: an ordered list of beats on the **cut timeline** (seconds after cutting), each with:
`{ start, end, layout, zoom, callout?, graphic?, broll?, screen?, logo?, sfx[], music? }`
Use the graphics vocabulary in `style-rules.md` §6. Hit the pacing rule (a change every 2–4 s; 1.5–3 s for Shorts) and the hook structure (§8). Every visual must match what's said at that moment.

### 6. Gather assets
B-roll per `broll-sourcing.md`, logos per `logo-sourcing.md`, SFX/music per `sfx-rules.md`. Copy what you use into the video's `work/assets/` so the render is self-contained. Log every external source in `out/sources.md`.

### 7. Build the Remotion composition
- Remotion project: `assets/template/` (copy it to `<studio>/.engine/remotion/` on first use, then `npm install`). If the template is still empty, scaffold a Remotion project there (pinned to the `remotionVersion` in the config) and build reusable brand components (PiP, Callout, ComparisonCards, IconFlow, Chart, HudList, UiPanel, LogoPop, CtaPill) following `brand.md`. Keep them generic, because every future video reuses them.
- The composition reads `edl.json`, `sync.json`, and `plan.json` as props. A-roll = the camera clip at sync offset, cut by the EDL. Audio = `mic.wav` cut by the same EDL. Camera and screen audio are muted.
- Render with `--public-dir <videoDir>/work` so `staticFile()` finds the assets.
- 1920×1080 (Shorts 1080×1920), 30 fps unless the camera is 25/60.

### 8. Review loop (at least once)
Render a **draft** (lower quality / `--scale 0.5`). Extract a frame every 2 s plus every beat boundary (`ffmpeg -vf fps=0.5`) and look at them. Check:
- Brand: colors, fonts, logo rules
- Nothing overlaps the face or goes off-screen; the Shorts safe zones are clear
- Callouts are spelled right, in sync, and readable for ≥ 1.2 s
- No static stretch over 5 s; no B-roll that contradicts the speech
- Audio: no clipped words, SFX on the right frames, music under the voice

Fix the problems and re-render. Then render the final to `out/final.mp4`.

### 9. Report
Write `out/edit-report.md`: total cut time, list of removals (with reasons), beats summary, assets used, anything skipped or missing (empty SFX folders, unsynced files), and suggestions (e.g. a stronger hook order). Give the user a short summary plus the path to `final.mp4`.

## Fix requests

When the user asks for a change after a render ("callout at 1:20 is wrong", "less zoom"), edit `plan.json` / `removals.json`, re-run only the affected steps, and re-render. Times the user gives refer to the **final video**, so map them through the EDL.
