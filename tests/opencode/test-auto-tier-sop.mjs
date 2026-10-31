// Auto-tier separation-of-powers regression tests (SOP-1).
// Hermetic: tmp roots, fixtures in-test, no live services.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

const pluginURL = pathToFileURL(path.resolve(import.meta.dirname, '../../.opencode/plugins/sdlc-lean.js')).href;
const plugin = await import(pluginURL);
const specURL = pathToFileURL(path.resolve(import.meta.dirname, '../../scripts/spec-check.mjs')).href;
const spec = await import(specURL);

const planText = ({ files = ['src/app.js'] } = {}) => `---
spec: docs/specs/spec.md
status: approved
approved_by: tester
approved_at: 2026-10-24T00:00:00Z
files:
${files.map((f) => `  - ${f}`).join('\n')}
---

# Plan
`;

const makeRepo = (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-tier-sop-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'docs', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'plans'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'specs', 'spec.md'), '# Spec\n');
  fs.writeFileSync(path.join(root, 'docs', 'plans', 'plan.md'), planText());
  fs.writeFileSync(path.join(root, 'src', 'app.js'), '// app\n');
  const gate = spec.buildGate(root, 'docs/plans/plan.md');
  spec.writeGate(root, gate);
  return root;
};

test('SoP refuses when implementer and critic share one session (sop-violation)', () => {
  assert.throws(
    () => plugin.checkSeparationOfPowers({ implementer: 'sess-1', critic: 'sess-1' }),
    /sop-violation/,
  );
});

test('SoP refuses when the closer edited the run (sop-violation)', () => {
  assert.throws(
    () =>
      plugin.checkCloser({
        implementer: 'sess-1',
        closer: 'sess-1',
        evidence: 'docs/plans/plan-evidence.json',
        plan_sha256: 'a'.repeat(64),
        verdicts: ['ACCEPT'],
      }),
    /sop-violation/,
  );
});

test('SoP passes when author, implementer, critic, and closer are distinct sessions', () => {
  assert.doesNotThrow(() =>
    plugin.checkSeparationOfPowers({ author: 'sess-a', implementer: 'sess-b', critic: 'sess-c', closer: 'sess-d' }),
  );
});

test('SoP read-only with duplicate roles passes (fail-open for non-mutating tools)', (t) => {
  const root = makeRepo(t);
  assert.doesNotThrow(() =>
    plugin.checkSpecGate('read', { filePath: 'src/other.js' }, root, {
      runRoles: { implementer: 'sess-dup', critic: 'sess-dup' },
    }),
  );
});
