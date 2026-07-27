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
