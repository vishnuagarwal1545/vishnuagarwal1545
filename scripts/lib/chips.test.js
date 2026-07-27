import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutChips, renderStackSvg } from './chips.js';

const tech = [
  { name: 'AWS', slug: 'amazonaws', color: '#FF9900', textColor: '#fff' },
  { name: 'Kubernetes', slug: 'kubernetes', color: '#326CE5', textColor: '#fff' },
  { name: 'Terraform', slug: 'terraform', color: '#5835CC', textColor: '#fff' },
];

test('layoutChips places every chip and wraps within maxWidth', () => {
  const { chips, width } = layoutChips(tech, { maxWidth: 200 });
  assert.equal(chips.length, tech.length);
  for (const chip of chips) {
    assert.ok(chip.x + chip.width <= width + 0.01);
  }
});

test('layoutChips keeps everything on one row when it fits', () => {
  const { chips } = layoutChips(tech, { maxWidth: 2000 });
  assert.ok(chips.every(c => c.y === 0));
});

test('renderStackSvg produces one pill rect per chip, no script tags', () => {
  const svg = renderStackSvg(tech, { bg: '#111', border: '#222', text: '#fff' }, { maxWidth: 2000 });
  assert.ok(svg.startsWith('<svg'));
  assert.ok(!svg.includes('<script'));
  const rectCount = (svg.match(/<rect/g) || []).length;
  assert.equal(rectCount, tech.length);
});
