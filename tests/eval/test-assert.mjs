// Assertion-engine tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, passed } from '../../eval/lib/assert.mjs';

test('contains and not-contains', () => {
  const obs = { text: 'routed to brainstorming' };
  assert.ok(passed(evaluate([{ kind: 'contains', value: 'brainstorming' }], obs)));
  assert.ok(passed(evaluate([{ kind: 'not-contains', value: 'error' }], obs)));
  assert.ok(!passed(evaluate([{ kind: 'contains', value: 'missing' }], obs)));
});

test('skill and tool', () => {
  const obs = { skills: ['deep-research'], tools: ['read'] };
  assert.ok(passed(evaluate([{ kind: 'skill', value: 'deep-research' }], obs)));
  assert.ok(passed(evaluate([{ kind: 'tool', value: 'read' }], obs)));
  assert.ok(!passed(evaluate([{ kind: 'skill', value: 'brainstorming' }], obs)));
});

test('activated and blocked', () => {
  assert.ok(passed(evaluate([{ kind: 'activated' }], { activated: true })));
  assert.ok(passed(evaluate([{ kind: 'blocked' }], { blocked: true })));
  assert.ok(!passed(evaluate([{ kind: 'blocked' }], { blocked: false })));
});

test('unknown kind fails without throwing', () => {
  const r = evaluate([{ kind: 'nope' }], {});
  assert.equal(r[0].ok, false);
});
