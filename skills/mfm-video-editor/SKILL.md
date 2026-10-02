---
name: mfm-video-editor
description: Automatically edits Make First Million / Aaghaz videos with Remotion. Takes a raw recording folder (camera, separate mic WAV, screen recordings), audio-syncs everything, cuts silences/fillers/retakes (Urdu + English), and adds branded motion graphics, keyword callouts, punch-in zooms, B-roll, logos, and Epidemic Sound SFX/music, then renders long-form 16:9 or Shorts 9:16. Use this whenever the user asks to edit, cut, clean up, sync, render, or add graphics/B-roll/SFX to a video or recording folder, mentions MFM-Studio, Make First Million, Aaghaz, or a videos/<slug> folder, or wants a talking-head video turned into a finished YouTube video or Short, even if they don't name the skill.
---

# MFM Video Editor

Turns a raw recording session into a finished, on-brand video, **fully automatically**: the user drops in a folder and gets a render back, then asks for fixes. Don't stop to ask for approval between steps. Ask only when something is genuinely missing or broken (a missing file, a failed sync, an empty asset folder the edit depends on).

**The bar:** if a professional editor handed this back, would the client accept it? "The pipeline ran" is not done. **Judgement is the product:** never ask the user which font, transition, or level. Decide, show the result, and take plain-language direction ("punchier", "less music"). The user describes the feeling; you own the numbers.

Scripts live in `scripts/` next to this file. Run them with `node <skill-dir>/scripts/<name>.mjs`.

## References (read before editing)

| File | Read when |
|---|---|
| `references/learned-rules.md` | **Always, first.** Fixes the team asked for before; overrides the other files when they conflict |
| `references/brand.md` | Always, before building any graphic |
| `references/style-rules.md` | Always: pacing, cleanup, layouts, callouts, graphics vocabulary, Shorts |
| `references/sfx-rules.md` | When placing SFX and music |
| `references/broll-sourcing.md` | When the edit needs B-roll |
| `references/logo-sourcing.md` | When a company or product logo is needed |

Also use the official Remotion skills (`remotion-best-practices` and friends, installed by setup) for correct Remotion code: timing, `<OffthreadVideo>`, `<Audio>`, fonts, `staticFile`, and rendering.

## Folder layout

```
<studio>/                      path in %USERPROFILE%\.mfm-video-editor\config.json
  brand/logos  brand/fonts  logos-cache  broll  sfx  music  .engine
  .env                         team API keys (ELEVENLABS_API_KEY, ...). Never ask the user to paste a key into chat:
                               tell them to fill it into this file themselves
  keyterms.txt                 brand/product names for transcription. Add new tool names when you meet them
  videos/<date-slug>/
    camera.mp4                 single camera (16:9 long-form, or 9:16 for Shorts)
    mic.wav                    separate mic = MASTER audio
    screens/*.mp4              screen recordings from the same session
    broll/                     optional video-specific B-roll
    notes.txt                  optional: topic, links, must-keep moments, format
    work/                      generated: sync.json, transcript.*, removals.json, edl.json, plan.json
    out/                       final.mp4, edit-report.md, sources.md
```

**Format**: comes from `work/inventory.json` (step 1). A vertical camera (by *displayed* size) or "short" in notes.txt means a **Short**; otherwise it's long-form 16:9.

Never write anything into this skill's own folder. All output goes in the video folder (and learned rules go to the repo checkout, see "Fix requests").

## Pipeline

### 0. Setup check
Run `node scripts/setup.mjs --check`. If there's no config yet, ask the user only for the Studio path, then run:
`node scripts/setup.mjs --studio "<path>" --language ur --model large-v3-turbo`
(The channel speaks mostly Urdu with some English. `ur` handles the mix better than `auto`.)
Maintainers with push access to the skill repo add `--repo "<path to their Claude-editing-Skill checkout>"` so learned rules get pushed.
After setup, if `ELEVENLABS_API_KEY` in `<studio>/.env` is empty, tell the user where the file is and ask them to fill it in themselves.

### 1. Inventory and sync
`node scripts/inventory.mjs <videoDir>` → `work/inventory.json`: displayed size of every file (phone footage is often stored sideways with a rotation flag), fps, variable frame rate, missing audio, and the format (long/short). Act on every warning before going on: convert variable-frame-rate files to constant, and always use displayed sizes.

`node scripts/sync-audio.mjs <videoDir>` → `work/sync.json`.
- `offset`: master time = file time + offset. Apply drift if `|driftMsPerMin| > 1`: master time = file time × (1 + drift) + offset, so play that video with `playbackRate = 1 / (1 + drift)`.
- For `low-confidence`, `mismatch`, or `no-audio` files: try placing them using the transcript (what's being discussed when the screen shows X). If you still can't, leave that file out and list it in the edit report. Don't guess silently.

### 2. Transcribe
`node scripts/transcribe.mjs <videoDir>` → three files in `work/`:
- `transcript.txt`: one sentence per line, `[mm:ss.ss] text`. Read it fully before deciding anything. It's mostly Urdu script with English terms mixed in.
- `transcript-words.tsv`: `start  end  confidence  word`, one per line. Use it for word times (fillers inside sentences).
- `transcript.json`: the same words plus `provider` and `timing`, for scripts.

**Provider**: ElevenLabs Scribe v2 is used automatically when `ELEVENLABS_API_KEY` is set in `<studio>/.env`. It has strong Urdu + English code-switching, `timing: "exact"`, keeps filler words, and tags coughs/laughs as `(cough)` events, at about 1 min per hour of audio. Without a key (or with `--provider whisper`, or when ElevenLabs fails), it runs local Whisper `large-v3-turbo`:
- Free and offline.
- `timing: "approx"`: word times are often 0.2–0.4 s off and sometimes ~1 s. The cut script compensates by snapping to real pauses.
- About 2–3× real time on a laptop CPU (a 20-min video ≈ 45–60 min). Tell the user it's running and suggest adding the ElevenLabs key; don't switch models on your own.

If the speaker names a tool that's missing from `<studio>/keyterms.txt` and it came out misspelled, add it there and re-transcribe with `--force`. Otherwise transcripts are cached: an unchanged input is never transcribed or paid for twice.

### 3. Decide removals (fillers & retakes)
Following `style-rules.md` §1, write `work/removals.json`:
```json
[{ "start": 12.30, "end": 18.10, "reason": "retake: repeated 'AI agents kya hain'" },
 { "start": 31.02, "end": 31.60, "reason": "filler: matlab" }]
```
- `start` = start time of the **first word to remove**; `end` = start time of the **first word to keep** after it (both from `transcript-words.tsv`). The script snaps each edge to the real pause next to that word.
- Times are in master (mic) time. Silences are handled by the script, so don't list them.
- Include coughs and other unwanted `(events)`; reason `"cough"` etc.
- **Only remove.** Never reorder. The one allowed stitch (strong opening of one take + strong ending of another, at a clean pause, words in spoken order) is described in `style-rules.md` §0 and always goes in the report's "Unsure" list.
- Cut on complete clauses; never drop a negation; check what remains after every partial removal reads on its own.
- Keep ~0.5 s of silence after the opening claim (the deliberate pause for the post-hook sound).

### 4. Cut
`node scripts/cut-plan.mjs <videoDir> --preview` → `work/edl.json` (keep segments) and `work/cut-preview.wav`.
Verify the cut (mandatory, it's a gate):
1. `node scripts/transcribe.mjs <videoDir> --input work/cut-preview.wav --out cut-check`, then compare `cut-check.txt` with the original: every kept sentence intact, every intended removal gone, every clause complete.
2. `node scripts/verify-cut.mjs <videoDir>`, then read `work/seam-check.md`. It transcribes a short window around **each join** (a whole-file pass hides seam defects) and flags words repeated across a join, weak or clipped first words, pops, and retakes left in. Flags are mechanical: judge each one against the source (Urdu reduplication like "جلدی جلدی" is not an error).
3. Fix by adjusting `removals.json` (or `--threshold`/`--min-silence`) and re-run both checks until they're clean. Explain any flag you deliberately keep in the report.

The preview has 10 ms fades at every join (`edl.json` `fadeMs`) so cuts don't click. The render must apply the same fades.

### 5. Edit plan
Write `work/plan.json`: an ordered list of beats on the **cut timeline** (seconds after cutting), each with:
`{ start, end, layout, zoom, callout?, graphic?, broll?, screen?, logo?, sfx[], music? }`
Use the graphics vocabulary in `style-rules.md` §6. Hit the pacing rule (a change every 2–4 s; 1.5–3 s for Shorts) and the hook structure (§8). Every visual must match what's said at that moment.

### 6. Gather assets
Real proof first, then B-roll per `broll-sourcing.md`, logos per `logo-sourcing.md`, SFX/music per `sfx-rules.md`. Run `node scripts/sfx-index.mjs` and place every sound by its peak: start = visual time − `peakAt`. Copy what you use into the video's `work/assets/` so the render is self-contained. Log every external source in `out/sources.md`.

### 7. Build the Remotion composition
- Remotion project: `assets/template/` (copy it to `<studio>/.engine/remotion/` on first use, then `npm install`). If the template is still empty, scaffold a Remotion project there (pinned to the `remotionVersion` in the config) and build reusable brand components (PiP, Callout, ComparisonCards, IconFlow, Chart, HudList, UiPanel, LogoPop, CtaPill) following `brand.md`. Keep them generic, because every future video reuses them.
- The composition reads `edl.json`, `sync.json`, and `plan.json` as props. A-roll = the camera clip at sync offset, cut by the EDL. Audio = `mic.wav` cut by the same EDL. Camera and screen audio are muted.
- Render with `--public-dir <videoDir>/work` so `staticFile()` finds the assets.
- Size and fps come from `inventory.json`: 1920×1080 (Shorts 1080×1920), at the camera's fps. A graphic rendered at a different fps or size gets resampled and judders, with no error.
- **Frame-driven motion only**: everything animates from `useCurrentFrame()` (`interpolate`, `spring`). CSS transitions, timers, and `requestAnimationFrame` render as a still, because Remotion doesn't render in real time.
- **No audio inside graphic components.** Every sound goes through the audio plan so it's mixed and measured with the voice.
- Every SFX is placed by its peak (`sfx-index.json`), and every join in the voice gets the EDL's 10 ms fades.

### 8. Review loop (at least once)
Render a **draft** (lower quality / `--scale 0.5`). Extract a frame every 2 s plus the first and last frame of every beat (`ffmpeg -vf fps=0.5`), and look at them. Don't present output you haven't looked at. Check:
- Brand: colors, fonts, logo rules
- Nothing overlaps the face (check after every zoom) or goes off-screen; no text touches a frame edge (look at the outer pixel columns); the Shorts safe zones are clear
- Callouts are spelled right, land on their word, and stay up ≥ 1.5 s; nothing on screen sits unchanged for more than ~4 s
- No static stretch over 5 s; no full-screen graphic over 6 s without the speaker; no B-roll that contradicts the speech
- Audio: no clipped words or clicks at joins; every SFX peaks on its visual and is **audible**: compare the mix against the voice-only cut at each hit (`sfx-rules.md`, "Levels"), since a level read from the mix alone measures the voice; music under the voice; loudness ≈ −14 LUFS
- Duration: `ffprobe` the render. It must equal `edl.json` `keptSeconds` within one frame, or sync is broken
- Every learned rule in `learned-rules.md` is respected

Fix the problems and re-render. Then render the final to `out/final.mp4`.

### 9. Report
Write `out/edit-report.md` with:
- Total cut time, and the list of removals (with reasons)
- **Unsure**: every judgment call with its final-video time (a filler that might carry meaning, close takes, weak sync), so the user can check just those spots
- Beats summary, assets used
- Anything skipped or missing (empty SFX folders, unsynced files)
- Suggestions (e.g. a stronger hook order)
- If more than a quarter of the recording was cut, say what went and why

Also deliver the publishing package in `out/` (an editor hands back more than a file):
- `titles.md`: 3–5 title options, written from the speaker's strongest actual lines (no generic AI-sounding titles)
- `description.md`: a short description plus **chapters** with final-video timestamps
- `thumbnails/`: 3–4 candidate frames, taken only from moments where the speaker is on screen (face clear, eyes open, not mid-word), never from a screenshot or graphic. Look at them and recommend one.

Give the user a short summary plus the path to `final.mp4`.

## Fix requests

The user sends notes like `0:42 - the title covers my face, move it left`. Times refer to the **final video**; map them through the EDL.
1. Change **only what was listed**. Everything else stays exactly as it is (same beats, same cuts, same assets).
2. Edit `plan.json` / `removals.json`, re-run only the affected steps, re-render, and re-check the changed spots.
3. **Learn from it.** For every note that reflects a general preference (not a one-off content fix), add a rule to `references/learned-rules.md`, worded for all future videos, with the reason **and the user's exact words**: `- **Rule.** Why: reason. Said: "their words". (date, video-slug)`. If a rule stops applying, retire it (move it to "Retired" with the reason) instead of deleting it.
   - If the config has `repoDir`, edit the rule there, then commit and push (`git -C <repoDir> pull --rebase`, commit `Learned rule: ...`, push), so the whole team gets it on `/plugin update`.
   - Otherwise (no push access), append it to `<studio>/learned-rules-pending.md` and tell the user to send that file to the repo maintainer. Also read that file at the start of every edit, since its rules apply locally too.

## Never

- Ask the user to configure something you should have decided.
- Trust a whole-file transcript to prove a cut is clean (check the seams).
- Conclude a sound effect works because it doesn't clip (measure it against the voice-only cut).
- Re-transcribe an unchanged source, or auto-detect the spoken language.
- Present a render you didn't look at.
- Show a sentence that has structure (a process, a comparison, a number) as a plain headline card.
- Put sound inside a Remotion graphic.
- Fabricate proof, or use another creator's face from a borrowed clip.
- Add something nobody asked for, or finish a correction round without recording what was learned.
