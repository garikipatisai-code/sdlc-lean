// TUI part contract tests (node --test, no harness needed).
// The real register.js is exercised with fake keymap/dialog/toast/router/skill
// contexts. RED baseline: the TUI directory does not exist yet, so this module
// fails to load with ERR_MODULE_NOT_FOUND until Task 3.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const tuiDir = path.join(repoRoot, '.opencode', 'plugins', 'sdlc-lean-tui');
const registerURL = pathToFileURL(path.join(tuiDir, 'register.js')).href;
const tuiURL = pathToFileURL(path.join(tuiDir, 'tui.js')).href;
const indexURL = pathToFileURL(path.join(tuiDir, 'index.js')).href;
const specURL = pathToFileURL(path.join(repoRoot, 'scripts', 'spec-check.mjs')).href;

const register = await import(registerURL);
const spec = await import(specURL);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const PLAN_REL = 'docs/plans/2026-10-30-plan.md';
const OTHER_REL = 'docs/plans/2026-10-29-other.md';

const planText = ({
  spec: specRel = 'docs/specs/spec.md',
  files = ['src/app.js', 'src/lib/*.js'],
  allow = ['docs/plans/plan-progress.md'],
} = {}) => `---
spec: ${specRel}
status: approved
approved_by: plan-author
approved_at: 2026-10-30T00:00:00Z
files:
${files.map((f) => `  - ${f}`).join('\n')}
allow:
${allow.map((f) => `  - ${f}`).join('\n')}
---

# Plan

Details here.
`;

const makeRoot = ({ gate = false } = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-lean-tui-'));
  fs.mkdirSync(path.join(root, 'docs', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'plans'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'specs', 'spec.md'), '# Spec\n');
  fs.writeFileSync(path.join(root, PLAN_REL), planText());
  if (gate) spec.writeGate(root, spec.buildGate(root, PLAN_REL));
  return root;
};

const tempRoot = (t, options) => {
  const root = makeRoot(options);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
};

// --- listPlans ---------------------------------------------------------------
test('tui: listPlans lists immediate plans and skips unsafe entries', (t) => {
  const root = tempRoot(t);
  fs.writeFileSync(path.join(root, OTHER_REL), planText());
  fs.writeFileSync(path.join(root, 'docs/plans/2026-10-30-plan-progress.md'), '# progress');
  fs.writeFileSync(path.join(root, 'docs/plans/2026-10-30-plan-evidence.md'), '# evidence');
  fs.mkdirSync(path.join(root, 'docs/plans/nested'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/plans/nested/deep.md'), planText());
  fs.mkdirSync(path.join(root, 'docs/plans/folder.md'));
  fs.writeFileSync(path.join(root, 'docs/plans/big.md'), 'x'.repeat((1024 * 1024) + 16));
  fs.writeFileSync(path.join(root, 'docs/plans/bad\nname.md'), planText());
  fs.symlinkSync(path.join(root, PLAN_REL), path.join(root, 'docs/plans/link.md'));
  fs.symlinkSync(path.join(root, PLAN_REL), path.join(root, 'docs/plans/linked-plan.md'));

  const plans = register.listPlans(root);
  assert.deepEqual(plans.map((p) => p.rel).sort(), [OTHER_REL, PLAN_REL].sort());
  assert.equal(plans[0].rel, PLAN_REL, 'newest first');
  for (const plan of plans) {
    assert.equal(typeof plan.abs, 'string');
    assert.ok(plan.abs.startsWith(path.join(root, 'docs', 'plans')));
    assert.equal(plan.name, path.basename(plan.rel));
    assert.equal(plan.size, fs.statSync(plan.abs).size);
  }
});

// --- planDetails -------------------------------------------------------------
test('tui: planDetails returns files, allow, and the plan SHA-256', (t) => {
  const root = tempRoot(t);
  const details = register.planDetails(root, PLAN_REL);

  assert.equal(details.spec, 'docs/specs/spec.md');
  assert.equal(details.status, 'approved');
  assert.deepEqual(details.files, ['src/app.js', 'src/lib/*.js']);
  assert.deepEqual(details.allow, ['docs/plans/plan-progress.md']);
  assert.equal(details.plan_sha256, sha256(fs.readFileSync(path.join(root, PLAN_REL))));
  assert.equal(details.plan, PLAN_REL);
});

test('tui: planDetails refuses escapes and non-plan paths', (t) => {
  const root = tempRoot(t);
  assert.throws(() => register.planDetails(root, '../outside.md'));
  assert.throws(() => register.planDetails(root, 'docs/specs/spec.md'));
});

// --- resolveSessionID --------------------------------------------------------
test('tui: resolveSessionID uses only a current session route', () => {
  const withCurrent = (route) => register.resolveSessionID({ ui: { router: { current: () => route } } });

  assert.equal(withCurrent({ type: 'session', sessionID: 'sess-tui-1' }), 'sess-tui-1');
  assert.equal(withCurrent({ type: 'home' }), null);
  assert.equal(withCurrent({ type: 'plugin', sessionID: 'sess-tui-2' }), null);
  assert.equal(withCurrent({ type: 'session' }), null);
  assert.equal(withCurrent(undefined), null);
  assert.equal(register.resolveSessionID({}), null);
  assert.equal(register.resolveSessionID({ ui: { router: {} } }), null);

  // No most-recent-session fallback: a non-router field is not consulted.
  assert.equal(register.resolveSessionID({ sessionID: 'sess-most-recent' }), null);
});

// --- buildApproveCommand -----------------------------------------------------
test('tui: buildApproveCommand returns the exact /approve command', (t) => {
  const root = tempRoot(t);
  const hash = 'a'.repeat(64);
  assert.equal(
    register.buildApproveCommand(root, PLAN_REL, hash),
    `/approve ${path.resolve(root, PLAN_REL)} sha256:${hash}`,
  );
});

// --- gateSummary -------------------------------------------------------------
test('tui: gateSummary validates the marker and both hashes', (t) => {
  const root = tempRoot(t, { gate: true });
  const gate = spec.readGate(root);
  const summary = register.gateSummary(root);

  assert.equal(summary.active, true);
  assert.equal(summary.plan, PLAN_REL);
  assert.equal(summary.spec, 'docs/specs/spec.md');
  assert.deepEqual(summary.files, ['src/app.js', 'src/lib/*.js']);
  assert.deepEqual(summary.allow, ['docs/plans/plan-progress.md']);
  assert.equal(summary.plan_sha256, gate.plan_sha256);
  assert.equal(summary.spec_sha256, gate.spec_sha256);
  assert.ok(!summary.invalid);
});

test('tui: gateSummary flags a tampered marker or changed file as invalid', (t) => {
  const tampered = tempRoot(t, { gate: true });
  const markerPath = path.join(tampered, '.sdlc', 'spec-gate.json');
  const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
  marker.plan_sha256 = '0'.repeat(64);
  fs.writeFileSync(markerPath, JSON.stringify(marker));
  assert.deepEqual(register.gateSummary(tampered), { active: true, invalid: true });

  const changed = tempRoot(t, { gate: true });
  fs.appendFileSync(path.join(changed, PLAN_REL), '\nchanged\n');
  assert.deepEqual(register.gateSummary(changed), { active: true, invalid: true });
});

test('tui: gateSummary reports no marker as inactive', (t) => {
  const root = tempRoot(t);
  assert.deepEqual(register.gateSummary(root), { active: false });
});

// --- setupTui / fake context -------------------------------------------------
const makeTuiCtx = ({
  root,
  location = true,
  dataDirectory = false,
  skillList = [1, 2],
  skillMissing = false,
  skillThrows = false,
  sessionID = 'sess-tui',
  router,
  select = PLAN_REL,
  confirm = true,
  bindFailsOnce = false,
} = {}) => {
  const calls = {
    layers: [],
    select: [],
    confirm: [],
    prompt: [],
    toast: [],
    log: [],
    sessionCommand: [],
    sessionPrompt: [],
    command: 0,
    keybind: 0,
    sync: [],
    list: [],
  };
  let commands = [];
  let bindThrows = bindFailsOnce;

  const session = {
    command: async (...args) => { calls.sessionCommand.push(args); },
    prompt: async (...args) => { calls.sessionPrompt.push(args); },
  };

  const context = {
    data: {      location: {
        ...(dataDirectory ? { directory: root } : {}),
        default: () => ({ directory: root }),
        ...(skillMissing ? {} : {
          skill: {
            sync: async (loc) => {
              calls.sync.push(loc);
              if (skillThrows) throw new Error('skill sync failed');
              return skillList;
            },
            list: async (loc) => {
              calls.list.push(loc);
              if (skillThrows) throw new Error('skill list failed');
              return skillList;
            },
          },
        }),
      },
    },
    keymap: {
      layer: (fn) => {
        const layer = fn();
        calls.layers.push(layer);
        if (bindThrows && Array.isArray(layer.commands) && layer.commands.some((c) => c.bind)) {
          bindThrows = false;
          throw new Error('bind parse failure');
        }
        commands = layer.commands;
        return { dispose: () => {} };
      },
      command: () => { calls.command++; },
      keybind: () => { calls.keybind++; },
    },
    dialog: {
      select: async (input) => { calls.select.push(input); return select; },
      confirm: async (input) => { calls.confirm.push(input); return confirm; },
      prompt: async (input) => { calls.prompt.push(input); return undefined; },
    },
    toast: { show: async (input) => { calls.toast.push(input); } },
    app: { log: async (input) => { calls.log.push(input); } },
    ui: { router: { current: () => (router !== undefined ? router : (sessionID ? { type: 'session', sessionID } : undefined)) } },
    session,
    client: { app: { log: async (input) => { calls.log.push(input); } }, session },
  };
  if (location) context.location = { directory: root };
  return { context, calls, getCommands: () => commands };
};

const allText = (calls) => JSON.stringify([
  ...calls.toast,
  ...calls.log,
  ...calls.select,
  ...calls.confirm,
  ...calls.prompt,
]);

const commandById = (made, id) => {
  assert.ok(Array.isArray(made.getCommands()), 'setupTui must expose an array of commands');
  return made.getCommands().find((c) => c.id === id);
};

test('tui: setupTui registers the documented keymap layer commands', async (t) => {
  const root = tempRoot(t);
  register.resetTuiState();
  const made = makeTuiCtx({ root });
  await register.setupTui(made.context);

  assert.equal(made.calls.layers.length >= 1, true);
  const layer = made.calls.layers[made.calls.layers.length - 1];
  assert.equal(layer.mode, 'global');
  assert.deepEqual(made.getCommands().map((c) => c.id).sort(), ['sdlc.approve', 'sdlc.status']);
  for (const cmd of made.getCommands()) {
    assert.equal(cmd.palette, true);
    assert.equal(typeof cmd.run, 'function');
  }
  assert.equal(made.calls.command, 0, 'layer.command must not be used');
  assert.equal(made.calls.keybind, 0, 'layer.keybind must not be used');
});

test('tui: a bind parse failure retries without bind and keeps the palette', async (t) => {
  const root = tempRoot(t);
  register.resetTuiState();
  const made = makeTuiCtx({ root, bindFailsOnce: true });
  await register.setupTui(made.context);

  assert.ok(made.calls.layers.length >= 2, 'setupTui must retry the layer registration');
  const last = made.calls.layers[made.calls.layers.length - 1];
  assert.ok(last.commands.some((c) => c.id === 'sdlc.approve'), 'the palette survives');
  assert.ok(last.commands.every((c) => c.bind === undefined), 'the retry drops bind');
});

test('tui: the picker lists, confirms, and shows the exact preview command', async (t) => {
  const root = tempRoot(t);
  register.resetTuiState();
  const made = makeTuiCtx({ root, select: PLAN_REL, confirm: true });
  await register.setupTui(made.context);

  const approve = commandById(made, 'sdlc.approve');
  await approve.run();

  const hash = sha256(fs.readFileSync(path.join(root, PLAN_REL)));
  const exact = `/approve ${path.resolve(root, PLAN_REL)} sha256:${hash}`;
  assert.ok(made.calls.select.length >= 1, 'the picker must open a plan list');
  assert.ok(made.calls.confirm.length >= 1, 'the picker must confirm details');
  assert.ok(allText(made.calls).includes(exact), 'the exact preview command must be shown');
  assert.match(allText(made.calls), /preview-only/i);
  assert.ok(allText(made.calls).includes('src/app.js'), 'files patterns must be shown');
  assert.ok(allText(made.calls).includes('docs/plans/plan-progress.md'), 'allow patterns must be shown');
  assert.equal(made.calls.sessionCommand.length, 0, 'the picker must not call session.command');
  assert.equal(made.calls.sessionPrompt.length, 0, 'the picker must not send a model prompt');
});

test('tui: the picker refuses without a current session', async (t) => {
  const root = tempRoot(t);
  register.resetTuiState();
  const made = makeTuiCtx({ root, sessionID: null });
  await register.setupTui(made.context);

  await commandById(made, 'sdlc.approve').run();

  assert.equal(made.calls.select.length, 0);
  assert.equal(made.calls.confirm.length, 0);
  assert.equal(made.calls.sessionCommand.length, 0);
  assert.equal(made.calls.sessionPrompt.length, 0);
  assert.match(allText(made.calls), /session/i);
});

test('tui: sdlc.status shows the gate and the host-evidence count', async (t) => {
  const root = tempRoot(t, { gate: true });
  const gate = spec.readGate(root);
  fs.writeFileSync(path.join(root, '.sdlc', 'host-evidence.jsonl'), [
    JSON.stringify({ plan_sha256: gate.plan_sha256 }),
    JSON.stringify({ plan_sha256: '0'.repeat(64) }),
  ].join('\n') + '\n');
  register.resetTuiState();
  const made = makeTuiCtx({ root });
  await register.setupTui(made.context);

  await commandById(made, 'sdlc.status').run();

  const text = allText(made.calls);
  assert.ok(text.includes(PLAN_REL), 'status must name the active plan');
  assert.ok(text.includes('host evidence: 1/2 rows (advisory)'), 'status must show the evidence count');
});

test('tui: sdlc.status shows "gate invalid" when the marker has drifted', async (t) => {
  const root = tempRoot(t, { gate: true });
  const markerPath = path.join(root, '.sdlc', 'spec-gate.json');
  const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
  marker.plan_sha256 = '0'.repeat(64);
  fs.writeFileSync(markerPath, JSON.stringify(marker));
  register.resetTuiState();
  const made = makeTuiCtx({ root });
  await register.setupTui(made.context);

  await commandById(made, 'sdlc.status').run();

  assert.match(allText(made.calls), /gate invalid/i);
});

// --- activation --------------------------------------------------------------
test('tui: activation counts data.location.skill sync/list and uses the location', async (t) => {
  const root = tempRoot(t);
  register.resetTuiState();
  const withLocation = makeTuiCtx({ root, skillList: [1, 2, 3] });
  await register.setupTui(withLocation.context);
  assert.deepEqual(withLocation.calls.sync[0], withLocation.context.location);
  assert.deepEqual(withLocation.calls.list[0], withLocation.context.location);
  assert.equal(withLocation.calls.toast.length, 1);
  assert.match(JSON.stringify(withLocation.calls.toast), /\b3\b/, 'the returned array length is the count');

  register.resetTuiState();
  const withDefault = makeTuiCtx({ root, location: false, dataDirectory: true, skillList: [1, 2] });
  await register.setupTui(withDefault.context);
  assert.deepEqual(withDefault.calls.sync[0], { directory: root });
  assert.deepEqual(withDefault.calls.list[0], { directory: root });
});

test('tui: one activation toast per process across two setups', async (t) => {
  const root = tempRoot(t);
  register.resetTuiState();
  const first = makeTuiCtx({ root, skillList: [1, 2] });
  const second = makeTuiCtx({ root, skillList: [1, 2] });
  await register.setupTui(first.context);
  await register.setupTui(second.context);

  assert.equal(first.calls.toast.length + second.calls.toast.length, 1);
});

test('tui: zero skills or missing skill APIs log only and never toast', async (t) => {
  const root = tempRoot(t);
  register.resetTuiState();
  const zero = makeTuiCtx({ root, skillList: [] });
  await register.setupTui(zero.context);
  assert.equal(zero.calls.toast.length, 0);
  assert.ok(zero.calls.log.length >= 1, 'a zero count logs only');

  register.resetTuiState();
  const missing = makeTuiCtx({ root, skillMissing: true });
  await assert.doesNotReject(() => register.setupTui(missing.context));
  assert.equal(missing.calls.toast.length, 0);

  register.resetTuiState();
  const throwing = makeTuiCtx({ root, skillThrows: true });
  await assert.doesNotReject(() => register.setupTui(throwing.context));
  assert.equal(throwing.calls.toast.length, 0);
});

// --- module shapes -----------------------------------------------------------
test('tui: tui.js and index.js export the required part shapes', async () => {
  const tui = await import(tuiURL);
  assert.equal(tui.default.id, 'sdlc-lean-tui');
  assert.equal(typeof tui.default.setup, 'function');

  const index = await import(indexURL);
  assert.equal(index.default.id, 'sdlc-lean-tui');
  assert.equal(typeof index.default.setup, 'function');
});

test('tui: the part is plain JS with no JSX and no npm import', () => {
  for (const file of ['index.js', 'tui.js', 'register.js']) {
    const text = fs.readFileSync(path.join(tuiDir, file), 'utf8');
    assert.ok(!/\.jsx|\.tsx|React/.test(text), `${file} must stay plain JS`);
    const specifiers = [...text.matchAll(/(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
    for (const specifier of specifiers) {
      assert.ok(
        specifier.startsWith('node:') || specifier.startsWith('.'),
        `${file} must not import "${specifier}" (node: builtins or relative only)`,
      );
    }
  }
});
