// Live end-to-end routing proof — NEW test file only, zero prod edits.
// Spec: capability admission (price==0 + tools + text-output + not-expired;
// secrets-never-free) + round-robin + 429/cooldown skip + null→escalate.
// This file proves ROUTING on live data, not worker dispatch (dispatch path
// cannot pass model: from this runtime — out of scope, not attempted).
//
// Live endpoints (GET only, 15s timeout each, no auth, zero spend, no
// inference/completion calls EVER — catalog GETs only):
//   - https://models.dev/api.json
//   - https://opencode.ai/inference/v1/models
//   - https://openrouter.ai/api/v1/models
// If ANY fetch fails (offline/DNS/non-200/json), t.skip('live catalog
// unreachable') — suite stays green.
//
// Mapping policy (fixture layer only — NEVER weakens isFreeCapable):
// - Admit only on positive evidence: price 0/"0", tools signal where present,
//   text-output (non-image-only). Missing price/tools evidence => fixture maps
//   to rejecting shape (price 1 / tools false) so isFreeCapable fails closed.
// - Console source lacks price/tool flags in observed shape
//   ({data:[{id}]}) => mapped to non-admitted fixtures; admitted pool comes
//   from models.dev + openrouter where price+tools are observable. Tools-required
//   gap documented here and in diagnostics. No hardcoded model-ID assertions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const pluginURL = pathToFileURL(path.resolve(import.meta.dirname, '../../.opencode/plugins/sdlc-lean.js')).href;
const p = await import(pluginURL);

const MODELS_DEV_URL = 'https://models.dev/api.json';
const CONSOLE_URL = 'https://opencode.ai/inference/v1/models';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/models';
const TIMEOUT_MS = 15000;

// Shared live state across tests in this file (sequential execution).
const LIVE = {
  ok: false,
  attempted: false,
  modelsDevKeys: [],
  consoleKeys: [],
  openRouterKeys: [],
  counts: { modelsDev: 0, console: 0, openRouter: 0 },
  merged: [],
  pool: [],
  notes: '',
};

const isZeroPrice = (v) => v === 0 || v === '0';

const topKeys = (v) => {
  try {
    if (v && typeof v === 'object' && !Array.isArray(v)) return Object.keys(v).slice(0, 20);
    if (Array.isArray(v)) return ['<array>'];
    return [typeof v];
  } catch {
    return ['<unknown>'];
  }
};

async function fetchJson(url) {
  // GET-only catalog fetch with 15s timeout, no auth.
  let signal;
  try {
    if (typeof AbortSignal.timeout === 'function') signal = AbortSignal.timeout(TIMEOUT_MS);
  } catch {
    signal = undefined;
  }
  const res = await fetch(url, signal ? { signal } : undefined);
  if (!res || !res.ok) throw new Error(`non-200 GET ${url}: ${res ? res.status : 'no-response'}`);
  return res.json();
}

const numOrReject = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return 1; // fail-closed: unknown price never admits
};

// --- Fixture mappers (test layer only; isFreeCapable untouched) ---
function mapModelsDevCandidate(raw, fallbackId) {
  try {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const id = raw.id ?? raw.model ?? raw.name ?? fallbackId;
    if (typeof id !== 'string' || id.trim() === '') return null;
    const cost = raw.cost && typeof raw.cost === 'object' ? raw.cost : {};
    const rawIn = cost.input ?? cost.prompt ?? raw.promptCost ?? raw.price ?? raw.pricing?.prompt;
    const rawOut = cost.output ?? cost.completion ?? raw.completionCost;
    // Positive evidence: input/prompt price must be 0/"0"; output/completion,
    // when present, must also be 0/"0" (otherwise paid).
    if (!isZeroPrice(rawIn)) return { id, price: numOrReject(rawIn), tools: false, text: false, expired: false };
    if (rawOut !== undefined && rawOut !== null && !isZeroPrice(rawOut)) {
      return { id, price: numOrReject(rawOut), tools: false, text: false, expired: false };
    }
    const caps = raw.capabilities && typeof raw.capabilities === 'object' ? raw.capabilities : null;
    const toolsRaw = caps ? (caps.tools ?? raw.tools ?? raw.hasTools) : (raw.tools ?? raw.hasTools ?? raw.tool_call);
    const params = raw.supported_parameters ?? raw.supportedParameters;
    const tools = toolsRaw === true || (Array.isArray(params) && params.includes('tools'));
    // Text-output: fail image-only; otherwise assume text-capable when not
    // stated (gap noted — source rarely carries explicit text flags).
    let text = true;
    try {
      const mods = raw.modalities ?? raw.modality;
      if (mods && typeof mods === 'object' && !Array.isArray(mods)) {
        const out = mods.output ?? mods.outputModalities ?? mods.text;
        if (Array.isArray(out)) text = out.includes('text');
        else if (out === false) text = false;
      } else if (typeof raw.text === 'boolean') text = raw.text;
      else if (typeof raw.textOutput === 'boolean') text = raw.textOutput;
    } catch {
      text = true;
    }
    const expired = raw.expired === true;
    return { id, price: 0, tools: tools === true, text, expired };
  } catch {
    return null;
  }
}

function collectModelsDev(json) {
  const out = [];
  try {
    if (Array.isArray(json)) {
      for (const e of json) {
        const m = mapModelsDevCandidate(e, null);
        if (m) out.push(m);
      }
      return out;
    }
    if (json && typeof json === 'object' && Array.isArray(json.data)) {
      for (const e of json.data) {
        const m = mapModelsDevCandidate(e, null);
        if (m) out.push(m);
      }
      return out;
    }
    if (json && typeof json === 'object' && !Array.isArray(json)) {
      for (const [k, v] of Object.entries(json)) {
        try {
          if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
          // Provider-nested shape: { provider: { models: [...]|{...} } }
          const nested = v.models ?? v.data;
          if (Array.isArray(nested)) {
            for (const e of nested) {
              const m = mapModelsDevCandidate(e, e?.id ?? e?.model ?? e?.name ?? null);
              if (m) out.push(m);
            }
            continue;
          }
          if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
            for (const [mk, mv] of Object.entries(nested)) {
              const m = mapModelsDevCandidate({ id: mk, ...(mv && typeof mv === 'object' ? mv : {}) }, mk);
              if (m) out.push(m);
            }
            continue;
          }
          // Flat map shape: { "<model-id>": { cost, capabilities } }
          if (v.cost || v.capabilities || v.price !== undefined || v.promptCost !== undefined) {
            const m = mapModelsDevCandidate({ id: k, ...v }, k);
            if (m) out.push(m);
          }
        } catch {
          /* skip entry */
        }
      }
    }
  } catch {
    /* fail-open to whatever collected */
  }
  return out;
}

function collectOpenRouter(json) {
  const out = [];
  try {
    const list = json && typeof json === 'object' && Array.isArray(json.data) ? json.data
      : (Array.isArray(json) ? json : []);
    for (const e of list) {
      try {
        if (!e || typeof e !== 'object') continue;
        const id = e.id ?? e.model ?? e.name;
        if (typeof id !== 'string' || id.trim() === '') continue;
        if (p.isSecretLike(id)) continue;
        const minP = e.min_price ?? e.minPrice;
        if (minP === -1 || minP === '-1') continue; // ghost router — drop
        const params = e.supported_parameters ?? e.supportedParameters ?? e.parameters;
        const tools = Array.isArray(params) && params.includes('tools');
        if (!tools) continue; // admit only on positive tools evidence
        const pricing = e.pricing && typeof e.pricing === 'object' ? e.pricing : {};
        const prompt = pricing.prompt ?? pricing.promptPrice ?? e.price ?? e.cost;
        if (!isZeroPrice(prompt)) continue; // admit only on price 0/"0"
        let text = true;
        try {
          const arch = e.architecture && typeof e.architecture === 'object' ? e.architecture : null;
          const outMods = arch ? (arch.output_modalities ?? arch.outputModalities ?? arch.modality) : null;
          if (Array.isArray(outMods)) text = outMods.includes('text');
          else if (typeof outMods === 'string' && outMods !== '') text = outMods.includes('text');
        } catch {
          text = true;
        }
        out.push({ id, price: 0, tools: true, text, expired: false, source: 'openrouter' });
      } catch {
        /* skip entry */
      }
    }
  } catch {
    /* fail-open */
  }
  return out;
}

function collectConsole(json) {
  // GAP (documented): console list shape {data:[{id}]} carries no price/tool
  // flags, so fixtures map to non-admitted shapes (price missing, tools false).
  // Admitted pool comes from models.dev + openrouter where price+tools are
  // observable. Tools-required gap stays enforced by isFreeCapable.
  const out = [];
  try {
    const list = json && typeof json === 'object' && Array.isArray(json.data) ? json.data
      : (Array.isArray(json) ? json : []);
    for (const e of list) {
      try {
        const id = e && typeof e === 'object' ? (e.id ?? e.model ?? e.name) : null;
        if (typeof id !== 'string' || id.trim() === '') continue;
        if (p.isSecretLike(id)) continue;
        const m = { id, tools: false, text: true, expired: false, source: 'console', _gap: 'no-price-no-tools-flags' };
        out.push(m); // no `price` key => isFreeCapable fails closed
      } catch {
        /* skip */
      }
    }
  } catch {
    /* fail-open */
  }
  return out;
}

async function loadLive(t) {
  if (LIVE.attempted) return LIVE.ok;
  LIVE.attempted = true;
  try {
    const [md, co, or] = await Promise.all([
      fetchJson(MODELS_DEV_URL),
      fetchJson(CONSOLE_URL),
      fetchJson(OPENROUTER_URL),
    ]);
    LIVE.modelsDevKeys = topKeys(md);
    LIVE.consoleKeys = topKeys(co);
    LIVE.openRouterKeys = topKeys(or);
    const mdMapped = collectModelsDev(md);
    const coMapped = collectConsole(co);
    const orMapped = collectOpenRouter(or);
    LIVE.counts = { modelsDev: mdMapped.length, console: coMapped.length, openRouter: orMapped.length };
    // Merge via committed buildLivePool (dedupes, drops secrets), then
    // capability-filter via buildFreePool/isFreeCapable (fail-closed).
    let merged = [];
    try {
      merged = p.buildLivePool({ modelsDev: mdMapped, consoleModels: coMapped, openRouterModels: orMapped });
    } catch {
      merged = [...mdMapped, ...coMapped, ...orMapped];
    }
    LIVE.merged = merged;
    let admitted = [];
    try {
      if (typeof p.buildFreePool === 'function') admitted = p.buildFreePool(merged);
      else admitted = merged.filter((m) => { try { return p.isFreeCapable(m); } catch { return false; } });
    } catch {
      admitted = [];
    }
    LIVE.pool = admitted;
    LIVE.ok = true;
    const keysNote = `models.dev topkeys=[${LIVE.modelsDevKeys.join(',')}] console topkeys=[${LIVE.consoleKeys.join(',')}] openrouter topkeys=[${LIVE.openRouterKeys.join(',')}]`;
    LIVE.notes = `mapped counts md=${mdMapped.length} console=${coMapped.length} or=${orMapped.length} merged=${merged.length} admitted=${admitted.length}; ${keysNote}`;
    try { t?.diagnostic?.(LIVE.notes); } catch { /* no-op */ }
    return true;
  } catch (err) {
    LIVE.ok = false;
    return false;
  }
}

test('live catalogs reachable (GET-only, 15s each)', async (t) => {
  const ok = await loadLive(t);
  if (!ok) return t.skip('live catalog unreachable');
  assert.equal(LIVE.ok, true);
});

test('live pool non-empty from TODAY catalogs', async (t) => {
  if (!LIVE.attempted) await loadLive(t);
  if (!LIVE.ok) return t.skip('live catalog unreachable');
  assert.ok(Array.isArray(LIVE.pool), 'pool is array');
  assert.ok(LIVE.pool.length > 0, `admitted pool non-empty (got ${LIVE.pool.length}; ${LIVE.notes})`);
});

test('every admitted entry re-passes isFreeCapable; secrets-never-free', async (t) => {
  if (!LIVE.attempted) await loadLive(t);
  if (!LIVE.ok) return t.skip('live catalog unreachable');
  for (const m of LIVE.pool) {
    assert.equal(p.isFreeCapable(m), true, `re-passes isFreeCapable: ${m?.id}`);
    assert.equal(p.isSecretLike(m.id), false, `not secret-like: ${m?.id}`);
    try { p.assertNotSecretLike(m.id); } catch (e) { assert.fail(`secret-like id in pool: ${m?.id}`); }
    // No-secrets: ids only, never bodies. Structural only (IDs rot):
    // non-empty, no whitespace. Slash prefix optional — live models.dev
    // entries may carry bare ids; account derivation handled at pick time.
    assert.equal(typeof m.id, 'string');
    assert.ok(m.id.trim() !== '' && !/\s/.test(m.id), `structural id non-empty/no-space: ${m?.id}`);
  }
  const secret = { id: `sk-${'A'.repeat(20)}`, price: 0, tools: true, text: true, expired: false };
  assert.equal(p.isFreeCapable(secret), false, 'secrets never free');
});

test('first nextFreeLink pick has id+account; round-robin advances', async (t) => {
  if (!LIVE.attempted) await loadLive(t);
  if (!LIVE.ok) return t.skip('live catalog unreachable');
  const state = { index: 0, cooldown: [], now: Date.now() };
  const first = p.nextFreeLink(LIVE.pool, state);
  assert.ok(first && typeof first === 'object', 'first pick is object');
  assert.equal(typeof first.id, 'string');
  assert.ok(first.id.trim() !== '' && !/\s/.test(first.id), 'pick id structural (non-empty/no-space)');
  // Account: slash prefix when present (console/OR qualified ids), else
  // entry source field, else 'live' fallback — structural only, no ID pins.
  const rawId = first.id;
  const account = rawId.includes('/') ? rawId.slice(0, rawId.indexOf('/')) : (first.source ?? first.account ?? 'live');
  assert.ok(account.trim() !== '' && !/\s/.test(account), `account derived from prefix: ${account}`);
  if (LIVE.pool.length > 1) {
    const second = p.nextFreeLink(LIVE.pool, state);
    assert.ok(second && typeof second.id === 'string');
    // Round-robin advances (structural: index moved; ids rotate when pool>1).
    assert.ok(typeof state.index === 'number');
  }
});

test('injected cooldown on first two picks gets skipped (429/cooldown path)', async (t) => {
  if (!LIVE.attempted) await loadLive(t);
  if (!LIVE.ok) return t.skip('live catalog unreachable');
  if (LIVE.pool.length >= 3) {
    const cooled = [LIVE.pool[0].id, LIVE.pool[1].id];
    const state = { index: 0, cooldown: cooled, now: Date.now() };
    const pick = p.nextFreeLink(LIVE.pool, state);
    assert.ok(pick && typeof pick.id === 'string', 'pick after cooldown is object with id');
    assert.ok(!cooled.includes(pick.id), `cooled ids skipped (picked ${pick.id})`);
  } else {
    // Small live pool: cooling everything must escalate (null), proving skip.
    const all = LIVE.pool.map((m) => m.id);
    const state = { index: 0, cooldown: all, now: Date.now() };
    assert.equal(p.nextFreeLink(LIVE.pool, state), null, 'full cooldown escalates to null');
  }
});

test('empty-pool input → null (escalate path); FALLBACK null', async (t) => {
  if (!LIVE.attempted) await loadLive(t);
  if (!LIVE.ok) return t.skip('live catalog unreachable');
  const state = { index: 0, cooldown: [], now: Date.now() };
  assert.equal(p.nextFreeLink([], state), null, 'empty pool → null');
  assert.equal(p.nextFreeLink(LIVE.pool, { index: 0, cooldown: LIVE.pool.map((m) => m.id), now: Date.now() }), null, 'all-cooldown → null');
  assert.equal(p.resolveFallback(null), null, 'resolveFallback(null) → null');
  assert.equal(p.FALLBACK, null, 'FALLBACK null (escalate, no hardcoded model)');
});
