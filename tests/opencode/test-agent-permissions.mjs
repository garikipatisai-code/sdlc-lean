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
    ],
    'test-writer.md: permissions must be edit "*" deny, then edit "tests/**" allow, then shell "*" ask',
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
