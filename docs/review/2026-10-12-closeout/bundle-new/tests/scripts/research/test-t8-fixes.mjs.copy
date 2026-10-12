// T8 RED tests: F1-F13 (each must fail before fix, pass after).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const modURL = pathToFileURL(path.resolve(import.meta.dirname, '../../../scripts/research/protocol.mjs')).href;
const mod = await import(modURL);
const clusterURL = pathToFileURL(path.resolve(import.meta.dirname, '../../../scripts/research/cluster.mjs')).href;
const clusterMod = await import(clusterURL);
const PROTOCOL = path.resolve(import.meta.dirname, '../../../scripts/research/protocol.mjs');

const mkTmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
function deadPid() {
  const child = spawnSync(process.execPath, ['-e', ''], { stdio: 'ignore' });
  assert.equal(child.status, 0);
  return child.pid;
}
function runCli(args, { timeout = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [PROTOCOL, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', reject);
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('timeout')); }, timeout);
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
  });
}

// F1
test('F1 stableStringify honors toJSON: Date hashes as ISO string', () => {
  const d = new Date('2026-01-01T00:00:00.000Z');
  assert.equal(mod.hashObject({ d }), mod.hashObject({ d: d.toISOString() }));
  assert.notEqual(mod.hashObject({ d: new Date('2026-01-01T00:00:00.000Z') }), mod.hashObject({ d: new Date('2026-01-02T00:00:00.000Z') }));
});

// F2
test('F2 hashObject(undefined) does not throw, deterministic, equals hashObject(null)', () => {
  let a; let b;
  assert.doesNotThrow(() => { a = mod.hashObject(undefined); b = mod.hashObject(undefined); });
  assert.equal(a, b);
  assert.equal(a, mod.hashObject(null));
});

// F3
test('F3 createProtocol immune to caller mutation', async () => {
  const f = { hypothesis: 'h', seeds: { training: 1 } };
  const p = await mod.createProtocol(f);
  f.seeds.training = 2;
  assert.equal(await mod.verifyProtocol(p), true);
});

// F4
test('F4 recordAmendment bogus kind throws TypeError mentioning allowed kinds', async () => {
  const p = await mod.createProtocol({ hypothesis: 'h' });
  const log = mod.createRunLog(p);
  for (const bad of ['bogus', '', undefined]) {
    assert.throws(() => mod.recordAmendment(log, bad, 'x', 'y'), (err) => {
      assert.ok(err instanceof TypeError, `expected TypeError for ${JSON.stringify(bad)}, got ${err}`);
      assert.match(err.message, /repair/);
      assert.match(err.message, /correction/);
      assert.match(err.message, /protocol/);
      return true;
    });
  }
  // valid kinds unaffected
  mod.recordAmendment(log, 'repair', 'x', 'y');
  assert.equal(log.amendments.length, 1);
});

// F5
test('F5 contender failure leaves live-holder file byte-identical (no unlink of live lock)', async (t) => {
  const root = mkTmp('sdlc-t8-f5-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const h = await mod.acquireDeviceLock(root, 'gpu:0');
  const before = fs.readFileSync(h.lockFile, 'utf8');
  await assert.rejects(() => mod.acquireDeviceLock(root, 'gpu:0'), mod.LockBusyError);
  const after = fs.readFileSync(h.lockFile, 'utf8');
  assert.equal(after, before, 'live holder file must be byte-identical after failed contention');
  await mod.releaseDeviceLock(h);
});

// F6
test('F6 CLI --hold-ms no value or non-numeric exits 64; --k abc/0 exits 64', { timeout: 30000 }, async (t) => {
  const root = mkTmp('sdlc-t8-f6-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dir = mkTmp('sdlc-t8-f6q-');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const qf = path.join(dir, 'q.json');
  fs.writeFileSync(qf, JSON.stringify([{ id: 'q1' }, { id: 'q2' }]));
  const noVal = await runCli(['lock', 'gpu:0', '--lock-root', root, '--hold-ms']);
  assert.equal(noVal.code, 64, `--hold-ms no value must exit 64, got ${noVal.code} stderr=${noVal.stderr}`);
  assert.ok(noVal.stderr.length > 0);
  const badHold = await runCli(['lock', 'gpu:0', '--lock-root', root, '--hold-ms', 'abc']);
  assert.equal(badHold.code, 64);
  const badK = await runCli(['cluster', qf, '--k', 'abc']);
  assert.equal(badK.code, 64, `cluster --k abc must exit 64, got ${badK.code}`);
  const zeroK = await runCli(['cluster', qf, '--k', '0']);
  assert.equal(zeroK.code, 64, `cluster --k 0 must exit 64, got ${zeroK.code}`);
});

// F7
test('F7 acquire writes token, mode 0600; wrong token release throws NotHolderError without leaking token', async (t) => {
  const root = mkTmp('sdlc-t8-f7-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const h = await mod.acquireDeviceLock(root, 'gpu:0');
  const stored = JSON.parse(fs.readFileSync(h.lockFile, 'utf8'));
  assert.ok(typeof stored.token === 'string' && stored.token.length >= 8, 'lockfile must carry a token');
  assert.equal(h.holder.token, stored.token);
  assert.match(h.holder.token, /^[0-9a-f-]{8,}$/i);
  const mode = fs.statSync(h.lockFile).mode & 0o777;
  assert.equal(mode, 0o600, `lockfile mode must be 0600, got ${mode.toString(8)}`);
  // wrong token, right pid → NotHolderError
  const impostor = { lockFile: h.lockFile, holder: { ...h.holder, token: 'wrong-token-123' } };
  await assert.rejects(() => mod.releaseDeviceLock(impostor), mod.NotHolderError);
  // error message must never include the token
  try {
    await mod.releaseDeviceLock(impostor);
    assert.fail('must throw');
  } catch (err) {
    assert.ok(err instanceof mod.NotHolderError);
    assert.ok(!String(err.message).includes(stored.token), 'token must not leak into error');
    assert.ok(!String(err.message).includes('wrong-token-123'), 'token must not leak into error');
  }
  await mod.releaseDeviceLock(h);
  // stale-reclaim with legacy token-less file still works
  fs.mkdirSync(root, { recursive: true });
  const pid = deadPid();
  const now = Date.now();
  const legacy = path.join(root, 'gpu:0.lock');
  fs.writeFileSync(legacy, JSON.stringify({ pid, device: 'gpu:0', acquiredAt: now, heartbeatAt: now }));
  const h2 = await mod.acquireDeviceLock(root, 'gpu:0');
  assert.equal(h2.holder.pid, process.pid);
  await mod.releaseDeviceLock(h2);
});

// F8
test('F8 live pid + ancient heartbeat is NOT stale; dead pid + fresh is stale; EINVAL falls back to age', async (t) => {
  const root = mkTmp('sdlc-t8-f8-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(root, { recursive: true });
  const now = Date.now();
  // live + ancient
  const liveOld = path.join(root, 'a.lock');
  fs.writeFileSync(liveOld, JSON.stringify({ pid: process.pid, device: 'a', acquiredAt: now - 3600000, heartbeatAt: now - 3600000 }));
  assert.equal(await mod.isLockStale(liveOld, { maxAgeMs: 10 }), false, 'live pid must ignore age');
  // dead + fresh
  const dead = deadPid();
  const deadFresh = path.join(root, 'b.lock');
  fs.writeFileSync(deadFresh, JSON.stringify({ pid: dead, device: 'b', acquiredAt: now, heartbeatAt: now }));
  assert.equal(await mod.isLockStale(deadFresh), true, 'dead pid must be stale even when fresh');
  // EINVAL pid:-1 old → stale; fresh → not stale
  const einvalOld = path.join(root, 'c.lock');
  fs.writeFileSync(einvalOld, JSON.stringify({ pid: -1, device: 'c', acquiredAt: now - 3600000, heartbeatAt: now - 3600000 }));
  assert.equal(await mod.isLockStale(einvalOld, { maxAgeMs: 10 }), true);
  const einvalFresh = path.join(root, 'd.lock');
  fs.writeFileSync(einvalFresh, JSON.stringify({ pid: -1, device: 'd', acquiredAt: now, heartbeatAt: now }));
  assert.equal(await mod.isLockStale(einvalFresh, { maxAgeMs: 600000 }), false);
  // malformed fails closed (never stale, never reclaimed)
  const bad = path.join(root, 'e.lock');
  fs.writeFileSync(bad, 'not-json{{{');
  assert.equal(await mod.isLockStale(bad), false);
  const badBefore = fs.readFileSync(bad, 'utf8');
  await assert.rejects(() => mod.acquireDeviceLock(root, 'e'), mod.LockBusyError);
  assert.equal(fs.readFileSync(bad, 'utf8'), badBefore, 'failed contention must not unlink the malformed file');
  // acquire on live-ancient must throw LockBusyError
  const root2 = mkTmp('sdlc-t8-f8b-');
  t.after(() => fs.rmSync(root2, { recursive: true, force: true }));
  fs.mkdirSync(root2, { recursive: true });
  fs.writeFileSync(path.join(root2, 'gpu:0.lock'), JSON.stringify({ pid: process.pid, device: 'gpu:0', acquiredAt: now - 3600000, heartbeatAt: now - 3600000 }));
  await assert.rejects(() => mod.acquireDeviceLock(root2, 'gpu:0'), mod.LockBusyError);
});

// F9
test('F9 sanitizeDeviceName rejects >128 chars; 128-char valid accepted', () => {
  assert.throws(() => mod.sanitizeDeviceName('a'.repeat(200)), mod.InvalidDeviceError);
  assert.equal(mod.sanitizeDeviceName('a'.repeat(128)), 'a'.repeat(128));
});
test('F9 CLI cluster/status refuse >8MB input with exit 2', { timeout: 30000 }, async (t) => {
  const dir = mkTmp('sdlc-t8-f9-');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  // Valid questions JSON padded past 8MB (would otherwise cluster fine)
  const big = path.join(dir, 'big.json');
  const questions = [{ id: 'q1' }, { id: 'q2' }];
  let raw = JSON.stringify(questions);
  const padNeed = 8 * 1024 * 1024 + 1024 - raw.length;
  // embed padding in an extra question id so JSON stays valid
  const bigQuestions = [...questions, { id: 'pad-' + 'x'.repeat(padNeed) }];
  fs.writeFileSync(big, JSON.stringify(bigQuestions));
  assert.ok(fs.statSync(big).size > 8 * 1024 * 1024);
  const r1 = await runCli(['cluster', big]);
  assert.equal(r1.code, 2, `oversized cluster input must exit 2, got ${r1.code}`);
  assert.ok(r1.stderr.length > 0);
  // Valid run-log JSON padded past 8MB (would otherwise succeed)
  const runDir = path.join(dir, 'run1');
  fs.mkdirSync(runDir, { recursive: true });
  const logFile = path.join(runDir, 'run-log.json');
  const logObj = { protocol: { hash: 'abc' }, amendments: [], finalResultsSeen: false, status: 'completed', outcome: 'null', pad: 'y'.repeat(8 * 1024 * 1024 + 1024) };
  fs.writeFileSync(logFile, JSON.stringify(logObj));
  assert.ok(fs.statSync(logFile).size > 8 * 1024 * 1024);
  const r2 = await runCli(['status', runDir]);
  assert.equal(r2.code, 2, `oversized status input must exit 2, got ${r2.code}`);
  assert.ok(r2.stderr.length > 0);
});

// F10
test('F10 lone pairId treated as singleton: no pair draw consumed, deterministic, cohesion 1', () => {
  const withLone = [
    { id: 'q1', pairId: 'p1' },
    { id: 'q2', pairId: 'p1' },
    { id: 'q3', pairId: 'lone' },
    { id: 'q4' },
  ];
  const out = clusterMod.clusterQuestions(withLone, { seed: 7, k: 2 });
  assert.equal(clusterMod.pairCohesion(out), 1);
  const again = clusterMod.clusterQuestions(withLone, { seed: 7, k: 2 });
  assert.deepEqual(out, again);
  // lone assignment equals no-pairId assignment
  const noPair = [
    { id: 'q1', pairId: 'p1' },
    { id: 'q2', pairId: 'p1' },
    { id: 'q3' },
    { id: 'q4' },
  ];
  const out2 = clusterMod.clusterQuestions(noPair, { seed: 7, k: 2 });
  const loneCluster = out.find((a) => a.id === 'q3').cluster;
  const plainCluster = out2.find((a) => a.id === 'q3').cluster;
  assert.equal(loneCluster, plainCluster, 'lone pairId must draw as singleton');
});

// F11
test('F11 CLI via symlink resolves and runs (exit 0 + correct hex)', { timeout: 10000 }, async (t) => {
  const dir = mkTmp('sdlc-t8-f11-');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'payload.txt');
  fs.writeFileSync(file, 'hello symlink');
  const expected = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const link = path.join(dir, 'proto-link.mjs');
  fs.symlinkSync(PROTOCOL, link);
  const child = await new Promise((resolve, reject) => {
    const c = spawn(process.execPath, [link, 'hash', file], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    c.stdout.on('data', (d) => { stdout += d; });
    c.stderr.on('data', (d) => { stderr += d; });
    c.on('error', reject);
    const timer = setTimeout(() => { c.kill('SIGKILL'); reject(new Error('timeout')); }, 10000);
    c.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
  });
  assert.equal(child.code, 0, `symlinked CLI must exit 0, got ${child.code} stderr=${child.stderr}`);
  assert.equal(child.stdout.trim(), expected);
});

// F13
test('F13 checkEvidenceBundle validates four fields', () => {
  const full = { estimand: 'accuracy on split A', observations: [{ a: 1 }, { a: 2 }], leakageCheck: 'train/test disjoint', claimScope: 'split A only' };
  assert.deepEqual(mod.checkEvidenceBundle(full), { ok: true, missing: [] });
  assert.deepEqual(mod.checkEvidenceBundle({ ...full, estimand: undefined }).missing, ['estimand']);
  assert.deepEqual(mod.checkEvidenceBundle({ ...full, estimand: '' }).missing, ['estimand']);
  const noObs = mod.checkEvidenceBundle({ estimand: 'e', leakageCheck: 'l', claimScope: 'c', observations: [{ a: 1 }] });
  assert.ok(noObs.missing.includes('observations'));
  const count1 = mod.checkEvidenceBundle({ estimand: 'e', leakageCheck: 'l', claimScope: 'c', observations: { count: 1 } });
  assert.ok(count1.missing.includes('observations'));
  assert.deepEqual(mod.checkEvidenceBundle({ estimand: 'e', leakageCheck: 'l', claimScope: 'c', observations: { count: 2 } }), { ok: true, missing: [] });
  for (const key of ['estimand', 'observations', 'leakageCheck', 'claimScope']) {
    const b = { ...full };
    delete b[key];
    const r = mod.checkEvidenceBundle(b);
    assert.equal(r.ok, false);
    assert.ok(r.missing.includes(key), `${key} omission must be named`);
  }
});
