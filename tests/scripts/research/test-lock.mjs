// Device-scoped lock tests for scripts/research/protocol.mjs (node --test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const modURL = pathToFileURL(path.resolve(import.meta.dirname, '../../../scripts/research/protocol.mjs')).href;
const mod = await import(modURL);

const mkTmp = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

// --- 1. sanitizeDeviceName ---

test('sanitizeDeviceName accepts gpu:0, cpu, gpu:1', () => {
  assert.equal(mod.sanitizeDeviceName('gpu:0'), 'gpu:0');
  assert.equal(mod.sanitizeDeviceName('cpu'), 'cpu');
  assert.equal(mod.sanitizeDeviceName('gpu:1'), 'gpu:1');
});

test('sanitizeDeviceName rejects traversal and bad names with InvalidDeviceError', () => {
  for (const bad of ['../evil', '/abs', '', 'a b', 'a/b']) {
    assert.throws(() => mod.sanitizeDeviceName(bad), mod.InvalidDeviceError, `expected InvalidDeviceError for ${JSON.stringify(bad)}`);
  }
});

test('defaultLockRoot honors XDG_CACHE_HOME', () => {
  const prev = process.env.XDG_CACHE_HOME;
  try {
    process.env.XDG_CACHE_HOME = '/tmp/fake-xdg';
    assert.equal(mod.defaultLockRoot(), path.join('/tmp/fake-xdg', 'sdlc-lean', 'locks'));
    delete process.env.XDG_CACHE_HOME;
    assert.equal(mod.defaultLockRoot(), path.join(path.join(os.homedir(), '.cache'), 'sdlc-lean', 'locks'));
  } finally {
    if (prev === undefined) delete process.env.XDG_CACHE_HOME;
    else process.env.XDG_CACHE_HOME = prev;
  }
});

// --- 2. acquire → busy → release → acquire ---

test('acquire holds; second acquire throws LockBusyError with pid; release allows re-acquire', async (t) => {
  const root = mkTmp('sdlc-lock-basic-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const h1 = await mod.acquireDeviceLock(root, 'gpu:0');
  assert.ok(h1.lockFile.endsWith('gpu:0.lock'));
  assert.equal(h1.holder.pid, process.pid);
  await assert.rejects(() => mod.acquireDeviceLock(root, 'gpu:0'), (err) => {
    assert.ok(err instanceof mod.LockBusyError, `expected LockBusyError, got ${err}`);
    assert.match(err.message, new RegExp(String(process.pid)));
    assert.match(err.message, /gpu:0\.lock/);
    return true;
  });
  await mod.releaseDeviceLock(h1);
  const h3 = await mod.acquireDeviceLock(root, 'gpu:0');
  await mod.releaseDeviceLock(h3);
});

test('release is idempotent when the lock file is already gone', async (t) => {
  const root = mkTmp('sdlc-lock-idem-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const h = await mod.acquireDeviceLock(root, 'cpu');
  await mod.releaseDeviceLock(h);
  await mod.releaseDeviceLock(h); // must resolve, not throw
});

// --- 3. competing child processes (acceptance-critical) ---

function runChild(root, protocolFileURL) {
  const script = [
    `import { acquireDeviceLock, releaseDeviceLock } from ${JSON.stringify(protocolFileURL)};`,
    `const root = ${JSON.stringify(root)};`,
    `try {`,
    `  const h = await acquireDeviceLock(root, 'gpu:0');`,
    `  console.log('held');`,
    `  await new Promise((r) => setTimeout(r, 400));`,
    `  await releaseDeviceLock(h);`,
    `} catch (e) {`,
    `  if (e && e.name === 'LockBusyError') { console.log('busy'); }`,
    `  else { console.error(String((e && e.stack) || e)); process.exit(2); }`,
    `}`,
  ].join('\n');
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-e', script], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let errOut = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { errOut += d; });
    child.on('error', reject);
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`child timed out; stdout=${JSON.stringify(out)} stderr=${JSON.stringify(errOut)}`));
    }, 5000);
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`child exited ${code}; stdout=${JSON.stringify(out)} stderr=${JSON.stringify(errOut)}`));
        return;
      }
      resolve(out.trim());
    });
  });
}

test('two competing child processes race for gpu:0: exactly one holds (x3 rounds)', { timeout: 30000 }, async (t) => {
  const root = mkTmp('sdlc-lock-race-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const rounds = [];
  for (let i = 0; i < 3; i += 1) {
    const [a, b] = await Promise.all([runChild(root, modURL), runChild(root, modURL)]);
    const sorted = [a, b].sort();
    rounds.push(sorted.join(','));
    assert.deepEqual(sorted, ['busy', 'held'], `round ${i}: expected exactly one held and one busy, got ${JSON.stringify([a, b])}`);
  }
  t.diagnostic(`race evidence rounds: ${JSON.stringify(rounds)}`);
});

// --- 4. staleness ---

function deadPid() {
  const child = spawnSync(process.execPath, ['-e', ''], { stdio: 'ignore' });
  assert.equal(child.status, 0);
  return child.pid;
}

test('dead-pid lock: stale report is informational only; acquire refuses with pid + manual hint', async (t) => {
  const root = mkTmp('sdlc-lock-dead-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(root, { recursive: true });
  const pid = deadPid();
  const lockFile = path.join(root, 'gpu:0.lock');
  const now = Date.now();
  fs.writeFileSync(lockFile, JSON.stringify({ pid, device: 'gpu:0', acquiredAt: now, heartbeatAt: now }));
  assert.equal(await mod.isLockStale(lockFile), true, 'dead-pid lock reports stale (informational only)');
  const before = fs.readFileSync(lockFile, 'utf8');
  await assert.rejects(() => mod.acquireDeviceLock(root, 'gpu:0'), (err) => {
    assert.ok(err instanceof mod.LockBusyError, `expected LockBusyError, got ${err}`);
    assert.match(err.message, new RegExp(String(pid)));
    assert.match(err.message, /remove manually after verifying no live holder/);
    return true;
  });
  assert.equal(fs.readFileSync(lockFile, 'utf8'), before, 'stale ≠ acquirable: file byte-identical');
});

test('isLockStale: live false; EPERM/EINVAL/uncertain false; malformed/non-object/unreadable/missing false; dead true', async (t) => {
  const root = mkTmp('sdlc-lock-age-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(root, { recursive: true });
  const now = Date.now();
  // Live pid (fresh or ancient heartbeat) is never stale — no age parameter exists.
  const live = path.join(root, 'gpu:0.lock');
  fs.writeFileSync(live, JSON.stringify({ pid: process.pid, device: 'gpu:0', acquiredAt: now, heartbeatAt: now }));
  assert.equal(await mod.isLockStale(live), false);
  fs.writeFileSync(live, JSON.stringify({ pid: process.pid, device: 'gpu:0', acquiredAt: now - 3600000, heartbeatAt: now - 3600000 }));
  assert.equal(await mod.isLockStale(live), false, 'live holder ignores age entirely');
  // EPERM / uncertain kill errors fail closed.
  const origKill = process.kill;
  t.after(() => { process.kill = origKill; });
  for (const code of ['EPERM', 'EINVAL', 'EAGAIN']) {
    process.kill = () => { const e = new Error(code); e.code = code; throw e; };
    assert.equal(await mod.isLockStale(live), false, `kill ${code} must fail closed`);
  }
  process.kill = origKill;
  // Invalid pid (-1, once EINVAL-aged) is never stale, old or fresh — no age fallback.
  for (const hb of [now, now - 3600000]) {
    fs.writeFileSync(live, JSON.stringify({ pid: -1, device: 'gpu:0', acquiredAt: hb, heartbeatAt: hb }));
    assert.equal(await mod.isLockStale(live), false, 'invalid pid is never stale');
  }
  // Non-object content is never stale.
  const nonObj = path.join(root, 'cpu.lock');
  fs.writeFileSync(nonObj, '42');
  assert.equal(await mod.isLockStale(nonObj), false, 'non-object lock must fail closed (not stale)');
  const bad = path.join(root, 'gpu:1.lock');
  fs.writeFileSync(bad, 'not-json{{{');
  assert.equal(await mod.isLockStale(bad), false, 'malformed lock must fail closed (not stale)');
  const badBefore = fs.readFileSync(bad, 'utf8');
  await assert.rejects(() => mod.acquireDeviceLock(root, 'gpu:1'), (err) => {
    assert.ok(err instanceof mod.LockBusyError, `expected LockBusyError, got ${err}`);
    assert.match(err.message, /gpu:1\.lock/);
    assert.match(err.message, /unknown/);
    assert.match(err.message, /remove manually after verifying no live holder/);
    return true;
  });
  assert.equal(fs.readFileSync(bad, 'utf8'), badBefore, 'failed contention must not unlink the malformed file');
  // Live-but-old lock is NOT acquirable via the acquire path (no expiry while pid lives):
  // contention must fail and leave the holder file byte-identical.
  fs.writeFileSync(live, JSON.stringify({ pid: process.pid, device: 'gpu:0', acquiredAt: now - 3600000, heartbeatAt: now - 3600000 }));
  const before = fs.readFileSync(live, 'utf8');
  await assert.rejects(() => mod.acquireDeviceLock(root, 'gpu:0'), mod.LockBusyError);
  assert.equal(fs.readFileSync(live, 'utf8'), before, 'failed contention must not unlink the live holder file');
  // Missing file: nothing to reclaim → false.
  assert.equal(await mod.isLockStale(path.join(root, 'absent.lock')), false);
  // Unreadable-as-file (directory): fail closed → false.
  assert.equal(await mod.isLockStale(root), false);
});

// --- 5. NotHolder ---

test('release by non-holder throws NotHolderError; holder release succeeds', async (t) => {
  const root = mkTmp('sdlc-lock-holder-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const h1 = await mod.acquireDeviceLock(root, 'gpu:0');
  const impostor = { lockFile: h1.lockFile, holder: { pid: h1.holder.pid + 999999, device: 'gpu:0', acquiredAt: h1.holder.acquiredAt, heartbeatAt: h1.holder.heartbeatAt } };
  await assert.rejects(() => mod.releaseDeviceLock(impostor), mod.NotHolderError);
  // Lock must still be held after the failed release.
  await assert.rejects(() => mod.acquireDeviceLock(root, 'gpu:0'), mod.LockBusyError);
  await mod.releaseDeviceLock(h1);
  const h3 = await mod.acquireDeviceLock(root, 'gpu:0');
  await mod.releaseDeviceLock(h3);
});

test('contender never deletes or acquires an exclusively-created but metadata-incomplete lock', { timeout: 10000 }, async (t) => {
  const root = mkTmp('sdlc-lock-partial-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(root, { recursive: true });
  const lockFile = path.join(root, 'gpu:0.lock');
  const ownerScript = [
    `import fs from 'node:fs';`,
    `const lockFile = ${JSON.stringify(lockFile)};`,
    `fs.writeFileSync(lockFile, '{"pid":', { flag: 'wx' });`,
    `await new Promise((r) => setTimeout(r, 1200));`,
    `fs.writeFileSync(lockFile, JSON.stringify({ pid: process.pid, device: 'gpu:0', token: 'owner-token', acquiredAt: Date.now(), heartbeatAt: Date.now() }));`,
    `await new Promise((r) => setTimeout(r, 300));`,
  ].join('\n');
  const owner = spawn(process.execPath, ['--input-type=module', '-e', ownerScript], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { try { owner.kill('SIGKILL'); } catch {} });
  const ownerDone = new Promise((resolve, reject) => {
    let errOut = '';
    owner.stderr.on('data', (d) => { errOut += d; });
    owner.on('error', reject);
    owner.on('close', (code) => {
      if (code !== 0) reject(new Error(`owner exited ${code} stderr=${JSON.stringify(errOut)}`));
      else resolve();
    });
  });
  // Wait until the partial file exists and is still partial (proves the window).
  await new Promise((r) => setTimeout(r, 400));
  const partial = fs.readFileSync(lockFile, 'utf8');
  assert.equal(partial, '{"pid":', 'owner must still hold a partial lock during the window');
  await assert.rejects(() => mod.acquireDeviceLock(root, 'gpu:0'), (err) => {
    assert.ok(err instanceof mod.LockBusyError, `expected LockBusyError, got ${err}`);
    assert.match(err.message, /gpu:0\.lock/);
    assert.match(err.message, /remove manually after verifying no live holder/);
    return true;
  });
  assert.equal(fs.readFileSync(lockFile, 'utf8'), partial, 'contender deleted nothing');
  assert.ok(fs.existsSync(lockFile), 'lockfile still exists after failed contention');
  await ownerDone;
});

test('old owner release token never deletes a successor lock', async (t) => {
  const root = mkTmp('sdlc-lock-successor-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const handleA = await mod.acquireDeviceLock(root, 'gpu:0');
  const successor = { pid: process.pid, device: 'gpu:0', token: `successor-token-${Date.now()}`, acquiredAt: Date.now(), heartbeatAt: Date.now() };
  const successorJson = JSON.stringify(successor);
  fs.writeFileSync(handleA.lockFile, successorJson);
  await assert.rejects(() => mod.releaseDeviceLock(handleA), mod.NotHolderError);
  assert.equal(fs.readFileSync(handleA.lockFile, 'utf8'), successorJson, 'old owner release must not delete the successor lock');
});

// --- G3/G4 new semantics (RED first: these fail until reclaim is removed) ---

test('G3 dead-pid lock is reported stale but acquire still refuses; file byte-identical', async (t) => {
  const root = mkTmp('sdlc-lock-noreclaim-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(root, { recursive: true });
  const pid = deadPid();
  const lockFile = path.join(root, 'gpu:0.lock');
  const now = Date.now();
  fs.writeFileSync(lockFile, JSON.stringify({ pid, device: 'gpu:0', acquiredAt: now, heartbeatAt: now }));
  assert.equal(await mod.isLockStale(lockFile), true, 'dead pid is verifiably dead → stale (informational)');
  const before = fs.readFileSync(lockFile, 'utf8');
  await assert.rejects(() => mod.acquireDeviceLock(root, 'gpu:0'), (err) => {
    assert.ok(err instanceof mod.LockBusyError, `expected LockBusyError, got ${err}`);
    return true;
  });
  assert.equal(fs.readFileSync(lockFile, 'utf8'), before, 'stale ≠ acquirable: contender must not unlink');
});

test('G3 isLockStale: missing file is false (nothing to reclaim)', async (t) => {
  const root = mkTmp('sdlc-lock-missing-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(root, { recursive: true });
  assert.equal(await mod.isLockStale(path.join(root, 'nope.lock')), false);
});

test('G4 invalid pids fail closed: acquire unknown, isLockStale false, release NotHolder + preserved', async (t) => {
  const root = mkTmp('sdlc-lock-badpid-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(root, { recursive: true });
  const now = Date.now();
  for (const [i, badPid] of ['abc', -5, 0, 1.5].entries()) {
    const device = `gpu:${i}`;
    const lockFile = path.join(root, `${device}.lock`);
    fs.writeFileSync(lockFile, JSON.stringify({ pid: badPid, device, acquiredAt: now - 3600000, heartbeatAt: now - 3600000 }));
    assert.equal(await mod.isLockStale(lockFile), false, `pid ${JSON.stringify(badPid)} must not be stale`);
    const before = fs.readFileSync(lockFile, 'utf8');
    await assert.rejects(() => mod.acquireDeviceLock(root, device), (err) => {
      assert.ok(err instanceof mod.LockBusyError, `expected LockBusyError, got ${err}`);
      assert.match(err.message, /held by pid unknown/);
      return true;
    });
    assert.equal(fs.readFileSync(lockFile, 'utf8'), before, 'failed contention must preserve the file');
    await assert.rejects(
      () => mod.releaseDeviceLock({ lockFile, holder: { pid: process.pid, device, token: 'x' } }),
      mod.NotHolderError,
    );
    assert.equal(fs.readFileSync(lockFile, 'utf8'), before, 'failed release must preserve the file');
  }
});
