# Tech-Stack Snake SVG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate two static, animated SVGs (light/dark) of a GitHub-contribution-graph-style
grid where a snake sweeps across and eats randomly-spawned tech-stack badges, using only SMIL
(no JS, since GitHub strips `<script>`), and embed them in README.md via a theme-switching
`<picture>` element.

**Architecture:** A pure-logic simulation module computes the whole animation timeline
(snake occupancy per cell, badge spawn/eat) from a boustrophedon path over a 53x7 grid. A
separate render module walks that timeline and emits one `<rect>`/`<g>` per cell with
precomputed `<animate>` tags. A thin CLI (`scripts/generate_snake.js`) runs the simulation
once (seeded, so light/dark share identical timing), renders it twice with different
palettes, and writes both SVG files. A GitHub Action re-runs this on a schedule and commits
the output if it changed.

**Tech Stack:** Node.js (built-in `node:test` + `node:assert` for tests, no test framework
dependency), `simple-icons` npm package (icon path data only, inlined at generation time).

## Global Constraints
- No `<script>` in the SVGs — animation is SMIL (`<animate>`) only, computed at generation time.
- Grid: 53 columns x 7 rows (371 cells), cell 11px, gap 2px, `rx=2`.
- Light palette: `#EBEDF0, #9BE9A8, #40C463, #30A14E, #216E39`
- Dark palette: `#161B22, #0E4429, #006D32, #26A641, #39D353`
- Snake color: `#F2B705` (gold/amber), 5 segments, opacity falloff head-to-tail.
- Badge pill background: `#FFF3CD` light / `#2D2200` dark.
- Step duration: 180ms. Total loop: 371 steps x 180ms = 66,780ms, `repeatCount="indefinite"`.
- Icons sourced from `simple-icons` npm devDependency (offline, no CDN fetch at generation time).
- `data/tech-stack.json` content (create verbatim):
  ```json
  [
    { "name": "AWS", "icon": "amazonaws" },
    { "name": "Kubernetes", "icon": "kubernetes" },
    { "name": "Terraform", "icon": "terraform" },
    { "name": "CircleCI", "icon": "circleci" },
    { "name": "Kafka", "icon": "apachekafka" },
    { "name": "Datadog", "icon": "datadog" },
    { "name": "Envoy", "icon": "envoyproxy" }
  ]
  ```

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `data/tech-stack.json`

**Interfaces:**
- Produces: `data/tech-stack.json` — array of `{name: string, icon: string}`, `icon` is a simple-icons slug.

- [ ] **Step 1: Create package.json**

```json
{
  "name": "vishnuagarwal1545-profile",
  "private": true,
  "type": "module",
  "scripts": {
    "generate:snake": "node scripts/generate_snake.js",
    "test": "node --test scripts/lib/*.test.js"
  },
  "devDependencies": {
    "simple-icons": "^13.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: creates `node_modules/` and `package-lock.json`, no errors.

- [ ] **Step 3: Create data/tech-stack.json**

Use the exact content from Global Constraints above.

- [ ] **Step 4: Verify simple-icons exports the slugs we need**

Run:
```bash
node -e "import('simple-icons').then(m => console.log(Object.keys(m).filter(k => /amazonaws|kubernetes|terraform|circleci|apachekafka|datadog|envoyproxy/i.test(k))))"
```
Expected: prints 7 export names like `siAmazonaws`, `siKubernetes`, `siTerraform`,
`siCircleci`, `siApachekafka`, `siDatadog`, `siEnvoyproxy`. If any slug doesn't match, note
the actual exported name — Task 4 depends on this mapping.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json data/tech-stack.json
git commit -m "chore: scaffold snake SVG generator project"
```

---

### Task 2: Path + seeded RNG utilities

**Files:**
- Create: `scripts/lib/path.js`
- Create: `scripts/lib/rng.js`
- Test: `scripts/lib/path.test.js`
- Test: `scripts/lib/rng.test.js`

**Interfaces:**
- Produces: `buildPath(cols, rows) -> number[]` (from `path.js`) — array of length
  `cols*rows`, each entry a cell index (`row*cols+col`), in boustrophedon visit order:
  column 0 top-to-bottom, column 1 bottom-to-top, alternating.
- Produces: `mulberry32(seed: number) -> () => number` (from `rng.js`) — returns a function
  that yields floats in `[0, 1)`, deterministic for a given seed.

- [ ] **Step 1: Write failing tests**

`scripts/lib/path.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPath } from './path.js';

test('buildPath visits every cell exactly once', () => {
  const path = buildPath(53, 7);
  assert.equal(path.length, 53 * 7);
  assert.equal(new Set(path).size, 53 * 7);
});

test('buildPath alternates column direction (boustrophedon)', () => {
  const cols = 3, rows = 4;
  const path = buildPath(cols, rows);
  // column 0: rows 0,1,2,3 top->bottom => cell indices 0,3,6,9
  assert.deepEqual(path.slice(0, rows), [0, 3, 6, 9]);
  // column 1: bottom->top => row 3,2,1,0 => cell indices 3*3+1=10,7,4,1
  assert.deepEqual(path.slice(rows, rows * 2), [10, 7, 4, 1]);
});
```

`scripts/lib/rng.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from './rng.js';

test('same seed produces same sequence', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  const seqA = [a(), a(), a()];
  const seqB = [b(), b(), b()];
  assert.deepEqual(seqA, seqB);
});

test('values stay in [0, 1)', () => {
  const rng = mulberry32(7);
  for (let i = 0; i < 1000; i++) {
    const v = rng();
    assert.ok(v >= 0 && v < 1);
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/lib/path.test.js scripts/lib/rng.test.js`
Expected: FAIL — `path.js` / `rng.js` don't exist yet.

- [ ] **Step 3: Implement path.js**

```js
export function buildPath(cols, rows) {
  const path = [];
  for (let col = 0; col < cols; col++) {
    const topToBottom = col % 2 === 0;
    for (let i = 0; i < rows; i++) {
      const row = topToBottom ? i : rows - 1 - i;
      path.push(row * cols + col);
    }
  }
  return path;
}
```

- [ ] **Step 4: Implement rng.js**

```js
// Mulberry32 — small, fast, seeded PRNG. Deterministic so light/dark renders share one timeline.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test scripts/lib/path.test.js scripts/lib/rng.test.js`
Expected: PASS, all 4 tests green.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/path.js scripts/lib/rng.js scripts/lib/path.test.js scripts/lib/rng.test.js
git commit -m "feat: add boustrophedon path and seeded RNG utilities"
```

---

### Task 3: Simulation (snake + badge timeline)

**Files:**
- Create: `scripts/lib/simulate.js`
- Test: `scripts/lib/simulate.test.js`

**Interfaces:**
- Consumes: `buildPath` from `./path.js`, `mulberry32` from `./rng.js`.
- Produces: `simulate({ path, techStack, seed, snakeLength=5, stepMs=180 }) -> SimResult`
  where:
  ```ts
  type SimResult = {
    stepMs: number,
    totalSteps: number,          // == path.length
    loopMs: number,               // totalSteps * stepMs
    cells: Map<number, CellTimeline>  // keyed by cellIndex (not path index)
  }
  type CellTimeline = {
    cellIndex: number,
    pathIndex: number,
    badge: { tech: {name:string, icon:string}, spawnStep: number, eatStep: number } | null
  }
  ```
  Later tasks (render) derive per-step color purely from `pathIndex` (snake occupancy) and
  `badge.spawnStep`/`badge.eatStep` — no other state needed.

- [ ] **Step 1: Write failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPath } from './path.js';
import { simulate } from './simulate.js';

const techStack = [
  { name: 'AWS', icon: 'amazonaws' },
  { name: 'Kubernetes', icon: 'kubernetes' },
  { name: 'Terraform', icon: 'terraform' },
];

test('simulate covers every cell exactly once', () => {
  const path = buildPath(53, 7);
  const result = simulate({ path, techStack, seed: 1 });
  assert.equal(result.cells.size, path.length);
  assert.equal(result.totalSteps, path.length);
});

test('badges are assigned within valid step range, in path order', () => {
  const path = buildPath(53, 7);
  const result = simulate({ path, techStack, seed: 1 });
  const badgeCells = [...result.cells.values()].filter(c => c.badge);
  assert.ok(badgeCells.length > 0, 'expected at least one badge scheduled');
  for (const cell of badgeCells) {
    assert.ok(cell.badge.spawnStep >= 0);
    assert.ok(cell.badge.spawnStep < cell.badge.eatStep);
    assert.equal(cell.badge.eatStep, cell.pathIndex);
  }
});

test('same seed is deterministic', () => {
  const path = buildPath(53, 7);
  const r1 = simulate({ path, techStack, seed: 5 });
  const r2 = simulate({ path, techStack, seed: 5 });
  const b1 = [...r1.cells.values()].filter(c => c.badge).map(c => c.cellIndex);
  const b2 = [...r2.cells.values()].filter(c => c.badge).map(c => c.cellIndex);
  assert.deepEqual(b1, b2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/simulate.test.js`
Expected: FAIL — `simulate.js` doesn't exist.

- [ ] **Step 3: Implement simulate.js**

```js
import { mulberry32 } from './rng.js';

function shuffle(list, rng) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Assigns each shuffled tech-stack entry to a path index ("eatStep"), with a
// randomized 10-30 step lead-in before it's eaten, spaced so at most ~2 badges
// are ever active at once.
// ponytail: spacing is a heuristic gap, not a strict overlap solver — fine for
// an ambient background animation; tighten if badges visibly stack.
function scheduleBadges(pathLength, techStack, rng) {
  const shuffled = shuffle(techStack, rng);
  const badges = [];
  let cursor = 20 + Math.floor(rng() * 10);
  for (const tech of shuffled) {
    if (cursor >= pathLength) break;
    const lead = 10 + Math.floor(rng() * 21); // 10-30
    const spawnStep = Math.max(0, cursor - lead);
    badges.push({ tech, eatPathIndex: cursor, spawnStep });
    cursor += lead + 15 + Math.floor(rng() * 20);
  }
  return badges;
}

export function simulate({ path, techStack, seed = 1, snakeLength = 5, stepMs = 180 }) {
  const rng = mulberry32(seed);
  const badges = scheduleBadges(path.length, techStack, rng);
  const badgeByPathIndex = new Map(badges.map(b => [b.eatPathIndex, b]));

  const cells = new Map();
  path.forEach((cellIndex, pathIndex) => {
    const scheduled = badgeByPathIndex.get(pathIndex);
    cells.set(cellIndex, {
      cellIndex,
      pathIndex,
      badge: scheduled
        ? { tech: scheduled.tech, spawnStep: scheduled.spawnStep, eatStep: pathIndex }
        : null,
    });
  });

  return {
    stepMs,
    totalSteps: path.length,
    loopMs: path.length * stepMs,
    cells,
    snakeLength,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/simulate.test.js`
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/simulate.js scripts/lib/simulate.test.js
git commit -m "feat: add snake/badge timeline simulation"
```

---

### Task 4: Palette and icon lookup

**Files:**
- Create: `scripts/lib/palette.js`
- Create: `scripts/lib/icons.js`
- Test: `scripts/lib/icons.test.js`

**Interfaces:**
- Produces (`palette.js`): `PALETTES.light` and `PALETTES.dark`, each
  `{ base: string[5], snake: string, badgeBg: string }`.
- Produces (`icons.js`): `getIconPath(slug: string) -> string` (raw SVG path `d` data),
  `iconExists(slug: string) -> boolean`. Use the actual export names confirmed in Task 1
  Step 4 (e.g. `siAmazonaws.path`) — map `icon` slugs from `tech-stack.json` (`amazonaws`,
  `kubernetes`, ...) to `simple-icons` export names (`siAmazonaws`, `siKubernetes`, ...) via
  `si` + PascalCase.

- [ ] **Step 1: Implement palette.js**

```js
export const PALETTES = {
  light: {
    base: ['#EBEDF0', '#9BE9A8', '#40C463', '#30A14E', '#216E39'],
    snake: '#F2B705',
    badgeBg: '#FFF3CD',
  },
  dark: {
    base: ['#161B22', '#0E4429', '#006D32', '#26A641', '#39D353'],
    snake: '#F2B705',
    badgeBg: '#2D2200',
  },
};
```

- [ ] **Step 2: Write failing test for icons.js**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getIconPath, iconExists } from './icons.js';

test('resolves known slugs to path data', () => {
  for (const slug of ['amazonaws', 'kubernetes', 'terraform', 'circleci', 'apachekafka', 'datadog', 'envoyproxy']) {
    assert.ok(iconExists(slug), `expected slug to resolve: ${slug}`);
    const path = getIconPath(slug);
    assert.equal(typeof path, 'string');
    assert.ok(path.length > 10);
  }
});

test('unknown slug is reported, not thrown at import time', () => {
  assert.equal(iconExists('not-a-real-icon'), false);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test scripts/lib/icons.test.js`
Expected: FAIL — `icons.js` doesn't exist.

- [ ] **Step 4: Implement icons.js**

```js
import * as simpleIcons from 'simple-icons';

function toExportName(slug) {
  return 'si' + slug.charAt(0).toUpperCase() + slug.slice(1);
}

export function iconExists(slug) {
  return typeof simpleIcons[toExportName(slug)]?.path === 'string';
}

export function getIconPath(slug) {
  const icon = simpleIcons[toExportName(slug)];
  if (!icon) throw new Error(`Unknown simple-icons slug: ${slug}`);
  return icon.path;
}
```

If Task 1 Step 4 showed different export naming (e.g. slugs needing exact-case
lookup via `simpleIcons.get(slug)` in the installed version), adjust `toExportName`
accordingly before proceeding — the test in Step 2 is the source of truth.

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test scripts/lib/icons.test.js`
Expected: PASS, both tests green. If a slug fails to resolve, fix the mapping — do not
skip it, all 7 tech-stack icons must resolve.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/palette.js scripts/lib/icons.js scripts/lib/icons.test.js
git commit -m "feat: add color palettes and simple-icons lookup"
```

---

### Task 5: SVG renderer

**Files:**
- Create: `scripts/lib/render.js`
- Test: `scripts/lib/render.test.js`

**Interfaces:**
- Consumes: `SimResult` from Task 3, palette object `{base, snake, badgeBg}` from Task 4,
  `getIconPath` from `./icons.js`.
- Produces: `renderSvg(simResult, palette, gridConfig) -> string` (full SVG document as
  text). `gridConfig = { cols: 53, rows: 7, cell: 11, gap: 2 }`.

- [ ] **Step 1: Write failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPath } from './path.js';
import { simulate } from './simulate.js';
import { renderSvg } from './render.js';
import { PALETTES } from './palette.js';

const techStack = [{ name: 'AWS', icon: 'amazonaws' }];
const gridConfig = { cols: 53, rows: 7, cell: 11, gap: 2 };

test('renders a well-formed SVG with one rect per cell', () => {
  const path = buildPath(gridConfig.cols, gridConfig.rows);
  const sim = simulate({ path, techStack, seed: 1 });
  const svg = renderSvg(sim, PALETTES.light, gridConfig);
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('</svg>'));
  assert.ok(!svg.includes('<script'));
  const rectCount = (svg.match(/<rect/g) || []).length;
  assert.equal(rectCount, gridConfig.cols * gridConfig.rows);
});

test('includes repeatCount indefinite animate blocks', () => {
  const path = buildPath(gridConfig.cols, gridConfig.rows);
  const sim = simulate({ path, techStack, seed: 1 });
  const svg = renderSvg(sim, PALETTES.dark, gridConfig);
  assert.ok(svg.includes('repeatCount="indefinite"'));
  assert.ok(svg.includes(`dur="${sim.loopMs}ms"`));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/render.test.js`
Expected: FAIL — `render.js` doesn't exist.

- [ ] **Step 3: Implement render.js**

```js
import { getIconPath } from './icons.js';

function fmt(n) {
  return Number(n.toFixed(4));
}

// Builds the fill-color keyframe list for one cell across the full loop.
// Snake occupancy is derived purely from pathIndex (head at step==pathIndex,
// body trailing 1..snakeLength-1 steps after). Badge state (if any) takes
// priority before the snake arrives.
function buildFillTimeline(cell, sim, palette, baseColor) {
  const { totalSteps, snakeLength } = sim;
  const { pathIndex, badge } = cell;
  const entries = [{ step: 0, color: baseColor }];

  const push = (step, color) => {
    if (step < 0 || step >= totalSteps) return;
    const last = entries[entries.length - 1];
    if (last.step === step) { last.color = color; return; }
    if (last.color !== color) entries.push({ step, color });
  };

  if (badge) push(badge.spawnStep, palette.badgeBg);
  push(pathIndex, palette.snake);
  for (let i = 1; i < snakeLength; i++) {
    push(pathIndex + i, palette.snake); // color stays snake; opacity handles falloff on head cell only
  }
  push(pathIndex + snakeLength, baseColor);

  return entries;
}

function toAnimate(entries, totalSteps, loopMs) {
  const keyTimes = entries.map(e => fmt(e.step / totalSteps));
  const values = entries.map(e => e.color);
  if (keyTimes[0] !== 0) { keyTimes.unshift(0); values.unshift(values[0]); }
  keyTimes.push(1);
  values.push(values[0]); // loop seam: end value matches start value
  return `<animate attributeName="fill" dur="${loopMs}ms" repeatCount="indefinite" ` +
    `keyTimes="${keyTimes.join(';')}" values="${values.join(';')}" calcMode="discrete" />`;
}

function renderBadgeGroup(cell, palette, cellSize) {
  if (!cell.badge) return '';
  const { spawnStep, eatStep, tech } = cell.badge;
  const iconPath = getIconPath(tech.icon);
  const r = cellSize / 2;
  return `<g opacity="0">
    <animate attributeName="opacity" attributeType="XML"
      keyTimes="0;${fmt(spawnStep)};${fmt(spawnStep + 0.001)};${fmt(eatStep - 0.001)};${fmt(eatStep)};1"
      values="0;0;1;1;0;0" calcMode="discrete" dur="1" begin="0s" fill="freeze"
      restart="never" />
    <circle cx="${r}" cy="${r}" r="${r}" fill="${palette.badgeBg}" />
    <g transform="translate(${r * 0.3}, ${r * 0.3}) scale(${(cellSize * 0.4) / 24})">
      <path d="${iconPath}" fill="currentColor" />
    </g>
  </g>`;
}

export function renderSvg(sim, palette, gridConfig) {
  const { cols, rows, cell, gap } = gridConfig;
  const width = cols * (cell + gap) - gap;
  const height = rows * (cell + gap) - gap;

  const rects = [];
  for (const [cellIndex, cellData] of sim.cells) {
    const row = Math.floor(cellIndex / cols);
    const col = cellIndex % cols;
    const x = col * (cell + gap);
    const y = row * (cell + gap);
    const baseColorIdx = cellIndex % palette.base.length; // deterministic, not random — see Task 5 self-review note
    const baseColor = palette.base[baseColorIdx];
    const timeline = buildFillTimeline(cellData, sim, palette, baseColor);
    const animate = toAnimate(timeline, sim.totalSteps, sim.loopMs);

    rects.push(`<g transform="translate(${x},${y})">
      <rect width="${cell}" height="${cell}" rx="2" fill="${baseColor}">${animate}</rect>
      ${renderBadgeGroup(cellData, palette, cell)}
    </g>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
${rects.join('\n')}
</svg>`;
}
```

**Note for implementer:** the badge fill/opacity animate above uses `dur="1"` with
`fill="freeze"` as a workaround to express a one-shot keyTimes curve inside a `dur`-based
element without it looping — verify visually in Task 6 that badges actually show/hide at
the right steps; if `calcMode="discrete"` with a 1-second dummy duration doesn't sync to
the outer loop correctly, switch this block to `<animate ... dur="{loopMs}ms" repeatCount="indefinite">`
with keyTimes scaled the same way as `toAnimate` (same pattern, badge-specific values) —
simpler and consistent with the cell fill animation, prefer that if the dummy-duration
version misbehaves.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/render.test.js`
Expected: PASS, both tests green.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/render.js scripts/lib/render.test.js
git commit -m "feat: add SVG renderer with SMIL animation output"
```

---

### Task 6: CLI generator + visual verification

**Files:**
- Create: `scripts/generate_snake.js`

**Interfaces:**
- Consumes: `buildPath` (`path.js`), `simulate` (`simulate.js`), `renderSvg` (`render.js`),
  `PALETTES` (`palette.js`), `data/tech-stack.json`.
- Produces: `assets/tech-snake-light.svg`, `assets/tech-snake-dark.svg` on disk.

- [ ] **Step 1: Implement generate_snake.js**

```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { buildPath } from './lib/path.js';
import { simulate } from './lib/simulate.js';
import { renderSvg } from './lib/render.js';
import { PALETTES } from './lib/palette.js';

const GRID = { cols: 53, rows: 7, cell: 11, gap: 2 };
const SEED = 20260727; // fixed: rerolls only when this file is edited, keeps diffs reviewable across CI runs if desired otherwise randomize

const techStack = JSON.parse(readFileSync(new URL('../data/tech-stack.json', import.meta.url)));

const path = buildPath(GRID.cols, GRID.rows);
const sim = simulate({ path, techStack, seed: SEED });

// ponytail self-check: cheapest guard against a silently broken timeline.
assert.equal(sim.cells.size, GRID.cols * GRID.rows, 'every cell must appear exactly once');
const badgeCount = [...sim.cells.values()].filter(c => c.badge).length;
assert.ok(badgeCount > 0 && badgeCount <= techStack.length, 'badge count must be within tech-stack size');

mkdirSync(new URL('../assets/', import.meta.url), { recursive: true });

for (const [themeName, palette] of Object.entries(PALETTES)) {
  const svg = renderSvg(sim, palette, GRID);
  writeFileSync(new URL(`../assets/tech-snake-${themeName}.svg`, import.meta.url), svg);
  console.log(`wrote assets/tech-snake-${themeName}.svg (${svg.length} bytes)`);
}
```

- [ ] **Step 2: Run the generator**

Run: `npm run generate:snake`
Expected: prints two "wrote ..." lines, no errors, `assets/tech-snake-light.svg` and
`assets/tech-snake-dark.svg` exist.

- [ ] **Step 3: Visual verification (manual, required — no automated test for animation correctness)**

Open both files directly in a browser (`open assets/tech-snake-light.svg` on macOS).
Confirm:
- Grid renders as a 53x7 block of rounded cells in the right palette.
- Watching for ~15-20s, a gold cell (or short trailing gold cluster) sweeps down column 0,
  then up column 1, etc. — snake motion is visible.
- At least one badge (colored pill with a tech icon) appears ahead of the snake and
  disappears when the snake reaches it.
- No visible flash/glitch at the loop seam is required — a brief mismatch is acceptable per
  the design's accepted seam trade-off, but confirm it isn't jarring.

If badges don't appear/disappear correctly, apply the fallback described in Task 5 Step 3's
implementer note (switch badge animation to the same `dur`+`repeatCount="indefinite"`
pattern as cell fill), re-run Step 2, and re-check here.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate_snake.js assets/tech-snake-light.svg assets/tech-snake-dark.svg
git commit -m "feat: add snake SVG generator CLI and initial generated assets"
```

---

### Task 7: README integration

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: `assets/tech-snake-light.svg`, `assets/tech-snake-dark.svg` from Task 6 (paths
  must already exist).

- [ ] **Step 1: Insert the picture block**

Add this block to `README.md`, directly below the `# 💻 Tech Stack:` badges line (after the
existing shields.io badge row, before `# 📊 GitHub Stats:`):

```markdown
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/tech-snake-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/tech-snake-light.svg">
  <img alt="tech stack snake" src="assets/tech-snake-light.svg">
</picture>
```

- [ ] **Step 2: Verify rendering**

Run: `open README.md` or preview in the IDE's markdown preview. Confirm the `<img>`
fallback loads the light SVG (GitHub's own dark/light `<picture>` switch can't be tested
locally without GitHub rendering — that's covered when pushed).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "feat: embed animated tech-stack snake in README"
```

---

### Task 8: GitHub Action to regenerate on schedule

**Files:**
- Create: `.github/workflows/snake.yml`

**Interfaces:**
- Consumes: `npm run generate:snake` (Task 6), `data/tech-stack.json`.
- Produces: scheduled/manual workflow that commits regenerated `assets/*.svg` on change.

- [ ] **Step 1: Write the workflow**

```yaml
name: Regenerate tech-stack snake

on:
  schedule:
    - cron: '0 3 * * *'
  workflow_dispatch: {}

permissions:
  contents: write

jobs:
  regenerate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - run: npm run generate:snake

      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: 'chore: regenerate tech-stack snake SVGs'
          file_pattern: 'assets/*.svg'
```

- [ ] **Step 2: Validate workflow syntax**

Run: `npx --yes action-validator .github/workflows/snake.yml 2>/dev/null || python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/snake.yml'))" `
Expected: no syntax errors. (First command may not be available offline — the Python
YAML-parse fallback just confirms it's valid YAML; GitHub validates the schema on push.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/snake.yml
git commit -m "ci: add scheduled workflow to regenerate tech-stack snake SVGs"
```

**Note:** this workflow will only take effect once pushed to GitHub — do not push without
explicit user confirmation, per repo interaction norms.

---

## Plan Self-Review Notes

- **Spec coverage:** grid spec (Task 5/6), snake path + rendering (Task 2, 5), badge
  spawn/eat (Task 3, 5), theme support (Task 4, 7), timing (Task 3/6 SEED+stepMs), repo
  layout (all tasks), GitHub Action (Task 8) — all covered.
- **Deferred/open items carried over from spec, resolved during brainstorming:** grid size
  (53x7, full width), language (Node.js), badge order (random, no text) — see design doc.
- **Known simplification:** base cell color is derived deterministically from `cellIndex %
  palette.length` rather than independently randomized per cell (Task 5) — avoids a second
  RNG stream desyncing light/dark; visually still reads as a mixed-shade contribution
  graph. Flagged inline with a code comment in Task 5, not a blocking gap.
