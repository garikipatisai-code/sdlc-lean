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
