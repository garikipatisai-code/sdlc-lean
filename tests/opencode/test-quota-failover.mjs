// Task 3: failover tests (additive). Stub dispatch injection, no live network.
// Verifies free-pool failover selection, exhaustion/stop+escalate, and
// safety pins (secrets never free, paid gated by explicit session model).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const modURL = pathToFileURL(path.resolve(import.meta.dirname, '../../.opencode/plugins/sdlc-lean.js')).href;
const q = await import(modURL);

const POOL = [
  'console-openrouter/nvidia/nemotron-3.5-super-vl:free',
  'console-openrouter2/nvidia/nemotron-3.5-super-vl:free',
  'opencode-go/crouton-alpha-free',
  'opencode-go/beam-free',
  'opencode-go/iceman-contributor-free',
];

const is429 = (err) => q.classifyQuotaError(err) || q.shouldTriggerFallback(err);

test('429→429→success picks link3 (crouton, 3rd pool link) via stub dispatch', async () => {
  const dispatchLog = [];
  const cooling = new Set();
  const dispatch = async (model) => {
    dispatchLog.push({ model, paid: !POOL.includes(model) });
    if (model === POOL[0] || model === POOL[1]) {
      cooling.add(model);
      return { ok: false, error: { status: 429 } };
    }
    return { ok: true, model };
  };

  let current = POOL[0];
  let result = await dispatch(current);
  while (!result.ok && is429(result.error)) {
    const next = q.resolveNextFreeLink(POOL, current, {
      isCoolingDown: (id) => cooling.has(id),
    });
    if (next == null) { result = { ok: false, escalated: true }; break; }
    current = next;
    result = await dispatch(current);
  }

  assert.equal(result.ok, true);
  assert.equal(result.model, POOL[2], 'link3 = opencode-go/crouton-alpha-free');
  assert.deepEqual(dispatchLog.map((r) => r.model), [POOL[0], POOL[1], POOL[2]]);
  assert.ok(dispatchLog.every((r) => r.paid === false), 'zero paid calls');
});

test('exhaustion: all 429 -> stop+escalate with zero paid calls; FALLBACK null without explicit session-model', async () => {
  const dispatchLog = [];
  const cooling = new Set();
  const dispatch = async (model) => {
    dispatchLog.push({ model, paid: !POOL.includes(model) });
    cooling.add(model);
    return { ok: false, error: { status: 429 } };
  };

  let current = POOL[0];
  let result = await dispatch(current);
  let escalated = false;
  while (!result.ok && is429(result.error)) {
    const next = q.resolveNextFreeLink(POOL, current, {
      isCoolingDown: (id) => cooling.has(id),
    });
    if (next == null) {
      escalated = true;
      // No implicit paid fallback: only explicit session model resolves.
      const paid = q.resolveFallback(null);
      assert.equal(paid, null, 'FALLBACK/session fallback stays null without explicit session-model');
      result = { ok: false, escalated: true, paidFallback: paid };
      break;
    }
    current = next;
    result = await dispatch(current);
  }

  assert.equal(escalated, true, 'exhaustion must stop+escalate');
  assert.equal(result.ok, false);
  assert.equal(result.paidFallback, null);
  assert.equal(q.FALLBACK, null);
  assert.deepEqual(dispatchLog.map((r) => r.model), POOL);
  assert.ok(dispatchLog.every((r) => r.paid === false), 'zero paid calls on exhaustion');
  assert.equal(dispatchLog.length, 5);
});

test('secrets-never-free pinned: secret-like IDs refused/skipped, pool entries clean', () => {
  for (const id of POOL) {
    assert.equal(q.isSecretLike(id), false, `pool entry must not be secret-like: ${id}`);
  }
  const secret = `sk-${'A'.repeat(20)}`;
  assert.equal(q.isSecretLike(secret), true);
  assert.throws(() => q.assertNotSecretLike(secret), /secret-like/);
  // failover selector must not return a secret-like candidate
  const next = q.resolveNextFreeLink([POOL[0], secret, POOL[1]], POOL[0], {
    isSecretLike: q.isSecretLike,
  });
  assert.equal(next, POOL[1], 'secret-like candidate skipped in failover');
});

test('paid-gated-by-approval pinned: no implicit paid fallback; explicit session model required; denied/unsafe rejected', () => {
  assert.equal(q.FALLBACK, null);
  assert.equal(q.resolveFallback(null), null);
  assert.equal(q.resolveFallback(undefined), null);
  assert.equal(q.resolveFallback(''), null);
  // paid/denied models are never admissible as fallback without explicit safe allowlisted identity
  for (const denied of ['openai/gpt-oss-120b', 'gpt-oss-120b', 'opencode-go/muse-spark-1.3']) {
    assert.equal(q.isDeniedModel(denied), true, `denied: ${denied}`);
    assert.throws(() => q.resolveFallback(denied), /not-allowed|unknown-model|account/i);
  }
  // explicit allowlisted session model resolves (cap+ask gate is orchestrator responsibility; resolver is pure identity)
  const explicit = q.resolveFallback('opencode-go/beam-free');
  assert.deepEqual(explicit, { model: 'opencode-go/beam-free', account: 'opencode-go' });
  assert.equal(q.isAllowedModel(explicit.model), true);
  // failover never selects a denied/paid entry
  const next = q.resolveNextFreeLink(['openai/gpt-oss-120b', POOL[2]], 'missing');
  assert.equal(next, POOL[2]);
});
