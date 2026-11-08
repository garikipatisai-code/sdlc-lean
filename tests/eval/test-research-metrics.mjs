// Research metrics tests (Task 3, zero-dep deterministic, pure).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  retrievalPrecision,
  retrievalRecall,
  retrievalF1,
  factualConsistency,
  taskSuccess,
  tokenEfficiency,
  multiAttemptResolution,
} from '../../eval/lib/research-metrics.mjs';

test('retrieval precision/recall/F1 - perfect match', () => {
  const retrieved = ['a', 'b', 'c'];
  const relevant = ['a', 'b', 'c'];
  assert.equal(retrievalPrecision({ retrieved, relevant }), 1);
  assert.equal(retrievalRecall({ retrieved, relevant }), 1);
  assert.equal(retrievalF1({ retrieved, relevant }), 1);
});

test('retrieval precision/recall/F1 - partial overlap', () => {
  const retrieved = ['a', 'b', 'x'];
  const relevant = ['a', 'b', 'c'];
  assert.equal(retrievalPrecision({ retrieved, relevant }), 2 / 3);
  assert.equal(retrievalRecall({ retrieved, relevant }), 2 / 3);
  const f1 = retrievalF1({ retrieved, relevant });
  assert.ok(Math.abs(f1 - 2 / 3) < 1e-12);
});

test('retrieval precision/recall/F1 - no overlap', () => {
  const retrieved = ['x', 'y'];
  const relevant = ['a', 'b'];
  assert.equal(retrievalPrecision({ retrieved, relevant }), 0);
  assert.equal(retrievalRecall({ retrieved, relevant }), 0);
  assert.equal(retrievalF1({ retrieved, relevant }), 0);
});

test('retrieval empty/zero-div guards', () => {
  assert.equal(retrievalPrecision({ retrieved: [], relevant: ['a'] }), 0);
  assert.equal(retrievalRecall({ retrieved: ['a'], relevant: [] }), 0);
  assert.equal(retrievalF1({ retrieved: [], relevant: [] }), 0);
  assert.equal(retrievalPrecision({}), 0);
  assert.equal(retrievalRecall({}), 0);
  assert.equal(retrievalF1({}), 0);
});

test('retrieval handles duplicates as set membership', () => {
  const retrieved = ['a', 'a', 'b'];
  const relevant = ['a', 'b', 'b'];
  assert.equal(retrievalPrecision({ retrieved, relevant }), 1);
  assert.equal(retrievalRecall({ retrieved, relevant }), 1);
  assert.equal(retrievalF1({ retrieved, relevant }), 1);
});

test('factualConsistency - normal and edges', () => {
  assert.equal(factualConsistency({ supported: 8, total: 10 }), 0.8);
  assert.equal(factualConsistency({ supported: 10, total: 10 }), 1);
  assert.equal(factualConsistency({ supported: 0, total: 10 }), 0);
  assert.equal(factualConsistency({ supported: 0, total: 0 }), 0);
  assert.equal(factualConsistency({}), 0);
});

test('factualConsistency clamps supported to [0,total]', () => {
  assert.equal(factualConsistency({ supported: 12, total: 10 }), 1);
  assert.equal(factualConsistency({ supported: -1, total: 10 }), 0);
});

test('taskSuccess - normal and edges', () => {
  assert.equal(taskSuccess({ succeeded: 3, total: 4 }), 0.75);
  assert.equal(taskSuccess({ succeeded: 1, total: 1 }), 1);
  assert.equal(taskSuccess({ succeeded: 0, total: 5 }), 0);
  assert.equal(taskSuccess({ succeeded: 0, total: 0 }), 0);
  assert.equal(taskSuccess({}), 0);
});

test('tokenEfficiency - normal and edges', () => {
  assert.equal(tokenEfficiency({ output: 50, cost: 100 }), 0.5);
  assert.equal(tokenEfficiency({ output: 100, cost: 100 }), 1);
  assert.equal(tokenEfficiency({ output: 0, cost: 100 }), 0);
  assert.equal(tokenEfficiency({ output: 10, cost: 0 }), 0);
  assert.equal(tokenEfficiency({ output: 0, cost: 0 }), 0);
  assert.equal(tokenEfficiency({}), 0);
});

test('multiAttemptResolution - resolved after retry / total', () => {
  // attempts: resolved on 1st=false for retry, resolved eventually=true counts per case
  // API: { attempts } array of booleans (resolved on that attempt?) or objects.
  // Brief: resolved-after-retry/total.
  const attempts = [
    { resolved: true, attempt: 1 },
    { resolved: true, attempt: 2 },
    { resolved: false, attempt: 3 },
    { resolved: true, attempt: 3 },
  ];
  const r = multiAttemptResolution(attempts);
  assert.equal(r.resolvedAfterRetry, 2); // attempt 2 and attempt 3 resolved cases
  assert.equal(r.total, 4);
  assert.equal(r.rate, 0.5);
});

test('multiAttemptResolution - all first-attempt or all failed', () => {
  const first = [{ resolved: true, attempt: 1 }, { resolved: true, attempt: 1 }];
  assert.deepEqual(multiAttemptResolution(first), { resolvedAfterRetry: 0, total: 2, rate: 0 });
  const none = [{ resolved: false, attempt: 2 }, { resolved: false, attempt: 1 }];
  assert.deepEqual(multiAttemptResolution(none), { resolvedAfterRetry: 0, total: 2, rate: 0 });
});

test('multiAttemptResolution - empty/invalid guards', () => {
  assert.deepEqual(multiAttemptResolution([]), { resolvedAfterRetry: 0, total: 0, rate: 0 });
  assert.deepEqual(multiAttemptResolution(), { resolvedAfterRetry: 0, total: 0, rate: 0 });
  assert.deepEqual(multiAttemptResolution(null), { resolvedAfterRetry: 0, total: 0, rate: 0 });
});

test('multiAttemptResolution - accepts boolean attempt arrays (index+1 = attempt)', () => {
  // alternative form: [false, true] means resolved on attempt 2
  assert.deepEqual(multiAttemptResolution([false, true, false]), { resolvedAfterRetry: 1, total: 3, rate: 1 / 3 });
});

test('retrieval accepts iterables (Set) via Array.from with guard', () => {
  const retrieved = new Set(['a', 'b']);
  const relevant = new Set(['a', 'b', 'c']);
  assert.equal(retrievalPrecision({ retrieved, relevant }), 1);
  assert.equal(retrievalRecall({ retrieved, relevant }), 2 / 3);
  assert.equal(retrievalPrecision({ retrieved: 123, relevant: ['a'] }), 0);
  assert.equal(retrievalRecall({ retrieved: ['a'], relevant: 123 }), 0);
});

test('multiAttemptResolution rate is clamped to [0,1]', () => {
  const allRetry = [{ resolved: true, attempt: 2 }, { resolved: true, attempt: 3 }];
  const r = multiAttemptResolution(allRetry);
  assert.ok(r.rate >= 0 && r.rate <= 1);
  assert.equal(r.rate, 1);
  assert.deepEqual(multiAttemptResolution([]), { resolvedAfterRetry: 0, total: 0, rate: 0 });
});
