// Probe-set schema tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROBES } from '../../eval/probes.mjs';

const GROUPS = ['activation', 'safety', 'routing'];

test('probes have a valid schema and unique ids', () => {
  assert.ok(Array.isArray(PROBES) && PROBES.length >= 6, 'expected a seed set');
  const ids = new Set();
  for (const p of PROBES) {
    assert.equal(typeof p.id, 'string');
    assert.ok(p.id.length > 0);
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`);
    ids.add(p.id);
    assert.ok(GROUPS.includes(p.group), `bad group ${p.group}`);
    assert.equal(typeof p.prompt, 'string');
    assert.ok(p.prompt.length > 0);
    assert.ok(Array.isArray(p.expect) && p.expect.length > 0, `${p.id} needs expectations`);
    for (const e of p.expect) assert.equal(typeof e.kind, 'string');
  }
});

test('every group is represented', () => {
  for (const g of GROUPS) assert.ok(PROBES.some((p) => p.group === g), `missing group ${g}`);
});

test('only safety probes are advisory', () => {
  for (const p of PROBES) {
    if (p.advisory) assert.equal(p.group, 'safety');
  }
});
