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

test('badge animate block has correct loop-scaled animation', () => {
  const path = buildPath(gridConfig.cols, gridConfig.rows);
  const sim = simulate({ path, techStack, seed: 1 });
  const svg = renderSvg(sim, PALETTES.light, gridConfig);
  // Verify badge animation has opacity attribute
  const hasOpacityAnimate = svg.includes('attributeName="opacity"');
  assert.ok(hasOpacityAnimate, 'badge should have opacity animation');
  // Verify badge animation uses indefinite repeat
  const hasIndefiniteRepeat = svg.includes('repeatCount="indefinite"');
  assert.ok(hasIndefiniteRepeat, 'badge animation should use indefinite repeat');
  // Verify dur matches loopMs (e.g., dur="66780ms")
  const loopMsPattern = new RegExp(`dur="${sim.loopMs}ms"`);
  assert.ok(loopMsPattern.test(svg), `badge animation should have dur="${sim.loopMs}ms"`);
  // Verify keyTimes are normalized to [0,1] range
  assert.ok(svg.includes('keyTimes="0;'), 'keyTimes should start at 0');
  assert.ok(/keyTimes="[^"]*;1"/.test(svg), 'keyTimes should end at 1');
  // Verify badge icon uses explicit palette color, not currentColor (invisible in standalone SVG)
  assert.ok(svg.includes(`fill="${PALETTES.light.iconFg}"`), 'badge icon should use palette iconFg color');
  assert.ok(!svg.includes('currentColor'), 'badge icon should not use currentColor');
});
