import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levelsFromWeeks } from './contributions.js';

function makeWeek(counts) {
  return { contributionDays: counts.map((contributionCount, weekday) => ({ contributionCount, weekday })) };
}

test('maps weeks/days into row-major cellIndex order', () => {
  const weeks = [makeWeek([0, 1, 0, 0, 0, 0, 0]), makeWeek([0, 0, 4, 0, 0, 0, 0])];
  const { cols, rows, levels } = levelsFromWeeks(weeks);
  assert.equal(cols, 2);
  assert.equal(rows, 7);
  assert.equal(levels.length, 14);
  // weekday 1, col 0 -> cellIndex = 1*2+0 = 2
  assert.ok(levels[2] > 0);
  // weekday 2, col 1 (max count) -> cellIndex = 2*2+1 = 5, should be top level
  assert.equal(levels[5], 4);
});

test('all-zero calendar produces all level-0 cells', () => {
  const weeks = [makeWeek([0, 0, 0, 0, 0, 0, 0])];
  const { levels } = levelsFromWeeks(weeks);
  assert.ok(levels.every(l => l === 0));
});
