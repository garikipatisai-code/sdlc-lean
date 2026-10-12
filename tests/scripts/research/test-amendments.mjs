// Run-log and amendment tests for scripts/research/protocol.mjs (node --test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const modURL = pathToFileURL(path.resolve(import.meta.dirname, '../../../scripts/research/protocol.mjs')).href;
const mod = await import(modURL);

const fields = () => ({ hypothesis: 'h', splitSpec: { folds: 5 }, seeds: { training: 42 }, evalSettings: {} });

test('createRunLog starts empty: no amendments, finalResultsSeen false, gitRevision null, ISO startedAt', async () => {
  const protocol = await mod.createProtocol(fields());
  const log = mod.createRunLog(protocol);
  assert.equal(log.protocol, protocol, 'must reference the protocol passed in');
  assert.deepEqual(log.amendments, []);
  assert.equal(log.finalResultsSeen, false);
  assert.equal(log.gitRevision, null);
  assert.ok(!Number.isNaN(Date.parse(log.startedAt)), 'startedAt must be a valid ISO timestamp');
});

test('recordAmendment appends {kind, detail, approver, at} entries in order with ISO timestamps', async () => {
  const protocol = await mod.createProtocol(fields());
  const log = mod.createRunLog(protocol);
  const first = mod.recordAmendment(log, 'repair', 'note one', 'alice');
  const second = mod.recordAmendment(log, 'correction', 'note two', 'bob');
  assert.equal(first, log, 'must return the same log object');
  assert.equal(second, log);
  assert.equal(log.amendments.length, 2);
  assert.deepEqual(
    log.amendments.map((a) => [a.kind, a.detail, a.approver]),
    [['repair', 'note one', 'alice'], ['correction', 'note two', 'bob']],
    'amendments must keep insertion order',
  );
  for (const amendment of log.amendments) {
    assert.ok(!Number.isNaN(Date.parse(amendment.at)), 'amendment.at must be a valid ISO timestamp');
  }
  assert.ok(log.amendments[0].at <= log.amendments[1].at, 'timestamps must be non-decreasing');
});

test("assertAmendmentAllowed: 'protocol' is allowed before final results", async () => {
  const protocol = await mod.createProtocol(fields());
  const log = mod.createRunLog(protocol);
  assert.doesNotThrow(() => mod.assertAmendmentAllowed(log, 'protocol'));
  assert.doesNotThrow(() => mod.recordAmendment(log, 'protocol', 're-freeze 2', 'alice'));
  assert.equal(log.amendments.length, 1);
});

test("assertAmendmentAllowed: 'protocol' is blocked after final results, with kind in the error", async () => {
  const protocol = await mod.createProtocol(fields());
  const log = mod.createRunLog(protocol);
  mod.markFinalResults(log);
  assert.throws(
    () => mod.assertAmendmentAllowed(log, 'protocol'),
    (err) => {
      assert.ok(err instanceof mod.ProtocolAmendmentBlockedError, 'must throw the exported error class');
      assert.match(err.message, /protocol/);
      assert.match(err.message, /final results/);
      return true;
    },
  );
});

test('recordAmendment rejects a post-results protocol amendment and records nothing', async () => {
  const protocol = await mod.createProtocol(fields());
  const log = mod.createRunLog(protocol);
  mod.markFinalResults(log);
  assert.throws(() => mod.recordAmendment(log, 'protocol', 'tweak seeds', 'alice'), mod.ProtocolAmendmentBlockedError);
  assert.deepEqual(log.amendments, [], 'blocked amendment must not be logged');
});

test("'correction' stays allowed after final results (accepted and logged)", async () => {
  const protocol = await mod.createProtocol(fields());
  const log = mod.createRunLog(protocol);
  mod.markFinalResults(log);
  const after = mod.recordAmendment(log, 'correction', 're-derived score', 'bob');
  assert.equal(after, log);
  assert.equal(log.amendments.length, 1);
  assert.equal(log.amendments[0].kind, 'correction');
});

test("'repair' is allowed both before and after final results", async () => {
  const protocol = await mod.createProtocol(fields());
  const log = mod.createRunLog(protocol);
  mod.recordAmendment(log, 'repair', 'fix ledger', 'carol');
  mod.markFinalResults(log);
  mod.recordAmendment(log, 'repair', 'fix evidence archive', 'dave');
  assert.deepEqual(log.amendments.map((a) => a.kind), ['repair', 'repair']);
});

test('markFinalResults sets the flag and returns the log', async () => {
  const protocol = await mod.createProtocol(fields());
  const log = mod.createRunLog(protocol);
  assert.equal(mod.markFinalResults(log), log);
  assert.equal(log.finalResultsSeen, true);
});
