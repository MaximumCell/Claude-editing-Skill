# Sound design rules

Sound design is part of the style, not an afterthought: **every visual movement gets a sound**, and the voice always wins.
Rules marked *(i-hate-editing)* come from [ranahaani/i-hate-editing](https://github.com/ranahaani/i-hate-editing), where each was measured on real mixes.

## Sources

- **Epidemic Sound** downloads live in `<studio>/sfx/` and `<studio>/music/`.
- Expected sub-folders (create them if missing, and tell the user what's empty):
  ```
  sfx/whoosh/  sfx/swoosh/  sfx/pop/  sfx/click/  sfx/hit/  sfx/riser/  sfx/ding/  sfx/glitch/  sfx/typing/  sfx/cash/
  music/calm/  music/upbeat/  music/serious/  music/tech/
  ```
- Run `node scripts/sfx-index.mjs` before placing sounds. It records each file's duration, **peak time** (`peakAt`), and loudness in `<studio>/sfx-index.json`.
- Rotate through the files in a folder so the same sound doesn't repeat back to back.
- If a needed category is empty, skip that sound and list it in the edit report. Never download SFX from random sites.

## Each sound has one job

| Visual event | SFX |
|---|---|
| A graphic, panel, or layout slides in | whoosh |
| A graphic leaves / slides away | swoosh (softer) |
| A callout, word, number, or badge appears | pop |
| List row, UI element, selection, highlight marker | click |
| Cutting to a screen recording | short glitch or low keyboard |
| Building up to a reveal | riser, its peak ending exactly on the reveal frame |
| The reveal / biggest payoff / punchline snap-zoom | hit (low impact) |
| Positive result, checkmark, key metric landing | ding / chime, paired with a held zoom |
| Money / revenue numbers | cash (rarely, max 1 per minute) |

## Placement

- **Every layout change and every graphic arrival gets a sound** *(i-hate-editing)*: a graphic that appears in silence reads as unfinished. This is the floor.
- **Density ceiling**: about 3–5 distinct sound moments per 15 s. Above that it's auditory fatigue. The ceiling only thins *optional* accents, never the mandatory ones.
- **Normal punch-ins (hard cuts on the face) get no SFX**; only snap-zooms get a hit.
- **Don't double up** *(i-hate-editing)*: if a cut and a graphic arrive within ~0.2 s, keep the graphic's sound and drop the cut's. Twelve near-identical whooshes is how a mix starts sounding like "all whoosh".
- **Never stack a pop and a hit on the same frame**: they blur into one distorted sound. Where a hit lands, drop the pop; put any ding 0.2–0.3 s after the hit.
- **Frame-perfect by the peak, not the start** *(i-hate-editing)*: the sound's loudest moment lands within ~2 frames of the visual. Start each file at `visual time − peakAt` (from `sfx-index.json`). For a whoosh into a cut, the peak lands on the cut frame.
- **No sound inside Remotion graphics.** Every sound is placed in the audio plan (`plan.json` `sfx[]`) and mixed with the voice, so it can be measured.

## The hook

- **Hook opener** *(i-hate-editing)*: one low hit on the first visual change inside the first 1.5 s (never before 0.15 s). It's the only sound in that window: no whoosh stack on top of it.
- **Post-hook sting**: after the opening claim, a riser resolving into an impact, landing in the deliberate ~0.5 s pause (`style-rules.md` §1). Rhythm: **claim → [hit, no voice] → body**. Never hard-cut from the hook into the body in silence.

## Music

- One continuous low **bed** under the whole video: lo-fi / ambient tech by default (`music/tech/` or `music/calm/`).
- **Duck it under the voice, don't just set it low**: sidechain-style ducking under speech, recovering in the gaps. A static level low enough for speech is one nobody notices.
- Change the track at major chapter changes or mood shifts (serious story → `music/serious/`, wins/results → `music/upbeat/`). Crossfade over 1–2 s, landing on a cut.
- **Dip further (or drop out for 0.5–1 s) right before the most important line**, then bring it back.
- Hook: music starts at frame 0 or right after the first line.

## Levels: measure, don't guess

Absolute targets on the finished mix:

| Element | Peak |
|---|---|
| Voice | −3 to −6 dBFS |
| Transient SFX (whoosh, pop, hit) | −10 to −18 dBFS, never louder than the voice's peak |
| Music bed | −18 to −22 dBFS, ducked further under speech |

- **Size SFX against real speech, not the file average** *(i-hate-editing)*. The average level includes every pause, so it reads several dB below actual speech. Measure a 1–2 s window of continuous speech in the voice-only cut and use that as the reference.
- **Target lift**: each transient peaks **+2 to +4 dB above that speech level** (centre ~+3), never below +1 or above +8.
- **Check audibility by differencing** *(i-hate-editing)*. Under speech, the loudest thing in a sound's window is the voice, so measuring the master alone says nothing about the sound. Compare the final mix against the voice-only cut over a 0.25 s window starting 0.05 s before each hit: the difference is the sound. A sound that "doesn't clip" isn't proven audible.
- Library files are often 20–30 dB quieter than the voice (`sfx-index.json` flags SFX that peak below −12 dBFS). Pre-amplify them (`volume=+7..13dB,alimiter=limit=0.95`) instead of pushing per-clip gain to extremes.
- Make sure the window you play contains the file's peak. A window that starts before the peak or is shorter than the file can play only the quiet lead-in.

## Voice and master

- The voice (`mic.wav`) is the master audio. Camera and screen-recording audio are **muted**; they're only used for sync.
- Light compression on the voice before mixing (e.g. `acompressor=threshold=0.045:ratio=3:attack=6:release=110`), then measure every sound against the processed voice.
- Master the finished mix to about **−14 LUFS** integrated (YouTube's level) with `loudnorm`. Check it after rendering.
- Fade every SFX and music edge by at least 2 frames; cut joins in the voice get the 10 ms fades from the EDL.
