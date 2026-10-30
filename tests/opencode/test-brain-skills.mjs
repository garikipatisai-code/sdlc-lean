// Structural gate for the brain layer: line caps, required/forbidden content,
// reference links, and installer byte parity. No model calls, no network.
// Contract: docs/plans/2026-10-30-brain-layer-hardening.md (Content contract).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { installGlobal } from '../../scripts/install-global.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
// wc -l semantics for newline-terminated files.
const lineCount = (text) => text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
const label = (entry) => (typeof entry === 'string' ? JSON.stringify(entry) : String(entry));
const present = (text, entry) => (typeof entry === 'string' ? text.includes(entry) : entry.test(text));

const FILES = [
  {
    name: 'brainstorming/SKILL.md',
    rel: '.opencode/skills/brainstorming/SKILL.md',
    cap: 60,
    required: [
      '## Goal',
      '## Non-goals',
      '## Alternatives',
      '## Trade-offs',
      '## Trace',
      '## Review findings',
      '## Leading indicators',
      'perspective',
    ],
    forbidden: [/cost[- ]of[- ]defect/i, /40\s*[×x]/i, /100\s*[×x]/i],
  },
  {
    name: 'writing-plans/SKILL.md',
    rel: '.opencode/skills/writing-plans/SKILL.md',
    cap: 85,
    required: [
      'one verifiable outcome',
      '## Task shape',
      'external verification command',
      '## Requirement coverage',
      '## Test integrity',
    ],
    forbidden: [/2[–-]5\s*min/i],
  },
  {
    name: 'deep-research/SKILL.md',
    rel: '.opencode/skills/deep-research/SKILL.md',
    cap: 105,
    required: [
      'Close the loop',
      'entailment',
      'one writer',
      'BrowseComp',
      'personas are optional',
    ],
    forbidden: [/required personas?/i],
  },
  {
    name: 'option-selection/SKILL.md',
    rel: '.opencode/skills/option-selection/SKILL.md',
    cap: 45,
    required: ['do nothing', 'binary', 'swap', 'Matrix', 'Y-statement', 'record the decision'],
    forbidden: [/holistic/i],
  },
  {
    name: 'planner.md',
    rel: '.opencode/agents/planner.md',
    cap: 22,
    required: [/task shape/i, /external/i, /test integrity/i],
  },
];

for (const file of FILES) {
  test(`cap: ${file.name}`, () => {
    const lines = lineCount(read(file.rel));
    assert.ok(
      lines <= file.cap,
      `${file.name} is ${lines} lines; cap is ${file.cap} (wc -l semantics)`,
    );
  });

  test(`strings: ${file.name}`, () => {
    const text = read(file.rel);
    const missing = file.required.filter((entry) => !present(text, entry)).map(label);
    assert.deepEqual(missing, [], `${file.name} missing required strings: ${missing.join(', ')}`);
  });
}

for (const file of FILES.filter((f) => f.forbidden)) {
  test(`forbidden: ${file.name}`, () => {
    const text = read(file.rel);
    const hits = file.forbidden.filter((re) => re.test(text)).map(String);
    assert.deepEqual(hits, [], `${file.name} contains forbidden claim(s): ${hits.join(', ')}`);
  });
}

const NEW_REFS = ['design-review.md', 'plan-rubric.md', 'citation-check.md'];

const REF_TARGETS = [
  {
    name: 'brainstorming/SKILL.md',
    rel: '.opencode/skills/brainstorming/SKILL.md',
    dir: '.opencode/skills/brainstorming',
    target: 'design-review.md',
  },
  {
    name: 'writing-plans/SKILL.md',
    rel: '.opencode/skills/writing-plans/SKILL.md',
    dir: '.opencode/skills/writing-plans',
    target: 'plan-rubric.md',
  },
  {
    name: 'deep-research/SKILL.md',
    rel: '.opencode/skills/deep-research/SKILL.md',
    dir: '.opencode/skills/deep-research',
    target: 'citation-check.md',
  },
  {
    name: 'option-selection/SKILL.md',
    rel: '.opencode/skills/option-selection/SKILL.md',
    dir: '.opencode/skills/option-selection',
    target: null,
  },
];

for (const file of REF_TARGETS) {
  test(`refs: ${file.name}`, () => {
    const text = read(file.rel);
    const counts = Object.fromEntries(
      NEW_REFS.map((ref) => [ref, text.split(ref).length - 1]),
    );
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    assert.ok(
      total <= 1,
      `${file.name} links ${total} new references (${JSON.stringify(counts)}); at most one is allowed`,
    );
    if (!file.target) {
      assert.equal(total, 0, `${file.name} must not link a new reference`);
      return;
    }
    assert.equal(
      counts[file.target],
      1,
      `${file.name} must link ${file.target} exactly once (found ${counts[file.target]})`,
    );
    const refPath = path.join(root, file.dir, 'references', file.target);
    assert.ok(fs.existsSync(refPath), `missing referenced file: ${path.relative(root, refPath)}`);
  });
}

// The 8 content files the brain-layer work changes must ship byte-identically.
const CHANGED = [
  { installed: 'skills/brainstorming/SKILL.md', source: '.opencode/skills/brainstorming/SKILL.md' },
  { installed: 'skills/brainstorming/references/design-review.md', source: '.opencode/skills/brainstorming/references/design-review.md' },
  { installed: 'skills/writing-plans/SKILL.md', source: '.opencode/skills/writing-plans/SKILL.md' },
  { installed: 'skills/writing-plans/references/plan-rubric.md', source: '.opencode/skills/writing-plans/references/plan-rubric.md' },
  { installed: 'skills/deep-research/SKILL.md', source: '.opencode/skills/deep-research/SKILL.md' },
  { installed: 'skills/deep-research/references/citation-check.md', source: '.opencode/skills/deep-research/references/citation-check.md' },
  { installed: 'skills/option-selection/SKILL.md', source: '.opencode/skills/option-selection/SKILL.md' },
  { installed: 'agents/planner.md', source: '.opencode/agents/planner.md' },
];

test('parity: changed content files', () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-brain-install-'));
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
