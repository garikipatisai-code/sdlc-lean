// Free-model resolver tests (Task 2, additive, no network).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFreeModels, getFreeModelsCached, FALLBACK_TRIO } from '../../eval/lib/free-models.mjs';

const TRIO = [...FALLBACK_TRIO];

test('FALLBACK_TRIO is a frozen copy of the default trio', () => {
  assert.ok(Object.isFrozen(FALLBACK_TRIO));
  assert.deepEqual([...FALLBACK_TRIO], [
    'opencode-go/crouton-alpha-free',
    'opencode-go/beam-free',
    'opencode-go/iceman-contributor-free',
  ]);
});

// (a) all returned have cost 0 on both sides
test('resolve: every returned model has zero cost on both sides', () => {
  const models = [
    { id: 'opencode-go/beam-free', cost: { input: 0, output: 0 }, capabilities: ['tool_call'] },
    { id: 'opencode-go/iceman-free', cost: 0, tool_call: true },
    { id: 'opencode-go/longcat-free', inputCost: 0, outputCost: 0, toolCall: true },
    { id: 'opencode-go/hy4-free', cost: { inputCost: 0, outputCost: 0 }, tools: ['tool_call'] },
    { id: 'opencode-go/crouton-free', cost: { total: 0 }, supportsToolCall: true },
    { id: 'opencode-go/beam-paid-free', cost: { input: 1, output: 0 }, capabilities: ['tool_call'] },
    { id: 'opencode-go/beam-partial-free', cost: { input: 0 }, capabilities: ['tool_call'] },
    { id: 'opencode-go/beam-partialtop-free', inputCost: 0, capabilities: ['tool_call'] },
  ];
  const res = resolveFreeModels(models);
  assert.deepEqual(new Set(res), new Set([
    'opencode-go/beam-free', 'opencode-go/iceman-free', 'opencode-go/longcat-free',
    'opencode-go/hy4-free', 'opencode-go/crouton-free',
  ]));
  const byId = Object.fromEntries(models.map((m) => [m.id, m]));
  for (const id of res) {
    const m = byId[id];
    const sides = [];
    if (typeof m.cost === 'number') {
      sides.push(m.cost, m.cost);
    } else if (m.cost && typeof m.cost === 'object') {
      const inp = typeof m.cost.inputCost === 'number' ? m.cost.inputCost : m.cost.input;
      const out = typeof m.cost.outputCost === 'number' ? m.cost.outputCost : m.cost.output;
      if (typeof inp === 'number') sides.push(inp);
      if (typeof out === 'number') sides.push(out);
      if (typeof m.cost.total === 'number') sides.push(m.cost.total, m.cost.total);
      if (typeof m.cost.value === 'number') sides.push(m.cost.value, m.cost.value);
    }
    if (typeof m.inputCost === 'number') sides.push(m.inputCost);
    if (typeof m.outputCost === 'number') sides.push(m.outputCost);
    assert.ok(sides.length > 0, `no cost data for ${id}`);
    assert.ok(sides.every((x) => x === 0), `non-zero cost for ${id}: ${sides}`);
  }
});

// (d) paid excluded (various cost shapes)
test('resolve: paid models are excluded across cost shapes', () => {
  const models = [
    { id: 'opencode-go/beam-paid1-free', cost: 5, tool_call: true },
    { id: 'opencode-go/beam-paid2-free', cost: { input: 1, output: 0 }, tool_call: true },
    { id: 'opencode-go/beam-paid3-free', inputCost: 1, outputCost: 0, tool_call: true },
    { id: 'opencode-go/beam-paid4-free', cost: { inputCost: 0, outputCost: 2 }, tool_call: true },
    { id: 'opencode-go/beam-paid5-free', cost: { total: 3 }, tool_call: true },
    { id: 'opencode-go/beam-free', cost: 0, tool_call: true },
  ];
  const res = resolveFreeModels(models);
  assert.deepEqual(res, ['opencode-go/beam-free']);
  for (const id of [
    'opencode-go/beam-paid1-free',
    'opencode-go/beam-paid2-free',
    'opencode-go/beam-paid3-free',
    'opencode-go/beam-paid4-free',
    'opencode-go/beam-paid5-free',
  ]) {
    assert.ok(!res.includes(id), `paid leaked: ${id}`);
  }
});

// (b) denylisted absent
test('resolve: denylisted and secret-like ids are absent', () => {
  const models = [
    { id: 'opencode-go/beam-free', cost: 0, tool_call: true },
    { id: 'opencode-go/beam-denied-free', cost: 0, tool_call: true },
    { id: 'opencode-go/beam-secret-key-free', cost: 0, tool_call: true },
    { id: 'opencode-go/beam-api-key-free', cost: 0, tool_call: true },
  ];
  const res = resolveFreeModels(models, { denylist: ['opencode-go/beam-denied-free'] });
  assert.deepEqual(res, ['opencode-go/beam-free']);
  assert.ok(!res.includes('opencode-go/beam-denied-free'));
  assert.ok(!res.includes('opencode-go/beam-secret-key-free'));
  assert.ok(!res.includes('opencode-go/beam-api-key-free'));
});

// (c) missing tool_call excluded
test('resolve: models without tool_call are excluded by default', () => {
  const models = [
    { id: 'opencode-go/beam-free', cost: 0, tool_call: true },
    { id: 'opencode-go/beam-notool-free', cost: 0 },
    { id: 'opencode-go/beam-notool2-free', cost: 0, capabilities: ['chat'] },
  ];
  const res = resolveFreeModels(models);
  assert.deepEqual(res, ['opencode-go/beam-free']);
  assert.ok(!res.includes('opencode-go/beam-notool-free'));
  assert.ok(!res.includes('opencode-go/beam-notool2-free'));
});

test('resolve: toolCallRequired=false includes no-tool models', () => {
  const models = [
    { id: 'opencode-go/beam-free', cost: 0 },
  ];
  const res = resolveFreeModels(models, { toolCallRequired: false });
  assert.deepEqual(res, ['opencode-go/beam-free']);
});

// prefix / non-opencode-go excluded
test('resolve: only opencode-go/ prefix ids are considered', () => {
  const models = [
    { id: 'other/free', cost: 0, tool_call: true },
    { id: 'opencode-go/beam-free', cost: 0, tool_call: true },
    { id: 42, cost: 0, tool_call: true },
  ];
  const res = resolveFreeModels(models);
  assert.deepEqual(res, ['opencode-go/beam-free']);
});

// (e) empty -> trio, corrupt -> trio
test('resolve: empty input returns a copy of the fallback trio', () => {
  const res = resolveFreeModels([]);
  assert.deepEqual(res, TRIO);
  assert.notStrictEqual(res, FALLBACK_TRIO);
});

test('resolve: corrupt/invalid input returns a copy of the fallback trio', () => {
  for (const bad of [null, undefined, 'nope', 42, {}, true]) {
    const res = resolveFreeModels(bad);
    assert.deepEqual(res, TRIO, `input ${String(bad)}`);
    assert.notStrictEqual(res, FALLBACK_TRIO);
  }
  const throwing = [Object.defineProperty({}, 'id', { get() { throw new Error('boom'); } })];
  const r2 = resolveFreeModels(throwing);
  assert.deepEqual(r2, TRIO);
});

test('resolve: all-filtered-out returns trio copy', () => {
  const models = [{ id: 'opencode-go/beam-paid-free', cost: 5, tool_call: true }];
  const res = resolveFreeModels(models);
  assert.deepEqual(res, TRIO);
});

test('resolve: custom fallback is used when provided', () => {
  const fb = ['opencode-go/x-free'];
  const res = resolveFreeModels([], { fallback: fb });
  assert.deepEqual(res, fb);
  assert.deepEqual(fb, ['opencode-go/x-free']);
});

test('resolve: does not mutate input', () => {
  const models = [{ id: 'opencode-go/ok', cost: 0, tool_call: true }];
  const snap = JSON.stringify(models);
  resolveFreeModels(models);
  assert.equal(JSON.stringify(models), snap);
});

// (f) TTL: hit (no refetch) + expiry (refetch)
test('cached: TTL hit does not refetch; expiry refetches', async () => {
  let calls = 0;
  const counting = async () => { calls++; return [{ id: 'opencode-go/beam-free', cost: 0, tool_call: true }]; };
  let nowMs = 0;
  const now = () => nowMs;
  const ttlMs = 1000;

  const r1 = await getFreeModelsCached(counting, { ttlMs, now });
  assert.deepEqual(r1, ['opencode-go/beam-free']);
  assert.equal(calls, 1);

  nowMs = 500;
  const r2 = await getFreeModelsCached(counting, { ttlMs, now });
  assert.deepEqual(r2, ['opencode-go/beam-free']);
  assert.equal(calls, 1, 'expected no refetch within TTL');

  nowMs = 1500;
  const r3 = await getFreeModelsCached(counting, { ttlMs, now });
  assert.deepEqual(r3, ['opencode-go/beam-free']);
  assert.equal(calls, 2, 'expected refetch after expiry');
});

test('cached: returns copies, not the cached reference', async () => {
  const fetcher = async () => [{ id: 'opencode-go/beam-free', cost: 0, tool_call: true }];
  let nowMs = 0;
  const now = () => nowMs;
  const a = await getFreeModelsCached(fetcher, { ttlMs: 1000, now });
  nowMs = 100;
  const b = await getFreeModelsCached(fetcher, { ttlMs: 1000, now });
  assert.notStrictEqual(a, b);
  assert.deepEqual(a, b);
});

test('cached: fetcher throw -> trio, memoized within TTL', async () => {
  let calls = 0;
  const fetcher = async () => { calls++; throw new Error('net down'); };
  let nowMs = 0;
  const now = () => nowMs;
  const r1 = await getFreeModelsCached(fetcher, { ttlMs: 1000, now });
  assert.deepEqual(r1, TRIO);
  assert.equal(calls, 1);
  nowMs = 100;
  const r2 = await getFreeModelsCached(fetcher, { ttlMs: 1000, now });
  assert.deepEqual(r2, TRIO);
  assert.equal(calls, 1, 'failing fetcher should not be re-invoked within TTL');
});

test('cached: empty/corrupt fetch result -> trio', async () => {
  const emptyFetcher = async () => [];
  const r1 = await getFreeModelsCached(emptyFetcher, { ttlMs: 1000 });
  assert.deepEqual(r1, TRIO);

  const corruptFetcher = async () => ({ garbage: true });
  const r2 = await getFreeModelsCached(corruptFetcher, { ttlMs: 1000 });
  assert.deepEqual(r2, TRIO);

  const nullFetcher = async () => null;
  const r3 = await getFreeModelsCached(nullFetcher, { ttlMs: 1000 });
  assert.deepEqual(r3, TRIO);
});

test('cached: per-fetcher cache isolation', async () => {
  const f1 = async () => [{ id: 'opencode-go/beam-free', cost: 0, tool_call: true }];
  const f2 = async () => [{ id: 'opencode-go/iceman-free', cost: 0, tool_call: true }];
  let nowMs = 0;
  const now = () => nowMs;
  const r1 = await getFreeModelsCached(f1, { ttlMs: 1000, now });
  const r2 = await getFreeModelsCached(f2, { ttlMs: 1000, now });
  assert.deepEqual(r1, ['opencode-go/beam-free']);
  assert.deepEqual(r2, ['opencode-go/iceman-free']);
});

test('cached: resolveOpts (denylist) are forwarded', async () => {
  const fetcher = async () => [
    { id: 'opencode-go/beam-free', cost: 0, tool_call: true },
    { id: 'opencode-go/beam-bad-free', cost: 0, tool_call: true },
  ];
  const res = await getFreeModelsCached(fetcher, { ttlMs: 1000, denylist: ['opencode-go/beam-bad-free'] });
  assert.deepEqual(res, ['opencode-go/beam-free']);
});

test('cached: default clock path works', async () => {
  const fetcher = async () => [{ id: 'opencode-go/beam-free', cost: 0, tool_call: true }];
  const res = await getFreeModelsCached(fetcher);
  assert.deepEqual(res, ['opencode-go/beam-free']);
});

// --- Task 3 property asserts (additive): guard invariants over resolver ---

const SECRET_RE = /secret|key|token/i;

function qualifiesFree(m, opts = {}) {
  const res = resolveFreeModels([m], opts);
  return res.length === 1 && res[0] === m.id;
}

test('property: resolved ids always start with opencode-go/ prefix', () => {
  const models = [
    { id: 'opencode-go/a', cost: 0, tool_call: true },
    { id: 'other/b', cost: 0, tool_call: true },
    { id: 'x/opencode-go/c', cost: 0, tool_call: true },
    { id: 'opencode-go/deep/d', cost: 0, tool_call: true },
  ];
  for (const id of resolveFreeModels(models)) {
    assert.equal(id.startsWith('opencode-go/'), true, `prefix violated: ${id}`);
  }
});

test('property: secrets never free (id pattern excluded)', () => {
  const secrets = [
    'opencode-go/has-secret',
    'opencode-go/my-key-model',
    'opencode-go/token-free',
    'opencode-go/SECRET-UPPER',
  ];
  for (const id of secrets) {
    assert.equal(SECRET_RE.test(id), true, `fixture must match secret re: ${id}`);
    assert.equal(qualifiesFree({ id, cost: 0, tool_call: true }), false, `secret leaked: ${id}`);
  }
});

test('property: denylisted ids never appear in result', () => {
  const models = [
    { id: 'opencode-go/beam-free', cost: 0, tool_call: true },
    { id: 'opencode-go/beam-nope-free', cost: 0, tool_call: true },
  ];
  const res = resolveFreeModels(models, { denylist: ['opencode-go/beam-nope-free'] });
  assert.ok(!res.includes('opencode-go/beam-nope-free'));
  assert.deepEqual(res, ['opencode-go/beam-free']);
});

test('property: tool_call required excludes non-capable models', () => {
  assert.equal(qualifiesFree({ id: 'opencode-go/beam-nt-free', cost: 0 }), false);
  assert.equal(qualifiesFree({ id: 'opencode-go/beam-free', cost: 0, tool_call: true }), true);
});

test('property: both-costs-zero required (non-zero or missing/partial rejected)', () => {
  const bad = [
    { id: 'opencode-go/beam-paid1-free', cost: 1, tool_call: true },
    { id: 'opencode-go/beam-paid2-free', cost: { input: 0, output: 1 }, tool_call: true },
    { id: 'opencode-go/beam-paid3-free', inputCost: 1, outputCost: 0, tool_call: true },
    { id: 'opencode-go/beam-paid4-free', cost: { input: 0 }, tool_call: true }, // partial
    { id: 'opencode-go/beam-paid5-free', tool_call: true }, // missing
  ];
  for (const m of bad) {
    assert.equal(qualifiesFree(m), false, `should reject: ${m.id}`);
  }
  const good = [
    { id: 'opencode-go/beam-free', cost: 0, tool_call: true },
    { id: 'opencode-go/iceman-free', cost: { input: 0, output: 0 }, tool_call: true },
    { id: 'opencode-go/longcat-free', inputCost: 0, outputCost: 0, tool_call: true },
  ];
  for (const m of good) {
    assert.equal(qualifiesFree(m), true, `should accept: ${m.id}`);
  }
});

test('property: fallback is always a fresh copy of FALLBACK_TRIO shape', () => {
  const a = resolveFreeModels(null);
  const b = resolveFreeModels([]);
  assert.deepEqual(a, [...FALLBACK_TRIO]);
  assert.deepEqual(b, [...FALLBACK_TRIO]);
  assert.notStrictEqual(a, FALLBACK_TRIO);
  assert.notStrictEqual(b, FALLBACK_TRIO);
  assert.notStrictEqual(a, b);
});

test('property: cached resolver returns copies and honors guards', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return [
      { id: 'opencode-go/beam-free', cost: 0, tool_call: true },
      { id: 'opencode-go/beam-secret-x-free', cost: 0, tool_call: true },
      { id: 'other/no', cost: 0, tool_call: true },
    ];
  };
  let nowMs = 0;
  const now = () => nowMs;
  const r1 = await getFreeModelsCached(fetcher, { ttlMs: 5000, now });
  const r2 = await getFreeModelsCached(fetcher, { ttlMs: 5000, now: () => 100 });
  assert.deepEqual(r1, ['opencode-go/beam-free']);
  assert.deepEqual(r2, ['opencode-go/beam-free']);
  assert.notStrictEqual(r1, r2);
  assert.equal(calls, 1);
});

// --- Muse BLOCKING + P1-P3 guard fixes (RED) ---

test('resolve: paid total/value overrides zero split (paid leak closed)', () => {
  const bad = [
    { id: 'opencode-go/beam-tot-free', cost: { input: 0, output: 0, total: 5 }, tool_call: true },
    { id: 'opencode-go/beam-val-free', cost: { input: 0, output: 0, value: 3 }, tool_call: true },
    { id: 'opencode-go/beam-tot-cost-free', cost: { inputCost: 0, outputCost: 0, total: 1 }, tool_call: true },
    { id: 'opencode-go/beam-tot-val-free', cost: { input: 0, output: 0, total: 0, value: 7 }, tool_call: true },
  ];
  for (const m of bad) {
    assert.equal(qualifiesFree(m), false, `paid total/value leaked: ${m.id}`);
  }
  const good = [
    { id: 'opencode-go/beam-free', cost: { input: 0, output: 0, total: 0 }, tool_call: true },
    { id: 'opencode-go/iceman-free', cost: { input: 0, output: 0, value: 0 }, tool_call: true },
    { id: 'opencode-go/longcat-free', cost: { input: 0, output: 0, total: 0, value: 0 }, tool_call: true },
  ];
  for (const m of good) {
    assert.equal(qualifiesFree(m), true, `should accept zero total/value: ${m.id}`);
  }
});

test('cached: TTL hit bypassed when resolveOpts differ (denylist/toolCallRequired/fallback)', async () => {
  // denylist change
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return [
      { id: 'opencode-go/beam-free', cost: 0, tool_call: true },
      { id: 'opencode-go/beam-bad-free', cost: 5, tool_call: true },
    ];
  };
  let nowMs = 0;
  const now = () => nowMs;
  const r1 = await getFreeModelsCached(fetcher, { ttlMs: 1000, now, denylist: [] });
  assert.deepEqual(r1, ['opencode-go/beam-free']);
  assert.equal(calls, 1);
  nowMs = 100;
  const r2 = await getFreeModelsCached(fetcher, { ttlMs: 1000, now, denylist: ['opencode-go/beam-bad-free'] });
  assert.deepEqual(r2, ['opencode-go/beam-free']);
  assert.equal(calls, 2, 'expected refetch when denylist differs');
  nowMs = 200;
  const r3 = await getFreeModelsCached(fetcher, { ttlMs: 1000, now, denylist: ['opencode-go/beam-bad-free'] });
  assert.deepEqual(r3, ['opencode-go/beam-free']);
  assert.equal(calls, 2, 'expected cache hit when opts identical');

  // fallback change
  let calls2 = 0;
  const fetcher2 = async () => { calls2++; return []; };
  const f1 = await getFreeModelsCached(fetcher2, { ttlMs: 1000, now: () => 0, fallback: ['opencode-go/x-free'] });
  const f2 = await getFreeModelsCached(fetcher2, { ttlMs: 1000, now: () => 100, fallback: ['opencode-go/y-free'] });
  assert.deepEqual(f1, ['opencode-go/x-free']);
  assert.deepEqual(f2, ['opencode-go/y-free']);
  assert.equal(calls2, 2, 'expected refetch when fallback differs');

  // toolCallRequired change
  let calls3 = 0;
  const fetcher3 = async () => { calls3++; return [{ id: 'opencode-go/beam-free', cost: 0 }]; };
  const t1 = await getFreeModelsCached(fetcher3, { ttlMs: 1000, now: () => 0, toolCallRequired: false });
  assert.deepEqual(t1, ['opencode-go/beam-free']);
  const t2 = await getFreeModelsCached(fetcher3, { ttlMs: 1000, now: () => 100 });
  assert.deepEqual(t2, TRIO);
  assert.equal(calls3, 2, 'expected refetch when toolCallRequired differs');
});

test('resolve: empty fallback [] returns trio copy, never empty', () => {
  assert.deepEqual(resolveFreeModels([], { fallback: [] }), TRIO);
  assert.deepEqual(resolveFreeModels(null, { fallback: [] }), TRIO);
  assert.deepEqual(
    resolveFreeModels([{ id: 'opencode-go/beam-paid-free', cost: 5, tool_call: true }], { fallback: [] }),
    TRIO,
  );
  assert.deepEqual(resolveFreeModels([], { fallback: ['opencode-go/x-free'] }), ['opencode-go/x-free']);
  // non-array / undefined fallback also falls back to trio
  assert.deepEqual(resolveFreeModels([], { fallback: undefined }), TRIO);
});

test('resolve: tool_call strict — truthy strings and bare tools alias rejected', () => {
  const bad = [
    { id: 'opencode-go/beam-s1-free', cost: 0, capabilities: { tool_call: 'yes' } },
    { id: 'opencode-go/beam-s2-free', cost: 0, capabilities: { tool_call: 1 } },
    { id: 'opencode-go/beam-s3-free', cost: 0, capabilities: { tool_call: 'true' } },
    { id: 'opencode-go/beam-s4-free', cost: 0, capabilities: { tools: true } },
    { id: 'opencode-go/beam-s5-free', cost: 0, capabilities: ['tools'] },
    { id: 'opencode-go/beam-s6-free', cost: 0, tools: { tool_call: 'yes' } },
  ];
  for (const m of bad) {
    assert.equal(qualifiesFree(m), false, `truthy/bare-tools leaked: ${m.id}`);
  }
  const good = [
    { id: 'opencode-go/beam-free', cost: 0, capabilities: { tool_call: true } },
    { id: 'opencode-go/iceman-free', cost: 0, capabilities: { toolCall: true } },
    { id: 'opencode-go/longcat-free', cost: 0, capabilities: ['tool_call'] },
    { id: 'opencode-go/hy4-free', cost: 0, tools: { tool_call: true } },
    { id: 'opencode-go/crouton-free', cost: 0, tool_call: true },
  ];
  for (const m of good) {
    assert.equal(qualifiesFree(m), true, `should accept strict true: ${m.id}`);
  }
});

// (g) allowlist + deny-rest: inkling-2-small allowed, unknown-free and selfmade denied,
// beam-evil/beam-secret (non-free suffix) denied, unknown non-zero cost denied, trio fallback
test('resolve: allowlist admits inkling-2-small; unknown-free and selfmade denied, trio fallback', () => {
  // inkling-2-small is allowlisted -> admitted with 0/0 cost + tool_call
  const allowed = [
    { id: 'opencode-go/inkling-2-small:free', cost: 0, tool_call: true },
  ];
  assert.deepEqual(resolveFreeModels(allowed), ['opencode-go/inkling-2-small:free']);

  // not allowlisted -> denied (falls back to trio): selfmade, unknown-free, and
  // the old family-deny variants (none are on the allowlist); beam-evil and
  // beam-secret carry non-free suffixes so the prefix squat is closed (F1).
  const denied = [
    { id: 'opencode-go/selfmade', cost: 0, tool_call: true },
    { id: 'opencode-go/unknown-free', cost: 0, tool_call: true },
    { id: 'opencode-go/beam-evil', cost: 0, tool_call: true },
    { id: 'opencode-go/beam-secret', cost: 0, tool_call: true },
    { id: 'opencode-go/muse-spark-1.3', cost: 0, tool_call: true },
    { id: 'opencode-go/muse-spark-1.3-contributor', cost: 0, tool_call: true },
    { id: 'opencode-go/muse_spark-free', cost: 0, tool_call: true },
    { id: 'opencode-go/musespark-free', cost: 0, tool_call: true },
    { id: 'opencode-go/inkling-substring', cost: 0, tool_call: true },
    { id: 'opencode-go/laguna', cost: 0, tool_call: true },
    { id: 'opencode-go/lfm-variant', cost: 0, tool_call: true },
    { id: 'opencode-go/poolside-x', cost: 0, tool_call: true },
    { id: 'opencode-go/liquidlfm', cost: 0, tool_call: true },
  ];
  const res2 = resolveFreeModels(denied);
  assert.deepEqual(res2, TRIO);
  for (const m of denied) {
    assert.ok(!res2.includes(m.id), `denied leaked: ${m.id}`);
  }
  // an allowlisted go free model resolves alongside denied ones
  const mixed = [
    { id: 'opencode-go/beam-free', cost: 0, tool_call: true },
    { id: 'opencode-go/selfmade', cost: 0, tool_call: true },
  ];
  assert.deepEqual(resolveFreeModels(mixed), ['opencode-go/beam-free']);
});

// F1: prefix squat closed — non-free suffix on an allowlisted stem is denied
test('resolve: beam-evil / beam-secret (non-free suffix) denied by allowlist', () => {
  const models = [
    { id: 'opencode-go/beam-free', cost: 0, tool_call: true },
    { id: 'opencode-go/beam-evil', cost: 0, tool_call: true },
    { id: 'opencode-go/beam-secret', cost: 0, tool_call: true },
    { id: 'opencode-go/iceman-evil', cost: 0, tool_call: true },
  ];
  assert.deepEqual(resolveFreeModels(models), ['opencode-go/beam-free']);
  for (const id of ['opencode-go/beam-evil', 'opencode-go/beam-secret', 'opencode-go/iceman-evil']) {
    assert.ok(!resolveFreeModels([{ id, cost: 0, tool_call: true }]).includes(id), `prefix squat leaked: ${id}`);
  }
});

// REQ-4: bare stem (no -free/:free suffix) is denied even when on an allowlist prefix
test('resolve: bare stem without -free/:free suffix is denied', () => {
  const models = [
    { id: 'opencode-go/beam', cost: 0, tool_call: true },
    { id: 'opencode-go/iceman', cost: 0, tool_call: true },
    { id: 'opencode-go/beam-free', cost: 0, tool_call: true },
    { id: 'opencode-go/iceman-contributor-free', cost: 0, tool_call: true },
  ];
  const res = resolveFreeModels(models);
  assert.deepEqual(res, ['opencode-go/beam-free', 'opencode-go/iceman-contributor-free']);
  for (const id of ['opencode-go/beam', 'opencode-go/iceman']) {
    assert.ok(!res.includes(id), `bare stem leaked: ${id}`);
  }
});

// F2: unknown non-zero numeric cost dimension vetoes the free verdict
test('resolve: unknown non-zero cost dimension denied; unknown zero allowed', () => {
  const bad = [
    { id: 'opencode-go/beam-unk-free', cost: { input: 0, output: 0, mystery: 5 }, tool_call: true },
    { id: 'opencode-go/beam-unk2-free', inputCost: 0, outputCost: 0, mystery: 5, tool_call: true },
  ];
  for (const m of bad) {
    assert.equal(qualifiesFree(m), false, `unknown cost leaked: ${m.id}`);
  }
  const good = [
    { id: 'opencode-go/beam-unkzero-free', cost: { input: 0, output: 0, mystery: 0 }, tool_call: true },
    { id: 'opencode-go/beam-free', cost: 0, tool_call: true },
  ];
  const res = resolveFreeModels([...bad, ...good]);
  assert.deepEqual(res, ['opencode-go/beam-unkzero-free', 'opencode-go/beam-free']);
  for (const m of good) {
    assert.equal(qualifiesFree(m), true, `should accept: ${m.id}`);
  }
});
