# Rendering engines: HyperFrames + Remotion (hybrid)

Two engines, each doing what it's best at, plus ffmpeg for sound:

| Engine | Job | Why |
|---|---|---|
| **HyperFrames** (HTML + CSS + GSAP) | **One-off graphics** for a single beat: keyword callouts, definition lower-thirds, quote cards, number count-ups, simple charts, CTA pills, logo pops, and any effect/transition from its catalog | Claude writes plain HTML more reliably and more creatively than React, short clips render fast, and ~400 ready-made catalog blocks (charts, transitions, glitch, film grain, social overlays) |
| **Remotion** (React) | (1) **Reusable brand components** with props: Screen + PiP, Split, Comparison cards, Icon flowchart, HUD list, UI panel. (2) **The master assembly** of the whole video | Components that every video reuses stay identical across videos. Handles long timelines with many video layers: A-roll cut by the EDL, zooms, screen recordings at sync offsets with drift correction, layout changes, all graphic clips on top |
| **ffmpeg** | **All audio**: voice cut by the EDL (10 ms fades), SFX placed by peak, music bed with ducking, loudness to −14 LUFS, final mux | Sound stays measurable (differencing against the voice-only cut), and a sound fix never needs a video re-render |

**Choosing per graphic**: one-off, text-led, or a catalog effect → HyperFrames. Reused across videos, or interacting with the speaker footage (PiP, split, anything that moves or crops the camera) → Remotion. When in doubt, HyperFrames.

**This skill owns the workflow.** The installed HyperFrames skills (`hyperframes`, `talking-head-recut`, …) are full workflows of their own. Don't hand the edit to them: use `hyperframes-core`, `hyperframes-animation`, `hyperframes-keyframes`, and `hyperframes-registry` only as **reference** for writing a graphic's HTML correctly. `brand.md` overrides their themes and fonts, and our transcription, cutting, and assembly replace theirs.

## Every graphic is its own clip

Each graphic in `plan.json` renders to its own **transparent** clip in `work/graphics/`, exactly as long as its beat, at the video's size and fps (`inventory.json`). The Remotion master then layers these clips over the footage.
- A fix to one graphic re-renders only that clip (seconds), not every graphic in a 20-minute video. Then re-render the master.
- Each clip can be looked at on its own before assembly.
- Each beat in `plan.json` records `"engine": "hyperframes" | "remotion"` and its clip path.

### HyperFrames graphic

Folder per graphic: `work/graphics/<beat-id>/index.html` (a standalone composition) plus the fonts it uses. **Start from `assets/hyperframes/callout/`** (a tested, lint-clean brand callout: transparent, Poppins, lime accent word, eased arrive/exit) and adapt it. Its header comment lists the setup steps.

```bash
cd work/graphics/<beat-id>
npx -y hyperframes@<hyperframesVersion> lint                      # must be 0 errors
npx -y hyperframes@<hyperframesVersion> check                     # layout, contrast, motion
npx -y hyperframes@<hyperframesVersion> render --format webm --fps <fps> --quality draft --output ../<beat-id>.webm
```

Use `--quality delivery` for the final pass. `<hyperframesVersion>` is in the config (pinned so every PC renders the same). Find an existing effect before hand-building one: `npx -y hyperframes@<v> catalog --query "<the effect, described in English>"`, then `npx -y hyperframes@<v> add <name>`.

Rules that fail silently or fail lint if broken (full detail in the `hyperframes-core` skill):
- Root: `<div id="root" data-composition-id="<id>" data-start="0" data-width="<W>" data-height="<H>" data-duration="<beat seconds>">`. Size the root with `width/height: 100%`, never hard-coded pixels.
- **Transparent**: `body { background: transparent; }` and no full-frame fill, so only the graphic is opaque.
- **One paused timeline**: `const tl = gsap.timeline({ paused: true }); … window.__timelines["<id>"] = tl;` with the key equal to `data-composition-id`. Only register it after it's fully built.
- Never set a CSS `transform` and tween the same property with GSAP. Use `gsap.fromTo(el, {y: 24}, {y: 0})` and `xPercent: -50` for centring.
- Never tween `visibility`/`autoAlpha`/`display` on a `.clip` element. Animate a child.
- **Fonts**: every `font-family` needs an `@font-face` pointing at a local file. Copy Poppins / Google Sans / the accent serif from `<studio>/brand/fonts/` into the graphic folder. Without that, lint complains and the render silently falls back to a default font (seen in testing).
- **GSAP from a local file**, not a CDN: copy `gsap.min.js` from the installed `talking-head-recut` skill (`~/.claude/skills/talking-head-recut/assets/vendor/gsap.min.js`). No network, no `Math.random()` (use a seeded generator), no clocks during render.
- No `<br>` in body text; size text from the real rendered box, never character counts.
- Brand colours and shapes come from `brand.md` only.

Rendering speed (measured on the team laptop): a 3 s 1080p transparent graphic took ~47 s, about 19 s of which was one-time browser setup. Render each graphic once and reuse it; render all graphics before the master.

### Remotion component graphic

Reusable components live in the Remotion project (`<studio>/.engine/remotion/`, from `assets/template/`), one composition per component, driven by props. Render a transparent clip:

```bash
npx remotion render <CompositionId> work/graphics/<beat-id>.webm --props=work/graphics/<beat-id>.json --codec=vp8 --image-format=png --pixel-format=yuva420p
```

Follow the official Remotion skills for the code: frame-driven motion only (`useCurrentFrame`, `interpolate`, `spring`), with no CSS transitions or timers.

### Master assembly (Remotion)

One composition for the whole video, at the inventory's size and fps, rendered **muted**:
- A-roll: the camera clip at its sync offset (and `playbackRate` for drift), cut by `edl.json`, with the zooms from `plan.json`.
- Screens: screen recordings at their sync offsets, inside the Screen + PiP / Split layouts.
- Graphics: each clip from `work/graphics/` in a `<Sequence>` at its beat start, as `<OffthreadVideo src={staticFile(...)} transparent muted />`.
- Graphic clips sit **above** the footage. Nothing covers the face (check after zooms).
- Length must equal `edl.json` `keptSeconds` (±1 frame).

Then ffmpeg mixes the audio (voice + SFX + music, see `sfx-rules.md`) and muxes it onto the master: `out/final.mp4`.

## Sound never goes inside a graphic

Neither engine's graphics carry audio. HyperFrames and Remotion clips render silent, and every sound is placed in the ffmpeg mix where it can be measured.
