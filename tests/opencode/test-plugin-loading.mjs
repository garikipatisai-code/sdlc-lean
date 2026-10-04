// Plugin load/injection tests (node --test, no harness needed).
// Mocks the V1 client + message envelope; exercises the real plugin module.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

// Isolate the activation status file before importing the plugin (the module
// computes the status path from XDG_STATE_HOME at load time).
process.env.XDG_STATE_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-lean-state-'));

const pluginURL = pathToFileURL(path.resolve(import.meta.dirname, '../../.opencode/plugins/sdlc-lean.js')).href;
const plugin = await import(pluginURL);

const userMsg = (text, sessionID = 'sess-top') => ({
  info: { role: 'user', sessionID },
  parts: [{ type: 'text', text }],
});

test('named export loads and registers skills path', async () => {
  const hooks = await plugin.SdlcLeanPlugin({});
  const config = {};
  await hooks.config(config);
  assert.ok(Array.isArray(config.skills.paths) && config.skills.paths.length === 1);
  assert.ok(config.skills.paths[0].endsWith(path.join('.opencode', 'skills')));
});

test('bootstrap injected once into first user message', async () => {
  const hooks = await plugin.SdlcLeanPlugin({});
  const output = { messages: [userMsg('build a parser')] };
  await hooks['experimental.chat.messages.transform']({}, output);
  assert.equal(output.messages[0].parts.length, 2);
  assert.ok(output.messages[0].parts[0].text.includes('EXTREMELY_IMPORTANT'));
  assert.ok(output.messages[0].parts[0].text.includes('Auto-Routing'));
  // second pass: no double injection
  await hooks['experimental.chat.messages.transform']({}, output);
  assert.equal(output.messages[0].parts.length, 2);
});

test('child session skips bootstrap, keeps skills registered', async () => {
  const client = { session: { get: async () => ({ data: { id: 'sess-child', parentID: 'sess-top' } }) } };
  const hooks = await plugin.SdlcLeanPlugin({ client });
  const output = { messages: [userMsg('implement task 3', 'sess-child')] };
  await hooks['experimental.chat.messages.transform']({}, output);
  assert.equal(output.messages[0].parts.length, 1);
  const skills = plugin.listSkills();
  assert.ok(skills.length >= 4, `expected >=4 skills, got ${skills.length}`);
});

test('lookup failure fails open (injects)', async () => {
  const client = { session: { get: async () => { throw new Error('down'); } } };
  const hooks = await plugin.SdlcLeanPlugin({ client });
  const output = { messages: [userMsg('hi', 'sess-flaky')] };
  await hooks['experimental.chat.messages.transform']({}, output);
  assert.equal(output.messages[0].parts.length, 2);
});

test('bootstrap content stable and cached', () => {
  const a = plugin.getBootstrapContent();
  const b = plugin.getBootstrapContent();
  assert.equal(a, b);
  assert.ok(a.includes('Auto-Routing'));
});

test('bootstrap stays within the 5KB budget', () => {
  const bytes = Buffer.byteLength(plugin.getBootstrapContent());
  assert.ok(bytes < 5120, `bootstrap is ${bytes} bytes; trim the router skill`);
});

test('bootstrap carries the 30s communication contract', () => {
  assert.ok(plugin.getBootstrapContent().includes('communicating-concisely'));
  const skill = plugin.listSkills().find((s) => s.id === 'communicating-concisely');
  assert.ok(skill, 'communicating-concisely skill must ship');
  assert.ok(skill.description.includes('30-second') || skill.description.includes('30s'));
});

test('router points at the reuse-before-rebuild capability', () => {
  assert.ok(plugin.getBootstrapContent().includes('acquiring-capabilities'));
  const skill = plugin.listSkills().find((s) => s.id === 'acquiring-capabilities');
  assert.ok(skill, 'acquiring-capabilities skill must ship');
  assert.ok(skill.content.includes('Trust tiers') || skill.content.includes('Trusted'));
  const ref = path.resolve(import.meta.dirname, '../../.opencode/skills/acquiring-capabilities/references/trusted-sources.md');
  assert.ok(fs.existsSync(ref), 'trusted-sources reference must ship');
});

test('router points at deep-research; skill, references, and researcher agent ship', () => {
  assert.ok(plugin.getBootstrapContent().includes('deep-research'));
  const skill = plugin.listSkills().find((s) => s.id === 'deep-research');
  assert.ok(skill, 'deep-research skill must ship');
  assert.ok(skill.content.includes('Citation discipline'));
  const base = path.resolve(import.meta.dirname, '../../.opencode/skills/deep-research');
  for (const f of ['references/source-quality.md', 'references/report-format.md']) {
    assert.ok(fs.existsSync(path.join(base, f)), `${f} must ship`);
  }
  assert.ok(fs.existsSync(path.resolve(import.meta.dirname, '../../.opencode/agents/researcher.md')), 'researcher agent must ship');
});

test('fan-out / fan-in contract ships and is routed', () => {
  assert.ok(plugin.getBootstrapContent().includes('dispatching-parallel-agents'));
  const skill = plugin.listSkills().find((s) => s.id === 'dispatching-parallel-agents');
  assert.ok(skill, 'dispatching-parallel-agents must ship');
  for (const term of ['Fan-out', 'Fan-in', 'Dedupe', 'Partial failure']) {
    assert.ok(skill.content.includes(term), `fan-in contract missing: ${term}`);
  }
});

test('debt ledger reference ships and is routed', () => {
  assert.ok(plugin.getBootstrapContent().includes('debt ledger'), 'router must mention the debt ledger');
  const ref = path.resolve(import.meta.dirname, '../../.opencode/skills/lean-review/references/debt-ledger.md');
  assert.ok(fs.existsSync(ref), 'debt-ledger reference must ship');
  const skill = plugin.listSkills().find((s) => s.id === 'lean-review');
  assert.ok(skill.content.includes('debt-ledger'), 'lean-review must link the ledger format');
});

test('STE-lite skill ships, is routed, and claims no compliance', () => {
  assert.ok(plugin.getBootstrapContent().includes('STE-lite'), 'router must signal STE-lite');
  const skill = plugin.listSkills().find((s) => s.id === 'simplified-technical-english');
  assert.ok(skill, 'simplified-technical-english skill must ship');
  assert.ok(skill.content.includes('STE-informed'), 'must be labelled STE-informed');
  assert.match(skill.content, /preserve[^\n]*conditions/i, 'must require preserving conditions/modality');
  assert.match(skill.content, /not[^.\n]*reproduced/i, 'must state the dictionary is not reproduced');
  const comms = plugin.listSkills().find((s) => s.id === 'communicating-concisely');
  assert.ok(comms.content.includes('simplified-technical-english'), 'comms must route to STE');
});

test('lifecycle skills ship, are description-triggered, and add no bootstrap bytes', () => {
  const ids = ['incident-postmortem', 'dependency-upgrade', 'threat-model', 'adr'];
  const skills = plugin.listSkills();
  for (const id of ids) {
    const s = skills.find((x) => x.id === id);
    assert.ok(s, `${id} skill must ship`);
    assert.match(s.description, /^Use when/i, `${id} description must be a trigger`);
  }
  assert.ok(
    Buffer.byteLength(plugin.getBootstrapContent()) <= 5116,
    'router bootstrap must not grow for lifecycle skills',
  );
});

test('autonomy skills + orchestrator agent ship and are routed within budget', () => {
  const boot = plugin.getBootstrapContent();
  for (const term of ['orchestrator', 'autonomous-loop', 'option-selection']) {
    assert.ok(boot.includes(term), `router must name ${term}`);
  }
  const skills = plugin.listSkills();
  for (const id of ['autonomous-loop', 'option-selection']) {
    const s = skills.find((x) => x.id === id);
    assert.ok(s, `${id} skill must ship`);
    assert.match(s.description, /^Use when/i, `${id} description must be a trigger`);
  }
  const loop = skills.find((x) => x.id === 'autonomous-loop');
  for (const term of ['Stop rules', 'give up honestly', 'acceptance criteria']) {
    assert.ok(loop.content.includes(term), `autonomous-loop missing: ${term}`);
  }
  const select = skills.find((x) => x.id === 'option-selection');
  for (const term of ['Matrix', 'Y-statement', 'record the decision']) {
    assert.ok(select.content.includes(term), `option-selection missing: ${term}`);
  }
  assert.ok(
    fs.existsSync(path.resolve(import.meta.dirname, '../../.opencode/agents/orchestrator.md')),
    'orchestrator agent must ship',
  );
  const v = skills.find((x) => x.id === 'verification-before-completion');
  assert.ok(v.content.includes('verify-recipe'), 'verify recipe must be linked');
  const dr = skills.find((x) => x.id === 'deep-research');
  assert.ok(dr.content.includes('option-selection'), 'deep-research must hand off to option-selection');
  const ac = skills.find((x) => x.id === 'acquiring-capabilities');
  assert.ok(ac.content.includes('option-selection'), 'acquiring-capabilities must hand off to option-selection');
  assert.ok(
    Buffer.byteLength(boot) <= 5116,
    'router bootstrap must not grow for autonomy skills',
  );
});

test('activation: writes status, toasts once per session', async () => {
  let toasts = 0;
  const client = { tui: { showToast: async () => { toasts++; } }, app: { log: async () => {} } };
  await plugin.announceActivation(client, 'sess-a');
  await plugin.announceActivation(client, 'sess-a'); // deduped
  assert.equal(toasts, 1);
  const status = plugin.getStatus();
  assert.equal(status.sessionID, 'sess-a');
  assert.equal(status.active, true);
  assert.equal(status.skills, plugin.listSkills().length);
});

test('activation: fail-open when client/tui missing or throwing', async () => {
  await plugin.announceActivation(undefined, 'sess-none');
  const boom = { tui: { showToast: async () => { throw new Error('no tui'); } }, app: { log: async () => { throw new Error('no log'); } } };
  await plugin.announceActivation(boom, 'sess-boom'); // must not throw
  assert.ok(plugin.getStatus().sessionID);
});

test('activation: toast suppressed by SDLC_LEAN_NO_TOAST', async () => {
  process.env.SDLC_LEAN_NO_TOAST = '1';
  let toasts = 0;
  await plugin.announceActivation({ tui: { showToast: async () => { toasts++; } } }, 'sess-quiet');
  delete process.env.SDLC_LEAN_NO_TOAST;
  assert.equal(toasts, 0);
});

test('V2 setup registers skills, context injection, and the safety tool hook', async () => {
  const captured = {};
  const ctx = {
    skill: { transform: async (cb) => cb({ add: () => {} }) },
    session: {
      hook: async (name, cb) => { captured[name] = cb; },
      get: async () => ({ id: 'sess-v2' }),
    },
    tool: { hook: async (name, cb) => { captured['tool:' + name] = cb; } },
  };
  await plugin.default.setup(ctx);
  assert.equal(typeof captured['tool:execute.before'], 'function', 'V2 tool hook must register');

  // V2 context injection into first user message
  const event = { sessionID: 'sess-v2', messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }] };
  await captured.context(event);
  assert.ok(event.messages[0].content[0].text.includes('EXTREMELY_IMPORTANT'), 'bootstrap injected (V2)');

  // V2 safety guard blocks destructive input and passes benign input
  assert.throws(() => captured['tool:execute.before']({ tool: 'bash', input: { command: 'rm -rf /' } }), /destructive/);
  assert.throws(() => captured['tool:execute.before']({ tool: 'read', input: { filePath: '.env' } }), /sensitive/);
  captured['tool:execute.before']({ tool: 'bash', input: { command: 'git status' } }); // must not throw
});
