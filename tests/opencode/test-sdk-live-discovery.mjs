// SDK-track Task 1 (RED) — live-discovery grader, hermetic, zero-dep, no network.
// Contract under test (GREEN / Task 2 must implement in .opencode/plugins/sdlc-lean.js):
// - fetchModelsDev(fetchFn): live discovery via models.dev feeds; normalize each entry
//   to { id, promptCost, completionCost, tools:boolean } from cost/capabilities shapes.
// - fetchConsoleModels(fetchFn): Console GET /inference/v1/models list;
//   normalize to [{ id, source:'console' }].
// - fetchOpenRouterModels(fetchFn): OR GET /api/v1/models; keep only entries with
//   supported_parameters including 'tools' AND pricing.prompt===0; drop routers with
//   min_price===-1; normalize to [{ id, source:'openrouter' }].
// - fetchModelEndpoints(fetchFn, modelId): per-model endpoints detail join;
//   normalize to [{ endpoint, price }] for the given model id.
// - getORKeyQuota(fetchFn): quotas via OR GET /key; normalize to
//   { limit, used, remaining, resetWindow } (Go windows: daily/minute windows surfaced).
// - mapResponseAccounting(response): per-response usage.cost/billing_source/allowance
//   mapping; normalize to { cost, billingSource, allowance }; Activity CSV is the
//   documented fallback note when usage is absent (returns { fallback:'activity-csv' }).
// - buildLivePool({ modelsDev, consoleModels, openRouterModels }): merged live pool,
//   order-preserving, hand-rolled failover kept (no external failover lib).
// KEEP-1 pins: GET-only (no POST/PUT/DELETE/provision), no key provisioning export,
//   secrets-never-free (secret-like ids rejected from pool).
// NOTE: ESM import per repo convention; missing exports are undefined so every call
// below throws TypeError (or assert fails on typeof) = RED.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const pluginURL = pathToFileURL(path.resolve(import.meta.dirname, '../../.opencode/plugins/sdlc-lean.js')).href;
const p = await import(pluginURL);

// Hermetic inline fixtures — no keys/tokens, no network.
const MODELS_DEV_FIXTURE = {
  'opencode-go/beam-free': { cost: { input: 0, output: 0 }, capabilities: { tools: true } },
  'openai/gpt-paid': { cost: { input: 0.01, output: 0.03 }, capabilities: { tools: true } },
  'opencode-go/no-tools-free': { cost: { input: 0, output: 0 }, capabilities: { tools: false } },
};
const CONSOLE_LIST_FIXTURE = {
  data: [{ id: 'console-openrouter/nvidia/nemotron-3.5-super-vl:free' }],
};
const OR_MODELS_FIXTURE = {
  data: [
    { id: 'opencode-go/beam-free', supported_parameters: ['tools'], pricing: { prompt: 0 }, min_price: 0 },
    { id: 'opencode-go/big-pickle', supported_parameters: ['tools'], pricing: { prompt: 0 }, min_price: 0 },
    { id: 'openai/jev-paid', supported_parameters: ['tools'], pricing: { prompt: 0.01 }, min_price: 0.01 },
    { id: 'opencode-go/no-tools-free', supported_parameters: ['stop'], pricing: { prompt: 0 }, min_price: 0 },
    { id: 'opencode-go/ghost-router', supported_parameters: ['tools'], pricing: { prompt: 0 }, min_price: -1 },
  ],
};
const OR_ENDPOINTS_FIXTURE = {
  data: { id: 'opencode-go/beam-free', endpoints: [{ name: 'main', price: 0 }] },
};
const OR_KEY_FIXTURE = {
  data: { limit: 50, usage: 12, remaining: 38, reset_window: 'daily' },
};

const okFetch = (payload) => async () => ({ ok: true, json: async () => payload });

test('LIVE-1 exports exist: fetchModelsDev + buildLivePool', () => {
  assert.equal(typeof p.fetchModelsDev, 'function');
  assert.equal(typeof p.buildLivePool, 'function');
});

test('LIVE-1 models.dev: zero-cost + tools admitted with cost/capabilities mapping', async () => {
  const out = await p.fetchModelsDev(okFetch(MODELS_DEV_FIXTURE));
  const beam = out.find((m) => m.id === 'opencode-go/beam-free');
  assert.deepEqual(beam, { id: 'opencode-go/beam-free', promptCost: 0, completionCost: 0, tools: true });
});

test('LIVE-1 models.dev: paid and no-tools entries filtered from live pool input', async () => {
  const out = await p.fetchModelsDev(okFetch(MODELS_DEV_FIXTURE));
  const ids = out.map((m) => m.id);
  assert.ok(!ids.includes('openai/gpt-paid'), 'paid must be excluded');
  assert.ok(!ids.includes('opencode-go/no-tools-free'), 'no-tools must be excluded');
});

test('LIVE-2 exports exist: fetchConsoleModels', () => {
  assert.equal(typeof p.fetchConsoleModels, 'function');
});

test('LIVE-2 Console list: GET /inference/v1/models shape normalized', async () => {
  const out = await p.fetchConsoleModels(okFetch(CONSOLE_LIST_FIXTURE));
  assert.deepEqual(out, [{ id: 'console-openrouter/nvidia/nemotron-3.5-super-vl:free', source: 'console' }]);
});

test('LIVE-3 exports exist: fetchOpenRouterModels + fetchModelEndpoints', () => {
  assert.equal(typeof p.fetchOpenRouterModels, 'function');
  assert.equal(typeof p.fetchModelEndpoints, 'function');
});

test('LIVE-3 OR filters: supported_parameters=tools AND pricing.prompt==0 only', async () => {
  const out = await p.fetchOpenRouterModels(okFetch(OR_MODELS_FIXTURE));
  const ids = out.map((m) => m.id);
  assert.ok(ids.includes('opencode-go/beam-free'));
  assert.ok(ids.includes('opencode-go/big-pickle'));
  assert.ok(!ids.includes('openai/jev-paid'), 'paid pricing.prompt>0 dropped');
  assert.ok(!ids.includes('opencode-go/no-tools-free'), 'missing tools param dropped');
});

test('LIVE-3 OR filters: min_price -1 routers dropped; endpoints join per model', async () => {
  const out = await p.fetchOpenRouterModels(okFetch(OR_MODELS_FIXTURE));
  assert.ok(!out.map((m) => m.id).includes('opencode-go/ghost-router'), 'min_price -1 dropped');
  const eps = await p.fetchModelEndpoints(okFetch(OR_ENDPOINTS_FIXTURE), 'opencode-go/beam-free');
  assert.deepEqual(eps, [{ endpoint: 'main', price: 0 }]);
});

test('ACCT-1 exports exist: getORKeyQuota', () => {
  assert.equal(typeof p.getORKeyQuota, 'function');
});

test('ACCT-1 OR /key quota: limit/usage/remaining + Go windows surfaced', async () => {
  const q = await p.getORKeyQuota(okFetch(OR_KEY_FIXTURE));
  assert.equal(q.limit, 50);
  assert.equal(q.used, 12);
  assert.equal(q.remaining, 38);
  assert.equal(q.resetWindow, 'daily');
});

test('ACCT-2 exports exist: mapResponseAccounting', () => {
  assert.equal(typeof p.mapResponseAccounting, 'function');
});

test('ACCT-2 per-response mapping + Activity CSV fallback note', () => {
  const mapped = p.mapResponseAccounting({ usage: { cost: 0, billing_source: 'free-pool', allowance: 'daily' } });
  assert.deepEqual(mapped, { cost: 0, billingSource: 'free-pool', allowance: 'daily' });
  const fb = p.mapResponseAccounting({});
  assert.equal(fb.fallback, 'activity-csv');
});

test('KEEP-1 GET-only/no-provisioning/secrets-never-free (+ hand-rolled failover kept)', () => {
  assert.equal(typeof p.provisionKey, 'undefined', 'no key provisioning export');
  assert.equal(typeof p.createApiKey, 'undefined', 'no key provisioning export');
  const pool = p.buildLivePool({
    modelsDev: [{ id: 'opencode-go/beam-free', promptCost: 0, completionCost: 0, tools: true }],
    consoleModels: [{ id: 'console-openrouter/nvidia/nemotron-3.5-super-vl:free', source: 'console' }],
    openRouterModels: [{ id: 'opencode-go/big-pickle', source: 'openrouter' }],
  });
  assert.deepEqual(pool.map((m) => m.id), [
    'opencode-go/beam-free',
    'console-openrouter/nvidia/nemotron-3.5-super-vl:free',
    'opencode-go/big-pickle',
  ]);
  const secretId = `sk-${'A'.repeat(20)}`;
  const pool2 = p.buildLivePool({
    modelsDev: [{ id: secretId, promptCost: 0, completionCost: 0, tools: true }],
    consoleModels: [],
    openRouterModels: [],
  });
  assert.deepEqual(pool2, [], 'secrets never free: secret-like ids excluded');
});
