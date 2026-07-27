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
