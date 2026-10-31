// V2 `/approve` command contract (node --test, no harness needed).
// Mocks the V2 command/session surface and uses a temp repo with the real
// scripts/spec-check.mjs copied in: buildGate/writeGate/validateGate are the
// real contract, never stubbed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { pathToFileURL } from 'url';

// Isolate the activation status file before importing the plugin (the module
// computes the status path from XDG_STATE_HOME at load time).
process.env.XDG_STATE_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-lean-approve-state-'));
// Isolate the global approval CLI lookup: an empty config home forces the
// project fallback unless a test installs a global copy.
const configHome = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-lean-approve-config-'));
process.env.XDG_CONFIG_HOME = configHome;

const repoRoot = path.resolve(import.meta.dirname, '../..');
const pluginURL = pathToFileURL(path.join(repoRoot, '.opencode', 'plugins', 'sdlc-lean.js')).href;
const plugin = await import(pluginURL);
const cliSource = path.join(repoRoot, 'scripts', 'spec-check.mjs');

const SESSION_ID = 'sess-approve';
const PLAN = 'docs/plans/plan.md';
const SPEC = 'docs/specs/spec.md';
const PLAN_FILES = ['src/app.js', 'src/lib/*.js'];
const PLAN_ALLOW = ['docs/plans/plan-progress.md'];

const planText = ({
  spec = SPEC,
  status = 'approved',
  approvedBy = 'plan-author',
  approvedAt = '2026-10-30T22:00:00Z',
  files = PLAN_FILES,
  allow = PLAN_ALLOW,
} = {}) => `---
spec: ${spec}
status: ${status}
approved_by: ${approvedBy}
approved_at: ${approvedAt}
files:
${files.map((f) => `  - ${f}`).join('\n')}
allow:
${allow.map((f) => `  - ${f}`).join('\n')}
---

# Plan

Approve-command fixture.
`;

const markerPath = (root) => path.join(root, '.sdlc', 'spec-gate.json');

// Temp repo: real CLI copy + spec + an approved plan (2 files, 1 allow).
const makeRepo = ({ plan = planText() } = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'approve-command-'));
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'plans'), { recursive: true });
  fs.copyFileSync(cliSource, path.join(root, 'scripts', 'spec-check.mjs'));
  fs.writeFileSync(path.join(root, 'docs', 'specs', 'spec.md'), '# Spec\n');
  fs.writeFileSync(path.join(root, 'docs', 'plans', 'plan.md'), plan);
  return root;
};

const tempRepo = (t, options) => {
  const root = makeRepo(options);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
};

// --- global approval CLI fixtures -------------------------------------------
const globalConfigDir = path.join(configHome, 'opencode');
const globalScriptsDir = path.join(globalConfigDir, 'scripts');

const clearGlobalCli = () => {
  fs.rmSync(globalConfigDir, { recursive: true, force: true });
};

const installGlobalCli = () => {
  fs.mkdirSync(globalScriptsDir, { recursive: true });
  const dest = path.join(globalScriptsDir, 'spec-check.mjs');
  fs.copyFileSync(cliSource, dest);
  return dest;
};

const installGlobalModule = (source) => {
  fs.mkdirSync(globalScriptsDir, { recursive: true });
  const dest = path.join(globalScriptsDir, 'spec-check.mjs');
  fs.writeFileSync(dest, source);
  return dest;
};

// V2 mock: records every registration/result so tests can assert on behavior.
const mockCtx = ({ directory, command = true } = {}) => {
  const ctx = {
    registeredSkills: [],
    registeredCommands: [],
    hooks: {},
    toolHooks: {},
    synthetic: [],
    prompts: [],
    sessionCommands: [],
    toolTransforms: [],
    skill: {
      transform: async (cb) => {
        await cb({ add: (skill) => ctx.registeredSkills.push(skill) });
      },
    },
    session: {
      hook: async (name, cb) => { ctx.hooks[name] = cb; },
      get: async () => ({ id: SESSION_ID }),
      synthetic: async (event) => { ctx.synthetic.push(event); },
      prompt: async (...args) => { ctx.prompts.push(args); },
      command: async (...args) => { ctx.sessionCommands.push(args); },
    },
    tool: {
      hook: async (name, cb) => { ctx.toolHooks[name] = cb; },
      transform: async (...args) => { ctx.toolTransforms.push(args); },
    },
    location: { directory },
  };
  if (command) {
    ctx.command = {
      transform: (cb) => cb({ add: (cmd) => ctx.registeredCommands.push(cmd) }),
    };
  }
  return ctx;
};

const preparedCtx = async (directory, options = {}) => {
  const ctx = mockCtx({ directory, ...options });
  await plugin.default.setup(ctx);
  return ctx;
};

const approveCommand = (ctx) => {
  const cmd = ctx.registeredCommands.find((c) => c.name === 'approve');
  assert.ok(cmd, 'V2 setup must register an approve command');
  return cmd;
};

const invoke = async (ctx, text) => approveCommand(ctx).execute({
  sessionID: SESSION_ID,
  prompt: { text },
  delivery: 'immediate',
});

const syntheticText = (ctx) => ctx.synthetic.map((e) => e.text || '').join('\n');

test('behavior: registers one human-only approve command', async (t) => {
  const root = tempRepo(t);
  const ctx = await preparedCtx(root);

  assert.equal(ctx.registeredCommands.length, 1);
  const cmd = approveCommand(ctx);
  assert.equal(cmd.name, 'approve');
  assert.match(cmd.description, /approve/i);
  assert.match(cmd.description, /human-only/i);
  assert.equal(typeof cmd.execute, 'function');
});

test('behavior: success writes the host-user tui-command marker', async (t) => {
  const root = tempRepo(t);
  const planBefore = fs.readFileSync(path.join(root, PLAN));
  const ctx = await preparedCtx(root);

  const started = Date.now() - 1000;
  await invoke(ctx, PLAN);
  const finished = Date.now() + 1000;

  assert.ok(fs.existsSync(markerPath(root)), 'marker must be written');
  const marker = JSON.parse(fs.readFileSync(markerPath(root), 'utf8'));
  assert.equal(marker.approved_by, os.userInfo().username);
  assert.match(marker.approved_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/);
  const approvedAt = Date.parse(marker.approved_at);
  assert.ok(approvedAt >= started && approvedAt <= finished, 'approved_at must be command time (UTC)');
  assert.equal(marker.approved_via, 'tui-command');
  assert.equal(marker.plan, PLAN);
  assert.equal(marker.spec, SPEC);
  assert.deepEqual(marker.files, PLAN_FILES);
  assert.deepEqual(marker.allow, PLAN_ALLOW);

  assert.ok(fs.readFileSync(path.join(root, PLAN)).equals(planBefore), 'the plan file must stay byte-identical');
  const leftovers = fs.readdirSync(path.join(root, '.sdlc')).filter((f) => f.includes('.tmp'));
  assert.deepEqual(leftovers, [], 'writeGate must leave no .tmp file');

  const copied = await import(pathToFileURL(path.join(root, 'scripts', 'spec-check.mjs')).href);
  const valid = copied.validateGate(root, marker);
  assert.equal(valid.approved_via, 'tui-command', 'the copied CLI must preserve approved_via');
});

test('behavior: success confirms plan, spec, files, and hash without a prompt', async (t) => {
  const root = tempRepo(t);
  const ctx = await preparedCtx(root);
  await invoke(ctx, PLAN);

  const marker = JSON.parse(fs.readFileSync(markerPath(root), 'utf8'));
  const text = syntheticText(ctx);
  assert.ok(text.includes(PLAN), 'confirmation must name the plan');
  assert.ok(text.includes(SPEC), 'confirmation must name the spec');
  assert.ok(text.includes('2 files'), 'confirmation must state the file count');
  assert.ok(text.includes(marker.plan_sha256.slice(0, 12)), 'confirmation must state the short plan hash');

  assert.equal(ctx.prompts.length, 0, 'session.prompt must not be called');
  assert.equal(ctx.sessionCommands.length, 0, 'session.command must not be called');
  assert.ok(ctx.synthetic.every((e) => e.sessionID === SESSION_ID), 'results target the invoking session');
});

const REFUSALS = [
  { label: 'empty argument', text: '', pattern: /usage/i },
  { label: 'flag argument', text: '--force', pattern: /flag/i },
  { label: 'two paths', text: `${PLAN} docs/plans/other.md`, pattern: /exactly one/i },
  { label: 'parent escape', text: '../outside.md', pattern: /refused/i },
  { label: 'absolute path', text: '/etc/passwd', pattern: /refused/i },
  { label: 'missing plan', text: 'docs/plans/missing.md', pattern: /refused/i },
  { label: 'draft plan', text: PLAN, plan: planText({ status: 'draft' }), pattern: /refused/i },
  { label: 'unsafe files', text: PLAN, plan: planText({ files: ['../secret'] }), pattern: /refused/i },
  { label: 'glob plan path', text: 'docs/plans/*.md', pattern: /refused/i },
];

test('behavior: refusals leave no marker and send a synthetic refusal', async (t) => {
  const roots = [];
  t.after(() => {
    for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  });

  for (const refusal of REFUSALS) {
    const root = makeRepo(refusal.plan === undefined ? {} : { plan: refusal.plan });
    roots.push(root);
    const ctx = await preparedCtx(root);
    await invoke(ctx, refusal.text);

    assert.equal(fs.existsSync(markerPath(root)), false, `${refusal.label}: no marker`);
    assert.match(syntheticText(ctx), refusal.pattern, `${refusal.label}: synthetic refusal`);
    assert.equal(ctx.prompts.length, 0, `${refusal.label}: no model prompt`);
    assert.equal(ctx.sessionCommands.length, 0, `${refusal.label}: no session command`);
  }
});

test('behavior: no approval tool is registered', async (t) => {
  const root = tempRepo(t);
  assert.equal(plugin.spec_approve, undefined, 'the plugin must not export an approval tool');
  assert.equal(plugin.default.tool, undefined, 'V2 must not expose a tool registration surface');
  const ctx = await preparedCtx(root);
  assert.equal(ctx.toolTransforms.length, 0, 'ctx.tool.transform must not be called');
  assert.equal(typeof ctx.toolHooks['execute.before'], 'function', 'the safety hook still registers');
});

test('behavior: V1 hooks are unchanged', async () => {
  const hooks = await plugin.SdlcLeanPlugin({});
  assert.deepEqual(Object.keys(hooks).sort(), [
    'config',
    'experimental.chat.messages.transform',
    'experimental.session.compacting',
    'tool.execute.before',
  ].sort());
  assert.equal(hooks.command, undefined, 'V1 must not register a command');
});

test('behavior: V2 setup without ctx.command still registers hooks', async (t) => {
  const root = tempRepo(t);
  const ctx = mockCtx({ directory: root, command: false });
  await assert.doesNotReject(() => plugin.default.setup(ctx));

  assert.equal(ctx.command, undefined);
  assert.equal(ctx.registeredCommands.length, 0);
  assert.equal(typeof ctx.hooks.context, 'function', 'the context hook still registers');
  assert.equal(typeof ctx.toolHooks['execute.before'], 'function', 'the tool hook still registers');
});

test('behavior: non-TTY CLI still refuses approval', (t) => {
  const root = tempRepo(t);
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'spec-check.mjs'), 'approve', PLAN], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  assert.equal(result.status, 1);
  assert.match(`${result.stderr}${result.stdout}`, /TTY|terminal/i);
  assert.equal(fs.existsSync(markerPath(root)), false, 'a non-TTY approval must not write a marker');
});

test('behavior: prefers the installed global CLI over the project copy', async (t) => {
  clearGlobalCli();
  t.after(clearGlobalCli);
  const root = tempRepo(t);
  installGlobalCli();
  const sentinel = path.join(root, 'project-cli-used');
  fs.writeFileSync(path.join(root, 'scripts', 'spec-check.mjs'),
    `import fs from 'node:fs';\nfs.writeFileSync(${JSON.stringify(sentinel)}, 'used');\nexport * from ${JSON.stringify(pathToFileURL(cliSource).href)};\n`);
  const ctx = await preparedCtx(root);

  await invoke(ctx, PLAN);

  assert.equal(fs.existsSync(sentinel), false, 'the project CLI must not be imported when a global CLI exists');
  assert.ok(fs.existsSync(markerPath(root)), 'the global CLI must approve the plan');
});

test('behavior: falls back to the project CLI when no global CLI exists', async (t) => {
  clearGlobalCli();
  t.after(clearGlobalCli);
  const root = tempRepo(t);
  const ctx = await preparedCtx(root);

  await invoke(ctx, PLAN);

  assert.ok(fs.existsSync(markerPath(root)), 'the project CLI is the fallback');
  const marker = JSON.parse(fs.readFileSync(markerPath(root), 'utf8'));
  assert.equal(marker.approved_via, 'tui-command');
});

test('behavior: a matching sha256 argument records tui-picker', async (t) => {
  clearGlobalCli();
  t.after(clearGlobalCli);
  const root = tempRepo(t);
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, PLAN))).digest('hex');
  const ctx = await preparedCtx(root);

  await invoke(ctx, `${PLAN} sha256:${hash}`);

  assert.ok(fs.existsSync(markerPath(root)), 'a matching hash approves');
  const marker = JSON.parse(fs.readFileSync(markerPath(root), 'utf8'));
  assert.equal(marker.approved_via, 'tui-picker');
  assert.equal(marker.plan_sha256, hash);
  assert.ok(syntheticText(ctx).includes(hash.slice(0, 12)), 'the confirmation states the plan hash');
});

test('behavior: a wrong sha256 argument is refused with no marker', async (t) => {
  clearGlobalCli();
  t.after(clearGlobalCli);
  const root = tempRepo(t);
  const ctx = await preparedCtx(root);

  await invoke(ctx, `${PLAN} sha256:${'0'.repeat(64)}`);

  assert.equal(fs.existsSync(markerPath(root)), false, 'a hash mismatch must not write a marker');
  assert.match(syntheticText(ctx), /sha256|hash/i, 'the refusal must name the hash mismatch');
});

test('behavior: a mismatched marker written by the CLI is deleted and refused', async (t) => {
  clearGlobalCli();
  t.after(clearGlobalCli);
  const root = tempRepo(t);
  const sentinel = path.join(root, 'write-gate-called');
  installGlobalModule(`import fs from 'node:fs';
import path from 'node:path';
import * as real from ${JSON.stringify(pathToFileURL(cliSource).href)};
export const normalizeRel = real.normalizeRel;
export const buildGate = real.buildGate;
export const readGate = real.readGate;
export const validateGate = real.validateGate;
export const writeGate = (root, gate) => {
  const p = path.join(root, '.sdlc', 'spec-gate.json');
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ ...gate, plan_sha256: '${'0'.repeat(64)}' }));
  fs.writeFileSync(${JSON.stringify(sentinel)}, 'called');
  return p;
};
`);
  const ctx = await preparedCtx(root);

  await invoke(ctx, PLAN);

  assert.ok(fs.existsSync(sentinel), 'the fake CLI must have been used');
  assert.equal(fs.existsSync(markerPath(root)), false, 'a marker that fails re-validation must be deleted');
  assert.match(syntheticText(ctx), /refused|drift|mismatch|validate/i);
});

test('behavior: a spec that escapes the project root is refused before writeGate', async (t) => {
  clearGlobalCli();
  t.after(clearGlobalCli);
  const root = tempRepo(t);
  fs.rmSync(path.join(root, 'scripts', 'spec-check.mjs'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'approve-command-outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.writeFileSync(path.join(outside, 'spec.md'), '# Outside spec\n');
  fs.rmSync(path.join(root, 'docs', 'specs'), { recursive: true, force: true });
  fs.symlinkSync(outside, path.join(root, 'docs', 'specs'), 'dir');
  const sentinel = path.join(root, 'write-gate-called');
  fs.writeFileSync(path.join(root, 'scripts', 'spec-check.mjs'), `import fs from 'node:fs';
import * as real from ${JSON.stringify(pathToFileURL(cliSource).href)};
export * from ${JSON.stringify(pathToFileURL(cliSource).href)};
export const writeGate = (root, gate) => {
  fs.writeFileSync(${JSON.stringify(sentinel)}, 'called');
  return real.writeGate(root, gate);
};
`);
  const ctx = await preparedCtx(root);

  await invoke(ctx, PLAN);

  assert.equal(fs.existsSync(sentinel), false, 'writeGate must not run for an escaping spec');
  assert.equal(fs.existsSync(markerPath(root)), false);
  assert.match(syntheticText(ctx), /refused|outside|escape/i);
});

test('behavior: approval requires ctx.location.directory', async (t) => {
  clearGlobalCli();
  t.after(clearGlobalCli);
  const root = tempRepo(t);
  const ctx = mockCtx({ directory: root });
  delete ctx.location;
  await plugin.default.setup(ctx);

  await invoke(ctx, PLAN);

  assert.equal(fs.existsSync(markerPath(root)), false);
  assert.match(syntheticText(ctx), /directory|location|refused/i);
});

test('docs: /approve is documented with the TTY fallback', () => {
  const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8');
  const docs = [
    ['README.md', read('README.md')],
    ['USAGE.md', read('USAGE.md')],
    ['writing-plans', read('.opencode/skills/writing-plans/SKILL.md')],
    ['intent-preview', read('.opencode/skills/intent-preview/SKILL.md')],
    ['CHANGELOG.md', read('CHANGELOG.md')],
  ];
  for (const [name, text] of docs) {
    assert.ok(text.includes('/approve'), `${name} must name /approve`);
  }

  const writingPlans = read('.opencode/skills/writing-plans/SKILL.md');
  const intentPreview = read('.opencode/skills/intent-preview/SKILL.md');
  for (const [name, text] of [['writing-plans', writingPlans], ['intent-preview', intentPreview]]) {
    assert.ok(text.includes('spec-check approve'), `${name} must retain the spec-check approve fallback`);
  }
  assert.ok(intentPreview.includes('TTY'), 'intent-preview must retain TTY');
});
