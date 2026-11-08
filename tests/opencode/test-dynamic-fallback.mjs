// Dynamic fallback guard tests (Task 2) — additive, zero-dep.
// Covers session-model resolve, fail-open, cap accounting, secret redaction.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const pluginURL = pathToFileURL(path.resolve(import.meta.dirname, '../../.opencode/plugins/sdlc-lean.js')).href;
const p = await import(pluginURL);

const POOL = [
  'console-openrouter/nvidia/nemotron-3.5-super-vl:free',
  'console-openrouter2/nvidia/nemotron-3.5-super-vl:free',
  'opencode-go/crouton-alpha-free',
  'opencode-go/beam-free',
  'opencode-go/iceman-contributor-free',
];

test('dynamic fallback exports exist and FALLBACK is null', () => {
  assert.equal(p.FALLBACK, null);
  assert.equal(typeof p.resolveFallback, 'function');
  assert.equal(typeof p.resolveDynamicFallback, 'function');
  assert.equal(p.resolveDynamicFallback, p.resolveFallback);
  assert.deepEqual([...p.POOL], POOL);
});

test('session-model resolve: allowlisted session returned', () => {
  const m = 'opencode-go/beam-free';
  assert.deepEqual(p.resolveFallback(m), { model: m, account: 'opencode-go' });
  const m2 = 'console-openrouter/nvidia/nemotron-3.5-super-vl:free';
  assert.deepEqual(p.resolveFallback(m2), { model: m2, account: 'console-openrouter' });
  // object form
  assert.deepEqual(p.resolveFallback({ sessionModel: m, sessionAccount: 'opencode-go' }), { model: m, account: 'opencode-go' });
  // qualified non-pool allowlisted session
  const q = 'opencode-go/foo-contributor';
  assert.deepEqual(p.resolveFallback(q), { model: q, account: 'opencode-go' });
});

test('session-model resolve: bare id throws', () => {
  for (const id of ['gpt-oss-120b', 'muse-spark-1.3', 'opencode-go/muse-spark-1.3']) {
    assert.throws(() => p.resolveFallback(id), /not-allowed|unknown-model/i);
  }
});

test('session-model resolve: paid denylist throws', () => {
  for (const id of ['openai/gpt-oss-120b', 'console-openrouter/gpt-oss-120b:free']) {
    assert.throws(() => p.resolveFallback(id), /not-allowed|unknown-model/i);
  }
  assert.equal(p.isAllowedModel('openai/gpt-oss-120b'), false);
  assert.throws(() => p.assertAllowedModel('openai/gpt-oss-120b'), /not-allowed|unknown-model/i);
});

test('session-model resolve: unknown account throws; matching/derived ok', () => {
  const m = 'opencode-go/beam-free';
  assert.deepEqual(p.resolveFallback(m, 'opencode-go'), { model: m, account: 'opencode-go' });
  assert.throws(() => p.resolveFallback(m, 'evil-account'), /account|not-allowed|unknown/i);
  assert.throws(() => p.resolveFallback(m, 'console-openrouter'), /account|mismatch/i);
  // derived when no account
  assert.deepEqual(p.resolveFallback(m), { model: m, account: 'opencode-go' });
});

test('fail-open on unknown/undefined/non-string model', () => {
  for (const v of [null, undefined, '', '   ', 42, true, []]) {
    assert.equal(p.resolveFallback(v), null);
  }
  assert.equal(p.resolveFallback({}), null);
  assert.equal(p.resolveFallback({ sessionModel: '' }), null);
  assert.equal(p.resolveFallback(null, 'evil-account'), null);
});

test('cap accounting with dynamic identity', () => {
  const r = p.resolveFallback('opencode-go/beam-free');
  assert.ok(r);
  assert.equal(p.isAllowedModel(r.model), true);
  assert.equal(p.admits({ settled: 0, outstanding: 0, next: 1, cap: 1 }), true);
  assert.equal(p.admits({ settled: 1, outstanding: 0, next: 1, cap: 1 }), false);
});

test('secrets redacted', () => {
  const secret = `sk-${'A'.repeat(20)}`;
  assert.equal(p.isSecretLike(secret), true);
  assert.throws(() => p.assertNotSecretLike(secret), /secret-like/i);
  assert.equal(p.isSecretLike('hello world'), false);
  p.assertNotSecretLike('hello world');
  assert.throws(() => p.resolveFallback(secret), /not-allowed|unknown-model/i);
});

test('stale/paid denial via isSafeModel', () => {
  assert.equal(p.isSafeModel('openai/gpt-oss-120b'), false);
  assert.equal(p.isSafeModel('opencode-go/beam-free'), true);
  assert.equal(p.isDeniedModel('openai/gpt-oss-120b'), true);
  assert.equal(p.isDeniedModel('console-openrouter/x:free'), false);
});

test('suffixed paid variants are denied (denylist normalization)', () => {
  for (const id of ['muse-spark-1.3-contributor', 'gpt-oss-120b-free', 'opencode-go/gpt-oss-120b-free', 'opencode-go/muse-spark-1.3-contributor', 'openai/gpt-oss-120b-free', 'console-openrouter/gpt-oss-120b:free']) {
    assert.equal(p.isDeniedModel(id), true, id);
    assert.equal(p.isSafeModel(id), false, id);
    assert.equal(p.isAllowedModel(id), false, id);
    assert.throws(() => p.resolveFallback(id), /not-allowed|unknown-model/i, id);
  }
});

test('TTL/staleness bound documented: revalidate before dispatch', () => {
  const src = fs.readFileSync(path.resolve(import.meta.dirname, '../../.opencode/plugins/sdlc-lean.js'), 'utf8');
  assert.match(src, /revalidate/);
  assert.match(src, /beginDispatch/);
  assert.match(src, /60s|60_000|60000/);
  assert.match(src, /discovery/);
});

test('stacked suffixes are denied (loop-strip)', () => {
  for (const id of ['muse-spark-1.3-contributor-free', 'opencode-go/muse-spark-1.3-contributor-free']) {
    assert.equal(p.isDeniedModel(id), true, id);
    assert.equal(p.isSafeModel(id), false, id);
    assert.equal(p.isAllowedModel(id), false, id);
    assert.throws(() => p.resolveFallback(id), /not-allowed|unknown-model/i, id);
  }
});

test('account prefix gpt-oss does not deny bare beam-free', () => {
  const hypothetical = 'gpt-oss-foo/beam-free';
  assert.equal(p.isDeniedModel(hypothetical), false, hypothetical);
  assert.equal(p.isSafeModel('opencode-go/beam-free'), true);
});