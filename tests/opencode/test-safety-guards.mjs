// Safety-guard tests: destructive commands blocked, sensitive files refused,
// everything else passes untouched (fail-open).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { pathToFileURL } from 'url';

const pluginURL = pathToFileURL(path.resolve(import.meta.dirname, '../../.opencode/plugins/sdlc-lean.js')).href;
const plugin = await import(pluginURL);

test('blocks rm -rf / and ~ variants', () => {
  for (const cmd of ['rm -rf /', 'rm -rf / --no-preserve-root', 'rm -fr ~']) {
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

test('blocks reading secrets through common shell readers', () => {
  for (const cmd of ['cat .env', 'head -n5 server.key', 'strings id_rsa', 'base64 cert.pem', 'xxd ~/.ssh/id_rsa']) {
    assert.throws(() => plugin.checkSafety('bash', { command: cmd }), /sensitive/);
  }
  // benign: templates, source files, searching source, and prose that merely mentions a reader
  plugin.checkSafety('bash', { command: 'cat src/index.ts' });
  plugin.checkSafety('bash', { command: 'cat .env.example' });
  plugin.checkSafety('bash', { command: 'grep -rn "process.env" src/' });
  plugin.checkSafety('bash', { command: 'ls -a' });
  plugin.checkSafety('bash', { command: 'git commit -m "remove cat .env"' });
  plugin.checkSafety('bash', { command: 'echo "see cat .env"' });
  plugin.checkSafety('bash', { command: 'echo hi; cat src/app.js' });
});

test('refuses sensitive files on patch and apply_patch', () => {
  for (const tool of ['patch', 'apply_patch']) {
    assert.throws(() => plugin.checkSafety(tool, { filePath: '.env' }), /sensitive/);
    const diff = '*** Begin Patch\n*** Update File: id_rsa\n+x\n*** End Patch';
    assert.throws(() => plugin.checkSafety(tool, { patchText: diff }), /sensitive/);
    assert.throws(() => plugin.checkSafety(tool, { patchText: '*** Move to: .env' }), /sensitive/);
  }
  // benign patches pass
  plugin.checkSafety('patch', { filePath: 'src/index.ts' });
  plugin.checkSafety('patch', { patchText: '*** Update File: src/index.ts\n+x' });
  plugin.checkSafety('patch', { patchText: '*** Move to: src/app.ts' });
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
