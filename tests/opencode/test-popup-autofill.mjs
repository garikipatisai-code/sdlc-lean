// RED: popup autofill draft→approve→gate contract (AC1-AC5).
// Hermetic tmp roots, fake keymap/dialog/toast/router. Must FAIL until Task2/Task3.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Isolate global CLI + status before dynamic imports.
process.env.XDG_STATE_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'popup-autofill-state-'));
process.env.XDG_CONFIG_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'popup-autofill-config-'));

const repoRoot = path.resolve(import.meta.dirname, '../..');
const registerURL = pathToFileURL(path.join(repoRoot, '.opencode', 'plugins', 'sdlc-lean-tui', 'register.js')).href;
const specURL = pathToFileURL(path.join(repoRoot, 'scripts', 'spec-check.mjs')).href;
const pluginURL = pathToFileURL(path.join(repoRoot, '.opencode', 'plugins', 'sdlc-lean.js')).href;
const cliSource = path.join(repoRoot, 'scripts', 'spec-check.mjs');

const register = await import(registerURL);
const spec = await import(specURL);

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
const PLAN = 'docs/plans/2026-10-31-popup.md';
const SPEC = 'docs/specs/spec.md';
const BADGE = 'draft — Approve will fill frontmatter';

const draftPlanText = ({ files = ['src/app.js'], allow = ['docs/plans/popup-autofill-progress.md'] } = {}) => `---
spec: ${SPEC}
status: draft
approved_by:
approved_at:
files:
${files.map((f) => `  - ${f}`).join('\n')}
allow:
${allow.map((f) => `  - ${f}`).join('\n')}
---

# Plan

Popup-autofill fixture body.
`;

const makeDraftRoot = (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'popup-autofill-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'docs', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'plans'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, SPEC), '# Spec\n');
  fs.writeFileSync(path.join(root, PLAN), draftPlanText());
  fs.writeFileSync(path.join(root, 'src', 'app.js'), '// app\n');
  return root;
};

const makeTuiCtx = ({ root, select = PLAN, confirm = true } = {}) => {
  const calls = { layers: [], select: [], confirm: [], toast: [], log: [], sessionCommand: [], sessionPrompt: [] };
  let commands = [];
  const context = {
    data: { location: { directory: root, default: () => ({ directory: root }) } },
    keymap: { layer: (fn) => { const l = fn(); calls.layers.push(l); commands = l.commands; return { dispose: () => {} }; }, command: () => {}, keybind: () => {} },
    dialog: {
      select: async (input) => { calls.select.push(input); return select; },
      confirm: async (input) => { calls.confirm.push(input); return confirm; },
    },
    toast: { show: async (input) => { calls.toast.push(input); } },
    app: { log: async (input) => { calls.log.push(input); } },
    ui: { router: { current: () => ({ type: 'session', sessionID: 'sess-popup' }) } },
    session: { command: async (...a) => { calls.sessionCommand.push(a); }, prompt: async (...a) => { calls.sessionPrompt.push(a); } },
    client: { app: { log: async (input) => { calls.log.push(input); } } },
    location: { directory: root },
  };
  return { context, calls, getCommands: () => commands };
};
const allText = (calls) => JSON.stringify([...calls.toast, ...calls.log, ...calls.select, ...calls.confirm]);
const approveCmd = (made) => made.getCommands().find((c) => c.id === 'sdlc.approve');

// AC3 contract: trio importable for shared flip (fails until Task2 exports all three).
test('popup-autofill trio importable from scripts/spec-check.mjs', () => {
  assert.equal(typeof spec.sanitizeApprovedBy, 'function', 'sanitizeApprovedBy must be exported');
  assert.equal(typeof spec.applyApprovalFill, 'function', 'applyApprovalFill must be exported');
  assert.equal(typeof spec.fillApprovalFrontmatter, 'function', 'fillApprovalFrontmatter must be exported');
});

// AC1: draft listed with badge, same filters as parent.
test('popup lists draft with badge and parent filters', async (t) => {
  const root = makeDraftRoot(t);
  fs.writeFileSync(path.join(root, 'docs', 'plans', '2026-10-31-other.md'), draftPlanText());
  fs.writeFileSync(path.join(root, 'docs', 'plans', 'x-progress.md'), '# p');
  fs.writeFileSync(path.join(root, 'docs', 'plans', 'x-evidence.md'), '# e');
  fs.symlinkSync(path.join(root, PLAN), path.join(root, 'docs', 'plans', 'link.md'));
  fs.writeFileSync(path.join(root, 'docs', 'plans', 'big.md'), 'x'.repeat(1024 * 1024 + 16));
  const planBefore = fs.readFileSync(path.join(root, PLAN));
  const markerPath = path.join(root, '.sdlc', 'spec-gate.json');
  const markerBefore = fs.existsSync(markerPath) ? fs.readFileSync(markerPath) : null;
  register.resetTuiState();
  const made = makeTuiCtx({ root, confirm: false });
  await register.setupTui(made.context);
  await approveCmd(made).run();
  assert.ok(fs.readFileSync(path.join(root, PLAN)).equals(planBefore), 'select must not mutate the plan');
  assert.equal(fs.existsSync(markerPath), markerBefore !== null, 'select must not mutate the marker');
  if (markerBefore !== null) assert.ok(fs.readFileSync(markerPath).equals(markerBefore), 'select must leave marker byte-identical');
  assert.ok(made.calls.select.length >= 1, 'picker must open');
  const opts = JSON.stringify(made.calls.select[0]);
  assert.ok(opts.includes(BADGE), `draft row must be badged "${BADGE}", got: ${opts.slice(0, 400)}`);
  assert.ok(opts.includes(PLAN), 'draft plan must be listed');
  assert.ok(!opts.includes('link.md'), 'symlink must be skipped');
  assert.ok(!opts.includes('big.md'), '>1MB must be skipped');
  assert.ok(!opts.includes('x-progress.md') && !opts.includes('x-evidence.md'), 'progress/evidence must be skipped');
});

// AC2: confirm shows full files/allow + both SHAs + spec link, excerpt capped.
test('popup confirm shows full scope plus both hashes plus spec link', async (t) => {
  const root = makeDraftRoot(t);
  register.resetTuiState();
  const made = makeTuiCtx({ root, confirm: false });
  await register.setupTui(made.context);
  await approveCmd(made).run();
  assert.ok(made.calls.confirm.length >= 1, 'draft must reach a confirm dialog');
  const msg = JSON.stringify(made.calls.confirm[0]);
  const planHash = sha256(fs.readFileSync(path.join(root, PLAN)));
  const specHash = sha256(fs.readFileSync(path.join(root, SPEC)));
  assert.ok(msg.includes('src/app.js'), 'full files must be shown');
  assert.ok(msg.includes('docs/plans/popup-autofill-progress.md'), 'full allow must be shown');
  assert.ok(msg.includes(planHash), 'plan SHA-256 must be shown');
  assert.ok(msg.includes(specHash), 'spec SHA-256 must be shown');
  assert.ok(msg.includes(SPEC), 'spec link must be shown');
  const bigRel = 'docs/plans/2026-10-31-bigwrap.md';
  fs.writeFileSync(path.join(root, bigRel), `${draftPlanText()}\n${'A'.repeat(5000)}\n`);
  register.resetTuiState();
  const made2 = makeTuiCtx({ root, select: bigRel, confirm: false });
  await register.setupTui(made2.context);
  await approveCmd(made2).run();
  const msg2 = JSON.stringify(made2.calls.confirm[0] ?? {});
  assert.ok(!msg2.includes('A'.repeat(5000)), 'excerpt must be capped, never the full body');
});

// AC3: Approve flips frontmatter then gates with tui-popup-autofill + os.userInfo (never USER env).
test('popup Approve flips frontmatter then gates with tui-popup-autofill', async (t) => {
  const root = makeDraftRoot(t);
  const prevUser = process.env.USER;
  process.env.USER = 'attacker-env-spoof';
  t.after(() => { if (prevUser === undefined) delete process.env.USER; else process.env.USER = prevUser; });
  register.resetTuiState();
  const made = makeTuiCtx({ root, confirm: true });
  await register.setupTui(made.context);
  await approveCmd(made).run();
  const after = fs.readFileSync(path.join(root, PLAN), 'utf8');
  assert.match(after, /^status:\s*approved\s*$/m, 'plan status must flip to approved');
  const gate = spec.readGate(root);
  const valid = spec.validateGate(root, gate);
  assert.equal(valid.approved_via, 'tui-popup-autofill', 'marker must carry tui-popup-autofill');
  assert.equal(valid.approved_by, os.userInfo().username, 'user must come from os.userInfo()');
  assert.ok(valid.approved_by !== 'attacker-env-spoof', 'USER env must never be trusted');
  assert.match(allText(made.calls), /active/, 'success must toast active gate');
});

// AC3 shared-contract order: TUI reuses helpers, no second implementation.
test('popup flip reuses shared autofill helpers', () => {
  const src = fs.readFileSync(path.join(repoRoot, '.opencode', 'plugins', 'sdlc-lean-tui', 'register.js'), 'utf8');
  assert.ok(src.includes('applyApprovalFill'), 'register must reuse applyApprovalFill');
  assert.ok(src.includes('fillApprovalFrontmatter'), 'register must reuse fillApprovalFrontmatter');
  assert.ok(src.includes('sanitizeApprovedBy'), 'register must reuse sanitizeApprovedBy');
  assert.ok(src.includes('tui-popup-autofill'), 'register must use the tui-popup-autofill token');
  assert.ok(src.includes('node:os'), 'register must read the user via node:os');
});

// AC4: Reject/dismiss leaves plan + marker byte-identical.
test('popup Reject leaves plan and marker byte-identical', async (t) => {
  const root = makeDraftRoot(t);
  // Preexisting marker from an approved sibling, then dismiss a draft pick.
  const approvedRel = 'docs/plans/2026-10-30-approved.md';
  fs.writeFileSync(path.join(root, approvedRel), draftPlanText().replace('status: draft', 'status: approved').replace('approved_by:', 'approved_by: someone').replace('approved_at:', 'approved_at: 2026-10-30T00:00:00Z'));
  const preGate = spec.buildGate(root, approvedRel);
  spec.writeGate(root, preGate);
  const planBefore = fs.readFileSync(path.join(root, PLAN));
  const markerBefore = fs.readFileSync(path.join(root, '.sdlc', 'spec-gate.json'));
  register.resetTuiState();
  const made = makeTuiCtx({ root, select: PLAN, confirm: false });
  await register.setupTui(made.context);
  await approveCmd(made).run();
  assert.ok(made.calls.confirm.length >= 1, 'reject path must show a confirm dialog');
  assert.ok(fs.readFileSync(path.join(root, PLAN)).equals(planBefore), 'dismiss must not touch the plan');
  assert.ok(fs.readFileSync(path.join(root, '.sdlc', 'spec-gate.json')).equals(markerBefore), 'dismiss must not touch the marker');
});

// AC2/AC3 containment: symlink plan refused with clean .sdlc, no write outside root.
test('popup refuses symlink plan selection', async (t) => {
  const root = makeDraftRoot(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'popup-outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const outsidePlan = path.join(outside, 'evil.md');
  fs.writeFileSync(outsidePlan, draftPlanText());
  try { fs.symlinkSync(outsidePlan, path.join(root, 'docs', 'plans', 'linked-evil.md')); } catch { /* ignore */ }
  register.resetTuiState();
  const made = makeTuiCtx({ root, select: 'docs/plans/linked-evil.md', confirm: true });
  await register.setupTui(made.context);
  await approveCmd(made).run();
  assert.match(allText(made.calls), /symlink|realpath|escape|outside/i, 'symlink plan escape must be refused as symlink-specific');
  assert.equal(fs.existsSync(path.join(outside, 'spec-gate.json')), false, 'no write outside the root');
});

// AC2/AC3 containment: symlinked .sdlc refused in isolation, no write through link.
test('popup refuses symlinked .sdlc', async (t) => {
  const root = makeDraftRoot(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'popup-outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const outsideSdlc = path.join(outside, 'sdlc');
  fs.mkdirSync(outsideSdlc, { recursive: true });
  try { fs.symlinkSync(outsideSdlc, path.join(root, '.sdlc')); } catch { /* ignore */ }
  register.resetTuiState();
  const made = makeTuiCtx({ root, select: PLAN, confirm: true });
  await register.setupTui(made.context);
  await approveCmd(made).run();
  assert.match(allText(made.calls), /symlink|realpath|escape|outside/i, 'symlinked .sdlc must be refused as symlink-specific');
  assert.equal(fs.existsSync(path.join(outsideSdlc, 'spec-gate.json')), false, 'no write through symlinked .sdlc');
});

// AC5: piped stdin refuses autofill on the CLI path.
test('piped stdin refuses draft autofill with no mutation', (t) => {
  const root = makeDraftRoot(t);
  const before = fs.readFileSync(path.join(root, PLAN), 'utf8');
  const exit = spec.main(['approve', PLAN, '--root', root], { stdinTTY: false, stdoutTTY: true });
  assert.equal(exit, 1, 'non-TTY approve must refuse');
  assert.match(fs.readFileSync(path.join(root, PLAN), 'utf8'), /^status:\s*draft\s*$/m, 'draft must stay draft without TTY');
  assert.equal(fs.readFileSync(path.join(root, PLAN), 'utf8'), before, 'plan bytes unchanged on pipe refusal');
  assert.equal(fs.existsSync(path.join(root, '.sdlc', 'spec-gate.json')), false, 'no marker on pipe refusal');
});

// AC3 restore-on-fail: plan bytes restored, marker unlinked only when self-written matching.
test('popup restore-on-fail restores plan and unlinks only self-written marker', async (t) => {
  const root = makeDraftRoot(t);
  const before = fs.readFileSync(path.join(root, PLAN), 'utf8');
  register.resetTuiState();
  const made = makeTuiCtx({ root, confirm: true });
  await register.setupTui(made.context);
  const origConfirm = made.context.dialog.confirm;
  made.context.dialog.confirm = async (input) => {
    fs.appendFileSync(path.join(root, PLAN), '\n# tampered after details\n');
    return origConfirm(input);
  };
  await approveCmd(made).run();
  assert.match(allText(made.calls), /mismatch|drift|changed|tamper|hash|refus|not-approved|approved/i, 'tamper/draft must be refused');
  assert.equal(fs.readFileSync(path.join(root, PLAN), 'utf8'), before, 'plan bytes must be restored after failure');
  assert.equal(fs.existsSync(path.join(root, '.sdlc', 'spec-gate.json')), false, 'self-written marker must be absent after failure');
  const src = fs.readFileSync(path.join(repoRoot, '.opencode', 'plugins', 'sdlc-lean-tui', 'register.js'), 'utf8');
  assert.ok(src.includes('original') || src.includes('restore'), 'register must restore original plan bytes on any throw');
});

// AC3 symmetric typed /approve autofills drafts via shared helpers.
test('typed approve symmetrically autofills a draft plan', async (t) => {
  const prevUser = process.env.USER;
  process.env.USER = 'attacker-env-spoof';
  t.after(() => { if (prevUser === undefined) delete process.env.USER; else process.env.USER = prevUser; });
  const plugin = await import(pluginURL);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'popup-typed-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'plans'), { recursive: true });
  fs.copyFileSync(cliSource, path.join(root, 'scripts', 'spec-check.mjs'));
  fs.writeFileSync(path.join(root, SPEC), '# Spec\n');
  fs.writeFileSync(path.join(root, PLAN), draftPlanText());
  const ctx = {
    registeredCommands: [], hooks: {}, toolHooks: {}, synthetic: [], prompts: [], sessionCommands: [],
    skill: { transform: async (cb) => { await cb({ add: (s) => {} }); } },
    session: { hook: async () => {}, get: async () => ({ id: 'sess-x' }), synthetic: async (e) => { ctx.synthetic.push(e); }, prompt: async () => {}, command: async () => {} },
    tool: { hook: async () => {} },
    location: { directory: root },
    command: { transform: (cb) => cb({ add: (c) => ctx.registeredCommands.push(c) }) },
  };
  await plugin.default.setup(ctx);
  const cmd = ctx.registeredCommands.find((c) => c.name === 'approve');
  assert.ok(cmd, 'approve command must be registered');
  await cmd.execute({ sessionID: 'sess-x', prompt: { text: PLAN } });
  const after = fs.readFileSync(path.join(root, PLAN), 'utf8');
  assert.match(after, /^status:\s*approved\s*$/m, 'typed approve must flip draft to approved');
  const marker = JSON.parse(fs.readFileSync(path.join(root, '.sdlc', 'spec-gate.json'), 'utf8'));
  assert.equal(marker.approved_via, 'tui-popup-autofill', 'typed autofill must carry the shared token');
  assert.equal(marker.approved_by, os.userInfo().username, 'typed user must come from os.userInfo()');
  assert.ok(marker.approved_by !== 'attacker-env-spoof', 'typed USER env must never be trusted');
});
