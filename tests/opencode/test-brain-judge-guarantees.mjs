// Structural guardrails for the brain-judge guarantees in orchestrator.md.
// Reads orchestrator.md + reviewer frontmatter only — no model calls, no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const doc = read('.opencode/agents/orchestrator.md');

const frontmatter = (rel) => {
  const text = read(rel);
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, `${rel}: missing YAML frontmatter block`);
  return { text, yaml: match[1] };
};
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
const entry = (lines, key) => {
  const prefix = `  ${key}:`;
  const line = lines.find((l) => l.startsWith(prefix));
  return line ? line.slice(prefix.length).trim().replace(/^["'](.*)["']$/, '$1') : null;
};
const map = (lines, key) => {
  const start = lines.findIndex((l) => l.trimEnd() === `  ${key}:`);
  if (start < 0) return null;
  const out = {};
  for (const line of lines.slice(start + 1)) {
    const match = line.match(/^ {4}(["']?)([^"':]+)\1:\s*(.*)$/);
    if (!match) break;
    out[match[2]] = match[3].trim().replace(/^["'](.*)["']$/, '$1');
  }
  return out;
};

test('critic gate: heading mandatory no exception', () => {
  assert.ok(doc.includes('### Critic gate (mandatory, no exception)'));
});

test('critic gate: every implementer/test-writer output reviewed before completion', () => {
  assert.ok(doc.includes("Every implementer/test-writer output → code-reviewer + security-reviewer pass on the orchestrator's model BEFORE any completion claim or close — no minor/docs exception."));
});

test('critic gate: reviewers run NO commands', () => {
  assert.ok(doc.includes('Reviewers run NO commands – evidence comes from implementer/test-writer only.'));
});

test('critic gate: D-015/D-019 unwired seams are debt not enforced', () => {
  assert.ok(doc.includes('Unwired seams are debt, not enforced: D-015 (`checkReviewerBash` read-only'));
  assert.ok(doc.includes('test allowlist) and D-019 (`checkImplementerBash`); no wiring promise. Reviewers'));
  assert.ok(doc.includes('are read-only: no bash, no fixes.'));
});

test('critic gate: reviewers are BRAIN tier on session model', () => {
  assert.ok(doc.includes('Reviewers = BRAIN tier = whatever model the orchestrator session runs (never hardcode a provider model).'));
});

test('critic gate: skipped gates recorded as debt + retro-sweep', () => {
  assert.ok(doc.includes('Skipped gates are debt: record in ledger + retro-sweep before close.'));
});

test('reviewer frontmatter: code-reviewer edit/bash/task deny', () => {
  const { yaml } = frontmatter('.opencode/agents/code-reviewer.md');
  const permission = section(yaml, 'permission');
  assert.equal(entry(permission, 'edit'), 'deny', 'code-reviewer edit must be deny');
  assert.equal(entry(permission, 'bash'), 'deny', 'code-reviewer bash must be deny');
  const task = map(permission, 'task');
  assert.ok(task, 'code-reviewer task map present');
  assert.equal(task['*'], 'deny', 'code-reviewer task "*" must be deny');
});

test('reviewer frontmatter: security-reviewer edit/bash/task deny', () => {
  const { yaml } = frontmatter('.opencode/agents/security-reviewer.md');
  const permission = section(yaml, 'permission');
  assert.equal(entry(permission, 'edit'), 'deny', 'security-reviewer edit must be deny');
  assert.equal(entry(permission, 'bash'), 'deny', 'security-reviewer bash must be deny');
  const task = map(permission, 'task');
  assert.ok(task, 'security-reviewer task map present');
  assert.equal(task['*'], 'deny', 'security-reviewer task "*" must be deny');
});

test('reviewer body: no commands no fixes', () => {
  const cr = read('.opencode/agents/code-reviewer.md');
  const sr = read('.opencode/agents/security-reviewer.md');
  assert.match(cr, /Read-only; no commands \(do not run bash\/shell\); no fixes\./);
  assert.match(sr, /Read-only; no commands \(do not run bash\/shell\); no fixes\./);
});

test('stop conditions: heading', () => {
  assert.ok(doc.includes('### Stop conditions'));
});

test('stop conditions: 2 no-progress loops', () => {
  assert.ok(doc.includes('- 2 no-progress loops → strategy change.'));
});

test('stop conditions: failure/uncertain outcome', () => {
  assert.ok(doc.includes('- Failure/uncertain outcome → stop + reconcile evidence; retry only under'));
  assert.ok(doc.includes('explicit, narrowly scoped approval.'));
});

test('stop conditions: at cap block ask extension', () => {
  assert.ok(doc.includes('- At cap → block + ask for an extension; never auto-extend and never auto-spend.'));
});

test('stop conditions: secrets never to free endpoint', () => {
  assert.ok(doc.includes('- Secrets never to any free endpoint.'));
});

test('escalation ladder: heading', () => {
  assert.ok(doc.includes('### Escalation ladder (hardship → brain pitches in)'));
});

test('escalation ladder: hardship trigger set', () => {
  assert.ok(doc.includes('- Hardship trigger: free worker reports `requires_clarification`, rework>1, low confidence, or 2 no-progress loops.'));
});

test('escalation ladder: SAME task on BRAIN', () => {
  assert.ok(doc.includes('- Response: orchestrator re-dispatches the SAME task on its own model (BRAIN, cap-counted, secrets never free) instead of downgrading quality.'));
});

test('escalation ladder: brain stuck → human approval', () => {
  assert.ok(doc.includes('- If the BRAIN attempt is also stuck: stop + reconcile evidence + explicit human approval.'));
});

test('escalation ladder: never silently accept degraded output', () => {
  assert.ok(doc.includes('- Never silently accept degraded output to save cost.'));
});

test('direction: ambiguous/complex defaults BRAIN rule', () => {
  assert.ok(doc.includes('Rule: ambiguous/complex synthesis defaults BRAIN; well-scoped execution defaults'));
  assert.ok(doc.includes('MUSCLE in the order above with file:line anchors + verbatim cmds + 3-5 steps +'));
  assert.ok(doc.includes('hashes. At cap: block, ask for extension, escalate — never auto-extend and never'));
  assert.ok(doc.includes('auto-spend. Secrets never to any free endpoint.'));
});

test('direction: fan-out first on ambiguous scope', () => {
  assert.ok(doc.includes('- Ambiguous scope → researcher/explorer fan-out first; never guess.'));
});

test('direction: rework>1 → consider BRAIN for reviewer', () => {
  assert.ok(doc.includes('- Rework>1 → split the task, enrich the brief, and consider BRAIN'));
  assert.ok(doc.includes("(orchestrator's own model) for the reviewer pass."));
});

test('direction: researcher BRAIN vs explorer MUSCLE table rows', () => {
  const section = doc.slice(doc.indexOf('## Model routing table'));
  const lines = section.split('\n');
  const researcher = lines.find((l) => l.trim().startsWith('| researcher (synthesis) |'));
  const explorer = lines.find((l) => l.trim().startsWith('| explorer (maps) |'));
  assert.ok(researcher, 'researcher row present');
  assert.ok(explorer, 'explorer row present');
  assert.match(researcher, /\|\s*BRAIN\s*\|/, 'researcher must be BRAIN');
  assert.match(explorer, /\|\s*MUSCLE\s*\|/, 'explorer must be MUSCLE');
});

test('ceiling: same-model ceiling statement', () => {
  assert.ok(doc.includes('- Same-model ceiling: delegation does not add intelligence. Orchestrator and'));
  assert.ok(doc.includes('workers run on the same underlying model family, so quality comes from brief'));
  assert.ok(doc.includes('quality, scope discipline, and verification — never from an extra hop.'));
});

test('ceiling: free-worker limits thin context', () => {
  assert.ok(doc.includes('- Free-worker limits: thin context. Every dispatch needs file:line anchors,'));
  assert.ok(doc.includes('verbatim commands, 3-5 steps max, expected exit codes, and prior hashes where'));
  assert.ok(doc.includes('relevant. Direct-free dispatches only for trivial docs (≤5 steps, no secrets).'));
});

test('D-019 debt pin: checkReviewerBash exists and stays unwired', async () => {
  const plugin = await import('../../.opencode/plugins/sdlc-lean.js');
  assert.equal(typeof plugin.checkReviewerBash, 'function');
  const text = read('.opencode/plugins/sdlc-lean.js');
  const v1Start = text.indexOf("'tool.execute.before'");
  const v1 = text.slice(v1Start, v1Start + 500);
  assert.ok(!v1.includes('checkReviewerBash'), 'V1 hook must stay unwired (debt)');
  const v2Start = text.indexOf("ctx.tool.hook('execute.before'");
  const v2 = text.slice(v2Start, v2Start + 500);
  assert.ok(!v2.includes('checkReviewerBash'), 'V2 hook must stay unwired (debt)');
});
