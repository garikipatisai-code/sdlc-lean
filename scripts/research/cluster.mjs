// Deterministic seed-driven clustering of questions (stdlib only).
import { createHash } from 'node:crypto';

/** Derive a uint32 PRNG key from the frozen seed via sha256. */
function seedToUint32(seed) {
  return createHash('sha256').update(String(seed)).digest().readUInt32BE(0);
}

/** Mulberry32 deterministic PRNG closed over a uint32 state. */
function mulberry32(state) {
  let a = state | 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministically assign each question to one of k clusters from the frozen seed only.
 * @param {Array<{id: string, pairId?: string}>} questions - input order is preserved in output
 * @param {{seed: unknown, k?: number}} opts - frozen seed (sole entropy source) and cluster count
 * @returns {Array<{id: string, cluster: number, pairId?: string}>} assignments in INPUT order
 */
export function clusterQuestions(questions, { seed, k = 2 } = {}) {
  if (!Array.isArray(questions) || questions.length === 0) throw new Error('questions must be a non-empty array');
  if (typeof k !== 'number' || !Number.isInteger(k) || k < 1) throw new Error(`k must be an integer >= 1 (got ${k})`);
  if (k > questions.length) throw new Error(`k (${k}) must not exceed question count (${questions.length})`);
  const seen = new Set();
  for (const q of questions) {
    if (!q || typeof q.id !== 'string') throw new Error(`question ids must be strings (got ${JSON.stringify(q?.id)})`);
    if (seen.has(q.id)) throw new Error(`duplicate question id: ${q.id}`);
    seen.add(q.id);
  }
  const pairs = new Map();
  const singletons = [];
  for (const q of questions) {
    if (typeof q.pairId === 'string') {
      if (!pairs.has(q.pairId)) pairs.set(q.pairId, []);
      pairs.get(q.pairId).push(q);
    } else {
      singletons.push(q);
    }
  }
  // Lone pairIds (occurring exactly once) draw as singletons, not as pairs.
  for (const [pairId, members] of [...pairs.entries()]) {
    if (members.length === 1) {
      singletons.push(members[0]);
      pairs.delete(pairId);
    }
  }
  const next = mulberry32(seedToUint32(seed));
  const clusterOf = new Map();
  for (const pairId of [...pairs.keys()].sort()) {
    const cluster = Math.floor(next() * k);
    for (const q of pairs.get(pairId)) clusterOf.set(q.id, cluster);
  }
  for (const q of [...singletons].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    clusterOf.set(q.id, Math.floor(next() * k));
  }
  return questions.map((q) =>
    typeof q.pairId === 'string'
      ? { id: q.id, cluster: clusterOf.get(q.id), pairId: q.pairId }
      : { id: q.id, cluster: clusterOf.get(q.id) },
  );
}

/**
 * Fraction of multi-member pairIds whose members all share one cluster (1 when no pairs).
 * @param {Array<{cluster: number, pairId?: string}>} assignments - clusterQuestions() output or hand-built rows
 * @returns {number} cohesion in [0,1]
 */
export function pairCohesion(assignments) {
  const groups = new Map();
  for (const a of assignments) {
    if (typeof a?.pairId !== 'string') continue;
    if (!groups.has(a.pairId)) groups.set(a.pairId, []);
    groups.get(a.pairId).push(a.cluster);
  }
  let pairs = 0;
  let cohesive = 0;
  for (const clusters of groups.values()) {
    if (clusters.length < 2) continue;
    pairs += 1;
    if (clusters.every((c) => c === clusters[0])) cohesive += 1;
  }
  return pairs === 0 ? 1 : cohesive / pairs;
}

/**
 * Return a shallow copy of the run log stamped with the frozen clustering seed.
 * @param {object} log - run log (plain object; never mutated)
 * @param {{seed: unknown, k: number}} opts - frozen clustering seed and cluster count
 * @returns {object} new log object with `clustering: {seed, k}`
 */
export function stampClustering(log, { seed, k }) {
  return { ...log, clustering: { seed, k } };
}
