// Structural guardrail for tiered reasoning-effort defaults (Task 4).
// Hermetic presence asserts on guidance strings — no model/network calls.
// Fail-safe: missing or weakened guidance line → red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const orchestrator = read('.opencode/agents/orchestrator.md');
const ledger = read('docs/audit-ledger.md');

test('tiered effort: Reasoning-effort defaults section exists', () => {
  assert.match(orchestrator, /^## Reasoning-effort defaults \(per tier\)/m);
});

test('tiered effort: never max by default (429 risk)', () => {
  assert.match(orchestrator, /never max by default \(429 risk\)/i);
  assert.match(orchestrator, /Never max-by-default/i);
  assert.match(orchestrator, /to avoid 429\/provider backoff/i);
});

test('tiered effort: MUSCLE medium (beam) + thinking on where valuable (super-vl)', () => {
  assert.match(orchestrator, /\*\*MUSCLE\*\* — `medium` reasoning effort \(beam\)/);
  assert.match(orchestrator, /thinking \*on where valuable\* for super-vl:free/i);
});

test('tiered effort: BRAIN high (orchestrator session model)', () => {
  assert.match(orchestrator, /\*\*BRAIN\*\* — `high` reasoning effort \(orchestrator session model\)/);
});

test('tiered effort: longcat/iceman exempt (no knob, never force)', () => {
  assert.match(orchestrator, /\*\*longcat\/iceman-free\*\* — exempt/i);
  assert.match(orchestrator, /no effort knob set/i);
  assert.match(orchestrator, /never force thinking or max effort/i);
});

test('tiered effort: brief-carry records effort + thinking as ledger row', () => {
  assert.match(
    orchestrator,
    /Every worker dispatch records the chosen reasoning effort \+ thinking setting → ledger row: model \+ account \+ effort \(\+ thinking\)\./,
  );
});

test('tiered effort: escalation +1 level capped at max for that tier', () => {
  assert.match(
    orchestrator,
    /Hardship or rework → reasoning effort \+1 level, capped at max for that tier\./,
  );
});

test('tiered effort: BRAIN judge/reviewer stays high (never stepped down)', () => {
  assert.match(
    orchestrator,
    /BRAIN judge\/reviewer pass stays `high` — never stepped down to save cost\./,
  );
});

test('tiered effort meters: audit-ledger tracks rework rate, 429 rate, 2-week cadence', () => {
  assert.match(ledger, /^## Meters \(sampled; no new infra\)/m);
  assert.match(ledger, /\*\*rework rate\*\* = reworked ÷ total dispatches\./);
  assert.match(ledger, /\*\*429 rate\*\* = 429s ÷ total calls\./);
  assert.match(ledger, /2-week cadence/i);
  assert.match(ledger, /per-call×rounds/i);
});
