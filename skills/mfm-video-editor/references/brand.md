# Brand: Aaghaz / Make First Million

Source: *Aaghaz Guideline* PDF. Aaghaz is "Asia's First AI Startup Institute". Tagline: **BE AN OUTLINER**.
The channel teaches practical AI, automation, and building AI startups, so graphics should feel modern, technical, and confident.

## Colors

| Token | Hex | Use in video |
|---|---|---|
| `green` | `#62c41f` | Primary accent, icons, positive metrics (↑) |
| `darkGreen` | `#005924` | Headings on light cards; radial glow on dark backgrounds |
| `lime` | `#c3ff00` | Keyword highlight, callout pills, active/selected states, progress |
| `orange` | `#ff7d00` | CTAs ("Link in description", "Enroll now"), contrast words, warnings/negative (↓) |
| `black` | `#000000` | Default background for full-screen graphics |
| `lightGreen` | `#f2fff2` | Light card surface |
| `limeBeige` | `#fdfff2` | Light card / slide background |
| `orangeBeige` | `#fff9f4` | Light card variant |

Text: white `#FFFFFF` on dark, `#000000` or `darkGreen` on light. Secondary text on dark: white at 65% opacity.

**Graphic look = Mix.** Mostly dark: black background with a soft dark-green radial glow (`darkGreen` at the center fading to black), lime highlights, white text. Use **light cards** (limeBeige / lightGreen, black text, lime shapes) for comparisons, checklists, and step lists, where contrast against the dark A-roll helps. Don't put two light full-screen graphics back to back.

Gradients and glows are allowed on backgrounds and shapes, **never on the logo**.

## Typography

| Role | Font | Weights |
|---|---|---|
| Headings, callouts, numbers | **Poppins** | SemiBold 600, Bold 700, ExtraBold 800 |
| Body, UI labels, lists | **Google Sans** | Regular 400, Medium 500, SemiBold 600 |
| Accent: quotes, one emphasized phrase | Brand accent serif (files in `brand/fonts/`) | Regular, Medium |

- Load fonts from `<studio>/brand/fonts/`. If a font file is missing, stop and tell the user. Don't silently substitute.
- Accent serif: at most one element on screen at a time, used sparingly.
- Headlines are Title Case or Sentence case; ALL CAPS only for short labels, acronyms (AI, GPT, API), and pills.
- Pattern from the brand's social posts: a two-line headline where line 2 is the key phrase in **lime** (on dark) or **black with a thick underline bar** (on light).

## Logo

- Files live in `<studio>/brand/logos/`. Use only those; never redraw or recolor the logo.
- Parts: the icon (stacked slanted bars), the "Aaghaz" wordmark, and the "BE AN OUTLINER" tagline.
- Approved combinations: black/white/green logo on lime, green, dark green, white, or black backgrounds. Pick the file that matches the background.
- Clear space around the logo is at least the logo's height. No effects, shadows, gradients, rotation, or stretching.
- In videos: small icon or logo top-left during the intro and CTA cards; not on every graphic.

## Icons

- Solid-fill icons inside a **circle**: lime circle with a black icon, or black circle with a lime icon.
- Keep icon sets consistent within one graphic (the same style and size).
- Third-party product logos (OpenAI, Claude, Google...) are allowed as-is. See `logo-sourcing.md`.

## Shapes & components

- Rounded corners everywhere: cards 20–28px, pills fully rounded.
- Social-post style: rounded **black cards** containing an app icon + short label; a lime or orange **pill** CTA.
- Thin 1–2px borders at white 15% on dark cards; soft shadows only.
