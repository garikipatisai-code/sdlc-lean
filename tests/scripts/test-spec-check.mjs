// Spec-gate contract tests: plan parsing, hashes, marker lifecycle, scope match.
// RED first: scripts/spec-check.mjs does not exist until the implementation step.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'url';

const moduleURL = pathToFileURL(path.resolve(import.meta.dirname, '../../scripts/spec-check.mjs')).href;
const scriptPath = path.resolve(import.meta.dirname, '../../scripts/spec-check.mjs');

const TASK_HEADER = '# | Task | Spec req | Files | Test | Expected | Verify';
const DEFAULT_VERIFY = 'node --test tests/example.mjs';

const defaultTasks = [
  {
    n: 1,
    task: 'Example task',
    spec: 'AC1',
    files: '`src/app.js`',
    test: 'unit',
    expected: 'green',
    verify: DEFAULT_VERIFY,
  },
];

const taskTable = (tasks = defaultTasks, header = TASK_HEADER) => [
  `| ${header} |`,
  '|---|---|---|---|---|---|---|',
  ...tasks.map((r) => `| ${r.n} | ${r.task} | ${r.spec} | ${r.files} | ${r.test} | ${r.expected} | ${r.verify} |`),
].join('\n');

const planText = ({
  spec = 'docs/specs/spec.md',
  status = 'approved',
  approvedBy = 'tester',
  approvedAt = '2026-10-24T00:00:00Z',
  files = ['src/app.js'],
  allow = [],
  tasks = defaultTasks,
  taskHeader = TASK_HEADER,
} = {}) => `---
spec: ${spec}
status: ${status}
approved_by: ${approvedBy}
approved_at: ${approvedAt}
files:
${files.map((f) => `  - ${f}`).join('\n')}
${allow.length ? `allow:\n${allow.map((f) => `  - ${f}`).join('\n')}\n` : ''}---

# Plan

Body.

${taskTable(tasks, taskHeader)}
`;

const makeRepo = (opts = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-check-'));
  fs.mkdirSync(path.join(root, 'docs', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'plans'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'specs', 'spec.md'), '# Spec\n\nApproved.\n');
  fs.writeFileSync(path.join(root, 'docs', 'plans', 'plan.md'), planText(opts));
  return root;
};

const markerPath = (root) => path.join(root, '.sdlc', 'spec-gate.json');
const evidencePath = (root) => path.join(root, 'docs', 'plans', 'plan-evidence.json');

const evidenceRow = (overrides = {}) => ({
  task: 1,
  verify: DEFAULT_VERIFY,
  exit: 0,
  at: '2026-10-24T00:00:00Z',
  ...overrides,
});

const baseEvidence = (gate, tasks = [evidenceRow()]) => ({
  plan: gate.plan,
  plan_sha256: gate.plan_sha256,
  tasks,
});

const writeEvidence = (root, document) => {
  const file = evidencePath(root);
  fs.writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`);
  return file;
};

const load = async () => import(moduleURL);
const run = (args, cwd) => spawnSync(process.execPath, [scriptPath, ...args], { cwd, encoding: 'utf8' });

test('parsePlanText extracts the approved frontmatter', async (t) => {
  const mod = await load();
  const parsed = mod.parsePlanText(planText({ files: ['src/a.ts', 'src/**/*.ts'], allow: ['docs/plans/plan-progress.md'] }));
  assert.equal(parsed.spec, 'docs/specs/spec.md');
  assert.equal(parsed.status, 'approved');
  assert.equal(parsed.approved_by, 'tester');
  assert.equal(parsed.approved_at, '2026-10-24T00:00:00Z');
  assert.deepEqual(parsed.files, ['src/a.ts', 'src/**/*.ts']);
  assert.deepEqual(parsed.allow, ['docs/plans/plan-progress.md']);
});

test('parsePlanText rejects missing frontmatter, unapproved status, and empty files', async () => {
  const mod = await load();
  assert.throws(() => mod.parsePlanText('# no frontmatter'), /frontmatter/i);
  assert.throws(() => mod.parsePlanText(planText({ status: 'draft' })), /approved/i);
  assert.throws(() => mod.parsePlanText(planText({ files: [] })), /files/i);
});

test('parsePlanText rejects duplicate keys', async () => {
  const mod = await load();
  const text = `---\nspec: docs/specs/spec.md\nstatus: approved\napproved_by: tester\napproved_at: 2026-10-24T00:00:00Z\nfiles:\n  - src/a.js\nfiles:\n  - src/b.js\n---\n\n# Plan\n`;
  assert.throws(() => mod.parsePlanText(text), /duplicate/i);
});

test('parsePlanText rejects non-UTC approval timestamps and unsafe patterns', async () => {
  const mod = await load();
  assert.throws(() => mod.parsePlanText(planText({ approvedAt: '2026-10-24 00:00:00' })), /UTC/i);
  assert.throws(() => mod.parsePlanText(planText({ files: ['../secret'] })), /unsafe|escape/i);
  assert.throws(() => mod.parsePlanText(planText({ files: ['/etc/passwd'] })), /unsafe|absolute|relative/i);
});

test('humanApproval requires stdin and stdout to be TTYs', async () => {
  const mod = await load();
  assert.equal(mod.humanApproval({ stdinTTY: true, stdoutTTY: true }), true);
  assert.throws(() => mod.humanApproval({ stdinTTY: false, stdoutTTY: true }), /TTY|terminal/i);
  assert.throws(() => mod.humanApproval({ stdinTTY: true, stdoutTTY: false }), /TTY|terminal/i);
  assert.throws(() => mod.humanApproval({}), /TTY|terminal/i);
  assert.throws(() => mod.humanApproval(), /TTY|terminal/i);
});

test('parsePlanTasks reads task rows and their Verify commands', async () => {
  const mod = await load();
  const tasks = mod.parsePlanTasks(planText({
    tasks: [
      { n: 1, task: 'First', spec: 'AC1', files: '`a.js`', test: 'unit', expected: 'green', verify: 'node --test tests/a.mjs' },
      { n: 2, task: 'Second', spec: 'AC2', files: '`b.js`', test: 'unit', expected: 'green', verify: 'npm run verify' },
    ],
  }));
  assert.deepEqual(tasks.map(({ task, verify }) => ({ task, verify })), [
    { task: 1, verify: 'node --test tests/a.mjs' },
    { task: 2, verify: 'npm run verify' },
  ]);
});

test('parsePlanTasks strips one backtick pair from a wrapped Verify cell', async () => {
  const mod = await load();
  const tasks = mod.parsePlanTasks(planText({
    tasks: [{ n: 1, task: 'Wrapped', spec: 'AC1', files: 'x', test: 't', expected: 'e', verify: '`npm run verify`' }],
  }));
  assert.equal(tasks[0].verify, 'npm run verify');
});

test('parsePlanTasks unescapes escaped pipes inside Verify', async () => {
  const mod = await load();
  const tasks = mod.parsePlanTasks(planText({
    tasks: [{ n: 1, task: 'Piped', spec: 'AC1', files: 'x', test: 't', expected: 'e', verify: 'node -e "a \\| b"' }],
  }));
  assert.equal(tasks[0].verify, 'node -e "a | b"');
});

test('parsePlanTasks rejects duplicate task numbers', async () => {
  const mod = await load();
  const text = planText({
    tasks: [
      { n: 1, task: 'First', spec: 'AC1', files: 'x', test: 't', expected: 'e', verify: 'node --test a.mjs' },
      { n: 1, task: 'Again', spec: 'AC2', files: 'y', test: 't', expected: 'e', verify: 'node --test b.mjs' },
    ],
  });
  assert.throws(() => mod.parsePlanTasks(text), /duplicate/i);
});

test('parsePlanTasks rejects a table without a Verify header', async () => {
  const mod = await load();
  const text = planText({ taskHeader: '# | Task | Spec req | Files | Test | Expected' });
  assert.throws(() => mod.parsePlanTasks(text), /missing-task-table|task table|Verify/i);
});

test('glob matching handles exact, star, double-star, and question mark', async () => {
  const mod = await load();
  assert.equal(mod.matchPattern('src/app.js', 'src/app.js'), true);
  assert.equal(mod.matchPattern('src/*.js', 'src/app.js'), true);
  assert.equal(mod.matchPattern('src/*.js', 'src/lib/app.js'), false);
  assert.equal(mod.matchPattern('src/**/*.ts', 'src/app.ts'), true);
  assert.equal(mod.matchPattern('src/**/*.ts', 'src/lib/deep/app.ts'), true);
  assert.equal(mod.matchPattern('**/*.md', 'README.md'), true);
  assert.equal(mod.matchPattern('**/*.md', 'docs/plans/x.md'), true);
  assert.equal(mod.matchPattern('src/?.js', 'src/a.js'), true);
  assert.equal(mod.matchPattern('src/?.js', 'src/ab.js'), false);
});

test('isAllowed accepts plan files, allow entries, and the derived progress ledger', async () => {
  const mod = await load();
  const gate = {
    plan: 'docs/plans/plan.md',
    files: ['src/**/*.ts'],
    allow: ['docs/debt-ledger.md'],
  };
  assert.equal(mod.isAllowed(gate, 'src/a.ts'), true);
  assert.equal(mod.isAllowed(gate, 'src/deep/a.ts'), true);
  assert.equal(mod.isAllowed(gate, 'docs/debt-ledger.md'), true);
  assert.equal(mod.isAllowed(gate, 'docs/plans/plan-progress.md'), true);
  assert.equal(mod.isAllowed(gate, 'docs/plans/plan.md'), false);
  assert.equal(mod.isAllowed(gate, 'src/a.js'), false);

  const immutable = {
    plan: 'docs/plans/plan.md',
    spec: 'docs/specs/spec.md',
    files: ['docs/plans/plan.md', 'docs/specs/spec.md'],
    allow: [],
  };
  assert.equal(mod.isAllowed(immutable, 'docs/plans/plan.md'), false);
  assert.equal(mod.isAllowed(immutable, 'docs/specs/spec.md'), false);

  const implicit = { plan: 'docs/plans/plan.md', spec: 'docs/specs/spec.md', files: ['src/**'], allow: [] };
  assert.equal(mod.isAllowed(implicit, 'docs/debt-ledger.md'), true);
  assert.equal(mod.isAllowed(implicit, '.sdlc/spec-gate.json'), false);
  const markerScope = { ...implicit, files: ['.sdlc/**'] };
  assert.equal(mod.isAllowed(markerScope, '.sdlc/spec-gate.json'), false);
});

test('buildGate hashes the spec and plan and writes a round-trippable marker', async (t) => {
  const mod = await load();
  const root = makeRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const gate = mod.buildGate(root, 'docs/plans/plan.md');
  assert.equal(gate.version, 1);
  assert.equal(gate.plan, 'docs/plans/plan.md');
  assert.equal(gate.spec, 'docs/specs/spec.md');
  assert.match(gate.plan_sha256, /^[0-9a-f]{64}$/);
  assert.match(gate.spec_sha256, /^[0-9a-f]{64}$/);
  assert.equal(gate.cli_sha256, mod.hashFile(scriptPath));
  const marker = mod.writeGate(root, gate);
  assert.equal(marker, path.join(root, '.sdlc', 'spec-gate.json'));
  assert.deepEqual(mod.readGate(root), gate);
  assert.equal(fs.readdirSync(path.join(root, '.sdlc')).some((f) => f.includes('.tmp')), false);
});

test('validateGate passes a fresh gate and fails on spec or plan drift', async (t) => {
  const mod = await load();
  const root = makeRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const gate = mod.buildGate(root, 'docs/plans/plan.md');
  assert.doesNotThrow(() => mod.validateGate(root, gate));

  fs.appendFileSync(path.join(root, 'docs', 'specs', 'spec.md'), '\nchanged\n');
  assert.throws(() => mod.validateGate(root, gate), /spec.*drift|drift.*spec/i);

  const root2 = makeRepo();
  t.after(() => fs.rmSync(root2, { recursive: true, force: true }));
  const gate2 = mod.buildGate(root2, 'docs/plans/plan.md');
  fs.appendFileSync(path.join(root2, 'docs', 'plans', 'plan.md'), '\nchanged\n');
  assert.throws(() => mod.validateGate(root2, gate2), /plan.*drift|drift.*plan/i);
});

test('validateGate rejects a missing spec, symlinked spec, and malformed marker', async (t) => {
  const mod = await load();
  const root = makeRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const gate = mod.buildGate(root, 'docs/plans/plan.md');

  fs.rmSync(path.join(root, 'docs', 'specs', 'spec.md'));
  assert.throws(() => mod.validateGate(root, gate), /missing|spec/i);

  const root2 = makeRepo();
  t.after(() => fs.rmSync(root2, { recursive: true, force: true }));
  const outside = path.join(root2, 'outside.md');
  fs.writeFileSync(outside, '# outside\n');
  const gate2 = mod.buildGate(root2, 'docs/plans/plan.md');
  fs.rmSync(path.join(root2, 'docs', 'specs', 'spec.md'));
  fs.symlinkSync(outside, path.join(root2, 'docs', 'specs', 'spec.md'));
  assert.throws(() => mod.validateGate(root2, gate2), /symlink|unsafe/i);

  fs.mkdirSync(path.join(root2, '.sdlc'), { recursive: true });
  fs.writeFileSync(path.join(root2, '.sdlc', 'spec-gate.json'), '{not json');
  assert.throws(() => mod.readGate(root2), /marker|json/i);
});

test('closeGate refuses missing or unbound evidence and keeps the marker', async (t) => {
  const mod = await load();
  const root = makeRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const gate = mod.buildGate(root, 'docs/plans/plan.md');
  mod.writeGate(root, gate);

  assert.throws(() => mod.closeGate(root), /evidence/i);
  assert.ok(fs.existsSync(markerPath(root)), 'missing evidence must leave the marker');

  writeEvidence(root, { ...baseEvidence(gate), plan_sha256: '0'.repeat(64) });
  assert.throws(() => mod.closeGate(root), /plan_sha256|plan hash/i);
  assert.ok(fs.existsSync(markerPath(root)), 'a wrong plan_sha256 must leave the marker');
});

test('closeGate refuses missing, extra, or mismatched task rows and keeps the marker', async (t) => {
  const mod = await load();
  const cases = [
    { name: 'missing row', tasks: [], error: /missing|one row|task/i },
    { name: 'extra row', tasks: [evidenceRow(), evidenceRow({ task: 2 })], error: /extra|unexpected|task 2|one row/i },
    { name: 'mismatched verify', tasks: [evidenceRow({ verify: 'node --test tests/other.mjs' })], error: /verify/i },
    { name: 'non-zero exit', tasks: [evidenceRow({ exit: 1 })], error: /exit/i },
    { name: 'invalid at', tasks: [evidenceRow({ at: '2026-10-24 00:00:00' })], error: /UTC|timestamp|\bat\b/i },
  ];
  for (const c of cases) {
    const root = makeRepo();
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const gate = mod.buildGate(root, 'docs/plans/plan.md');
    mod.writeGate(root, gate);
    writeEvidence(root, baseEvidence(gate, c.tasks));
    assert.throws(() => mod.closeGate(root), c.error, c.name);
    assert.ok(fs.existsSync(markerPath(root)), `${c.name} must leave the marker`);
  }
});

test('closeGate refuses plan or spec drift and keeps the marker', async (t) => {
  const mod = await load();
  const planRoot = makeRepo();
  t.after(() => fs.rmSync(planRoot, { recursive: true, force: true }));
  const planGate = mod.buildGate(planRoot, 'docs/plans/plan.md');
  mod.writeGate(planRoot, planGate);
  writeEvidence(planRoot, baseEvidence(planGate));
  fs.appendFileSync(path.join(planRoot, 'docs', 'plans', 'plan.md'), '\nchanged\n');
  assert.throws(() => mod.closeGate(planRoot), /plan.*drift|drift/i);
  assert.ok(fs.existsSync(markerPath(planRoot)), 'plan drift must leave the marker');

  const specRoot = makeRepo();
  t.after(() => fs.rmSync(specRoot, { recursive: true, force: true }));
  const specGate = mod.buildGate(specRoot, 'docs/plans/plan.md');
  mod.writeGate(specRoot, specGate);
  writeEvidence(specRoot, baseEvidence(specGate));
  fs.appendFileSync(path.join(specRoot, 'docs', 'specs', 'spec.md'), '\nchanged\n');
  assert.throws(() => mod.closeGate(specRoot), /spec.*drift|drift/i);
  assert.ok(fs.existsSync(markerPath(specRoot)), 'spec drift must leave the marker');
});

test('closeGate accepts complete evidence, returns the evidence hash, and removes the marker', async (t) => {
  const mod = await load();
  const root = makeRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const gate = mod.buildGate(root, 'docs/plans/plan.md');
  mod.writeGate(root, gate);
  const file = writeEvidence(root, baseEvidence(gate));

  const result = mod.closeGate(root);
  assert.match(result.sha256, /^[0-9a-f]{64}$/);
  assert.equal(result.sha256, mod.hashFile(file));
  assert.match(result.evidence, /docs[\\/]plans[\\/]plan-evidence\.json$/);
  assert.equal(fs.existsSync(markerPath(root)), false, 'valid evidence must remove the marker');
  assert.equal(mod.closeGate(root), null, 'closing with no marker reports no gate');
});

test('checkPath reports inactive, allowed, and blocked targets', async (t) => {
  const mod = await load();
  const root = makeRepo({ allow: ['docs/debt-ledger.md'] });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  assert.deepEqual(mod.checkPath(root, 'src/app.js'), { active: false, allowed: true });

  const gate = mod.buildGate(root, 'docs/plans/plan.md');
  mod.writeGate(root, gate);

  const allowed = mod.checkPath(root, 'src/app.js');
  assert.equal(allowed.active, true);
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.rel, 'src/app.js');

  const progress = mod.checkPath(root, 'docs/plans/plan-progress.md');
  assert.equal(progress.allowed, true);

  const debt = mod.checkPath(root, 'docs/debt-ledger.md');
  assert.equal(debt.allowed, true);

  const blocked = mod.checkPath(root, 'src/other.js');
  assert.equal(blocked.allowed, false);

  assert.throws(() => mod.checkPath(root, '../outside.js'), /unsafe|escape/i);
});

test('checkPath blocks symlinked directory escapes and protected-file aliases', async (t) => {
  const mod = await load();
  const root = makeRepo({ files: ['src/**', '**/*.md'] });
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-outside-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(outside, 'x.txt'), 'x');
  fs.symlinkSync(outside, path.join(root, 'src', 'link'), 'dir');
  fs.symlinkSync(path.join(root, 'docs', 'plans'), path.join(root, 'alias'), 'dir');

  const gate = mod.buildGate(root, 'docs/plans/plan.md');
  mod.writeGate(root, gate);

  assert.throws(() => mod.checkPath(root, 'src/link/x.txt'), /unsafe|symlink|escape/i);
  assert.throws(() => mod.checkPath(root, 'src/link/new.txt'), /unsafe|symlink|escape/i);
  const alias = mod.checkPath(root, 'alias/plan.md');
  assert.equal(alias.allowed, false);
});

test('CLI status/verify/check round-trip and refusal on drift', async (t) => {
  const mod = await load();
  const root = makeRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const inactive = run(['verify'], root);
  assert.equal(inactive.status, 0, 'no marker must verify as inactive');
  assert.match(inactive.stdout, /no active spec gate/i);
  const required = run(['verify', '--require-active'], root);
  assert.equal(required.status, 2, 'require-active must fail with no marker');
  assert.match(required.stderr, /no active spec gate/i);

  const gate = mod.buildGate(root, 'docs/plans/plan.md');
  mod.writeGate(root, gate);
  writeEvidence(root, baseEvidence(gate));

  const status = run(['status'], root);
  assert.equal(status.status, 0, status.stderr);
  assert.match(status.stdout, /docs\/plans\/plan\.md/);

  assert.equal(run(['verify'], root).status, 0);
  assert.equal(run(['verify', '--require-active'], root).status, 0);
  assert.equal(run(['check', 'src/app.js'], root).status, 0);
  assert.equal(run(['check', 'src/other.js'], root).status, 1);
  assert.equal(run(['check', 'src/app.js', 'src/other.js'], root).status, 1, 'batch check fails if any target is blocked');

  fs.appendFileSync(path.join(root, 'docs', 'specs', 'spec.md'), '\nchanged\n');
  const drift = run(['verify'], root);
  assert.equal(drift.status, 1);
  assert.match(drift.stderr, /drift/i);
  assert.equal(run(['check', 'src/app.js'], root).status, 1);

  const close = run(['close'], root);
  assert.equal(close.status, 1, 'close must refuse while the plan or spec drifted');
  assert.match(close.stderr, /drift/i);
  assert.ok(fs.existsSync(markerPath(root)), 'a refused close must keep the marker');
});

test('CLI close requires evidence and reports the evidence hash', async (t) => {
  const mod = await load();
  const refusedRoot = makeRepo();
  t.after(() => fs.rmSync(refusedRoot, { recursive: true, force: true }));
  const refusedGate = mod.buildGate(refusedRoot, 'docs/plans/plan.md');
  mod.writeGate(refusedRoot, refusedGate);

  const refused = run(['close'], refusedRoot);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /evidence/i);
  assert.ok(fs.existsSync(markerPath(refusedRoot)), 'missing evidence must keep the marker');

  const root = makeRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const gate = mod.buildGate(root, 'docs/plans/plan.md');
  mod.writeGate(root, gate);
  const file = writeEvidence(root, baseEvidence(gate));

  const logs = [];
  const original = console.log;
  console.log = (...args) => { logs.push(args.join(' ')); };
  let code;
  try {
    code = mod.main(['--root', root, 'close'], { stdinTTY: true, stdoutTTY: true });
  } finally {
    console.log = original;
  }
  assert.equal(code, 0, logs.join('\n'));
  assert.match(logs.join('\n'), /closed spec gate: evidence/i);
  assert.match(logs.join('\n'), new RegExp(mod.hashFile(file)));
  assert.equal(fs.existsSync(markerPath(root)), false);
});

test('CLI approve refuses a piped stdin/stdout and writes no marker', async (t) => {
  const root = makeRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const res = run(['approve', 'docs/plans/plan.md'], root);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /TTY|terminal/i);
  assert.equal(fs.existsSync(markerPath(root)), false, 'non-TTY approval must write no marker');
});

test('CLI approve checks the TTY before validating the plan', async (t) => {
  const root = makeRepo({ status: 'draft' });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const res = run(['approve', 'docs/plans/plan.md'], root);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /TTY|terminal/i);
  assert.doesNotMatch(res.stderr, /not-approved/i);
  assert.equal(fs.existsSync(markerPath(root)), false);
});

test('main with an injected TTY approves and prints the active gate', async (t) => {
  const mod = await load();
  const root = makeRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const logs = [];
  const original = console.log;
  console.log = (...args) => { logs.push(args.join(' ')); };
  let code;
  try {
    code = mod.main(['--root', root, 'approve', 'docs/plans/plan.md'], { stdinTTY: true, stdoutTTY: true });
  } finally {
    console.log = original;
  }
  assert.equal(code, 0);
  assert.ok(fs.existsSync(markerPath(root)), 'injected-TTY approval must write the marker');
  assert.match(logs.join('\n'), /active spec gate/i);
});

test('buildGate refuses an unapproved plan and a plan outside the repo', async (t) => {
  const mod = await load();
  const root = makeRepo({ status: 'draft' });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.throws(() => mod.buildGate(root, 'docs/plans/plan.md'), /approved/i);

  const root2 = makeRepo();
  t.after(() => fs.rmSync(root2, { recursive: true, force: true }));
  assert.throws(() => mod.buildGate(root2, '../outside.md'), /unsafe-path|escapes|outside/i);
});

test('CLI invoked through a symlink still runs', async (t) => {
  const root = makeRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const link = path.join(root, 'spec-check-link.mjs');
  fs.symlinkSync(scriptPath, link);
  const res = spawnSync(process.execPath, [link, 'verify'], { cwd: root, encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /no active spec gate/i);
});
