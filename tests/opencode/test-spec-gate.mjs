// Spec-gate plugin tests: the hook must block out-of-scope file edits while
// leaving repos without a marker (and non-mutating tools) untouched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

const pluginURL = pathToFileURL(path.resolve(import.meta.dirname, '../../.opencode/plugins/sdlc-lean.js')).href;
const plugin = await import(pluginURL);
const specURL = pathToFileURL(path.resolve(import.meta.dirname, '../../scripts/spec-check.mjs')).href;
const spec = await import(specURL);

const planText = ({ files = ['src/app.js'], allow = ['docs/debt-ledger.md'] } = {}) => `---
spec: docs/specs/spec.md
status: approved
approved_by: tester
approved_at: 2026-10-24T00:00:00Z
files:
${files.map((f) => `  - ${f}`).join('\n')}
${allow.length ? `allow:\n${allow.map((f) => `  - ${f}`).join('\n')}\n` : ''}---

# Plan
`;

const makeRepo = ({ files, allow } = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-gate-'));
  fs.mkdirSync(path.join(root, 'docs', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'plans'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'specs', 'spec.md'), '# Spec\n');
  fs.writeFileSync(path.join(root, 'docs', 'plans', 'plan.md'), planText({ files, allow }));
  fs.writeFileSync(path.join(root, 'docs', 'debt-ledger.md'), '# Debt\n');
  fs.writeFileSync(path.join(root, 'src', 'app.js'), '// app\n');
  return root;
};

const activate = (root) => {
  const gate = spec.buildGate(root, 'docs/plans/plan.md');
  spec.writeGate(root, gate);
  return gate;
};

test('no marker: checkSpecGate is a no-op (fail open)', (t) => {
  const root = makeRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.doesNotThrow(() => plugin.checkSpecGate('edit', { filePath: 'anything.js' }, root));
});

test('valid gate: planned file passes, unplanned file is blocked', (t) => {
  const root = makeRepo({ files: ['src/app.js', 'src/**/*.ts'] });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  activate(root);

  assert.doesNotThrow(() => plugin.checkSpecGate('edit', { filePath: 'src/app.js' }, root));
  assert.doesNotThrow(() => plugin.checkSpecGate('write', { path: 'src/deep/new.ts' }, root));
  assert.throws(() => plugin.checkSpecGate('edit', { filePath: 'src/other.js' }, root), /spec gate|outside/i);
  assert.throws(() => plugin.checkSpecGate('write', { path: 'README.md' }, root), /spec gate|outside/i);
});

test('progress ledger and allow entries stay writable; plan and spec do not', (t) => {
  const root = makeRepo({ files: ['src/app.js', 'docs/plans/plan.md', 'docs/specs/spec.md'] });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  activate(root);

  assert.doesNotThrow(() => plugin.checkSpecGate('edit', { filePath: 'docs/plans/plan-progress.md' }, root));
  assert.doesNotThrow(() => plugin.checkSpecGate('edit', { filePath: 'docs/debt-ledger.md' }, root));
  assert.throws(() => plugin.checkSpecGate('edit', { filePath: 'docs/plans/plan.md' }, root), /spec gate|outside/i);
  assert.throws(() => plugin.checkSpecGate('write', { path: 'docs/specs/spec.md' }, root), /spec gate|outside/i);
});

test('patch targets are checked, including multiple files', (t) => {
  const root = makeRepo({ files: ['src/app.js'] });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  activate(root);

  assert.doesNotThrow(() => plugin.checkSpecGate('patch', {
    patchText: '*** Begin Patch\n*** Update File: src/app.js\n+x\n*** End Patch',
  }, root));
  assert.throws(() => plugin.checkSpecGate('patch', {
    patchText: '*** Begin Patch\n*** Update File: src/app.js\n+x\n*** Update File: src/other.js\n+y\n*** End Patch',
  }, root), /spec gate|outside/i);
  assert.throws(() => plugin.checkSpecGate('apply_patch', {
    diff: '--- a/src/app.js\n+++ b/src/other.js\n',
  }, root), /spec gate|outside/i);
  assert.doesNotThrow(() => plugin.checkSpecGate('patch', {
    patchText: '--- a/src/app.js\n+++ b/src/app.js\n',
  }, root));
  assert.throws(() => plugin.checkSpecGate('patch', {
    patchText: '--- a/package.json\n+++ /dev/null\n',
  }, root), /spec gate|outside/i);
});

test('spec or plan drift blocks edits until re-approval', (t) => {
  const root = makeRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  activate(root);
  assert.doesNotThrow(() => plugin.checkSpecGate('edit', { filePath: 'src/app.js' }, root));

  fs.appendFileSync(path.join(root, 'docs', 'specs', 'spec.md'), '\nchanged\n');
  assert.throws(() => plugin.checkSpecGate('edit', { filePath: 'src/app.js' }, root), /drift|re-approve|close/i);

  const root2 = makeRepo();
  t.after(() => fs.rmSync(root2, { recursive: true, force: true }));
  activate(root2);
  fs.appendFileSync(path.join(root2, 'docs', 'plans', 'plan.md'), '\nchanged\n');
  assert.throws(() => plugin.checkSpecGate('edit', { filePath: 'src/app.js' }, root2), /drift|re-approve|close/i);
});

test('malformed marker fails closed for edits', (t) => {
  const root = makeRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, '.sdlc'), { recursive: true });
  fs.writeFileSync(path.join(root, '.sdlc', 'spec-gate.json'), '{not json');
  assert.throws(() => plugin.checkSpecGate('edit', { filePath: 'src/app.js' }, root), /marker|json|spec gate/i);
});

test('non-mutating tools and no root are untouched', (t) => {
  const root = makeRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  activate(root);
  assert.doesNotThrow(() => plugin.checkSpecGate('read', { filePath: 'src/other.js' }, root));
  assert.doesNotThrow(() => plugin.checkSpecGate('bash', { command: 'git status' }, root));
  assert.doesNotThrow(() => plugin.checkSpecGate('edit', { filePath: 'src/other.js' }, undefined));
});

test('outside-root targets are blocked', (t) => {
  const root = makeRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  activate(root);
  assert.throws(() => plugin.checkSpecGate('edit', { filePath: '../outside.js' }, root), /spec gate|escape|outside/i);
});

test('a modified spec-check CLI blocks edits until re-approval', (t) => {
  const root = makeRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  activate(root);
  const markerPath = path.join(root, '.sdlc', 'spec-gate.json');
  const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
  marker.cli_sha256 = '0'.repeat(64);
  fs.writeFileSync(markerPath, JSON.stringify(marker));
  assert.throws(() => plugin.checkSpecGate('edit', { filePath: 'src/app.js' }, root), /cli|tamper|re-approve/i);
});

test('symlinked directory targets are blocked', (t) => {
  const root = makeRepo({ files: ['src/**'] });
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-gate-outside-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  activate(root);
  fs.symlinkSync(outside, path.join(root, 'src', 'link'), 'dir');
  assert.throws(() => plugin.checkSpecGate('write', { path: 'src/link/x.txt' }, root), /spec gate|unsafe|symlink/i);
});

test('V1 hook enforces with the plugin directory', async (t) => {
  const root = makeRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  activate(root);
  const hooks = await plugin.SdlcLeanPlugin({ directory: root });
  await assert.rejects(
    hooks['tool.execute.before']({ tool: 'edit' }, { args: { filePath: 'src/other.js' } }),
    /spec gate|outside/i,
  );
  await assert.doesNotReject(
    hooks['tool.execute.before']({ tool: 'edit' }, { args: { filePath: 'src/app.js' } }),
  );
});

test('V2 hook enforces with ctx.directory', async (t) => {
  const root = makeRepo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  activate(root);
  const captured = {};
  const ctx = {
    directory: root,
    skill: { transform: async (cb) => cb({ add: () => {} }) },
    session: {
      hook: async (name, cb) => { captured[name] = cb; },
      get: async () => ({ id: 'sess-v2' }),
    },
    tool: { hook: async (name, cb) => { captured[`tool:${name}`] = cb; } },
  };
  await plugin.default.setup(ctx);
  assert.equal(typeof captured['tool:execute.before'], 'function');
  assert.throws(
    () => captured['tool:execute.before']({ tool: 'edit', input: { filePath: 'src/other.js' } }),
    /spec gate|outside/i,
  );
  assert.doesNotThrow(
    () => captured['tool:execute.before']({ tool: 'edit', input: { filePath: 'src/app.js' } }),
  );
});
