// Dynamic fallback guard tests (phase mirror) (Task 2) — additive, zero-dep.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const phaseURL = pathToFileURL(path.resolve(import.meta.dirname, '../../../scripts/research/phase.mjs')).href;
const phase = await import(phaseURL);
const quotaURL = pathToFileURL(path.resolve(import.meta.dirname, '../../../.opencode/plugins/sdlc-lean.js')).href;
const quota = await import(quotaURL);

const T0 = Date.parse('2026-10-17T00:00:00.000Z');
const at = (minutes) => new Date(T0 + minutes * 60_000);
const iso = (minutes) => at(minutes).toISOString();
const setup = ({ limits } = {}) => {
  const ledger = phase.createLedger({ taskId: 'task-df', authorizationRef: 'approval-df', now: at(0) });
  phase.openPhase(ledger, {
    phaseId: 'p1', authorizationRef: 'approval-df',
    deadlineUtc: iso(60), observationAllowanceMs: 10 * 60_000, limits, now: at(0),
  });
  return ledger;
};

test('phase dynamic fallback exports and mirror sync', () => {
  assert.equal(phase.QUOTA_FALLBACK, null);
  assert.equal(quota.FALLBACK, phase.QUOTA_FALLBACK);
  assert.equal(typeof phase.resolveQuotaFallback, 'function');
  assert.equal(typeof phase.resolveDynamicQuotaFallback, 'function');
  assert.equal(phase.resolveDynamicQuotaFallback, phase.resolveQuotaFallback);
  assert.deepEqual([...phase.QUOTA_POOL], [...quota.POOL]);
});

test('session-model resolve: allowlisted session returned', () => {
  const m = 'opencode-go/beam-free';
  assert.deepEqual(phase.resolveQuotaFallback(m), { model: m, account: 'opencode-go' });
  const m2 = 'console-openrouter/nvidia/nemotron-3.5-super-vl:free';
  assert.deepEqual(phase.resolveQuotaFallback(m2), { model: m2, account: 'console-openrouter' });
  assert.deepEqual(phase.resolveQuotaFallback({ sessionModel: m, sessionAccount: 'opencode-go' }), { model: m, account: 'opencode-go' });
  const q = 'opencode-go/foo-contributor';
  assert.deepEqual(phase.resolveQuotaFallback(q), { model: q, account: 'opencode-go' });
});

test('session-model resolve: bare id throws', () => {
  for (const id of ['gpt-oss-120b', 'muse-spark-1.3', 'opencode-go/muse-spark-1.3']) {
    assert.throws(() => phase.resolveQuotaFallback(id), /invalid-ledger|model|not-allowed/i);
  }
});

test('session-model resolve: paid denylist throws', () => {
  for (const id of ['openai/gpt-oss-120b', 'console-openrouter/gpt-oss-120b:free']) {
    assert.throws(() => phase.resolveQuotaFallback(id), /invalid-ledger|model|not-allowed/i);
  }
});

test('session-model resolve: unknown account throws; matching/derived ok', () => {
  const m = 'opencode-go/beam-free';
  assert.deepEqual(phase.resolveQuotaFallback(m, 'opencode-go'), { model: m, account: 'opencode-go' });
  assert.throws(() => phase.resolveQuotaFallback(m, 'evil-account'), /invalid-ledger|account/i);
  assert.throws(() => phase.resolveQuotaFallback(m, 'console-openrouter'), /invalid-ledger|account|mismatch/i);
  assert.deepEqual(phase.resolveQuotaFallback(m), { model: m, account: 'opencode-go' });
});

test('fail-open on unknown/undefined/non-string model', () => {
  for (const v of [null, undefined, '', '   ', 42, true, []]) {
    assert.equal(phase.resolveQuotaFallback(v), null);
  }
  assert.equal(phase.resolveQuotaFallback({}), null);
  assert.equal(phase.resolveQuotaFallback({ sessionModel: '' }), null);
  assert.equal(phase.resolveQuotaFallback(null, 'evil-account'), null);
});

test('cap accounting with dynamic identity', () => {
  const r = phase.resolveQuotaFallback('opencode-go/beam-free');
  assert.ok(r);
  const ledger = setup({ limits: { units: 1 } });
  const d = phase.beginDispatch(ledger, {
    actionId: 'a1', description: 'dispatch', model: r.model, account: r.account,
    usage: { units: 1 }, now: at(1),
  });
  assert.equal(d.model, r.model);
  assert.equal(d.account, r.account);
  const rec = ledger.phases[0].dispatches[0];
  assert.equal(rec.model, r.model);
  assert.equal(rec.account, r.account);
  assert.equal(phase.evaluateLaunch(ledger, { now: at(2) }).allowed, false);
  // paid/denylisted model refused
  assert.throws(() => phase.beginDispatch(setup(), {
    actionId: 'a1', description: 'x', model: 'openai/gpt-oss-120b', now: at(1),
  }), /model|invalid-ledger|not-allowed/i);
});

test('secrets redacted on description/evidence', () => {
  const secret = `sk-${'A'.repeat(20)}`;
  assert.throws(() => phase.beginDispatch(setup(), {
    actionId: 'a1', description: secret, now: at(1),
  }), /secret/i);
  const ledger = setup();
  const d = phase.beginDispatch(ledger, { actionId: 'a1', description: 'safe', now: at(1) });
  assert.throws(() => phase.settleDispatch(ledger, {
    attemptId: d.attemptId, status: 'completed', evidence: [secret], now: at(2),
  }), /secret/i);
  const ledger2 = setup();
  const d2 = phase.beginDispatch(ledger2, { actionId: 'a1', description: 'safe', now: at(1) });
  phase.settleDispatch(ledger2, { attemptId: d2.attemptId, status: 'uncertain', evidence: ['e'], now: at(2) });
  assert.throws(() => phase.reconcileDispatch(ledger2, {
    attemptId: d2.attemptId, status: 'completed', evidence: [secret], now: at(3),
  }), /secret/i);
  // handoff deviations
  const ledger3 = setup();
  phase.beginDispatch(ledger3, { actionId: 'fit', description: 'fit', now: at(1) });
  assert.throws(() => phase.buildHandoff(ledger3, {
    nextAction: 'continue', deviations: [secret], now: at(2),
  }), /secret/i);
});

test('fail-open additive dispatch without model/account', () => {
  const ledger = setup();
  const d = phase.beginDispatch(ledger, { actionId: 'a1', description: 'x', now: at(1) });
  assert.equal(d.model, undefined);
  assert.equal(d.account, undefined);
});

test('suffixed paid variants are denied (denylist normalization)', () => {
  for (const id of ['muse-spark-1.3-contributor', 'gpt-oss-120b-free', 'opencode-go/gpt-oss-120b-free', 'opencode-go/muse-spark-1.3-contributor', 'openai/gpt-oss-120b-free', 'console-openrouter/gpt-oss-120b:free']) {
    assert.equal(phase.isDeniedQuotaModel(id), true, id);
    assert.equal(phase.isSafeQuotaModel(id), false, id);
    assert.throws(() => phase.resolveQuotaFallback(id), /invalid-ledger|model|not-allowed/i, id);
  }
  // denylist mirror stays in sync
  assert.deepEqual([...phase.QUOTA_DENYLIST], [...quota.DENYLIST]);
});

test('TTL/staleness bound documented: revalidate before dispatch', () => {
  const src = fs.readFileSync(path.resolve(import.meta.dirname, '../../../scripts/research/phase.mjs'), 'utf8');
  assert.match(src, /revalidate/);
  assert.match(src, /beginDispatch/);
  assert.match(src, /60s|60_000|60000/);
  assert.match(src, /discovery/);
});

test('stacked suffixes are denied (loop-strip)', () => {
  for (const id of ['muse-spark-1.3-contributor-free', 'opencode-go/muse-spark-1.3-contributor-free']) {
    assert.equal(phase.isDeniedQuotaModel(id), true, id);
    assert.equal(phase.isSafeQuotaModel(id), false, id);
    assert.throws(() => phase.resolveQuotaFallback(id), /invalid-ledger|model|not-allowed/i, id);
  }
});

test('account prefix gpt-oss does not deny bare beam-free', () => {
  const hypothetical = 'gpt-oss-foo/beam-free';
  assert.equal(phase.isDeniedQuotaModel(hypothetical), false, hypothetical);
  assert.equal(phase.isSafeQuotaModel('opencode-go/beam-free'), true);
});