// Free-pool autodetect grader (Task 1, RED) — additive, zero-dep, hermetic.
// Contract under test (GREEN must implement in .opencode/plugins/sdlc-lean.js):
// - isFreeCapable(model): admission = price===0 + tools + text-output + not-expired.
//   Suffixless ids admit (no `:free` suffix required). Secrets never free.
//   Stub shape: { id, price, tools, text, expired } (+ `secret` opt-in marker).
// - Caps: LONGCAT_DAILY_CAP=100, OR_FREE_DAILY_CAP=50,
//   OR_FREE_DAILY_CAP_WITH_CREDITS=1000, OR_FREE_MINUTE_CAP=20.
// - buildFreePool(models): admitted-only subset, order-preserving.
// - nextFreeLink(pool, state): round-robin from state.index, skips ids in
//   state.cooldown (429/cooldown), wraps, returns null when all on cooldown
//   (caller escalates). state = { index:number, cooldown:string[]|Set, now:number }.
// - resolveFallback(null) === null and FALLBACK === null (null → escalate).
// NOTE: ESM import used per repo convention (see test-dynamic-fallback.mjs);
// missing exports are undefined so every call below throws TypeError = RED.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const pluginURL = pathToFileURL(path.resolve(import.meta.dirname, '../../.opencode/plugins/sdlc-lean.js')).href;
const p = await import(pluginURL);

// Hermetic inline stub: flat descriptor; overrides per test. No network.
const freeModel = (overrides = {}) => ({
  id: 'opencode-go/beam-free',
  price: 0,
  tools: true,
  text: true,
  expired: false,
  ...overrides,
});

test('free-pool exports exist', () => {
  assert.equal(typeof p.isFreeCapable, 'function');
  assert.equal(typeof p.buildFreePool, 'function');
  assert.equal(typeof p.nextFreeLink, 'function');
});

test('admit canonical free model', () => {
  assert.equal(p.isFreeCapable(freeModel()), true);
});

test('admit spark-contributor-free', () => {
  assert.equal(p.isFreeCapable(freeModel({ id: 'opencode-go/muse-spark-1.3-contributor-free' })), true);
});

test('admit suffixless big-pickle (no :free suffix)', () => {
  assert.equal(p.isFreeCapable(freeModel({ id: 'opencode-go/big-pickle' })), true);
});

test('reject jev-paid (price > 0)', () => {
  assert.equal(p.isFreeCapable(freeModel({ id: 'openai/jev-paid', price: 0.01 })), false);
});

test('reject expired model', () => {
  assert.equal(p.isFreeCapable(freeModel({ expired: true })), false);
});

test('reject model with no tools', () => {
  assert.equal(p.isFreeCapable(freeModel({ tools: false })), false);
});

test('reject model with no price', () => {
  const m = freeModel();
  delete m.price;
  assert.equal(p.isFreeCapable(m), false);
});

test('reject non-text (image-only) output', () => {
  assert.equal(p.isFreeCapable(freeModel({ text: false })), false);
});

test('caps pinned: LongCat 100/day, OR 50/1000 per-key, 20/min', () => {
  assert.equal(p.LONGCAT_DAILY_CAP, 100);
  assert.equal(p.OR_FREE_DAILY_CAP, 50);
  assert.equal(p.OR_FREE_DAILY_CAP_WITH_CREDITS, 1000);
  assert.equal(p.OR_FREE_MINUTE_CAP, 20);
});

test('buildFreePool keeps admitted-only, order-preserving', () => {
  const good = freeModel();
  const paid = freeModel({ id: 'openai/jev-paid', price: 0.5 });
  const pool = p.buildFreePool([paid, good]);
  assert.deepEqual(pool, [good]);
});

test('nextFreeLink round-robin wraps around', () => {
  const a = freeModel({ id: 'opencode-go/beam-free' });
  const b = freeModel({ id: 'opencode-go/crouton-alpha-free' });
  const state = { index: 0, cooldown: [], now: Date.now() };
  assert.deepEqual(p.nextFreeLink([a, b], state), a);
  assert.deepEqual(p.nextFreeLink([a, b], state), b);
  assert.deepEqual(p.nextFreeLink([a, b], state), a);
});

test('nextFreeLink skips 429/cooldown entries', () => {
  const a = freeModel({ id: 'opencode-go/beam-free' });
  const b = freeModel({ id: 'opencode-go/crouton-alpha-free' });
  const c = freeModel({ id: 'opencode-go/iceman-contributor-free' });
  const state = { index: 0, cooldown: ['opencode-go/beam-free'], now: Date.now() };
  assert.deepEqual(p.nextFreeLink([a, b, c], state), b);
});

test('exhaustion returns null → escalate; resolveFallback(null)/FALLBACK null', () => {
  const a = freeModel({ id: 'opencode-go/beam-free' });
  const state = { index: 0, cooldown: ['opencode-go/beam-free'], now: Date.now() };
  assert.equal(p.nextFreeLink([a], state), null);
  assert.equal(p.resolveFallback(null), null);
  assert.equal(p.FALLBACK, null);
});

test('secrets never free', () => {
  const secret = freeModel({ id: `sk-${'A'.repeat(20)}` });
  assert.equal(p.isFreeCapable(secret), false);
});
