import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPath } from './path.js';

function assertAdjacent(a, b, cols) {
  const rowA = Math.floor(a / cols), colA = a % cols;
  const rowB = Math.floor(b / cols), colB = b % cols;
  const dist = Math.abs(rowA - rowB) + Math.abs(colA - colB);
  assert.equal(dist, 1, `cells ${a} and ${b} must be grid-adjacent`);
}

test('buildPath visits every cell exactly once', () => {
  const path = buildPath(53, 7);
  assert.equal(path.length, 53 * 7);
  assert.equal(new Set(path).size, 53 * 7);
});

test('buildPath only steps between grid-adjacent cells', () => {
  const cols = 12, rows = 7;
  const path = buildPath(cols, rows);
  for (let i = 1; i < path.length; i++) assertAdjacent(path[i - 1], path[i], cols);
});

test('buildPath is deterministic for a given seed', () => {
  const a = buildPath(20, 7, 42);
  const b = buildPath(20, 7, 42);
  assert.deepEqual(a, b);
});

test('buildPath varies its route across seeds', () => {
  const a = buildPath(20, 7, 1);
  const b = buildPath(20, 7, 2);
  assert.notDeepEqual(a, b);
});
