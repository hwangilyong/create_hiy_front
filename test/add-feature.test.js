import test from 'node:test';
import assert from 'node:assert/strict';

import { parseAddCommand } from '../src/add-feature.js';

test('parses add openlayers', () => {
  const result = parseAddCommand(['add', 'openlayers']);
  assert.deepEqual(result, {
    feature: 'openlayers',
    packageManager: null,
    skipInstall: false,
    withExample: false,
  });
});

test('parses add openlayers options', () => {
  const result = parseAddCommand([
    'add',
    'openlayers',
    '--package-manager',
    'pnpm',
    '--skip-install',
    '--with-example',
  ]);
  assert.equal(result.packageManager, 'pnpm');
  assert.equal(result.skipInstall, true);
  assert.equal(result.withExample, true);
});

test('rejects unsupported add feature', () => {
  assert.throws(() => parseAddCommand(['add', 'cesium']), /지원하지 않는 추가 기능/);
});
