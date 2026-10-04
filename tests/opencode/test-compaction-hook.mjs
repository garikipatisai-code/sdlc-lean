// Compaction-memory hook tests (node --test, no harness needed).
// Verifies the experimental.session.compacting hook injects durable SDLC state
// into compaction summaries and fails open when files are missing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

// Isolate the activation status file before importing the plugin.
process.env.XDG_STATE_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-lean-state-'));

const pluginURL = pathToFileURL(path.resolve(import.meta.dirname, '../../.opencode/plugins/sdlc-lean.js')).href;
const plugin = await import(pluginURL);

test('compactionContext injects debt ledger + newest plan progress from repo root', () => {
  const parts = plugin.compactionContext();
  assert.ok(Array.isArray(parts));
  assert.ok(parts.length >= 1, 'expected at least the debt ledger');
  assert.ok(parts.some((p) => p.includes('Debt ledger')), 'debt ledger content must be injected');
  assert.ok(parts.some((p) => p.includes('-progress.md')), 'newest progress file must be injected');
});

test('compactionContext with a given root reads that root', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-lean-ctx-'));
  fs.mkdirSync(path.join(tmp, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'docs', 'debt-ledger.md'), '# Debt ledger\n\n| id | finding |\n|---|---|\n');
  const parts = plugin.compactionContext(tmp);
  assert.ok(parts.some((p) => p.includes('# Debt ledger')));
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('compactionContext fails open (empty) when nothing exists', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-lean-empty-'));
  const parts = plugin.compactionContext(tmp);
  assert.deepEqual(parts, []);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('compactionContext never follows symlinks', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-lean-link-'));
  fs.mkdirSync(path.join(tmp, 'docs'), { recursive: true });
  const secret = path.join(tmp, 'secret.txt');
  fs.writeFileSync(secret, 'TOP-SECRET-KEY');
  fs.symlinkSync(secret, path.join(tmp, 'docs', 'debt-ledger.md'));
  const parts = plugin.compactionContext(tmp);
  assert.ok(!parts.some((p) => p.includes('TOP-SECRET-KEY')), 'symlinked content must never be injected');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('compactionContext caps injected content', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-lean-cap-'));
  fs.mkdirSync(path.join(tmp, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'docs', 'debt-ledger.md'), 'x'.repeat(10000));
  const parts = plugin.compactionContext(tmp);
  const body = parts.find((p) => p.includes('Debt ledger')) || '';
  assert.ok(body.length < 10000 && body.includes('x'.repeat(100)));
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('V1 compaction hook uses the host-provided project directory', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-lean-proj-'));
  fs.mkdirSync(path.join(tmp, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'docs', 'debt-ledger.md'), '# Project ledger');
  const hooks = await plugin.SdlcLeanPlugin({ directory: tmp });
  const output = {};
  await hooks['experimental.session.compacting']({}, output);
  assert.ok(output.context.some((p) => p.includes('# Project ledger')), 'must read the project root, not the plugin repo');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('V1 plugin exposes the compaction hook and it mutates output.context', async () => {
  const hooks = await plugin.SdlcLeanPlugin({});
  assert.equal(typeof hooks['experimental.session.compacting'], 'function');
  const output = {};
  await hooks['experimental.session.compacting']({}, output);
  assert.ok(Array.isArray(output.context) && output.context.length >= 1);
});

test('V1 compaction hook fails open when output is hostile', async () => {
  const hooks = await plugin.SdlcLeanPlugin({});
  const frozen = Object.freeze({});
  await hooks['experimental.session.compacting']({}, frozen); // must not throw
});

test('V2 setup registers the compaction session hook (v2.0.22 name) and appends system parts', async () => {
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
  assert.equal(typeof captured['compaction'], 'function', 'V2 must register the "compaction" session hook');
  assert.equal(captured['experimental.session.compacting'], undefined, 'V1 hook name must not be used in V2');
  const event = { system: [] };
  await captured['compaction'](event);
  assert.ok(event.system.length >= 1, 'compaction context must land in event.system');
  assert.ok(event.system.every((p) => p.type === 'text' && typeof p.text === 'string'));
  // Defensive alternate shape + fail-open on a hostile event.
  const alt = { context: [] };
  await captured['compaction'](alt);
  assert.ok(alt.context.length >= 1, 'event.context fallback must work');
  await captured['compaction'](undefined); // must not throw
});
