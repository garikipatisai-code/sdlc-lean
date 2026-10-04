// Planner tests: dry by default, spend gated, capped.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, selectProbes } from '../../eval/lib/plan.mjs';

const PROBES = [
  { id: 'a', group: 'activation' },
  { id: 'b', group: 'safety' },
  { id: 'c', group: 'routing' },
  { id: 'd', group: 'routing' },
];

test('dry is the default; only --run spends', () => {
  assert.equal(parseArgs([]).dry, true);
  assert.equal(parseArgs([]).run, false);
  const run = parseArgs(['--run']);
  assert.equal(run.run, true);
  assert.equal(run.dry, false);
});

test('max-probes caps the selection', () => {
  assert.equal(selectProbes(PROBES, { maxProbes: 2 }).length, 2);
  assert.equal(selectProbes(PROBES, { maxProbes: 0 }).length, 0);
});

test('filter selects by id substring or group', () => {
  assert.deepEqual(selectProbes(PROBES, { filter: 'routing' }).map((p) => p.id), ['c', 'd']);
  assert.deepEqual(selectProbes(PROBES, { filter: 'a' }).map((p) => p.id), ['a']);
});

test('args parse model, filter, and out dir', () => {
  const o = parseArgs(['--run', '--model', 'p/m', '--filter', 'safety', '--max-probes', '3', '--out', 'x']);
  assert.equal(o.model, 'p/m');
  assert.equal(o.filter, 'safety');
  assert.equal(o.maxProbes, 3);
  assert.equal(o.outDir, 'x');
});
