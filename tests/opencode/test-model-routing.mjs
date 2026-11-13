// Structural guardrail for the brain-muscle model routing contract.
// Reads orchestrator.md only — no YAML dep, no model calls, no plugin.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const doc = read('.opencode/agents/orchestrator.md');

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const BRAIN_ROLES = [
  'orchestrator (self)',
  'researcher (synthesis)',
  'planner',
  'brainstorming facilitation',
  'code-reviewer',
  'security-reviewer',
];

const MUSCLE_ROLES = ['explorer (maps)', 'implementer', 'test-writer'];

const FREE_IDS = ['crouton', 'beam-free', 'iceman', 'super-vl-free', 'super-vl:free', 'muse-spark', 'muse-spark-1.3', 'muse-spark-1.3-contributor'];

test('orchestrator.md: unpinned (no model: in frontmatter)', () => {
  const fm = doc.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(fm, 'frontmatter block present');
  assert.doesNotMatch(fm[1], /^model:/m, 'orchestrator must stay UNPINNED');
});

test('Model routing table: BRAIN roles are BRAIN tier', () => {
  for (const role of BRAIN_ROLES) {
    const re = new RegExp(`^\\| ${esc(role)} \\| BRAIN \\|`, 'm');
    assert.match(doc, re, `${role} must be BRAIN tier`);
  }
});

test('Model routing table: MUSCLE roles are MUSCLE tier', () => {
  for (const role of MUSCLE_ROLES) {
    const re = new RegExp(`^\\| ${esc(role)} \\| MUSCLE \\|`, 'm');
    assert.match(doc, re, `${role} must be MUSCLE tier`);
  }
});

test('BRAIN tier declared UNPINNED, never free pool', () => {
  assert.match(doc, /\*\*BRAIN\*\* — orchestrator session model \(UNPINNED/);
  assert.match(doc, /never free pool/i);
});

test('BRAIN rows dispatch on orchestrator session model, not free pool', () => {
  const section = doc.slice(doc.indexOf('## Model routing table'));
  const brainRows = section.split('\n').filter((l) => /\|\s*BRAIN\s*\|/.test(l));
  assert.ok(brainRows.length >= BRAIN_ROLES.length, 'BRAIN rows present');
  for (const row of brainRows) {
    assert.match(row, /orchestrator session model/i, `BRAIN row must name session model: ${row}`);
    for (const bad of FREE_IDS) {
      assert.ok(
        !row.toLowerCase().includes(bad.toLowerCase()),
        `BRAIN role must not dispatch on free model "${bad}": ${row}`,
      );
    }
  }
});

test('MUSCLE tier declared free-first with cap fallback', () => {
  assert.match(doc, /\*\*MUSCLE\*\* — free-first order/);
  assert.match(doc, /All free exhausted → orchestrator's own model/);
  assert.match(doc, /cap \+ ask-to-extend/);
});

test('MUSCLE rows follow super-vl x2 → Go cost-0 → BRAIN fallback order', () => {
  const section = doc.slice(doc.indexOf('## Model routing table'));
  const muscleRows = section.split('\n').filter((l) => /\|\s*MUSCLE\s*\|/.test(l));
  assert.ok(muscleRows.length >= MUSCLE_ROLES.length, 'MUSCLE rows present');
  for (const row of muscleRows) {
    const i1 = row.indexOf('super-vl:free');
    const i2 = row.indexOf('opencode-go free models');
    const i3 = row.indexOf("BRAIN (orchestrator's own model)");
    assert.ok(i1 >= 0 && i2 > i1 && i3 > i2, `free-first order wrong: ${row}`);
  }
});

test('researcher/planner/reviewer never on crouton/beam/iceman/super-vl-free', () => {
  const section = doc.slice(doc.indexOf('## Model routing table'));
  const lines = section.split('\n');
  for (const role of ['researcher (synthesis)', 'planner', 'code-reviewer', 'security-reviewer']) {
    const row = lines.find((l) => l.trim().startsWith(`| ${role} |`));
    assert.ok(row, `${role} row present`);
    for (const bad of ['crouton', 'beam-free', 'iceman', 'super-vl-free', 'super-vl:free', 'muse-spark', 'muse-spark-1.3', 'muse-spark-1.3-contributor']) {
      assert.ok(
        !row.toLowerCase().includes(bad),
        `${role} must not be dispatched on ${bad}`,
      );
    }
  }
});

test('implementer paid (BRAIN) fallback requires cap record', () => {
  assert.match(doc, /BRAIN fallback only;[\s\S]{0,240}cap \+ ask-to-extend/, 'paid fallback must carry cap');
  const section = doc.slice(doc.indexOf('## Model routing table'));
  const row = section.split('\n').find((l) => l.trim().startsWith('| implementer |'));
  assert.ok(row, 'implementer row present');
  assert.match(row, /BRAIN \(orchestrator's own model\)/, 'implementer fallback to BRAIN present');
});

test('Delegation Quality has Pre-dispatch verify line', () => {
  const dq = doc.slice(doc.indexOf('## Delegation Quality checklist'));
  assert.ok(dq.includes('Pre-dispatch verify: check role→tier table before every dispatch; mismatch → stop + correct model, record ledger row (model+account).'));
});