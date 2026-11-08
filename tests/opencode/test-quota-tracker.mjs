// Free-first quota tracker RED contracts — frozen vocabulary 2026-11-08.
// RED: helper `scripts/quota-tracker.mjs` does not exist yet, so the import
// below fails and the suite exits 1. GREEN will implement the helper to
// satisfy these assertions; this test is not weakened to pass.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const trackerURL = pathToFileURL(path.resolve(import.meta.dirname, '../../.opencode/plugins/sdlc-lean.js')).href;
const tracker = await import(trackerURL);

const EXPECTED_POOL = [
  'console-openrouter/nvidia/nemotron-3.5-super-vl:free',
  'console-openrouter2/nvidia/nemotron-3.5-super-vl:free',
  'opencode-go/crouton-alpha-free',
  'opencode-go/beam-free',
  'opencode-go/iceman-contributor-free',
];

test('pool is exactly the five frozen free models', () => {
  assert.deepEqual([...tracker.POOL], EXPECTED_POOL);
  assert.equal(Object.isFrozen(tracker.POOL), true);
});

test('fallback is dynamic (no hardcoded muse literal): null default, resolver round-trip, denylist/bare/paid rejected', () => {
  assert.equal(tracker.FALLBACK, null);
  assert.equal(typeof tracker.resolveFallback, 'function');
  assert.deepEqual(tracker.resolveFallback(null), null);
  assert.deepEqual(tracker.resolveFallback(undefined), null);
  assert.deepEqual(tracker.resolveFallback(''), null);
  for (const id of EXPECTED_POOL) {
    assert.equal(tracker.isAllowedModel(id), true, id);
    const r = tracker.resolveFallback(id);
    assert.ok(r && typeof r === 'object', `round-trip ${id}`);
    assert.equal(r.model, id);
    assert.equal(tracker.isAllowedModel(r.model), true, `fallback-in-allowlist ${id}`);
  }
  // qualified allowlisted session resolves and round-trips (dynamic, no endorsed literal)
  const session = 'opencode-go/beam-free';
  const resolved = tracker.resolveFallback(session);
  assert.deepEqual(resolved, { model: session, account: 'opencode-go' });
  assert.equal(tracker.isAllowedModel(resolved.model), true);
  // denylist/bare/paid rejection kept (strengthening; must still fail)
  for (const id of ['opencode-go/muse-spark-1.3', 'openai/gpt-oss-120b', 'gpt-oss-120b', 'console-openrouter/gpt-oss-120b:free']) {
    assert.equal(tracker.isAllowedModel(id), false, id);
    assert.throws(() => tracker.assertAllowedModel(id), /not-allowed|unknown-model/);
    assert.throws(() => tracker.resolveFallback(id), /not-allowed|unknown-model|account/i);
  }
  assert.equal(tracker.isDeniedModel('openai/gpt-oss-120b'), true);
  assert.equal(tracker.isDeniedModel('gpt-oss-120b'), true);
  // no-muse-literal: no hardcoded fallback endorsement
  assert.equal(tracker.FALLBACK, null);
});

test('admission is settled+outstanding+next<=cap', () => {
  assert.equal(tracker.admits({ settled: 0, outstanding: 0, next: 1, cap: 1 }), true);
  assert.equal(tracker.admits({ settled: 2, outstanding: 3, next: 5, cap: 10 }), true);
  assert.equal(tracker.admits({ settled: 2, outstanding: 3, next: 6, cap: 10 }), false);
  assert.equal(tracker.admits({ settled: 9, outstanding: 1, next: 1, cap: 10 }), false);
});

test('admits fails closed on non-finite values; strict finite numbers only, rejects null/booleans/objects', () => {
  assert.equal(tracker.admits(NaN), false);
  assert.equal(tracker.admits({ settled: NaN, outstanding: 0, next: 1, cap: 5 }), false);
  assert.equal(tracker.admits({ settled: 0, outstanding: Infinity, next: 1, cap: 5 }), false);
  assert.equal(tracker.admits({ settled: 0, outstanding: 0, next: 1, cap: NaN }), false);
  assert.equal(tracker.admits({ settled: 0, outstanding: 0, next: NaN, cap: 5 }), false);
  // strict: Number(null)=0 / Number(true)=1 coercions must be rejected
  assert.equal(tracker.admits({ settled: null, outstanding: 0, next: 1, cap: 5 }), false);
  assert.equal(tracker.admits({ settled: 0, outstanding: null, next: 1, cap: 5 }), false);
  assert.equal(tracker.admits({ settled: 0, outstanding: 0, next: null, cap: 5 }), false);
  assert.equal(tracker.admits({ settled: 0, outstanding: 0, next: 1, cap: null }), false);
  assert.equal(tracker.admits({ settled: true, outstanding: 0, next: 1, cap: 5 }), false);
  assert.equal(tracker.admits({ settled: false, outstanding: 0, next: 1, cap: 5 }), false);
  assert.equal(tracker.admits({ settled: 0, outstanding: true, next: 1, cap: 5 }), false);
  assert.equal(tracker.admits({ settled: 0, outstanding: 0, next: true, cap: 5 }), false);
  assert.equal(tracker.admits({ settled: 0, outstanding: 0, next: 1, cap: true }), false);
  // objects/arrays/undefined rejected (not Number()-coerced)
  assert.equal(tracker.admits({ settled: {}, outstanding: 0, next: 1, cap: 5 }), false);
  assert.equal(tracker.admits({ settled: [], outstanding: 0, next: 1, cap: 5 }), false);
  assert.equal(tracker.admits({ settled: undefined, outstanding: 0, next: 1, cap: 5 }), false);
  assert.equal(tracker.admits({ settled: 0, outstanding: 0, next: 1 }), false);
  // strict numbers only: numeric strings rejected (no Number() coercion)
  assert.equal(tracker.admits({ settled: '2', outstanding: 0, next: 1, cap: '5' }), false);
  assert.equal(tracker.admits({ settled: 'abc', outstanding: 0, next: 1, cap: 5 }), false);
  assert.equal(tracker.admits({ settled: 0, outstanding: 0, next: 1, cap: 'nope' }), false);
});

test('fallback triggers only on 429/provider-error; billing codes never trigger', () => {
  assert.equal(tracker.shouldTriggerFallback({ status: 429 }), true);
  assert.equal(tracker.shouldTriggerFallback({ code: 'provider-error' }), true);
  for (const err of [
    { status: 402 }, { status: 403 }, { status: 500 },
    { code: 'billing-error' }, { code: 'quota-billing' }, { code: 'payment-required' },
  ]) {
    assert.equal(tracker.shouldTriggerFallback(err), false, JSON.stringify(err));
  }
});

test('circuit states are exactly CLOSED/OPEN/HALF-OPEN', () => {
  assert.deepEqual([...tracker.CIRCUIT_STATES], ['CLOSED', 'OPEN', 'HALF-OPEN']);
});

test('cooldown_until is strict YYYY-MM-DDTHH:mm:ss.sssZ', () => {
  assert.equal(tracker.isValidCooldownUntil('2026-11-08T12:00:00.000Z'), true);
  assert.equal(tracker.isValidCooldownUntil('2026-11-08T12:00:00Z'), false);
  assert.equal(tracker.isValidCooldownUntil('2026-11-08T12:00:00.000+00:00'), false);
  assert.equal(tracker.isValidCooldownUntil('2026-11-08 12:00:00.000Z'), false);
  assert.throws(() => tracker.assertValidCooldownUntil('2026-11-08'), /cooldown_until/);
});

test('probe is cheap GET models then tiny completion max_tokens:1, never paid probe', () => {
  assert.deepEqual([...tracker.PROBE_STEPS], ['GET /api/v1/models', 'completion max_tokens:1']);
  assert.equal(tracker.PAID_PROBE_ALLOWED, false);
  assert.equal(tracker.PROBE_STEPS.some((s) => s.includes('gpt-oss-120b')), false);
});

test('secret-like input is refused', () => {
  const secret = `sk-${'A'.repeat(20)}`;
  assert.equal(tracker.isSecretLike(secret), true);
  assert.throws(() => tracker.assertNotSecretLike(secret), /secret-like/);
  assert.equal(tracker.isSecretLike('hello world'), false);
  tracker.assertNotSecretLike('hello world');
});

test('plugin SECRET_PATTERNS aligned: detects Bearer, BEGIN PRIVATE KEY, github_pat (additive)', () => {
  assert.equal(tracker.isSecretLike('Bearer ' + 'A'.repeat(24)), true);
  assert.equal(tracker.isSecretLike('-----BEGIN PRIVATE KEY-----'), true);
  assert.equal(tracker.isSecretLike('-----BEGIN RSA PRIVATE KEY-----'), true);
  assert.equal(tracker.isSecretLike('github_pat_' + 'A'.repeat(22)), true);
  assert.throws(() => tracker.assertNotSecretLike('Bearer ' + 'A'.repeat(24)), /secret-like/);
});

test('transitionCircuit rejects unknown state (EVIL → not CLOSED)', () => {
  const out = tracker.transitionCircuit('EVIL', {});
  assert.notEqual(out, 'CLOSED');
  assert.ok(tracker.CIRCUIT_STATES.includes(out), `unknown state must map to a valid state, got ${out}`);
  // aliases behave the same
  assert.notEqual(tracker.circuitTransition('EVIL', {}), 'CLOSED');
  assert.notEqual(tracker.nextCircuitState('EVIL', {}), 'CLOSED');
});

// TOCTOU hardening (Low, local-only): symlink asset/log swapped in after
// realpath containment must be rejected at open via O_NOFOLLOW (fail-closed).
// Intra-dir/root symlinks (previously allowed via realpath) must now fail.
test('asset-audit rejects symlink asset at open (TOCTOU swap blocked)', () => {
  const root = path.resolve(import.meta.dirname, '../..');
  const script = path.join(root, 'scripts/asset-audit.mjs');
  const dir = fs.mkdtempSync('/tmp/opencode/audit-toctou-');
  try {
    fs.mkdirSync(path.join(dir, 'textures'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'textures', 'real.png'), Buffer.alloc(1000));
    fs.symlinkSync(path.join(dir, 'textures', 'real.png'), path.join(dir, 'textures', 'link.png'));
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({
      schema_version: 1,
      assets: [{ id: 'link-asset', path: 'textures/link.png' }],
    }));
    const r = spawnSync(process.execPath, [script, path.join(dir, 'manifest.json')], { encoding: 'utf8' });
    assert.equal(r.status, 1, `expected audit exit 1 (symlink rejected), got ${r.status}: ${r.stdout} ${r.stderr}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('perf-gate rejects symlink log at open (TOCTOU swap blocked)', () => {
  const root = path.resolve(import.meta.dirname, '../..');
  const script = path.join(root, 'scripts/perf-gate.mjs');
  const tmp = fs.mkdtempSync(path.join(root, '.tmp-perf-toctou-'));
  try {
    fs.writeFileSync(path.join(tmp, 'real.json'), JSON.stringify({ frames: [1] }));
    fs.symlinkSync(path.join(tmp, 'real.json'), path.join(tmp, 'link.json'));
    const rel = path.relative(root, path.join(tmp, 'link.json'));
    const r = spawnSync(process.execPath, [script, '--log', rel, '--budget-ms', '16.67'], { encoding: 'utf8' });
    assert.equal(r.status, 2, `expected perf-gate exit 2 (symlink rejected), got ${r.status}: ${r.stdout} ${r.stderr}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// manifestDir realpath failure must fail closed (never lexical fallback):
// a missing or unreadable manifest directory rejects, it does not fall back
// to lexical containment comparison.
test('asset-audit rejects missing/unreadable manifestDir (fail-closed, not lexical fallback)', () => {
  const root = path.resolve(import.meta.dirname, '../..');
  const script = path.join(root, 'scripts/asset-audit.mjs');
  // Missing manifestDir: dirname does not exist.
  const base = fs.mkdtempSync('/tmp/opencode/audit-missingdir-');
  try {
    const manifestPath = path.join(base, 'missing-dir', 'manifest.json');
    const r = spawnSync(process.execPath, [script, manifestPath], { encoding: 'utf8' });
    assert.equal(r.status, 1, `expected audit exit 1 (missing manifestDir rejected), got ${r.status}: ${r.stdout} ${r.stderr}`);
    assert.match(r.stderr, /manifest directory/, `expected fail-closed manifest-directory rejection, got: ${r.stderr}`);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
  // Unreadable manifestDir: parent chmod 000 blocks realpath.
  const base2 = fs.mkdtempSync('/tmp/opencode/audit-unreadable-');
  try {
    const dir = path.join(base2, 'child');
    fs.mkdirSync(path.join(dir, 'textures'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'textures', 'a.png'), Buffer.alloc(1000));
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({
      schema_version: 1,
      assets: [{ id: 'a-asset', path: 'textures/a.png' }],
    }));
    fs.chmodSync(base2, 0o000);
    const r = spawnSync(process.execPath, [script, path.join(dir, 'manifest.json')], { encoding: 'utf8' });
    assert.equal(r.status, 1, `expected audit exit 1 (unreadable manifestDir rejected), got ${r.status}: ${r.stdout} ${r.stderr}`);
    assert.match(r.stderr, /manifest directory/, `expected fail-closed manifest-directory rejection, got: ${r.stderr}`);
  } finally {
    try { fs.chmodSync(base2, 0o755); } catch { /* best effort */ }
    fs.rmSync(base2, { recursive: true, force: true });
  }
});
