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

test('blocks Colab teardown substitutes and /content deletion', () => {
  for (const cmd of [
    'pkill -f colab-mcp',
    'killall colab-mcp',
    'kill $(pgrep -f "uvx git+https://github.com/googlecolab/colab-mcp")',
    'sudo pkill -KILL colab-mcp',
    'npm test && pkill -f colab-mcp',
  ]) {
    assert.throws(() => plugin.checkSafety('bash', { command: cmd }), /bridge/);
  }
  for (const cmd of ['rm -rf /content', 'rm -rf /content/models', 'rm -fr "/content"', 'rm -rf /content/']) {
    assert.throws(() => plugin.checkSafety('bash', { command: cmd }), /artifact|unexported/);
  }
});

test('benign Colab commands pass (fail-open)', () => {
  for (const cmd of [
    'ls -la /content',
    'cat /content/notes.txt',
    'pgrep -f colab-mcp',
    'pkill -f colab-mcp-helper', // suffix, not the bridge process
    'pkill -0 -f colab-mcp', // signal 0 = liveness check, never kills
    'pkill -f node',
    'rm -rf /tmp/content',
    'rm -rf ./content',
    'rm -rf /tmp/colab-work',
    'colab usage',
    'uvx git+https://github.com/googlecolab/colab-mcp',
    'git commit -m "block pkill colab-mcp"', // prose, not a command position
    'echo "see pkill -f colab-mcp in docs"',
    'grep -rn "rm -rf /content" docs/',
  ]) {
    plugin.checkSafety('bash', { command: cmd });
  }
});

test('benign commands pass (fail-open)', async () => {
  const hooks = await plugin.SdlcLeanPlugin({});
  const run = (tool, args) => hooks['tool.execute.before']({ tool }, { args });
  await run('bash', { command: 'rm -rf .worktrees/stale-branch' });
  await run('bash', { command: 'git status && npm test' });
  await run('read', { filePath: 'src/index.ts' });
  await run('read', { filePath: 'envelope.py' }); // ".env" substring, not a .env file
});

test('T1 pins rm normalization (quoted roots, dot-segments, //, split flags, --)', () => {
  for (const cmd of [
    'rm -rf /*',
    'rm -rf //',
    'rm -rf /tmp/../../',
    'rm -rf "/"',
    'rm -rf "/*"',
    'rm -rf "/tmp/../../"',
    'rm -r -f /',
    'rm -R /',
    'rm -- /',
    'rm -rf -- /',
  ]) {
    assert.throws(() => plugin.checkSafety('bash', { command: cmd }), /destructive/, cmd);
  }
  // benign near-misses stay green
  for (const cmd of ['rm -rf /tmp/content', 'rm -rf ./content', 'rm --help']) {
    plugin.checkSafety('bash', { command: cmd });
  }
});

test('T1 pins --preserve-root stripping, ~ variants, and pipe/subshell trailing on roots', () => {
  for (const cmd of [
    'rm --no-preserve-root -rf /',
    'rm -rf --no-preserve-root /',
    'rm -rf --preserve-root /',
    'rm -rf ~',
    'rm -rf ~/foo',
    'rm -rf /|cat',
    'rm -rf ~|cat',
    '`rm -rf /`',
    '$(rm -rf /)',
    '(rm -rf /)',
    '`rm -rf ~`',
    '$(rm -rf ~)',
    '(rm -rf ~)',
  ]) {
    assert.throws(() => plugin.checkSafety('bash', { command: cmd }), /destructive/, cmd);
  }
  plugin.checkSafety('bash', { command: 'rm -rf /tmp/colab-work' });
});

test('T1 pins $HOME quoting (double-quoted expands to throw; single-quoted over-block throws)', () => {
  for (const cmd of [
    'rm -rf "$HOME"',
    'rm -rf "${HOME}"',
    'rm -rf "~"',
    'rm -rf "~/foo"',
    "rm -rf '$HOME'",
  ]) {
    assert.throws(() => plugin.checkSafety('bash', { command: cmd }), /destructive/, cmd);
  }
  plugin.checkSafety('bash', { command: 'echo $HOME' });
});

test('T1 pins env-prefix stripping and /bin paths for secret readers', () => {
  for (const cmd of [
    'FOO=1 cat .env',
    'FOO=1 grep -r x .env',
    'sudo cat .env',
    'env cat .env',
    'env VAR=x cat .env',
    'env FOO=1 BAR=2 cat .env',
    'VAR= cat .env',
    'A= cat .env',
    '/bin/cat .env',
    '/usr/bin/grep -r x .env',
    'sudo /bin/cat .env',
  ]) {
    assert.throws(() => plugin.checkSafety('bash', { command: cmd }), /sensitive/, cmd);
  }
  for (const cmd of ['FOO=1 echo hi', 'env echo hi', 'sudo echo hi', '/bin/cat .env.example', 'cat src/index.ts']) {
    plugin.checkSafety('bash', { command: cmd });
  }
});

test('T1 pins exfil verbs and dd if=/of=', () => {
  for (const cmd of [
    'egrep foo .env',
    'fgrep foo .env',
    'gawk foo .env',
    'mawk foo .env',
    'dd if=.env',
    'dd if=.env of=/tmp/o',
  ]) {
    assert.throws(() => plugin.checkSafety('bash', { command: cmd }), /sensitive/, cmd);
  }
  for (const cmd of ['dd if=/dev/zero of=/tmp/x', 'dd']) {
    plugin.checkSafety('bash', { command: cmd });
  }
});

test('T1 pins quote-mask, stderr 2> rule, and paren/dollar boundaries', () => {
  for (const cmd of ['cat ".env" > /tmp/x', '$(cat .env)', 'cat .env)']) {
    assert.throws(() => plugin.checkSafety('bash', { command: cmd }), /sensitive/, cmd);
  }
  for (const cmd of ['echo "a > b" .env', 'ls -l .env 2>/tmp/e']) {
    plugin.checkSafety('bash', { command: cmd });
  }
});

test('T1 pins sh -c unwrap (single level and nested depth)', () => {
  for (const cmd of ["sh -c 'rm -rf /'", 'sh -c \'sh -c "rm -rf /"\'']) {
    assert.throws(() => plugin.checkSafety('bash', { command: cmd }), /destructive/, cmd);
  }
  assert.throws(() => plugin.checkSafety('bash', { command: "sh -c 'grep x .env'" }), /sensitive/);
  for (const cmd of ["sh -c 'echo hi'", 'echo sh -c']) {
    plugin.checkSafety('bash', { command: cmd });
  }
});

test('T1 pins Colab bridge (launch prefixes, xargs, numeric pid, sudo -u, subshells)', () => {
  for (const cmd of [
    'exec pkill -f colab-mcp',
    'nohup pkill -f colab-mcp',
    'sudo env FOO=1 pkill -f colab-mcp',
    'timeout 5 pkill -f colab-mcp',
    'timeout -s KILL 5 pkill -f colab-mcp',
    'pgrep -f colab-mcp | xargs kill -9',
    'kill 1234 # colab-mcp',
    '/bin/pkill -f colab-mcp',
    'sudo -u root pkill -f colab-mcp',
    'sudo -u app-user pkill -f colab-mcp',
    '$(pkill -f colab-mcp)',
    'echo $(pkill -f colab-mcp)',
    'echo (pkill -f colab-mcp)',
    "sh -c 'pkill -f colab-mcp'",
  ]) {
    assert.throws(() => plugin.checkSafety('bash', { command: cmd }), /bridge/, cmd);
  }
  for (const cmd of [
    'exec echo hi',
    'timeout 5 pgrep colab',
    'sudo ls /content',
    'kill 1234',
    '(see colab-mcp docs)',
    '(pkill -9 1234)',
    'pkill -0 -f colab-mcp',
    'pkill -f colab-mcp-helper',
  ]) {
    plugin.checkSafety('bash', { command: cmd });
  }
});

test('T1 pins /content (flags-after-path, -R, find -delete, subshell/pipe trailing)', () => {
  for (const cmd of [
    'rm /content -rf',
    'rm /content -R',
    'rm /content -R -f',
    'rm -rf /content|cat',
    '`rm -rf /content`',
    '$(rm -rf /content)',
    '(rm -rf /content)',
    '/bin/rm -rf /content',
    'sudo -u root rm -rf /content',
    'find /content -name x -delete',
    "sh -c 'rm -rf /content'",
  ]) {
    assert.throws(() => plugin.checkSafety('bash', { command: cmd }), /artifact|unexported/, cmd);
  }
  for (const cmd of ['ls -la /content', 'rm /content -l', 'rm /content', 'sudo ls /content']) {
    plugin.checkSafety('bash', { command: cmd });
  }
});

test('T1 pins sensitive basename + i-flag (file tools, shell tokens, regen message)', () => {
  for (const f of ['config.env', '.ENV', 'Config.ENV', 'A/.Env.Local', 'my.env', 'secrets/my.env.bak']) {
    assert.throws(() => plugin.checkSafety('read', { filePath: f }), /sensitive/, f);
  }
  for (const f of ['.env.example', 'foo.env.example', 'envelope.py']) {
    plugin.checkSafety('read', { filePath: f });
  }
  for (const cmd of ['cat CONFIG.ENV', 'grep -r x config.env']) {
    assert.throws(() => plugin.checkSafety('bash', { command: cmd }), /sensitive/, cmd);
  }
  for (const cmd of ['grep -rn "process.env" src/', 'grep PROCESS.ENV src/', 'config.env']) {
    plugin.checkSafety('bash', { command: cmd });
  }
  // write/edit carry the regen message, not just a refusal
  assert.throws(() => plugin.checkSafety('write', { filePath: 'config.env' }), /regenerate/);
});

test('#nosafety no longer bypasses destructive, secret, or Colab guards', () => {
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
      assert.ok(!String(err.message).includes('#nosafety'), `message must not advertise the token: ${err.message}`);
    }
  }
  // The token is inert in an otherwise benign command.
  plugin.checkSafety('bash', { command: 'git status #nosafety' });
});

test('T2 pins merge refusal (direct plus chained plus sh-c) and safe abort-base-log pass', () => {
  assert.equal(typeof plugin.checkMergeGuard, 'function');
  for (const cmd of ['git merge main', 'git merge feature-x', 'sudo git merge main']) {
    assert.throws(() => plugin.checkMergeGuard(cmd), /ALWAYS-human/, cmd);
  }
  assert.throws(() => plugin.checkSafety('bash', { command: 'git status; git merge main' }), /ALWAYS-human/);
  assert.throws(() => plugin.checkSafety('bash', { command: "sh -c 'git merge main'" }), /ALWAYS-human/);
  for (const cmd of ['git merge --abort', 'git merge --quit']) {
    assert.equal(plugin.checkMergeGuard(cmd), true, cmd);
  }
  for (const cmd of ['git merge-base HEAD~1 HEAD', 'git log --merges --oneline']) {
    assert.equal(plugin.checkMergeGuard(cmd), true, cmd);
  }
});

test('T2 pins worktree pass-by-design plus quoted prose pass', () => {
  for (const cmd of ['git worktree add /tmp/w1 -b feat', 'git worktree list', 'git status']) {
    assert.equal(plugin.checkMergeGuard(cmd), true, cmd);
    plugin.checkSafety('bash', { command: cmd });
  }
  assert.equal(plugin.checkMergeGuard('echo "git merge main"'), true);
  plugin.checkSafety('bash', { command: 'echo "git merge main"' });
  plugin.checkSafety('read', { filePath: 'src/index.ts' });
});

test('T2 round-2 pins globals, abort scope, launch prefixes, inner shells', () => {
  for (const cmd of [
    'git -c user.name=x merge main',
    'git --git-dir=/tmp/x merge main',
    'git --no-pager merge main',
    'git -C /tmp merge main',
  ]) {
    assert.throws(() => plugin.checkMergeGuard(cmd), /ALWAYS-human/, cmd);
    assert.throws(() => plugin.checkSafety('bash', { command: cmd }), /ALWAYS-human/, cmd);
  }
  for (const cmd of ['git stash merge', 'git merge-base HEAD HEAD', 'git -C /tmp status']) {
    assert.equal(plugin.checkMergeGuard(cmd), true, cmd);
  }
  for (const cmd of [
    'git merge main && echo --abort',
    'git merge main || echo --abort',
    'git merge main | cat',
  ]) {
    assert.throws(() => plugin.checkMergeGuard(cmd), /ALWAYS-human/, cmd);
  }
  assert.equal(plugin.checkMergeGuard('git merge --abort'), true);
  assert.equal(plugin.checkMergeGuard('git merge --abort; echo done'), true);
  for (const cmd of [
    'exec git merge main',
    'nohup git merge main',
    'setsid git merge main',
    'timeout 10 git merge main',
    "sh -c 'exec git merge main'",
  ]) {
    assert.throws(() => plugin.checkSafety('bash', { command: cmd }), /ALWAYS-human/, cmd);
  }
  plugin.checkSafety('bash', { command: 'exec echo hi' });
  plugin.checkSafety('bash', { command: 'timeout 5 pgrep colab' });
  for (const cmd of [
    "zsh -c 'git merge main'",
    "fish -c 'git merge main'",
    "sh --noprofile -c 'git merge main'",
    "bash -x -c 'git merge main'",
  ]) {
    assert.throws(() => plugin.checkSafety('bash', { command: cmd }), /ALWAYS-human/, cmd);
  }
  plugin.checkSafety('bash', { command: "sh -c 'echo hi'" });
});

test('T5 pins quoted-flag rm normalization ("-rf" forms)', () => {
  for (const cmd of [
    'rm "-rf" /',
    "rm '-rf' /",
    'rm "-rf" "/"',
  ]) {
    assert.throws(() => plugin.checkSafety('bash', { command: cmd }), /destructive/, cmd);
  }
  for (const cmd of ['rm -rf /tmp/content', 'rm --help']) {
    plugin.checkSafety('bash', { command: cmd });
  }
});

test('T5 pins merge abort-decoy, attached -C, multi-token -c', () => {
  for (const cmd of [
    'git merge main `echo --abort`',
    'git merge main $(echo --abort)',
    'git -C/tmp merge main',
    'git -c core.pager="less -R" merge main',
  ]) {
    assert.throws(() => plugin.checkMergeGuard(cmd), /ALWAYS-human/, cmd);
    assert.throws(() => plugin.checkSafety('bash', { command: cmd }), /ALWAYS-human/, cmd);
  }
  for (const cmd of ['git merge --abort', 'git -C /tmp status']) {
    assert.equal(plugin.checkMergeGuard(cmd), true, cmd);
  }
});
