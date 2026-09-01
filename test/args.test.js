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
    '--storybook-ai-review',
    '--skip-install',
    '--no-git',
  ]);

  assert.equal(args.projectName, 'gis-app');
  assert.equal(args.map, 'openlayers');
  assert.equal(args.packageManager, 'pnpm');
  assert.equal(args.storybookAiReview, true);
  assert.equal(args.storybookAiReviewDemo, null);
  assert.equal(args.skipInstall, true);
  assert.equal(args.git, false);
});

test('AI review demo option also enables AI review', () => {
  const args = parseArgs(['app', '--storybook-ai-review-demo']);
  assert.equal(args.storybookAiReview, true);
  assert.equal(args.storybookAiReviewDemo, true);
});

test('can explicitly disable Storybook AI review', () => {
  const args = parseArgs(['app', '--no-storybook-ai-review']);
  assert.equal(args.storybookAiReview, false);
  assert.equal(args.storybookAiReviewDemo, false);
});

test('resolves no-map projects to the general React starter', () => {
  const args = parseArgs(['app', '--map=none']);
  const template = resolveTemplateFromArgs(args);
  assert.equal(template.id, 'react');
  assert.equal(template.repository, 'hwangilyong/react_init_agent');
});

test('resolves OpenLayers projects to react_ol_init', () => {
  const args = parseArgs(['map-app', '--template', 'react-ol']);
  const template = resolveTemplateFromArgs(args);
  assert.equal(template.map, 'openlayers');
  assert.equal(template.repository, 'hwangilyong/react_ol_init');
});

test('rejects conflicting template and map selections', () => {
  const args = parseArgs(['app', '--template', 'react', '--map', 'openlayers']);
  assert.throws(() => resolveTemplateFromArgs(args), /충돌/);
});

test('rejects unsupported package managers', () => {
  assert.throws(() => parseArgs(['app', '--package-manager', 'unknown']), /지원하지 않는 package manager/);
});
