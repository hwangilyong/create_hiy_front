import test from 'node:test';
import assert from 'node:assert/strict';

import { parseArgs, resolveTemplateFromArgs } from '../src/args.js';

test('parses direct OpenLayers project options', () => {
  const args = parseArgs([
    'gis-app',
    '--map',
    'openlayers',
    '--package-manager',
    'pnpm',
    '--skip-install',
    '--no-git',
  ]);

  assert.equal(args.projectName, 'gis-app');
  assert.equal(args.map, 'openlayers');
  assert.equal(args.packageManager, 'pnpm');
  assert.equal(args.skipInstall, true);
  assert.equal(args.git, false);
});

test('resolves no-map projects to the stable React starter', () => {
  const args = parseArgs(['app', '--map=none']);
  const template = resolveTemplateFromArgs(args);

  assert.equal(template.id, 'react');
  assert.equal(template.version, '0.1.0');
  assert.equal(template.ref, 'v0.1.0');
  assert.equal(template.repository, 'hwangilyong/react_init_agent');
});

test('resolves OpenLayers projects to the stable react_ol_init release', () => {
  const args = parseArgs(['map-app', '--template', 'react-ol']);
  const template = resolveTemplateFromArgs(args);

  assert.equal(template.map, 'openlayers');
  assert.equal(template.version, '0.2.0');
  assert.equal(template.ref, 'v0.2.0');
});

test('supports template@version syntax', () => {
  const args = parseArgs(['app', '--template', 'react@0.1.0']);
  const template = resolveTemplateFromArgs(args);

  assert.equal(args.template, 'react');
  assert.equal(args.templateVersion, '0.1.0');
  assert.equal(template.version, '0.1.0');
});

test('supports v-prefixed template versions', () => {
  const args = parseArgs(['app', '--template', 'react', '--template-version', 'v0.1.0']);
  const template = resolveTemplateFromArgs(args);

  assert.equal(template.version, '0.1.0');
});

test('rejects unknown template versions', () => {
  const args = parseArgs(['app', '--template', 'react@9.9.9']);
  assert.throws(() => resolveTemplateFromArgs(args), /버전/);
});

test('rejects conflicting template and map selections', () => {
  const args = parseArgs(['app', '--template', 'react', '--map', 'openlayers']);
  assert.throws(() => resolveTemplateFromArgs(args), /충돌/);
});

test('rejects unsupported package managers', () => {
  assert.throws(
    () => parseArgs(['app', '--package-manager', 'unknown']),
    /지원하지 않는 package manager/,
  );
});
