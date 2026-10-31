// Auto-tier machine-close regression tests (MC-1, AUD-1, RH-1).
// Hermetic: tmp git roots, fixtures in-test, no live services.
// Same-session SoP is covered in tests/opencode/test-auto-tier-sop.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'url';

const specURL = pathToFileURL(path.resolve(import.meta.dirname, '../../scripts/spec-check.mjs')).href;
const spec = await import(specURL);

const TASK_HEADER = '# | Task | Spec req | Files | Test | Expected | Verify';
const VERIFY_CMD = 'true';

const planText = ({ approvedAt, files = ['src/app.js'] } = {}) => `---
spec: docs/specs/spec.md
status: approved
approved_by: tester
approved_at: ${approvedAt}
files:
${files.map((f) => `  - ${f}`).join('\n')}
---

# Plan

| ${TASK_HEADER} |
|---|---|---|---|---|---|---|
| 1 | Close task | MC-1 | src/app.js | machine-close | green | ${VERIFY_CMD} |
`;

const git = (root, args) => {
  const res = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.equal(res.status, 0, `git ${args.join(' ')} failed: ${res.stderr || res.stdout}`);
  return res;
};

const makeMachineRepo = (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-tier-close-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'docs', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'plans'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  // Future approved_at so `git log --since` is empty (no grader commits since approval).
  const approvedAt = new Date(Date.now() + 60_000).toISOString();
  fs.writeFileSync(path.join(root, 'docs', 'specs', 'spec.md'), '# Spec\n');
  fs.writeFileSync(path.join(root, 'docs', 'plans', 'plan.md'), planText({ approvedAt }));
  fs.writeFileSync(path.join(root, 'src', 'app.js'), '// app\n');
  fs.writeFileSync(
    path.join(root, 'docs', 'audit-ledger.md'),
    '# Audit ledger\n\n| date | tier | check | result | reversal |\n|---|---|---|---|---|\n',
  );
  fs.writeFileSync(path.join(root, 'critics.json'), JSON.stringify(['ACCEPT']));

  git(root, ['init']);
  git(root, ['config', 'user.email', 'test@example.com']);
  git(root, ['config', 'user.name', 'Test']);
  git(root, ['add', '-A']);
  git(root, ['commit', '--no-gpg-sign', '-m', 'init']);
  const reversal = git(root, ['rev-parse', 'HEAD']).stdout.trim();

  const gate = spec.buildGate(root, 'docs/plans/plan.md');
  spec.writeGate(root, gate);
  const evidence = {
    plan: gate.plan,
    plan_sha256: gate.plan_sha256,
    tasks: [{ task: 1, verify: VERIFY_CMD, exit: 0, at: new Date().toISOString() }],
  };
  fs.writeFileSync(path.join(root, 'docs', 'plans', 'plan-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  return { root, gate, reversal };
};

const codeOf = (fn) => {
  try {
    fn();
  } catch (err) {
    return String(err?.code ?? err?.message ?? err);
  }
  return null;
};

test('machine-close refuses when the critics file lists no verdict (missing-critics)', (t) => {
  const { root, reversal } = makeMachineRepo(t);
  fs.writeFileSync(path.join(root, 'empty-critics.json'), '[]');
  const code = codeOf(() => spec.closeMachineGate(root, { check: 'true', critics: 'empty-critics.json', reversal }));
  assert.match(code, /missing-critics/);
});

test('machine-close refuses when the reversal SHA is missing (missing-reversal)', (t) => {
  const { root } = makeMachineRepo(t);
  const code = codeOf(() => spec.closeMachineGate(root, { check: 'true', critics: 'critics.json' }));
  assert.match(code, /missing-reversal/);
});

test('machine-close refuses when the named check exits non-zero (check-failed)', (t) => {
  const { root, reversal } = makeMachineRepo(t);
  const code = codeOf(() => spec.closeMachineGate(root, { check: 'false', critics: 'critics.json', reversal }));
  assert.match(code, /check-failed/);
});

test('machine-close refuses when the reversal is already recorded (duplicate-reversal)', (t) => {
  const { root, reversal } = makeMachineRepo(t);
  const at = new Date().toISOString();
  fs.appendFileSync(path.join(root, 'docs', 'audit-ledger.md'), `| ${at} | Auto | true | pass | ${reversal} |\n`);
  const code = codeOf(() => spec.closeMachineGate(root, { check: 'true', critics: 'critics.json', reversal }));
  assert.match(code, /duplicate-reversal/);
});

test('machine-close refuses when a grader file changed in-run (grader-changed)', (t) => {
  const { root, reversal } = makeMachineRepo(t);
  fs.mkdirSync(path.join(root, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(root, 'tests', 'evil.mjs'), '// grader edit\n');
  const code = codeOf(() => spec.closeMachineGate(root, { check: 'true', critics: 'critics.json', reversal }));
  assert.match(code, /grader-changed/);
});
