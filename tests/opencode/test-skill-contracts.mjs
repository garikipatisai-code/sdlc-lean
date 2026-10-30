// Skill contracts: generic rules for all 40 top-level skills, specific hard
// rules for 11 high-risk skills, 6 evidence contracts, 2 route contracts, the
// release command contract, the writing-skills coverage rule, and the live
// status-command output. Structural evidence, not runtime enforcement
// (AC1, AC2, AC9, AC11; audit P1 "Measurement", Wave 3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { GENERIC_EXEMPTIONS, SKILLS } from '../../eval/coverage.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const skillsDir = path.join(root, '.opencode/skills');

const skillNames = fs
  .readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const skillFile = (name) => path.join(skillsDir, name, 'SKILL.md');
const read = (name) => fs.readFileSync(skillFile(name), 'utf8');

const collapse = (text) => text.replace(/\s+/g, ' ').trim().toLowerCase();

// `wc -l` semantics: count newline bytes, not split lines.
const lineCount = (text) => (text.match(/\n/g) || []).length;

function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : '';
}

function field(text, key) {
  const match = frontmatter(text).match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  if (!match) return undefined;
  return match[1].trim().replace(/^(['"])(.*)\1$/, '$2');
}

// Body prose: everything after the frontmatter block, whitespace collapsed.
function prose(text) {
  const end = text.search(/\r?\n---\r?\n/);
  const body = end === -1 ? text : text.slice(end + 5);
  return collapse(body);
}

test('skills: exactly 40 top-level directories, each with SKILL.md', () => {
  assert.equal(
    skillNames.length,
    40,
    `expected 40 top-level skill directories, found ${skillNames.length}`,
  );
  const missing = skillNames.filter((name) => !fs.existsSync(skillFile(name)));
  assert.deepEqual(missing, [], `missing SKILL.md: ${missing.join(', ')}`);
});

test('generic: name equals directory and description starts "Use when"', () => {
  const problems = [];
  for (const name of skillNames) {
    const text = read(name);
    const declared = field(text, 'name');
    if (declared !== name) {
      problems.push(`${name}: frontmatter name ${JSON.stringify(declared)} != directory`);
    }
    const exemption = GENERIC_EXEMPTIONS[name];
    const prefixExempt = exemption && exemption.rule === 'description-prefix';
    const description = field(text, 'description') || '';
    if (!prefixExempt && !/^use when/i.test(description)) {
      problems.push(`${name}: description must start "Use when"`);
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('generic: every SKILL.md is at most 160 lines', () => {
  const problems = skillNames
    .map((name) => [name, lineCount(read(name))])
    .filter(([, lines]) => lines > 160)
    .map(([name, lines]) => `${name}: ${lines} lines (cap 160)`);
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('generic: no forbidden folklore patterns', () => {
  const forbidden = [
    /2[–-]5\s*min/i,
    /40\s*[×x]/i,
    /100\s*[×x]/i,
    /self-review\s+for\s+trivial/i,
  ];
  const problems = [];
  for (const name of skillNames) {
    const text = read(name);
    for (const pattern of forbidden) {
      if (pattern.test(text)) {
        problems.push(`${name}: matches forbidden ${pattern}`);
      }
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('generic: references/ paths and relative links resolve', () => {
  const problems = [];
  for (const name of skillNames) {
    const text = read(name);
    const dir = path.join(skillsDir, name);
    for (const match of text.matchAll(/`references\/([^`]+)`/g)) {
      const target = match[1];
      if (target.includes('<')) continue; // placeholder, e.g. references/vendor/<discipline>/
      if (!fs.existsSync(path.join(dir, 'references', target))) {
        problems.push(`${name}: missing reference ${target}`);
      }
    }
    const exemption = GENERIC_EXEMPTIONS[name];
    if (exemption && exemption.rule === 'relative-link') continue;
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const link = match[1].trim();
      if (/^(https?|mailto):/i.test(link) || link.startsWith('#') || link.startsWith('/')) {
        continue;
      }
      const file = link.split('#')[0];
      if (!fs.existsSync(path.join(dir, file))) {
        problems.push(`${name}: broken link ${link}`);
      }
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

// Hard strings are compared case-insensitively after whitespace collapse.
// Forbidden patterns are matched against the whole file. Caps use `wc -l`
// semantics. Structural evidence, not runtime enforcement (AC2, AC13).
const H1 = '| boundary | threat | risk | mitigation | residual owner |';
const H2 = '| date | tier | check | result | reversal |';
const H3 = '| engine | performance | accessibility | replay | shipping |';

const SPECIFIC = [
  {
    skill: 'reviewing-security',
    cap: 35,
    hard: [
      'Input → sink',
      'path:line',
      'attack path',
      'attacker input → sink',
      'severity',
      'threat-model',
    ],
  },
  {
    skill: 'threat-model',
    cap: 40,
    hard: [
      'Assets',
      'Entry points',
      'Trust boundaries',
      'Attacker paths',
      'risk is binary: high or low',
      'residual owner',
      'No finding without a traced path',
      H1,
    ],
    forbidden: [/\|\s*likelihood\s*\|/i],
  },
  {
    skill: 'autonomy-dial',
    cap: 30,
    hard: [
      'docs/audit-ledger.md',
      'named check command',
      'reversal',
      'No unmeasured success rate',
      H2,
    ],
    forbidden: [
      /<\s*5\s*%/i,
      /\b5\s*[–-]\s*15\s*%/i,
      /confidence signal/i,
      /target\s*<?\s*\d+\s*%\s*reversion/i,
    ],
  },
  {
    skill: 'intent-preview',
    cap: 25,
    hard: ['Wait for accept', 'read-only', 'never self-approve', 'spec-check approve', 'TTY'],
    forbidden: [/>\s*85\s*%/i, /accept rate/i, /track accept/i],
  },
  {
    skill: 'research-protocol',
    hard: [
      'checkEvidenceBundle',
      'estimand',
      'observations',
      'leakageCheck',
      'claimScope',
    ],
  },
  {
    skill: 'acquiring-capabilities',
    hard: ['get approval before installing', 'Never auto-install', 'postinstall'],
  },
  {
    skill: 'reverse-engineering',
    hard: [
      'Never patch or mutate',
      'S-tier',
      'Fail-closed',
      'observation / derivation / inference / unknown',
    ],
  },
  {
    skill: 'colab-lifecycle',
    hard: [
      'runtime.unassign()',
      'classify evidence',
      'VERIFIED_RELEASED',
      'Never reconnect',
    ],
  },
  {
    skill: 'web-game-development',
    cap: 155,
    hard: [
      'S-tier is a gate',
      'stable 60 fps',
      'Refuse to call a build S-tier',
      'S-tier evidence table',
      H3,
    ],
  },
  {
    skill: 'ui-review',
    cap: 25,
    hard: [
      'Never review from memory',
      'raw.githubusercontent.com/vercel-labs/web-interface-guidelines',
      'If the fetch fails, stop',
      'review nothing',
      'fails closed',
    ],
  },
  {
    skill: 'writing-release-notes',
    hard: ['Breaking', '/release', 'explicit human approval', 'read-only'],
  },
];

// Route contracts: one handoff assertion each (AC1, AC9).
const CONTENT = [
  { skill: 'brainstorming', hard: ['threat-model'] },
  { skill: 'systematic-debugging', hard: ['diagnosing-sdlc'] },
];

// Evidence contracts: six domain/meta skills must cite a measurable check
// (AC4–AC9).
const EVIDENCE = [
  {
    skill: 'adr',
    cap: 30,
    hard: [
      'only the Status line may change',
      'superseded by NNNN',
      'links the decision it replaces',
    ],
    forbidden: [/never edit an accepted adr/i],
  },
  {
    skill: 'simplified-technical-english',
    cap: 80,
    hard: [
      'rules 1–20',
      'eval/research/2026-10-04-asd-ste100.md',
      'STE-informed',
      'not the standard',
    ],
    forbidden: [
      /~\s*80\s*%/i,
      /\babout\s+80\s*%/i,
      /\b80\s*%\s*of\s*the\s*way/i,
      /ASD-STE100 compliant/i,
    ],
  },
  {
    skill: 'incident-postmortem',
    cap: 35,
    hard: [
      'owner',
      'date',
      'recurrence-prevention verification',
      'docs/debt-ledger.md',
      'fails if the cause returns',
    ],
  },
  {
    skill: 'dependency-upgrade',
    cap: 35,
    hard: [
      'audit',
      'advisory ID',
      'one package',
      'lockfile diff assertion',
      'runtime smoke',
      'rollback path',
    ],
  },
  {
    skill: 'evolving-schemas',
    cap: 35,
    hard: ['zero old-shape reads', 'metric', 'idempotent', 'rollback'],
  },
  {
    skill: 'diagnosing-sdlc',
    cap: 25,
    hard: [
      'Inbound route',
      'two identical diagnoses',
      'stop and escalate',
      'systematic-debugging',
    ],
  },
];

function contractTest(group, contract) {
  test(`${group}: ${contract.skill}`, () => {
    assert.ok(skillNames.includes(contract.skill), `unknown skill ${contract.skill}`);
    const text = read(contract.skill);
    const body = prose(text);
    for (const rule of contract.hard) {
      assert.ok(
        body.includes(collapse(rule)),
        `${contract.skill}: missing hard rule ${JSON.stringify(rule)}`,
      );
    }
    for (const pattern of contract.forbidden || []) {
      assert.doesNotMatch(text, pattern, `${contract.skill}: matches forbidden ${pattern}`);
    }
    if (contract.cap !== undefined) {
      const lines = lineCount(text);
      assert.ok(lines <= contract.cap, `${contract.skill}: ${lines} lines (cap ${contract.cap})`);
    }
  });
}

for (const contract of SPECIFIC) contractTest('specific', contract);
for (const contract of CONTENT) contractTest('specific', contract);
for (const contract of EVIDENCE) contractTest('evidence', contract);

test('mappings: no skill carries pending', () => {
  const pending = Object.entries(SKILLS)
    .filter(([, entry]) => entry && typeof entry === 'object' && Object.hasOwn(entry, 'pending'))
    .map(([name]) => name);
  assert.deepEqual(pending, [], `skills still carry pending: ${pending.join(', ')}`);
});

test('release: command', () => {
  const file = path.join(root, '.opencode/commands/release.md');
  assert.ok(fs.existsSync(file), '.opencode/commands/release.md must exist');
  const text = fs.readFileSync(file, 'utf8');
  assert.ok(field(text, 'description'), 'release.md must declare a description');
  assert.equal(field(text, 'agent'), 'build', 'release.md must declare agent: build');
  const body = prose(text);
  for (const needle of [
    'read-only',
    'writing-release-notes',
    'explicit human approval',
    'Do not tag',
  ]) {
    assert.ok(
      body.includes(collapse(needle)),
      `release.md body must contain ${JSON.stringify(needle)}`,
    );
  }
});

test('writing-skills: prose names the coverage entry rule', () => {
  const body = prose(read('writing-skills'));
  for (const needle of ['eval/coverage.mjs', 'probe', 'exempt']) {
    assert.ok(
      body.includes(needle),
      `writing-skills body must contain ${JSON.stringify(needle)}`,
    );
  }
});

test('status command: reports 40 project skills, not 60', () => {
  const text = fs.readFileSync(
    path.join(root, '.opencode/commands/sdlc-lean.md'),
    'utf8',
  );
  const line = text.split(/\r?\n/).find((row) => row.startsWith('!`'));
  assert.ok(line, 'status command must contain a !`…` line');
  const script = line.slice(2, -1);

  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-status-'));
  try {
    const result = spawnSync('bash', ['-c', script], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        XDG_STATE_HOME: path.join(home, '.local', 'state'),
      },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /project skills: 40/, result.stdout);
    assert.doesNotMatch(result.stdout, /project skills: 60/, result.stdout);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});
