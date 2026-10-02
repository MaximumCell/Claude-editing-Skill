# B-roll sourcing

Try these sources in order. Stop at the first one that gives material that truly matches the sentence. Don't generate what already exists. **Never ship a placeholder or a fake**: a missing shot costs a few seconds, a fabricated one costs trust.

## 0. Real proof (always first)
When the speaker names a real repo, website, product page, tweet, dashboard, or number, **show that exact thing** *(i-hate-editing)*. It's the highest-value B-roll there is, and it makes the video feel researched.
- First check the session's own `screens/` recordings: the speaker may have recorded it already.
- Otherwise capture the real page as a **still** (not a screen recording) and animate it yourself: a scroll, a held zoom onto the exact words, one marker highlight. A still stays re-editable when the cut changes.
  - One-time install: `npx -y playwright@latest install chromium`
  - Long-form: `npx -y playwright@latest screenshot --full-page --viewport-size=1920,1080 <url> <videoDir>/work/assets/proof-<name>.png`
  - Shorts: capture in a real phone layout, never a squeezed desktop page: `npx -y playwright@latest screenshot --full-page --device="iPhone 13" <url> <file>`
- Not knowing the URL isn't a reason to skip it: search for it. If the thing genuinely isn't public, say so in the report and use another source.
- **Never fabricate.** Don't mock up anything that looks like a screenshot of something real, don't retype a statistic into a card as if it were the source, and never reuse a capture of a *different* subject because it looks similar.
- Look at the capture before building on it: the target text must actually be visible and legible at the zoom you plan.
- Log the URL and capture time in `out/sources.md`.

## 1. User's library
- `<videoDir>/broll/` first (made for this video), then `<studio>/broll/`.
- Match by filename and folder names (e.g. `broll/office/typing-laptop.mp4`). If folders hold a `tags.txt` or `index.json`, use it.
- Prefer clips the user shot; they're on-brand by default.

## 2. Fair-use YouTube clips (yt-dlp)
For real events, launches, interviews, and news the speaker references.
- Find the source (official channel first: company keynotes, official product demos, news outlets).
- Download **only the needed section**:
  `yt-dlp --download-sections "*00:01:12-00:01:17" -f "bv*[height<=1080]+ba/b" --merge-output-format mp4 -o "<videoDir>/work/assets/clip-%(id)s-%(section_start)s.%(ext)s" <url>`
- **Screens and events only, never another creator's face** *(i-hate-editing)*. A creator's face is their signature, and it reads as a stolen clip the moment it appears. Keynote stages, product UI, and news footage of the event itself are fine. Check frames from the **start, middle, and end** of every clip you cut, because people usually walk into frame in the last frames, where a single spot check misses them.
- Crop out watermarks and channel handles.
- Keep each clip **≤ 5 s**, use it alongside commentary (never as a standalone segment), and mute or duck its audio under the voice unless the clip's audio *is* the point (≤ 3 s).
- Log each one in `out/sources.md`: URL, channel, timestamp range, and where it appears in the final video.
- Whether the use counts as fair use is the user's call. Flag anything long or risky in the edit report.

## 3. Remotion animation
For abstract ideas, or when no real footage fits: build it with the explainer-graphic vocabulary in `style-rules.md` §6. It must be concrete: it should show what *this* sentence says.

## 4. AI image + motion
Only for a specific scene that nothing above covers (e.g. "a founder working late in Karachi"). Never use it to avoid looking something up.
- Generate with the team's AI image service (key `AI_IMAGE_API_KEY` in `<studio>/.env`; the provider is still to be decided, so ask the user if it isn't configured).
- **Prompt the literal thing in the line, and write the whole prompt** *(i-hate-editing)*: a short prompt returns a stock-photo cliché. In this order: subject, setting, camera (lens, aperture, height), lighting with direction and colour temperature, composition (including which parts of the frame stay empty for graphics), mood, then a ban list (no text, no logos, no UI, no watermark).
- 16:9 (or 9:16 for Shorts), photoreal and moody, matching the brand palette lightly.
- It must never look like a screenshot or photo of something real. Reject any output with garbled text or a watermark.
- Animate with a slow Ken-Burns zoom/pan (100 → 110% over the clip). Save to `work/assets/`, and log the prompt in `out/sources.md`.
