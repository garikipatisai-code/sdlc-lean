// Dynamic free-model resolver (pure, stdlib-only, no network).
//
// resolveFreeModels(models, opts) -> string[] (new array)
// getFreeModelsCached(fetcher, { ttlMs, now, ...resolveOpts }) -> Promise<string[]>
//
// A model is free iff id starts with 'opencode-go/', cost data is present and
// all-zero, it is not denylisted, it is not secret-like, and (when required)
// it advertises tool-call capability. Anything empty/corrupt/throwing falls
// back to a copy of the default trio.

export const FALLBACK_TRIO = Object.freeze([
  'opencode-go/crouton-alpha-free',
  'opencode-go/beam-free',
  'opencode-go/iceman-contributor-free',
]);

const SECRET_RE = /secret|key|token/i;

// Normalize array/object capability entries: 'tool_call' | 'tool-call' | 'toolCall'
// Strict allowlist: toolcall/toolcalls/toolcalling only (bare 'tools' is NOT accepted).
function isToolCallName(value) {
  if (typeof value !== 'string') return false;
  const v = value.toLowerCase().replace(/[-_\s]+/g, '');
  return v === 'toolcall' || v === 'toolcalls' || v === 'toolcalling';
}

function hasToolCall(model) {
  for (const field of [model.capabilities, model.tools]) {
    if (Array.isArray(field)) {
      if (field.some(isToolCallName)) return true;
    } else if (field && typeof field === 'object') {
      if (field.tool_call === true || field.toolCall === true) return true;
      if (Object.entries(field).some(([k, v]) => v === true && isToolCallName(k))) return true;
    }
  }
  for (const flag of [
    'tool_call',
    'toolCall',
    'tool_calls',
    'toolCalls',
    'toolCalling',
    'supportsToolCall',
    'supportsTools',
  ]) {
    if (model[flag] === true) return true;
  }
  return false;
}

// True iff cost data is present and every supplied cost dimension is zero.
// Supports { cost: 0 } and { inputCost: 0, outputCost: 0 } (and nested
// cost: { input, output } / cost: { inputCost, outputCost } / cost: { total }).
// A partial split (only one of inputCost/outputCost) or missing cost rejects.
// Paid leak: when both split numbers are present, any present total/value must
// also be undefined or 0 (a non-zero total/value vetoes the free verdict).
function isFree(model) {
  const cost = model.cost;
  let hasTotal = false;
  let totalZero = false;
  if (typeof cost === 'number') {
    hasTotal = true;
    totalZero = cost === 0;
  } else if (cost && typeof cost === 'object') {
    const input =
      typeof cost.inputCost === 'number' ? cost.inputCost : cost.input;
    const output =
      typeof cost.outputCost === 'number' ? cost.outputCost : cost.output;
    const totalValueZero =
      (cost.total === undefined || cost.total === 0) &&
      (cost.value === undefined || cost.value === 0);
    if (typeof input === 'number' && typeof output === 'number') {
      hasTotal = true;
      totalZero = input === 0 && output === 0 && totalValueZero;
    } else if (typeof input === 'number' || typeof output === 'number') {
      hasTotal = true; // malformed partial split -> never free
      totalZero = false;
    } else if (typeof cost.total === 'number' || typeof cost.value === 'number') {
      hasTotal = true;
      totalZero = totalValueZero;
    }
  }

  const hasIn = typeof model.inputCost === 'number';
  const hasOut = typeof model.outputCost === 'number';
  if (hasIn || hasOut) {
    if (!hasIn || !hasOut) return false;
    if (model.inputCost !== 0 || model.outputCost !== 0) return false;
    if (hasTotal && !totalZero) return false;
    return true;
  }
  if (hasTotal) return totalZero;
  return false;
}

function fallbackCopy(fallback) {
  if (Array.isArray(fallback) && fallback.length > 0) return [...fallback];
  return [...FALLBACK_TRIO];
}

export function resolveFreeModels(models, opts = {}) {
  try {
    const { denylist, toolCallRequired = true, fallback } =
      opts && typeof opts === 'object' ? opts : {};
    if (!Array.isArray(models) || models.length === 0) {
      return fallbackCopy(fallback);
    }
    const deny = new Set(Array.isArray(denylist) ? denylist : []);
    const out = [];
    for (const model of models) {
      if (!model || typeof model !== 'object') continue;
      const id = model.id;
      if (typeof id !== 'string' || !id.startsWith('opencode-go/')) continue;
      if (SECRET_RE.test(id)) continue;
      if (deny.has(id)) continue;
      if (!isFree(model)) continue;
      if (toolCallRequired && !hasToolCall(model)) continue;
      out.push(id);
    }
    return out.length > 0 ? out : fallbackCopy(fallback);
  } catch {
    return fallbackCopy(opts && typeof opts === 'object' ? opts.fallback : undefined);
  }
}

// TTL memo keyed by fetcher identity + stable resolveOpts key. `now` may be a
// () => ms clock or a fixed ms number; defaults to Date.now(). Staleness bound:
// a cache hit may serve data up to ttlMs old (nowMs - hit.at < ttlMs); callers
// requiring freshness must use a shorter ttlMs or different fetcher/opts.
// On fetcher throw the trio copy is returned (and memoized for the ttl, so a
// failing fetcher is not hammered). Changing denylist, toolCallRequired, or
// fallback (or any resolveOpts key) changes optsKey and bypasses the cache.
const _cache = new WeakMap();

function stableStringify(value) {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

export async function getFreeModelsCached(fetcher, opts = {}) {
  const { ttlMs = 60000, now, ...resolveOpts } =
    opts && typeof opts === 'object' ? opts : {};
  const nowMs =
    typeof now === 'function' ? now() : typeof now === 'number' ? now : Date.now();
  const cacheable = typeof fetcher === 'function' || (fetcher && typeof fetcher === 'object');
  const optsKey = stableStringify(resolveOpts);

  if (cacheable) {
    const hit = _cache.get(fetcher);
    if (hit && hit.optsKey === optsKey && nowMs - hit.at < ttlMs) return [...hit.value];
  }

  let value;
  try {
    const raw = await fetcher();
    const models = Array.isArray(raw)
      ? raw
      : raw?.models ?? raw?.data?.models ?? raw?.data ?? null;
    value = resolveFreeModels(models, resolveOpts);
  } catch {
    value = resolveFreeModels(null, resolveOpts);
  }

  if (cacheable) _cache.set(fetcher, { at: nowMs, value: [...value], optsKey });
  return value;
}
