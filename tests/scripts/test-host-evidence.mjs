// Host-evidence script contract tests (node --test, no harness needed).
// RED baseline: scripts/host-evidence.mjs does not exist yet, so this module
// fails to load with ERR_MODULE_NOT_FOUND until Task 4.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const scriptURL = pathToFileURL(path.join(repoRoot, 'scripts', 'host-evidence.mjs')).href;
const specURL = pathToFileURL(path.join(repoRoot, 'scripts', 'spec-check.mjs')).href;
const pluginURL = pathToFileURL(path.join(repoRoot, '.opencode', 'plugins', 'sdlc-lean.js')).href;

const mod = await import(scriptURL);
const spec = await import(specURL);
const plugin = await import(pluginURL);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const LOG_REL = path.join('.sdlc', 'host-evidence.jsonl');

// Independent copy of the documented normalizer: strip one leading !/$ shell
// prefix, trim, collapse whitespace.
const norm = (text) => String(text || '').replace(/^\s*[!$]\s+/, '').trim().replace(/\s+/g, ' ');

const planText = (tasks, label = 'Plan') => `---
spec: docs/specs/spec.md
status: approved
approved_by: plan-author
approved_at: 2026-10-30T00:00:00Z
files:
  - src/app.js
allow:
  - docs/debt-ledger.md
---

# ${label}

| # | Task | Spec req | Files | Test | Expected | Verify |
|---|---|---|---|---|---|---|
${tasks.map((verify, i) => `| ${i + 1} | task-${i + 1} | R | f | t | e | \`${verify}\` |`).join('\n')}
`;

const DEFAULT_TASKS = ['! node --test tests/a.mjs', 'node --test tests/b.mjs'];

const makeRepo = ({ tasks = DEFAULT_TASKS, gate = true } = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-lean-host-script-'));
  fs.mkdirSync(path.join(root, 'docs', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'plans'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'specs', 'spec.md'), '# Spec\n');
  fs.writeFileSync(path.join(root, 'docs', 'plans', 'plan.md'), planText(tasks));
  fs.writeFileSync(path.join(root, 'docs', 'plans', 'other.md'), planText(tasks, 'Other plan'));
  if (gate) spec.writeGate(root, spec.buildGate(root, 'docs/plans/plan.md'));
  return root;
};

const tempRepo = (t, options) => {
  const root = makeRepo(options);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
};

const gateOf = (root) => spec.readGate(root);

const rowFor = (gate, command, overrides = {}) => ({
  at: '2026-10-30T00:00:00Z',
  sessionID: 'sess-script',
  tool: 'bash',
  argv0: norm(command).split(' ')[0],
  command_sha256: sha256(norm(command)),
  plan_sha256: gate.plan_sha256,
  status: 'completed',
  exit: 0,
  output_sha256: null,
  output_bytes: 0,
  workdir: null,
  ...overrides,
});

const writeLog = (root, lines) => {
  fs.mkdirSync(path.join(root, '.sdlc'), { recursive: true });
  const body = lines
    .map((line) => (typeof line === 'string' ? line : JSON.stringify(line)))
    .join('\n');
  fs.writeFileSync(path.join(root, LOG_REL), lines.length ? `${body}\n` : '');
};

const rowsForTasks = (root, tasks, overrides = {}) => {
  const gate = gateOf(root);
  return tasks.map((verify) => rowFor(gate, verify, overrides));
};

// The exact return shape of matchPlanTasks is not fixed by the plan; accept a
// result array or an object with matched/total and assert the behavior.
const matchedOf = (result) => (Array.isArray(result) ? result.filter(Boolean).length : result.matched);
const totalOf = (result, tasks) => (Array.isArray(result) ? tasks.length : (result.total ?? tasks.length));

const capture = () => {
  const lines = [];
  const sink = (chunk) => { lines.push(String(chunk)); };
  const original = { log: console.log, error: console.error };
  console.log = sink;
  console.error = sink;
  return {
    io: {
      out: sink,
      err: sink,
      log: sink,
      stdout: { write: sink },
      stderr: { write: sink },
    },
    text: () => lines.join('\n'),
    restore: () => {
      console.log = original.log;
      console.error = original.error;
    },
  };
};

// --- normalizeCommand --------------------------------------------------------
test('script: normalizeCommand strips a leading ! or $ and collapses whitespace', () => {
  assert.equal(mod.normalizeCommand('  !  node   --test   tests/a.mjs  '), 'node --test tests/a.mjs');
  assert.equal(mod.normalizeCommand('$  node --test tests/a.mjs'), 'node --test tests/a.mjs');
  assert.equal(mod.normalizeCommand('node\t--test\n tests/a.mjs'), 'node --test tests/a.mjs');
  assert.equal(mod.normalizeCommand(''), '');
});

test('script: normalizeCommand leaves an inner $HOME alone', () => {
  assert.equal(mod.normalizeCommand('echo $HOME'), 'echo $HOME');
  assert.equal(mod.normalizeCommand('$ echo  $HOME'), 'echo $HOME');
  assert.equal(mod.normalizeCommand('echo "$HOME/bin"'), 'echo "$HOME/bin"');
});

test('script: the plugin and the script normalize identically', () => {
  const cases = [
    '  !  node   --test   tests/a.mjs  ',
    '$  node --test tests/a.mjs',
    'node\t--test\n tests/a.mjs',
    'echo $HOME',
    '',
  ];
  assert.equal(typeof plugin.normalizeCommand, 'function', 'the plugin must export normalizeCommand');
  for (const value of cases) {
    assert.equal(plugin.normalizeCommand(value), mod.normalizeCommand(value), JSON.stringify(value));
  }
});

// --- loadRows ----------------------------------------------------------------
test('script: loadRows skips malformed lines and counts them', (t) => {
  const root = tempRepo(t, { gate: false });
  const gate = { plan_sha256: 'a'.repeat(64) };
  writeLog(root, [
    JSON.stringify(rowFor(gate, 'node --test tests/a.mjs')),
    '{not json',
    '[1,2,3]',
  ]);

  const loaded = mod.loadRows(path.join(root, LOG_REL));
  assert.equal(loaded.rows.length, 1);
  assert.equal(loaded.malformed, 2);
});

test('script: loadRows treats a missing file as zero rows', (t) => {
  const root = tempRepo(t, { gate: false });
  const loaded = mod.loadRows(path.join(root, LOG_REL));
  assert.deepEqual(loaded, { rows: [], malformed: 0 });
});

test('script: loadRows skips lines over 64 KB', (t) => {
  const root = tempRepo(t, { gate: false });
  fs.mkdirSync(path.join(root, '.sdlc'), { recursive: true });
  fs.writeFileSync(path.join(root, LOG_REL), `${'x'.repeat((64 * 1024) + 1)}\n`);
  const loaded = mod.loadRows(path.join(root, LOG_REL));
  assert.deepEqual(loaded.rows, []);
  assert.ok(loaded.malformed >= 1);
});

// --- matchPlanTasks ----------------------------------------------------------
test('script: per-task matching requires plan hash, command hash, completed, and exit 0', (t) => {
  const root = tempRepo(t);
  const gate = gateOf(root);
  const tasks = spec.parsePlanTasks(fs.readFileSync(path.join(root, 'docs/plans/plan.md'), 'utf8'));
  assert.equal(tasks.length, 2);

  const all = mod.matchPlanTasks(tasks, rowsForTasks(root, DEFAULT_TASKS), gate);
  assert.equal(matchedOf(all), 2);
  assert.equal(totalOf(all, tasks), 2);

  const wrongPlan = mod.matchPlanTasks(tasks, rowsForTasks(root, DEFAULT_TASKS, { plan_sha256: '0'.repeat(64) }), gate);
  assert.equal(matchedOf(wrongPlan), 0);

  const wrongCommand = mod.matchPlanTasks(tasks, rowsForTasks(root, DEFAULT_TASKS, { command_sha256: '0'.repeat(64) }), gate);
  assert.equal(matchedOf(wrongCommand), 0);

  const notCompleted = mod.matchPlanTasks(tasks, rowsForTasks(root, DEFAULT_TASKS, { status: 'running' }), gate);
  assert.equal(matchedOf(notCompleted), 0);

  const failed = mod.matchPlanTasks(tasks, rowsForTasks(root, DEFAULT_TASKS, { exit: 1 }), gate);
  assert.equal(matchedOf(failed), 0);
});

test('script: a missing or null exit is unknown and never matches', (t) => {
  const root = tempRepo(t);
  const gate = gateOf(root);
  const tasks = spec.parsePlanTasks(fs.readFileSync(path.join(root, 'docs/plans/plan.md'), 'utf8'));

  const nullExit = rowsForTasks(root, DEFAULT_TASKS, { exit: null });
  assert.equal(matchedOf(mod.matchPlanTasks(tasks, nullExit, gate)), 0);

  const missingExit = rowsForTasks(root, DEFAULT_TASKS).map((row) => {
    const copy = { ...row };
    delete copy.exit;
    return copy;
  });
  assert.equal(matchedOf(mod.matchPlanTasks(tasks, missingExit, gate)), 0);
});

test('script: extra rows are advisory and rows are consumed once', (t) => {
  const root = tempRepo(t);
  const gate = gateOf(root);
  const tasks = spec.parsePlanTasks(fs.readFileSync(path.join(root, 'docs/plans/plan.md'), 'utf8'));

  const extras = [...rowsForTasks(root, DEFAULT_TASKS), rowFor(gate, 'git status')];
  assert.equal(matchedOf(mod.matchPlanTasks(tasks, extras, gate)), 2, 'extra rows never fail a match');

  const duplicated = [
    { task: 1, verify: 'node --test tests/a.mjs' },
    { task: 2, verify: 'node --test tests/a.mjs' },
  ];
  const oneRow = [rowFor(gate, 'node --test tests/a.mjs')];
  assert.equal(matchedOf(mod.matchPlanTasks(duplicated, oneRow, gate)), 1, 'a row matches at most one task');
});

// --- status / main -----------------------------------------------------------
test('script: status prints the advisory line and exits 0 when every task matches', (t) => {
  const root = tempRepo(t);
  writeLog(root, rowsForTasks(root, DEFAULT_TASKS));
  const cap = capture();
  try {
    assert.equal(mod.main(['status', '--root', root], cap.io), 0);
    assert.ok(cap.text().includes('host evidence: 2/2 matched (advisory)'), cap.text());
  } finally {
    cap.restore();
  }
});

test('script: --require-host exits 1 on an unmatched task', (t) => {
  const root = tempRepo(t);
  writeLog(root, [rowFor(gateOf(root), DEFAULT_TASKS[0])]);
  const cap = capture();
  try {
    assert.equal(mod.main(['status', '--root', root], cap.io), 0, 'advisory by default');
    assert.equal(mod.main(['status', '--root', root, '--require-host'], cap.io), 1);
    assert.ok(cap.text().includes('host evidence: 1/2 matched (advisory)'), cap.text());
  } finally {
    cap.restore();
  }
});

test('script: --require-host exits 1 on zero matches', (t) => {
  const root = tempRepo(t);
  writeLog(root, []);
  const cap = capture();
  try {
    assert.equal(mod.main(['status', '--root', root, '--require-host'], cap.io), 1);
  } finally {
    cap.restore();
  }
});

test('script: no active gate is advisory 0 and --require-host 1', (t) => {
  const root = tempRepo(t, { gate: false });
  const cap = capture();
  try {
    assert.equal(mod.main(['status', '--root', root], cap.io), 0);
    assert.ok(cap.text().includes('host evidence: no active spec gate'), cap.text());
    assert.equal(mod.main(['status', '--root', root, '--require-host'], cap.io), 1);
  } finally {
    cap.restore();
  }
});

test('script: --plan must hash to the active gate', (t) => {
  const root = tempRepo(t);
  writeLog(root, rowsForTasks(root, DEFAULT_TASKS));
  const cap = capture();
  try {
    assert.equal(mod.main(['status', '--root', root, '--plan', 'docs/plans/plan.md'], cap.io), 0);
    assert.equal(mod.main(['status', '--root', root, '--plan', 'docs/plans/other.md'], cap.io), 1);
  } finally {
    cap.restore();
  }
});

test('script: malformed lines are skipped and never fail a match', (t) => {
  const root = tempRepo(t);
  writeLog(root, [
    JSON.stringify(rowFor(gateOf(root), DEFAULT_TASKS[0])),
    '{broken',
    JSON.stringify(rowFor(gateOf(root), DEFAULT_TASKS[1])),
  ]);
  const cap = capture();
  try {
    assert.equal(mod.main(['status', '--root', root, '--require-host'], cap.io), 0);
    assert.ok(cap.text().includes('host evidence: 2/2 matched (advisory)'), cap.text());
  } finally {
    cap.restore();
  }
});

test('script: help names the status command', () => {
  const cap = capture();
  try {
    assert.equal(mod.main(['-h'], cap.io), 0);
    assert.match(cap.text(), /status/);
  } finally {
    cap.restore();
  }
});
