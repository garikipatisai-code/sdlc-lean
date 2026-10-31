// Gate-spawn regression: CLI must be invoked via node, never bare opencode binary.
// Under the opencode host process.execPath is the opencode binary (rejects
// --root); the plugin must resolve a node executable instead.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

const pluginPath = path.resolve(import.meta.dirname, '../../.opencode/plugins/sdlc-lean.js');
const pluginURL = pathToFileURL(pluginPath).href;
const plugin = await import(pluginURL);
const specURL = pathToFileURL(path.resolve(import.meta.dirname, '../../scripts/spec-check.mjs')).href;
const spec = await import(specURL);

test('gate spawn resolves node, never bare opencode binary', () => {
  const src = fs.readFileSync(pluginPath, 'utf8');
  // Buggy pattern: spawnSync(process.execPath, [cli, 'check', ...])
  assert.ok(
    !src.includes('spawnSync(process.execPath'),
    'plugin must not spawn CLI via bare process.execPath (opencode binary under host)',
  );
  // Fixed pattern: spawn via resolved node executable.
  assert.ok(
    typeof plugin.resolveNodeExecutable === 'function',
    'plugin must export resolveNodeExecutable',
  );
  assert.equal(plugin.resolveNodeExecutable('/usr/bin/opencode'), 'node');
  assert.equal(plugin.resolveNodeExecutable('/opt/opencode/bin/opencode'), 'node');
  const nodePath = '/usr/bin/node';
  assert.equal(plugin.resolveNodeExecutable(nodePath), nodePath);
  // Default (no arg) follows current runtime: node path when running under node.
  const def = plugin.resolveNodeExecutable();
  assert.ok(
    def === 'node' || path.basename(def).toLowerCase().startsWith('node'),
    `default resolver must be node, got ${def}`,
  );
  // Spawn options preserved.
  assert.ok(src.includes('timeout: 5000'), 'spawn must preserve timeout 5000');
  assert.ok(src.includes('windowsHide'), 'spawn must preserve windowsHide');
});

test('gate spawn argv0 is resolved node, not process.execPath (stubbed spawn)', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-spawn-argv0-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'docs', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'plans'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'specs', 'spec.md'), '# Spec\n');
  fs.writeFileSync(
    path.join(root, 'docs', 'plans', 'plan.md'),
    '---\nspec: docs/specs/spec.md\nstatus: approved\napproved_by: tester\napproved_at: 2026-10-24T00:00:00Z\nfiles:\n  - src/app.js\n---\n\n# Plan\n',
  );
  fs.writeFileSync(path.join(root, 'src', 'app.js'), '// app\n');
  const gate = spec.buildGate(root, 'docs/plans/plan.md');
  spec.writeGate(root, gate);

  const fakeExecPath = '/usr/bin/opencode';
  const expectedArgv0 = plugin.resolveNodeExecutable(fakeExecPath);
  assert.equal(expectedArgv0, 'node');
  const origExecPath = process.execPath;
  process.execPath = fakeExecPath;
  t.after(() => { process.execPath = origExecPath; });

  let captured = null;
  const fakeSpawn = (argv0, args, opts) => {
    captured = { argv0, args, opts };
    return { status: 0, stdout: '', stderr: '' };
  };
  assert.doesNotThrow(() => plugin.checkSpecGate('edit', { filePath: 'src/app.js' }, root, { spawnSync: fakeSpawn }));
  assert.ok(captured, 'spawn stub must be called');
  assert.equal(
    captured.argv0,
    expectedArgv0,
    `argv0 must be resolved node (${expectedArgv0}), not process.execPath`,
  );
  assert.notEqual(captured.argv0, fakeExecPath, 'argv0 must not be the opencode binary');
  assert.ok(Array.isArray(captured.args), 'spawn args must be array form (no shell)');
  assert.ok(captured.args[0].endsWith('spec-check.mjs'), `args[0] must be the CLI, got ${captured.args[0]}`);
  assert.ok(captured.args.includes('check'), 'args must contain check');
  assert.ok(captured.args.includes('--root'), 'args must contain --root');
  assert.ok(captured.args.includes(root), 'args must contain root');
  assert.ok(captured.opts && captured.opts.timeout === 5000, 'spawn must preserve timeout 5000');
  assert.ok(captured.opts && captured.opts.windowsHide === true, 'spawn must preserve windowsHide');
  assert.ok(!captured.opts.shell, 'spawn must not use shell');
  process.execPath = origExecPath;
});

test('fail-closed when marker exists but CLI unavailable; fail-open with no marker', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-spawn-unavail-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'docs', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'plans'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'specs', 'spec.md'), '# Spec\n');
  fs.writeFileSync(
    path.join(root, 'docs', 'plans', 'plan.md'),
    '---\nspec: docs/specs/spec.md\nstatus: approved\napproved_by: tester\napproved_at: 2026-10-24T00:00:00Z\nfiles:\n  - src/app.js\n---\n\n# Plan\n',
  );
  fs.writeFileSync(path.join(root, 'src', 'app.js'), '// app\n');
  const gate = spec.buildGate(root, 'docs/plans/plan.md');
  spec.writeGate(root, gate);
  assert.throws(
    () => plugin.checkSpecGate('edit', { filePath: 'src/app.js' }, root, { specCheckPath: null }),
    /spec gate unavailable/i,
  );

  const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-spawn-nomarker-'));
  t.after(() => fs.rmSync(bare, { recursive: true, force: true }));
  assert.doesNotThrow(
    () => plugin.checkSpecGate('edit', { filePath: 'anything.js' }, bare, { specCheckPath: null }),
  );
});

test('gated writes succeed when node check exits 0', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-spawn-node-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'docs', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'plans'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'specs', 'spec.md'), '# Spec\n');
  fs.writeFileSync(
    path.join(root, 'docs', 'plans', 'plan.md'),
    '---\nspec: docs/specs/spec.md\nstatus: approved\napproved_by: tester\napproved_at: 2026-10-24T00:00:00Z\nfiles:\n  - src/app.js\n---\n\n# Plan\n',
  );
  fs.writeFileSync(path.join(root, 'src', 'app.js'), '// app\n');
  const gate = spec.buildGate(root, 'docs/plans/plan.md');
  spec.writeGate(root, gate);
  assert.doesNotThrow(() => plugin.checkSpecGate('edit', { filePath: 'src/app.js' }, root));
  assert.throws(() => plugin.checkSpecGate('edit', { filePath: 'src/other.js' }, root), /spec gate|outside/i);
});
