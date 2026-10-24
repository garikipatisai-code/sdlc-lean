// Global installer/updater tests (node --test, no harness needed).
// Exercises scripts/install-global.mjs against temp targets and fake repos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

const scriptURL = pathToFileURL(path.resolve(import.meta.dirname, '../../scripts/install-global.mjs')).href;
const mod = await import(scriptURL);
const protocolURL = pathToFileURL(path.resolve(import.meta.dirname, '../../scripts/research/protocol.mjs')).href;
const { resolveProtocolModule } = await import(protocolURL);

const mkTmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
const fakeRepo = (root, { skills = ['alpha'], agents = ['a.md'] } = {}) => {
  fs.mkdirSync(path.join(root, '.opencode', 'plugins'), { recursive: true });
  fs.mkdirSync(path.join(root, '.opencode', 'commands'), { recursive: true });
  for (const s of skills) {
    fs.mkdirSync(path.join(root, '.opencode', 'skills', s), { recursive: true });
    fs.writeFileSync(path.join(root, '.opencode', 'skills', s, 'SKILL.md'), `# ${s}`);
  }
  for (const a of agents) {
    fs.mkdirSync(path.join(root, '.opencode', 'agents'), { recursive: true });
    fs.writeFileSync(path.join(root, '.opencode', 'agents', a), `# ${a}`);
  }
  fs.writeFileSync(path.join(root, '.opencode', 'commands', 'feature.md'), '# feature');
  fs.writeFileSync(path.join(root, '.opencode', 'plugins', 'sdlc-lean.js'), '// plugin');
  return root;
};

test('installGlobal copies skills/agents/commands/plugin and writes a manifest', () => {
  const target = mkTmp('sdlc-install-');
  const repo = fakeRepo(mkTmp('sdlc-repo-'));
  const summary = mod.installGlobal({ repo, target });
  assert.equal(summary.skills, 1);
  assert.equal(summary.agents, 1);
  assert.equal(summary.commands, 1);
  assert.equal(summary.plugin, 1);
  assert.ok(fs.existsSync(path.join(target, 'skills', 'alpha', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(target, 'agents', 'a.md')));
  assert.ok(fs.existsSync(path.join(target, 'commands', 'feature.md')));
  assert.ok(fs.existsSync(path.join(target, 'plugins', 'sdlc-lean.js')));
  const manifest = JSON.parse(fs.readFileSync(path.join(target, mod.MANIFEST), 'utf8'));
  assert.ok(Array.isArray(manifest.files) && manifest.files.length >= 4);
});

test('re-running is idempotent', () => {
  const target = mkTmp('sdlc-idem-');
  const repo = fakeRepo(mkTmp('sdlc-repo-'));
  mod.installGlobal({ repo, target });
  const before = fs.readdirSync(path.join(target, 'skills'));
  mod.installGlobal({ repo, target });
  assert.deepEqual(fs.readdirSync(path.join(target, 'skills')), before);
});

test('prune removes previously-installed files gone from the repo (and empty dirs)', () => {
  const target = mkTmp('sdlc-prune-');
  const repo = fakeRepo(mkTmp('sdlc-repo-'), { skills: ['alpha', 'beta'] });
  mod.installGlobal({ repo, target });
  assert.ok(fs.existsSync(path.join(target, 'skills', 'beta', 'SKILL.md')));
  fs.rmSync(path.join(repo, '.opencode', 'skills', 'beta'), { recursive: true });
  const summary = mod.installGlobal({ repo, target });
  assert.ok(!fs.existsSync(path.join(target, 'skills', 'beta')), 'stale skill dir must be pruned');
  assert.ok(fs.existsSync(path.join(target, 'skills', 'alpha', 'SKILL.md')), 'current skill must stay');
  assert.ok(summary.pruned >= 1);
});

test('never touches user files the installer did not place', () => {
  const target = mkTmp('sdlc-user-');
  const repo = fakeRepo(mkTmp('sdlc-repo-'));
  mod.installGlobal({ repo, target });
  const userFile = path.join(target, 'skills', 'my-own-skill', 'SKILL.md');
  fs.mkdirSync(path.dirname(userFile), { recursive: true });
  fs.writeFileSync(userFile, '# mine');
  mod.installGlobal({ repo, target });
  assert.ok(fs.existsSync(userFile), 'user-authored skill must survive an update');
});

test('a corrupt manifest cannot prune outside the target', () => {
  const target = mkTmp('sdlc-escape-');
  const repo = fakeRepo(mkTmp('sdlc-repo-'));
  mod.installGlobal({ repo, target });
  const outside = path.join(target, '..', `escape-${path.basename(target)}.txt`);
  fs.writeFileSync(outside, 'must survive');
  fs.writeFileSync(path.join(target, mod.MANIFEST), JSON.stringify({
    files: ['../' + path.basename(outside)],
  }));
  mod.installGlobal({ repo, target });
  assert.ok(fs.existsSync(outside), 'path traversal in manifest must be ignored');
  fs.rmSync(outside, { force: true });
});

test('defaultTarget honors XDG_CONFIG_HOME', () => {
  const prev = process.env.XDG_CONFIG_HOME;
  process.env.XDG_CONFIG_HOME = '/custom/conf';
  assert.equal(mod.defaultTarget(), path.join('/custom/conf', 'opencode'));
  if (prev === undefined) delete process.env.XDG_CONFIG_HOME;
  else process.env.XDG_CONFIG_HOME = prev;
});

test('installs scripts/research byte-identical and tracks it in the manifest', () => {
  const target = mkTmp('sdlc-research-');
  const summary = mod.installGlobal({ repo: mod.repoRoot, target });
  assert.equal(summary.research, 3);
  for (const f of ['protocol.mjs', 'cluster.mjs', 'phase.mjs']) {
    const installed = fs.readFileSync(path.join(target, 'scripts', 'research', f));
    const repoCopy = fs.readFileSync(path.join(mod.repoRoot, 'scripts', 'research', f));
    assert.ok(installed.equals(repoCopy), `${f} must be byte-identical`);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(target, mod.MANIFEST), 'utf8'));
  for (const f of ['protocol.mjs', 'cluster.mjs', 'phase.mjs']) {
    assert.ok(manifest.files.includes(path.join('scripts', 'research', f)));
  }
});

test('installs scripts/spec-check.mjs byte-identical and tracks it in the manifest', () => {
  const target = mkTmp('sdlc-spec-check-');
  const summary = mod.installGlobal({ target });
  assert.equal(summary.specCheck, 1);
  const installed = fs.readFileSync(path.join(target, 'scripts', 'spec-check.mjs'));
  const repoCopy = fs.readFileSync(path.join(mod.repoRoot, 'scripts', 'spec-check.mjs'));
  assert.ok(installed.equals(repoCopy), 'spec-check.mjs must be byte-identical');
  const manifest = JSON.parse(fs.readFileSync(path.join(target, mod.MANIFEST), 'utf8'));
  assert.ok(manifest.files.includes(path.join('scripts', 'spec-check.mjs')));
});

test('prune removes stale research files but preserves user files', () => {
  const target = mkTmp('sdlc-research-prune-');
  const repo = fakeRepo(mkTmp('sdlc-repo-'));
  const researchDir = path.join(repo, 'scripts', 'research');
  fs.mkdirSync(researchDir, { recursive: true });
  fs.writeFileSync(path.join(researchDir, 'protocol.mjs'), '// protocol');
  fs.writeFileSync(path.join(researchDir, 'cluster.mjs'), '// cluster');
  mod.installGlobal({ repo, target });
  assert.ok(fs.existsSync(path.join(target, 'scripts', 'research', 'protocol.mjs')));
  const userFile = path.join(target, 'notes', 'mine.md');
  fs.mkdirSync(path.dirname(userFile), { recursive: true });
  fs.writeFileSync(userFile, '# mine');
  fs.rmSync(researchDir, { recursive: true });
  const summary = mod.installGlobal({ repo, target });
  assert.ok(!fs.existsSync(path.join(target, 'scripts', 'research', 'protocol.mjs')), 'stale research file must be pruned');
  assert.ok(!fs.existsSync(path.join(target, 'scripts', 'research', 'cluster.mjs')), 'stale research file must be pruned');
  assert.ok(fs.existsSync(userFile), 'unrelated user file must survive prune');
  assert.ok(summary.pruned >= 2);
});

test('global tier discovery resolves the installed research protocol', () => {
  const home = mkTmp('sdlc-research-home-');
  const target = path.join(home, 'opencode');
  mod.installGlobal({ repo: mod.repoRoot, target });
  const bare = mkTmp('sdlc-research-cwd-');
  const resolved = resolveProtocolModule({ cwd: bare, env: { XDG_CONFIG_HOME: home, HOME: home } });
  assert.equal(resolved, path.join(target, 'scripts', 'research', 'protocol.mjs'));
});

test('global tier discovery resolves the installed phase ledger', async () => {
  const home = mkTmp('sdlc-phase-home-');
  const target = path.join(home, 'opencode');
  mod.installGlobal({ repo: mod.repoRoot, target });
  const bare = mkTmp('sdlc-phase-cwd-');
  const { resolvePhaseModule } = await import(protocolURL);
  const resolved = resolvePhaseModule({ cwd: bare, env: { XDG_CONFIG_HOME: home, HOME: home } });
  assert.equal(resolved, path.join(target, 'scripts', 'research', 'phase.mjs'));
  assert.ok(fs.existsSync(resolved), 'the resolved phase module must exist');
});
