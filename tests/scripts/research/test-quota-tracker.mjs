// Task 3: quota-aware ledger integration (phase.mjs + quota tracker semantics).
// RED/GREEN: tests define ledger integration contracts from the approved plan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import crypto from 'node:crypto';

const phaseURL = pathToFileURL(path.resolve(import.meta.dirname, '../../../scripts/research/phase.mjs')).href;
const phase = await import(phaseURL);

const quotaURL = pathToFileURL(path.resolve(import.meta.dirname, '../../../.opencode/plugins/sdlc-lean.js')).href;
const quota = await import(quotaURL);

const evalURL = pathToFileURL(path.resolve(import.meta.dirname, '../../../eval/run.mjs')).href;
const ev = await import(evalURL);

const T0 = Date.parse('2026-10-17T00:00:00.000Z');
const at = (minutes) => new Date(T0 + minutes * 60_000);
const iso = (minutes) => at(minutes).toISOString();
const mkTmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-qh-'));

const setup = ({
  deadlineMinutes = 60,
  allowanceMinutes = 10,
  limits,
  cumulativeLimits,
} = {}) => {
  const ledger = phase.createLedger({
    taskId: 'task-q',
    authorizationRef: 'approval-q1',
    cumulativeLimits,
    now: at(0),
  });
  phase.openPhase(ledger, {
    phaseId: 'p1',
    authorizationRef: 'approval-q1',
    deadlineUtc: iso(deadlineMinutes),
    observationAllowanceMs: allowanceMinutes * 60_000,
    limits,
    now: at(0),
  });
  return ledger;
};

test('recordCheckpoint accepts usage keys passing isSecretKey guard (e.g. freeRequests)', () => {
  const ledger = setup({ deadlineMinutes: 120 });
  phase.recordCheckpoint(ledger, {
    now: at(5),
    note: 'quota tick',
    usage: { freeRequests: 3, units: 1 },
  });
  assert.equal(ledger.phases[0].usage.freeRequests, 3);
  assert.equal(ledger.cumulativeUsage.freeRequests, 3);
  // secret-like keys still refused
  const before = structuredClone(ledger);
  assert.throws(() => phase.recordCheckpoint(ledger, {
    now: at(6), note: 'bad', usage: { apiKey: 1 },
  }), /secret-like|invalid-ledger/);
  assert.deepEqual(ledger, before);
});

test('launchGate/exceededLimit sole gate: limit-exceeded blocks at cap, no auto-extend', () => {
  const ledger = setup({ limits: { freeRequests: 2 } });
  phase.recordCheckpoint(ledger, { now: at(1), note: 'use', usage: { freeRequests: 2 } });
  const decision = phase.evaluateLaunch(ledger, { now: at(2) });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'limit-exceeded');
  assert.equal(decision.limit, 'freeRequests');
  assert.equal(ledger.phases[0].limits.freeRequests, 2, 'limits must not auto-extend');
  // below cap allows
  const ledger2 = setup({ limits: { freeRequests: 2 } });
  phase.recordCheckpoint(ledger2, { now: at(1), note: 'use', usage: { freeRequests: 1 } });
  assert.equal(phase.evaluateLaunch(ledger2, { now: at(2) }).allowed, true);
});

test('beginDispatch accepts optional model/account (allowlisted strings), additive and strict when present', () => {
  const ledger = setup();
  const model = quota.POOL[0];
  const account = 'console-openrouter';
  const d = phase.beginDispatch(ledger, {
    actionId: 'a1', description: 'dispatch', model, account, now: at(5),
  });
  assert.equal(d.model, model);
  assert.equal(d.account, account);
  const record = ledger.phases[0].dispatches[0];
  assert.equal(record.model, model);
  assert.equal(record.account, account);
  // strict: unknown model refused
  assert.throws(() => phase.beginDispatch(setup(), {
    actionId: 'a1', description: 'x', model: 'openai/gpt-oss-120b', now: at(5),
  }), /model|not-allowed|unknown/);
  // strict: unknown account refused
  assert.throws(() => phase.beginDispatch(setup(), {
    actionId: 'a1', description: 'x', account: 'evil-account', now: at(5),
  }), /account|not-allowed|unknown/);
  // additive: omitting them still works
  const d2 = phase.beginDispatch(setup(), { actionId: 'a1', description: 'x', now: at(5) });
  assert.equal(d2.model, undefined);
  assert.equal(d2.account, undefined);
});

test('BRIEF/HANDOFF validation accepts model/account additive and strict when present; buildHandoff carries them', async () => {
  const ledger = setup({ deadlineMinutes: 120 });
  phase.beginDispatch(ledger, {
    actionId: 'fit', description: 'fit', model: quota.POOL[0], account: 'console-openrouter', now: at(5),
  });
  const handoff = phase.buildHandoff(ledger, { nextAction: 'continue', now: at(6) });
  assert.equal(handoff.inFlight[0].model, quota.POOL[0]);
  assert.equal(handoff.inFlight[0].account, 'console-openrouter');
  // round-trip readHandoff accepts
  const file = path.join(mkTmp(), 'h.json');
  await phase.writeHandoff(file, handoff);
  const loaded = await phase.readHandoff(file);
  assert.equal(loaded.inFlight[0].model, quota.POOL[0]);
  // strict: invalid model in handoff/brief refused on read
  const bad = JSON.parse(JSON.stringify(handoff));
  bad.inFlight[0].model = 'openai/gpt-oss-120b';
  const badFile = path.join(path.dirname(file), 'bad.json');
  fs.writeFileSync(badFile, JSON.stringify(bad));
  await assert.rejects(phase.readHandoff(badFile), /model|invalid-handoff|not-allowed/);
});

test('cooldown_until persists as checkpoint-note JSONL with strict ISO8601', () => {
  const ledger = setup({ deadlineMinutes: 120 });
  const note = JSON.stringify({
    type: 'cooldown',
    model: quota.POOL[0],
    account: 'console-openrouter',
    cooldown_until: '2026-10-17T01:05:00.000Z',
    circuit: 'OPEN',
  });
  phase.recordCheckpoint(ledger, { now: at(5), note });
  const stored = ledger.phases[0].checkpoints[0].note;
  const parsed = JSON.parse(stored);
  assert.equal(parsed.type, 'cooldown');
  assert.equal(parsed.circuit, 'OPEN');
  assert.equal(parsed.cooldown_until, '2026-10-17T01:05:00.000Z');
  assert.ok(quota.isValidCooldownUntil(parsed.cooldown_until));
  // strict ISO8601 enforced for cooldown notes
  const badNote = JSON.stringify({
    type: 'cooldown', model: quota.POOL[0], account: 'console-openrouter',
    cooldown_until: '2026-10-17T01:05:00Z', circuit: 'OPEN',
  });
  assert.throws(() => phase.recordCheckpoint(setup({ deadlineMinutes: 120 }), { now: at(5), note: badNote }),
    /cooldown_until|invalid/);
});

test('assertNoSecrets blocks secrets to free-model record', () => {
  const ledger = setup({ deadlineMinutes: 120 });
  const secret = `sk-${'A'.repeat(20)}`;
  // secrets in checkpoint notes / handoff paths refused
  assert.throws(() => phase.recordCheckpoint(ledger, {
    now: at(5), note: secret,
  }), /secret/);
  // secret-like model/account refused
  assert.throws(() => phase.beginDispatch(setup(), {
    actionId: 'a1', description: 'x', model: secret, now: at(5),
  }), /secret|model|not-allowed/);
  // handoff refuses secret values
  phase.beginDispatch(ledger, { actionId: 'fit', description: 'fit', now: at(5) });
  assert.throws(() => phase.buildHandoff(ledger, {
    nextAction: 'continue', deviations: [secret], now: at(6),
  }), /secret/);
});

test('plugin and phase quota vocab mirrors stay in sync (dynamic fallback, no muse literal)', () => {
  assert.deepEqual([...quota.POOL], [...phase.QUOTA_POOL]);
  assert.equal(quota.FALLBACK, phase.QUOTA_FALLBACK);
  assert.equal(phase.QUOTA_FALLBACK, null);
  assert.deepEqual([...quota.CIRCUIT_STATES], [...phase.QUOTA_CIRCUIT_STATES]);
  assert.equal(typeof phase.resolveQuotaFallback, 'function');
  assert.deepEqual(phase.resolveQuotaFallback(null), null);
  for (const id of phase.QUOTA_POOL) {
    const r = phase.resolveQuotaFallback(id);
    assert.ok(r && r.model === id, `round-trip ${id}`);
    assert.equal(phase.isSafeQuotaModel(r.model), true, `fallback-in-allowlist ${id}`);
  }
  for (const id of ['opencode-go/muse-spark-1.3', 'openai/gpt-oss-120b', 'gpt-oss-120b']) {
    assert.equal(phase.isSafeQuotaModel(id), false, id);
    assert.throws(() => phase.resolveQuotaFallback(id), /invalid-ledger|model|not-allowed/i);
  }
  assert.equal(phase.isDeniedQuotaModel('openai/gpt-oss-120b'), true);
});

test('assertDelegationWithin remains narrow-only', () => {
  const parent = { taskId: 'task-q', phaseId: 'p1', actions: ['a1', 'a2'] };
  assert.equal(phase.assertDelegationWithin(parent, { taskId: 'task-q', phaseId: 'p1', actions: ['a1'] }), true);
  assert.throws(() => phase.assertDelegationWithin(parent, {
    taskId: 'task-q', phaseId: 'p1', actions: ['a1', 'a3'],
  }), /delegation-expanded/);
  // model/account narrowing context still rejects expansion
  assert.throws(() => phase.assertDelegationWithin(
    { taskId: 'task-q', phaseId: 'p1', actions: ['a1'], model: quota.POOL[0] },
    { taskId: 'task-q', phaseId: 'p1', actions: ['a1', 'a2'], model: quota.POOL[0] },
  ), /delegation-expanded/);
});

test('spend accrual: N dispatches without checkpoint trip limit-exceeded', () => {
  const ledger = setup({ limits: { dispatches: 2 } });
  phase.beginDispatch(ledger, { actionId: 'a1', description: 'd1', usage: { dispatches: 1 }, now: at(1) });
  phase.beginDispatch(ledger, { actionId: 'a2', description: 'd2', usage: { dispatches: 1 }, now: at(2) });
  const gate = phase.evaluateLaunch(ledger, { now: at(3) });
  assert.equal(gate.allowed, false);
  assert.equal(gate.reason, 'limit-exceeded');
  assert.equal(gate.limit, 'dispatches');
  const l2 = setup({ limits: { dispatches: 2 } });
  phase.beginDispatch(l2, { actionId: 'a1', description: 'd1', usage: { dispatches: 1 }, now: at(1) });
  phase.beginDispatch(l2, { actionId: 'a2', description: 'd2', usage: { dispatches: 1 }, now: at(2) });
  assert.throws(() => phase.beginDispatch(l2, {
    actionId: 'a3', description: 'd3', usage: { dispatches: 1 }, now: at(3),
  }), /limit-exceeded/);
});

test('spend accrual: settleDispatch usage delta counts toward limit', () => {
  const ledger = setup({ limits: { units: 2 } });
  const d = phase.beginDispatch(ledger, { actionId: 'a1', description: 'd1', now: at(1) });
  phase.settleDispatch(ledger, { attemptId: d.attemptId, status: 'completed', evidence: ['ok'], usage: { units: 2 }, now: at(2) });
  assert.equal(phase.evaluateLaunch(ledger, { now: at(3) }).allowed, false);
});

test('secrets refused on description at begin, evidence+failure.message at settle/reconcile', () => {
  const secret = `sk-${'A'.repeat(20)}`;
  assert.throws(() => phase.beginDispatch(setup(), {
    actionId: 'a1', description: secret, now: at(1),
  }), /secret/);
  const ledger = setup();
  const d = phase.beginDispatch(ledger, { actionId: 'a1', description: 'safe', now: at(1) });
  assert.throws(() => phase.settleDispatch(ledger, {
    attemptId: d.attemptId, status: 'failed', evidence: ['ok'], failure: { message: secret }, now: at(2),
  }), /secret/);
  const ledger2 = setup();
  const d2 = phase.beginDispatch(ledger2, { actionId: 'a1', description: 'safe', now: at(1) });
  assert.throws(() => phase.settleDispatch(ledger2, {
    attemptId: d2.attemptId, status: 'completed', evidence: [secret], now: at(2),
  }), /secret/);
  const ledger3 = setup();
  const d3 = phase.beginDispatch(ledger3, { actionId: 'a1', description: 'safe', now: at(1) });
  phase.settleDispatch(ledger3, { attemptId: d3.attemptId, status: 'uncertain', evidence: ['e'], now: at(2) });
  assert.throws(() => phase.reconcileDispatch(ledger3, {
    attemptId: d3.attemptId, status: 'failed', evidence: ['ok'], failure: { message: secret }, now: at(3),
  }), /secret/);
  const ledger4 = setup();
  const d4 = phase.beginDispatch(ledger4, { actionId: 'a1', description: 'safe', now: at(1) });
  phase.settleDispatch(ledger4, { attemptId: d4.attemptId, status: 'uncertain', evidence: ['e'], now: at(2) });
  assert.throws(() => phase.reconcileDispatch(ledger4, {
    attemptId: d4.attemptId, status: 'completed', evidence: [secret], now: at(3),
  }), /secret/);
});

test('ledger IO rejects symlink-escape paths (O_NOFOLLOW/realpath containment)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-ledger-sym-'));
  const real = path.join(dir, 'real.json');
  const link = path.join(dir, 'link.json');
  fs.writeFileSync(real, JSON.stringify(phase.createLedger({ taskId: 't', authorizationRef: 'a', now: at(0) })));
  fs.symlinkSync(real, link);
  await assert.rejects(phase.loadLedger(link), /ledger-unreadable|invalid-ledger|symlink|escape|ELOOP/);
  const ledger = setup();
  await assert.rejects(phase.saveLedger(link, ledger), /ledger-unreadable|invalid-ledger|symlink|escape|ELOOP|EEXIST/);
  const handoff = phase.buildHandoff(setup({ deadlineMinutes: 120 }), { nextAction: 'n', now: at(1) });
  const hReal = path.join(dir, 'hreal.json');
  const hLink = path.join(dir, 'hlink.json');
  await phase.writeHandoff(hReal, handoff);
  fs.symlinkSync(hReal, hLink);
  await assert.rejects(phase.readHandoff(hLink), /handoff-unreadable|invalid-handoff|symlink|escape|ELOOP/);
  await assert.rejects(phase.writeHandoff(hLink, handoff), /handoff-unreadable|invalid-handoff|symlink|escape|ELOOP|EEXIST/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('closePhase asserts no secrets in reason/evidence (runtime + persisted)', async () => {
  const secret = `sk-${'A'.repeat(20)}`;
  // reason
  const ledger = setup({ deadlineMinutes: 120 });
  assert.throws(() => phase.closePhase(ledger, {
    reason: secret, evidence: [], now: at(1),
  }), /secret/);
  // evidence
  const ledger2 = setup({ deadlineMinutes: 120 });
  assert.throws(() => phase.closePhase(ledger2, {
    reason: 'ok', evidence: [secret], now: at(1),
  }), /secret/);
  // persisted closeout secret rejected on load
  const ledger3 = setup({ deadlineMinutes: 120 });
  phase.closePhase(ledger3, { reason: 'ok', evidence: ['fine'], now: at(1) });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-close-'));
  const file = path.join(dir, 'l.json');
  await phase.saveLedger(file, ledger3);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  raw.phases[0].closeout.reason = secret;
  fs.writeFileSync(file, JSON.stringify(raw));
  await assert.rejects(phase.loadLedger(file), /secret/);
  const raw2 = JSON.parse(fs.readFileSync(file, 'utf8'));
  raw2.phases[0].closeout.reason = 'ok';
  raw2.phases[0].closeout.evidence = [secret];
  fs.writeFileSync(file, JSON.stringify(raw2));
  await assert.rejects(phase.loadLedger(file), /secret/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('eval snapshotHashes/readArtifacts reject symlink escape', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-eval-sym-'));
  const real = path.join(dir, 'real.txt');
  fs.writeFileSync(real, 'hello');
  const link = path.join(dir, 'link.txt');
  fs.symlinkSync(real, link);
  assert.throws(() => ev.snapshotHashes(dir, ['link.txt']), /symlink|escape|ELOOP/);
  assert.throws(() => ev.readArtifacts(dir, ['link.txt']), /symlink|escape|ELOOP/);
  // intermediate symlink escape to outside
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-eval-out-'));
  const target = path.join(outside, 'secret.txt');
  fs.writeFileSync(target, 'secret');
  const esc = path.join(dir, 'esc');
  fs.symlinkSync(outside, esc);
  assert.throws(() => ev.readArtifacts(dir, ['esc/secret.txt']), /symlink|escape|ELOOP/);
  assert.throws(() => ev.snapshotHashes(dir, ['esc/secret.txt']), /symlink|escape|ELOOP/);
  // missing file handling preserved
  assert.deepEqual(ev.snapshotHashes(dir, ['missing.txt']), { 'missing.txt': null });
  assert.deepEqual(ev.readArtifacts(dir, ['missing.txt']), {});
  // normal file works
  fs.writeFileSync(path.join(dir, 'ok.txt'), 'ok');
  const digest = crypto.createHash('sha256').update('ok').digest('hex');
  assert.equal(ev.snapshotHashes(dir, ['ok.txt'])['ok.txt'], `sha256:${digest}`);
  assert.equal(ev.readArtifacts(dir, ['ok.txt'])['ok.txt'], 'ok');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
});
