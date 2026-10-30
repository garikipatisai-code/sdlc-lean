// Structural trust gate for the execution/review skills, the canonical task
// ledger, and installer parity. No model calls, no network.
// Contract: docs/plans/2026-10-30-trust-core-hardening.md (task 3, AC3-AC6, AC9).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { installGlobal } from '../../scripts/install-global.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const skill = (name) => fs.readFileSync(path.join(root, '.opencode', 'skills', name, 'SKILL.md'), 'utf8');
// Collapse wrapping so an exact rule matches however the prose is line-broken.
const prose = (name) => skill(name).replace(/\s+/g, ' ');

const INTEGRITY =
  'Never weaken, skip, delete, or rewrite a test/assertion, snapshot, fixture, or lint rule to pass; a changed assertion is a behavior change requiring approval.';

test('writing-plans: evidence allow entry and row schema', () => {
  const text = skill('writing-plans');
  assert.ok(
    text.includes('docs/plans/<slug>-evidence.json'),
    'writing-plans: must add docs/plans/<slug>-evidence.json to the allow example',
  );
  const fields = ['task', 'verify', 'exit', 'at'];
  const schemaLine = text
    .split(/\r?\n/)
    .find((line) => fields.every((field) => new RegExp(`\\b${field}\\b`).test(line)));
  assert.ok(
    schemaLine,
    `writing-plans: must define the evidence row fields ${fields.join(', ')} on one line`,
  );
});

const EXECUTION = [
  { name: 'executing-plans', label: 'executing-plans' },
  { name: 'subagent-driven-development', label: 'subagent' },
];

for (const { name, label } of EXECUTION) {
  test(`${label}: re-runs Verify and gives the reviewer raw evidence output`, () => {
    const text = prose(name);
    assert.match(text, /\bVerify\b/, `${name}: must name the task's Verify command`);
    assert.ok(text.includes('evidence'), `${name}: must write the evidence row`);
    assert.match(
      text,
      /raw (?:command )?output/,
      `${name}: must pass the raw command output, never a self-report alone`,
    );
    assert.match(text, /\breviewer\b/i, `${name}: must hand the raw output to the reviewer`);
  });
}

test('review: requesting-code-review has no trivial-diff escape and a binary exception', () => {
  const text = prose('requesting-code-review');
  assert.ok(
    !/self-review\s+for\s+trivial\s+diffs/i.test(text),
    'requesting-code-review: the "self-review for trivial diffs" escape must be removed',
  );
  assert.ok(
    text.includes('≤20 changed lines'),
    'requesting-code-review: must state the ≤20 changed lines bound',
  );
  assert.ok(
    text.includes('auth/IO/schema'),
    'requesting-code-review: must state the auth/IO/schema exclusion',
  );
  assert.ok(
    text.includes('review-exception'),
    'requesting-code-review: must record the review-exception marker',
  );
});

const INTEGRITY_SKILLS = [
  'test-driven-development',
  'systematic-debugging',
  'executing-plans',
  'subagent-driven-development',
  'verification-before-completion',
];

for (const name of INTEGRITY_SKILLS) {
  test(`integrity: ${name} states the test-integrity rule`, () => {
    assert.ok(
      prose(name).includes(INTEGRITY),
      `${name}: missing the exact test-integrity sentence from the plan`,
    );
  });
}

test('ledger: managing-tasks names the canonical progress ledger', () => {
  const text = skill('managing-tasks');
  assert.ok(
    text.includes('docs/plans/<slug>-progress.md'),
    'managing-tasks: must name docs/plans/<slug>-progress.md as the only task state',
  );
  assert.ok(
    !text.includes('.planning/STATE.md'),
    'managing-tasks: must not point at .planning/STATE.md',
  );
});

// Isolate the activation status file before importing the plugin.
process.env.XDG_STATE_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-trust-state-'));
const plugin = await import(pathToFileURL(path.join(root, '.opencode/plugins/sdlc-lean.js')).href);

test('compaction: injects the canonical progress ledger and never .planning/STATE.md', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-trust-ledger-'));
  try {
    fs.mkdirSync(path.join(tmp, 'docs', 'plans'), { recursive: true });
    fs.mkdirSync(path.join(tmp, '.planning'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.planning', 'STATE.md'), '# State\nPLANNING-STATE\n');
    fs.writeFileSync(
      path.join(tmp, 'docs', 'plans', '2026-01-01-x-progress.md'),
      '# Progress\nCANONICAL-LEDGER\n',
    );
    const parts = plugin.compactionContext(tmp);
    assert.ok(
      parts.some((p) => p.includes('CANONICAL-LEDGER')),
      'compaction must inject the canonical docs/plans/<slug>-progress.md body',
    );
    assert.ok(
      !parts.some((p) => p.includes('PLANNING-STATE')),
      'compaction must never inject .planning/STATE.md',
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// The 12 content files the trust-core work changes must ship byte-identically.
const CHANGED = [
  { installed: 'skills/writing-plans/SKILL.md', source: '.opencode/skills/writing-plans/SKILL.md' },
  { installed: 'skills/executing-plans/SKILL.md', source: '.opencode/skills/executing-plans/SKILL.md' },
  { installed: 'skills/subagent-driven-development/SKILL.md', source: '.opencode/skills/subagent-driven-development/SKILL.md' },
  { installed: 'skills/requesting-code-review/SKILL.md', source: '.opencode/skills/requesting-code-review/SKILL.md' },
  { installed: 'skills/test-driven-development/SKILL.md', source: '.opencode/skills/test-driven-development/SKILL.md' },
  { installed: 'skills/systematic-debugging/SKILL.md', source: '.opencode/skills/systematic-debugging/SKILL.md' },
  { installed: 'skills/verification-before-completion/SKILL.md', source: '.opencode/skills/verification-before-completion/SKILL.md' },
  { installed: 'skills/managing-tasks/SKILL.md', source: '.opencode/skills/managing-tasks/SKILL.md' },
  { installed: 'agents/explorer.md', source: '.opencode/agents/explorer.md' },
  { installed: 'agents/orchestrator.md', source: '.opencode/agents/orchestrator.md' },
  { installed: 'agents/test-writer.md', source: '.opencode/agents/test-writer.md' },
  { installed: 'commands/security-audit.md', source: '.opencode/commands/security-audit.md' },
];

test('parity: 12 changed content files install byte-identically', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-trust-install-'));
  try {
    installGlobal({ repo: root, target });
    for (const { installed, source } of CHANGED) {
      const src = path.join(root, source);
      const dst = path.join(target, installed);
      assert.ok(fs.existsSync(src), `source file missing: ${source}`);
      assert.ok(fs.existsSync(dst), `installer did not ship: ${installed}`);
      assert.deepEqual(
        fs.readFileSync(dst),
        fs.readFileSync(src),
        `installed bytes differ: ${installed}`,
      );
    }
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});
