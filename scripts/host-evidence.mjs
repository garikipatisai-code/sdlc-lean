#!/usr/bin/env node
// Read-only advisory cross-check: does each plan Verify have a hash-only host
// evidence row? Never writes. Raw commands and output are never stored, so the
// check compares normalized command hashes plus the approved plan hash.
//
// Usage:
//   node scripts/host-evidence.mjs status [--root <dir>] [--plan <plan.md>] [--require-host]
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  parsePlanTasks,
  readGate,
  validateGate,
  normalizeRel,
  hashFile,
} from './spec-check.mjs';

const HOST_EVIDENCE_REL = path.join('.sdlc', 'host-evidence.jsonl');
const MAX_LINE_BYTES = 64 * 1024;

// Same three-line rule as the plugin: strip one leading shell prefix, trim,
// collapse whitespace. `$HOME` inside a command is left alone.
export const normalizeCommand = (value) => String(value ?? '')
  .replace(/^\s*[!$]\s+/, '')
  .trim()
  .replace(/\s+/g, ' ');

const sha256Hex = (value) => crypto.createHash('sha256').update(value).digest('hex');

const writeOut = (io, text) => (io && typeof io.log === 'function' ? io.log(text) : console.log(text));

const writeErr = (io, text) => (io && typeof io.err === 'function' ? io.err(text) : console.error(text));

/** Load JSONL rows; skip blank lines and count oversized or invalid lines. */
export const loadRows = (logPath) => {
  let st;
  try {
    st = fs.lstatSync(logPath);
  } catch (err) {
    return { rows: [], malformed: 0 }; // missing or unreadable: advisory zero
  }
  if (st.isSymbolicLink() || !st.isFile()) return { rows: [], malformed: 0 };

  let text;
  try {
    text = fs.readFileSync(logPath, 'utf8');
  } catch (err) {
    return { rows: [], malformed: 0 };
  }

  const rows = [];
  let malformed = 0;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    if (Buffer.byteLength(line) > MAX_LINE_BYTES) {
      malformed += 1;
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch (err) {
      malformed += 1;
      continue;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      malformed += 1;
      continue;
    }
    rows.push(parsed);
  }
  return { rows, malformed };
};

/**
 * Match each plan task to at most one unused row. A row counts only with the
 * active plan hash, the normalized command hash, status `completed`, and a
 * numeric `exit === 0`. Missing/null exit is unknown. Extra rows are advisory.
 */
export const matchPlanTasks = (planTasks, rows, gate) => {
  const tasks = Array.isArray(planTasks) ? planTasks : [];
  const list = Array.isArray(rows) ? rows : [];
  const planSha = gate && gate.plan_sha256;
  const used = new Set();

  const details = tasks.map((task) => {
    const command = normalizeCommand(task && task.verify);
    const commandSha = sha256Hex(command);
    const index = list.findIndex((row, i) => {
      if (used.has(i)) return false;
      if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
      if (row.plan_sha256 !== planSha) return false;
      if (row.command_sha256 !== commandSha) return false;
      if (row.status !== 'completed') return false;
      if (row.exit !== 0) return false;
      return true;
    });
    if (index === -1) return { task: task && task.task, command, matched: false };
    used.add(index);
    return { task: task && task.task, command, matched: true };
  });

  return {
    matched: details.filter((entry) => entry.matched).length,
    total: tasks.length,
    tasks: details,
  };
};

/**
 * Print the advisory match line. Exit 1 on an invalid marker, a `--plan` that
 * does not hash to the active gate, or (with `--require-host`) any task without
 * a match or zero matches overall. Otherwise advisory 0.
 */
export const status = ({ root, plan, requireHost, io } = {}) => {
  const rootAbs = path.resolve(root || process.cwd());

  let gate;
  try {
    gate = readGate(rootAbs);
  } catch (err) {
    writeErr(io, `[host-evidence] ${err.message}`);
    return 1;
  }
  if (!gate) {
    writeOut(io, 'host evidence: no active spec gate');
    return requireHost ? 1 : 0;
  }

  let valid;
  try {
    valid = validateGate(rootAbs, gate);
  } catch (err) {
    writeErr(io, `[host-evidence] ${err.message}`);
    return 1;
  }

  let planRel = valid.plan;
  if (plan) {
    try {
      planRel = normalizeRel(rootAbs, plan);
      if (hashFile(path.join(rootAbs, planRel)) !== valid.plan_sha256) {
        writeErr(io, `[host-evidence] plan does not hash to the active gate: ${plan}`);
        return 1;
      }
    } catch (err) {
      writeErr(io, `[host-evidence] ${err.message}`);
      return 1;
    }
  }

  let tasks;
  try {
    tasks = parsePlanTasks(fs.readFileSync(path.join(rootAbs, planRel), 'utf8'));
  } catch (err) {
    writeErr(io, `[host-evidence] ${err.message}`);
    return 1;
  }

  const { rows, malformed } = loadRows(path.join(rootAbs, HOST_EVIDENCE_REL));
  const result = matchPlanTasks(tasks, rows, valid);

  writeOut(io, `host evidence rows: ${rows.length}${malformed ? ` (malformed ${malformed})` : ''}`);
  writeOut(io, `host evidence: ${result.matched}/${result.total} matched (advisory)`);

  if (requireHost && (result.matched < result.total || result.matched === 0)) return 1;
  return 0;
};

const USAGE = `Read-only advisory host-evidence cross-check.

Usage:
  node scripts/host-evidence.mjs status [--root <dir>] [--plan <plan.md>] [--require-host]
  node scripts/host-evidence.mjs -h

Options:
  --root <dir>     Repo root (default: current directory)
  --plan <path>    Plan to check; must hash to the active gate plan
  --require-host   Exit 1 when a plan task lacks a match, or none match
  -h, --help       Show this help

status prints "host evidence: n/m matched (advisory)" and exits 0 unless
--require-host is given. No active gate and zero rows are advisory by default.
`;

export const main = (argv = process.argv.slice(2), io = {}) => {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--root') {
      if (!argv[i + 1]) {
        writeErr(io, '[host-evidence] invalid-args: --root needs a directory');
        return 1;
      }
      args.root = argv[++i];
    } else if (arg === '--plan') {
      if (!argv[i + 1]) {
        writeErr(io, '[host-evidence] invalid-args: --plan needs a plan path');
        return 1;
      }
      args.plan = argv[++i];
    } else if (arg === '--require-host') {
      args.requireHost = true;
    } else if (arg === '-h' || arg === '--help') {
      args.help = true;
    } else {
      args._.push(arg);
    }
  }

  if (args.help || args._.length === 0) {
    writeOut(io, USAGE.trimEnd());
    return 0;
  }

  const [command] = args._;
  if (command !== 'status') {
    writeErr(io, `[host-evidence] invalid-args: unknown command "${command}"`);
    return 1;
  }

  return status({
    root: path.resolve(args.root || process.cwd()),
    plan: args.plan,
    requireHost: args.requireHost === true,
    io,
  });
};

const isMain = process.argv[1] && (() => {
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch (err) {
    return false;
  }
})();
if (isMain) process.exit(main());
