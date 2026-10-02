# Sound design rules

Sound design is part of the style, not an afterthought: **every visual movement gets a sound**, and the voice always wins.

## Sources

- **Epidemic Sound** downloads live in `<studio>/sfx/` and `<studio>/music/`.
- Expected sub-folders (create them if missing, and tell the user what's empty):
  ```
  sfx/whoosh/  sfx/pop/  sfx/click/  sfx/hit/  sfx/riser/  sfx/ding/  sfx/typing/  sfx/cash/
  music/calm/  music/upbeat/  music/serious/  music/tech/
  ```
- Pick files by folder + filename. Rotate through the files in a folder so the same sound doesn't repeat back to back.
- If a needed category is empty, skip that sound and list it in the edit report. Never download SFX from random sites.

## SFX mapping

| Visual event | SFX | Level (relative to voice) |
|---|---|---|
| Whip/slide transition, layout switch into a full graphic | whoosh | −14 dB |
| Callout / bullet / icon / pill appears | pop or soft click | −18 dB |
| Big headline reveal, key number lands, punchline snap-zoom | hit (sub-bass thud) | −12 dB |
| Count-up running | soft ticking, or nothing | −22 dB |
| UI panel / screen window enters | soft whoosh or click | −18 dB |
| Money / revenue numbers | cash register or coin (rarely, max 1 per minute) | −16 dB |
| Build-up before a reveal | riser (ending exactly on the reveal frame) | −16 dB |
| Positive result / checkmark | ding | −18 dB |

- Align each SFX to the **frame the visual starts moving** (whoosh: start 2–3 frames before the cut).
- Normal punch-ins (hard cuts) get **no** SFX; only snap-zooms get a hit.
- Max ~1 SFX per second on average. When events cluster, keep the most important one.

## Music

- One continuous low **bed** under the whole video: lo-fi / ambient tech by default (`music/tech/` or `music/calm/`).
- Change the track at major chapter changes or mood shifts (serious story → `music/serious/`, wins/results → `music/upbeat/`). Crossfade over 1–2 s, landing on a cut.
- Level: about **−20 dB under the voice** (duck while speaking); can rise to −12 dB in pauses or B-roll-only moments.
- Drop the music out entirely (0.5–1 s) right before a big statement for impact, then bring it back.
- Hook: music starts at frame 0 or right after the first line.

## Mix

- The voice (`mic.wav`) is the master audio. Normalize it to about −14 LUFS integrated for YouTube.
- The camera's own audio and screen-recording audio are **muted**; they're only used for sync.
- Fade every SFX and music edge by at least 2 frames to avoid clicks.
