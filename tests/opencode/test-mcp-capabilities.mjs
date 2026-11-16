// Task 1 — generic MCP capability registry (fail-open silent-skip).
// RED: absent->false/null, present->same object, throwing detector->skip.
// Task 4 — regression + V1+V2 parity (isolation via afterEach, ~/ normalize).
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import * as plugin from '../../.opencode/plugins/sdlc-lean.js';
import { detectMcpCapability, normalizeMcpPath, DEFAULT_MCP_PATH } from '../../scripts/mcp-capabilities.mjs';

afterEach(() => { plugin.clearCapabilities(); });

test('absent capability is false/null and never throws', () => {
  assert.equal(plugin.hasCapability('mcp:missing'), false);
  assert.equal(plugin.getCapability('mcp:missing'), null);
});

test('present capability returns the same object', () => {
  const adapter = { name: 'mcp:demo' };
  plugin.registerCapability('mcp:demo', adapter);
  assert.equal(plugin.hasCapability('mcp:demo'), true);
  assert.equal(plugin.getCapability('mcp:demo'), adapter);
});

test('throwing detector is skipped fail-open (false/null, no throw)', () => {
  const adapter = { name: 'mcp:flaky', detect: () => { throw new Error('probe down'); } };
  plugin.registerCapability('mcp:flaky', adapter);
  assert.equal(plugin.hasCapability('mcp:flaky'), false);
  assert.equal(plugin.getCapability('mcp:flaky'), null);
});

test('invalid register/miss never throws and silent-skips', () => {
  assert.doesNotThrow(() => plugin.registerCapability('', null));
  assert.doesNotThrow(() => plugin.registerCapability(null, {}));
  assert.equal(plugin.hasCapability(''), false);
  assert.equal(plugin.getCapability(null), null);
  assert.doesNotThrow(() => plugin.clearCapabilities());
});

test('clearCapabilities empties the registry', () => {
  const adapter = { name: 'mcp:tmp' };
  plugin.registerCapability('mcp:tmp', adapter);
  assert.equal(plugin.hasCapability('mcp:tmp'), true);
  plugin.clearCapabilities();
  assert.equal(plugin.hasCapability('mcp:tmp'), false);
  assert.equal(plugin.getCapability('mcp:tmp'), null);
});

// Task 2 — thin detector helper (fail-open, no spawn, fs stat only).
test('Task2: missing binary → {available:false}, never throws', () => {
  const missing = '/nonexistent/__sdlc-lean-nope__/notebooklm-mcp-test-missing';
  assert.doesNotThrow(() => detectMcpCapability(missing));
  assert.equal(detectMcpCapability(missing).available, false);
  assert.doesNotThrow(() => detectMcpCapability(DEFAULT_MCP_PATH));
  const res = detectMcpCapability(DEFAULT_MCP_PATH);
  assert.equal(typeof res.available, 'boolean');
  if (!res.available) assert.equal(res.available, false);
  else assert.equal(typeof res.adapter.bin, 'string');
});

test('Task2: invalid/empty path never throws and is unavailable', () => {
  for (const bad of [null, '', '   ']) {
    assert.doesNotThrow(() => detectMcpCapability(bad));
    assert.equal(detectMcpCapability(bad).available, false);
  }
  assert.doesNotThrow(() => detectMcpCapability(undefined));
  assert.equal(typeof detectMcpCapability(undefined).available, 'boolean');
  assert.doesNotThrow(() => normalizeMcpPath(''));
  assert.equal(normalizeMcpPath(''), '');
});

// Task 4 — regression + V1+V2 parity (fail-open preserved).
test('Task4: V1 SdlcLeanPlugin + V2 default exports exist', () => {
  assert.equal(typeof plugin.SdlcLeanPlugin, 'function');
  assert.equal(plugin.default.id, 'sdlc-lean');
  assert.equal(typeof plugin.default.setup, 'function');
  assert.equal(plugin.default.server, plugin.SdlcLeanPlugin);
});

test('Task4: registry isolated between tests (afterEach clear)', () => {
  assert.equal(plugin.hasCapability('mcp:tmp'), false);
  assert.equal(plugin.getCapability('mcp:tmp'), null);
});

test('Task4: normalize ~/ expands to homedir', () => {
  assert.equal(normalizeMcpPath('~/notebooklm-mcp-test'), path.join(os.homedir(), 'notebooklm-mcp-test'));
  assert.equal(normalizeMcpPath('~'), os.homedir());
});

// Task 1 (follow-up) — startup auto-detect registration fail-open.
test('Task1 auto-detect: absent binary → empty registry, no throw', () => {
  const missing = '/nonexistent/__sdlc-lean-nope__/notebooklm-mcp-test-missing';
  assert.doesNotThrow(() => plugin.autoDetectCapabilities(missing));
  assert.equal(plugin.hasCapability('mcp:notebooklm'), false);
  assert.equal(plugin.getCapability('mcp:notebooklm'), null);
});

test('Task1 auto-detect: present binary → registered, no throw', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-lean-mcp-'));
  const bin = path.join(dir, 'notebooklm-mcp');
  fs.writeFileSync(bin, '#!/bin/sh\nexit 0\n');
  try {
    assert.doesNotThrow(() => plugin.autoDetectCapabilities(bin));
    assert.equal(plugin.hasCapability('mcp:notebooklm'), true);
    const adapter = plugin.getCapability('mcp:notebooklm');
    assert.ok(adapter && typeof adapter === 'object');
    assert.equal(adapter.bin, bin);
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  }
});

test('DEFAULT_MCP_PATH resolves under homedir .local/bin', () => {
  assert.equal(DEFAULT_MCP_PATH, path.join(os.homedir(), '.local', 'bin', 'notebooklm-mcp'));
});

test('normalizeMcpPath empty string returns empty string', () => {
  assert.equal(normalizeMcpPath(''), '');
});
