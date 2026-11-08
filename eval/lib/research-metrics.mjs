// Pure, zero-dep research metrics (deterministic, no network/fs).
// Retrieval metrics treat inputs as sets (duplicates ignored).

const toSet = (xs) => new Set(xs && typeof xs[Symbol.iterator] === 'function' ? Array.from(xs) : []);
const clamp01 = (n) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
const ratio = (num, den) => (den > 0 ? num / den : 0);

export function retrievalPrecision({ retrieved, relevant } = {}) {
  const R = toSet(retrieved);
  if (R.size === 0) return 0;
  const Rel = toSet(relevant);
  let tp = 0;
  for (const x of R) if (Rel.has(x)) tp++;
  return ratio(tp, R.size);
}

export function retrievalRecall({ retrieved, relevant } = {}) {
  const Rel = toSet(relevant);
  if (Rel.size === 0) return 0;
  const R = toSet(retrieved);
  let tp = 0;
  for (const x of Rel) if (R.has(x)) tp++;
  return ratio(tp, Rel.size);
}

export function retrievalF1(args = {}) {
  const p = retrievalPrecision(args);
  const r = retrievalRecall(args);
  return p + r > 0 ? (2 * p * r) / (p + r) : 0;
}

export function factualConsistency({ supported, total } = {}) {
  const t = Number.isFinite(total) ? Math.max(0, total) : 0;
  if (t === 0) return 0;
  const s = Number.isFinite(supported) ? Math.min(t, Math.max(0, supported)) : 0;
  return clamp01(s / t);
}

export function taskSuccess({ succeeded, total } = {}) {
  const t = Number.isFinite(total) ? Math.max(0, total) : 0;
  if (t === 0) return 0;
  const s = Number.isFinite(succeeded) ? Math.min(t, Math.max(0, succeeded)) : 0;
  return clamp01(s / t);
}

export function tokenEfficiency({ output, cost } = {}) {
  const c = Number.isFinite(cost) ? Math.max(0, cost) : 0;
  if (c === 0) return 0;
  const o = Number.isFinite(output) ? Math.max(0, output) : 0;
  return clamp01(o / c);
}

// multiAttemptResolution: accepts array of { resolved, attempt } objects,
// or array of booleans (index+1 = attempt number). Returns resolved-after-retry/total.
export function multiAttemptResolution(attempts) {
  const list = Array.isArray(attempts) ? attempts : [];
  let resolvedAfterRetry = 0;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    const resolved = typeof a === 'boolean' ? a : !!(a && a.resolved);
    const attempt = typeof a === 'boolean' ? i + 1 : Number(a && a.attempt);
    if (resolved && Number.isFinite(attempt) && attempt > 1) resolvedAfterRetry++;
  }
  const total = list.length;
  return {
    resolvedAfterRetry,
    total,
    rate: total > 0 ? clamp01(resolvedAfterRetry / total) : 0,
  };
}
