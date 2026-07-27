import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { buildPath } from './lib/path.js';
import { simulate } from './lib/simulate.js';
import { renderSvg } from './lib/render.js';
import { PALETTES } from './lib/palette.js';
import { fetchContributionWeeks, levelsFromWeeks } from './lib/contributions.js';

const LOGIN = process.env.SNAKE_GITHUB_LOGIN ?? 'vishnuagarwal1545';
const TOKEN = process.env.PROFILE_GH_TOKEN ?? process.env.GITHUB_TOKEN;
const SEED = Number(process.env.SNAKE_SEED ?? Date.now() % 2 ** 31);

if (!TOKEN) {
  throw new Error('Set GITHUB_TOKEN (or PROFILE_GH_TOKEN) to fetch real contribution data.');
}

const techStack = JSON.parse(readFileSync(new URL('../data/tech-stack.json', import.meta.url)));

const weeks = await fetchContributionWeeks(LOGIN, TOKEN);
const { cols, rows, levels, monthLabels } = levelsFromWeeks(weeks);
const GRID = { cols, rows, cell: 20, gap: 4 };

const path = buildPath(GRID.cols, GRID.rows, SEED);
const sim = simulate({ path, techStack, seed: SEED, levels });

// ponytail self-check: cheapest guard against a silently broken timeline.
assert.equal(sim.cells.size, GRID.cols * GRID.rows, 'every cell must appear exactly once');
const badgeCount = [...sim.cells.values()].filter(c => c.badge).length;
assert.ok(badgeCount > 0 && badgeCount <= techStack.length, 'badge count must be within tech-stack size');

mkdirSync(new URL('../assets/', import.meta.url), { recursive: true });

for (const [themeName, palette] of Object.entries(PALETTES)) {
  const svg = renderSvg(sim, palette, GRID, monthLabels);
  writeFileSync(new URL(`../assets/tech-snake-${themeName}.svg`, import.meta.url), svg);
  console.log(`wrote assets/tech-snake-${themeName}.svg (${svg.length} bytes)`);
}
