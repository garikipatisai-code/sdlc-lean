#!/usr/bin/env node
// scripts/perf-gate.mjs
//
// p95 frame-time budget gate for the greybox starter game.
// Zero dependencies (Node builtins only).
//
// Usage:
//   node scripts/perf-gate.mjs --log games/starter/frame-log.json --budget-ms 16.67
//
// Behavior:
//   - Reads frame times (ms) from <log>. Accepts a JSON array of numbers,
//     { ms: ... } objects, or { frames: [...] }.
//   - Computes p95 with the nearest-rank method on the sorted times.
//   - Exits 0 when p95 <= budget-ms (PASS), non-zero otherwise (FAIL, fail closed).
//   - If <log> is missing, it is created with a default starter frame sample and
//     the gate exits 2 (seeding event, not verification; rerun against measured data).
//   - If <log> has zero frames, the gate fails closed and exits 1.
//
// The log file is expected to be produced by the game's frame telemetry.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DEFAULT_LOG = 'games/starter/frame-log.json';
const DEFAULT_BUDGET_MS = 16.67; // 60 fps frame budget

// Repository root: the directory containing this script's parent.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Resolve and contain a --log path to ROOT. Rejects absolute paths and any
// ".." traversal so the gate can never write outside the repo root.
// Adds realpath containment (lstat/readlink/realpath) so a symlink or
// symlinked parent escaping ROOT is rejected before mkdir/write/read.
const containLogPath = (input) => {
  if (typeof input !== 'string' || input === '') {
    fail('invalid-log', '--log requires a path');
  }
  if (path.isAbsolute(input)) {
    fail('invalid-log', `--log must be relative to repo root, got absolute path: ${input}`);
  }
  const segments = input.split(/[\\/]/);
  if (segments.includes('..')) {
    fail('invalid-log', `--log must not contain ".." segments: ${input}`);
  }
  const abs = path.resolve(ROOT, input);
  const rel = path.relative(ROOT, abs);
  if (rel === '' || rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) {
    fail('invalid-log', `--log escapes repo root: ${input}`);
  }
  // Witness entry with lstat/readlink before realpath, so symlink state is
  // observed even when the file is later created by seedLog.
  let lst = null;
  try {
    lst = fs.lstatSync(abs);
  } catch {
    lst = null;
  }
  if (lst && lst.isSymbolicLink()) {
    try {
      fs.readlinkSync(abs);
    } catch {
      // Fall through to realpath containment which will fail closed.
    }
  }
  // Realpath containment against canonical ROOT. For a missing log, resolve
  // the nearest existing ancestor and re-anchor the remainder.
  const realRoot = fs.realpathSync(ROOT);
  let realTarget;
  try {
    realTarget = fs.realpathSync(abs);
  } catch {
    let ancestor = abs;
    while (!fs.existsSync(ancestor) && path.dirname(ancestor) !== ancestor) {
      ancestor = path.dirname(ancestor);
    }
    let realAncestor;
    try {
      realAncestor = fs.realpathSync(ancestor);
    } catch {
      fail('invalid-log', `--log cannot be resolved: ${input}`);
    }
    const remainder = path.relative(ancestor, abs);
    realTarget = remainder ? path.join(realAncestor, remainder) : realAncestor;
  }
  const relReal = path.relative(realRoot, realTarget);
  if (relReal === '' || relReal === '..' || relReal.startsWith('..' + path.sep) || path.isAbsolute(relReal)) {
    fail('invalid-log', `--log escapes repo root via symlink: ${input}`);
  }
  // Return lexical abs so openSync(O_NOFOLLOW) can reject a symlink swapped
  // in after containment at open (ELOOP -> exit 2). Canonical realTarget was
  // only for the containment check above.
  return abs;
};

// Representative starter frame times (ms) used to seed a missing log.
// Deterministic (no Math.random / Date). p95 == 10.8 ms: under 16.67, over 1.
const DEFAULT_FRAMES_MS = [
  8.3, 9.1, 8.7, 9.5, 8.2, 10.0, 9.3, 8.8, 9.9, 8.5,
  10.5, 9.0, 8.9, 9.7, 8.4, 10.2, 9.6, 8.6, 10.8, 9.4,
  8.1, 11.0, 9.8, 8.3, 10.6, 9.2, 8.7, 10.4, 9.5, 8.9,
];

const fail = (code, message) => {
  const err = new Error(message);
  err.name = 'PerfGateError';
  err.code = code;
  throw err;
};

const parseArgs = (argv) => {
  const args = { log: DEFAULT_LOG, budgetMs: null };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const val = argv[i + 1];
    if (key === '--log' || key === '-l') {
      if (val === undefined || val.startsWith('--')) {
        fail('missing-value', `--log requires a path`);
      }
      args.log = val;
      i += 1;
    } else if (key === '--budget-ms' || key === '-b') {
      if (val === undefined || val.startsWith('--')) {
        fail('missing-value', `--budget-ms requires a number`);
      }
      const n = Number(val);
      if (!Number.isFinite(n)) {
        fail('invalid-value', `--budget-ms must be a number, got ${val}`);
      }
      args.budgetMs = n;
      i += 1;
    } else if (key === '--help' || key === '-h') {
      console.log('Usage: node scripts/perf-gate.mjs --log <path> --budget-ms <ms>');
      process.exit(0);
    } else {
      fail('unknown-arg', `unknown argument: ${key}`);
    }
  }
  if (args.budgetMs === null) {
    fail('missing-value', '--budget-ms is required');
  }
  return args;
};

const readFrames = (log) => {
  // TOCTOU hardening: open with O_NOFOLLOW so a symlink swapped in after
  // containLogPath is rejected at open (ELOOP -> exit 2) and re-verify the
  // descriptor with fstat before reading. O_NOFOLLOW fallback keeps the
  // realpath containment above; guards are not weakened.
  const O_NOFOLLOW = fs.constants.O_NOFOLLOW ?? 0;
  let fd;
  try {
    fd = fs.openSync(log, fs.constants.O_RDONLY | O_NOFOLLOW);
  } catch (err) {
    if (err && err.code === 'ENOENT') return null;
    if (err && err.code === 'ELOOP') {
      fail('invalid-log', `log is a symlink: ${log}`);
    }
    fail('invalid-log', `cannot read log ${log}: ${err.message}`);
  }
  let dataText;
  try {
    const fstat = fs.fstatSync(fd);
    if (!fstat.isFile()) {
      fail('invalid-log', `log ${log}: not a regular file`);
    }
    dataText = fs.readFileSync(fd, 'utf8');
  } catch (err) {
    if (err && err.name === 'PerfGateError') throw err;
    fail('invalid-log', `cannot parse JSON log ${log}: ${err.message}`);
  } finally {
    try {
      fs.closeSync(fd);
    } catch {
      /* already closed */
    }
  }
  let data;
  try {
    data = JSON.parse(dataText);
  } catch (err) {
    fail('invalid-log', `cannot parse JSON log ${log}: ${err.message}`);
  }
  let raw =
    Array.isArray(data)
      ? data
      : data && Array.isArray(data.frames)
        ? data.frames
        : [];
  if (!Array.isArray(raw)) {
    fail('invalid-log', `log ${log}: frames must be an array`);
  }
  const frames = raw
    .map((f) =>
      typeof f === 'number' ? f : f && typeof f.ms === 'number' ? f.ms : NaN,
    )
    .filter((n) => Number.isFinite(n));
  return frames;
};

const p95 = (times) => {
  const n = times.length;
  if (n === 0) return null;
  const sorted = [...times].sort((a, b) => a - b);
  // Nearest-rank method: rank = ceil(p / 100 * n), 1-indexed.
  const rank = Math.ceil(0.95 * n);
  return sorted[rank - 1];
};

const seedLog = (log) => {
  const dir = path.dirname(log);
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // TOCTOU hardening: create with O_EXCL|O_NOFOLLOW so a symlink/race at
  // `log` is rejected at open and re-verify the descriptor with fstat.
  // O_NOFOLLOW fallback keeps the realpath containment; O_EXCL always set.
  const O_NOFOLLOW = fs.constants.O_NOFOLLOW ?? 0;
  const flags =
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | O_NOFOLLOW;
  const payload = JSON.stringify({ frames: DEFAULT_FRAMES_MS, seed: true, unit: 'ms' }, null, 2) + '\n';
  let fd;
  try {
    fd = fs.openSync(log, flags, 0o644);
  } catch (err) {
    if (err && (err.code === 'EEXIST' || err.code === 'ELOOP')) {
      fail('invalid-log', `log already exists or is a symlink: ${log}`);
    }
    fail('invalid-log', `cannot create log ${log}: ${err.message}`);
  }
  try {
    const fstat = fs.fstatSync(fd);
    if (!fstat.isFile()) {
      fail('invalid-log', `log ${log}: not a regular file`);
    }
    const buf = Buffer.from(payload);
    let off = 0;
    while (off < buf.length) {
      off += fs.writeSync(fd, buf, off, buf.length - off);
    }
  } catch (err) {
    if (err && err.name === 'PerfGateError') throw err;
    fail('invalid-log', `cannot write log ${log}: ${err.message}`);
  } finally {
    try {
      fs.closeSync(fd);
    } catch {
      /* already closed */
    }
  }
  return DEFAULT_FRAMES_MS;
};

const main = () => {
  try {
    const { log, budgetMs } = parseArgs(process.argv.slice(2));
    const containedLog = containLogPath(log);
    const frames = readFrames(containedLog);
    let p;
    if (frames === null) {
      seedLog(containedLog);
      console.log(
        `perf-gate: log missing, seeded ${containedLog} with ${
          DEFAULT_FRAMES_MS.length
        } starter frames (seeding event, not verification); rerun against measured data before any correctness claim`,
      );
      process.exit(2);
      return;
    }
    p = p95(frames);
    const pass = p !== null && p <= budgetMs;
    console.log(
      `perf-gate: p95=${(p ?? 0).toFixed(2)}ms budget=${budgetMs}ms n=${
        frames.length
      } -> ${pass ? 'PASS' : 'FAIL'}`,
    );
    process.exit(pass ? 0 : 1);
  } catch (err) {
    console.error(`perf-gate: ERROR: ${err.message}`);
    process.exit(2);
  }
};

main();
