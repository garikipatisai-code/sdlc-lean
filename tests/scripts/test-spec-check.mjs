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

const planText = ({
  spec = 'docs/specs/spec.md',
  status = 'approved',
  approvedBy = 'tester',
  approvedAt = '2026-10-24T00:00:00Z',
  files = ['src/app.js'],
  allow = [],
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
`;

const makeRepo = (opts = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-check-'));
  fs.mkdirSync(path.join(root, 'docs', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'plans'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'specs', 'spec.md'), '# Spec\n\nApproved.\n');
  fs.writeFileSync(path.join(root, 'docs', 'plans', 'plan.md'), planText(opts));
  return root;
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

test('CLI approve/status/verify/check/close round-trip', async (t) => {
  const root = makeRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const inactive = run(['verify'], root);
  assert.equal(inactive.status, 0, 'no marker must verify as inactive');
  assert.match(inactive.stdout, /no active spec gate/i);
  const required = run(['verify', '--require-active'], root);
  assert.equal(required.status, 2, 'require-active must fail with no marker');
  assert.match(required.stderr, /no active spec gate/i);

  const approve = run(['approve', 'docs/plans/plan.md'], root);
  assert.equal(approve.status, 0, approve.stderr);
  assert.match(approve.stdout, /active spec gate/i);
  assert.ok(fs.existsSync(path.join(root, '.sdlc', 'spec-gate.json')));

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
  assert.equal(close.status, 0, close.stderr);
  assert.equal(fs.existsSync(path.join(root, '.sdlc', 'spec-gate.json')), false);
  assert.equal(run(['verify'], root).status, 0);
});

test('CLI refuses an unapproved plan and a plan outside the repo', async (t) => {
  const root = makeRepo({ status: 'draft' });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const refused = run(['approve', 'docs/plans/plan.md'], root);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /approved/i);

  const root2 = makeRepo();
  t.after(() => fs.rmSync(root2, { recursive: true, force: true }));
  const outside = run(['approve', '../outside.md'], root2);
  assert.equal(outside.status, 1);
  assert.match(outside.stderr, /unsafe-path|escapes|outside/i);
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
