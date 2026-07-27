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
