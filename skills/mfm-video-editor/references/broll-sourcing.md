# B-roll sourcing

Try these sources in order. Stop at the first one that gives a clip that truly matches the sentence.

## 1. User's library
- `<videoDir>/broll/` first (made for this video), then `<studio>/broll/`.
- Match by filename and folder names (e.g. `broll/office/typing-laptop.mp4`). If folders hold a `tags.txt` or `index.json`, use it.
- Prefer clips the user shot; they're on-brand by default.

## 2. Fair-use YouTube clips (yt-dlp)
For real events, launches, interviews, and news the speaker references.
- Find the source (official channel first: company keynotes, official product demos, news outlets).
- Download **only the needed section**:
  `yt-dlp --download-sections "*00:01:12-00:01:17" -f "bv*[height<=1080]+ba/b" --merge-output-format mp4 -o "<videoDir>/work/assets/clip-%(id)s-%(section_start)s.%(ext)s" <url>`
- Keep each clip **≤ 5 s**, use it alongside commentary (never as a standalone segment), and mute or duck its audio under the voice unless the clip's audio *is* the point (≤ 3 s).
- Log each one in `out/sources.md`: URL, channel, timestamp range, and where it appears in the final video.
- Whether the use counts as fair use is the user's call. Flag anything long or risky in the edit report.

## 3. Remotion animation
For abstract ideas, or when no real footage fits: build it with the explainer-graphic vocabulary in `style-rules.md` §6.

## 4. AI image + motion
For a specific scene that no footage covers (e.g. "a founder working late in Karachi").
- Generate with the team's AI image service (key `AI_IMAGE_API_KEY` in `<studio>/.env`; the provider is still to be decided, so ask the user if it isn't configured).
- 16:9 (or 9:16 for Shorts), photoreal and moody, matching the brand palette lightly. No text in the image.
- Animate with a slow Ken-Burns zoom/pan (100 → 110% over the clip). Save to `work/assets/`, and log the prompt in `out/sources.md`.
