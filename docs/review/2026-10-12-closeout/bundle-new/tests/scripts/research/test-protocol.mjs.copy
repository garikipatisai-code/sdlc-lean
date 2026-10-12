// Protocol freeze tests for scripts/research/protocol.mjs (node --test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const modURL = pathToFileURL(path.resolve(import.meta.dirname, '../../../scripts/research/protocol.mjs')).href;
const mod = await import(modURL);

const baseFields = () => ({
  hypothesis: 'paired questions cluster better than random',
  splitSpec: { method: 'kfold', folds: 5 },
  controls: { maxRuns: 3, timeoutMs: 60_000 },
  metrics: ['accuracy', 'agreement'],
  seeds: { training: 42, split: 7 },
  budgets: { tokens: 1_000_000, timeMs: 3_600_000 },
  datasetDigest: 'd1', modelDigest: 'm1', scorerDigest: 's1',
  evalSettings: { temperature: 0, judge: 'exact' },
});

test('createProtocol returns {fields, hash} with a deterministic 64-hex hash for identical fields', async () => {
  const a = await mod.createProtocol(baseFields());
  const b = await mod.createProtocol(baseFields());
  assert.equal(a.hash, b.hash, 'identical fields must give identical hashes');
  assert.match(a.hash, /^[0-9a-f]{64}$/);
  assert.deepEqual(a.fields, baseFields(), 'fields must be passed through unchanged');
});

test('createProtocol hash differs when any frozen field changes, including nested seed values', async () => {
  const p = await mod.createProtocol(baseFields());

  const seedChanged = baseFields();
  seedChanged.seeds.training = 43;
  assert.notEqual(p.hash, (await mod.createProtocol(seedChanged)).hash, 'nested seed change must change the hash');

  const splitChanged = baseFields();
  splitChanged.splitSpec.folds = 10;
  assert.notEqual(p.hash, (await mod.createProtocol(splitChanged)).hash, 'splitSpec change must change the hash');

  const evalChanged = baseFields();
  evalChanged.evalSettings.temperature = 1;
  assert.notEqual(p.hash, (await mod.createProtocol(evalChanged)).hash, 'evalSettings change must change the hash');

  const hypothesisChanged = baseFields();
  hypothesisChanged.hypothesis = 'other hypothesis';
  assert.notEqual(p.hash, (await mod.createProtocol(hypothesisChanged)).hash, 'hypothesis change must change the hash');
});

test('verifyProtocol is true for an untouched protocol', async () => {
  const p = await mod.createProtocol(baseFields());
  assert.equal(await mod.verifyProtocol(p), true);
});

test('verifyProtocol is false after any frozen-field mutation', async () => {
  const seedMutated = await mod.createProtocol(baseFields());
  seedMutated.fields.seeds.training = 999;
  assert.equal(await mod.verifyProtocol(seedMutated), false, 'mutated nested seed must invalidate');

  const splitMutated = await mod.createProtocol(baseFields());
  splitMutated.fields.splitSpec.method = 'holdout';
  assert.equal(await mod.verifyProtocol(splitMutated), false, 'mutated splitSpec must invalidate');

  const evalMutated = await mod.createProtocol(baseFields());
  evalMutated.fields.evalSettings.judge = 'llm';
  assert.equal(await mod.verifyProtocol(evalMutated), false, 'mutated evalSettings must invalidate');
});
