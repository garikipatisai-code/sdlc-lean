// Clustering tests for scripts/research/cluster.mjs (node --test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const modURL = pathToFileURL(path.resolve(import.meta.dirname, '../../../scripts/research/cluster.mjs')).href;
const mod = await import(modURL);

/** 12 questions forming 6 pairs: qNa/qNb with pairId pN. */
function pairedFixture() {
  const questions = [];
  for (let i = 1; i <= 6; i++) {
    questions.push({ id: `q${i}a`, pairId: `p${i}` });
    questions.push({ id: `q${i}b`, pairId: `p${i}` });
  }
  return questions;
}

test('paired fixture co-clusters: every pair shares one cluster, cohesion === 1', () => {
  const questions = pairedFixture();
  const out = mod.clusterQuestions(questions, { seed: 7, k: 3 });
  assert.equal(out.length, questions.length);
  assert.deepEqual(out.map((a) => a.id), questions.map((q) => q.id), 'assignments must follow INPUT order');
  for (const a of out) {
    assert.ok(Number.isInteger(a.cluster) && a.cluster >= 0 && a.cluster < 3, `cluster in [0,3): ${a.id}`);
  }
  for (let i = 1; i <= 6; i++) {
    const ca = out.find((a) => a.id === `q${i}a`).cluster;
    const cb = out.find((a) => a.id === `q${i}b`).cluster;
    assert.equal(ca, cb, `pair p${i} must co-cluster`);
  }
  assert.equal(mod.pairCohesion(out), 1);
});

test('determinism: same seed gives identical assignments even under hostile Math.random', (t) => {
  const questions = pairedFixture();
  const first = mod.clusterQuestions(questions, { seed: 7, k: 3 });
  const second = mod.clusterQuestions(questions, { seed: 7, k: 3 });
  assert.deepEqual(first, second);
  const orig = Math.random;
  t.after(() => {
    Math.random = orig;
  });
  Math.random = () => 0.999999;
  const hostile = mod.clusterQuestions(questions, { seed: 7, k: 3 });
  assert.deepEqual(hostile, first, 'ambient Math.random must not affect assignments');
});

test('seed sensitivity: seeds 7 vs 8 give different assignments', () => {
  const questions = pairedFixture();
  const a = mod.clusterQuestions(questions, { seed: 7, k: 3 });
  const b = mod.clusterQuestions(questions, { seed: 8, k: 3 });
  const differs = a.some((row, i) => row.cluster !== b[i].cluster);
  assert.equal(differs, true, 'different seeds must assign at least one question differently');
});

test('validation: empty, k=0, k>n, duplicate id all throw', () => {
  const questions = pairedFixture();
  assert.throws(() => mod.clusterQuestions([], { seed: 7, k: 2 }));
  assert.throws(() => mod.clusterQuestions(questions, { seed: 7, k: 0 }));
  assert.throws(() => mod.clusterQuestions(questions, { seed: 7, k: questions.length + 1 }));
  assert.throws(() => mod.clusterQuestions([{ id: 'q1' }, { id: 'q1' }], { seed: 7, k: 2 }));
  assert.throws(() => mod.clusterQuestions([{ id: 42 }], { seed: 7, k: 1 }));
  assert.throws(() => mod.clusterQuestions([{ id: null }], { seed: 7, k: 1 }));
});

test('provenance: frozen seed recorded in run log via stampClustering', () => {
  const log = { protocol: 'p', amendments: [] };
  const stamped = mod.stampClustering(log, { seed: 7, k: 3 });
  assert.deepEqual(stamped.clustering, { seed: 7, k: 3 });
  assert.equal(stamped.protocol, 'p');
  assert.notEqual(stamped, log, 'must return a new object');
  assert.ok(!('clustering' in log), 'must not mutate the input log');
});

test('pairCohesion partial: one split pair of six gives 5/6', () => {
  const assignments = [];
  for (let i = 1; i <= 6; i++) {
    const cluster = i === 6 ? undefined : 0;
    assignments.push({ id: `q${i}a`, pairId: `p${i}`, cluster: i === 6 ? 0 : cluster });
    assignments.push({ id: `q${i}b`, pairId: `p${i}`, cluster: i === 6 ? 1 : cluster });
  }
  assert.equal(mod.pairCohesion(assignments), 5 / 6);
});

test('resampling: pair cohesion holds across seeds 1..10', () => {
  const questions = pairedFixture();
  for (let seed = 1; seed <= 10; seed += 1) {
    const out = mod.clusterQuestions(questions, { seed, k: 3 });
    assert.equal(mod.pairCohesion(out), 1.0, `pair cohesion must hold for seed ${seed}`);
  }
});

test('resampling: cohesion survives question subsampling', () => {
  const questions = pairedFixture().slice(0, 8);
  assert.equal(questions.length, 8, 'subsample drops 2 pairs (8 questions / 4 pairs)');
  const first = mod.clusterQuestions(questions, { seed: 7, k: 2 });
  assert.equal(mod.pairCohesion(first), 1.0, 'subsampled pairs must co-cluster');
  const second = mod.clusterQuestions(questions, { seed: 7, k: 2 });
  assert.deepEqual(second, first, 'subsampled clustering must be deterministic across runs');
});
