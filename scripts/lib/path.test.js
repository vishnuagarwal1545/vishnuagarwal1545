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
