// CLI tests for scripts/research/protocol.mjs (node --test, real child processes).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PROTOCOL = path.resolve(import.meta.dirname, '../../../scripts/research/protocol.mjs');
const CLUSTER_URL = new URL('../../../scripts/research/cluster.mjs', import.meta.url).href;
const clusterMod = await import(CLUSTER_URL);

const mkTmp = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

function runCli(args, { timeout = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [PROTOCOL, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', reject);
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`CLI timed out: ${JSON.stringify(args)} stdout=${JSON.stringify(stdout)} stderr=${JSON.stringify(stderr)}`));
    }, timeout);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

test('CLI hash prints sha256 hex, exit 0; missing file exits 2', { timeout: 10000 }, async (t) => {
  const dir = mkTmp('sdlc-cli-hash-');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'payload.txt');
  fs.writeFileSync(file, 'hello research');
  const expected = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const ok = await runCli(['hash', file]);
  assert.equal(ok.code, 0);
  assert.equal(ok.stdout.trim(), expected);
  const missing = await runCli(['hash', path.join(dir, 'nope.txt')]);
  assert.equal(missing.code, 2);
  assert.ok(missing.stderr.length > 0, 'missing file must write stderr');
});

test('CLI lock/unlock: hold succeeds, contender blocked (7), non-holder unlock (9)', { timeout: 10000 }, async (t) => {
  const root = mkTmp('sdlc-cli-lock-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const first = await runCli(['lock', 'gpu:0', '--lock-root', root, '--hold-ms', '100']);
  assert.equal(first.code, 0);
  assert.match(first.stdout.trim(), /^held:\d+ \(probe only\)$/);

  // Concurrent contender: background holder, then contender must exit 7.
  const holder = spawn(process.execPath, [PROTOCOL, 'lock', 'gpu:1', '--lock-root', root, '--hold-ms', '1500'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let holderOut = '';
  let holderErr = '';
  holder.stdout.on('data', (d) => { holderOut += d; });
  holder.stderr.on('data', (d) => { holderErr += d; });
  const holderDone = new Promise((resolve, reject) => {
    holder.on('error', reject);
    holder.on('close', (code) => resolve({ code, holderOut, holderErr }));
  });
  // Give the holder time to acquire before contending.
  await new Promise((r) => setTimeout(r, 300));
  const contender = await runCli(['lock', 'gpu:1', '--lock-root', root]);
  assert.equal(contender.code, 7);
  assert.match(contender.stderr, /locked-by:/);
  const held = await holderDone;
  assert.equal(held.code, 0);

  // Unlock by non-holder: hold via library in this process, child unlock must exit 9.
  const proto = await import(PROTOCOL);
  const h = await proto.acquireDeviceLock(root, 'cpu');
  try {
    const res = await runCli(['unlock', 'cpu', '--lock-root', root]);
    assert.equal(res.code, 9);
  } finally {
    await proto.releaseDeviceLock(h);
  }
});

test('CLI lock contender on unreadable lockfile exits 7 with locked-by:unknown, file preserved', { timeout: 10000 }, async (t) => {
  const root = mkTmp('sdlc-cli-lock-bad-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(root, { recursive: true });
  const lockFile = path.join(root, 'gpu:0.lock');
  fs.writeFileSync(lockFile, 'not-json{{{');
  const before = fs.readFileSync(lockFile, 'utf8');
  const contender = await runCli(['lock', 'gpu:0', '--lock-root', root]);
  assert.equal(contender.code, 7);
  assert.match(contender.stderr, /locked-by:unknown/);
  assert.equal(fs.readFileSync(lockFile, 'utf8'), before, 'contender must preserve the unreadable file');
});

test('CLI cluster prints assignments with co-clustered pairs', { timeout: 10000 }, async (t) => {
  const dir = mkTmp('sdlc-cli-cluster-');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const questions = [
    { id: 'q1', pairId: 'p1' },
    { id: 'q2', pairId: 'p1' },
    { id: 'q3' },
    { id: 'q4' },
  ];
  const file = path.join(dir, 'questions.json');
  fs.writeFileSync(file, JSON.stringify(questions));
  const res = await runCli(['cluster', file, '--seed', '7', '--k', '2']);
  assert.equal(res.code, 0);
  const parsed = JSON.parse(res.stdout);
  assert.ok(Array.isArray(parsed) && parsed.length === 4);
  for (const row of parsed) {
    assert.equal(typeof row.id, 'string');
    assert.equal(typeof row.cluster, 'number');
  }
  assert.equal(clusterMod.pairCohesion(parsed), 1);
  const badFile = path.join(dir, 'bad.json');
  fs.writeFileSync(badFile, 'not-json');
  const bad = await runCli(['cluster', badFile]);
  assert.equal(bad.code, 2);
});

test('CLI status prints run summary; missing dir exits 2', { timeout: 10000 }, async (t) => {
  const dir = mkTmp('sdlc-cli-status-');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const runDir = path.join(dir, 'run1');
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(
    path.join(runDir, 'run-log.json'),
    JSON.stringify({
      protocol: { hash: 'abc' },
      amendments: [{ kind: 'repair' }, { kind: 'correction' }],
      finalResultsSeen: true,
      status: 'completed',
      outcome: 'null',
    }),
  );
  const res = await runCli(['status', runDir]);
  assert.equal(res.code, 0);
  assert.deepEqual(JSON.parse(res.stdout), {
    protocol: 'abc',
    amendments: 2,
    finalResultsSeen: true,
    status: 'completed',
    outcome: 'null',
  });
  const missing = await runCli(['status', path.join(dir, 'nope')]);
  assert.equal(missing.code, 2);
});

test('CLI unknown subcommand exits 64 with usage on stderr', { timeout: 10000 }, async () => {
  const res = await runCli(['frobnicate']);
  assert.equal(res.code, 64);
  assert.match(res.stderr.toLowerCase(), /usage/);
  assert.match(res.stderr, /probe only/);
});
