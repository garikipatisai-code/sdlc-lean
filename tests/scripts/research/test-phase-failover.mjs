// Task 3: phase/ledger failover tests (additive). Stub dispatch injection,
// no live network. Mirrors failover safety pins on scripts/research/phase.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleURL = pathToFileURL(path.resolve(import.meta.dirname, '../../../scripts/research/phase.mjs')).href;
const phase = await import(moduleURL);

const T0 = Date.parse('2026-10-17T00:00:00.000Z');
const at = (minutes) => new Date(T0 + minutes * 60_000);
const iso = (minutes) => at(minutes).toISOString();

const POOL = [
  'console-openrouter/nvidia/nemotron-3.5-super-vl:free',
  'console-openrouter2/nvidia/nemotron-3.5-super-vl:free',
  'opencode-go/crouton-alpha-free',
  'opencode-go/beam-free',
  'opencode-go/iceman-contributor-free',
];

const is429 = (err) => !!(err && typeof err === 'object' && (err.status === 429 || err.code === 'provider-error'));

const setupLedger = () => {
  const ledger = phase.createLedger({
    taskId: 'task-failover',
    authorizationRef: 'approval-failover',
    now: at(0),
  });
  phase.openPhase(ledger, {
    phaseId: 'p1',
    authorizationRef: 'approval-failover',
    deadlineUtc: iso(120),
    observationAllowanceMs: 10 * 60_000,
    now: at(0),
  });
  return ledger;
};

test('429→429→success picks link3 (crouton) with cooldown ledger notes; zero paid calls', async () => {
  const ledger = setupLedger();
  const dispatchLog = [];
  const cooling = new Set();
  const dispatch = async (model, minute) => {
    dispatchLog.push({ model, paid: !POOL.includes(model) });
    if (model === POOL[0] || model === POOL[1]) {
      cooling.add(model);
      return { ok: false, error: { status: 429 }, minute };
    }
    return { ok: true, model };
  };

  let current = POOL[0];
  let minute = 5;
  let result = await dispatch(current, minute);
  while (!result.ok && is429(result.error)) {
    // 429 -> cooldown checkpoint (advanceQuotaOn429 is the ledger seam)
    phase.advanceQuotaOn429(ledger, { model: current, account: current.split('/')[0] }, {
      now: at(minute),
      cooldownMinutes: 5,
    });
    const next = phase.resolveNextFreeLink(POOL, current, {
      isCoolingDown: (id) => cooling.has(id),
    });
    if (next == null) { result = { ok: false, escalated: true }; break; }
    minute += 1;
    current = next;
    result = await dispatch(current, minute);
  }

  assert.equal(result.ok, true);
  assert.equal(result.model, POOL[2], 'link3 = opencode-go/crouton-alpha-free');
  assert.deepEqual(dispatchLog.map((r) => r.model), [POOL[0], POOL[1], POOL[2]]);
  assert.ok(dispatchLog.every((r) => r.paid === false), 'zero paid calls');
  // two cooldown notes recorded, circuit OPEN, strict UTC
  const cooldowns = ledger.phases[0].checkpoints
    .map((c) => { try { return JSON.parse(c.note); } catch { return null; } })
    .filter((r) => r && r.type === 'cooldown');
  assert.equal(cooldowns.length, 2);
  for (const row of cooldowns) {
    assert.equal(row.circuit, 'OPEN');
    assert.match(row.cooldown_until, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    assert.ok(POOL.includes(row.model), 'cooldown model stays in free pool');
  }
});

test('exhaustion: all 429 -> stop+escalate, zero paid calls; QUOTA_FALLBACK null, no implicit paid resolve', async () => {
  const ledger = setupLedger();
  const dispatchLog = [];
  const cooling = new Set();
  const dispatch = async (model, minute) => {
    dispatchLog.push({ model, paid: !POOL.includes(model) });
    cooling.add(model);
    return { ok: false, error: { status: 429 }, minute };
  };

  let current = POOL[0];
  let minute = 5;
  let result = await dispatch(current, minute);
  let escalated = false;
  while (!result.ok && is429(result.error)) {
    phase.advanceQuotaOn429(ledger, { model: current, account: current.split('/')[0] }, {
      now: at(minute),
      cooldownMinutes: 5,
    });
    const next = phase.resolveNextFreeLink(POOL, current, {
      isCoolingDown: (id) => cooling.has(id),
    });
    if (next == null) {
      escalated = true;
      const paid = phase.resolveQuotaFallback(null);
      assert.equal(paid, null, 'no paid fallback without explicit session-model');
      result = { ok: false, escalated: true, paidFallback: paid };
      break;
    }
    minute += 1;
    current = next;
    result = await dispatch(current, minute);
  }

  assert.equal(escalated, true, 'exhaustion must stop+escalate');
  assert.equal(result.paidFallback, null);
  assert.equal(phase.QUOTA_FALLBACK, null);
  assert.deepEqual(dispatchLog.map((r) => r.model), POOL);
  assert.ok(dispatchLog.every((r) => r.paid === false), 'zero paid calls on exhaustion');
  // cooldown recorded for each failed link
  const cooldowns = ledger.phases[0].checkpoints
    .map((c) => { try { return JSON.parse(c.note); } catch { return null; } })
    .filter((r) => r && r.type === 'cooldown');
  assert.equal(cooldowns.length, 5);
});

test('secrets-never-free pinned (phase): secret-like candidates skipped; pool clean', () => {
  for (const id of POOL) {
    // phase uses SECRET_VALUE_RES guard via isSafeQuotaModel/secret checks in cooldown path;
    // selector default checks secret-like values on the id string.
    assert.equal(phase.isSafeQuotaModel(id), true, `pool entry safe: ${id}`);
  }
  // A credential-shaped value must not be selectable as a failover link
  const bearer = `Bearer ${'A'.repeat(24)}`;
  const next = phase.resolveNextFreeLink([POOL[0], bearer, POOL[1]], POOL[0]);
  assert.equal(next, POOL[1], 'secret-value candidate skipped by default guard');
  // advanceQuotaOn429 rejects secret-like model/account context
  const ledger = setupLedger();
  assert.throws(() => phase.advanceQuotaOn429(ledger, { model: `sk-${'A'.repeat(20)}`, account: 'opencode-go' }, { now: at(5) }),
    /invalid-ledger|secret/i);
});

test('paid-gated-by-approval pinned (phase): dynamic fallback only for explicit safe session; denied/paid rejected', () => {
  assert.equal(phase.QUOTA_FALLBACK, null);
  assert.equal(phase.resolveQuotaFallback(null), null);
  assert.equal(phase.resolveQuotaFallback(undefined), null);
  assert.equal(phase.resolveQuotaFallback(''), null);
  for (const denied of ['openai/gpt-oss-120b', 'gpt-oss-120b', 'opencode-go/muse-spark-1.3']) {
    assert.equal(phase.isDeniedQuotaModel(denied), true, `denied: ${denied}`);
    assert.throws(() => phase.resolveQuotaFallback(denied), /not an allowlisted|invalid-ledger|account/i);
  }
  // explicit safe session model resolves (cap+ask enforced at dispatch/orchestrator, not resolver)
  const explicit = phase.resolveQuotaFallback('opencode-go/beam-free');
  assert.deepEqual(explicit, { model: 'opencode-go/beam-free', account: 'opencode-go' });
  assert.equal(phase.isSafeQuotaModel(explicit.model), true);
  // failover never picks denied
  const next = phase.resolveNextFreeQuotaLink(['openai/gpt-oss-120b', POOL[3]], 'missing');
  assert.equal(next, POOL[3]);
});
