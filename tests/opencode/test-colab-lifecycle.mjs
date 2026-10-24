// Colab lifecycle decision core: the 13 mandated mock scenarios
// (docs/plans/2026-10-12-colab-lifecycle-capability.md, spec §7) plus the
// critic-pass fix semantics (block 14).
// The core is pure: timestamps are passed in, policy outcomes come back as data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { pathToFileURL } from 'url';

const modURL = pathToFileURL(path.resolve(import.meta.dirname, '../../.opencode/skills/colab-lifecycle/lib/lifecycle.mjs')).href;
const {
  RELEASE, validateEnvelope, deriveSessionState, registerOwned,
  classifyRelease, reconcileCells, guardAction, foldRun,
} = await import(modURL);

const envelope = (over = {}) => ({
  workload: 'fine-tune-lora',
  notebookId: 'nb1',
  owner: 'me',
  accelerator: { preferred: 'T4', fallback: ['CPU'] },
  maxDurationMinutes: 30,
  cuCap: 5,
  downloads: [],
  storageDestinations: [],
  artifactPolicy: { destination: 'repo', cleanup: 'none' },
  approvedTimeOnlyFallback: false,
  ...over,
});

const activeEntry = (over = {}) => ({
  sessionId: 's1', instanceId: 'm1', notebookId: 'nb1', accelerator: 'T4',
  requestedAt: 100, releasedAt: null, evidenceState: RELEASE.REQUESTED, active: true,
  ...over,
});

test('1. successful execution → export (hash + ack) → unassign', () => {
  const r = foldRun([
    { type: 'prepared', at: 1000 },
    { type: 'connected', at: 1100 },
    { type: 'inspected', at: 1150 },
    { type: 'cell-run', ok: true, id: 'c1', at: 1200 },
    { type: 'export', path: 'out/results.csv', sha256: 'a1b2c3', ack: true, at: 1300 },
    { type: 'unassign-request', ok: true, at: 1400 },
    { type: 'bridge-disconnect', expected: true },
  ]);
  assert.equal(r.phase, 'done');
  assert.equal(r.artifacts.verified, true);
  assert.deepEqual(r.artifacts.exported, ['out/results.csv']);
  assert.equal(r.artifacts.hashes['out/results.csv'], 'a1b2c3');
  assert.equal(r.release.state, RELEASE.REQUESTED); // accepted request is NOT verified release
  assert.notEqual(r.release.state, RELEASE.VERIFIED_RELEASED);
  assert.equal(r.stopNewWork, true);
  assert.equal(r.accounting.startedAt, 1000);
  assert.equal(r.accounting.basis, 'conservative-pre-allocation');
  assert.deepEqual(r.incidents, []);
});

test('2. workload exception and cleanup (teardown attempted after failure)', () => {
  const failure = [
    { type: 'prepared', at: 1000 },
    { type: 'connected', at: 1100 },
    { type: 'inspected', at: 1150 },
    { type: 'cell-run', ok: false, id: 'c1', error: 'ValueError: boom', at: 1200 },
  ];
  const r = foldRun([...failure, { type: 'unassign-request', ok: true, at: 1300 }]);
  assert.equal(r.phase, 'failed');
  assert.ok(r.incidents.length >= 1);
  assert.equal(r.incidents[0].code, 'cell-run-failed');
  assert.equal(r.release.state, RELEASE.REQUESTED); // teardown was still attempted
  assert.equal(r.artifacts.verified, false);
  assert.equal(r.stopNewWork, true);
  // try/finally: a failure whose log has no teardown attempt must still ask for one
  const noTeardown = foldRun(failure);
  assert.equal(noTeardown.phase, 'failed');
  assert.ok(noTeardown.nextActions.includes('request-unassign'));
  assert.notEqual(noTeardown.phase, 'done');
});

test('3. timeout → aborted, incident, release attempted, manual cleanup advised', () => {
  const r = foldRun([
    { type: 'prepared', at: 1000 },
    { type: 'connected', at: 1100 },
    { type: 'inspected', at: 1150 },
    { type: 'cell-run', ok: true, id: 'c1', at: 1200 },
    { type: 'timeout', at: 1300 },
    { type: 'unassign-request', ok: true, at: 1350 },
  ]);
  assert.equal(r.phase, 'aborted');
  assert.ok(r.incidents.some((i) => i.code === 'timeout'));
  assert.equal(r.release.state, RELEASE.REQUESTED); // release attempted
  assert.equal(r.release.notifyUser, true);
  assert.equal(r.release.manualCleanup, true);
  assert.ok(r.nextActions.includes('give-manual-cleanup'));
  assert.ok(r.nextActions.includes('do-not-reconnect'));
  assert.equal(r.stopNewWork, true);
});

test('4. tool catalog reverting to bootstrap-only is unknown compute, never released', () => {
  const s = deriveSessionState({
    mcpServer: { present: true, instanceId: 'm1' },
    bridge: { connected: false },
    catalog: { mode: 'bootstrap-only' },
    notebook: { id: 'nb1' },
    runtime: { allocated: 'unknown' },
    expected: { instanceId: 'm1', notebookId: 'nb1' },
  });
  assert.equal(s.computeClaim, 'unknown');
  assert.notEqual(s.computeClaim, 'released');
  assert.ok(s.nextActions.includes('do-not-reconnect'));
  assert.deepEqual(s.mismatched, []);
  // the five dimensions stay separate
  assert.equal(s.dimensions.catalog.mode, 'bootstrap-only');
  assert.equal(s.dimensions.bridge.connected, false);
  assert.equal(s.dimensions.mcpServer.present, true);
  assert.equal(s.dimensions.notebook.id, 'nb1');
  assert.equal(s.dimensions.runtime.releaseVerified, false);
});

test('5. wrong MCP instance is refused and the registry is untouched', () => {
  const registry = [activeEntry()];
  const snapshot = structuredClone(registry);
  const r = registerOwned(registry, {
    sessionId: 's2', instanceId: 'm9', notebookId: 'nb2', accelerator: 'T4', requestedAt: 200,
  });
  assert.equal(r.ok, false);
  assert.ok(r.blockers.includes('wrong-mcp-instance'));
  assert.strictEqual(r.registry, registry); // caller never mutates another owner's session
  assert.deepEqual(r.registry, snapshot);
  assert.equal(r.activeOwned, 1);
});

test('6. missing compute rate/balance: refused unless an approved time-only fallback exists', () => {
  const caps = { rateAvailable: false, balanceAvailable: false };
  const refused = validateEnvelope(envelope({ approvedTimeOnlyFallback: false }), caps);
  assert.equal(refused.ok, false);
  assert.ok(refused.blockers.includes('cu-cap-not-verifiable'));

  const fallback = validateEnvelope(envelope({ approvedTimeOnlyFallback: true }), caps);
  assert.equal(fallback.ok, true);
  assert.equal(fallback.accounting.mode, 'time-only');
  assert.ok(fallback.warnings.some((w) => /cap/i.test(w)));

  const capped = validateEnvelope(envelope(), { rateAvailable: true, balanceAvailable: true });
  assert.equal(capped.ok, true);
  assert.equal(capped.accounting.mode, 'cu-capped');
});

test('7. artifact-export failure is an incident: unverified artifacts, no success claim', () => {
  const r = foldRun([
    { type: 'prepared', at: 1000 },
    { type: 'connected', at: 1100 },
    { type: 'cell-run', ok: true, id: 'c1', at: 1200 },
    { type: 'export', path: 'out/results.csv', ok: false, error: 'disk full', at: 1300 },
    { type: 'unassign-request', ok: true, at: 1400 },
  ]);
  assert.equal(r.artifacts.verified, false);
  assert.deepEqual(r.artifacts.hashes, {});
  assert.deepEqual(r.artifacts.exported, []);
  assert.ok(r.incidents.some((i) => i.code === 'artifact-export-failed'));
  assert.equal(r.release.state, RELEASE.REQUESTED); // teardown still requested
  assert.notEqual(r.phase, 'done');
  assert.equal(r.stopNewWork, true);
});

test('8. shutdown request failure ⇒ unverified, user notified, manual cleanup', () => {
  const r = classifyRelease([{ type: 'unassign_request', ok: false, error: 'HTTP 500' }]);
  assert.equal(r.state, RELEASE.UNVERIFIED_POSSIBLY_ALLOCATED);
  assert.equal(r.notifyUser, true);
  assert.equal(r.manualCleanup, true);
  assert.ok(r.nextActions.includes('give-manual-cleanup'));
  assert.ok(r.nextActions.includes('do-not-reconnect'));
  assert.ok(r.reasons.some((x) => x.code && /HTTP 500/.test(x.detail ?? '')));

  // the same failure inside a run fold must never be reported as done
  const folded = foldRun([{ type: 'prepared', at: 1000 }, { type: 'unassign-request', ok: false, error: 'HTTP 500' }]);
  assert.equal(folded.release.state, RELEASE.UNVERIFIED_POSSIBLY_ALLOCATED);
  assert.notEqual(folded.phase, 'done');
  assert.ok(folded.incidents.some((i) => i.code === 'release-request-failed'));
  assert.ok(folded.nextActions.includes('give-manual-cleanup'));
});

test('9. expected connection loss after shutdown is not a failure and not release proof', () => {
  const r = classifyRelease([
    { type: 'unassign_request', ok: true },
    { type: 'bridge_disconnect', expected: true },
  ]);
  assert.equal(r.state, RELEASE.REQUESTED);
  assert.notEqual(r.state, RELEASE.VERIFIED_RELEASED);
  assert.equal(r.notifyUser, true); // still unverified
  assert.equal(r.manualCleanup, true);
  assert.ok(r.nextActions.includes('do-not-reconnect'));
  for (const t of ['open-browser-connection', 'run-code']) assert.ok(!r.nextActions.includes(t));
});

test('10. unrelated/foreign sessions are refused', () => {
  const registry = [activeEntry()];
  const r = registerOwned(registry, { sessionId: '', foreign: true });
  assert.equal(r.ok, false);
  assert.ok(r.blockers.includes('unowned-session'));
  assert.strictEqual(r.registry, registry);
  assert.deepEqual(r.registry, [activeEntry()]);

  const dup = registerOwned(registry, { sessionId: 's2', instanceId: 'm1', notebookId: 'nb1' });
  assert.equal(dup.ok, false);
  assert.ok(dup.blockers.includes('duplicate-owned-allocation'));
  assert.strictEqual(dup.registry, registry);

  const g = guardAction(
    { kind: 'run-code', sessionId: 'foreign' },
    { ownedSessionIds: ['s1'], release: { state: RELEASE.REQUESTED } },
  );
  assert.equal(g.allow, false);
  assert.equal(g.reason, 'not-owned');
});

test('11. stale cell ids after runtime reload require re-resolution', () => {
  const { stale, reuse, remedy } = reconcileCells([{ id: 'c1' }, { id: 'c2' }], [{ id: 'c9' }]);
  assert.deepEqual(stale, ['c1', 'c2']); // known but gone after the reload
  assert.deepEqual(reuse, []); // c9 is new; nothing survived
  assert.equal(remedy, 're-resolve');
  assert.deepEqual(reconcileCells([{ id: 'c1' }], [{ id: 'c1' }]), {
    stale: [], reuse: ['c1'], remedy: 'none',
  });

  const r = foldRun([
    { type: 'prepared', at: 1000 },
    { type: 'connected', at: 1100 },
    { type: 'cell-run', ok: false, id: 'c1', error: 'cell-not-found after runtime reload', at: 1200 },
    { type: 'unassign-request', ok: true, at: 1300 },
  ]);
  assert.ok(r.nextActions.includes('re-resolve-cells')); // never a blind retry of the same id
});

test('12. no accidental reallocation while release is unverified', () => {
  const session = { ownedSessionIds: ['s1'], release: { state: RELEASE.REQUESTED } };
  const blocked = guardAction({ kind: 'open-browser-connection' }, session);
  assert.equal(blocked.allow, false);
  assert.equal(blocked.reason, 'release-unverified');
  assert.equal(guardAction({ kind: 'run-code', sessionId: 's1' }, session).allow, false);

  const readOnly = ['read-status', 'notify-user', 'manual-cleanup', 'request-unassign', 'export-artifacts'];
  for (const kind of readOnly) {
    assert.equal(guardAction({ kind, sessionId: 's1' }, session).allow, true, kind);
  }

  const released = { ownedSessionIds: ['s1'], release: { state: RELEASE.VERIFIED_RELEASED } };
  assert.equal(guardAction({ kind: 'export-artifacts', sessionId: 's1' }, released).allow, false);
  assert.equal(guardAction({ kind: 'read-status', sessionId: 's1' }, released).allow, true);

  const r = foldRun([{ type: 'prepared', at: 1000 }, { type: 'unassign-request', ok: true, at: 1100 }]);
  for (const t of ['open-browser-connection', 'run-code']) assert.ok(!r.nextActions.includes(t));
});

test('13. accounting is conservative; observed ≠ estimated', () => {
  const v = validateEnvelope(envelope(), { rateAvailable: true, balanceAvailable: true });
  assert.equal(v.accounting.basis, 'conservative-pre-allocation');
  assert.equal(v.accounting.mode, 'cu-capped');

  // accounting starts at the prepared timestamp, never at the first observation
  const r = foldRun([
    { type: 'prepared', at: 1000 },
    { type: 'connected', at: 1100 },
    { type: 'inspected', at: 5000 },
  ]);
  assert.equal(r.accounting.startedAt, 1000);
  assert.notEqual(r.accounting.startedAt, 5000);
  assert.equal(r.accounting.basis, 'conservative-pre-allocation');

  // an unverifiable cap becomes a named control, not a claimed unit cap
  const t = validateEnvelope(envelope({ approvedTimeOnlyFallback: true }), { rateAvailable: false, balanceAvailable: true });
  assert.equal(t.ok, true);
  assert.equal(t.accounting.mode, 'time-only');
  assert.notEqual(t.accounting.mode, 'cu-capped');
  assert.ok(t.requiredControls.some((c) => /time-only/i.test(c)));
});

test('14. verified release needs positive evidence; exports need ack AND hash', () => {
  // the only accepted positive evidence: a user confirmation
  const confirmed = classifyRelease([{ type: 'user_confirmed_released' }]);
  assert.equal(confirmed.state, RELEASE.VERIFIED_RELEASED);
  assert.equal(confirmed.notifyUser, false);
  assert.equal(confirmed.manualCleanup, false);
  for (const t of ['open-browser-connection', 'run-code']) assert.ok(!confirmed.nextActions.includes(t));

  // a runtime observed absent without an allocation to attribute is also release proof
  assert.equal(classifyRelease([{ type: 'runtime_absent', nonAllocating: true }]).state, RELEASE.VERIFIED_RELEASED);
  assert.notEqual(classifyRelease([{ type: 'runtime_absent' }]).state, RELEASE.VERIFIED_RELEASED);

  // one failed export in the same run un-verifies the artifact set
  const mixed = foldRun([
    { type: 'prepared', at: 1000 },
    { type: 'cell-run', ok: true, id: 'c1', at: 1100 },
    { type: 'export', path: 'out/ok.csv', sha256: 'aa', ack: true, at: 1200 },
    { type: 'export', path: 'out/bad.csv', ok: false, error: 'disk full', at: 1300 },
  ]);
  assert.equal(mixed.artifacts.verified, false);

  // acknowledged but unhashed is not a verified artifact
  const unhashed = foldRun([{ type: 'export', ok: true, path: 'o.csv', ack: true }]);
  assert.equal(unhashed.artifacts.verified, false);

  // a hash without a path must not invent an "undefined" key
  const pathless = foldRun([{ type: 'export', ok: true, ack: true, sha256: 'x' }]);
  assert.equal('undefined' in pathless.artifacts.hashes, false);

  // the fold must carry the user confirmation through to a verified release
  const folded = foldRun([
    { type: 'prepared', at: 1000 },
    { type: 'unassign-request', ok: true, at: 1100 },
    { type: 'user-confirmed', at: 1200 },
  ]);
  assert.equal(folded.release.state, RELEASE.VERIFIED_RELEASED);

  // `ready` is not part of the frozen interface
  assert.equal('ready' in deriveSessionState({}), false);
});
