// Research protocol helpers: digests, cache binding, protocol freeze, outcome taxonomy, run log (stdlib only).
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, existsSync, realpathSync } from 'node:fs';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Hex sha256 of a file's content, streamed (memory-safe for large files).
 * Symlinks are followed: the hash covers the target's content.
 * @param {string} filePath - path to the file to hash
 * @returns {Promise<string>} lowercase hex digest
 */
export async function hashFile(filePath) {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);
  stream.on('data', (chunk) => hash.update(chunk));
  await new Promise((resolve, reject) => {
    stream.on('end', resolve);
    stream.on('error', reject);
  });
  return hash.digest('hex');
}

/** Stable JSON serialization: sorted object keys (recursive), arrays in order, undefined dropped. */
function stableStringify(value) {
  if (value !== null && typeof value === 'object' && typeof value.toJSON === 'function') return JSON.stringify(value);
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    const items = [];
    for (const item of value) {
      const serialized = stableStringify(item);
      if (serialized !== undefined) items.push(serialized);
    }
    return `[${items.join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const pairs = [];
    for (const key of Object.keys(value).sort()) {
      const serialized = stableStringify(value[key]);
      if (serialized !== undefined) pairs.push(`${JSON.stringify(key)}:${serialized}`);
    }
    return `{${pairs.join(',')}}`;
  }
  return JSON.stringify(value); // primitives incl. null
}

/**
 * Hex sha256 of a stable JSON serialization (key-order-insensitive).
 * @param {unknown} obj - any JSON-serializable value
 * @returns {string} lowercase hex digest
 */
export function hashObject(obj) {
  return createHash('sha256').update(stableStringify(obj) ?? 'null').digest('hex');
}

/** Hash one artifact category: category label + ordered per-file digests. */
async function digestCategory(category, files) {
  const fileDigests = await Promise.all(files.map((f) => hashFile(f)));
  return hashObject([category, ...fileDigests]);
}

/**
 * Per-category digests of artifact sets, category-prefixed so identical
 * content in different categories still yields distinct digests.
 * @param {{dataset?: string[], model?: string[], scorer?: string[]}} artifacts
 * @returns {Promise<{dataset: string, model: string, scorer: string}>} hex digests
 */
export async function digestArtifactSet({ dataset = [], model = [], scorer = [] } = {}) {
  const [datasetDigest, modelDigest, scorerDigest] = await Promise.all([
    digestCategory('dataset', dataset),
    digestCategory('model', model),
    digestCategory('scorer', scorer),
  ]);
  return { dataset: datasetDigest, model: modelDigest, scorer: scorerDigest };
}

/**
 * Stamp identity digests onto a cache entry (mutates and returns it).
 * @param {object} cacheEntry - score/notes entry to bind
 * @param {{dataset: string, model: string, scorer: string}} digests - from digestArtifactSet
 * @param {string} protocolHash - hash of the frozen eval protocol/settings
 * @returns {object} the same entry, with dataset/model/scorer/protocol fields set
 */
export function bindScore(cacheEntry, digests, protocolHash) {
  cacheEntry.dataset = digests.dataset;
  cacheEntry.model = digests.model;
  cacheEntry.scorer = digests.scorer;
  cacheEntry.protocol = protocolHash;
  return cacheEntry;
}

/**
 * Whether a bound cache entry matches the current artifacts and protocol.
 * @param {object} cacheEntry - previously bindScore()d entry
 * @param {{dataset: string, model: string, scorer: string}} digests - from digestArtifactSet
 * @param {string} protocolHash - hash of the frozen eval protocol/settings
 * @returns {boolean} true iff all four identity digests match
 */
export function cacheHit(cacheEntry, digests, protocolHash) {
  return (
    cacheEntry.dataset === digests.dataset &&
    cacheEntry.model === digests.model &&
    cacheEntry.scorer === digests.scorer &&
    cacheEntry.protocol === protocolHash
  );
}

/**
 * Freeze research fields into a protocol: the whole fields object (incl. nested seeds) is hashed.
 * @param {object} fields - frozen protocol fields (hypothesis, splitSpec, seeds, evalSettings, ...)
 * @returns {Promise<{fields: object, hash: string}>} protocol with a stable sha256 hash
 */
export async function createProtocol(fields) {
  return { fields: structuredClone(fields), hash: await hashObject(fields) };
}

/**
 * Whether a protocol's hash still matches its fields (no frozen-field mutation).
 * @param {{fields: object, hash: string}} protocol - createProtocol() result
 * @returns {Promise<boolean>} true iff the recomputed hash equals protocol.hash
 */
export async function verifyProtocol(protocol) {
  return (await hashObject(protocol.fields)) === protocol.hash;
}

const RESULT_KINDS = ['positive', 'null', 'negative'];

/**
 * Outcome taxonomy: completion is decided by cancelled/errors only, never by result sign —
 * a null/negative result with no errors and not cancelled is a COMPLETED run.
 * @param {{cancelled?: boolean, errors?: unknown[], resultKind?: string}} run
 * @returns {{status: 'cancelled'|'errored'|'completed', outcome: 'positive'|'null'|'negative'|'inconclusive'}}
 */
export function classifyOutcome({ cancelled = false, errors = [], resultKind } = {}) {
  const status = cancelled ? 'cancelled' : (Array.isArray(errors) && errors.length > 0 ? 'errored' : 'completed');
  const outcome = status === 'completed' && RESULT_KINDS.includes(resultKind) ? resultKind : 'inconclusive';
  return { status, outcome };
}

/**
 * New run log bound to a frozen protocol.
 * @param {{fields: object, hash: string}} protocol - createProtocol() result
 * @returns {{protocol: object, startedAt: string, amendments: object[], finalResultsSeen: boolean, gitRevision: null}}
 */
export function createRunLog(protocol) {
  return { protocol, startedAt: new Date().toISOString(), amendments: [], finalResultsSeen: false, gitRevision: null };
}

/**
 * Mark that final results exist for this run (gates 'protocol' amendments).
 * @param {object} log - createRunLog() result
 * @returns {object} the same log
 */
export function markFinalResults(log) {
  log.finalResultsSeen = true;
  return log;
}

/**
 * Append an amendment to the run log, after asserting the kind is allowed.
 * @param {object} log - createRunLog() result
 * @param {'repair'|'correction'|'protocol'} kind
 * @param {string} detail - what changed and why
 * @param {string} approver - who approved it
 * @returns {object} the same log
 * @throws {ProtocolAmendmentBlockedError} when the kind is blocked
 */
export function recordAmendment(log, kind, detail, approver) {
  assertAmendmentAllowed(log, kind);
  log.amendments.push({ kind, detail, approver, at: new Date().toISOString() });
  return log;
}

/**
 * Error thrown when a 'protocol' amendment is attempted after final results exist.
 * Message carries the blocked kind and the reason.
 */
export class ProtocolAmendmentBlockedError extends Error {
  /**
   * @param {string} kind - the blocked amendment kind
   * @param {string} why - why the kind is blocked
   */
  constructor(kind, why) {
    super(`protocol amendment blocked: kind '${kind}' — ${why}`);
    this.name = 'ProtocolAmendmentBlockedError';
  }
}

/**
 * Amendment gate: 'protocol' is blocked once final results exist (re-freeze required);
 * 'repair' and 'correction' are always allowed ('correction' re-derives scores, never
 * changes the protocol hash).
 * @param {object} log - createRunLog() result
 * @param {'repair'|'correction'|'protocol'} kind
 * @returns {void}
 * @throws {ProtocolAmendmentBlockedError} iff kind === 'protocol' && log.finalResultsSeen
 */
export function assertAmendmentAllowed(log, kind) {
  const ALLOWED = new Set(['repair', 'correction', 'protocol']);
  if (!ALLOWED.has(kind)) {
    throw new TypeError(`invalid amendment kind ${JSON.stringify(kind)} — allowed kinds: repair, correction, protocol`);
  }
  if (kind === 'protocol' && log.finalResultsSeen) {
    throw new ProtocolAmendmentBlockedError(kind, 'final results already seen; re-freeze the protocol first');
  }
}

// --- Device-scoped locks (stdlib only, O_EXCL lockfiles) ---

/** Error thrown when a device name fails sanitizeDeviceName validation. */
export class InvalidDeviceError extends Error {
  /** @param {unknown} name - the rejected device name */
  constructor(name) {
    super(`invalid device name: ${JSON.stringify(name)}`);
    this.name = 'InvalidDeviceError';
  }
}

/** Error thrown when a device lock is already held by another holder. */
export class LockBusyError extends Error {
  /**
   * @param {string} lockFile - path of the contended lock file
   * @param {{pid?: unknown}} holder - stored holder (pid surfaced in the message, else 'unknown')
   */
  constructor(lockFile, holder) {
    let pid = holder?.pid;
    if (pid === undefined || pid === null || pid === '?' || pid === '') pid = 'unknown';
    super(`device lock busy: ${lockFile} held by pid ${pid} — remove manually after verifying no live holder`);
    this.name = 'LockBusyError';
  }
}

/** Error thrown when releaseDeviceLock is called by a non-holder. */
export class NotHolderError extends Error {
  /** @param {string} [why] - detail */
  constructor(why = 'lock held by another pid') {
    super(`not lock holder: ${why}`);
    this.name = 'NotHolderError';
  }
}

const DEVICE_RE = /^[A-Za-z0-9][A-Za-z0-9:_-]*$/;

/**
 * Validate a device scope name (prevents path traversal into lockRoot).
 * @param {string} name - e.g. 'gpu:0', 'gpu:1', 'cpu'
 * @returns {string} the same name when valid
 * @throws {InvalidDeviceError} when the name is not allowed
 */
export function sanitizeDeviceName(name) {
  if (typeof name !== 'string' || !DEVICE_RE.test(name) || name.length > 128) {
    throw new InvalidDeviceError(name);
  }
  return name;
}

/**
 * Default root for device lock files.
 * @returns {string} $XDG_CACHE_HOME/sdlc-lean/locks or ~/.cache/sdlc-lean/locks
 */
export function defaultLockRoot() {
  const base = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  return path.join(base, 'sdlc-lean', 'locks');
}

/**
 * Whether a lock file is stale (reclaimable).
 * A live holder pid (kill succeeds or EPERM) is NEVER stale — age is ignored
 * and no heartbeat is needed while the holder lives. A dead pid (ESRCH) is
 * stale. Any other kill error (e.g. EINVAL for a garbage pid) falls back to
 * the maxAgeMs heartbeat check. Malformed/unparseable files fail CLOSED
 * (never stale — no automatic reclaim of ambiguous ownership); only a
 * missing file counts as stale.
 * @param {string} lockFile - path to the lock file
 * @param {{maxAgeMs?: number}} [opts]
 * @returns {Promise<boolean>} true iff the lock may be reclaimed
 */
export async function isLockStale(lockFile, { maxAgeMs = 600000 } = {}) {
  let raw;
  try {
    raw = await readFile(lockFile, 'utf8');
  } catch (err) {
    if (err?.code === 'ENOENT') return true;
    throw err;
  }
  let stored;
  try {
    stored = JSON.parse(raw);
  } catch {
    return false;
  }
  if (!stored || typeof stored !== 'object') return false;
  const pid = stored.pid;
  if (typeof pid !== 'number' || !Number.isFinite(pid)) return false;
  if (!(pid > 0)) {
    // Garbage pid (e.g. -1): no live holder — fall back to the age check below.
  } else try {
    process.kill(pid, 0);
    return false; // alive — holds have no expiry while the holder pid lives
  } catch (err) {
    if (err?.code === 'ESRCH') return true; // dead pid — reclaimable
    if (err?.code === 'EPERM') return false; // alive, no permission to signal
    // any other error (e.g. EINVAL): fall back to age check below
  }
  const heartbeat = stored.heartbeatAt ?? stored.acquiredAt;
  if (typeof heartbeat !== 'number' || !Number.isFinite(heartbeat)) return false;
  return Date.now() - heartbeat > maxAgeMs;
}

/**
 * Acquire an exclusive per-device lock (O_EXCL create). Reclaims a stale lock once.
 * The lockfile carries a random token and is created mode 0600; lockRoot is
 * created mode 0700. Stale reclaim uses compare-and-delete: the file is
 * re-read before unlink and unlinked only when byte-identical to the checked
 * content, else LockBusyError (another holder won the race).
 * @param {string} lockRoot - directory holding lock files
 * @param {string} device - device scope, e.g. 'gpu:0'
 * @returns {Promise<{lockFile: string, holder: {pid: number, device: string, token: string, acquiredAt: number, heartbeatAt: number}}>}
 * @throws {LockBusyError} when a live holder owns the lock
 */
export async function acquireDeviceLock(lockRoot, device) {
  const safe = sanitizeDeviceName(device);
  await mkdir(lockRoot, { recursive: true, mode: 0o700 });
  const lockFile = path.join(lockRoot, `${safe}.lock`);
  const attempt = async () => {
    const now = Date.now();
    const holder = { pid: process.pid, device: safe, token: randomUUID(), acquiredAt: now, heartbeatAt: now };
    await writeFile(lockFile, JSON.stringify(holder), { flag: 'wx', mode: 0o600 });
    return { lockFile, holder };
  };
  try {
    return await attempt();
  } catch (err) {
    if (err?.code !== 'EEXIST') throw err;
    let checkedRaw = null;
    try {
      checkedRaw = await readFile(lockFile, 'utf8');
    } catch {
      checkedRaw = null;
    }
    let stale = false;
    try {
      stale = await isLockStale(lockFile);
    } catch {
      stale = false;
    }
    if (!stale) {
      let storedPid = 'unknown';
      try {
        storedPid = JSON.parse(await readFile(lockFile, 'utf8')).pid ?? 'unknown';
      } catch {
        // keep 'unknown'
      }
      throw new LockBusyError(lockFile, { pid: storedPid });
    }
    // Compare-and-delete: re-read; unlink only if byte-identical to checked content.
    let currentRaw = null;
    try {
      currentRaw = await readFile(lockFile, 'utf8');
    } catch (readErr) {
      if (readErr?.code === 'ENOENT') currentRaw = null;
      else throw readErr;
    }
    if (currentRaw === null) {
      try {
        return await attempt();
      } catch (retryErr) {
        if (retryErr?.code === 'EEXIST') {
          let storedPid = 'unknown';
          try {
            storedPid = JSON.parse(await readFile(lockFile, 'utf8')).pid ?? 'unknown';
          } catch {
            // keep 'unknown'
          }
          throw new LockBusyError(lockFile, { pid: storedPid });
        }
        throw retryErr;
      }
    }
    if (checkedRaw !== null && currentRaw !== checkedRaw) {
      let storedPid = 'unknown';
      try {
        storedPid = JSON.parse(currentRaw).pid ?? 'unknown';
      } catch {
        // keep 'unknown'
      }
      throw new LockBusyError(lockFile, { pid: storedPid });
    }
    try {
      await unlink(lockFile);
    } catch (unlinkErr) {
      if (unlinkErr?.code !== 'ENOENT') throw unlinkErr;
    }
    try {
      return await attempt();
    } catch (retryErr) {
      if (retryErr?.code === 'EEXIST') {
        let storedPid = 'unknown';
        try {
          storedPid = JSON.parse(await readFile(lockFile, 'utf8')).pid ?? 'unknown';
        } catch {
          // keep 'unknown'
        }
        throw new LockBusyError(lockFile, { pid: storedPid });
      }
      throw retryErr;
    }
  }
}

/**
 * Release a device lock held by this handle. Idempotent when the file is already gone.
 * The handle token must EXACT-match the stored token (plus the pid check);
 * tokens never appear in error messages.
 * @param {{lockFile: string, holder: {pid: number, token?: string}}} handle - acquireDeviceLock() result
 * @returns {Promise<void>}
 * @throws {NotHolderError} when the stored pid/token does not match the handle
 */
export async function releaseDeviceLock(handle) {
  const { lockFile, holder } = handle;
  let raw;
  try {
    raw = await readFile(lockFile, 'utf8');
  } catch (err) {
    if (err?.code === 'ENOENT') return;
    throw err;
  }
  let stored;
  try {
    stored = JSON.parse(raw);
  } catch {
    throw new NotHolderError('lock file is malformed');
  }
  if (!stored || stored.pid !== holder?.pid || typeof stored.token !== 'string' || stored.token !== holder?.token) {
    throw new NotHolderError('lock held by another holder');
  }
  try {
    await unlink(lockFile);
  } catch (err) {
    if (err?.code === 'ENOENT') return;
    throw err;
  }
}

/**
 * Check an evidence bundle for the four required fields (pure, sync).
 * Required: estimand (non-empty string), observations (array length ≥ 2 OR
 * {count: n ≥ 2}), leakageCheck (non-empty string), claimScope (non-empty
 * string). Whether claimScope ⊆ protocol scope stays reviewer-level.
 * @param {object} bundle - evidence bundle to check
 * @returns {{ok: boolean, missing: string[]}} ok iff no keys are missing
 */
export function checkEvidenceBundle(bundle) {
  const missing = [];
  const b = bundle && typeof bundle === 'object' ? bundle : {};
  if (typeof b.estimand !== 'string' || b.estimand.length === 0) missing.push('estimand');
  const obs = b.observations;
  let obsOk = false;
  if (Array.isArray(obs)) obsOk = obs.length >= 2;
  else if (obs && typeof obs === 'object' && typeof obs.count === 'number') obsOk = obs.count >= 2;
  if (!obsOk) missing.push('observations');
  if (typeof b.leakageCheck !== 'string' || b.leakageCheck.length === 0) missing.push('leakageCheck');
  if (typeof b.claimScope !== 'string' || b.claimScope.length === 0) missing.push('claimScope');
  return { ok: missing.length === 0, missing };
}

/** Error thrown when SDLC_RESEARCH_PROTOCOL points at a missing file. */
export class DiscoveryError extends Error {
  /** @param {string} p - the configured path that does not exist */
  constructor(p) {
    super(`research protocol not found: ${p}`);
    this.name = 'DiscoveryError';
  }
}

/**
 * Resolve the active protocol module path.
 * Precedence: SDLC_RESEARCH_PROTOCOL env → <cwd>/.opencode/... → global
 * (XDG_CONFIG_HOME honored) → repo-bundled self.
 * @param {{cwd?: string, env?: object}} [opts]
 * @returns {string|null} first existing path, else null
 * @throws {DiscoveryError} when SDLC_RESEARCH_PROTOCOL is set but missing
 */
export function resolveProtocolModule({ cwd = process.cwd(), env = process.env } = {}) {
  const e = env ?? process.env;
  const fromEnv = e?.SDLC_RESEARCH_PROTOCOL;
  if (fromEnv) {
    if (existsSync(fromEnv)) return fromEnv;
    throw new DiscoveryError(fromEnv);
  }
  const local = path.join(cwd ?? process.cwd(), '.opencode', 'scripts', 'research', 'protocol.mjs');
  if (existsSync(local)) return local;
  const configBase = e?.XDG_CONFIG_HOME || path.join(e?.HOME || os.homedir(), '.config');
  const globalPath = path.join(configBase, 'opencode', 'scripts', 'research', 'protocol.mjs');
  if (existsSync(globalPath)) return globalPath;
  try {
    const self = fileURLToPath(import.meta.url);
    if (existsSync(self)) return self;
  } catch {
    // fall through to null
  }
  return null;
}

// --- CLI (single executable surface; lazy cluster import keeps library light) ---
const USAGE = `usage:
  node protocol.mjs hash <file>
  node protocol.mjs lock <device> [--lock-root <dir>] [--hold-ms <n>]
  node protocol.mjs unlock <device> [--lock-root <dir>]
  node protocol.mjs cluster <questions.json> [--seed <n>] [--k <n>]
  node protocol.mjs status <run-dir>`;

function parseCliArgs(args) {
  const positionals = [];
  const opts = {};
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (!a.startsWith('--')) {
      positionals.push(a);
      continue;
    }
    const eq = a.indexOf('=');
    if (eq >= 0) {
      opts[a.slice(2, eq)] = a.slice(eq + 1);
      continue;
    }
    const key = a.slice(2);
    const next = args[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      opts[key] = next;
      i += 1;
    } else {
      opts[key] = true;
    }
  }
  return { positionals, opts };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runCli(argv) {
  const [sub, ...rest] = argv;
  const { positionals, opts } = parseCliArgs(rest);
  if (sub === 'hash') {
    const file = positionals[0];
    if (!file) {
      console.error(USAGE);
      process.exit(64);
    }
    try {
      console.log(await hashFile(file));
    } catch (err) {
      console.error(`hash failed: ${err?.message ?? err}`);
      process.exit(2);
    }
    return;
  }
  if (sub === 'lock') {
    const device = positionals[0];
    if (!device) {
      console.error(USAGE);
      process.exit(64);
    }
    const lockRoot = opts['lock-root'] ?? defaultLockRoot();
    let holdMs = 0;
    if (opts['hold-ms'] !== undefined) {
      const rawHold = opts['hold-ms'];
      if (rawHold === true) {
        console.error('invalid --hold-ms: missing value');
        process.exit(64);
      }
      holdMs = Number(rawHold);
      if (!Number.isFinite(holdMs) || holdMs < 0) {
        console.error(`invalid --hold-ms: ${opts['hold-ms']}`);
        process.exit(64);
      }
    }
    try {
      const handle = await acquireDeviceLock(lockRoot, device);
      if (holdMs > 0) await sleep(holdMs);
      await releaseDeviceLock(handle);
      console.log(`held:${process.pid}`);
    } catch (err) {
      if (err instanceof InvalidDeviceError) {
        console.error(err.message);
        process.exit(64);
      }
      if (err instanceof LockBusyError) {
        const m = /held by pid (\S+)/.exec(err.message);
        console.error(`locked-by:${m ? m[1] : 'unknown'}`);
        process.exit(7);
      }
      console.error(err?.message ?? String(err));
      process.exit(1);
    }
    return;
  }
  if (sub === 'unlock') {
    const device = positionals[0];
    if (!device) {
      console.error(USAGE);
      process.exit(64);
    }
    const lockRoot = opts['lock-root'] ?? defaultLockRoot();
    let safe;
    try {
      safe = sanitizeDeviceName(device);
    } catch (err) {
      console.error(err.message);
      process.exit(64);
    }
    const lockFile = path.join(lockRoot, `${safe}.lock`);
    let raw;
    try {
      raw = await readFile(lockFile, 'utf8');
    } catch (err) {
      console.error(`not held by pid ${process.pid}`);
      process.exit(9);
    }
    let stored;
    try {
      stored = JSON.parse(raw);
    } catch {
      console.error(`not held by pid ${process.pid}`);
      process.exit(9);
    }
    if (!stored || stored.pid !== process.pid) {
      console.error(`not held by pid ${process.pid} (held by pid ${stored?.pid})`);
      process.exit(9);
    }
    try {
      await unlink(lockFile);
    } catch (err) {
      if (err?.code !== 'ENOENT') throw err;
    }
    return;
  }
  if (sub === 'cluster') {
    const file = positionals[0];
    if (!file) {
      console.error(USAGE);
      process.exit(64);
    }
    if (opts.k !== undefined) {
      const rawK = opts.k;
      const numK = rawK === true ? NaN : Number(rawK);
      if (!Number.isInteger(numK) || numK < 1) {
        console.error(`invalid --k: ${rawK === true ? 'missing value' : rawK}`);
        process.exit(64);
      }
    }
    const seed = opts.seed ?? 0;
    const k = opts.k !== undefined ? Number(opts.k) : 2;
    const MAX_INPUT_BYTES = 8 * 1024 * 1024;
    try {
      const st = await stat(file);
      if (st.size > MAX_INPUT_BYTES) {
        console.error(`cluster failed: input exceeds 8MB (${st.size} bytes)`);
        process.exit(2);
      }
      const raw = await readFile(file, 'utf8');
      const questions = JSON.parse(raw);
      const { clusterQuestions } = await import('./cluster.mjs');
      console.log(JSON.stringify(clusterQuestions(questions, { seed, k })));
    } catch (err) {
      console.error(`cluster failed: ${err?.message ?? err}`);
      process.exit(2);
    }
    return;
  }
  if (sub === 'status') {
    const runDir = positionals[0];
    if (!runDir) {
      console.error(USAGE);
      process.exit(64);
    }
    const MAX_INPUT_BYTES = 8 * 1024 * 1024;
    try {
      const logPath = path.join(runDir, 'run-log.json');
      const st = await stat(logPath);
      if (st.size > MAX_INPUT_BYTES) {
        console.error(`status failed: input exceeds 8MB (${st.size} bytes)`);
        process.exit(2);
      }
      const log = JSON.parse(await readFile(logPath, 'utf8'));
      const protocol = typeof log.protocol === 'string' ? log.protocol : (log.protocol?.hash ?? null);
      console.log(JSON.stringify({
        protocol,
        amendments: Array.isArray(log.amendments) ? log.amendments.length : 0,
        finalResultsSeen: !!log.finalResultsSeen,
        status: log.status ?? null,
        outcome: log.outcome ?? null,
      }));
    } catch (err) {
      console.error(`status failed: ${err?.message ?? err}`);
      process.exit(2);
    }
    return;
  }
  console.error(USAGE);
  process.exit(64);
}

let isMain = false;
try {
  const argvResolved = process.argv[1] ? path.resolve(process.argv[1]) : '';
  const selfResolved = fileURLToPath(import.meta.url);
  isMain = !!process.argv[1] && realpathSync(argvResolved) === realpathSync(selfResolved);
} catch {
  isMain = !!(process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url));
}
if (isMain) {
  await runCli(process.argv.slice(2));
}
