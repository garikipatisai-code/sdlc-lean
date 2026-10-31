// Host-evidence contract tests (node --test, no harness needed).
// Exercises the captured V2 tool:execute.after hook against a temp repo with an
// active gate: hash-only rows, skip rules, symlink refusal, caps, and modes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

// Isolate the activation status file before importing the plugin.
process.env.XDG_STATE_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-lean-evidence-state-'));

const repoRoot = path.resolve(import.meta.dirname, '../..');
const pluginURL = pathToFileURL(path.join(repoRoot, '.opencode', 'plugins', 'sdlc-lean.js')).href;
const specURL = pathToFileURL(path.join(repoRoot, 'scripts', 'spec-check.mjs')).href;
const plugin = await import(pluginURL);
const spec = await import(specURL);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const LOG_REL = path.join('.sdlc', 'host-evidence.jsonl');
const logPath = (root) => path.join(root, LOG_REL);

const planText = () => `---
spec: docs/specs/spec.md
status: approved
approved_by: plan-author
approved_at: 2026-10-30T00:00:00Z
files:
  - src/app.js
allow:
  - docs/debt-ledger.md
---

# Plan
`;

const makeRoot = ({ gate = true } = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-lean-evidence-'));
  fs.mkdirSync(path.join(root, 'docs', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'plans'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'specs', 'spec.md'), '# Spec\n');
  fs.writeFileSync(path.join(root, 'docs', 'plans', 'plan.md'), planText());
  fs.writeFileSync(path.join(root, 'src', 'app.js'), '// app\n');
  fs.writeFileSync(path.join(root, 'docs', 'debt-ledger.md'), '# Debt ledger\n');
  if (gate) spec.writeGate(root, spec.buildGate(root, 'docs/plans/plan.md'));
  return root;
};

const tempRoot = (t, options) => {
  const root = makeRoot(options);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
};

const gateOf = (root) => spec.readGate(root);

const makeCtx = async (root) => {
  const captured = {};
  const ctx = {
    location: { directory: root },
    skill: { transform: async (cb) => cb({ add: () => {} }) },
    session: {
      hook: async (name, cb) => { captured[name] = cb; },
      context: async () => ({ data: { messages: [] } }),
      get: async () => ({ data: { id: 'sess-evidence' } }),
      synthetic: async () => {},
    },
    tool: { hook: async (name, cb) => { captured[`tool:${name}`] = cb; } },
    permission: { hook: () => {} },
  };
  await plugin.default.setup(ctx);
  assert.equal(typeof captured['tool:execute.after'], 'function', 'V2 must register tool:execute.after');
  return captured;
};

const afterEvent = ({
  sessionID = 'sess-evidence',
  tool = 'bash',
  command = 'node --test tests/example.mjs',
  output = 'test output\nok',
  exit = 0,
  workdir = '/tmp/sdlc-work',
  background = false,
  status = 'completed',
  metadata = {},
} = {}) => ({
  sessionID,
  tool,
  input: { command, workdir },
  output,
  result: { output, metadata: { exit } },
  metadata: { ...metadata, exit },
  workdir,
  status,
  ...(background ? { background: true } : {}),
});

const rows = (root) => {
  if (!fs.existsSync(logPath(root))) return [];
  return fs.readFileSync(logPath(root), 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
};

test('evidence: appends one hash-only row with the exact schema', async (t) => {
  const root = tempRoot(t);
  const captured = await makeCtx(root);
  const gate = gateOf(root);
  const command = '  !  node   --test   tests/example.mjs  ';
  const output = 'SECRET-STDOUT-abc\nline2';

  await captured['tool:execute.after'](afterEvent({ command, output }));

  const raw = fs.readFileSync(logPath(root), 'utf8');
  const lines = raw.trim().split('\n');
  assert.equal(lines.length, 1, 'one row per completed shell command');
  const row = JSON.parse(lines[0]);

  assert.deepEqual(Object.keys(row).sort(), [
    'argv0',
    'at',
    'command_sha256',
    'exit',
    'output_bytes',
    'output_sha256',
    'plan_sha256',
    'sessionID',
    'status',
    'tool',
    'workdir',
  ].sort());
  assert.equal(row.sessionID, 'sess-evidence');
  assert.equal(row.tool, 'bash');
  assert.equal(row.argv0, 'node');
  assert.equal(row.command_sha256, sha256('node --test tests/example.mjs'), 'the normalized command is hashed');
  assert.equal(row.plan_sha256, gate.plan_sha256, 'the active plan hash is stamped');
  assert.equal(row.status, 'completed');
  assert.equal(row.exit, 0);
  assert.equal(typeof row.exit, 'number');
  assert.equal(row.output_sha256, sha256(output));
  assert.equal(row.output_bytes, Buffer.byteLength(output));
  assert.equal(row.workdir, '/tmp/sdlc-work');
  assert.match(row.at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/);

  assert.ok(!raw.includes('SECRET-STDOUT-abc'), 'raw output must never be stored');
  assert.ok(!raw.includes('tests/example.mjs'), 'raw command must never be stored');
});

test('evidence: skips background, running, and timeout events', async (t) => {
  const root = tempRoot(t);
  const captured = await makeCtx(root);

  await captured['tool:execute.after'](afterEvent({ background: true, metadata: { background: true } }));
  await captured['tool:execute.after'](afterEvent({ metadata: { status: 'running' } }));
  await captured['tool:execute.after'](afterEvent({ metadata: { timeout: true } }));

  assert.deepEqual(rows(root), [], 'none of the skipped events may append a row');
});

test('evidence: ignores non-shell tools and repos with no active gate', async (t) => {
  const gated = tempRoot(t);
  const captured = await makeCtx(gated);
  await captured['tool:execute.after'](afterEvent({ tool: 'read' }));
  assert.deepEqual(rows(gated), []);

  const plain = tempRoot(t, { gate: false });
  const plainCaptured = await makeCtx(plain);
  await plainCaptured['tool:execute.after'](afterEvent());
  assert.equal(fs.existsSync(logPath(plain)), false, 'no gate means no evidence');
});

test('evidence: SDLC_LEAN_NO_HOST_EVIDENCE=1 disables the writer', async (t) => {
  const root = tempRoot(t);
  const captured = await makeCtx(root);
  process.env.SDLC_LEAN_NO_HOST_EVIDENCE = '1';
  try {
    await captured['tool:execute.after'](afterEvent());
  } finally {
    delete process.env.SDLC_LEAN_NO_HOST_EVIDENCE;
  }
  assert.equal(fs.existsSync(logPath(root)), false);
});

test('evidence: refuses a symlinked .sdlc directory without outside writes', async (t) => {
  const root = tempRoot(t);
  const captured = await makeCtx(root);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-lean-evidence-outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));

  fs.renameSync(path.join(root, '.sdlc'), outside);
  fs.symlinkSync(outside, path.join(root, '.sdlc'), 'dir');

  await captured['tool:execute.after'](afterEvent());

  assert.deepEqual(fs.readdirSync(outside), ['spec-gate.json'], 'nothing may be written through the symlink');
});

test('evidence: refuses a symlinked evidence file without outside writes', async (t) => {
  const root = tempRoot(t);
  const captured = await makeCtx(root);
  const outside = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-lean-evidence-file-')), 'outside.jsonl');
  t.after(() => fs.rmSync(path.dirname(outside), { recursive: true, force: true }));
  fs.writeFileSync(outside, 'untouched');
  fs.symlinkSync(outside, logPath(root));

  await captured['tool:execute.after'](afterEvent());

  assert.equal(fs.readFileSync(outside, 'utf8'), 'untouched', 'the symlink target must not be followed');
});

test('evidence: stops at 500 rows', async (t) => {
  const root = tempRoot(t);
  const captured = await makeCtx(root);
  const gate = gateOf(root);
  const seed = Array.from({ length: 500 }, (_, i) => JSON.stringify({
    at: '2026-10-30T00:00:00Z',
    sessionID: `seed-${i}`,
    tool: 'bash',
    argv0: 'node',
    command_sha256: sha256(`seed-${i}`),
    plan_sha256: gate.plan_sha256,
    status: 'completed',
    exit: 0,
    output_sha256: null,
    output_bytes: 0,
    workdir: null,
  })).join('\n') + '\n';
  fs.writeFileSync(logPath(root), seed);

  await captured['tool:execute.after'](afterEvent({ command: 'node --test tests/too-many.mjs' }));

  assert.equal(rows(root).length, 500, 'no append past the 500-row cap');
});

test('evidence: skips a >=2 MB log without a full read', async (t) => {
  const root = tempRoot(t);
  const captured = await makeCtx(root);
  const oversized = 'x'.repeat(2 * 1024 * 1024);
  fs.writeFileSync(logPath(root), oversized);

  const original = fs.readFileSync;
  let readTheLog = false;
  fs.readFileSync = function patched(target, ...rest) {
    if (path.resolve(String(target)) === path.resolve(logPath(root))) readTheLog = true;
    return original.call(this, target, ...rest);
  };
  try {
    await captured['tool:execute.after'](afterEvent());
  } finally {
    fs.readFileSync = original;
  }

  assert.equal(readTheLog, false, 'the cap must use statSync, not a full read');
  assert.equal(fs.statSync(logPath(root)).size, Buffer.byteLength(oversized), 'the oversized log is untouched');
});

test('evidence: creates .sdlc at 0700 and the log at 0600', async (t) => {
  const root = tempRoot(t);
  const captured = await makeCtx(root);

  await captured['tool:execute.after'](afterEvent());

  assert.equal(fs.statSync(path.join(root, '.sdlc')).mode & 0o777, 0o700);
  assert.equal(fs.statSync(logPath(root)).mode & 0o777, 0o600);
});

test('evidence: invalid events never throw', async (t) => {
  const root = tempRoot(t);
  const captured = await makeCtx(root);

  await assert.doesNotReject(() => captured['tool:execute.after']());
  await assert.doesNotReject(() => captured['tool:execute.after']({}));
  await assert.doesNotReject(() => captured['tool:execute.after'](null));
  await assert.doesNotReject(() => captured['tool:execute.after']({ tool: 'bash', input: {} }));
  assert.deepEqual(rows(root), [], 'malformed events must not write rows');
});
