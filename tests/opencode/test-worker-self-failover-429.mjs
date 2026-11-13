// Task 4: worker self-failover on 429 (additive, hermetic). Stub dispatch
// injection only, no live network. RED: file absent → GREEN: all pass.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const pluginURL = pathToFileURL(path.resolve(import.meta.dirname, '../../.opencode/plugins/sdlc-lean.js')).href;
const phaseURL = pathToFileURL(path.resolve(import.meta.dirname, '../../scripts/research/phase.mjs')).href;
const plugin = await import(pluginURL);
const phase = await import(phaseURL);

const POOL = [
  'console-openrouter/nvidia/nemotron-3.5-super-vl:free',
  'console-openrouter2/nvidia/nemotron-3.5-super-vl:free',
  'opencode-go/crouton-alpha-free',
  'opencode-go/beam-free',
  'opencode-go/iceman-contributor-free',
];

const T0 = Date.parse('2026-10-17T00:00:00.000Z');
const at = (minutes) => new Date(T0 + minutes * 60_000);
const iso = (minutes) => at(minutes).toISOString();

const STRICT_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const setupLedger = () => {
  const ledger = phase.createLedger({
    taskId: 'task-worker-self-failover-429',
    authorizationRef: 'approval-self-failover-429',
    now: at(0),
  });
  phase.openPhase(ledger, {
    phaseId: 'p1',
    authorizationRef: 'approval-self-failover-429',
    deadlineUtc: iso(120),
    observationAllowanceMs: 10 * 60_000,
    now: at(0),
  });
  return ledger;
};

test('429 pool[0] → next link pool[1]; failed+cooling skipped; cooldown note shape {type,circuit OPEN,cooldown_until strict UTC, model in free pool}', async () => {
  const ledger = setupLedger();
  const dispatchLog = [];
  const cooling = new Set();
  const dispatch = async (model) => {
    dispatchLog.push({ model, paid: !POOL.includes(model) });
    if (model === POOL[0]) {
      cooling.add(model);
      return { ok: false, error: { status: 429 } };
    }
    return { ok: true, model };
  };

  let current = POOL[0];
  let result = await dispatch(current);
  if (!result.ok && plugin.classifyQuotaError(result.error)) {
    // record cooldown note in existing phase ledger (cooldown store reuse)
    phase.advanceQuotaOn429(ledger, { model: current, account: current.split('/')[0] }, {
      now: at(5),
      cooldownMinutes: 5,
    });
    const hop = plugin.onWorkerQuotaError(POOL, current, {
      err: result.error,
      isCoolingDown: (id) => cooling.has(id),
    });
    assert.equal(hop.escalated, false);
    assert.equal(hop.cooledUntil, null);
    assert.equal(hop.nextLink, POOL[1], 'failed+cooling pool[0] skipped → pool[1]');
    current = hop.nextLink;
    result = await dispatch(current);
  }

  assert.equal(result.ok, true);
  assert.equal(result.model, POOL[1]);
  assert.deepEqual(dispatchLog.map((r) => r.model), [POOL[0], POOL[1]]);
  assert.ok(dispatchLog.every((r) => r.paid === false), 'zero paid calls');

  const cooldowns = ledger.phases[0].checkpoints
    .map((c) => { try { return JSON.parse(c.note); } catch { return null; } })
    .filter((r) => r && r.type === 'cooldown');
  assert.equal(cooldowns.length, 1);
  const note = cooldowns[0];
  assert.equal(note.type, 'cooldown');
  assert.equal(note.circuit, 'OPEN');
  assert.equal(typeof note.cooldown_until, 'string');
  assert.match(note.cooldown_until, STRICT_UTC, 'cooldown_until strict UTC');
  assert.equal(Date.parse(note.cooldown_until), Date.parse(note.cooldown_until));
  assert.ok(POOL.includes(note.model), 'model in free pool');
});

test('second 429 → pool[2]; exhaustion → null escalated:true zero paid calls, resolveFallback(null) null, QUOTA_FALLBACK null', async () => {
  const ledger = setupLedger();
  const dispatchLog = [];
  const cooling = new Set();

  // first 429: pool[0] -> pool[1]
  const dispatch1 = async (model) => {
    dispatchLog.push({ model, paid: !POOL.includes(model) });
    if (model === POOL[0]) { cooling.add(model); return { ok: false, error: { status: 429 } }; }
    if (model === POOL[1]) { cooling.add(model); return { ok: false, error: { status: 429 } }; }
    return { ok: true, model };
  };

  let current = POOL[0];
  let result = await dispatch1(current);
  // 429 #1
  phase.advanceQuotaOn429(ledger, { model: current, account: current.split('/')[0] }, { now: at(5), cooldownMinutes: 5 });
  let hop = plugin.onWorkerQuotaError(POOL, current, { err: result.error, isCoolingDown: (id) => cooling.has(id) });
  assert.equal(hop.nextLink, POOL[1]);
  assert.equal(hop.escalated, false);
  current = hop.nextLink;
  result = await dispatch1(current);

  // 429 #2 → pool[2]
  assert.equal(result.ok, false);
  phase.advanceQuotaOn429(ledger, { model: current, account: current.split('/')[0] }, { now: at(6), cooldownMinutes: 5 });
  hop = plugin.onWorkerQuotaError(POOL, current, { err: result.error, isCoolingDown: (id) => cooling.has(id) });
  assert.equal(hop.nextLink, POOL[2], 'second 429 → pool[2]');
  assert.equal(hop.escalated, false);
  current = hop.nextLink;
  result = await dispatch1(current);
  assert.equal(result.ok, true);
  assert.equal(result.model, POOL[2]);

  // exhaustion: all 429
  const exhaustLog = [];
  const coolingAll = new Set();
  const dispatchAll = async (model) => {
    exhaustLog.push({ model, paid: !POOL.includes(model) });
    coolingAll.add(model);
    return { ok: false, error: { status: 429 } };
  };
  let cur = POOL[0];
  let res = await dispatchAll(cur);
  let escalatedHop = null;
  while (!res.ok && plugin.classifyQuotaError(res.error)) {
    const h = plugin.onWorkerQuotaError(POOL, cur, { err: res.error, isCoolingDown: (id) => coolingAll.has(id) });
    if (h.nextLink == null) { escalatedHop = h; res = { ok: false, escalated: true }; break; }
    cur = h.nextLink;
    res = await dispatchAll(cur);
  }
  assert.ok(escalatedHop, 'exhaustion must produce escalated hop');
  assert.equal(escalatedHop.nextLink, null);
  assert.equal(escalatedHop.escalated, true);
  assert.equal(typeof escalatedHop.cooledUntil, 'string');
  assert.match(escalatedHop.cooledUntil, STRICT_UTC, 'cooledUntil strict UTC on escalation');
  assert.equal(plugin.resolveFallback(null), null);
  assert.equal(plugin.QUOTA_FALLBACK, null);
  assert.equal(phase.resolveQuotaFallback(null), null);
  assert.equal(phase.QUOTA_FALLBACK, null);
  assert.deepEqual(exhaustLog.map((r) => r.model), POOL, 'walked whole pool');
  assert.ok(exhaustLog.every((r) => r.paid === false), 'zero paid calls on exhaustion');
});

test('non-429 → no failover; secret-like + paid/denied candidates skipped; stale-pool revalidate isSafeModel', () => {
  // non-429: no failover, no cooldown, no spend
  for (const err of [{ status: 500 }, { status: 403 }, { code: 'billing' }, new Error('boom'), null, undefined]) {
    const hop = plugin.onWorkerQuotaError(POOL, POOL[0], { err });
    assert.deepEqual(hop, { nextLink: null, cooledUntil: null, escalated: false }, `non-429 must not failover: ${JSON.stringify(err)}`);
  }

  // secret-like + paid/denied candidates skipped
  const secret = `sk-${'A'.repeat(24)}`;
  assert.equal(plugin.isSecretLike(secret), true);
  assert.equal(phase.isSafeQuotaModel(secret), false);
  const denied = ['openai/gpt-oss-120b', 'gpt-oss-120b', 'opencode-go/muse-spark-1.3'];
  for (const d of denied) {
    assert.equal(plugin.isDeniedModel(d), true, `denied: ${d}`);
    assert.equal(plugin.isSafeModel(d), false, `unsafe denied: ${d}`);
  }
  // failover skips secret-like and denied, lands on safe free pool entry
  const mixed = [POOL[0], secret, 'openai/gpt-oss-120b', POOL[2]];
  const hopSecret = plugin.onWorkerQuotaError(mixed, POOL[0], { err: { status: 429 } });
  assert.equal(hopSecret.nextLink, POOL[2], 'secret-like + paid/denied skipped');
  assert.equal(hopSecret.escalated, false);

  // stale-pool revalidate isSafeModel: stale/unsafe entries never selected
  const stalePool = [POOL[0], 'http://evil.example/leak', 'unknown-bare-id', secret, 'openai/gpt-oss-120b', POOL[3]];
  for (const id of stalePool) {
    if (id === POOL[0] || id === POOL[3]) continue;
    // stale/unsafe must fail revalidation gate (or be rejected by selector guards)
    const safe = plugin.isSafeModel(id);
    const secretLike = plugin.isSecretLike(id);
    assert.ok(!safe || secretLike || plugin.isDeniedModel(id) || !plugin.isQualifiedModelId(id),
      `stale/unsafe must not be safely reusable: ${id}`);
  }
  const staleHop = plugin.onWorkerQuotaError(stalePool, POOL[0], { err: { status: 429 } });
  assert.equal(staleHop.nextLink, POOL[3], 'stale-pool revalidate skips unsafe, selects safe free link');
  assert.equal(plugin.isSafeModel(staleHop.nextLink), true);
  assert.ok(POOL.includes(staleHop.nextLink), 'selected link is in validated free pool');
});
