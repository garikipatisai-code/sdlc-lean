import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const pluginURL = pathToFileURL(path.resolve(import.meta.dirname, '../../.opencode/plugins/sdlc-lean.js')).href;
const plugin = await import(pluginURL);
const specURL = pathToFileURL(path.resolve(import.meta.dirname, '../../scripts/spec-check.mjs')).href;
const spec = await import(specURL);

const makeRepo = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bash-gate-'));
  fs.mkdirSync(path.join(root, 'docs', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'plans'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'specs', 'spec.md'), '# Spec\n');
  fs.writeFileSync(path.join(root, 'docs', 'plans', 'plan.md'), '---\nspec: docs/specs/spec.md\nstatus: approved\napproved_by: t\napproved_at: 2026-10-24T00:00:00Z\nfiles:\n  - src/app.js\nallow:\n  - docs/debt-ledger.md\n---\n# Plan\n');
  fs.writeFileSync(path.join(root, 'docs', 'debt-ledger.md'), '# Debt\n');
  fs.writeFileSync(path.join(root, 'src', 'app.js'), '// app\n');
  return root;
};

test('parse redirect writes', () => {
  assert.deepEqual(plugin.parseBashWriteTargets('cat > outside.js'), ['outside.js']);
  assert.deepEqual(plugin.parseBashWriteTargets('echo hi >> outside.js'), ['outside.js']);
});

test('bash redirect outside scope blocked', (t) => {
  const root = makeRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const gate = spec.buildGate(root, 'docs/plans/plan.md');
  spec.writeGate(root, gate);
  assert.throws(() => plugin.checkSpecGate('bash', { command: 'cat > outside.js' }, root), /spec gate|outside|blocked/i);
});

test('allowlisted test/verify/git-read pass', () => {
  assert.equal(plugin.checkImplementerBash('implementer', 'node --test tests/x.mjs'), true);
  assert.equal(plugin.checkImplementerBash('implementer', 'npm run verify'), true);
  assert.equal(plugin.checkImplementerBash('implementer', 'git status'), true);
});

test('fail open on unparseable/missing root', () => {
  assert.doesNotThrow(() => plugin.checkSpecGate('bash', { command: 'cat > outside.js' }, undefined));
  assert.doesNotThrow(() => plugin.checkSpecGate('bash', { command: 'totally unparseable ???' }, undefined));
});