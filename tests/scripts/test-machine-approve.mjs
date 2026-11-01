// Machine-approve regression tests (MA-1, MA-2, MA-3, MA-5, MA-8).
// Hermetic: tmp git roots, fixtures in-test, no live services.
// Pattern copied from tests/scripts/test-auto-tier-machine-close.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync, spawn } from 'node:child_process';
import { pathToFileURL } from 'url';

const specURL = pathToFileURL(path.resolve(import.meta.dirname, '../../scripts/spec-check.mjs')).href;
const spec = await import(specURL);
const scriptPath = path.resolve(import.meta.dirname, '../../scripts/spec-check.mjs');

const TASK_HEADER = '# | Task | Spec req | Files | Test | Expected | Verify';
const VERIFY_CMD = 'true';

const ENVELOPE_REL = 'docs/envelope.md';
const PLAN_REL = 'docs/plans/plan.md';
const SPEC_REL = 'docs/specs/spec.md';
const LEDGER_REL = 'docs/audit-ledger.md';

const envelopeText = (paths = ['src/app.js', 'docs/specs/spec.md']) => `# Envelope — standing pre-approval (test fixture)

## Paths (allowed scope, relative only)

${paths.map((p) => `- ${p}`).join('\n')}

## Reversibility (reversal = commit SHA per run)

- reversal: git commit SHA of the reverting commit, recorded per run in the audit ledger row
- strategy: git revert <SHA> restores the tree

## No external effects (nothing leaves this machine)

- publish: no
- release: no
- spend: no
- network-prod: no
- grader-changes: no
- red-close: no

## Budgets (loop caps for the unattended run)

- max-iterations: 3
- check: npm run verify
`;

const planText = ({ approvedAt, files = ['src/app.js'], envelopeRel = ENVELOPE_REL } = {}) => `---
spec: ${SPEC_REL}
status: approved
approved_by: tester
approved_at: ${approvedAt}
files:
${files.map((f) => `  - ${f}`).join('\n')}
---

# Plan

Envelope: ${envelopeRel}

| ${TASK_HEADER} |
|---|---|---|---|---|---|---|
| 1 | Do task | MA-1 | src/app.js | unit | green | ${VERIFY_CMD} |
`;

const git = (root, args) => {
  const res = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.equal(res.status, 0, `git ${args.join(' ')} failed: ${res.stderr || res.stdout}`);
  return res;
};

const makeApproveRepo = (t, { planFiles = ['src/app.js'], envelopePaths = ['src/app.js', 'docs/specs/spec.md'] } = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'machine-approve-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'docs', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'plans'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  const approvedAt = new Date(Date.now() - 60_000).toISOString();
  fs.writeFileSync(path.join(root, SPEC_REL), '# Spec\n');
  fs.writeFileSync(path.join(root, ENVELOPE_REL), envelopeText(envelopePaths));
  fs.writeFileSync(path.join(root, 'src', 'app.js'), '// app\n');
  fs.writeFileSync(
    path.join(root, LEDGER_REL),
    `# Audit ledger\n\n| date | tier | check | result | reversal |\n|---|---|---|---|---|\n| 2026-10-31T12:00:00.000Z | Human | manual | accept | ${ENVELOPE_REL} |\n`,
  );
  fs.writeFileSync(path.join(root, PLAN_REL), planText({ approvedAt, files: planFiles }));
  git(root, ['init']);
  git(root, ['config', 'user.email', 'test@example.com']);
  git(root, ['config', 'user.name', 'Test']);
  git(root, ['add', '-A']);
  git(root, ['commit', '--no-gpg-sign', '-m', 'init']);
  return { root, approvedAt };
};

const codeOf = (fn) => {
  try {
    fn();
  } catch (err) {
    return String(err?.code ?? err?.message ?? err);
  }
  return null;
};

const run = (args, cwd) => spawnSync(process.execPath, [scriptPath, ...args], { cwd, encoding: 'utf8' });

const markerRel = path.join('.sdlc', 'spec-gate.json');

test('machine-approve refuses plan scope outside the envelope (envelope-ceiling)', (t) => {
  const { root } = makeApproveRepo(t, { planFiles: ['outside/evil.js'] });
  const ledgerBefore = fs.readFileSync(path.join(root, LEDGER_REL), 'utf8');
  const code = codeOf(() => spec.approveMachineGate(root, { plan: PLAN_REL, envelope: ENVELOPE_REL }));
  assert.match(code, /envelope-ceiling/);
  assert.equal(fs.existsSync(path.join(root, markerRel)), false, 'refusal must not write the gate file');
  assert.equal(fs.readFileSync(path.join(root, LEDGER_REL), 'utf8'), ledgerBefore, 'refusal must not append the ledger');
});

test('machine-approve refuses a dirty envelope since authorization (envelope-changed)', (t) => {
  const { root } = makeApproveRepo(t);
  const ledgerBefore = fs.readFileSync(path.join(root, LEDGER_REL), 'utf8');
  fs.appendFileSync(path.join(root, ENVELOPE_REL), '\n# test-dirty\n');
  const code = codeOf(() => spec.approveMachineGate(root, { plan: PLAN_REL, envelope: ENVELOPE_REL }));
  assert.match(code, /envelope-changed/);
  assert.equal(fs.existsSync(path.join(root, markerRel)), false, 'refusal must not write the gate file');
  assert.equal(fs.readFileSync(path.join(root, LEDGER_REL), 'utf8'), ledgerBefore, 'refusal must not append the ledger');
});

test('machine-approve refuses a second writer after gate exists (double-gate)', (t) => {
  const { root } = makeApproveRepo(t);
  const first = spec.approveMachineGate(root, { plan: PLAN_REL, envelope: ENVELOPE_REL });
  assert.equal(first.plan, PLAN_REL);
  const markerBefore = fs.readFileSync(path.join(root, markerRel), 'utf8');
  const ledgerBefore = fs.readFileSync(path.join(root, LEDGER_REL), 'utf8');
  const second = codeOf(() => spec.approveMachineGate(root, { plan: PLAN_REL, envelope: ENVELOPE_REL }));
  assert.match(second, /double-gate/);
  assert.equal(fs.readFileSync(path.join(root, markerRel), 'utf8'), markerBefore, 'refusal must not rewrite the gate file');
  assert.equal(fs.readFileSync(path.join(root, LEDGER_REL), 'utf8'), ledgerBefore, 'refusal must not append the ledger');
});

test('machine-approve concurrent racers: exactly one wins, loser refuses double-gate (wx EEXIST)', async (t) => {
  const { root } = makeApproveRepo(t);
  const runChild = () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, 'approve', PLAN_REL, '--machine', '--envelope', ENVELOPE_REL], { cwd: root });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += String(d); });
    child.stderr.on('data', (d) => { stderr += String(d); });
    child.on('error', reject);
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`child timed out; stdout=${JSON.stringify(stdout)} stderr=${JSON.stringify(stderr)}`));
    }, 15000);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ status: code, stdout, stderr });
    });
  });
  // Both children start before either is awaited: true parallelism, so both
  // pass the entry gate check and the wx-exclusive create decides the winner.
  const [a, b] = await Promise.all([runChild(), runChild()]);
  const wins = [a, b].filter((r) => r.status === 0);
  const losses = [a, b].filter((r) => r.status !== 0);
  assert.equal(wins.length, 1, `exactly one racer must win, got statuses ${a.status}/${b.status}: ${JSON.stringify([a.stderr, b.stderr])}`);
  assert.equal(losses.length, 1);
  assert.match(losses[0].stderr, /double-gate/);
  assert.ok(fs.existsSync(path.join(root, markerRel)), 'winner must write the gate file');
  const ledger = fs.readFileSync(path.join(root, LEDGER_REL), 'utf8');
  assert.equal(ledger.split('\n').filter((line) => line.includes('Auto-activate')).length, 1, 'loser must not append a second activation row');
});

test('machine-approve activates the gate and writes a distinct activation audit row', (t) => {
  const { root } = makeApproveRepo(t);
  const approved = spec.approveMachineGate(root, { plan: PLAN_REL, envelope: ENVELOPE_REL });
  assert.equal(approved.plan, PLAN_REL);
  assert.equal(approved.envelope, ENVELOPE_REL);
  assert.ok(fs.existsSync(path.join(root, '.sdlc', 'spec-gate.json')), 'happy path must write the gate file');
  const ledger = fs.readFileSync(path.join(root, LEDGER_REL), 'utf8');
  assert.match(ledger, /Auto-activate/);
  assert.match(ledger, /\| active \|/);
  assert.ok(ledger.includes(ENVELOPE_REL), 'activation row must carry the envelope rel');
});

test('human approve path is unchanged: non-TTY still tty-required', (t) => {
  const { root } = makeApproveRepo(t);
  const human = run(['approve', PLAN_REL], root);
  assert.equal(human.status, 1);
  assert.match(human.stderr, /tty-required/);
  assert.equal(fs.existsSync(path.join(root, '.sdlc', 'spec-gate.json')), false);
});

test('machine approve without --envelope refuses missing-envelope', (t) => {
  const { root } = makeApproveRepo(t);
  const noEnvelope = run(['approve', PLAN_REL, '--machine'], root);
  assert.equal(noEnvelope.status, 1);
  assert.match(noEnvelope.stderr, /missing-envelope/);
});
