// V2-native brain contract tests (node --test, no harness needed).
// Covers the persisted prompt hook, location-first project roots, the active
// gate summary, strict safety guards, and the docs contract. RED first: the
// Task 1 tests encode AC1-AC3, AC5, AC8, and AC10 before the plugin changes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

// Isolate the activation status file before importing the plugin.
process.env.XDG_STATE_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-lean-v2-state-'));

const repoRoot = path.resolve(import.meta.dirname, '../..');
const pluginURL = pathToFileURL(path.join(repoRoot, '.opencode', 'plugins', 'sdlc-lean.js')).href;
const specURL = pathToFileURL(path.join(repoRoot, 'scripts', 'spec-check.mjs')).href;
const plugin = await import(pluginURL);
const spec = await import(specURL);

const PLAN = 'docs/plans/plan.md';
const SPEC = 'docs/specs/spec.md';

const planText = ({
  spec: specRel = SPEC,
  status = 'approved',
  files = ['src/app.js'],
  allow = ['docs/debt-ledger.md'],
} = {}) => `---
spec: ${specRel}
status: ${status}
approved_by: plan-author
approved_at: 2026-10-30T00:00:00Z
files:
${files.map((f) => `  - ${f}`).join('\n')}
allow:
${allow.map((f) => `  - ${f}`).join('\n')}
---

# Plan
`;

const makeRoot = ({ files, allow } = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-lean-v2-'));
  fs.mkdirSync(path.join(root, 'docs', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'plans'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'specs', 'spec.md'), '# Spec\n');
  fs.writeFileSync(path.join(root, 'docs', 'plans', 'plan.md'), planText({ files, allow }));
  fs.writeFileSync(path.join(root, 'src', 'app.js'), '// app\n');
  fs.writeFileSync(path.join(root, 'docs', 'debt-ledger.md'), '# Debt ledger\n');
  return root;
};

const tempRoot = (t, options) => {
  const root = makeRoot(options);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
};

// Activate the real contract: buildGate/writeGate from scripts/spec-check.mjs.
const activate = (root) => {
  const gate = spec.buildGate(root, PLAN);
  spec.writeGate(root, gate);
  return gate;
};

const userMessage = (text = 'earlier') => ({ info: { role: 'user' }, parts: [{ type: 'text', text }] });

// V2 mock: captures every registration and every side-effect surface.
const mockCtx = ({
  root,
  directory,
  messages = [],
  sessionContext,
  getSession,
} = {}) => {
  const ctx = {
    hooks: {},
    toolHooks: {},
    synthetic: [],
    permissionCalls: [],
    sessionContextCalls: [],
    sessionGetCalls: [],
    registeredCommands: [],
    command: {
      transform: (cb) => cb({ add: (cmd) => ctx.registeredCommands.push(cmd) }),
    },
    skill: { transform: async (cb) => cb({ add: () => {} }) },
    session: {
      hook: async (name, cb) => { ctx.hooks[name] = cb; },
      context: async (args) => {
        ctx.sessionContextCalls.push(args);
        if (typeof sessionContext === 'function') return sessionContext(args);
        return sessionContext ?? { data: { messages } };
      },
      get: async (args) => {
        ctx.sessionGetCalls.push(args);
        if (typeof getSession === 'function') return getSession(args);
        return getSession ?? { data: { id: args?.sessionID || 'sess-default' } };
      },
      synthetic: async (event) => { ctx.synthetic.push(event); },
    },
    tool: { hook: async (name, cb) => { ctx.toolHooks[name] = cb; } },
    permission: {
      hook: (...args) => { ctx.permissionCalls.push(args); return Promise.resolve(); },
      assert: async (...args) => { ctx.permissionCalls.push(args); },
    },
  };
  if (root !== undefined) ctx.location = { directory: root };
  if (directory !== undefined) ctx.directory = directory;
  return ctx;
};

const setup = async (options) => {
  const ctx = mockCtx(options);
  await plugin.default.setup(ctx);
  return ctx;
};

const requireHook = (ctx, name) => {
  assert.equal(typeof ctx.hooks[name], 'function', `V2 must register the "${name}" session hook`);
  return ctx.hooks[name];
};

// --- prompt: persisted bootstrap --------------------------------------------
test('prompt: first prompt appends the bootstrap after the user text', async (t) => {
  const root = tempRoot(t);
  const ctx = await setup({ root, messages: [] });
  const promptHook = requireHook(ctx, 'prompt');
  const bootstrap = plugin.getBootstrapContent();
  assert.ok(bootstrap && bootstrap.includes('EXTREMELY_IMPORTANT'));

  const event = { sessionID: 'sess-prompt-first', prompt: { text: 'build a parser' } };
  await promptHook(event);

  assert.equal(event.prompt.text, `build a parser\n\n${bootstrap}`);
});

test('prompt: a session that already has a user message is unchanged', async (t) => {
  const root = tempRoot(t);
  const ctx = await setup({ root, messages: [userMessage()] });
  const promptHook = requireHook(ctx, 'prompt');

  const event = { sessionID: 'sess-prompt-existing', prompt: { text: 'again' } };
  await promptHook(event);

  assert.equal(event.prompt.text, 'again');
});

test('prompt: a retry after an empty message injects again', async (t) => {
  const root = tempRoot(t);
  const ctx = await setup({ root, messages: [{ info: { role: 'assistant' }, parts: [] }] });
  const promptHook = requireHook(ctx, 'prompt');

  const event = { sessionID: 'sess-prompt-retry', prompt: { text: 'retry' } };
  await promptHook(event);

  assert.ok(event.prompt.text.startsWith('retry\n\n'));
  assert.ok(event.prompt.text.includes('EXTREMELY_IMPORTANT'));
});

test('prompt: child sessions skip injection', async (t) => {
  const root = tempRoot(t);
  const ctx = await setup({
    root,
    messages: [],
    getSession: { data: { id: 'sess-child-brain', parentID: 'sess-top-brain' } },
  });
  const promptHook = requireHook(ctx, 'prompt');

  const event = { sessionID: 'sess-child-brain', prompt: { text: 'implement task 3' } };
  await promptHook(event);

  assert.equal(event.prompt.text, 'implement task 3');
});

test('prompt: a rejected or thrown session.context lookup skips injection', async (t) => {
  const root = tempRoot(t);
  const rejecting = await setup({ root, sessionContext: async () => { throw new Error('down'); } });
  const eventA = { sessionID: 'sess-lookup-reject', prompt: { text: 'hi' } };
  await requireHook(rejecting, 'prompt')(eventA);
  assert.equal(eventA.prompt.text, 'hi');

  const rejectingPromise = await setup({ root, sessionContext: () => Promise.reject(new Error('down')) });
  const eventB = { sessionID: 'sess-lookup-reject-promise', prompt: { text: 'hi' } };
  await requireHook(rejectingPromise, 'prompt')(eventB);
  assert.equal(eventB.prompt.text, 'hi');

  // A lookup failure is a skip, not the runtime fallback.
  const system = { sessionID: 'sess-lookup-reject', system: [] };
  await requireHook(rejecting, 'context')(system);
  assert.deepEqual(system.system, []);
});

test('prompt: @file mention text stays a prefix after the append', async (t) => {
  const root = tempRoot(t);
  const ctx = await setup({ root, messages: [] });
  const text = '@src/app.js explain the parser';
  const event = { sessionID: 'sess-prompt-mention', prompt: { text } };
  await requireHook(ctx, 'prompt')(event);

  assert.ok(event.prompt.text.startsWith(`${text}\n\n`));
  assert.ok(event.prompt.text.includes('EXTREMELY_IMPORTANT'));
});

test('prompt: two distinct sessions each inject (no process-local set)', async (t) => {
  const root = tempRoot(t);
  const ctx = await setup({ root, messages: [] });
  const promptHook = requireHook(ctx, 'prompt');
  const bootstrap = plugin.getBootstrapContent();

  const a = { sessionID: 'sess-prompt-a', prompt: { text: 'one' } };
  const b = { sessionID: 'sess-prompt-b', prompt: { text: 'two' } };
  await promptHook(a);
  await promptHook(b);

  assert.equal(a.prompt.text, `one\n\n${bootstrap}`);
  assert.equal(b.prompt.text, `two\n\n${bootstrap}`);
});

test('prompt: writeStatus records the injecting session', async (t) => {
  const root = tempRoot(t);
  const ctx = await setup({ root, messages: [] });
  await requireHook(ctx, 'prompt')({ sessionID: 'sess-prompt-status', prompt: { text: 'hi' } });

  const status = plugin.getStatus();
  assert.ok(status, 'status file must exist after injection');
  assert.equal(status.sessionID, 'sess-prompt-status');
  assert.equal(status.active, true);
});

test('prompt: a runtime throw marks the session for the context fallback', async (t) => {
  const root = tempRoot(t);
  const ctx = await setup({ root, messages: [] });
  const promptHook = requireHook(ctx, 'prompt');

  // The host rejects the mutation: a runtime throw after the bootstrap is built.
  const prompt = {
    get text() { return 'hi'; },
    set text(_value) { throw new Error('host rejected the prompt edit'); },
  };
  const event = { sessionID: 'sess-prompt-fallback', prompt };
  await promptHook(event);

  const system = { sessionID: 'sess-prompt-fallback', system: [] };
  await requireHook(ctx, 'context')(system);
  assert.equal(system.system.length, 1, 'the fallback must inject the bootstrap once');
  assert.ok(system.system[0].text.includes('EXTREMELY_IMPORTANT'));

  const second = { sessionID: 'sess-prompt-fallback', system: [] };
  await ctx.hooks.context(second);
  assert.deepEqual(second.system, [], 'the fallback flag is consumed once');
});

// --- root: project resolution ----------------------------------------------
test('root: projectRoot prefers location.directory over directory and never uses cwd', () => {
  assert.equal(plugin.projectRoot({ location: { directory: '/loc' }, directory: '/dir' }), '/loc');
  assert.equal(plugin.projectRoot({ location: { directory: '/loc' } }), '/loc');
  assert.equal(plugin.projectRoot({ directory: '/dir' }), '/dir');
  assert.equal(plugin.projectRoot({ location: {} }), undefined);
  assert.equal(plugin.projectRoot({}), undefined);
  assert.notEqual(plugin.projectRoot({}), process.cwd());
});

test('root: the V2 tool hook uses location when both roots are present', async (t) => {
  const rootA = tempRoot(t, { files: ['src/app.js'] });
  const rootB = tempRoot(t);
  activate(rootA);
  const ctx = await setup({ root: rootA, directory: rootB });
  const toolHook = ctx.toolHooks['execute.before'];
  assert.equal(typeof toolHook, 'function');

  assert.doesNotThrow(() => toolHook({ tool: 'edit', input: { filePath: 'src/app.js' } }));
  assert.throws(() => toolHook({ tool: 'edit', input: { filePath: 'src/other.js' } }), /spec gate|outside/i);
});

test('root: a location-only V2 tool hook enforces the plan scope', async (t) => {
  const root = tempRoot(t, { files: ['src/app.js'] });
  activate(root);
  const ctx = await setup({ root });
  const toolHook = ctx.toolHooks['execute.before'];

  assert.doesNotThrow(() => toolHook({ tool: 'edit', input: { filePath: 'src/app.js' } }));
  assert.throws(() => toolHook({ tool: 'edit', input: { filePath: 'src/other.js' } }), /spec gate|outside/i);
});

test('root: checkSpecGate fails closed for mutating tools when the root is unknown', () => {
  for (const tool of ['edit', 'write', 'patch']) {
    const args = tool === 'patch'
      ? { patchText: '*** Begin Patch\n*** Update File: src/app.js\n+x\n*** End Patch' }
      : { filePath: 'src/app.js' };
    assert.throws(() => plugin.checkSpecGate(tool, args, undefined), /root unknown/i, tool);
  }
  assert.doesNotThrow(() => plugin.checkSpecGate('read', { filePath: 'src/app.js' }, undefined));
  assert.doesNotThrow(() => plugin.checkSpecGate('bash', { command: 'git status' }, undefined));
  assert.doesNotThrow(() => plugin.checkSpecGate('edit', {}, undefined), 'targetless calls stay no-ops');
});

test('root: compactionContext(undefined) returns an empty list', () => {
  assert.deepEqual(plugin.compactionContext(undefined), []);
});

test('root: the V2 compaction hook uses location.directory', async (t) => {
  const root = tempRoot(t);
  fs.writeFileSync(path.join(root, 'docs', 'debt-ledger.md'), '# Location ledger\n');
  const ctx = await setup({ root });
  const compactionHook = requireHook(ctx, 'compaction');

  const event = { system: [] };
  await compactionHook(event);

  assert.equal(event.system.length, 1);
  assert.ok(event.system[0].text.includes('# Location ledger'));
});

test('root: the V1 compaction hook with no directory still uses the repo-root default', async () => {
  const hooks = await plugin.SdlcLeanPlugin({});
  const output = {};
  await hooks['experimental.session.compacting']({}, output);

  assert.ok(Array.isArray(output.context) && output.context.length >= 1);
  assert.ok(output.context.some((part) => part.includes('# Debt ledger')), 'V1 legacy default must survive');
});

// --- gate: validated context summary ---------------------------------------
test('gate: a valid marker adds one short summary with plan, spec, and file count', async (t) => {
  const root = tempRoot(t, { files: ['src/app.js'] });
  activate(root);
  const ctx = await setup({ root });
  const contextHook = requireHook(ctx, 'context');

  const event = { sessionID: 'sess-gate-valid', system: [] };
  await contextHook(event);

  assert.equal(event.system.length, 1, 'exactly one short summary');
  const text = event.system[0].text;
  assert.ok(text.includes(PLAN), 'summary must name the plan');
  assert.ok(text.includes(SPEC), 'summary must name the spec');
  assert.match(text, /\b1 files?\b/, 'summary must state the file count');
  assert.ok(!text.includes('EXTREMELY_IMPORTANT'), 'the context hook must not inject the bootstrap');
  assert.ok(text.length < 500, 'summary must stay short');
});

test('gate: an invalid marker pushes only "gate invalid"', async (t) => {
  const root = tempRoot(t);
  fs.mkdirSync(path.join(root, '.sdlc'), { recursive: true });
  fs.writeFileSync(path.join(root, '.sdlc', 'spec-gate.json'), '{not json');
  const ctx = await setup({ root });

  const event = { sessionID: 'sess-gate-invalid', system: [] };
  await requireHook(ctx, 'context')(event);

  assert.equal(event.system.length, 1);
  assert.match(event.system[0].text, /gate invalid/i);
  assert.ok(!event.system[0].text.includes('EXTREMELY_IMPORTANT'));
  assert.ok(!event.system[0].text.includes(PLAN));
});

test('gate: no marker pushes nothing', async (t) => {
  const root = tempRoot(t);
  const ctx = await setup({ root });

  const event = { sessionID: 'sess-gate-none', system: [] };
  await requireHook(ctx, 'context')(event);

  assert.deepEqual(event.system, []);
});

// --- safety: strict guards, no in-band bypass ------------------------------
test('safety: #nosafety no longer bypasses destructive, secret, or Colab guards', () => {
  const cases = [
    ['bash', { command: 'rm -rf / #nosafety' }, /destructive/i],
    ['bash', { command: 'cat .env #nosafety' }, /sensitive/i],
    ['bash', { command: 'pkill -f colab-mcp #nosafety' }, /bridge/i],
    ['bash', { command: 'rm -rf /content #nosafety' }, /artifact|unexported/i],
  ];
  for (const [tool, args, pattern] of cases) {
    assert.throws(() => plugin.checkSafety(tool, args), pattern, args.command);
    try {
      plugin.checkSafety(tool, args);
    } catch (err) {
      assert.ok(!String(err.message).includes('#nosafety'), `guard message must not advertise the token: ${err.message}`);
    }
  }
  // The token in an otherwise benign command is just text.
  assert.doesNotThrow(() => plugin.checkSafety('bash', { command: 'git status #nosafety' }));
});

test('safety: benign commands still pass (fail-open)', () => {
  for (const command of [
    'git status',
    'cat src/index.ts',
    'rm -rf /tmp/content',
    'rm -rf .worktrees/stale-branch',
    'pkill -f colab-mcp-helper',
    'grep -rn "rm -rf /content" docs/',
  ]) {
    assert.doesNotThrow(() => plugin.checkSafety('bash', { command }), command);
  }
  assert.doesNotThrow(() => plugin.checkSafety('read', { filePath: 'src/index.ts' }));
  assert.doesNotThrow(() => plugin.checkSafety('read', { filePath: 'envelope.py' }));
});

test('safety: ctx.permission is never called', async (t) => {
  const root = tempRoot(t);
  activate(root);
  const ctx = await setup({ root });
  const toolHook = ctx.toolHooks['execute.before'];

  assert.throws(() => toolHook({ tool: 'bash', input: { command: 'rm -rf /' } }), /destructive/i);
  assert.doesNotThrow(() => toolHook({ tool: 'bash', input: { command: 'git status' } }));
  assert.equal(ctx.permissionCalls.length, 0, 'no permission hook or assert');
});

test('safety: V1 keeps exactly the four existing hooks', async () => {
  const hooks = await plugin.SdlcLeanPlugin({});
  assert.deepEqual(Object.keys(hooks).sort(), [
    'config',
    'experimental.chat.messages.transform',
    'experimental.session.compacting',
    'tool.execute.before',
  ].sort());
});

// --- docs: user-facing contract --------------------------------------------
test('docs: README, USAGE, and CHANGELOG name sdlc.approve, host evidence, and preview-only', () => {
  const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8');
  for (const [name, text] of [
    ['README.md', read('README.md')],
    ['USAGE.md', read('USAGE.md')],
    ['CHANGELOG.md', read('CHANGELOG.md')],
  ]) {
    assert.ok(text.includes('sdlc.approve'), `${name} must name the sdlc.approve palette command`);
    assert.match(text, /host evidence/i, `${name} must name host evidence`);
    assert.match(text, /preview-only/i, `${name} must name the preview-only picker`);
  }
});

test('docs: CHANGELOG states that #nosafety is removed', () => {
  const changelog = fs.readFileSync(path.join(repoRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(changelog.includes('#nosafety'), 'CHANGELOG must name the removed token');
  assert.match(changelog, /remov/i, 'CHANGELOG must state the removal');
});

test('docs: README and USAGE name scripts/host-evidence.mjs', () => {
  for (const [, text] of [
    ['README.md', fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8')],
    ['USAGE.md', fs.readFileSync(path.join(repoRoot, 'USAGE.md'), 'utf8')],
  ]) {
    assert.ok(text.includes('scripts/host-evidence.mjs'), 'docs must name the host-evidence script');
  }
});
