# Editing style rules

The look blends three references:
- **Our channel** (layout system, screen-share + PiP, comparison cards, dark UI)
- **A business-explainer reference** (icon flowcharts, animated charts, HUD bullet lists, a hook formula)
- **Hormozi** (tight cleanup and punch-ins) with **Iman Gadzhi** (cinematic B-roll, smooth push-ins, mood-matched music)

Every visual must **explain or emphasize what is being said at that moment**. If a graphic doesn't help the viewer understand the sentence, leave the A-roll on screen.

## 0. Hard rules

- **Only remove, never rearrange.** Don't reorder, rewrite, or splice words from different takes into new sentences. The speaker's words and their order stay exactly as said (only fillers, retakes, stumbles, coughs, and pauses come out).
- **Keep sync exact.** The rendered video must be exactly as long as the cut (`edl.json` keptSeconds, ±1 frame), and the voice must never drift against the picture or the graphics.
- **Make it feel edited, not like a slideshow.** Graphics move with the speech, the speaker stays the anchor, and every visual is timed to the words that motivate it.

## 1. Cleanup (Hormozi-tight)

- Remove all dead air. Silences are handled automatically by `cut-plan.mjs`; keep a natural breath between sentences (the padding is built in).
- **Fillers**: remove them when they stand alone between words, not when they carry meaning.
  - English: um, uh, erm, hmm, "you know", "I mean", "like" (as a filler), "basically"/"actually"/"so" when they lead a sentence with no meaning.
  - Urdu: matlab, yani, "toh" (as a leading filler), acha (as a filler), "jo hai", "kya kehte hain", haan (as a filler), "dekhen".
  - ElevenLabs transcripts keep fillers word for word, so remove them directly by their times. Local Whisper often drops fillers: there, gaps of 0.2–0.8 s between words inside a sentence, with audible sound, are likely fillers. Check them with the audio energy and the low-confidence words.
- **Retakes**: when a sentence (or its start) is repeated, keep the **last complete** version unless an earlier one is clearly better (finished, no stumble). Remove false starts ("So the — so the main thing...").
- **Stumbles, restarts, coughs**: remove them too. With ElevenLabs transcripts, coughs/laughs appear as `(cough)`-style events. Keep a laugh if it's a reaction to the content.
- Never cut mid-word. Check by re-transcribing `cut-preview.wav` and comparing: no lost or chopped words.
- Every join gets a 10 ms fade out/in so it never clicks (the preview does this; the render must too).
- When unsure (a filler that might carry meaning, two equally good takes), make the call, and list it with its time in the edit report's **"Unsure"** section.
- Mixed Urdu/English speech is normal for this channel. Don't remove English words inside Urdu sentences (or the reverse).

## 2. Pacing: hybrid

- **Something changes every 2–4 seconds**: a punch-in, a callout, a layout switch, B-roll, or a graphic.
- The *layout* (A-roll / screen + PiP / comparison / full graphic) changes every 4–8 s, as on our channel. Within a layout, use punch-ins and callouts to hit the 2–4 s rhythm.
- Never hold the same static framing for longer than 5 s.
- Slow down for serious or story moments (slow push-in, fewer pops). Speed up for lists and numbers.

## 3. A-roll framing & zooms

Single camera, so all zooms are digital.
- **Base**: 100% (medium close-up).
- **Punch-in**: 112–120%, a **hard cut** on the first word of an emphasized phrase. Return to base on the next sentence or after 2–4 s.
- **Snap zoom** (fast 6–8 frame ease to 125%): rare, only on punchlines or big reveals.
- **Slow push-in** (100 → 108% over the whole sentence): for serious or emotional lines (Iman style).
- Keep the eyes on the upper-third line at every zoom level. Never crop the top of the head at 120%.

## 4. Layout system (16:9)

| Layout | When | Spec |
|---|---|---|
| **A-roll** | Default, opinions, stories | Full frame + zooms |
| **Screen + PiP** | A screen recording is relevant | Screen inside a rounded window mockup (radius 20–24), dark background with green glow; speaker PiP bottom-left (bottom-right if content is there), ~20% width, radius 24, 1–2px white 15% border, soft shadow |
| **Comparison** | "X vs Y", before/after, two options | Two rounded cards side-by-side (or top/bottom), each with a white or lime pill title; optional PiP |
| **Full graphic** | Explaining a concept/process/number | Full-screen dark (or light card) graphic; voice continues underneath. **Max 6 s**, then the speaker comes back (as A-roll, PiP, or split) |
| **Split** | A graphic that needs room but the moment is personal | Speaker in a rounded panel on the right (~40%), graphic on the left |
| **B-roll** | Mentions of real events, products, people, places | Full frame, 1.5–4 s, with a slow Ken-Burns zoom on stills |

## 5. Callouts (no full captions)

There are **no word-by-word captions**. Instead:
- **Keyword callouts**: 1–4 words of the key term or claim, Poppins Bold, bottom-center or beside the speaker. Animation: fade + slide up 10–12px over 8–10 frames; hold until the idea ends (min 1.2 s); exit with a fast fade.
- Highlight 1 word per callout in **lime** (on dark) or with an underline bar (on light).
- **Numbers** count up (e.g. `0 → 3B`) with Poppins ExtraBold.
- **Definitions** (e.g. "AGI = Artificial General Intelligence"): a lower-third card in Google Sans with the term in Poppins.
- Callouts are in **English** even when the speech is Urdu (translate the key term). Keep brand/product names exact.
- At most one callout on screen at a time (a comparison layout counts as its own).

## 6. Explainer graphics (the visual vocabulary)

Pick the graphic that matches what's being said:

| Speech pattern | Graphic |
|---|---|
| A process, system, or "how X makes money" | **Icon flowchart**: circle icons connected by animated arrows, built step by step in sync with speech |
| Numbers, growth, comparisons over time | **Animated chart** (bar/line/pie) building in, with a count-up value label |
| A list of points ("3 reasons...") | **HUD bullet list** floating on the left of the A-roll, each point popping in when spoken; ↑ green / ↓ orange metric arrows |
| Websites, apps, dashboards, tweets | **Tilted floating UI panel** (slight 3D perspective) with a screenshot or recording |
| Two things contrasted | **Comparison layout** (light cards for contrast) |
| A quote or a key belief | **Accent-serif quote card**, one line, slow push |
| A product/company mention | **Logo pop**: the product logo in a rounded tile beside the speaker |
| CTA (course, community, link) | **Pill CTA** in orange or lime: "Link in Description" |

## 7. B-roll

Order of preference (see `broll-sourcing.md`):
1. The user's B-roll library (`<studio>/broll/`, plus `broll/` in the video folder)
2. Fair-use clips from YouTube via yt-dlp: short (≤ 5 s each), transformative (with commentary on top), and every one logged in `out/sources.md`
3. Remotion-built animation
4. AI image + pan/zoom motion

B-roll is used for **real-world references** (events, launches, people, products). For abstract ideas, prefer an explainer graphic.

## 8. Hook (first 30 s)

Structure the opening, keeping the user's words but choosing the visuals:
1. **0–4 s**: contrarian question or bold claim, with a punch-in and a big callout
2. **4–14 s**: credibility (numbers, results), with count-ups and logo pops
3. **14–20 s**: proof, B-roll or screen recording
4. **20–30 s**: thesis ("In this video..."), a clean callout of the promise

If the speaker's own opening doesn't fit this, don't reorder their sentences without telling the user. Do it in the edit report as a suggestion.

## 9. Transitions

- Default: **hard cuts**.
- **Whip/slide** (8–10 frames, with whoosh) into full-screen graphics and between major layouts.
- **Soft light flash** only at chapter/topic changes (≤ 1 per 2 minutes).
- No glitches, spins, or cheesy wipes.

## 10. Color

- Moody, slightly contrasted A-roll: deep blacks, natural warm skin, no heavy filters.
- Graphics are always brand colors only.

## 11. Shorts (9:16, recorded separately)

- Same cleanup rules, and a **faster rhythm**: something changes every 1.5–3 s.
- Hook in the first 1.5 s: big callout + punch-in.
- Callouts sit in the middle third (clear of the platform UI at the top 12% and bottom 20%).
- PiP becomes **stacked**: screen/graphic on top (~55%), speaker on the bottom (~45%).
- End with a lime/orange pill CTA or a loopable last line.
