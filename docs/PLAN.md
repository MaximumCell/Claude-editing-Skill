# mfm-video-editor: Skill Plan (draft)

Channel: Make First Million (https://www.youtube.com/@makefirstmillion-j1)
Status: v0.1 in progress.
- Built and tested on synthetic English audio: `setup.mjs`, `sync-audio.mjs` (offset ±11 ms, drift detected exactly), `transcribe.mjs`, `cut-plan.mjs` (retake + silence removal verified by re-transcription)
- Written: `SKILL.md`, `references/brand.md`, `style-rules.md`, `sfx-rules.md`, `broll-sourcing.md`, `logo-sourcing.md`
- Not yet built: Remotion template + brand components, edit-plan → render step, review loop
- Not yet tested: Urdu/English speech (needs a real recording)
- Whisper: whisper.cpp 1.9.2 + large-v3-turbo (1.5.5 cannot do turbo word timing). ~2.7× real time on the i5-8365U laptop (no NVIDIA GPU)
- Transcription: ElevenLabs Scribe v2 when ELEVENLABS_API_KEY is set (exact word times, keeps fillers, Urdu code-switching, ~$0.22/h, free plan 4.5 h/month), local Whisper fallback. AssemblyAI rejected: Urdu only on Universal-2 (10-25% WER)
- From the RoboNuggets guide (2026-10-02): learned-rules.md (fixes become rules, pushed to repo), only-remove-never-reorder, 10 ms fades at joins, render length = cut length check, change-only-what-was-listed on fixes, Unsure section in report, full-screen graphics max 6 s
- From ranahaani/i-hate-editing (2026-10-02): new scripts inventory.mjs (rotation/VFR), verify-cut.mjs (per-seam windows: repeats, weak starts, pops, retakes left in), sfx-index.mjs (peak offsets), transcript cache, Urdu-safe Whisper word text; rules on silence-anchored cuts, complete clauses, deliberate post-hook pause, held zooms (no shimmer), dwell 1.5 s floor, one-thing-at-a-time, entrance table, real proof first, screens-only borrowed clips, SFX by peak + differencing, hook opener + post-hook sting, publishing package (titles, chapters, thumbnails)
- Open design question for the Remotion build: one composition for the whole video vs one composition per graphic rendered separately and composited (i-hate-editing/flick approach: a fix re-renders only the changed graphic, which matters for 20-min videos)
- Known limit (Whisper fallback only): word times can be ~1 s off; sentence-level retake cuts are reliable, single-word cuts near long pauses can miss (caught by the re-transcription check)
- Spoken language: mostly Urdu with some English → Whisper language `ur`

## Decisions so far
| Topic | Decision |
|---|---|
| Video style | Founder talking to camera + heavy motion graphics / explainer visuals |
| Formats | Long-form 16:9 and Shorts 9:16 (Shorts are **separate recordings**, not cut from long videos) |
| Input | Raw on-camera recording (your voice is the audio base) |
| Autonomy | Fully automatic: raw video in, finished render out, fixes afterward |
| Raw cleanup | Cut silences, cut filler words and retakes, punch-in zooms |
| Story visuals | Motion graphics and other visuals that help explain the message |
| B-roll (in order) | 1) Your own B-roll library  2) Fair-use YouTube clips via yt-dlp (source log kept)  3) Remotion animations  4) AI images + pan/zoom motion |
| SFX | Epidemic Sound (access method still to confirm) |
| Brand | Make First Million brand kit, built into the skill |
| Sharing | Private, for your team (private GitHub repo + .skill package) |
| Foundation | Official `remotion-dev/skills`, plus ideas borrowed from kamgasimo/ai-video-editor and a-prs/remotion-video-onboarding |

## Style decisions
| Topic | Decision |
|---|---|
| Pacing | Hybrid: Hormozi-tight cleanup, with a punch-in or new visual every 2–4s |
| Captions | Keyword callouts only (no full word-by-word captions), both long-form and Shorts |
| Screen demos | You record them; the skill places them in mockup frames with a speaker PiP |
| Brand colors/fonts | Taken from the brand kit, not the #FF5E00 seen in the video analysis |
| Layout system | From our channel: A-roll / screen + PiP / comparison cards / full-screen dark graphics |
| Explainer graphics | From the reference video: icon flowcharts, animated charts, HUD bullet lists, tilted UI panels |
| SFX rules | Whoosh on slide-ins and layout switches, pop on bullets/icons, sub-hit on headline reveals; music ducked about −20 dB |

## Sharing & packaging
- **Distribution:** private GitHub repo set up as a Claude Code plugin + marketplace (`/plugin marketplace add MaximumCell/Claude-editing-Skill` → `/plugin install mfm-video-editor@mfm-tools`, updates via `/plugin update`), **plus** an exported `.skill` file for anyone outside GitHub
- **Team OS:** Windows only, so scripts are Node (.mjs) + PowerShell-friendly with Windows paths
- **API keys:** shared team keys, kept in each person's local `.env` and never committed (repo ships `.env.example`)
- **Assets:** local folder per PC (the "Studio"). Not in the repo, because B-roll and SFX are large and licensed

### Repo layout
```
Claude-editing-Skill/                   (private GitHub repo: MaximumCell/Claude-editing-Skill)
  .claude-plugin/plugin.json            plugin manifest
  .claude-plugin/marketplace.json       lets the team add the repo as a marketplace
  skills/mfm-video-editor/
    SKILL.md                            workflow: setup → sync → cut → plan → build → review → render
    references/                         brand.md, style-rules.md, layouts.md, sfx-rules.md,
                                        broll-sourcing.md, logo-sourcing.md, shorts.md
    scripts/                            setup.mjs, sync-audio.mjs, transcribe.mjs, cut-plan.mjs,
                                        fetch-logo.mjs, fetch-clip.mjs, review-frames.mjs
    assets/template/                    Remotion project template with brand components
                                        (PiP, callouts, comparison cards, flowcharts, CTA pills...)
  .env.example                          AI_IMAGE_API_KEY=, EPIDEMIC_...=
  README.md                             install + first-run guide for teammates
```
Everything the skill needs lives inside `skills/mfm-video-editor/`, so the exported `.skill` file works the same as the plugin.
The official `remotion-dev/skills` are installed by `setup.mjs`, not copied into our repo, so they stay current.

### Studio folder (per PC, path chosen on first run)
```
MFM-Studio/
  brand/logos/        your official logos
  brand/fonts/        Poppins, Google Sans, accent serif
  logos-cache/        third-party logos the skill downloads (OpenAI, Google...), reused next time
  broll/              your B-roll library
  sfx/  music/        Epidemic Sound downloads
  videos/<date-slug>/ camera.mp4, mic.wav, screens/, notes.txt → out/
```
First run: `setup` asks for the Studio path, creates this structure, checks Node/ffmpeg/yt-dlp/Whisper, and saves `%USERPROFILE%\.mfm-video-editor\config.json`.

## Brand kit (Aaghaz Guideline.pdf, tagline "BE AN OUTLINER")
| Token | Value | Video use |
|---|---|---|
| Green | #62c41f | Primary accent, icons |
| Dark Green | #005924 | Headings on light, dark-green gradient backgrounds |
| Lime Green | #c3ff00 | Keyword highlight, callout pills, active states |
| Orange | #ff7d00 | CTA ("Enroll now", "Link in description"), contrast words |
| Jet Black | #000000 | Main video graphic background |
| Light Green / Lime Beige / Orange Beige | #f2fff2 / #fdfff2 / #fff9f4 | Light-mode cards and slides |
- Fonts: **Poppins** SemiBold/Bold/ExtraBold for headings and callouts · **Google Sans** Regular/Medium/Semibold for body and UI · accent serif listed as "Anthropic Serif Display" (licensing needs checking, see open questions)
- Icons: solid fill, inside a circle, colored primary green + lime; on a lime or black circle
- Logo: icon + "Aaghaz" wordmark + "BE AN OUTLINER". Approved combos only (black/white/green logo on lime, green, dark green, white, or black). No gradients or effects on the logo; keep clear space = logo height
- Social style reference: dark-green radial glow on black, lime headline, white text, rounded black cards with app icons, lime/orange pill CTA
- Shorts: shot separately in native 9:16 (same camera + mic setup)
- **Graphic look: Mix.** Mostly dark (black + dark-green glow, lime highlights, orange CTAs); light beige/lime cards for comparisons and checklists to add contrast
- Accent serif: you provide the licensed font files; used sparingly for quotes and key callouts

## Recording setup & input
- One camera + separate mic WAV + screen recordings, all captured in the same session (voice audible in every file)
- **Audio sync:** ffmpeg extracts mono audio from each file → cross-correlation finds each file's offset against the mic WAV (a Node script, so no Python needed) → offsets are checked at both the start and end of the file to catch clock drift. The mic WAV becomes the master audio.
- Input = one folder per video:
  ```
  videos/<date-slug>/
    camera.mp4        # single camera
    mic.wav           # master audio
    screens/*.mp4     # screen recordings from the same session
    broll/            # optional video-specific B-roll
    notes.txt         # optional: topic, links, must-keep moments
  ```
- Output goes to `videos/<date-slug>/out/`: final.mp4, edit-report.md, sources.md (fair-use log)

## Style research (from AI video analysis, so exact values are approximate)

### Base: our channel (rir8WZeLY84, AI/tech news)
- Layout changes every 4–8s, rotating between: full A-roll / screen-share + rounded PiP of the speaker / side-by-side or top-bottom comparison cards / full-screen dark graphic
- PiP: bottom-left, ~20% width, radius ~24px, 1–2px white/15% border, soft shadow
- Dark UI: background #0A0D14–#121212, cards #1C1E24, accent orange #FF5E00, text #FFF / #A1A1AA
- Inter-style geometric sans, weights 600/700; pill badges; macOS-window mockups for screen recordings
- Keyword callouts: fade + 10px slide up, bottom-center
- Lo-fi tech music bed; UI clicks, low whooshes on layout switches, soft pops on cards
- CTA pills ("Link in Description"), community/course promo cards

### Reference: 21flGkcZO3A (business explainer)
- Re-frame every 3–5s; 10–15% punch-ins; slow push-in on serious moments
- Word-by-word captions, white + yellow/lime highlight on 1–2 keywords
- Dark-mode flowcharts with icons + arrows to explain concepts; animated charts; maps; floating HUD bullet lists with ↑/↓ metrics
- UI screenshots on tilted floating 3D panels
- SFX: whoosh on every slide-in, pop on every bullet/icon, sub-bass hit on headline reveals; music ducked to about −20 dB
- Hook: contrarian question → credibility numbers → proof clip → thesis, all within 30s

### Hormozi
- Jump cuts every 1–3s, all pauses and fillers removed, 10–20% punch-ins alternating medium/close
- UPPERCASE bold captions, 2–4 words, active word yellow, pop with bounce, black stroke

### Iman Gadzhi
- Cinematic B-roll, smooth push-ins, clean minimal text callouts, music chosen per emotional section, sound design treated as core

## Draft pipeline
1. Setup check: Node, ffmpeg, yt-dlp, Remotion project, Whisper (installed through Node, no Python needed)
2. Audio-sync camera + screens to mic.wav; transcribe the mic with word-level timestamps
3. Clean cut: remove silences, fillers, and retakes (cut points snapped to the audio; checked by transcribing again)
4. Edit plan: for each sentence, choose a visual (graphic / B-roll / zoom / caption emphasis) + SFX, matched to the reference-video style
5. Gather assets: B-roll library → yt-dlp clips → Remotion animation → AI image
6. Build the Remotion composition with brand components
7. Render a draft → self-review frames against a checklist → fix → final render
8. Output: MP4 + SRT + edit report (cuts, sources, fair-use log)

## Open questions
- Logo source files (SVG or transparent PNG): icon, wordmark, and full logo, in each approved color
- Accent font files (you're providing them)
- Epidemic Sound: is there API/MCP access, or only manual downloads?
- AI image service + API key (e.g. kie.ai, Replicate, OpenAI)
- Location of the B-roll library
- A sample raw recording for testing
