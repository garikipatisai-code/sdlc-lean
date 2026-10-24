#!/usr/bin/env node
// Spec-gate contract for sdlc-lean (zero dependencies).
//
// An approved plan binds a spec (SHA-256), a file scope, and an approval
// record in .sdlc/spec-gate.json. The plugin reads that marker and blocks
// file-tool edits outside the scope. This module owns the contract and the
// approve/verify/close/check CLI.
//
// Trust model: local drift guard, not a sandbox. A writer with file access can
// edit the marker; bash redirection is out of scope by design.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const GATE_VERSION = 1;
export const GATE_REL = path.join('.sdlc', 'spec-gate.json');
const MARKER_REL = GATE_REL.split(path.sep).join('/');
const CLI_FILE = fileURLToPath(import.meta.url);
const HASH_RE = /^[0-9a-f]{64}$/;
const UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

// The debt ledger is control state: recording a deferred shortcut must never be
// blocked by the plan scope.
const IMPLICIT_ALLOW = ['docs/debt-ledger.md'];

export class SpecCheckError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SpecCheckError';
    this.code = code;
  }
}

const fail = (code, message) => { throw new SpecCheckError(code, message); };

export const gatePath = (root = process.cwd()) => path.join(path.resolve(root), GATE_REL);

export const hashFile = (file) => crypto.createHash('sha256')
  .update(fs.readFileSync(file))
  .digest('hex');

const stripQuotes = (value) => value.replace(/^(["'])([\s\S]*)\1$/, '$2');

const assertUtc = (value, label) => {
  if (typeof value !== 'string' || !UTC_RE.test(value) || Number.isNaN(Date.parse(value))) {
    fail('invalid-time', `${label} must be an ISO-8601 UTC timestamp (…Z)`);
  }
  return value;
};

const assertText = (value, label) => {
  if (typeof value !== 'string' || value.trim() === '') {
    fail('invalid-field', `${label} must be a non-empty string`);
  }
  return value.trim();
};

/**
 * Normalize a plan/spec/allow pattern. Relative only; no absolute paths, no
 * `..` escapes, no backslashes. Globs (`*`, `**`, `?`) are allowed here.
 */
export const assertSafePattern = (value, label = 'path') => {
  if (typeof value !== 'string' || value.trim() === '') {
    fail('unsafe-path', `${label} must be a non-empty relative path`);
  }
  if (/[\\\0\r\n]/.test(value)) {
    fail('unsafe-path', `${label} must use forward slashes and contain no control characters`);
  }
  let p = value.trim().replace(/^\.\//, '');
  if (p.startsWith('/') || /^[A-Za-z]:/.test(p)) {
    fail('unsafe-path', `${label} must be relative, got "${value}"`);
  }
  const parts = p.split('/');
  if (parts.some((part) => part === '' || part === '.' || part === '..')) {
    fail('unsafe-path', `${label} escapes or has an empty segment: "${value}"`);
  }
  return p;
};

/** Exact path: same rules, but glob characters are refused. */
export const assertSafeRel = (value, label = 'path') => {
  const p = assertSafePattern(value, label);
  if (/[*?]/.test(p)) fail('unsafe-path', `${label} must be an exact path, got "${value}"`);
  return p;
};

export const normalizeRel = (root, target) => {
  const rootAbs = path.resolve(root);
  const abs = path.isAbsolute(target) ? path.resolve(target) : path.resolve(rootAbs, target);
  const rel = path.relative(rootAbs, abs);
  if (rel === '' || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    fail('unsafe-path', `path escapes the repo root: "${target}"`);
  }
  return rel.split(path.sep).join('/');
};

const assertRegularFile = (root, rel, label) => {
  const abs = path.resolve(root, rel);
  let st;
  try {
    st = fs.lstatSync(abs);
  } catch (err) {
    if (err.code === 'ENOENT') fail(`missing-${label}`, `${label} not found: ${rel}`);
    fail(`invalid-${label}`, `${label} is not readable: ${rel}`);
  }
  if (st.isSymbolicLink()) fail('symlink', `${label} must not be a symlink: ${rel}`);
  if (!st.isFile()) fail(`invalid-${label}`, `${label} is not a regular file: ${rel}`);
  return abs;
};

const parseList = (raw, key) => {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) fail('invalid-field', `${key} must be a block list`);
  return raw.map((item) => assertSafePattern(item, key));
};

/**
 * Parse the plan's YAML frontmatter. Only the spec-gate keys are interpreted;
 * unknown keys are ignored. Lists use block style (`key:` then `  - item`).
 */
export const parsePlanText = (text) => {
  if (typeof text !== 'string') fail('missing-frontmatter', 'plan must be text');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!m) fail('missing-frontmatter', 'plan must start with YAML frontmatter');

  const raw = {};
  const seen = new Set();
  let currentList = null;
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item) {
      if (!currentList) fail('invalid-frontmatter', `list item without a key: ${line.trim()}`);
      raw[currentList].push(stripQuotes(item[1].trim()));
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) fail('invalid-frontmatter', `unsupported frontmatter line: ${line.trim()}`);
    const [, key, value] = kv;
    if (seen.has(key)) fail('duplicate-field', `duplicate frontmatter key: ${key}`);
    seen.add(key);
    if (value === '') {
      raw[key] = [];
      currentList = key;
    } else {
      raw[key] = stripQuotes(value.trim());
      currentList = null;
    }
  }

  const spec = assertSafeRel(assertText(raw.spec, 'spec'), 'spec');
  const status = assertText(raw.status, 'status');
  if (status !== 'approved') fail('not-approved', `plan status is "${status}", expected "approved"`);
  const approvedBy = assertText(raw.approved_by, 'approved_by');
  const approvedAt = assertUtc(raw.approved_at, 'approved_at');
  const files = parseList(raw.files, 'files');
  if (files.length === 0) fail('missing-files', 'plan must list at least one file or glob in files');
  const allow = parseList(raw.allow, 'allow');

  return { spec, status, approved_by: approvedBy, approved_at: approvedAt, files, allow };
};

/** Derive the progress ledger for a plan: foo.md -> foo-progress.md. */
export const progressFor = (plan) => (plan.endsWith('.md')
  ? `${plan.slice(0, -3)}-progress.md`
  : `${plan}-progress.md`);

/** Glob match: `*` = one segment, `**` = zero or more segments, `?` = one char. */
export const matchPattern = (pattern, target) => {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        i++;
        if (pattern[i + 1] === '/') {
          i++;
          re += '(?:.*/)?';
        } else {
          re += '.*';
        }
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if ('\\^$+?.()|{}[]'.includes(c)) {
      re += `\\${c}`;
    } else {
      re += c;
    }
  }
  return new RegExp(`^${re}$`).test(target);
};

export const isAllowed = (gate, rel) => {
  // The approved plan, the spec, and the gate marker are immutable while the
  // gate is active. Listing them in `files` must not make them editable.
  if (rel === gate.plan || rel === gate.spec || rel === MARKER_REL) return false;
  const patterns = [progressFor(gate.plan), ...IMPLICIT_ALLOW, ...(gate.allow || []), ...(gate.files || [])];
  return patterns.some((pattern) => matchPattern(pattern, rel));
};

export const readGate = (root = process.cwd()) => {
  const p = gatePath(root);
  let st;
  try {
    st = fs.lstatSync(p);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    fail('invalid-marker', `cannot stat ${GATE_REL}: ${err.message}`);
  }
  if (st.isSymbolicLink()) fail('invalid-marker', `${GATE_REL} must not be a symlink`);
  if (!st.isFile()) fail('invalid-marker', `${GATE_REL} must be a regular file`);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    fail('invalid-marker', `${GATE_REL} is not valid JSON: ${err.message}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    fail('invalid-marker', `${GATE_REL} must contain a JSON object`);
  }
  return parsed;
};

export const validateGate = (root, gate) => {
  if (!gate || typeof gate !== 'object' || Array.isArray(gate)) {
    fail('invalid-gate', 'gate must be an object');
  }
  if (gate.version !== GATE_VERSION) {
    fail('invalid-gate', `gate version is ${gate.version}, expected ${GATE_VERSION}`);
  }
  const plan = assertSafeRel(assertText(gate.plan, 'plan'), 'plan');
  const spec = assertSafeRel(assertText(gate.spec, 'spec'), 'spec');
  if (!plan.endsWith('.md')) fail('invalid-gate', 'plan must be a Markdown file');
  const approvedBy = assertText(gate.approved_by, 'approved_by');
  const approvedAt = assertUtc(gate.approved_at, 'approved_at');
  if (!HASH_RE.test(gate.plan_sha256)) fail('invalid-gate', 'plan_sha256 must be 64 hex chars');
  if (!HASH_RE.test(gate.spec_sha256)) fail('invalid-gate', 'spec_sha256 must be 64 hex chars');
  if (!HASH_RE.test(gate.cli_sha256 || '')) fail('invalid-gate', 'cli_sha256 must be 64 hex chars');
  if (!Array.isArray(gate.files) || gate.files.length === 0) {
    fail('invalid-gate', 'files must be a non-empty array');
  }
  gate.files.forEach((p) => assertSafePattern(p, 'files'));
  if (gate.allow !== undefined && !Array.isArray(gate.allow)) {
    fail('invalid-gate', 'allow must be an array');
  }
  (gate.allow || []).forEach((p) => assertSafePattern(p, 'allow'));
  if (gate.created_at !== undefined) assertUtc(gate.created_at, 'created_at');

  const planAbs = assertRegularFile(root, plan, 'plan');
  const specAbs = assertRegularFile(root, spec, 'spec');
  if (hashFile(planAbs) !== gate.plan_sha256) {
    fail('plan-drift', `plan drift: ${plan} changed since approval. Run spec-check close && approve.`);
  }
  if (hashFile(specAbs) !== gate.spec_sha256) {
    fail('spec-drift', `spec drift: ${spec} changed since approval. Run spec-check close && approve.`);
  }
  if (hashFile(CLI_FILE) !== gate.cli_sha256) {
    fail('cli-drift', `spec-check CLI changed since approval. Run spec-check close && approve.`);
  }
  return { ...gate, approved_by: approvedBy, approved_at: approvedAt, plan, spec };
};

export const buildGate = (root = process.cwd(), planPath) => {
  const plan = assertSafeRel(normalizeRel(root, planPath), 'plan');
  if (!plan.endsWith('.md')) fail('invalid-plan', 'plan must be a Markdown file');
  const planAbs = assertRegularFile(root, plan, 'plan');
  const parsed = parsePlanText(fs.readFileSync(planAbs, 'utf8'));
  const specAbs = assertRegularFile(root, parsed.spec, 'spec');
  return {
    version: GATE_VERSION,
    plan,
    plan_sha256: hashFile(planAbs),
    spec: parsed.spec,
    spec_sha256: hashFile(specAbs),
    cli_sha256: hashFile(CLI_FILE),
    approved_by: parsed.approved_by,
    approved_at: parsed.approved_at,
    files: parsed.files,
    allow: parsed.allow,
    created_at: new Date().toISOString(),
  };
};

export const writeGate = (root, gate) => {
  validateGate(root, gate);
  const p = gatePath(root);
  const dir = path.dirname(p);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try { fs.chmodSync(dir, 0o700); } catch (err) { /* best effort: pre-existing dir may be owned elsewhere */ }
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(tmp, `${JSON.stringify(gate, null, 2)}\n`, { mode: 0o600 });
    fs.renameSync(tmp, p);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch (cleanupErr) { /* best effort */ }
    throw err;
  }
  return p;
};

export const closeGate = (root = process.cwd()) => {
  const p = gatePath(root);
  try {
    fs.unlinkSync(p);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
};

// Reject lexical escapes (handled by normalizeRel) and symlink escapes. The
// nearest existing ancestor is resolved: a new file under a symlinked directory
// must not land outside the repo.
const assertContainedReal = (root, abs, target) => {
  const realRoot = fs.realpathSync(path.resolve(root));
  let probe = abs;
  for (;;) {
    try {
      fs.lstatSync(probe);
      break;
    } catch (err) {
      if (err.code !== 'ENOENT') fail('unsafe-path', `cannot inspect "${target}": ${err.message}`);
      const parent = path.dirname(probe);
      if (parent === probe) fail('unsafe-path', `cannot resolve "${target}"`);
      probe = parent;
    }
  }
  let real;
  try {
    real = fs.realpathSync(probe);
  } catch (err) {
    fail('unsafe-path', `cannot resolve "${target}" (broken symlink?): ${err.message}`);
  }
  if (real !== realRoot && !real.startsWith(realRoot + path.sep)) {
    fail('unsafe-path', `path escapes the repo root through a symlink: "${target}"`);
  }
  return real;
};

export const checkPath = (root, target) => {
  const gate = readGate(root);
  if (!gate) return { active: false, allowed: true };
  validateGate(root, gate);
  const rel = normalizeRel(root, target);
  const realTarget = assertContainedReal(root, path.resolve(root, rel), target);

  // Plan/spec are immutable; compare real paths so a symlinked directory or a
  // case-insensitive filesystem cannot alias them.
  for (const protectedRel of [gate.plan, gate.spec]) {
    if (!protectedRel) continue;
    if (rel === protectedRel) return { active: true, allowed: false, rel, gate };
    try {
      if (fs.realpathSync(path.resolve(root, protectedRel)) === realTarget) {
        return { active: true, allowed: false, rel, gate };
      }
    } catch (err) {
      // validateGate already proved the file exists; a race is caught next call
    }
  }
  return { active: true, allowed: isAllowed(gate, rel), rel, gate };
};

// --- CLI ---------------------------------------------------------------------
const USAGE = `Usage: node scripts/spec-check.mjs <command> [options]

Commands:
  approve <plan.md>   Validate an approved plan and write .sdlc/spec-gate.json
  status              Show the active gate (or "none")
  verify [--require-active]   Re-hash plan/spec/CLI; exit 1 on drift, 2 if no gate when required
  close               Remove the active gate
  check <path...>     Exit 0 if every path is in scope, 1 if any is blocked

Options:
  --root <dir>        Repo root (default: cwd)
  --require-active    verify fails (exit 2) when no gate is active
  -h, --help          Show this help
`;

export const main = (argv = process.argv.slice(2)) => {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') {
      if (!argv[i + 1]) {
        console.error('[spec-check] invalid-args: --root needs a directory');
        return 1;
      }
      args.root = argv[++i];
    } else if (argv[i] === '--require-active') {
      args.requireActive = true;
    } else if (argv[i] === '-h' || argv[i] === '--help') {
      args.help = true;
    } else {
      args._.push(argv[i]);
    }
  }
  if (args.help || args._.length === 0) {
    console.log(USAGE.trimEnd());
    return 0;
  }

  const root = path.resolve(args.root || process.cwd());
  const [command, positional] = args._;

  try {
    if (command === 'approve') {
      if (!positional) fail('invalid-args', 'approve needs a plan path');
      const gate = buildGate(root, positional);
      writeGate(root, gate);
      console.log(`active spec gate: ${gate.plan} -> ${gate.spec} (${gate.files.length} files, sha256 ${gate.plan_sha256.slice(0, 12)})`);
      return 0;
    }
    if (command === 'status') {
      const gate = readGate(root);
      if (!gate) {
        console.log('no active spec gate');
        return 0;
      }
      const valid = validateGate(root, gate);
      console.log(`active spec gate: ${valid.plan} -> ${valid.spec}`);
      console.log(`  files ${valid.files.length} · allow ${(valid.allow || []).length} · approved_by ${valid.approved_by} @ ${valid.approved_at}`);
      console.log(`  plan ${valid.plan_sha256.slice(0, 12)} · spec ${valid.spec_sha256.slice(0, 12)}`);
      return 0;
    }
    if (command === 'verify') {
      const gate = readGate(root);
      if (!gate) {
        if (args.requireActive) {
          console.error('[spec-check] inactive: no active spec gate');
          return 2;
        }
        console.log('no active spec gate');
        return 0;
      }
      const valid = validateGate(root, gate);
      console.log(`spec gate OK: ${valid.plan} -> ${valid.spec} (plan ${valid.plan_sha256.slice(0, 12)}, spec ${valid.spec_sha256.slice(0, 12)})`);
      return 0;
    }
    if (command === 'close') {
      const closed = closeGate(root);
      console.log(closed ? 'closed spec gate' : 'no active spec gate');
      return 0;
    }
    if (command === 'check') {
      const targets = args._.slice(1);
      if (targets.length === 0) fail('invalid-args', 'check needs at least one path');
      let blocked = 0;
      for (const target of targets) {
        const result = checkPath(root, target);
        if (!result.active) {
          console.log(`no active spec gate (allowed: ${target})`);
          return 0;
        }
        if (result.allowed) {
          console.log(`allowed: ${result.rel}`);
          continue;
        }
        blocked++;
        console.error(`[spec-check] blocked: ${result.rel} is outside the approved plan scope (${result.gate.plan}). Run spec-check close && approve to widen.`);
      }
      return blocked ? 1 : 0;
    }
    fail('invalid-args', `unknown command "${command}"`);
  } catch (err) {
    if (err instanceof SpecCheckError) {
      console.error(`[spec-check] ${err.code}: ${err.message}`);
      return 1;
    }
    console.error(`[spec-check] ${err.message}`);
    return 1;
  }
};

const isMain = process.argv[1] && (() => {
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(CLI_FILE);
  } catch (err) {
    return false;
  }
})();
if (isMain) process.exit(main());
