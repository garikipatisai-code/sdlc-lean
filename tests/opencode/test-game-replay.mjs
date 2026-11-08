import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';

// Replay harness contract: seed + input log -> state hash, proving the starter
// sim is deterministic. Reuses games/starter/sim.js (read-only).

const root = path.resolve(import.meta.dirname, '../..');
const simPath = path.join(root, 'games/starter/sim.js');
const replayPath = path.join(root, 'scripts/game-replay.mjs');

const { createState, step, runSim, hashState } = await import(simPath);

const TICK = 1 / 60;
const MAX_ACCUMULATOR = 0.25;
const SEED = 7;
const TICKS = 600;
const HASH_RE = /^stateHash:([0-9a-f]{8})$/;

// Deterministic pseudo input log: one {tick, actions} entry per tick.
function buildInputLog(ticks, seed) {
  const log = [];
  let s = seed >>> 0;
  for (let t = 0; t < ticks; t += 1) {
    s = (s + 0x6d2b79f5) | 0;
    let r = s;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r = (r + Math.imul(r ^ (r >>> 7), r | 61)) ^ r;
    const v = ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    const actions = {};
    if (v < 0.25) actions.forward = true;
    else if (v < 0.5) actions.back = true;
    if (v < 0.125) actions.left = true;
    if (v > 0.875) actions.right = true;
    log.push({ tick: t, actions });
  }
  return log;
}

function writeTempInputLog(log) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'game-replay-'));
  const file = path.join(dir, 'input.json');
  fs.writeFileSync(file, JSON.stringify(log));
  return file;
}

function cleanupInputLog(file) {
  fs.rmSync(file, { force: true });
  fs.rmSync(path.dirname(file), { recursive: true, force: true });
}

function runReplay(seed, ticks, inputPath) {
  const out = execFileSync(process.execPath, [replayPath, '--seed', String(seed), '--ticks', String(ticks), '--input', inputPath], { encoding: 'utf8' });
  const m = out.trim().match(HASH_RE);
  assert.ok(m, `replay script did not print stateHash; stdout:\n${out}`);
  return m[1];
}

// Drive the sim tick-by-tick with per-tick actions (mirrors scripts/game-replay.mjs).
function inProcessReplay(seed, ticks, log) {
  const state = createState(seed);
  let acc = 0;
  for (let i = 0; i < ticks; i += 1) {
    acc += TICK;
    if (acc > MAX_ACCUMULATOR) acc = MAX_ACCUMULATOR;
    const actions = log[i] && log[i].actions ? log[i].actions : {};
    while (acc >= TICK) {
      step(state, TICK, actions);
      acc -= TICK;
    }
  }
  return hashState(state);
}

test('starter sim is deterministic: same seed -> same state hash', () => {
  const a = hashState(runSim({ ticks: TICKS, seed: SEED }));
  const b = hashState(runSim({ ticks: TICKS, seed: SEED }));
  assert.strictEqual(a, b);
  assert.ok(HASH_RE.test(`stateHash:${a}`), `hash must be 8 hex chars, got ${a}`);
});

test('game-replay script prints stateHash for seed + input log', () => {
  const log = buildInputLog(TICKS, SEED);
  const inputPath = writeTempInputLog(log);
  try {
    const hash = runReplay(SEED, TICKS, inputPath);
    assert.ok(/^[0-9a-f]{8}$/.test(hash), `replay hash must be 8 hex chars, got ${hash}`);
  } finally {
    cleanupInputLog(inputPath);
  }
});

test('replay hash is stable across runs', () => {
  const log = buildInputLog(TICKS, SEED);
  const inputPath = writeTempInputLog(log);
  try {
    const h1 = runReplay(SEED, TICKS, inputPath);
    const h2 = runReplay(SEED, TICKS, inputPath);
    assert.strictEqual(h1, h2, 'replay hash must be stable across runs');
  } finally {
    cleanupInputLog(inputPath);
  }
});

test('sim exports TICK as 1/60 for render', async () => {
  const mod = await import(simPath);
  assert.strictEqual(mod.TICK, 1 / 60);
});

test('sim CLI works via relative path', () => {
  const rel = path.relative(root, simPath);
  const out = execFileSync(process.execPath, [rel, '--ticks', String(TICKS), '--seed', String(SEED)], { cwd: root, encoding: 'utf8' });
  assert.ok(HASH_RE.test(out.trim()), `sim CLI did not print stateHash; stdout:\n${out}`);
});

test('game-replay CLI works via relative path', () => {
  const log = buildInputLog(TICKS, SEED);
  const inputPath = writeTempInputLog(log);
  const rel = path.relative(root, replayPath);
  try {
    const out = execFileSync(process.execPath, [rel, '--seed', String(SEED), '--ticks', String(TICKS), '--input', inputPath], { cwd: root, encoding: 'utf8' });
    assert.ok(HASH_RE.test(out.trim()), `replay CLI did not print stateHash; stdout:\n${out}`);
  } finally {
    cleanupInputLog(inputPath);
  }
});

test('game-replay fails closed on malformed input log', () => {
  const cases = [
    [{ actions: {} }], // missing tick
    [{ tick: '1', actions: {} }], // non-numeric tick
    [null], // null entry
    [{ tick: 1 }], // missing actions
    [{ tick: 1, actions: 'forward' }], // non-object actions
  ];
  for (const bad of cases) {
    const inputPath = writeTempInputLog(bad);
    try {
      const res = spawnSync(process.execPath, [replayPath, '--seed', String(SEED), '--ticks', String(TICKS), '--input', inputPath], { encoding: 'utf8' });
      assert.notStrictEqual(res.status, 0, `malformed ${JSON.stringify(bad)} should fail closed (status ${res.status}, stdout: ${res.stdout})`);
    } finally {
      cleanupInputLog(inputPath);
    }
  }
});

test('render module loads without DOM and exports frame/draw with full snapshot', async () => {
  const renderPath = path.join(root, 'games/starter/render.js');
  const mod = await import(renderPath);
  assert.strictEqual(typeof mod.frame, 'function', 'render must export frame');
  assert.strictEqual(typeof mod.draw, 'function', 'render must export draw');
  assert.strictEqual(typeof mod.snapshotState, 'function', 'render must export snapshotState');
  const snap = mod.snapshotState(createState(SEED));
  assert.strictEqual(typeof snap.x, 'number');
  assert.strictEqual(typeof snap.y, 'number');
  assert.strictEqual(typeof snap.dir, 'number');
  assert.strictEqual(typeof snap.tick, 'number');
  assert.ok(Array.isArray(snap.entities), 'snapshot must include entities');
  assert.strictEqual(snap.entities.length, 8);
  // snapshot is a deep copy: mutating it must not mutate the source
  const src = createState(SEED);
  const copy = mod.snapshotState(src);
  copy.x = -9999;
  copy.entities[0].x = -9999;
  assert.notStrictEqual(src.x, -9999);
  assert.notStrictEqual(src.entities[0].x, -9999);
  // draw + frame must not throw without a DOM context
  mod.draw(snap);
  mod.frame(0);
});

test('render reuses single canvas and guards typeof document', () => {
  const renderPath = path.join(root, 'games/starter/render.js');
  const src = fs.readFileSync(renderPath, 'utf8');
  assert.ok(src.includes("querySelector('canvas')"), 'render must reuse existing canvas via querySelector');
  assert.ok(src.includes('typeof document'), 'render must guard on typeof document');
});

test('hash pin: starter sim --ticks 600 --seed 7 is e161aed0', () => {
  assert.strictEqual(hashState(runSim({ ticks: TICKS, seed: SEED })), 'e161aed0');
  const out = execFileSync(process.execPath, [simPath, '--ticks', String(TICKS), '--seed', String(SEED)], { encoding: 'utf8' });
  assert.strictEqual(out.trim(), 'stateHash:e161aed0');
});

test('hash pin: replay self-test / deterministic log is 582e3658', () => {
  const log = buildInputLog(TICKS, SEED);
  const inputPath = writeTempInputLog(log);
  try {
    assert.strictEqual(runReplay(SEED, TICKS, inputPath), '582e3658');
    const self = spawnSync(process.execPath, [replayPath, '--self-test'], { encoding: 'utf8' });
    assert.strictEqual(self.status, 0, `self-test exit ${self.status}: ${self.stdout} ${self.stderr}`);
    assert.ok(self.stdout.includes('582e3658'), `self-test must print pinned replay hash 582e3658; stdout:\n${self.stdout}`);
  } finally {
    cleanupInputLog(inputPath);
  }
});

test('sim and replay require NonNegativeInt ticks/seed (fail closed, no hash)', () => {
  const origRunSim = runSim;
  // in-process fail-closed
  for (const bad of [
    { ticks: -1, seed: SEED },
    { ticks: TICKS, seed: -1 },
    { ticks: 1.5, seed: SEED },
    { ticks: TICKS, seed: 1.5 },
    { ticks: Number.NaN, seed: SEED },
    { ticks: TICKS, seed: '7' },
    { ticks: '600', seed: SEED },
  ]) {
    assert.throws(() => origRunSim(bad), /ticks|seed|non-negative/i, JSON.stringify(bad));
  }
  // CLI fail-closed: status !=0 and no stateHash on stdout
  for (const [flag, badVal] of [
    ['--ticks', '-1'], ['--ticks', '1.5'], ['--ticks', 'abc'], ['--ticks', ''],
    ['--seed', '-1'], ['--seed', '1.5'], ['--seed', 'abc'], ['--seed', ''],
  ]) {
    const argsSim = [simPath, '--ticks', String(TICKS), '--seed', String(SEED)];
    const idx = argsSim.indexOf(flag);
    argsSim[idx + 1] = badVal;
    const rSim = spawnSync(process.execPath, argsSim, { encoding: 'utf8' });
    assert.notStrictEqual(rSim.status, 0, `sim ${flag} ${JSON.stringify(badVal)} should fail closed, got 0 stdout:${rSim.stdout}`);
    assert.ok(!String(rSim.stdout).includes('stateHash:'), `sim ${flag} ${JSON.stringify(badVal)} must not print hash; stdout:${rSim.stdout}`);

    const log = buildInputLog(TICKS, SEED);
    const inputPath = writeTempInputLog(log);
    try {
      const argsReplay = [replayPath, '--seed', String(SEED), '--ticks', String(TICKS), '--input', inputPath];
      const idxR = argsReplay.indexOf(flag);
      argsReplay[idxR + 1] = badVal;
      const r = spawnSync(process.execPath, argsReplay, { encoding: 'utf8' });
      assert.notStrictEqual(r.status, 0, `replay ${flag} ${JSON.stringify(badVal)} should fail closed, got 0 stdout:${r.stdout}`);
      assert.ok(!String(r.stdout).includes('stateHash:'), `replay ${flag} ${JSON.stringify(badVal)} must not print hash; stdout:${r.stdout}`);
    } finally {
      cleanupInputLog(inputPath);
    }
  }
});

test('game-replay rejects duplicate tick (throw, fail closed, no hash)', () => {
  const dup = [{ tick: 0, actions: {} }, { tick: 0, actions: {} }];
  const inputPath = writeTempInputLog(dup);
  try {
    const r = spawnSync(process.execPath, [replayPath, '--seed', String(SEED), '--ticks', String(TICKS), '--input', inputPath], { encoding: 'utf8' });
    assert.notStrictEqual(r.status, 0, `duplicate tick should fail closed, got 0 stdout:${r.stdout}`);
    assert.ok(!String(r.stdout).includes('stateHash:'), `duplicate tick must not print hash; stdout:${r.stdout}`);
  } finally {
    cleanupInputLog(inputPath);
  }
});

test('empty replay fails closed (no hash, non-zero exit)', () => {
  const inputPath = writeTempInputLog([]);
  try {
    const r = spawnSync(process.execPath, [replayPath, '--seed', String(SEED), '--ticks', String(TICKS), '--input', inputPath], { encoding: 'utf8' });
    assert.notStrictEqual(r.status, 0, `empty replay should fail closed, got 0 stdout:${r.stdout}`);
    assert.ok(!String(r.stdout).includes('stateHash:'), `empty replay must not print hash; stdout:${r.stdout}`);
  } finally {
    cleanupInputLog(inputPath);
  }
});

test('game-replay rejects non-NonNegativeInt tick entries (fail closed)', () => {
  for (const bad of [
    [{ tick: -1, actions: {} }],
    [{ tick: 1.5, actions: {} }],
  ]) {
    const inputPath = writeTempInputLog(bad);
    try {
      const r = spawnSync(process.execPath, [replayPath, '--seed', String(SEED), '--ticks', String(TICKS), '--input', inputPath], { encoding: 'utf8' });
      assert.notStrictEqual(r.status, 0, `tick ${JSON.stringify(bad)} should fail closed, got 0`);
      assert.ok(!String(r.stdout).includes('stateHash:'), `bad tick must not print hash; stdout:${r.stdout}`);
    } finally {
      cleanupInputLog(inputPath);
    }
  }
});

test('script replay matches in-process step-by-step replay', () => {
  const log = buildInputLog(TICKS, SEED);
  const inputPath = writeTempInputLog(log);
  try {
    const scriptHash = runReplay(SEED, TICKS, inputPath);
    const processHash = inProcessReplay(SEED, TICKS, log);
    assert.strictEqual(scriptHash, processHash, 'script replay must match in-process replay');
  } finally {
    cleanupInputLog(inputPath);
  }
});
