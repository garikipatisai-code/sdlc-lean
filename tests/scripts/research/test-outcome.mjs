// Outcome taxonomy tests for scripts/research/protocol.mjs (node --test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const modURL = pathToFileURL(path.resolve(import.meta.dirname, '../../../scripts/research/protocol.mjs')).href;
const mod = await import(modURL);

test('classifyOutcome: null result is completed, not failed', () => {
  assert.deepEqual(mod.classifyOutcome({ cancelled: false, errors: [], resultKind: 'null' }),
    { status: 'completed', outcome: 'null' });
});

test('classifyOutcome: negative result is completed, not failed', () => {
  assert.deepEqual(mod.classifyOutcome({ cancelled: false, errors: [], resultKind: 'negative' }),
    { status: 'completed', outcome: 'negative' });
});

test('classifyOutcome: positive result is completed', () => {
  assert.deepEqual(mod.classifyOutcome({ cancelled: false, errors: [], resultKind: 'positive' }),
    { status: 'completed', outcome: 'positive' });
});

test('classifyOutcome: non-empty errors make the run errored and inconclusive', () => {
  assert.deepEqual(mod.classifyOutcome({ cancelled: false, errors: ['boom'], resultKind: 'positive' }),
    { status: 'errored', outcome: 'inconclusive' });
});

test('classifyOutcome: cancelled run is cancelled and inconclusive', () => {
  assert.deepEqual(mod.classifyOutcome({ cancelled: true, errors: [], resultKind: 'negative' }),
    { status: 'cancelled', outcome: 'inconclusive' });
});

test('classifyOutcome: cancelled wins over errors', () => {
  assert.deepEqual(mod.classifyOutcome({ cancelled: true, errors: ['boom'], resultKind: 'positive' }),
    { status: 'cancelled', outcome: 'inconclusive' });
});

test('classifyOutcome: missing or unknown resultKind defaults to inconclusive', () => {
  assert.deepEqual(mod.classifyOutcome({ cancelled: false, errors: [] }),
    { status: 'completed', outcome: 'inconclusive' });
  assert.deepEqual(mod.classifyOutcome({ cancelled: false, errors: [], resultKind: 'weird' }),
    { status: 'completed', outcome: 'inconclusive' });
});

test('classifyOutcome: errored with resultKind null stays errored+inconclusive', () => {
  assert.deepEqual(mod.classifyOutcome({ cancelled: false, errors: ['x'], resultKind: 'null' }),
    { status: 'errored', outcome: 'inconclusive' });
});
