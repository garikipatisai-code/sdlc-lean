// Free-rotation cooldown hermetic tests (Task 4) — file-based JSONL store + ledger.
// Hermetic: tmp dirs via XDG_STATE_HOME override, no network, no spawn.
// Covers: read-empty, append+read-back, isCooling true/false/past-expiry,
// skip-cooled in resolveNextFreeLink, corrupt/missing fail-open, 500-row cap,
// ledger schema (model+account+effort/outcome, no prompts/outputs),
// billing-codes inert, secrets-never, hook 429/provider-error true + billing false,
// 0600/0700 modes, hash-only (no raw), symlink-safe. Both files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Isolate default state dir before importing the plugin (never touch real state).
process.env.XDG_STATE_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-lean-cooldown-state-'));

const pluginURL = pathToFileURL(path.resolve(import.meta.dirname, '../../.opencode/plugins/sdlc-lean.js')).href;
const p = await import(pluginURL);

const STRICT_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const SECRET = `sk-${'A'.repeat(24)}`;
const MODEL_A = 'opencode-go/beam-free';
const MODEL_B = 'opencode-go/crouton-alpha-free';
const ACCOUNT = 'opencode-go';

const makeStateDir = (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-cooldown-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};

const makeRoot = (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-cooldown-root-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
};

const readJsonl = (file) => {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, 'utf8').trim();
  if (!text) return [];
  return text.split('\n').filter(Boolean).map((line) => JSON.parse(line));
};

const futureIso = (ms = 5 * 60_000) => new Date(Date.now() + ms).toISOString();

test('exports exist + caps pinned (500-row/2MB, per-source caps)', () => {
  for (const fn of ['readCooldowns', 'isCoolingDownId', 'appendCooldown', 'appendLedger', 'resolveNextFreeLink', 'recordCooldownOnFailure', 'classifyQuotaError', 'capForFreeModel']) {
    assert.equal(typeof p[fn], 'function', fn);
  }
  assert.equal(p.COOLDOWN_MAX_ROWS, 500);
  assert.equal(p.LEDGER_MAX_ROWS, 500);
  assert.equal(p.COOLDOWN_MAX_BYTES, 2 * 1024 * 1024);
  assert.equal(p.LEDGER_MAX_BYTES, 2 * 1024 * 1024);
  assert.equal(p.LONGCAT_DAILY_CAP, 100);
  assert.equal(p.OR_FREE_DAILY_CAP, 50);
  assert.equal(p.OR_FREE_DAILY_CAP_WITH_CREDITS, 1000);
  assert.equal(p.OR_FREE_MINUTE_CAP, 20);
});

test('read-empty on fresh dir returns []', async (t) => {
  const dir = makeStateDir(t);
  assert.deepEqual(p.readCooldowns(dir), []);
  assert.equal(p.isCoolingDownId(MODEL_A, dir, Date.now()), false);
});

test('append + read-back round-trips cooldown row shape', async (t) => {
  const dir = makeStateDir(t);
  const until = futureIso();
  assert.equal(p.appendCooldown(dir, { model: MODEL_A, account: ACCOUNT, cooldown_until: until, circuit: 'OPEN' }), true);
  const rows = p.readCooldowns(dir);
  assert.equal(rows.length, 1);
  const row = rows[0];
  assert.equal(row.type, 'cooldown');
  assert.equal(row.model, MODEL_A);
  assert.equal(row.account, ACCOUNT);
  assert.equal(row.circuit, 'OPEN');
  assert.match(row.cooldown_until, STRICT_UTC);
  assert.equal(row.cooldown_until, until);
});

test('isCooling true when future, false when expired in past, false when absent', async (t) => {
  const dir = makeStateDir(t);
  const future = futureIso(10 * 60_000);
  const past = '2020-01-01T00:00:00.000Z';
  assert.equal(p.appendCooldown(dir, { model: MODEL_A, account: ACCOUNT, cooldown_until: future, circuit: 'OPEN' }), true);
  assert.equal(p.isCoolingDownId(MODEL_A, dir, Date.now()), true);
  const dirPast = makeStateDir(t);
  assert.equal(p.appendCooldown(dirPast, { model: MODEL_A, account: ACCOUNT, cooldown_until: past, circuit: 'OPEN' }), true);
  // Row is still readable (expiry filters cooling, not reads).
  assert.equal(p.readCooldowns(dirPast).length, 1);
  assert.equal(p.isCoolingDownId(MODEL_A, dirPast, Date.now()), false);
  assert.equal(p.isCoolingDownId('opencode-go/never-written-free', dirPast, Date.now()), false);
});

test('resolveNextFreeLink skips file-cooled id; null when all cooled (exhaustion)', async (t) => {
  const dir = makeStateDir(t);
  const pool = [MODEL_A, MODEL_B];
  assert.equal(p.appendCooldown(dir, { model: MODEL_A, account: ACCOUNT, cooldown_until: futureIso(), circuit: 'OPEN' }), true);
  assert.equal(p.resolveNextFreeLink(pool, MODEL_A, { stateDir: dir }), MODEL_B);
  assert.equal(p.appendCooldown(dir, { model: MODEL_B, account: ACCOUNT, cooldown_until: futureIso(), circuit: 'OPEN' }), true);
  assert.equal(p.resolveNextFreeLink(pool, MODEL_A, { stateDir: dir }), null);
});

test('recordCooldownOnFailure escalates to true on 429 (null-exhaustion signal)', async (t) => {
  const root = makeRoot(t);
  const res = p.recordCooldownOnFailure({ error: { status: 429 }, model: MODEL_A, account: ACCOUNT, effort: 'medium' }, root);
  assert.equal(res.escalated, true);
});

test('corrupt file fail-open: read [] + cooling false + selector allows', async (t) => {
  const dir = makeStateDir(t);
  fs.writeFileSync(p.cooldownPath(dir), 'not-json\n{{{bad\n');
  assert.deepEqual(p.readCooldowns(dir), []);
  assert.equal(p.isCoolingDownId(MODEL_A, dir, Date.now()), false);
  assert.equal(p.resolveNextFreeLink([MODEL_A, MODEL_B], MODEL_A, { stateDir: dir }), MODEL_B);
});

test('missing-dir fail-open: read [] + cooling false + selector allows, never throws', async (t) => {
  const dir = path.join(makeStateDir(t), 'does-not-exist');
  assert.deepEqual(p.readCooldowns(dir), []);
  assert.equal(p.isCoolingDownId(MODEL_A, dir, Date.now()), false);
  assert.equal(p.resolveNextFreeLink([MODEL_A, MODEL_B], MODEL_A, { stateDir: dir }), MODEL_B);
});

test('cap enforcement: no append past 500 rows', async (t) => {
  const dir = makeStateDir(t);
  const seed = Array.from({ length: 500 }, (_, i) => JSON.stringify({
    type: 'cooldown', model: MODEL_A, account: ACCOUNT, cooldown_until: futureIso(), circuit: 'OPEN', at: `2026-01-01T00:00:${String(i % 60).padStart(2, '0')}.000Z`,
  })).join('\n') + '\n';
  fs.writeFileSync(p.cooldownPath(dir), seed);
  assert.equal(p.appendCooldown(dir, { model: MODEL_B, account: ACCOUNT, cooldown_until: futureIso() }), false);
  assert.equal(readJsonl(p.cooldownPath(dir)).length, 500);
});

test('ledger cap enforcement: no append past 500 rows', async (t) => {
  const dir = makeStateDir(t);
  const seed = Array.from({ length: 500 }, (_, i) => JSON.stringify({
    type: 'ledger', model: MODEL_A, account: ACCOUNT, effort: 'medium', outcome: 'dispatch', at: `2026-01-01T00:00:${String(i % 60).padStart(2, '0')}.000Z`,
  })).join('\n') + '\n';
  fs.writeFileSync(p.dispatchLedgerPath(dir), seed);
  assert.equal(p.appendLedger(dir, { model: MODEL_B, account: ACCOUNT, effort: 'high' }), false);
  assert.equal(readJsonl(p.dispatchLedgerPath(dir)).length, 500);
});

test('ledger append schema: model+account+effort/thinking/outcome, no prompts/outputs', async (t) => {
  const dir = makeStateDir(t);
  assert.equal(p.appendLedger(dir, { model: MODEL_A, account: ACCOUNT, effort: 'high', thinking: 'low', outcome: 'cooldown' }), true);
  const rows = readJsonl(p.dispatchLedgerPath(dir));
  assert.equal(rows.length, 1);
  const row = rows[0];
  assert.equal(row.type, 'ledger');
  assert.equal(row.model, MODEL_A);
  assert.equal(row.account, ACCOUNT);
  assert.equal(row.effort, 'high');
  assert.equal(row.thinking, 'low');
  assert.equal(row.outcome, 'cooldown');
  assert.match(row.at, STRICT_UTC);
  assert.ok(!('prompt' in row) && !('output' in row) && !('command' in row), 'no raw prompts/outputs');
  // Extra raw fields are dropped, never persisted.
  assert.equal(p.appendLedger(dir, { model: MODEL_B, account: ACCOUNT, effort: 'medium', prompt: 'SECRET-PROMPT', output: 'SECRET-OUTPUT' }), true);
  const raw = fs.readFileSync(p.dispatchLedgerPath(dir), 'utf8');
  assert.ok(!raw.includes('SECRET-PROMPT') && !raw.includes('SECRET-OUTPUT'), 'raw secrets never stored');
  const rows2 = readJsonl(p.dispatchLedgerPath(dir));
  assert.equal(rows2[1].outcome, 'dispatch');
});

test('ledger validation: missing fields refused; secret-like refused', async (t) => {
  const dir = makeStateDir(t);
  assert.equal(p.appendLedger(dir, { model: MODEL_A, account: ACCOUNT }), false);
  assert.equal(p.appendLedger(dir, { model: '', account: ACCOUNT, effort: 'medium' }), false);
  assert.equal(p.appendLedger(dir, { model: SECRET, account: ACCOUNT, effort: 'medium' }), false);
  assert.equal(p.appendLedger(dir, { model: MODEL_A, account: SECRET, effort: 'medium' }), false);
  assert.deepEqual(readJsonl(p.dispatchLedgerPath(dir)), [], 'no rows on refusal');
});

test('billing codes inert: only 429/provider-error trigger', () => {
  assert.equal(p.classifyQuotaError({ status: 429 }), true);
  assert.equal(p.classifyQuotaError({ code: 'provider-error' }), true);
  for (const err of [{ status: 402 }, { status: 403 }, { status: 500 }, { code: 'billing-error' }, { code: 'quota-billing' }, { code: 'payment-required' }]) {
    assert.equal(p.classifyQuotaError(err), false, JSON.stringify(err));
  }
});

test('secrets-never: secret-like model/account refused everywhere + selector skips', async (t) => {
  const dir = makeStateDir(t);
  assert.equal(p.isSecretLike(SECRET), true);
  assert.equal(p.appendCooldown(dir, { model: SECRET, account: ACCOUNT, cooldown_until: futureIso() }), false);
  assert.equal(p.appendCooldown(dir, { model: MODEL_A, account: SECRET, cooldown_until: futureIso() }), false);
  assert.deepEqual(p.readCooldowns(dir), []);
  const pool = [MODEL_A, SECRET, MODEL_B];
  assert.equal(p.resolveNextFreeLink(pool, MODEL_A, {}), MODEL_B);
});

test('hook: 429 + provider-error handled true and write both files; billing handled false', async (t) => {
  const root = makeRoot(t);
  const res = p.recordCooldownOnFailure({ error: { status: 429 }, model: MODEL_A, account: ACCOUNT, effort: 'medium' }, root);
  assert.equal(res.handled, true);
  assert.match(res.cooledUntil, STRICT_UTC);
  assert.equal(res.escalated, true);
  const stateDir = path.join(root, '.sdlc');
  const cools = p.readCooldowns(stateDir);
  assert.equal(cools.length, 1);
  assert.equal(cools[0].model, MODEL_A);
  assert.equal(cools[0].circuit, 'OPEN');
  const ledgers = readJsonl(p.dispatchLedgerPath(stateDir));
  assert.equal(ledgers.length, 1);
  assert.equal(ledgers[0].model, MODEL_A);
  assert.equal(ledgers[0].account, ACCOUNT);
  assert.equal(ledgers[0].outcome, 'cooldown');

  const root2 = makeRoot(t);
  const res2 = p.recordCooldownOnFailure({ error: { code: 'provider-error' }, model: MODEL_B, account: ACCOUNT }, root2);
  assert.equal(res2.handled, true);

  const root3 = makeRoot(t);
  const res3 = p.recordCooldownOnFailure({ error: { status: 402 }, model: MODEL_A, account: ACCOUNT }, root3);
  assert.deepEqual(res3, { handled: false });
  assert.equal(fs.existsSync(p.cooldownPath(path.join(root3, '.sdlc'))), false);
  assert.equal(fs.existsSync(p.dispatchLedgerPath(path.join(root3, '.sdlc'))), false);
});

test('modes 0600/0700 on both files; hash-only rows (no raw command/output)', async (t) => {
  const dir = makeStateDir(t);
  assert.equal(p.appendCooldown(dir, { model: MODEL_A, account: ACCOUNT, cooldown_until: futureIso(), prompt: 'RAW-CMD' }), true);
  assert.equal(p.appendLedger(dir, { model: MODEL_A, account: ACCOUNT, effort: 'medium' }), true);
  assert.equal(fs.statSync(dir).mode & 0o777, 0o700);
  assert.equal(fs.statSync(p.cooldownPath(dir)).mode & 0o777, 0o600);
  assert.equal(fs.statSync(p.dispatchLedgerPath(dir)).mode & 0o777, 0o600);
  const rawCool = fs.readFileSync(p.cooldownPath(dir), 'utf8');
  const rawLedger = fs.readFileSync(p.dispatchLedgerPath(dir), 'utf8');
  assert.ok(!rawCool.includes('RAW-CMD'), 'raw command never stored');
  for (const row of [...readJsonl(p.cooldownPath(dir)), ...readJsonl(p.dispatchLedgerPath(dir))]) {
    assert.ok(!('prompt' in row) && !('output' in row) && !('command' in row), 'hash-only metadata');
  }
});

test('per-source caps: opencode-go 100, OR 50/1000 with-credits, 20/min, unknown null', () => {
  assert.equal(p.capForFreeModel(MODEL_A), 100);
  assert.equal(p.capForFreeModel('console-openrouter/nvidia/nemotron-3.5-super-vl:free'), 50);
  assert.equal(p.capForFreeModel('console-openrouter2/nvidia/nemotron-3.5-super-vl:free', { withCredits: true }), 1000);
  assert.equal(p.capForFreeModel('console-openrouter/nvidia/nemotron-3.5-super-vl:free', { window: 'minute' }), 20);
  assert.equal(p.capForFreeModel('unknown/model'), null);
});

test('symlink-safe: symlinked cooldown file refused without outside writes', async (t) => {
  const dir = makeStateDir(t);
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-cooldown-outside-'));
  t.after(() => fs.rmSync(outsideDir, { recursive: true, force: true }));
  const outside = path.join(outsideDir, 'outside.jsonl');
  fs.writeFileSync(outside, 'untouched');
  fs.symlinkSync(outside, p.cooldownPath(dir));
  assert.equal(p.appendCooldown(dir, { model: MODEL_A, account: ACCOUNT, cooldown_until: futureIso() }), false);
  assert.deepEqual(p.readCooldowns(dir), []);
  assert.equal(fs.readFileSync(outside, 'utf8'), 'untouched', 'symlink target must not be followed');
});

test('ledger symlink-safe: symlinked dispatch ledger refused without outside writes', async (t) => {
  const dir = makeStateDir(t);
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-cooldown-outside-'));
  t.after(() => fs.rmSync(outsideDir, { recursive: true, force: true }));
  const outside = path.join(outsideDir, 'outside-ledger.jsonl');
  fs.writeFileSync(outside, '');
  fs.symlinkSync(outside, p.dispatchLedgerPath(dir));
  assert.equal(p.appendLedger(dir, { model: MODEL_A, account: ACCOUNT, effort: 'medium' }), false);
  assert.deepEqual(readJsonl(p.dispatchLedgerPath(dir)), []);
  assert.equal(fs.readFileSync(outside, 'utf8'), '', 'symlink target must not be followed');
});
