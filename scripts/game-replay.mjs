#!/usr/bin/env node
// Game replay harness — seed + input log -> state hash.
// Proves games/starter/sim.js is deterministic: same seed + same input log
// always reproduces the same state hash (S-tier replay evidence).
// Zero deps, vanilla JS. sim.js is read-only and imported, never edited.
//
// Usage:
//   node scripts/game-replay.mjs --seed 7 --ticks 600 --input input.json
//     prints: stateHash:<hex>
//   node scripts/game-replay.mjs --self-test
//     built-in determinism checks (exit 0 = pass)
//
// Input log: JSON array of {tick, actions}. actions keys: forward/back/left/right.
// Ticks without an entry apply no actions.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createState, step, hashState } from '../games/starter/sim.js';

const TICK = 1 / 60;
const MAX_ACCUMULATOR = 0.25;
const DEFAULT_TICKS = 600;

const isMain = typeof process !== 'undefined' && process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

function parseNonNegativeInt(label, raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error(`${label} must be a non-negative integer (NonNegativeInt)`);
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`${label} must be a non-negative integer (NonNegativeInt)`);
  }
  return n;
}

function parseArgs(argv) {
  const args = { seed: 1, ticks: DEFAULT_TICKS, input: null, selfTest: false };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const val = argv[i + 1];
    if (key === '--seed') {
      args.seed = parseNonNegativeInt('--seed', val);
      i += 1;
    } else if (key === '--ticks') {
      args.ticks = parseNonNegativeInt('--ticks', val);
      i += 1;
    } else if (typeof key === 'string' && (key.startsWith('--seed=') || key.startsWith('--ticks='))) {
      const eq = key.indexOf('=');
      const flag = key.slice(0, eq);
      const raw = key.slice(eq + 1);
      const parsed = parseNonNegativeInt(flag, raw);
      if (flag === '--seed') args.seed = parsed;
      else args.ticks = parsed;
    } else if (key === '--input' && val !== undefined) {
      args.input = val;
      i += 1;
    } else if (key === '--self-test') {
      args.selfTest = true;
    }
  }
  return args;
}

function readInputLog(inputPath) {
  let raw;
  try {
    raw = fs.readFileSync(inputPath, 'utf8');
  } catch (err) {
    throw new Error(`cannot read input log "${inputPath}": ${err.message}`);
  }
  let log;
  try {
    log = JSON.parse(raw);
  } catch (err) {
    throw new Error(`cannot parse input log "${inputPath}": ${err.message}`);
  }
  if (!Array.isArray(log)) {
    throw new Error(`input log "${inputPath}" must be a JSON array of {tick, actions}`);
  }
  if (log.length === 0) {
    throw new Error(`empty input log "${inputPath}" (fail closed: empty replay must not print hash)`);
  }
  const byTick = new Map();
  for (const entry of log) {
    const malformed = !entry || typeof entry !== 'object' || Array.isArray(entry)
      || typeof entry.tick !== 'number' || !Number.isInteger(entry.tick) || entry.tick < 0
      || !entry.actions || typeof entry.actions !== 'object' || Array.isArray(entry.actions);
    if (malformed) {
      throw new Error(`malformed entry in input log "${inputPath}": expected {tick:non-negative-integer, actions:object}, got ${JSON.stringify(entry)}`);
    }
    if (byTick.has(entry.tick)) {
      throw new Error(`duplicate tick ${entry.tick} in input log "${inputPath}" (fail closed)`);
    }
    byTick.set(entry.tick, entry.actions);
  }
  return byTick;
}

function replay({ ticks, seed, byTick }) {
  if (typeof ticks !== 'number' || !Number.isInteger(ticks) || ticks < 0) {
    throw new Error(`ticks must be a non-negative integer (NonNegativeInt), got ${String(ticks)}`);
  }
  if (typeof seed !== 'number' || !Number.isInteger(seed) || seed < 0) {
    throw new Error(`seed must be a non-negative integer (NonNegativeInt), got ${String(seed)}`);
  }
  if (!byTick || byTick.size === 0) {
    throw new Error('empty replay (fail closed: empty replay must not print hash)');
  }
  const state = createState(seed);
  let acc = 0;
  for (let i = 0; i < ticks; i += 1) {
    acc += TICK;
    if (acc > MAX_ACCUMULATOR) acc = MAX_ACCUMULATOR;
    const actions = byTick.get(i) || {};
    while (acc >= TICK) {
      step(state, TICK, actions);
      acc -= TICK;
    }
  }
  return hashState(state);
}

function runReplay(args) {
  const byTick = args.input ? readInputLog(args.input) : new Map();
  const hash = replay({ ticks: args.ticks, seed: args.seed, byTick });
  console.log(`stateHash:${hash}`);
  return hash;
}

function selfTest() {
  const tmp = '/tmp/opencode/game-replay-self-test';
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });

  const log = [];
  let s = 7 >>> 0;
  for (let t = 0; t < 600; t += 1) {
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
  const inputPath = path.join(tmp, 'input.json');
  fs.writeFileSync(inputPath, JSON.stringify(log));

  const h1 = runReplay({ seed: 7, ticks: 600, input: inputPath });
  const h2 = runReplay({ seed: 7, ticks: 600, input: inputPath });
  const h3 = runReplay({ seed: 7, ticks: 600, input: inputPath });

  let failures = 0;
  const check = (label, ok) => {
    if (!ok) {
      failures += 1;
      console.error(`SELF-TEST FAIL: ${label}`);
    } else {
      console.log(`ok: ${label}`);
    }
  };
  check('stateHash format', /^[0-9a-f]{8}$/.test(h1));
  check('stable across runs', h1 === h2 && h2 === h3);

  fs.rmSync(tmp, { recursive: true, force: true });

  if (failures > 0) {
    console.error(`SELF-TEST: ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('SELF-TEST: all checks passed');
  process.exit(0);
}

if (isMain) {
  const args = parseArgs(process.argv);
  if (args.selfTest) {
    selfTest();
  } else if (args.input) {
    runReplay(args);
    process.exit(0);
  } else {
    console.error('Usage: node scripts/game-replay.mjs --seed <n> --ticks <n> --input <file>');
    console.error('       node scripts/game-replay.mjs --self-test');
    process.exit(2);
  }
}
