// Autonomy-by-default posture tests (Task 4).
// Collapsed-whitespace substring asserts, existing contract style.
// No model calls, no network; pins verify scope discipline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const skillsDir = path.join(root, '.opencode/skills');
const read = (name) => fs.readFileSync(path.join(skillsDir, name, 'SKILL.md'), 'utf8');

const collapse = (text) => text.replace(/\s+/g, ' ').trim().toLowerCase();

// Body prose: everything after the frontmatter block, whitespace collapsed.
function prose(text) {
  const end = text.search(/\r?\n---\r?\n/);
  const body = end === -1 ? text : text.slice(end + 5);
  return collapse(body);
}

test('envelope-first is the default loop string', () => {
  const body = prose(read('using-sdlc-lean'));
  assert.ok(
    body.includes(
      collapse('Goal → draft envelope → one chat yes → commit envelope + auth ledger line → machine-approve → loop alone → machine-close'),
    ),
  );
});

test('/approve+hash survives only as fallback', () => {
  for (const name of ['using-sdlc-lean', 'intent-preview', 'writing-plans']) {
    const body = prose(read(name));
    assert.ok(body.includes(collapse('fallback-only')), `${name}: missing fallback-only`);
    assert.ok(body.includes('/approve'), `${name}: missing /approve`);
    assert.ok(body.includes('hash'), `${name}: missing hash`);
  }
});

test('uncertainty fans out subagents for cited evidence', () => {
  const loop = prose(read('autonomous-loop'));
  assert.ok(
    loop.includes(collapse('on any uncertainty fan out researcher/explorer subagents for cited evidence')),
  );
  const option = prose(read('option-selection'));
  assert.ok(option.includes(collapse('fan-out on any uncertainty')));
});

test('option matrix cells carry a fetched citation', () => {
  const body = prose(read('option-selection'));
  assert.ok(body.includes(collapse('every cell yes/no with a fetched citation')));
});

test('escalation carries evidence, never a bare question', () => {
  const loop = prose(read('autonomous-loop'));
  assert.ok(loop.includes(collapse('Escalation carries evidence/findings, never a bare question')));
  const sub = prose(read('subagent-driven-development'));
  assert.ok(
    sub.includes(collapse('escalate to the human with all evidence/findings, never a bare question')),
  );
});

test('pin: finishing-a-development-branch carries no new-default markers', () => {
  const body = prose(read('finishing-a-development-branch'));
  for (const marker of ['envelope-first', 'machine-approve', 'auto-default', 'auto default']) {
    assert.ok(!body.includes(collapse(marker)), `finishing must not contain ${JSON.stringify(marker)}`);
  }
});

test('pin: brainstorming carries no new-default markers', () => {
  const body = prose(read('brainstorming'));
  for (const marker of ['envelope-first', 'machine-approve', 'auto-default', 'auto default']) {
    assert.ok(!body.includes(collapse(marker)), `brainstorming must not contain ${JSON.stringify(marker)}`);
  }
});
