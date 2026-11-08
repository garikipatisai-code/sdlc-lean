// Structural permission gate for the trust-core agents and the security-audit
// route. Reads frontmatter with a line regex — no YAML dependency, no model
// calls. Contract: docs/plans/2026-10-30-trust-core-hardening.md (task 3, AC7).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const value = (raw) => raw.trim().replace(/^(["'])(.*)\1$/, '$2');

const frontmatter = (rel) => {
  const text = read(rel);
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, `${rel}: missing YAML frontmatter block`);
  return { text, yaml: match[1] };
};

// Top-level scalar (`key: value` at column 0).
const top = (yaml, key) => {
  const match = yaml.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  return match ? value(match[1]) : null;
};

// The indented lines of a top-level `name:` block.
const section = (yaml, name) => {
  const lines = yaml.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^${name}:\\s*$`).test(line));
  assert.ok(start >= 0, `missing "${name}:" block`);
  const picked = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.trim()) continue;
    if (!line.startsWith('  ')) break;
    picked.push(line);
  }
  return picked;
};

// `  key: value` inside a section.
const entry = (lines, key) => {
  const prefix = `  ${key}:`;
  const line = lines.find((l) => l.startsWith(prefix));
  return line ? value(line.slice(prefix.length)) : null;
};

// A nested two-space map (`  key:` followed by four-space children).
const map = (lines, key) => {
  const start = lines.findIndex((l) => l.trimEnd() === `  ${key}:`);
  if (start < 0) return null;
  const out = {};
  for (const line of lines.slice(start + 1)) {
    const match = line.match(/^ {4}(["']?)([^"':]+)\1:\s*(.*)$/);
    if (!match) break;
    out[match[2]] = value(match[3]);
  }
  return out;
};

// A V2 `permissions:` list of { action, resource, effect } maps.
const rules = (lines) => {
  const out = [];
  for (const line of lines) {
    const item = line.match(/^ {2}-\s+(\w+):\s*(.*)$/);
    if (item) {
      out.push({ [item[1]]: value(item[2]) });
      continue;
    }
    const pair = line.match(/^ {4}(\w+):\s*(.*)$/);
    if (pair && out.length > 0) out[out.length - 1][pair[1]] = value(pair[2]);
  }
  return out;
};

const WORKERS = [
  'explorer',
  'researcher',
  'planner',
  'implementer',
  'test-writer',
  'code-reviewer',
  'security-reviewer',
];

test('explorer.md: read-only reconnaissance (edit deny, bash ask)', () => {
  const { yaml } = frontmatter('.opencode/agents/explorer.md');
  const permission = section(yaml, 'permission');
  assert.equal(entry(permission, 'edit'), 'deny', 'explorer.md: permission.edit must be deny');
  assert.equal(entry(permission, 'bash'), 'ask', 'explorer.md: permission.bash must be ask');
  const task = map(permission, 'task');
  assert.ok(task, 'explorer.md: permission.task dispatch map must stay present');
  assert.equal(task['*'], 'deny', 'explorer.md: permission.task "*" must stay deny');
});


test('leaves (V1): task "*" deny — no delegation from workers', () => {
  for (const leaf of ['implementer', 'explorer', 'planner', 'researcher', 'code-reviewer', 'security-reviewer']) {
    const { yaml } = frontmatter(`.opencode/agents/${leaf}.md`);
    const permission = section(yaml, 'permission');
    const task = map(permission, 'task');
    assert.ok(task, `${leaf}.md: permission.task dispatch map must be present`);
    assert.equal(task['*'], 'deny', `${leaf}.md: permission.task "*" must be deny`);
  }
});

test('orchestrator.md: dispatches workers but never edits', () => {
  const { yaml } = frontmatter('.opencode/agents/orchestrator.md');
  const permission = section(yaml, 'permission');
  assert.equal(entry(permission, 'edit'), 'deny', 'orchestrator.md: permission.edit must be deny');
  const task = map(permission, 'task');
  assert.ok(task, 'orchestrator.md: permission.task dispatch map must stay present');
  assert.equal(task['*'], 'deny', 'orchestrator.md: permission.task "*" must stay deny');
  const missing = WORKERS.filter((worker) => task[worker] !== 'allow');
  assert.deepEqual(missing, [], `orchestrator.md: permission.task must still allow ${missing.join(', ')}`);
});

test('test-writer.md: V2 test-only edit scope', () => {
  const { text, yaml } = frontmatter('.opencode/agents/test-writer.md');
  assert.equal(top(yaml, 'permission'), null, 'test-writer.md: V1 singular "permission:" must not be used');
  assert.ok(!/^temperature:/m.test(yaml), 'test-writer.md: temperature is V1-only and must be removed');
  const permissions = section(yaml, 'permissions');
  assert.deepEqual(
    rules(permissions),
    [
      { action: 'edit', resource: '*', effect: 'deny' },
      { action: 'edit', resource: 'tests/**', effect: 'allow' },
      { action: 'shell', resource: '*', effect: 'ask' },
      { action: 'task', resource: '*', effect: 'deny' },
    ],
    'test-writer.md: permissions must be edit "*" deny, then edit "tests/**" allow, then shell "*" ask, then task "*" deny',
  );
  assert.match(
    text,
    /production edits?[\s\S]{0,80}implementer|implementer[\s\S]{0,80}production edits?/i,
    'test-writer.md: body must hand production edits to implementer',
  );
});

test('security-audit command: routes to security-reviewer', () => {
  const { yaml } = frontmatter('.opencode/commands/security-audit.md');
  assert.equal(
    top(yaml, 'agent'),
    'security-reviewer',
    'security-audit.md: frontmatter must set agent: security-reviewer',
  );
});

test('Phase C T3 pin: test-writer scope throws outside tests/**, passes inside', async () => {
  const plugin = await import('../../.opencode/plugins/sdlc-lean.js');
  assert.equal(typeof plugin.checkAgentPathScope, 'function');
  assert.throws(() => plugin.checkAgentPathScope('test-writer', 'edit', 'src/app.js'), /outside tests/);
  assert.equal(plugin.checkAgentPathScope('test-writer', 'edit', 'tests/opencode/test-x.mjs'), true);
  assert.throws(() => plugin.checkAgentPathScope('test-writer', 'edit', '/repo/src/a.js'), /outside tests/);
  assert.equal(plugin.checkAgentPathScope('test-writer', 'edit', '/repo/tests/a.mjs'), true);
  assert.throws(() => plugin.checkAgentPathScope('test-writer', 'patch', { patchText: '*** Update File: src/a.js\n+x' }), /outside tests/);
  assert.equal(plugin.checkAgentPathScope('test-writer', 'patch', { patchText: '*** Update File: tests/a.mjs\n+x' }), true);
  assert.equal(plugin.checkAgentPathScope('test-writer', 'bash', 'src/app.js'), true);
  assert.equal(plugin.checkAgentPathScope('implementer', 'edit', 'src/app.js'), null);
  assert.equal(plugin.checkAgentPathScope(undefined, 'edit', 'src/app.js'), null);
});

test('Phase C T3 pin: reviewer allowlist passes node --test and git reads, refuses all else', async () => {
  const plugin = await import('../../.opencode/plugins/sdlc-lean.js');
  assert.equal(typeof plugin.checkReviewerBash, 'function');
  assert.equal(plugin.checkReviewerBash('code-reviewer', 'node --test tests/opencode/test-agent-permissions.mjs'), true);
  assert.equal(plugin.checkReviewerBash('code-reviewer', 'git status'), true);
  assert.equal(plugin.checkReviewerBash('code-reviewer', 'git diff --stat'), true);
  assert.equal(plugin.checkReviewerBash('code-reviewer', 'git log --oneline -5'), true);
  for (const cmd of [
    'rm -rf /tmp/x',
    'node scripts/research/phase.mjs',
    'node --test tests/x.mjs && rm -rf /tmp/x',
    'node --test tests/x.mjs | cat',
    'node --test tests/x.mjs > /tmp/out',
    '',
    '   ',
  ]) {
    assert.throws(() => plugin.checkReviewerBash('code-reviewer', cmd), /refused|empty/, cmd);
  }
  assert.equal(plugin.checkReviewerBash('implementer', 'rm -rf /'), null);
});

test('Phase C T3 round-2 pin: D1 chain, D2 unparseable, D3 .. escape', async () => {
  const plugin = await import('../../.opencode/plugins/sdlc-lean.js');
  assert.throws(() => plugin.checkReviewerBash('code-reviewer', 'node --test tests/x.mjs\nrm -rf /tmp/x'), /refused/);
  assert.throws(() => plugin.checkReviewerBash('code-reviewer', 'node --test tests/x.mjs&rm -rf /'), /refused/);
  assert.equal(plugin.checkReviewerBash('code-reviewer', 'node --test --test-name-pattern="foo"'), true);
  assert.equal(plugin.checkReviewerBash('code-reviewer', 'git diff abc123'), true);
  assert.throws(() => plugin.checkReviewerBash('code-reviewer', 'node --flag --test'), /refused/);
  assert.throws(() => plugin.checkAgentPathScope('test-writer', 'patch', { patchText: 'no paths here' }), /fail-closed/);
  assert.throws(() => plugin.checkAgentPathScope('test-writer', 'edit', []), /fail-closed/);
  assert.throws(() => plugin.checkAgentPathScope('test-writer', 'edit', { filePath: [] }), /fail-closed/);
  assert.equal(plugin.checkAgentPathScope('test-writer', 'patch', undefined), true);
  assert.equal(plugin.checkAgentPathScope('test-writer', 'patch', null), true);
  assert.equal(plugin.checkAgentPathScope('test-writer', 'patch', {}), true);
  assert.throws(() => plugin.checkAgentPathScope('test-writer', 'edit', 'tests/../src/app.js'), /outside tests/);
  assert.throws(() => plugin.checkAgentPathScope('test-writer', 'edit', '../tests/a.mjs'), /outside tests/);
  assert.equal(plugin.checkAgentPathScope('test-writer', 'edit', './tests/a.mjs'), true);
  assert.equal(plugin.checkAgentPathScope('test-writer', 'edit', '/a/tests/b.mjs'), true, 'absolute /tests/ tolerance kept (residual, no root anchoring)');
});

test('Phase C T3 seam pin: tasks 1-2 intact plus hooks unwired', async () => {
  const plugin = await import('../../.opencode/plugins/sdlc-lean.js');
  const phase = await import('../../scripts/research/phase.mjs');
  const T0 = Date.parse('2026-10-17T00:00:00.000Z');
  const at = (m) => new Date(T0 + m * 60_000);
  const iso = (m) => at(m).toISOString();
  const ledger = phase.createLedger({ taskId: 'task-1', authorizationRef: 'approval-001', now: at(0) });
  phase.openPhase(ledger, {
    phaseId: 'p1', authorizationRef: 'approval-001', deadlineUtc: iso(60), observationAllowanceMs: 10 * 60_000, now: at(0),
  });
  phase.resumePhase(ledger, { now: at(61) });
  assert.throws(() => phase.openPhase(ledger, {
    phaseId: 'p2', authorizationRef: 'approval-002', deadlineUtc: iso(120), observationAllowanceMs: 10 * 60_000,
    approval: {
      approved: true, approver: 'user', at: iso(62),
      scope: { taskId: 'task-1', phaseId: 'p2', authorizationRef: 'approval-002' },
    },
    now: at(61),
  }), /approval-required/);
  assert.equal(plugin.checkPhaseLedgerGate({}, undefined), null);
  assert.throws(() => plugin.checkPhaseLedgerGate(null, { phaseId: 'p1' }), /ledger-unreadable/);
  plugin.checkSafety('read', { filePath: 'src/index.ts' });
  plugin.checkSafety('bash', { command: 'git status' });
  const text = read('.opencode/plugins/sdlc-lean.js');
  const v1Start = text.indexOf("'tool.execute.before'");
  const v1 = text.slice(v1Start, v1Start + 500);
  assert.ok(!v1.includes('checkAgentPathScope') && !v1.includes('checkReviewerBash'), 'V1 hook stays unwired');
  const v2Start = text.indexOf("ctx.tool.hook('execute.before'");
  const v2 = text.slice(v2Start, v2Start + 500);
  assert.ok(!v2.includes('checkAgentPathScope') && !v2.includes('checkReviewerBash'), 'V2 hook stays unwired');
});

test('T2 pins: static model pins (free-first, account 1 = console-openrouter)', () => {
  const MINI = 'console-openrouter/nvidia/nemotron-3.5-super-vl:free';
  const ULTRA = 'console-openrouter/nvidia/nemotron-3.5-super-vl:free';
  const expected = {
    'implementer': MINI,
    'explorer': MINI,
    'test-writer': MINI,
    'planner': ULTRA,
    'code-reviewer': ULTRA,
    'security-reviewer': ULTRA,
    'researcher': ULTRA,
  };
  for (const [agent, want] of Object.entries(expected)) {
    const { yaml } = frontmatter(`.opencode/agents/${agent}.md`);
    assert.equal(top(yaml, 'model'), want, `${agent}.md: model must be ${want}`);
  }
});
