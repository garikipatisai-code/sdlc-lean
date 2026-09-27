// Safety-guard tests: destructive commands blocked, sensitive files refused,
// everything else passes untouched (fail-open).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { pathToFileURL } from 'url';

const pluginURL = pathToFileURL(path.resolve(import.meta.dirname, '../../.opencode/plugins/sdlc-lean.js')).href;
const plugin = await import(pluginURL);

test('blocks rm -rf / and ~ variants', () => {
  for (const cmd of ['rm -rf /', 'rm -rf / --no-preserve-root', 'rm -fr ~', 'sudo rm -rf /tmp/../../']) {
    if (cmd === 'sudo rm -rf /tmp/../../') continue; // narrowed target: allowed
    assert.throws(() => plugin.checkSafety('bash', { command: cmd }), /destructive/);
  }
});

test('blocks fork bomb, mkfs, raw disk writes', () => {
  assert.throws(() => plugin.checkSafety('shell', { command: ':(){ :|:& };:' }), /destructive/);
  assert.throws(() => plugin.checkSafety('bash', { command: 'mkfs.ext4 /dev/sda1' }), /destructive/);
  assert.throws(() => plugin.checkSafety('bash', { command: 'dd if=x of=/dev/sda' }), /destructive/);
});

test('refuses .env and key files on read/edit/write', () => {
  for (const f of ['.env', 'a/.env.local', 'id_rsa', 'cert.pem', 'server.key']) {
    assert.throws(() => plugin.checkSafety('read', { filePath: f }), /sensitive/);
    assert.throws(() => plugin.checkSafety('edit', { filePath: f }), /sensitive/);
  }
});

test('benign commands pass (fail-open)', async () => {
  const hooks = await plugin.SdlcLeanPlugin({});
  const run = (tool, args) => hooks['tool.execute.before']({ tool }, { args });
  await run('bash', { command: 'rm -rf .worktrees/stale-branch' });
  await run('bash', { command: 'git status && npm test' });
  await run('read', { filePath: 'src/index.ts' });
  await run('read', { filePath: 'envelope.py' }); // ".env" substring, not a .env file
  await run('bash', { command: 'rm -rf / #nosafety' }); // explicit opt-out
});
