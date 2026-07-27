# Tech-stack snake SVG — design

## Goal
Animated contribution-graph-style SVG for README: snake eats tech-stack badges as it
sweeps the grid. Pure SMIL, no JS (GitHub strips `<script>`). Light + dark variants.

## Decisions
- Grid: 53 cols x 7 rows (371 cells), full contribution-graph width. Cell 11px, gap 2px, `rx=2`.
- Palette: GitHub's real light/dark contribution-graph colors (as given in spec).
- Generator language: Node.js.
- Icons: `simple-icons` npm devDependency, path data inlined at generation time (no CDN fetch, no runtime network).
- Badge order: fully random per loop, reshuffled. No on-image text/counter.
- Loop timing: 150-200ms/step x 371 steps ≈ 67s/loop. Accepted as ambient background.
- CI commit: `stefanzweifel/git-auto-commit-action`, scoped to `assets/*.svg`.

## Architecture
1. **Simulation** (`scripts/generate_snake.js`, pure logic, no SVG):
   - Boustrophedon path: col 0 top-bottom, col 1 bottom-top, alternating -> ordered array of 371 cell indices.
   - Snake state per step: head index + 5 trailing body segments, opacity falloff tail-ward.
   - Badge scheduler: 1-2 active badges at all times, each pinned to a path index 10-30 steps
     ahead of current head, drawn from a shuffled-per-loop copy of `data/tech-stack.json`;
     marked eaten when head reaches that index. Cycles the full list once per loop.
   - Seeded RNG so light/dark runs produce identical timelines (same seed).
   - Output: per-cell event list `{cellIndex, events: [{type: base|snake|badge|eaten, atStep}]}`.

2. **Render**: walk cells, emit one `<rect>` per cell. Cell fill is itself the animated
   channel — snake occupancy = fill color change on that cell (no separate moving shape,
   avoids transform math in SMIL). `<animate attributeName="fill" values=... keyTimes=...
   dur={loopMs} repeatCount="indefinite">` per cell, offsets computed from step index x
   step duration. Badge cells get an extra `<g>` (pill bg + inlined icon path) opacity-
   animated in at spawn, out at eat.

3. Run generator twice (light palette, dark palette) -> `assets/tech-snake-light.svg`,
   `assets/tech-snake-dark.svg`.

4. README embeds via `<picture>` block (already specified) switching on
   `prefers-color-scheme`.

## Files
```
scripts/generate_snake.js
data/tech-stack.json
assets/tech-snake-light.svg
assets/tech-snake-dark.svg
.github/workflows/snake.yml
README.md   (picture block added)
package.json / package-lock.json  (simple-icons devDependency)
```

## CI
`.github/workflows/snake.yml`: cron daily + `workflow_dispatch` -> checkout -> `npm ci`
-> `node scripts/generate_snake.js` -> `stefanzweifel/git-auto-commit-action` (scoped to
`assets/*.svg`).

## Testing
Open both SVGs directly in browser; toggle OS theme to confirm `<picture>` swap works.
No automated test framework needed — this is a static-generation script, verification is
visual + a self-check asserting the simulation produces exactly 371 cell events with a
valid badge-eat sequence (one `ponytail`-style `assert`-based check in the generator, no
separate test file).
