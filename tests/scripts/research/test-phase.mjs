// Phase-ledger tests: authorized continuation, live deadlines, recovery
// authorization, durable handoff. Deterministic; no model calls or network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleURL = pathToFileURL(path.resolve(import.meta.dirname, '../../../scripts/research/phase.mjs')).href;
const phase = await import(moduleURL);

const T0 = Date.parse('2026-10-17T00:00:00.000Z');
const at = (minutes) => new Date(T0 + minutes * 60_000);
const iso = (minutes) => at(minutes).toISOString();
const mkTmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-phase-'));

const setup = ({
  deadlineMinutes = 60,
  allowanceMinutes = 10,
  limits,
  cumulativeLimits,
} = {}) => {
  const ledger = phase.createLedger({
    taskId: 'task-1',
    authorizationRef: 'approval-001',
    cumulativeLimits,
    now: at(0),
  });
  phase.openPhase(ledger, {
    phaseId: 'p1',
    authorizationRef: 'approval-001',
    deadlineUtc: iso(deadlineMinutes),
    observationAllowanceMs: allowanceMinutes * 60_000,
    limits,
    now: at(0),
  });
  return ledger;
};

const phaseApproval = (phaseId, authorizationRef, minutes = 31) => ({
  approved: true,
  approver: 'user',
  at: iso(minutes),
  scope: { taskId: 'task-1', phaseId, authorizationRef },
});

const retryApproval = (actionId, minutes = 7) => ({
  approved: true,
  approver: 'user',
  at: iso(minutes),
  scope: { taskId: 'task-1', phaseId: 'p1', actionId },
});

const beginFailedAttempt = (ledger, actionId, minutes = 5) => {
  const { attemptId } = phase.beginDispatch(ledger, {
    actionId, description: `${actionId} attempt`, now: at(minutes),
  });
  phase.settleDispatch(ledger, {
    attemptId,
    status: 'launch-failed',
    evidence: ['stderr: crash before step 1'],
    failure: { stage: 'step-0', message: 'harness crashed at step zero' },
    now: at(minutes + 1),
  });
  return attemptId;
};

test('a checkpoint stays inside the approved phase and is informational', () => {
  const ledger = setup();
  const before = structuredClone(ledger.phases[0]);

  phase.recordCheckpoint(ledger, { now: at(5), note: 'chunk 1 done' });

  assert.equal(ledger.phases[0].status, 'active');
  assert.equal(ledger.phases[0].authorizationRef, before.authorizationRef);
  assert.equal(ledger.phases[0].deadlineUtc, before.deadlineUtc);
  assert.equal(ledger.phases[0].checkpoints.length, 1);
  assert.equal(ledger.phases.length, 1, 'a checkpoint must not create a new phase');
  assert.equal(phase.evaluateLaunch(ledger, { now: at(6) }).allowed, true);
});

test('resume preserves the absolute deadline and cumulative usage', () => {
  const ledger = setup({ deadlineMinutes: 120 });
  phase.recordCheckpoint(ledger, {
    now: at(10), note: 'work', usage: { units: 3, tokens: 1500, wallMs: 600_000 },
  });

  const resumed = phase.resumePhase(ledger, { now: at(15) });

  assert.equal(resumed.resumed, true);
  assert.equal(resumed.deadlineUtc, iso(120));
  assert.equal(resumed.usage.units, 3);
  assert.equal(resumed.cumulativeUsage.units, 3);
  assert.equal(resumed.cumulativeUsage.tokens, 1500, 'token usage counters are allowed');
  assert.equal(ledger.phases[0].deadlineUtc, iso(120), 'resume must not reset the deadline');
  assert.equal(ledger.cumulativeUsage.units, 3, 'resume must not reset usage');
});

test('stale report timestamps cannot permit an expired launch, and clock input is validated', () => {
  const ledger = setup({ deadlineMinutes: 30 });
  ledger.lastReportAt = iso(10);
  ledger.phases[0].lastReportAt = iso(20);

  const decision = phase.evaluateLaunch(ledger, { now: at(31) });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'deadline-expired');
  assert.throws(() => phase.evaluateLaunch(ledger, { now: '2026-10-17T00:00:00.000Z' }), /invalid-clock/);
  assert.throws(() => phase.evaluateLaunch(ledger, { now: 1e300 }), /invalid-clock/);
});

test('observation allowance blocks a late launch', () => {
  const ledger = setup({ deadlineMinutes: 60, allowanceMinutes: 30 });

  const late = phase.evaluateLaunch(ledger, { now: at(40) });
  assert.equal(late.allowed, false);
  assert.equal(late.reason, 'insufficient-observation-window');
  assert.equal(late.remainingMs, 20 * 60_000);

  assert.equal(phase.evaluateLaunch(ledger, { now: at(30) }).allowed, true, 'exactly enough allowance passes');
  assert.equal(phase.evaluateLaunch(ledger, { now: at(20) }).allowed, true);

  const stricter = phase.evaluateLaunch(ledger, { now: at(20), observationMs: 45 * 60_000 });
  assert.equal(stricter.allowed, false);
  assert.equal(stricter.reason, 'insufficient-observation-window');
});

test('beginDispatch cannot bypass the launch gate and rejection preserves state', () => {
  const limited = setup({ deadlineMinutes: 60, limits: { units: 2 } });
  phase.recordCheckpoint(limited, { now: at(5), note: 'work', usage: { units: 2 } });
  assert.equal(phase.evaluateLaunch(limited, { now: at(6) }).reason, 'limit-exceeded');
  const beforeLimited = structuredClone(limited);
  assert.throws(() => phase.beginDispatch(limited, {
    actionId: 'fit', description: 'fit arm 1', now: at(6),
  }), /limit-exceeded/);
  assert.deepEqual(limited, beforeLimited, 'a rejected dispatch must not mutate the ledger');

  const late = setup({ deadlineMinutes: 60, allowanceMinutes: 30 });
  assert.equal(phase.evaluateLaunch(late, { now: at(40) }).reason, 'insufficient-observation-window');
  const beforeLate = structuredClone(late);
  assert.throws(() => phase.beginDispatch(late, {
    actionId: 'fit', description: 'fit arm 1', now: at(40),
  }), /insufficient-observation-window/);
  assert.deepEqual(late, beforeLate, 'a rejected dispatch must not mutate the ledger');

  const expired = setup({ deadlineMinutes: 30 });
  const beforeExpired = structuredClone(expired);
  assert.throws(() => phase.beginDispatch(expired, {
    actionId: 'fit', description: 'fit arm 1', now: at(31),
  }), /deadline-expired/);
  assert.deepEqual(expired, beforeExpired, 'a rejected dispatch must not mutate the ledger');

  const duplicates = setup();
  phase.beginDispatch(duplicates, {
    actionId: 'fit', description: 'fit arm 1', attemptId: 'fixed-1', now: at(5),
  });
  assert.throws(() => phase.beginDispatch(duplicates, {
    actionId: 'evaluate', description: 'evaluation', attemptId: 'fixed-1', now: at(5),
  }), /duplicate-attempt/);
});

test('an expired phase stays closed; reopening needs a separate approval bound to the phase', () => {
  const ledger = setup({ deadlineMinutes: 30 });

  const resumed = phase.resumePhase(ledger, { now: at(31) });
  assert.equal(resumed.resumed, false);
  assert.equal(resumed.reason, 'deadline-expired');
  assert.equal(ledger.phases[0].status, 'expired');
  assert.equal(ledger.activePhaseId, null);

  const before = structuredClone(ledger);
  assert.throws(() => phase.openPhase(ledger, {
    phaseId: 'p2',
    authorizationRef: 'approval-002',
    deadlineUtc: iso(120),
    observationAllowanceMs: 10 * 60_000,
    now: at(32),
  }), /approval-required/);
  assert.deepEqual(ledger, before, 'a rejected phase open must not mutate the ledger');

  assert.throws(() => phase.openPhase(ledger, {
    phaseId: 'p2',
    authorizationRef: 'approval-002',
    deadlineUtc: iso(120),
    observationAllowanceMs: 10 * 60_000,
    approval: {
      approved: true,
      approver: 'user',
      at: iso(32),
      scope: { taskId: 'task-1', phaseId: 'p2', authorizationRef: 'approval-002', actions: ['all'] },
    },
    now: at(32),
  }), /approval-required/, 'a broader approval is not an exact phase approval');

  assert.throws(() => phase.openPhase(ledger, {
    phaseId: 'p2',
    authorizationRef: 'approval-002',
    deadlineUtc: iso(120),
    observationAllowanceMs: 10 * 60_000,
    approval: phaseApproval('p2', 'approval-UNRELATED', 32),
    now: at(32),
  }), /approval-required/, 'an approval for another authorization reference is out of scope');

  phase.openPhase(ledger, {
    phaseId: 'p2',
    authorizationRef: 'approval-002',
    deadlineUtc: iso(120),
    observationAllowanceMs: 10 * 60_000,
    approval: phaseApproval('p2', 'approval-002', 32),
    now: at(32),
  });
  assert.equal(ledger.phases.length, 2);
  assert.equal(ledger.phases[0].status, 'expired');
  assert.equal(ledger.phases[0].closeout.reason, 'deadline-expired');
});

test('a new phase preserves closeout history and combined caps', () => {
  const ledger = setup({
    deadlineMinutes: 30, limits: { units: 10 }, cumulativeLimits: { units: 8 },
  });
  phase.recordCheckpoint(ledger, { now: at(5), note: 'work', usage: { units: 8 } });
  assert.equal(phase.evaluateLaunch(ledger, { now: at(6) }).reason, 'limit-exceeded');

  phase.closePhase(ledger, {
    now: at(6), status: 'completed', reason: 'budget exhausted', evidence: ['eval-1'],
  });
  const closed = structuredClone(ledger.phases[0]);

  phase.openPhase(ledger, {
    phaseId: 'p2',
    authorizationRef: 'approval-002',
    deadlineUtc: iso(120),
    observationAllowanceMs: 10 * 60_000,
    limits: { units: 10 },
    approval: phaseApproval('p2', 'approval-002', 7),
    now: at(7),
  });

  assert.deepEqual(ledger.phases[0], closed, 'historical closeout must be preserved');
  assert.equal(ledger.cumulativeUsage.units, 8, 'usage must not reset in the new phase');
  const decision = phase.evaluateLaunch(ledger, { now: at(8) });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'limit-exceeded');
  assert.equal(decision.limit, 'units');
});

test('action ids are phase-scoped: a new approved phase may repeat a completed action', () => {
  const ledger = setup({ deadlineMinutes: 30 });
  const { attemptId } = phase.beginDispatch(ledger, {
    actionId: 'fit', description: 'fit arm 1', now: at(5),
  });
  phase.settleDispatch(ledger, { attemptId, status: 'completed', evidence: ['ok'], now: at(6) });
  phase.closePhase(ledger, { now: at(7), status: 'completed', reason: 'done', evidence: ['fit'] });
  phase.openPhase(ledger, {
    phaseId: 'p2',
    authorizationRef: 'approval-002',
    deadlineUtc: iso(120),
    observationAllowanceMs: 10 * 60_000,
    approval: phaseApproval('p2', 'approval-002', 8),
    now: at(8),
  });

  const retry = phase.beginDispatch(ledger, {
    actionId: 'fit', description: 'fit arm 1 in the new phase', now: at(9),
  });
  assert.equal(retry.retryOf, null);
  assert.equal(retry.phaseId, 'p2');
});

test('uncertain completion prevents duplicate dispatch until reconciled', () => {
  const ledger = setup();
  const { attemptId } = phase.beginDispatch(ledger, {
    actionId: 'acquisition', description: 'fetch chunk', now: at(5),
  });
  phase.settleDispatch(ledger, {
    attemptId,
    status: 'uncertain',
    evidence: ['remote job id 42, no result observed'],
    now: at(6),
  });

  const before = structuredClone(ledger);
  assert.throws(() => phase.beginDispatch(ledger, {
    actionId: 'acquisition', description: 'fetch chunk again', now: at(7),
  }), /reconcile-required/);
  assert.deepEqual(ledger, before, 'a blocked re-dispatch must not mutate the ledger');
  assert.equal(phase.planRetry(ledger, { attemptId, now: at(7) }).reason, 'reconcile-required');

  phase.reconcileDispatch(ledger, {
    attemptId,
    status: 'failed',
    evidence: ['remote job log: exit 1'],
    failure: { message: 'remote job failed' },
    now: at(8),
  });
  assert.equal(phase.planRetry(ledger, { attemptId, now: at(8) }).reason, 'recovery-not-authorized');
  assert.throws(() => phase.beginDispatch(ledger, {
    actionId: 'acquisition', description: 'blind re-dispatch', now: at(9),
  }), /recovery-not-authorized/);

  // Reconciled evidence plus an explicit narrow approval is the sanctioned path.
  const recovered = phase.planRetry(ledger, {
    attemptId, approval: retryApproval('acquisition', 9), now: at(9),
  });
  assert.equal(recovered.allowed, true);
  const retry = phase.beginDispatch(ledger, {
    actionId: 'acquisition',
    description: 'fetch chunk (approved retry)',
    authorization: recovered.authorization,
    now: at(10),
  });
  assert.equal(retry.retryOf, attemptId);
});

test('a step-zero failure stops without explicit retry authorization', () => {
  const ledger = setup();
  const attemptId = beginFailedAttempt(ledger, 'fit');

  const decision = phase.planRetry(ledger, { attemptId, now: at(7) });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'recovery-not-authorized');
  assert.equal(decision.stepZero, true);
  assert.deepEqual(phase.summarizeDispatches(ledger), {
    inFlight: 0, completed: 0, failed: 0, launchFailed: 1, uncertain: 0,
  }, 'a failed launch is not a completed workload');
});

test('forged or malformed retry authorization cannot mutate state', () => {
  const ledger = setup();
  const attemptId = beginFailedAttempt(ledger, 'fit');
  const { authorization } = phase.planRetry(ledger, {
    attemptId, approval: retryApproval('fit'), now: at(7),
  });
  assert.equal(authorization.approvedAt, iso(7));

  const before = structuredClone(ledger);
  const forged = [
    { ...authorization, approved: undefined },
    { ...authorization, approver: '' },
    { ...authorization, approvedAt: 'yesterday' },
    { ...authorization, forAttemptId: 'someone-else' },
    { ...authorization, taskId: 'task-2' },
    { ...authorization, phaseId: 'p2' },
    { ...authorization, actionId: 'evaluate' },
    { taskId: 'task-1', phaseId: 'p1', actionId: 'fit', forAttemptId: attemptId },
  ];
  for (const candidate of forged) {
    assert.throws(() => phase.beginDispatch(ledger, {
      actionId: 'fit',
      description: 'fit retry',
      authorization: candidate,
      now: at(8),
    }), /recovery-not-authorized|invalid-authorization/);
  }
  assert.deepEqual(ledger, before, 'no forged authorization may add an attempt');

  const retry = phase.beginDispatch(ledger, {
    actionId: 'fit',
    description: 'fit retry',
    authorization,
    now: at(8),
  });
  assert.equal(retry.retryOf, attemptId);
  const record = ledger.phases[0].dispatches.at(-1);
  assert.equal(record.retryOf, attemptId);
  assert.deepEqual(record.approval, { approver: 'user', approvedAt: iso(7) }, 'approval evidence must persist');
});

test('narrow recovery authorizes one action and cannot expand scope', () => {
  const ledger = setup();
  const attemptId = beginFailedAttempt(ledger, 'fit');

  const broad = {
    approved: true,
    approver: 'user',
    at: iso(7),
    scope: {
      taskId: 'task-1', phaseId: 'p1', actionId: 'fit', actions: ['*'],
    },
  };
  assert.equal(phase.planRetry(ledger, { attemptId, approval: broad, now: at(7) }).allowed, false);

  const wrongPhase = {
    approved: true,
    approver: 'user',
    at: iso(7),
    scope: { taskId: 'task-1', phaseId: 'p2', actionId: 'fit' },
  };
  assert.equal(phase.planRetry(ledger, { attemptId, approval: wrongPhase, now: at(7) }).allowed, false);

  const decision = phase.planRetry(ledger, { attemptId, approval: retryApproval('fit'), now: at(7) });
  assert.equal(decision.allowed, true);
  assert.deepEqual(decision.authorization, {
    approved: true,
    taskId: 'task-1',
    phaseId: 'p1',
    actionId: 'fit',
    forAttemptId: attemptId,
    approver: 'user',
    approvedAt: iso(7),
  });

  const retry = phase.beginDispatch(ledger, {
    actionId: 'fit',
    description: 'fit arm 1 (approved retry)',
    authorization: decision.authorization,
    now: at(8),
  });
  assert.equal(retry.retryOf, attemptId);

  assert.throws(() => phase.beginDispatch(ledger, {
    actionId: 'evaluate',
    description: 'evaluation',
    authorization: decision.authorization,
    now: at(9),
  }), /invalid-authorization/, 'a retry approval cannot authorize a different action');
});

test('closed phases cannot be reopened by dispatch or settlement, except declared unresolved work', () => {
  const ledger = setup({ deadlineMinutes: 30 });
  const { attemptId } = phase.beginDispatch(ledger, {
    actionId: 'fit', description: 'fit arm 1', now: at(5),
  });

  assert.throws(() => phase.closePhase(ledger, {
    now: at(6), status: 'completed', reason: 'done', evidence: ['fit'],
  }), /unresolved-work/);

  phase.closePhase(ledger, {
    now: at(6),
    status: 'completed',
    reason: 'stopped with one attempt unresolved',
    evidence: ['fit in flight'],
    allowUnresolved: true,
  });
  assert.deepEqual(ledger.phases[0].closeout.unresolved, [attemptId]);

  assert.throws(() => phase.beginDispatch(ledger, {
    actionId: 'evaluate', description: 'evaluation', now: at(7),
  }), /no-active-phase/);

  const settled = phase.settleDispatch(ledger, {
    attemptId, status: 'completed', evidence: ['late result observed'], now: at(8),
  });
  assert.equal(settled.settledAfterCloseout, true);

  const other = setup({ deadlineMinutes: 30 });
  const otherAttempt = phase.beginDispatch(other, {
    actionId: 'fit', description: 'fit', now: at(5),
  }).attemptId;
  phase.closePhase(other, {
    now: at(6),
    status: 'completed',
    reason: 'stopped with one attempt unresolved',
    evidence: ['fit in flight'],
    allowUnresolved: true,
  });
  other.phases[0].closeout.unresolved = [];
  assert.throws(() => phase.settleDispatch(other, {
    attemptId: otherAttempt, status: 'completed', evidence: ['x'], now: at(7),
  }), /phase-not-active/, 'settlement after closeout requires a declared unresolved attempt');
});

test('resume expiry declares in-flight work so its outcome stays recordable', () => {
  const ledger = setup({ deadlineMinutes: 30 });
  const { attemptId } = phase.beginDispatch(ledger, {
    actionId: 'fit', description: 'fit arm 1', now: at(5),
  });

  const resumed = phase.resumePhase(ledger, { now: at(31) });
  assert.equal(resumed.resumed, false);
  assert.equal(ledger.phases[0].status, 'expired');
  assert.deepEqual(ledger.phases[0].closeout.unresolved, [attemptId],
    'auto-expiry must declare unresolved attempts');

  const settled = phase.settleDispatch(ledger, {
    attemptId, status: 'completed', evidence: ['late result observed'], now: at(32),
  });
  assert.equal(settled.settledAfterCloseout, true);
  assert.deepEqual(phase.summarizeDispatches(ledger), {
    inFlight: 0, completed: 1, failed: 0, launchFailed: 0, uncertain: 0,
  });
});

test('closeout with a completed status cannot be recorded after the deadline', () => {
  const ledger = setup({ deadlineMinutes: 30 });
  assert.throws(() => phase.closePhase(ledger, {
    now: at(31), status: 'completed', reason: 'late', evidence: [],
  }), /deadline-expired/);
  phase.closePhase(ledger, {
    now: at(31), status: 'expired', reason: 'deadline reached', evidence: [],
  });
  assert.equal(ledger.phases[0].status, 'expired');
});

test('delegation cannot expand authorization', () => {
  const parent = { taskId: 'task-1', phaseId: 'p1', actions: ['preprocess', 'fit'] };

  assert.equal(phase.assertDelegationWithin(parent, {
    taskId: 'task-1', phaseId: 'p1', actions: ['fit'],
  }), true);

  assert.throws(() => phase.assertDelegationWithin(parent, {
    taskId: 'task-1', phaseId: 'p1', actions: ['fit', 'publish'],
  }), /delegation-expanded/);
  assert.throws(() => phase.assertDelegationWithin(parent, {
    taskId: 'task-1', phaseId: 'p2', actions: ['fit'],
  }), /delegation-expanded/);
  assert.throws(() => phase.assertDelegationWithin(parent, {
    taskId: 'task-2', phaseId: 'p1', actions: ['fit'],
  }), /delegation-expanded/);
  assert.throws(() => phase.assertDelegationWithin(parent, {
    taskId: 'task-1', phaseId: 'p1', actions: ['fit', 'fit'],
  }), /must be unique/);
});

test('handoff round-trips authoritative state without secrets', async () => {
  const ledger = setup({ deadlineMinutes: 120 });
  phase.recordCheckpoint(ledger, {
    now: at(5), note: 'work', usage: { units: 2, tokens: 900, inputTokens: 400 },
  });
  const { attemptId } = phase.beginDispatch(ledger, {
    actionId: 'fit', description: 'fit arm 1', now: at(6),
  });

  const handoff = phase.buildHandoff(ledger, {
    nextAction: 'run evaluation sweep',
    allowedActions: ['evaluate'],
    forbiddenActions: ['publish'],
    deviations: ['chunk 3 timed out', 'artifact sk-2026-10-17-run-notes'],
    reservations: ['device:cpu'],
    sourceIdentities: { repo: 'sdlc-lean', head: 'abc123' },
    now: at(7),
  });

  assert.equal(handoff.deadlineUtc, iso(120));
  assert.equal(handoff.observationAllowanceMs, 10 * 60_000);
  assert.equal(handoff.cumulativeUsage.units, 2);
  assert.equal(handoff.inFlight[0].attemptId, attemptId);
  assert.equal(handoff.inFlight[0].phaseId, 'p1', 'briefs must carry phase identity');
  assert.equal(handoff.phaseHistory.length, 1);
  assert.equal(handoff.phaseHistory[0].authorizationRef, 'approval-001');
  assert.equal(handoff.nextAction, 'run evaluation sweep');

  const file = path.join(mkTmp(), 'handoff.json');
  await phase.writeHandoff(file, handoff);
  assert.deepEqual(await phase.readHandoff(file), handoff);

  assert.throws(() => phase.buildHandoff(ledger, {
    nextAction: 'continue',
    sourceIdentities: { apiKey: 'must-not-leak' },
    now: at(7),
  }), /secret-in-handoff/);
  assert.throws(() => phase.buildHandoff(ledger, {
    nextAction: 'continue',
    deviations: ['export AWS_SECRET_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE'],
    now: at(7),
  }), /secret-in-handoff/, 'credential-shaped values must be refused');
});

test('handoffs fail closed on missing, malformed, or misidentified state', async () => {
  const ledger = setup({ deadlineMinutes: 120 });
  phase.beginDispatch(ledger, { actionId: 'fit', description: 'fit arm 1', now: at(4) });
  const handoff = phase.buildHandoff(ledger, { nextAction: 'continue', now: at(5) });
  const dir = mkTmp();

  const missing = JSON.parse(JSON.stringify(handoff));
  delete missing.observationAllowanceMs;
  const missingFile = path.join(dir, 'missing-allowance.json');
  fs.writeFileSync(missingFile, JSON.stringify(missing));
  await assert.rejects(phase.readHandoff(missingFile), /observationAllowanceMs/);

  const junkBrief = JSON.parse(JSON.stringify(handoff));
  junkBrief.inFlight = ['junk'];
  const junkFile = path.join(dir, 'junk-brief.json');
  fs.writeFileSync(junkFile, JSON.stringify(junkBrief));
  await assert.rejects(phase.readHandoff(junkFile), /invalid-handoff/);

  const noPhaseIdentity = JSON.parse(JSON.stringify(handoff));
  delete noPhaseIdentity.inFlight[0].phaseId;
  const noPhaseFile = path.join(dir, 'no-phase-id.json');
  fs.writeFileSync(noPhaseFile, JSON.stringify(noPhaseIdentity));
  await assert.rejects(phase.readHandoff(noPhaseFile), /inFlight.phaseId/);

  const junkHistory = JSON.parse(JSON.stringify(handoff));
  junkHistory.phaseHistory = [{ phaseId: 'p1' }];
  const junkHistoryFile = path.join(dir, 'junk-history.json');
  fs.writeFileSync(junkHistoryFile, JSON.stringify(junkHistory));
  await assert.rejects(phase.readHandoff(junkHistoryFile), /phaseHistory.authorizationRef/);

  const wrongIdentity = JSON.parse(JSON.stringify(handoff));
  delete wrongIdentity.phaseId;
  const wrongFile = path.join(dir, 'wrong-identity.json');
  fs.writeFileSync(wrongFile, JSON.stringify(wrongIdentity));
  await assert.rejects(phase.readHandoff(wrongFile), /handoff.phaseId/);

  const badJson = path.join(dir, 'bad.json');
  fs.writeFileSync(badJson, '{not json');
  await assert.rejects(phase.readHandoff(badJson), /invalid-handoff/);
  await assert.rejects(phase.readHandoff(path.join(dir, 'absent.json')), /handoff-unreadable/);

  const oversized = path.join(dir, 'oversized.json');
  fs.writeFileSync(oversized, 'x'.repeat(phase.MAX_STATE_BYTES + 1));
  await assert.rejects(phase.readHandoff(oversized), /exceeds/);
});

test('malformed or missing critical state fails closed', async () => {
  const dir = mkTmp();
  await assert.rejects(phase.loadLedger(path.join(dir, 'missing.json')), /ledger-unreadable/);

  const badJson = path.join(dir, 'bad.json');
  fs.writeFileSync(badJson, '{not json');
  await assert.rejects(phase.loadLedger(badJson), /invalid-ledger/);

  const ledger = setup();
  const goodFile = path.join(dir, 'good.json');
  await phase.saveLedger(goodFile, ledger);
  const loaded = await phase.loadLedger(goodFile);
  assert.equal(loaded.phases[0].phaseId, 'p1');

  const corrupt = JSON.parse(JSON.stringify(ledger));
  corrupt.phases[0].deadlineUtc = 'next Tuesday';
  assert.throws(() => phase.validateLedger(corrupt), /invalid-deadline/);

  const missingAllowance = JSON.parse(JSON.stringify(ledger));
  delete missingAllowance.phases[0].observationAllowanceMs;
  assert.throws(() => phase.validateLedger(missingAllowance), /observationAllowanceMs/);

  const danglingActive = JSON.parse(JSON.stringify(ledger));
  danglingActive.activePhaseId = 'p9';
  assert.throws(() => phase.validateLedger(danglingActive), /activePhaseId/);

  const negativeUsage = JSON.parse(JSON.stringify(ledger));
  negativeUsage.cumulativeUsage.units = -1;
  assert.throws(() => phase.validateLedger(negativeUsage), /cumulativeUsage.units/);

  const tamperedCumulative = JSON.parse(JSON.stringify(ledger));
  tamperedCumulative.phases[0].usage.units = 5;
  assert.throws(() => phase.validateLedger(tamperedCumulative), /below the sum of phase usage/,
    'wiping cumulative usage must not reset the budget');

  const emptyLimitKey = JSON.parse(JSON.stringify(ledger));
  emptyLimitKey.cumulativeLimits = { '': 1 };
  assert.throws(() => phase.validateLedger(emptyLimitKey), /empty keys/);

  const uncertainNoEvidence = JSON.parse(JSON.stringify(ledger));
  uncertainNoEvidence.phases[0].dispatches.push({
    attemptId: 'u1',
    actionId: 'a',
    description: 'a',
    status: 'uncertain',
    startedAt: iso(1),
    settledAt: iso(2),
    evidence: [],
  });
  assert.throws(() => phase.validateLedger(uncertainNoEvidence), /must preserve evidence/);

  const duplicateAttempt = JSON.parse(JSON.stringify(ledger));
  duplicateAttempt.phases[0].dispatches.push({
    attemptId: 'same',
    actionId: 'a',
    description: 'a',
    status: 'in-flight',
    startedAt: iso(1),
  }, {
    attemptId: 'same',
    actionId: 'b',
    description: 'b',
    status: 'in-flight',
    startedAt: iso(1),
  });
  assert.throws(() => phase.validateLedger(duplicateAttempt), /duplicate attemptId/);
});

test('simulated workflow: checkpoint -> interruption -> resume -> deadline stop -> closeout', () => {
  const ledger = setup({
    deadlineMinutes: 60, allowanceMinutes: 10, cumulativeLimits: { units: 5 },
  });

  phase.recordCheckpoint(ledger, { now: at(5), note: 'stage 1', usage: { units: 2 } });
  const resumed = phase.resumePhase(ledger, { now: at(20) });
  assert.equal(resumed.resumed, true);
  assert.equal(resumed.cumulativeUsage.units, 2);

  assert.equal(phase.evaluateLaunch(ledger, { now: at(55) }).reason, 'insufficient-observation-window');

  phase.closePhase(ledger, {
    now: at(61),
    status: 'expired',
    reason: 'deadline reached below the required observation allowance',
    evidence: ['launch gate blocked at 55m'],
  });

  assert.equal(ledger.phases[0].status, 'expired');
  assert.equal(ledger.phases[0].closeout.status, 'expired');
  assert.equal(phase.evaluateLaunch(ledger, { now: at(62) }).reason, 'no-active-phase');
  assert.equal(phase.resumePhase(ledger, { now: at(63) }).resumed, false);

  const handoff = phase.buildHandoff(ledger, {
    nextAction: 'request a separately approved phase',
    forbiddenActions: ['dispatch', 'retry'],
    now: at(63),
  });
  assert.equal(handoff.stopReason, 'deadline reached below the required observation allowance');
  assert.equal(handoff.phaseStatus, 'expired');
});
