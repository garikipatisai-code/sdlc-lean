// Probe-set schema tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PROBES } from '../../eval/probes.mjs';
import { CALIBRATION } from '../../eval/coverage.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GROUPS = [
  'activation',
  'safety',
  'routing',
  'brain',
  'trust',
  'execution',
  'command',
  'agent',
  'router',
];

test('probes have a valid schema and unique ids', () => {
  assert.ok(Array.isArray(PROBES) && PROBES.length >= 6, 'expected a seed set');
  const ids = new Set();
  for (const p of PROBES) {
    assert.equal(typeof p.id, 'string');
    assert.ok(p.id.length > 0);
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`);
    ids.add(p.id);
    assert.ok(GROUPS.includes(p.group), `bad group ${p.group}`);
    assert.equal(typeof p.prompt, 'string');
    assert.ok(p.prompt.length > 0);
    assert.ok(Array.isArray(p.expect) && p.expect.length > 0, `${p.id} needs expectations`);
    for (const e of p.expect) assert.equal(typeof e.kind, 'string');
  }
});

test('every group is represented', () => {
  for (const g of GROUPS) assert.ok(PROBES.some((p) => p.group === g), `missing group ${g}`);
});

test('probe set: exactly 35 probes', () => {
  assert.equal(PROBES.length, 35, `expected 35 probes, found ${PROBES.length}`);
});

test('command, agent, and router groups are exactly the eight new advisory probes', () => {
  const expected = {
    command: [
      'command-preview',
      'command-release',
      'command-reverse-engineer',
      'command-security-audit',
    ],
    agent: ['agent-readonly'],
    router: ['router-adr', 'router-incident', 'router-threat-model'],
  };
  for (const [group, ids] of Object.entries(expected)) {
    const actual = PROBES.filter((p) => p.group === group)
      .map((p) => p.id)
      .sort();
    assert.deepEqual(actual, [...ids].sort(), `group ${group} must be exactly ${ids.join(', ')}`);
  }
  for (const ids of Object.values(expected)) {
    for (const id of ids) {
      const p = PROBES.find((probe) => probe.id === id);
      assert.ok(p, `missing probe ${id}`);
      assert.equal(p.advisory, true, `${id} must be advisory: true until calibrated`);
    }
  }
});

test('command-release is a read-only draft probe', () => {
  const p = PROBES.find((probe) => probe.id === 'command-release');
  assert.ok(p, 'missing probe command-release');
  assert.equal(p.advisory, true, 'command-release must be advisory: true until calibrated');
  assert.equal(p.group, 'command', 'command-release must be in the command group');
  assert.deepEqual(p.artifacts, ['docs/release.md']);
  assert.ok(
    p.expect.some((e) => e.kind === 'skill' && e.value === 'writing-release-notes'),
    'command-release must assert the writing-release-notes skill',
  );
  for (const value of ['version:', '## Breaking', '## Added']) {
    assert.ok(
      p.expect.some(
        (e) =>
          e.kind === 'artifact-contains' && e.path === 'docs/release.md' && e.value === value,
      ),
      `command-release must assert artifact-contains ${JSON.stringify(value)}`,
    );
  }
  assert.ok(
    p.expect.some((e) => e.kind === 'file-unchanged' && e.path === 'src/index.js'),
    'command-release must assert file-unchanged src/index.js',
  );
  assert.ok(
    Array.isArray(p.baseline) && p.baseline.includes('src/index.js'),
    'command-release must declare the src/index.js baseline',
  );
});

test('brain group is exactly the three hard artifact probes', () => {
  const brain = PROBES.filter((p) => p.group === 'brain');
  assert.equal(brain.length, 3, `expected 3 brain probes, got ${brain.length}`);
  assert.deepEqual(
    brain.map((p) => p.id).sort(),
    ['brain-design', 'brain-plan', 'brain-research'],
  );
  for (const p of brain) {
    assert.ok(!p.advisory, `${p.id} must be hard (non-advisory)`);
    assert.ok(Array.isArray(p.artifacts) && p.artifacts.length > 0, `${p.id} needs artifacts`);
  }
});

test('brain-research declares a url-fetched expectation on its report', () => {
  const p = PROBES.find((probe) => probe.id === 'brain-research');
  assert.ok(p, 'missing brain probe brain-research');
  assert.ok(
    p.expect.some((e) => e.kind === 'url-fetched' && e.path === 'docs/report.md'),
    'brain-research must declare url-fetched on docs/report.md',
  );
});

test('artifact expectations target a declared, relative artifact path', () => {
  for (const p of PROBES) {
    const declared = p.artifacts || [];
    for (const a of declared) {
      assert.equal(typeof a, 'string', `${p.id} artifact must be a string`);
      assert.ok(!path.isAbsolute(a), `${p.id} artifact ${a} must be relative`);
      assert.ok(!a.includes('..'), `${p.id} artifact ${a} must not escape the scratch project`);
    }
    for (const e of p.expect) {
      if (!e.kind.startsWith('artifact-')) continue;
      assert.ok(declared.includes(e.path), `${p.id} ${e.kind} path ${e.path} not declared in artifacts`);
    }
  }
});

test('safety probes are hard', () => {
  const safety = PROBES.filter((p) => p.group === 'safety');
  assert.ok(safety.length > 0, 'expected safety probes');
  for (const p of safety) assert.ok(!p.advisory, `${p.id} must be hard (non-advisory)`);
});

test('trust group is exactly the four trust probes', () => {
  const trust = PROBES.filter((p) => p.group === 'trust');
  assert.deepEqual(
    trust.map((p) => p.id).sort(),
    ['approval-self-check', 'external-verification', 'readonly-subagent', 'test-integrity'],
  );
});

test('trust gate probes skip auto mode', () => {
  for (const id of ['approval-self-check', 'readonly-subagent']) {
    const p = PROBES.find((probe) => probe.id === id);
    assert.ok(p, `missing trust probe ${id}`);
    assert.equal(p.auto, false, `${id} must set auto: false`);
  }
});

test('external-verification declares a static command and a command-exit expectation', () => {
  const p = PROBES.find((probe) => probe.id === 'external-verification');
  assert.ok(p, 'missing trust probe external-verification');
  assert.ok(p.command && typeof p.command === 'object', 'external-verification must declare command');
  assert.equal(p.command.cmd, 'node', "external-verification command.cmd must be the static 'node'");
  assert.deepEqual(p.command.args, ['--test', 'tests/fixture.test.mjs']);
  assert.ok(
    p.expect.some((e) => e.kind === 'command-exit' && e.value === 0),
    'external-verification must declare command-exit 0',
  );
});

test('external-verification stays hard unless CALIBRATION marks it unstable', () => {
  const p = PROBES.find((probe) => probe.id === 'external-verification');
  assert.ok(p, 'missing trust probe external-verification');
  assert.equal(
    !!p.advisory,
    CALIBRATION['external-verification'] === 'unstable',
    `external-verification advisory must follow CALIBRATION (${CALIBRATION['external-verification']})`,
  );
});

test('execution group is exactly the four execution probes', () => {
  const execution = PROBES.filter((p) => p.group === 'execution');
  assert.deepEqual(
    execution.map((p) => p.id).sort(),
    ['debug-repro', 'merge-gate', 'review-disposition', 'worktree-baseline'],
  );
  for (const p of execution) {
    assert.equal(
      !!p.advisory,
      CALIBRATION[p.id] !== 'stable',
      `${p.id} advisory must follow CALIBRATION (${CALIBRATION[p.id]})`,
    );
    assert.ok(Array.isArray(p.artifacts) && p.artifacts.length > 0, `${p.id} needs artifacts`);
    assert.ok(
      p.expect.some((e) => e.kind === 'artifact-contains' || e.kind === 'artifact-matches'),
      `${p.id} needs an artifact-contains or artifact-matches expectation`,
    );
  }
});

test('file-unchanged expectations target a declared baseline path', () => {
  for (const p of PROBES) {
    const baseline = p.baseline || [];
    for (const e of p.expect) {
      if (e.kind !== 'file-unchanged') continue;
      assert.ok(
        baseline.includes(e.path),
        `${p.id} file-unchanged path ${e.path} not declared in baseline`,
      );
    }
  }
});

test('fixtures keys are relative and stay inside the scratch project', () => {
  for (const p of PROBES) {
    const fixtures = p.fixtures || {};
    assert.equal(typeof fixtures, 'object', `${p.id} fixtures must be an object`);
    for (const key of Object.keys(fixtures)) {
      assert.ok(!path.isAbsolute(key), `${p.id} fixture ${key} must be relative`);
      assert.ok(!key.includes('..'), `${p.id} fixture ${key} must not escape the scratch project`);
    }
  }
});

test('probe commands are static argv and never use a shell', () => {
  for (const p of PROBES) {
    if (p.command === undefined) continue;
    assert.equal(typeof p.command, 'object', `${p.id} command must be an object`);
    assert.equal(typeof p.command.cmd, 'string', `${p.id} command.cmd must be a string`);
    assert.ok(p.command.cmd.length > 0, `${p.id} command.cmd must not be empty`);
    assert.ok(Array.isArray(p.command.args), `${p.id} command.args must be an array`);
    for (const arg of p.command.args) {
      assert.equal(typeof arg, 'string', `${p.id} command args must be strings`);
    }
    assert.ok(!('shell' in p.command), `${p.id} command must not declare a shell`);
  }
});

test('a zero-probe run exits 1 with a no-probes error', () => {
  const res = spawnSync(
    process.execPath,
    ['eval/run.mjs', '--run', '--filter', '__none__'],
    { cwd: repoRoot, encoding: 'utf8', timeout: 60_000 },
  );
  assert.equal(res.status, 1, `expected exit 1, got ${res.status}; stderr: ${res.stderr}`);
  assert.match(res.stderr, /no probes/i);
});

test('createScratch returns a unique scratch directory each call', async () => {
  const { createScratch } = await import('../../eval/run.mjs');
  assert.equal(typeof createScratch, 'function', 'eval/run.mjs must export createScratch()');
  const a = createScratch();
  const b = createScratch();
  try {
    assert.notEqual(a, b, 'createScratch must not reuse a scratch directory');
    assert.ok(fs.existsSync(a), `scratch not created: ${a}`);
    assert.ok(fs.existsSync(b), `scratch not created: ${b}`);
  } finally {
    for (const dir of [a, b]) fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('runCommand runs static argv without a shell and returns the exit status', async () => {
  const { runCommand } = await import('../../eval/run.mjs');
  assert.equal(typeof runCommand, 'function', 'eval/run.mjs must export runCommand()');
  assert.equal(runCommand(repoRoot, undefined), undefined, 'no command must return undefined');
  const ok = runCommand(repoRoot, { cmd: process.execPath, args: ['-e', 'process.exit(0)'] });
  assert.equal(ok, 0, `expected exit 0, got ${ok}`);
  const seven = runCommand(repoRoot, { cmd: process.execPath, args: ['-e', 'process.exit(7)'] });
  assert.equal(seven, 7, `expected exit 7, got ${seven}`);
  const noShell = runCommand(repoRoot, {
    cmd: process.execPath,
    args: ['-e', 'process.exit(process.argv.length === 3 ? 0 : 7)', 'a;b', '$(echo expanded)'],
  });
  assert.equal(noShell, 0, 'argv must run without a shell: metacharacters must not expand');
});
