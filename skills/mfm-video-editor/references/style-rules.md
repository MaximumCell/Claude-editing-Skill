# Editing style rules

The look blends three references:
- **Our channel** (layout system, screen-share + PiP, comparison cards, dark UI)
- **A business-explainer reference** (icon flowcharts, animated charts, HUD bullet lists, a hook formula)
- **Hormozi** (tight cleanup and punch-ins) with **Iman Gadzhi** (cinematic B-roll, smooth push-ins, mood-matched music)

The craft rules marked *(i-hate-editing)* come from [ranahaani/i-hate-editing](https://github.com/ranahaani/i-hate-editing). Each one was learned from a rejected render on Urdu/English talking-head videos.

**The bar:** if a professional editor handed this back, would the client accept it? "The pipeline ran" is not done.

Every visual must **explain or emphasize what is being said at that moment**. If a graphic doesn't help the viewer understand the sentence, leave the A-roll on screen.

## 0. Hard rules

- **Only remove, never rearrange.** Don't reorder sentences, rewrite them, or build a sentence from words of different takes. The one exception *(i-hate-editing)*: if the strong opening of a line is in one take and its strong ending in another, you may join the two **at a clean pause**, keeping the words in their spoken order. List every such stitch in the report's "Unsure" section.
- **Keep sync exact.** The rendered video must be exactly as long as the cut (`edl.json` keptSeconds, ±1 frame), and the voice must never drift against the picture or the graphics.
- **Audio is the authority on time** *(i-hate-editing)*. Cut edges sit in real silence, found in the waveform, never on a word's transcript time. Transcribers mark a word's start on its consonant, so cutting exactly there chops the attack.
- **Make it feel edited, not like a slideshow.** Graphics move with the speech, the speaker stays the anchor, and every visual is timed to the words that motivate it.
- **Never fabricate proof.** When the speaker names a real repo, page, product, tweet, or number, show the real thing (see `broll-sourcing.md`). Never mock up something that looks like a screenshot of reality.

## 1. Cleanup (Hormozi-tight)

- Remove dead air. Silences are handled automatically by `cut-plan.mjs`, with a natural breath kept between sentences (the padding is built in). Short thinking pauses inside a sentence are rhythm, not dead air.
- **Fillers**: remove the ones that break the sentence, not every single one. Stripping all of them makes the delivery sound synthetic *(i-hate-editing)*.
  - English: um, uh, erm, hmm, "you know", "I mean", "like" (as a filler), "basically"/"actually"/"so" when they lead a sentence with no meaning.
  - Urdu: matlab, yani, "toh" (as a leading filler), acha (as a filler), "jo hai", "kya kehte hain", haan (as a filler), "dekhen".
  - ElevenLabs transcripts keep fillers word for word, so remove them directly by their times. Local Whisper often drops fillers: there, gaps of 0.2–0.8 s between words inside a sentence, with audible sound, are likely fillers. Check them with the audio energy and the low-confidence words.
- **Retakes**: when a sentence (or its start) is repeated, keep the **last complete** version. Later takes are usually more fluent because the speaker has warmed into the line. Scan every take of a line before choosing. Prefer a slightly fumbled take that finishes the thought over a crisp one that trails off.
- **Stumbles, restarts, coughs**: remove them too. With ElevenLabs transcripts, coughs/laughs appear as `(cough)`-style events. Keep a laugh if it's a reaction to the content.
- **Weak opening**: start on the first complete thought. If the intro was restarted, keep the last version.
- **Cut on complete clauses** *(i-hate-editing)*. Every kept block starts and ends on a finished thought. A cut that drops a negation ("nahi", "not") flips the meaning. That's the single most damaging cutting error.
- **Check orphans and stale references.** When a cut removes half a sentence, read what remains on its own; if it no longer stands up, cut it too. Dropping an item can leave the speaker saying "fourth" about what is now the third thing.
- **The deliberate pause** *(i-hate-editing)*. Right after the opening claim, keep ~0.5 s of footage with no speech. That's where the post-hook sound lands (see `sfx-rules.md`), and it's what separates a hook from a sentence.
- **Report a heavy cut.** If more than a quarter of the recording is removed, say what went and why in the report.
- Never cut mid-word. Every join gets a 10 ms fade out/in so it never clicks (the preview does this; the render must too).
- Mixed Urdu/English speech is normal for this channel. Don't remove English words inside Urdu sentences (or the reverse). Urdu reduplication ("جلدی جلدی", "کر کر کے") is grammatical, not a stutter.
- When unsure (a filler that might carry meaning, two equally good takes, a stitch), make the call and list it with its time in the edit report's **"Unsure"** section.

## 2. Pacing: hybrid

- **Something changes every 2–4 seconds**: a punch-in, a callout, a layout switch, B-roll, or a graphic. This applies **inside** a single graphic too *(i-hate-editing)*: a panel that arrives once and then sits for 8 s is a defect. If a beat runs longer than 4 s, plan another event inside it (the next list row, a logo, a held zoom on the key word, a sound accent) or split it into two graphics.
- The *layout* (A-roll / screen + PiP / comparison / full graphic) changes every 4–8 s, as on our channel. Within a layout, use punch-ins and callouts to hit the 2–4 s rhythm.
- Never hold the same static framing for longer than 5 s.
- Slow down for serious or story moments (slow push-in, fewer pops). Speed up for lists and numbers.
- **Dwell time** *(i-hate-editing)*: anything placed on screen (callout, card, B-roll, logo) stays up for **at least 1.5 s**, because under that the viewer sees a flicker and reads nothing. Ceiling: full-screen graphics 6 s; everything else returns to the speaker or changes within ~4 s. The final CTA may run to the end.

## 3. A-roll framing & zooms

Single camera, so all zooms are digital. **Err large** *(i-hate-editing)*: a zoom the viewer isn't sure happened reads as a mistake, not a choice.
- **Base**: 100% (medium close-up).
- **Punch-in**: 115–125%, a **hard cut** on the first word of an emphasized phrase. Return to base on the next sentence or after 2–4 s.
- **Held zoom** on the face for a big line: 124–130%. Punch in, hold the scale **constant** for 1.3–1.6 s, then ease back. Never ride it.
- **Snap zoom** (fast 6–8 frame ease to 125%): rare, only on punchlines or big reveals.
- **Slow push-in** (100 → 108% over the whole sentence): only on the face, for serious or emotional lines (Iman style). **Never** slowly scale a screenshot, screen recording, or any detailed image. Every frame gets resampled at a slightly different size and the image visibly shimmers. Detailed material only gets held zooms.
- **Judge every crop from a real frame** *(i-hate-editing)*. Extract a frame, render 2–3 candidate crops side by side, and pick. Where the eyes sit differs per recording; arithmetic puts the forehead at the frame edge. Keep the eyes on the upper-third line at every zoom level.
- **Nothing lands on the face**: no callout, logo, badge, or panel over the eyes, nose, or mouth at any moment. Re-check after every zoom, since a punch-in moves the face.
- **Never cut medium to medium.** If there's no B-roll for a cut, change the framing instead (a punch-in is a real cut).

## 4. Layout system (16:9)

| Layout | When | Spec |
|---|---|---|
| **A-roll** | Default, opinions, stories | Full frame + zooms |
| **Screen + PiP** | A screen recording is relevant | Screen inside a rounded window mockup (radius 20–24), dark background with green glow; speaker PiP bottom-left (bottom-right if content is there), ~20% width, radius 24, 1–2px white 15% border, soft shadow |
| **Comparison** | "X vs Y", before/after, two options | Two rounded cards side-by-side (or top/bottom), each with a white or lime pill title; optional PiP |
| **Full graphic** | Explaining a concept/process/number | Full-screen dark (or light card) graphic; voice continues underneath. **Max 6 s**, then the speaker comes back (as A-roll, PiP, or split) |
| **Split** | A graphic that needs room but the moment is personal | Speaker in a rounded panel on the right (~40%), graphic on the left |
| **B-roll** | Mentions of real events, products, people, places | Full frame, 1.5–4 s, with a slow Ken-Burns zoom on photographic stills only |

- **Never scale the face while it's moving into a PiP or split** *(i-hate-editing)*. That glitches in motion and passes every still-frame check. Put the emphasis on the graphic instead.
- Every layout has its own text positions. A callout placed for full-frame A-roll lands on the speaker once the layout becomes a split.

## 5. Callouts (no full captions)

There are **no word-by-word captions**. Instead:
- **Keyword callouts**: 1–4 words of the key term or claim, Poppins Bold, bottom-center or beside the speaker. Animation: slide up 10–12px with fade over 8–10 frames, eased (never linear); hold until the idea ends (min 1.5 s); exit by sliding away (a fade reads as an ending).
- **Rank the words** *(i-hate-editing)*: only the one word carrying the claim is large and lime (on dark) or underlined (on light). Connectors stay small and white.
- **Numbers** count up (e.g. `0 → 3B`) with Poppins ExtraBold, and reach their final value while still on screen.
- **Definitions** (e.g. "AGI = Artificial General Intelligence"): a lower-third card in Google Sans with the term in Poppins.
- Callouts are in **English** even when the speech is Urdu (translate the key term). Keep brand/product names exact.
- **Text never touches an edge.** Keep generous padding, and size the longest word so it fits without wrapping. Measure text in the rendered frame, never estimate it from character counts (that clipped headlines three times in a row in i-hate-editing). After rendering, check the outer pixel columns of the frame for text.
- **Sync to the word**: start the animation early enough that its *landing frame* coincides with the word being spoken. Arriving late is the default failure.

## 6. Explainer graphics (the visual vocabulary)

Order of preference *(i-hate-editing)*: **real material** (the actual page, repo, dashboard, number) → a **designed scene** with structure → a **plain text card** (only for an abstract claim, a summary, a topic change, or the CTA). An edit where every beat is a card is a slideshow with a face attached.

Pick the graphic from what the sentence is *doing*:

| Speech pattern | Graphic |
|---|---|
| A process, system, or "how X makes money" | **Icon flowchart**: circle icons connected by animated arrows, built step by step in the order the sentence explains it |
| Numbers, growth, comparisons over time | **Animated chart** (bar/line/pie) building in, with a count-up value label |
| A list of points ("3 reasons...") | **HUD bullet list** floating on the left of the A-roll, each row sliding in from the left when spoken (~0.3 s apart at least); ↑ green / ↓ orange metric arrows |
| Websites, apps, dashboards, tweets | **The real page or screen recording** on a tilted floating panel; scroll through content (never whitespace), then a held zoom onto the exact words being said, with one marker highlight on the key line |
| Two things contrasted | **Comparison layout** (light cards for contrast) |
| A quote or a key belief | **Accent-serif quote card**, one line |
| A product/company mention | **Logo pop**: the real product logo in a rounded tile beside the speaker |
| CTA (course, community, link) | **Pill CTA** in orange or lime: "Link in Description" |

Motion craft *(i-hate-editing)*:
- **One thing at a time.** Never reveal two independent elements on the same frame, because the eye tracks neither.
- **Vary the entrance and the form.** No two consecutive elements arrive the same way, and don't repeat one card layout three times in a row. Choose the entrance from what the element is:

| Element | Entrance |
|---|---|
| Graphic replacing the previous one | Slide from the side |
| First graphic after the speaker | Slide down from the top |
| A single word, number, or badge | Scale pop with slight overshoot |
| A logo | Scale pop, faster and smaller |
| A screenshot or real page | Push in from the edge, then hold |
| List rows | Slide in from the left, one at a time |
| The payoff | Hard cut in, masked by an impact sound |
| Back to the speaker | Slide the graphic away (don't fade) |

- **Zoom is not an entrance.** A graphic that zooms while arriving shows two competing moves.
- **Easing**: never linear. Ease-out for arrivals, slight overshoot for pops, ease-in-out for scrolls and drifts. Add motion blur to anything that slides on fast.
- **Every scene is concrete.** If the description of a scene would fit any other sentence in the video, it's a title card with extra steps. Redesign it.

## 7. B-roll

Order of preference (see `broll-sourcing.md`):
1. **Real proof**: the actual page, repo, or product the speaker names
2. The user's B-roll library (`<studio>/broll/`, plus `broll/` in the video folder)
3. Fair-use clips from YouTube via yt-dlp: short (≤ 5 s each), transformative, **screens only, never another creator's face**, every one logged in `out/sources.md`
4. Remotion-built animation
5. AI image + pan/zoom motion

**Match the meaning, not just the noun** *(i-hate-editing)*: "I was stuck for three days" is shown with the error or the failing run, not a neutral screenshot of the tool. For abstract ideas, prefer an explainer graphic.

## 8. Hook (first 30 s)

- **Frame one is the speaker's face** *(i-hate-editing)*: never a logo, title card, or designed screen, which reads as an ad and gets skipped. No intro, no slow build.
- **Three hooks at once, same promise**: visual (movement or a punch-in), verbal (the first sentence), and text (a big callout that makes sense **with the sound off**). Conflicting cues cause a skip.
- **Change the frame within the first 2 s** (punch-in, graphic sliding in).

Then structure the opening, keeping the speaker's words but choosing the visuals:
1. **0–4 s**: contrarian question or bold claim: punch-in, big callout with one accent word, then the deliberate pause with the post-hook sound
2. **4–14 s**: credibility (numbers, results), with count-ups and logo pops
3. **14–20 s**: proof: the real page, B-roll, or screen recording
4. **20–30 s**: thesis ("In this video..."), a clean callout of the promise

If the speaker's own opening doesn't fit this, don't reorder their sentences. Suggest it in the edit report instead.

## 9. Transitions

- Default: **hard cuts**.
- **Whip/slide** (8–10 frames, with whoosh) into full-screen graphics and between major layouts.
- **Soft light flash** only at chapter/topic changes (≤ 1 per 2 minutes).
- No spins or cheesy wipes. A short glitch is allowed only when cutting to a screen.

## 10. Color

- Moody, slightly contrasted A-roll: deep blacks, natural warm skin, no heavy filters.
- Graphics are always brand colors only. Product logos keep their own colors inside their tile.

## 11. Shorts (9:16, recorded separately)

- Same cleanup rules, and a **faster rhythm**: something changes every 1.5–3 s.
- Hook in the first 1.5 s: big callout + punch-in, face on frame one.
- **Platform safe zones** *(i-hate-editing)*: keep all text and key content out of the top ~15% (header), the bottom ~25% (caption, controls), and the right ~15% (like/comment/share). The feed may also crop to 4:5, so keep essentials inside the centre 4:5.
- PiP becomes **stacked**: screen/graphic on top (~50%), speaker as a centred crop on the bottom (~50%), never pushed down to the edge.
- Screen material for Shorts is shown in **mobile layout** (a phone screen recording, or a page captured in a phone-sized viewport), never a squeezed desktop page.
- End with a lime/orange pill CTA or a loopable last line.
