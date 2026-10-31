// Approve autofill: approving a draft plan must auto-fill frontmatter.
// TDD RED: expects fillApprovalFrontmatter helper (not yet implemented).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

const specURL = pathToFileURL(path.resolve(import.meta.dirname, '../../scripts/spec-check.mjs')).href;
const spec = await import(specURL);

const UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const PLAN = 'docs/plans/plan.md';
const SPEC = 'docs/specs/spec.md';

const draftPlanText = () => `---
spec: ${SPEC}
status: draft
approved_by:
approved_at:
files:
  - src/app.js
allow:
  - docs/plans/plan-progress.md
---

# Plan

Approve-autofill fixture body.
`;

const makeDraftRepo = (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'approve-autofill-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'docs', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'plans'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, SPEC), '# Spec\n');
  fs.writeFileSync(path.join(root, PLAN), draftPlanText());
  fs.writeFileSync(path.join(root, 'src', 'app.js'), '// app\n');
  return root;
};

test('fillApprovalFrontmatter sets approval fields and preserves scope/body', (t) => {
  const root = makeDraftRepo(t);
  const planAbs = path.join(root, PLAN);
  assert.equal(typeof spec.fillApprovalFrontmatter, 'function', 'fillApprovalFrontmatter must exist');
  const before = fs.readFileSync(planAbs, 'utf8');

  const result = spec.fillApprovalFrontmatter(planAbs, 'human');

  assert.ok(result.approved_by.trim() !== '', 'approved_by non-empty');
  assert.match(result.approved_at, UTC_RE, 'approved_at ISO-8601Z');
  const after = fs.readFileSync(planAbs, 'utf8');
  assert.match(after, /^status:\s*approved\s*$/m, 'status must be approved');
  assert.match(after, /^approved_by:\s*\S/m, 'approved_by must be set');
  assert.match(after, /approved_at:\s*\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z/, 'approved_at must be set');
  // Preserves scope and body.
  const parsed = spec.parsePlanText(after);
  assert.equal(parsed.spec, SPEC);
  assert.deepEqual(parsed.files, ['src/app.js']);
  assert.deepEqual(parsed.allow, ['docs/plans/plan-progress.md']);
  assert.ok(after.includes('Approve-autofill fixture body.'), 'body must be preserved');
  assert.ok(before.includes('status: draft'), 'precondition: draft before fill');
});

test('draft plan fails before fill, buildGate succeeds after fill', (t) => {
  const root = makeDraftRepo(t);
  const planAbs = path.join(root, PLAN);
  try {
    spec.parsePlanText(fs.readFileSync(planAbs, 'utf8'));
    assert.fail('draft plan must throw');
  } catch (err) {
    assert.equal(err.code, 'not-approved');
  }
  spec.fillApprovalFrontmatter(planAbs, 'human');
  const gate = spec.buildGate(root, PLAN);
  assert.equal(gate.plan, PLAN);
  assert.equal(gate.spec, SPEC);
  assert.ok(gate.approved_by.trim() !== '');
  assert.match(gate.approved_at, UTC_RE);
});

test('approve CLI autofills a draft with stubbed TTY and writes the gate', (t) => {
  const root = makeDraftRepo(t);
  const started = Date.now() - 1000;
  const exit = spec.main(['approve', PLAN, '--root', root], { stdinTTY: true, stdoutTTY: true });
  const finished = Date.now() + 1000;
  assert.equal(exit, 0, 'approve must exit 0 after autofill');
  const after = fs.readFileSync(path.join(root, PLAN), 'utf8');
  assert.match(after, /^status:\s*approved\s*$/m);
  const parsed = spec.parsePlanText(after);
  assert.ok(parsed.approved_by.trim() !== '');
  const at = Date.parse(parsed.approved_at);
  assert.ok(at >= started && at <= finished, 'approved_at must be live UTC');
  const gate = spec.readGate(root);
  assert.ok(gate, 'gate must be written');
  const valid = spec.validateGate(root, gate);
  assert.equal(valid.plan, PLAN);
});

test('TTY is still required: non-TTY approve refuses and does not autofill', (t) => {
  const root = makeDraftRepo(t);
  const exit = spec.main(['approve', PLAN, '--root', root], { stdinTTY: false, stdoutTTY: true });
  assert.equal(exit, 1, 'non-TTY approve must refuse');
  const after = fs.readFileSync(path.join(root, PLAN), 'utf8');
  assert.match(after, /^status:\s*draft\s*$/m, 'draft must be untouched without TTY');
  assert.equal(fs.existsSync(path.join(root, '.sdlc', 'spec-gate.json')), false, 'no marker without TTY');
});

test('approved_by with newline is rejected (invalid-field) and file untouched', (t) => {
  const root = makeDraftRepo(t);
  const planAbs = path.join(root, PLAN);
  const before = fs.readFileSync(planAbs, 'utf8');
  assert.throws(
    () => spec.fillApprovalFrontmatter(planAbs, 'bad\nname'),
    (err) => err.code === 'invalid-field',
    'newline in approved_by must throw invalid-field',
  );
  assert.equal(fs.readFileSync(planAbs, 'utf8'), before, 'file must be unchanged on rejection');
});

test('approved_by with colon is rejected (invalid-field) and file untouched', (t) => {
  const root = makeDraftRepo(t);
  const planAbs = path.join(root, PLAN);
  const before = fs.readFileSync(planAbs, 'utf8');
  assert.throws(
    () => spec.fillApprovalFrontmatter(planAbs, 'bad:name'),
    (err) => err.code === 'invalid-field',
    'colon in approved_by must throw invalid-field',
  );
  assert.equal(fs.readFileSync(planAbs, 'utf8'), before, 'file must be unchanged on rejection');
});

test('approve CLI is atomic: invalid plan leaves file unchanged (no dirty-approved)', (t) => {
  const root = makeDraftRepo(t);
  const badPlan = `---
spec: ${SPEC}
status: draft
approved_by:
approved_at:
files:
allow:
  - docs/plans/plan-progress.md
---

# Plan

Body.
`;
  fs.writeFileSync(path.join(root, PLAN), badPlan);
  const before = fs.readFileSync(path.join(root, PLAN), 'utf8');
  const exit = spec.main(['approve', PLAN, '--root', root], { stdinTTY: true, stdoutTTY: true });
  assert.equal(exit, 1, 'invalid plan approve must fail');
  assert.equal(fs.readFileSync(path.join(root, PLAN), 'utf8'), before, 'file must be unchanged after failed approve');
  assert.match(fs.readFileSync(path.join(root, PLAN), 'utf8'), /^status:\s*draft\s*$/m, 'draft must stay draft');
  assert.equal(fs.existsSync(path.join(root, '.sdlc', 'spec-gate.json')), false, 'no marker on failure');
});

test('plan file symlink is rejected', (t) => {
  const root = makeDraftRepo(t);
  const planAbs = path.join(root, PLAN);
  const linkAbs = path.join(root, 'docs', 'plans', 'link.md');
  fs.symlinkSync(planAbs, linkAbs);
  assert.throws(
    () => spec.fillApprovalFrontmatter(linkAbs, 'human', root),
    (err) => err.code === 'symlink',
    'symlink plan file must be rejected',
  );
});

test('symlink-dir escape is rejected', (t) => {
  const root = makeDraftRepo(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'approve-autofill-outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.writeFileSync(path.join(outside, 'evil.md'), draftPlanText());
  const linkDir = path.join(root, 'linkdir');
  fs.symlinkSync(outside, linkDir, 'dir');
  const viaLink = path.join(linkDir, 'evil.md');
  assert.throws(
    () => spec.fillApprovalFrontmatter(viaLink, 'human', root),
    (err) => err.code === 'unsafe-path' || err.code === 'symlink',
    'symlinked dir escape must be rejected',
  );
});
