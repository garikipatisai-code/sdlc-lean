// Structural execution gate for the nine Wave 2 execution skills, plus installer
// parity. No model calls, no network.
// Contract: docs/plans/2026-10-30-execution-quality-hardening.md (task 1, AC1-AC11);
// spec: docs/specs/2026-10-30-execution-quality-hardening.md.
// Audit P1 (execution/verification): "TDD's 'Iron Law' overclaims quality (null
// result [10]); systematic-debugging does not require keeping the repro test;
// executing-plans evidence is self-reported; subagent review is text-only;
// receiving-code-review has no final re-run; lean-review's `net: -N` is unvalidated
// and can reward harmful deletion; finishing-a-development-branch lacks a human
// merge gate and final-SHA CI check; worktrees lack baseline SHA and gate-marker
// warnings." (docs/research/2026-10-30-suite-portfolio-audit.md, P1 findings)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { installGlobal } from '../../scripts/install-global.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const read = (name) => fs.readFileSync(path.join(root, '.opencode', 'skills', name, 'SKILL.md'), 'utf8');
// `wc -l` semantics: newline count, not split length.
const lineCount = (text) => text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
// Collapse wrapping so an exact rule matches however the prose is line-broken.
const prose = (text) => text.replace(/\s+/g, ' ');
// Required strings compare case-insensitively; wrapping is already collapsed.
const present = (text, required) => prose(text).toLowerCase().includes(required.toLowerCase());
const toRegExp = (entry) => {
  const m = entry.match(/^\/(.*)\/([a-z]*)$/);
  return m ? new RegExp(m[1], m[2] || 'i') : new RegExp(entry, 'i');
};

const INTEGRITY =
  'Never weaken, skip, delete, or rewrite a test/assertion, snapshot, fixture, or lint rule to pass; a changed assertion is a behavior change requiring approval.';

// AC11: every entry cites the audit P1 finding it closes.
const FILES = [
  {
    name: 'test-driven-development',
    cap: 40,
    ac: 'AC1',
    finding: "TDD's \"Iron Law\" overclaims quality (null result [10])",
    required: [
      'test-first generates the external signal',
      'does not by itself guarantee quality or productivity',
      'RED',
      'GREEN',
      'REFACTOR',
      'regression',
      INTEGRITY,
    ],
    forbidden: ['/Iron Law/i'],
  },
  {
    name: 'systematic-debugging',
    cap: 30,
    ac: 'AC2',
    finding: 'systematic-debugging does not require keeping the repro test',
    required: ['fail-before-fix', 'temporarily revert', 'repro test fails again', 'repro command', 'evidence row', INTEGRITY],
    forbidden: ['/delete (?:the )?repro/i'],
  },
  {
    name: 'executing-plans',
    cap: 55,
    ac: 'AC3',
    finding: 'executing-plans evidence is self-reported',
    required: [
      'Verify',
      'evidence',
      'raw command output',
      'reviewer',
      'no reviewer',
      'stop and escalate',
      'no self-review fallback',
      'review dispositions',
      'progress ledger',
    ],
    forbidden: ['/self-review (?:instead|is acceptable)/i'],
  },
  {
    name: 'subagent-driven-development',
    cap: 55,
    ac: 'AC4',
    finding: 'subagent review is text-only',
    required: [
      'Verify',
      'evidence',
      'raw command output',
      'reviewer',
      'fresh context',
      'not a quality guarantee',
      'independent signal',
      'baseline SHA',
      'test command',
      'read-only tests',
      INTEGRITY,
    ],
    forbidden: ['/fresh context guarantees/i'],
  },
  {
    name: 'requesting-code-review',
    cap: 40,
    ac: 'AC5',
    finding: 'review passes are personas; findings are not persisted',
    required: [
      '≤20 changed lines',
      'auth/IO/schema',
      'review-exception',
      'spec',
      'traced attacker path',
      'measurement',
      'diff',
      'no finding',
      'path:line',
      'severity',
      'disposition',
    ],
    forbidden: ['/self-review\\s+for\\s+trivial\\s+diffs/i'],
  },
  {
    name: 'receiving-code-review',
    cap: 25,
    ac: 'AC6',
    finding: 'receiving-code-review has no final re-run',
    required: ['re-run', 'Verify', 'full suite', 'fixed', 'rejected', 'needs-human', 'progress ledger', 'Never bulk-apply'],
    forbidden: ['/apply (?:all|everything)/i'],
  },
  {
    name: 'lean-review',
    cap: 35,
    ac: 'AC7',
    finding: "lean-review's `net: -N` is unvalidated and can reward harmful deletion",
    required: [
      'net: -N',
      'advisory',
      'never a gate',
      'delete',
      'stdlib',
      'native',
      'yagni',
      'shrink',
      'one-line reason',
      'severity',
      'tests',
      'safety guards',
      'error handling',
    ],
    forbidden: ['/net: -N (?:is|as) a gate/i'],
  },
  {
    name: 'finishing-a-development-branch',
    cap: 20,
    ac: 'AC8',
    finding: 'finishing-a-development-branch lacks a human merge gate and final-SHA CI check',
    required: [
      'explicit human approval',
      'final SHA',
      'before cleanup',
      'after evidence',
      'spec-check verify',
      'spec-check close',
      'not a green build',
    ],
    forbidden: ['/confirm CI scope,? then clean up/i'],
  },
  {
    name: 'using-git-worktrees',
    cap: 30,
    ac: 'AC9',
    finding: 'worktrees lack baseline SHA and gate-marker warnings',
    required: ['baseline SHA', 'test command', 'per-worktree', 'dependency', 'port', 'merge/PR', 'spec-gate'],
    forbidden: ['/remove .* before (?:merge|PR)/i'],
  },
];

for (const { name, cap, ac, required, forbidden } of FILES) {
  test(`${name}: cap`, () => {
    const count = lineCount(read(name));
    assert.ok(count <= cap, `${name} (${ac}): ${count} lines exceeds the ${cap}-line cap`);
  });

  test(`${name}: strings`, () => {
    const text = read(name);
    const missing = required.filter((s) => !present(text, s));
    assert.deepEqual(
      missing,
      [],
      `${name} (${ac}): missing required strings: ${missing.map((s) => JSON.stringify(s)).join(', ')}`,
    );
  });

  test(`${name}: forbidden`, () => {
    const text = prose(read(name));
    const hits = forbidden.filter((pattern) => toRegExp(pattern).test(text));
    assert.deepEqual(hits, [], `${name} (${ac}): forbidden pattern still present: ${hits.join(', ')}`);
  });
}

const CHANGED = FILES.map(({ name }) => ({
  installed: `skills/${name}/SKILL.md`,
  source: `.opencode/skills/${name}/SKILL.md`,
}));

test('parity: 9 execution skills install byte-identically', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-execution-install-'));
  try {
    installGlobal({ repo: root, target });
    for (const { installed, source } of CHANGED) {
      const src = path.join(root, source);
      const dst = path.join(target, installed);
      assert.ok(fs.existsSync(src), `source file missing: ${source}`);
      assert.ok(fs.existsSync(dst), `installer did not ship: ${installed}`);
      assert.deepEqual(fs.readFileSync(dst), fs.readFileSync(src), `installed bytes differ: ${installed}`);
    }
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});
