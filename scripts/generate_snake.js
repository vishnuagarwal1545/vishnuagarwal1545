import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { buildPath } from './lib/path.js';
import { simulate } from './lib/simulate.js';
import { renderSvg } from './lib/render.js';
import { PALETTES } from './lib/palette.js';

const GRID = { cols: 53, rows: 7, cell: 11, gap: 2 };
const SEED = Number(process.env.SNAKE_SEED ?? Date.now() % 2 ** 31);

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
