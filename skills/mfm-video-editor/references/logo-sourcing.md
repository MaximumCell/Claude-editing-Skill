# Logo sourcing

## Our own brand
Only use files from `<studio>/brand/logos/`. Never download, redraw, or recolor the Aaghaz logo. See `brand.md` for the rules.

## Third-party logos (companies, products, tools)
When the speaker mentions a product (OpenAI, Claude, n8n, Google, Notion...), show its logo.

1. **Cache first**: `<studio>/logos-cache/<slug>.(svg|png)` (e.g. `openai.svg`). Reuse it if present.
2. **Simple Icons** (single-color SVGs of many brands): `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/<slug>.svg`. Recolor the fill to white or black to fit the background.
3. **Official press/brand kit** of the company (search "<company> brand assets" / "press kit"). This is the best source for full-color logos.
4. **Wikimedia Commons** SVG of the logo (search "<company> logo svg site:commons.wikimedia.org").

Rules:
- Prefer SVG, then PNG with a transparent background (≥ 512 px). No JPGs with white boxes, no watermarked images, no logos from random wallpaper sites.
- Don't alter the logo's shape or proportions. Recoloring to single white/black is fine for monochrome versions.
- Save new downloads to `logos-cache/` with a lowercase slug filename, and add a line to `logos-cache/SOURCES.md` (`slug | url | date`).
- Show logos in a rounded tile (white or dark card), never placed raw on top of busy footage.
