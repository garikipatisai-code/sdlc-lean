// Discovery precedence tests for scripts/research/protocol.mjs (node --test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const modURL = pathToFileURL(path.resolve(import.meta.dirname, '../../../scripts/research/protocol.mjs')).href;
const mod = await import(modURL);

const mkTmp = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

test('env SDLC_RESEARCH_PROTOCOL pointing at a real file returns it', async (t) => {
  const dir = mkTmp('sdlc-discover-env-');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const target = path.join(dir, 'custom-protocol.mjs');
  fs.writeFileSync(target, '// custom\n');
  const got = mod.resolveProtocolModule({ cwd: dir, env: { SDLC_RESEARCH_PROTOCOL: target } });
  assert.equal(got, target);
});

test('env SDLC_RESEARCH_PROTOCOL pointing at a missing file throws DiscoveryError', () => {
  const missing = path.join(os.tmpdir(), `sdlc-no-such-protocol-${Date.now()}.mjs`);
  assert.throws(
    () => mod.resolveProtocolModule({ cwd: os.tmpdir(), env: { SDLC_RESEARCH_PROTOCOL: missing } }),
    mod.DiscoveryError,
  );
});

test('project-local .opencode/scripts/research/protocol.mjs wins when env unset', async (t) => {
  const cwd = mkTmp('sdlc-discover-local-');
  const emptyHome = mkTmp('sdlc-discover-nohome-');
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  t.after(() => fs.rmSync(emptyHome, { recursive: true, force: true }));
  const local = path.join(cwd, '.opencode', 'scripts', 'research', 'protocol.mjs');
  fs.mkdirSync(path.dirname(local), { recursive: true });
  fs.writeFileSync(local, '// local fixture\n');
  const got = mod.resolveProtocolModule({
    cwd,
    env: { HOME: emptyHome, XDG_CONFIG_HOME: emptyHome },
  });
  assert.equal(got, local);
});

test('bare cwd + empty global config falls back to repo-bundled self path', async (t) => {
  const cwd = mkTmp('sdlc-discover-fallback-');
  const emptyHome = mkTmp('sdlc-discover-empty-');
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  t.after(() => fs.rmSync(emptyHome, { recursive: true, force: true }));
  const got = mod.resolveProtocolModule({
    cwd,
    env: { HOME: emptyHome, XDG_CONFIG_HOME: emptyHome },
  });
  assert.ok(typeof got === 'string' && got.length > 0, 'expected a fallback path');
  assert.ok(got.endsWith(path.join('scripts', 'research', 'protocol.mjs')), `expected bundled path, got ${got}`);
  assert.ok(fs.existsSync(got), 'fallback path must exist');
});
