/**
 * sdlc-lean plugin for OpenCode (V1 + V2 dual-compatible, zero dependencies).
 *
 * Combines the strengths surveyed upstream:
 * - obra/superpowers: bootstrap-injection pattern (cached per-mapping bootstrap,
 *   child-session suppression, double-inject guard, per-skill fail-open
 *   registration), skill-router discipline, Red-Flags table.
 * - DietrichGebert/ponytail: 7-rung lean ladder, safety carve-outs that stay on.
 * - wshobson/agents: tiered model hints, composable install-only-what-you-need.
 * - ClaudeTools: safety-always-on.
 *
 * No option-picking: the suite auto-routes. The router skill
 * (using-sdlc-lean) infers intent from the request and selects the
 * pipeline, skills, and scrutiny level itself.
 *
 * V1 (OpenCode 1.x, e.g. 1.18.x): named export SdlcLeanPlugin — config hook
 * registers the skills dir; experimental.chat.messages.transform injects the
 * bootstrap into the first user message of top-level sessions.
 * V2 (OpenCode 2.x): default export { id, setup } — ctx.skill.transform()
 * registers skills natively; ctx.session.hook("context") injects bootstrap.
 *
 * No external dependencies — pure JS works on both flavors.
 */

import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Repo root (plugin lives at <repo>/.opencode/plugins/sdlc-lean.js). Used only
// as the V1 compaction legacy default — never as the V2 project root.
const REPO_ROOT = path.resolve(__dirname, '..', '..');

// Skills live next to the plugin: <repo>/.opencode/skills
const skillsDir = path.resolve(__dirname, '..', 'skills');

// Minimal frontmatter parser (name/description only) — avoids dependencies.
const extractAndStripFrontmatter = (content) => {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content };
  const frontmatter = {};
  let lastKey = null;
  for (const rawLine of match[1].split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0 && !/^\s/.test(line)) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      frontmatter[key] = /^(>[+-]?|\|[+-]?)$/.test(value) ? '' : value;
      lastKey = key;
    } else if (lastKey !== null && line.trim() !== '') {
      frontmatter[lastKey] = `${frontmatter[lastKey]} ${line.trim()}`.trim();
    }
  }
  for (const key of Object.keys(frontmatter)) {
    frontmatter[key] = frontmatter[key].replace(/^(["'])([\s\S]*)\1$/, '$2');
  }
  return { frontmatter, content: match[2] };
};

// V1 built-ins: todowrite, task, skill, read, apply_patch, bash, grep, glob,
// webfetch. Superset wording covers both so one mapping serves V1; V2 flavor
// differences (task->subagent, apply_patch->patch, bash->shell) are noted.
export const V1_MAPPING = `**Tool Mapping for OpenCode:**
When skills request actions, substitute OpenCode equivalents:
- Create or update todos → \`todowrite\` (V1) or a markdown tracking file (V2, no todo tool)
- \`Subagent (general-purpose):\` → \`task\` with \`subagent_type: "general"\` (V1) or \`subagent\` with \`agent: "general"\` (V2)
- Invoke a skill → OpenCode's native \`skill\` tool
- Read files → \`read\`
- Create, edit, or delete files → \`apply_patch\` (V1) or \`patch\`/\`write\`/\`edit\` (V2)
- Run shell commands → \`bash\` (V1) or \`shell\` (V2)
- Search files → \`grep\`, \`glob\`
- Fetch a URL → \`webfetch\`

Use OpenCode's native \`skill\` tool to list and load skills.`;

// Bootstrap cached once (router file does not change mid-session).
let _bootstrapCache = null; // null = uncomputed; false = router missing

export const getBootstrapContent = () => {
  if (_bootstrapCache !== null) return _bootstrapCache || null;
  const routerPath = path.join(skillsDir, 'using-sdlc-lean', 'SKILL.md');
  if (!fs.existsSync(routerPath)) {
    _bootstrapCache = false;
    return null;
  }
  const { content } = extractAndStripFrontmatter(fs.readFileSync(routerPath, 'utf8'));
  _bootstrapCache = `<EXTREMELY_IMPORTANT>
You have an SDLC suite.

**IMPORTANT: The using-sdlc-lean skill content below is ALREADY LOADED — do NOT load "using-sdlc-lean" again via the skill tool.**

${content}

${V1_MAPPING}
</EXTREMELY_IMPORTANT>`;
  return _bootstrapCache;
};

// --- Child-session detection (superpowers #2160 pattern) ----------------------
// Task subagents carry a parentID; injecting the controller bootstrap there
// restarts design/approval cycles the parent already authorised. Skills stay
// registered for every session — workers keep execution skills.
const CHILD_CACHE_MAX = 512;
const _childCache = new Map();

const _cacheChild = (id, isChild) => {
  if (_childCache.size >= CHILD_CACHE_MAX) {
    let drop = Math.ceil(CHILD_CACHE_MAX / 4);
    for (const key of _childCache.keys()) {
      if (drop-- <= 0) break;
      _childCache.delete(key);
    }
  }
  _childCache.set(id, isChild);
};

// AC1 fallback: a prompt mutation that throws at runtime marks the session so
// the next `context` hook can deliver the bootstrap once. This is NOT the
// once-per-session injection decision (that is the persisted session.context
// lookup); the flag is consumed by the context hook.
const PROMPT_FALLBACK_MAX = 512;
const _promptFallback = new Set();
const _markPromptFallback = (sessionID) => {
  if (!sessionID) return;
  if (_promptFallback.size >= PROMPT_FALLBACK_MAX) {
    for (const key of _promptFallback) { _promptFallback.delete(key); break; }
  }
  _promptFallback.add(sessionID);
};

export const isChildSession = async (fetchSession, sessionID) => {
  if (!sessionID) return false;
  if (_childCache.has(sessionID)) return _childCache.get(sessionID);
  let isChild = false;
  try {
    const result = await fetchSession(sessionID);
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('bad session record');
    if (result.error != null || result.response?.ok === false) throw new Error('session lookup failed');
    const session = 'data' in result ? result.data : result;
    if (!session || typeof session !== 'object' || session.id !== sessionID) throw new Error('bad session identity');
    isChild = session.parentID !== undefined;
  } catch (err) {
    console.error('[sdlc-lean] session lookup failed, treating as top-level:', err);
    return false; // fail open, do not cache
  }
  _cacheChild(sessionID, isChild);
  return isChild;
};

// List skills on disk: [{ id, name, description, path, content }]
export const listSkills = () => {
  const out = [];
  if (!fs.existsSync(skillsDir)) return out;
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillPath)) continue;
    const { frontmatter, content } = extractAndStripFrontmatter(fs.readFileSync(skillPath, 'utf8'));
    out.push({
      id: entry.name,
      name: frontmatter.name || entry.name,
      ...(frontmatter.description ? { description: frontmatter.description } : {}),
      path: skillPath,
      content,
    });
  }
  return out;
};

// --- Activation signal -------------------------------------------------------
// Deterministic proof the suite is live:
//  1. a status file (always, version-independent) the /sdlc-lean command reads;
//  2. a structured log entry (best effort);
//  3. a one-time TUI toast (best effort; only when a TUI is attached).
// Disable the toast with SDLC_LEAN_NO_TOAST=1.
const statusDir = path.join(
  process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state'),
  'sdlc-lean',
);
const statusPath = path.join(statusDir, 'status.json');

export const activationMessage = () => `sdlc-lean active - ${listSkills().length} skills`;

export const writeStatus = (sessionID, ux) => {
  try {
    fs.mkdirSync(statusDir, { recursive: true });
    fs.writeFileSync(statusPath, JSON.stringify({
      at: new Date().toISOString(),
      sessionID: sessionID || 'default',
      skills: listSkills().length,
      active: true,
      ...(ux && typeof ux === 'object' ? { ux: { tier: ux.tier, confidence: ux.confidence } } : {}),
    }));
  } catch (err) {
    // Best effort only; never break the request pipeline.
  }
};

// UX signal: autonomy tier + confidence, recorded best-effort in status file.
// Fail-open: never throws, never breaks activation.
export const uxStatus = (ux, sessionID = 'default') => {
  try {
    if (!ux || typeof ux !== 'object') return getStatus();
    writeStatus(sessionID, ux);
    return getStatus();
  } catch (err) {
    return null;
  }
};

// Announce at most once per session (bounded set, like the child-session cache).
const ANNOUNCED_MAX = 512;
const _announced = new Set();

export const announceActivation = async (client, sessionID = 'default') => {
  if (_announced.has(sessionID)) return;
  if (_announced.size >= ANNOUNCED_MAX) {
    for (const key of _announced) { _announced.delete(key); break; }
  }
  _announced.add(sessionID);
  const message = activationMessage();
  writeStatus(sessionID);
  try {
    await client?.app?.log?.({ body: { service: 'sdlc-lean', level: 'info', message } });
  } catch (err) {
    // Best effort only.
  }
  if (process.env.SDLC_LEAN_NO_TOAST === '1') return;
  try {
    await client?.tui?.showToast?.({ body: { title: 'sdlc-lean', message, variant: 'info', duration: 4000 } });
  } catch (err) {
    // Best effort only; never break the request pipeline.
  }
};

export const getStatus = () => {
  try {
    return JSON.parse(fs.readFileSync(statusPath, 'utf8'));
  } catch (err) {
    return null;
  }
};

// --- Project root resolution -------------------------------------------------
// V2 exposes the project location; ctx.directory is the V1/best-effort field.
// Never fall back to process.cwd(): a global install would gate the wrong repo.
export const projectRoot = (ctx) => {
  const located = ctx?.location?.directory;
  if (typeof located === 'string' && located) return located;
  const direct = ctx?.directory;
  if (typeof direct === 'string' && direct) return direct;
  return undefined;
};

// --- Compaction memory (experimental.session.compacting) ---------------------
// Autonomous loops must survive context compaction. Inject the durable state
// files — the debt ledger and the newest plan progress ledger — into the
// compaction summary prompt so the continuation model carries them forward.
// Fail-open: missing files, unreadable docs, or a hostile host never break
// compaction. `root` is required: no implicit cwd/repo-root fallback.
const MAX_INJECT = 1500; // chars per file — keeps compaction prompts lean

// Never follow symlinks: a repo may plant docs/debt-ledger.md -> ~/.ssh/id_rsa
// (this plugin runs globally too, so repos are untrusted input).
const safeReadDoc = (p) => {
  try {
    const st = fs.lstatSync(p);
    if (st.isSymbolicLink() || !st.isFile()) return null;
    return fs.readFileSync(p, 'utf8').slice(0, MAX_INJECT);
  } catch (err) {
    return null;
  }
};

export const compactionContext = (root) => {
  if (!root) return [];
  const parts = [];
  try {
    const debtPath = path.join(root, 'docs', 'debt-ledger.md');
    const debt = safeReadDoc(debtPath);
    if (debt) parts.push(`## Debt ledger (docs/debt-ledger.md)\n${debt}`);
    const plansDir = path.join(root, 'docs', 'plans');
    if (fs.existsSync(plansDir)) {
      // Names are date-prefixed, so a reverse lexicographic sort = newest first.
      const progress = fs.readdirSync(plansDir).filter((f) => f.endsWith('-progress.md')).sort().reverse();
      if (progress[0]) {
        const p = path.join(plansDir, progress[0]);
        const body = safeReadDoc(p);
        if (body) parts.push(`## Latest plan progress (docs/plans/${progress[0]})\n${body}`);
      }
    }
  } catch (err) {
    return []; // fail open — never break compaction
  }
  return parts;
};

// --- Safety guards (ALWAYS ON) --------------
// Fail-open: only exact-known destructive patterns throw; everything else
// passes untouched. Errors explain the safe alternative.
const DESTRUCTIVE_PATTERNS = [
  /\brm\s+(-[^;\s]*r[^;\s]*\s+)?(-{0,2}\s*\/(\s|$|;))/, // rm -rf / variants
  /\brm\s+(-[^;\s]*r[^;\s]*\s+)?~(\s|$|;|\/)/, // rm -rf ~ variants
  /:\(\)\s*\{\s*:\|\:&\s*\}\s*;/, // fork bomb
  /\bmkfs(\.|$|\s)/,
  /\bdd\s+.*of=\/dev\/(sd|hd|nvme)/,
];

// Files whose contents must not enter the model context. Templates
// (`.env.example`/`.sample`/`.template`) are not secrets.
const SENSITIVE_PATH_RE = /(^|\/)\.env(?:\.(?!example$|sample$|template$)[^/]*)?$|(^|\/)(id_rsa|id_ed25519)$|\.pem$|\.key$/;

const FILE_TOOLS = new Set(['read', 'edit', 'write', 'patch', 'apply_patch']);

// apply_patch/patch carry no filePath; recover targets from the diff body.
// Both `--- a/` and `+++ b/` are parsed: a deletion (`+++ /dev/null`) or a
// rename must check the source path too, not only the destination.
const pathsFromPatch = (text) => {
  const out = [];
  for (const re of [
    /^\*\*\* (?:Add|Update|Delete|Move to) File: (.+)$/gm,
    /^\*\*\* Move to: (.+)$/gm,
    /^--- [ab]\/(.+)$/gm,
    /^\+\+\+ [ab]\/(.+)$/gm,
  ]) {
    for (const m of text.matchAll(re)) out.push(m[1].trim());
  }
  return out;
};

// --- Spec gate (opt-in, marker-driven) --------------------------------------
// An approved plan writes .sdlc/spec-gate.json via scripts/spec-check.mjs. The
// plugin delegates validation to that CLI (single contract implementation) and
// blocks mutating file tools outside the approved scope. No marker = no-op, so
// the suite stays usable in every repo. A present but invalid marker blocks.
const SPEC_MUTATING_TOOLS = new Set(['edit', 'write', 'patch', 'apply_patch']);
const SPEC_CHECK_CANDIDATES = [
  path.resolve(__dirname, '..', '..', 'scripts', 'spec-check.mjs'), // repo layout
  path.resolve(__dirname, '..', 'scripts', 'spec-check.mjs'), // global install layout
];
let _specCheckPath;
const resolveSpecCheck = () => {
  if (_specCheckPath !== undefined) return _specCheckPath;
  for (const candidate of SPEC_CHECK_CANDIDATES) {
    try {
      if (fs.statSync(candidate).isFile()) {
        _specCheckPath = candidate;
        return candidate;
      }
    } catch (err) {
      // try the next layout
    }
  }
  _specCheckPath = null;
  return null;
};

// Node executable for gate CLI spawns: under plain node process.execPath is
// node, but under the opencode host it is the opencode binary (rejects
// --root). Use the current executable only when it is node; otherwise rely on
// 'node' in PATH. Exported for regression tests.
export const resolveNodeExecutable = (execPath = process.execPath) => {
  const base = path.basename(execPath || '').toLowerCase();
  if (base === 'node' || base === 'node.exe') return execPath;
  return 'node';
};

const specTargets = (tool, args = {}) => {
  if (!SPEC_MUTATING_TOOLS.has(tool)) return [];
  const targets = [];
  for (const raw of [args.filePath, args.path]) {
    if (typeof raw === 'string' && raw) targets.push(raw);
  }
  const body = args.patchText || args.diff || args.patch;
  if (typeof body === 'string' && body) targets.push(...pathsFromPatch(body));
  return [...new Set(targets)];
};

export const checkSpecGate = (tool, args = {}, root, opts = {}) => {
  const targets = specTargets(tool, args);
  if (!targets.length) return; // non-mutating tools and targetless calls are no-ops
  // SoP (SOP-1): refuse self-review where roles are observable. Fail open
  // when no bindings are passed (see convention above); mutating path only
  // so reads never break.
  if (opts && typeof opts === 'object') {
    const bound = normalizeRunRoles(opts);
    if (bound) checkSeparationOfPowers(bound);
  }
  if (!root) {
    // Fail closed: an unknown root must never silently skip a mutating target.
    throw new Error(`[sdlc-lean] spec gate root unknown: refusing ${tool} (no location or directory)`);
  }

  const marker = path.join(root, '.sdlc', 'spec-gate.json');
  try {
    fs.lstatSync(marker);
  } catch (err) {
    if (err.code === 'ENOENT') return; // no gate: fail open
    // Unreadable marker: let the CLI report it (fail closed for edits).
  }

  const cli = opts?.specCheckPath !== undefined ? opts.specCheckPath : resolveSpecCheck();
  // Marker is present but the contract module is missing: fail closed so
  // edits cannot silently skip the gate. Only the no-marker path above
  // fails open.
  if (!cli) throw new Error('[sdlc-lean] spec gate unavailable: spec-check CLI not found');

  // The CLI is in the plan scope in some repos; a marker written by a modified
  // CLI must not be trusted. Malformed JSON is left to the CLI to report.
  let markerData;
  try {
    markerData = JSON.parse(fs.readFileSync(marker, 'utf8'));
  } catch (err) {
    markerData = null;
  }
  if (markerData && typeof markerData === 'object' && !Array.isArray(markerData)) {
    if (typeof markerData.cli_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(markerData.cli_sha256)) {
      throw new Error('[sdlc-lean] spec gate marker has no CLI hash. Run spec-check close && approve.');
    }
    const cliHash = crypto.createHash('sha256').update(fs.readFileSync(cli)).digest('hex');
    if (cliHash !== markerData.cli_sha256) {
      throw new Error('[sdlc-lean] spec gate CLI changed since approval. Run spec-check close && approve.');
    }
  }

  const absTargets = targets.map((target) => (path.isAbsolute(target) ? target : path.resolve(root, target)));
  const spawnFn = opts?.spawnSync || spawnSync;
  const result = spawnFn(resolveNodeExecutable(), [cli, 'check', ...absTargets, '--root', root], {
    encoding: 'utf8',
    timeout: 5000,
    windowsHide: true,
  });
  if (result.error) {
    // Marker is active and the CLI resolved: a fault must not skip targets.
    throw new Error(`[sdlc-lean] spec gate unavailable: ${result.error.message}`);
  }
  if (result.status === 0) return;
  const detail = String(result.stderr || result.stdout || '').trim().split('\n').filter(Boolean).pop()
    || 'outside the approved plan scope';
  throw new Error(`[sdlc-lean] spec gate blocked: ${detail}`);
};

// --- Separation of powers (SOP-1, auto-tier pilot) ---------------------------
// Run-role tracking: every Auto run declares author/implementer/critic/closer
// as DISTINCT session IDs in the run header. The implementer must never be
// its own critic, and the closer must never have performed implementation
// (self-review). The closer is MECHANICAL only: it checks that evidence +
// hashes + critic verdicts are PRESENT, never judging correctness.
//
// Convention fallback (session IDs unobservable): V1/V2 tool hooks often
// carry no reliable role->session map (event.sessionID alone does not say
// which role acted). SoP is therefore enforced WHERE OBSERVABLE — when the
// caller passes explicit bindings via opts.runRoles / opts.roles /
// opts.runHeader (or directly to checkSeparationOfPowers / validateRunHeader
// / checkCloser). When no bindings are present the check fails OPEN (returns
// without throwing) so activation and unscoped repos never break. Callers
// with observable sessions MUST pass
// `{ author, implementer, critic, closer }` with distinct non-empty IDs.
export const SOP_ROLES = ['author', 'implementer', 'critic', 'closer'];

export const normalizeRunRoles = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  let src = input;
  for (const key of ['runRoles', 'roles', 'runHeader', 'header']) {
    const v = src?.[key];
    if (v && typeof v === 'object' && !Array.isArray(v)) { src = v; break; }
  }
  if (src && typeof src.roles === 'object' && src.roles !== null && !Array.isArray(src.roles)) {
    src = { ...src, ...src.roles };
  }
  const out = {};
  for (const role of SOP_ROLES) {
    const v = src[role];
    if (typeof v === 'string' && v.trim() !== '') out[role] = v.trim();
  }
  return Object.keys(out).length ? out : null;
};

export const checkSeparationOfPowers = (input) => {
  const roles = normalizeRunRoles(input);
  if (!roles) return null; // unobservable: fail open, never break activation
  const entries = Object.entries(roles);
  if (entries.length < 2) return roles;
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      if (entries[i][1] === entries[j][1]) {
        const [roleA, sid] = entries[i];
        const [roleB] = entries[j];
        throw new Error(`[sdlc-lean] sop-violation: ${roleA} and ${roleB} share session "${sid}" (self-review refused; run roles author/implementer/critic/closer must be distinct sessions)`);
      }
    }
  }
  return roles;
};

// Aliases for caller convenience (same SoP core, distinct names).
export const assertSeparationOfPowers = checkSeparationOfPowers;
export const checkRunRoles = checkSeparationOfPowers;
export const validateRunRoles = checkSeparationOfPowers;

// Run header: tracks tier/check/scope/budget/reversal plus distinct roles.
// Only the roles are enforced here (fail open when absent); other header
// fields are carried for audit, never judged.
export const validateRunHeader = (header) => {
  if (!header || typeof header !== 'object' || Array.isArray(header)) return null;
  const roles = normalizeRunRoles(header);
  if (!roles) return null; // unobservable: fail open (see convention above)
  checkSeparationOfPowers(roles);
  return roles;
};

export const parseRunHeader = validateRunHeader;

// Closer: MECHANICAL presence-check only (evidence + hashes + critic verdicts
// present, no judgment). Presence means non-empty; correctness-judgment
// (code quality, diff review) is explicitly out of scope. SoP applies where
// roles are observable: closer == implementer/critic/author refuses with
// sop-violation naming the duplicated role.
const closerPresent = (v) => {
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === 'object') return Object.keys(v).length > 0;
  return v !== null && v !== undefined && v !== false && v !== 0;
};

// --- Reward-hacking guards: grader immutability + expected outcomes (RH-1) ---
// Mirrors the CLI contract (scripts/spec-check.mjs). Grader paths are
// `tests/**`, `scripts/validate-skills.mjs`, `eval/**` (see isGraderPath).
// Tool-time blocking is NOT added here — machine-close owns the refusal —
// so existing gate behavior stays byte-identical. These pure helpers let
// callers and regression tests share the rule without touching hooks.
export const GRADER_GLOBS = ['tests/**', 'scripts/validate-skills.mjs', 'eval/**'];

export const isGraderPath = (value) => {
  if (typeof value !== 'string') return false;
  const p = value.trim().replace(/^\.\//, '').replace(/\\/g, '/');
  if (p === 'scripts/validate-skills.mjs') return true;
  return p === 'tests' || p.startsWith('tests/')
    || p === 'eval' || p.startsWith('eval/');
};

export const normalizeOutcome = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

export const expectedOfRow = (row) => {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  for (const key of ['expected', 'expectedOutcome', 'expected_outcome', 'outcome']) {
    const v = row[key];
    if (typeof v === 'string' && v.trim() !== '') return normalizeOutcome(v);
  }
  return null;
};

export const isNewBehaviorRow = (row) => {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
  if (row.newBehavior === true || row.new_behavior === true) return true;
  return expectedOfRow(row) !== null;
};

/**
 * Enforce the pre-declared-outcome rule (pure, mechanical presence-check:
 * no judgment, only membership). Returns the count of new-behavior rows.
 * Throws `missing-expected-outcomes` / `expected-outcome-mismatch` when a
 * new-behavior row lacks a declaration or falls outside the list. Rows
 * without markers pass, so callers without new behavior are unaffected.
 */
export const checkExpectedOutcomes = (rows, expectedOutcomes) => {
  const list = Array.isArray(rows) ? rows : [];
  const fresh = list.filter(isNewBehaviorRow);
  if (fresh.length === 0) return 0;
  const declared = Array.isArray(expectedOutcomes)
    ? expectedOutcomes.filter((s) => typeof s === 'string' && s.trim() !== '').map(normalizeOutcome)
    : null;
  if (!declared || declared.length === 0) {
    throw new Error(`[sdlc-lean] closer refused: missing expected outcomes (${fresh.length} new-behavior row(s) but no pre-declared expected outcomes; declare each new behavior before implementation)`);
  }
  const set = new Set(declared);
  for (const row of fresh) {
    const want = expectedOfRow(row);
    if (want === null) {
      throw new Error('[sdlc-lean] closer refused: expected-outcome mismatch (a new-behavior row declares no expected outcome; each new-behavior row must match a pre-declared expected outcome)');
    }
    if (!set.has(want)) {
      throw new Error(`[sdlc-lean] closer refused: expected-outcome mismatch ("${want}" matches no pre-declared expected outcome)`);
    }
  }
  return fresh.length;
};

// --- Envelope immutability (pilot constraint, mirrors CLI) -------------------
// The envelope is the standing pre-approval: when `checkCloser` is given an
// envelope file it must be git-clean AND unchanged since `approved_at`
// (`git log --since` empty + status clean), else `envelope-changed` refuses.
// Envelope updates require re-approval — consistent with plan-immutability.
// Fail-open when git context is unobservable (no root/approved_at and no
// discoverable gate); fail-closed (`envelope-unknown`/`envelope-changed`)
// when observable. Residual (conceded): clock/commit-date spoofing needs
// file-writer privilege.
export const checkEnvelopeClean = (root, envelopeRel, approvedAt, opts = {}) => {
  const runner = opts?.spawnSync || opts?.runner || spawnSync;
  const rel = String(envelopeRel || '').trim().replace(/^\.\//, '');
  if (!rel) throw new Error('[sdlc-lean] closer refused: envelope-changed (missing envelope path)');
  if (typeof approvedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(approvedAt) || Number.isNaN(Date.parse(approvedAt))) {
    throw new Error('[sdlc-lean] closer refused: envelope-unknown (cannot inspect envelope history without a valid approved_at)');
  }
  let statusOut;
  try {
    const st = runner('git', ['-C', root, 'status', '--porcelain', '--', rel], { encoding: 'utf8' });
    if (st.error || st.status !== 0) {
      throw new Error(`[sdlc-lean] closer refused: envelope-unknown (cannot inspect the envelope working tree for "${rel}")`);
    }
    statusOut = (st.stdout || '').trim();
  } catch (err) {
    if (String(err?.message || '').includes('closer refused')) throw err;
    throw new Error(`[sdlc-lean] closer refused: envelope-unknown (${err?.message || err})`);
  }
  if (statusOut !== '') {
    throw new Error(`[sdlc-lean] closer refused: envelope-changed (envelope file "${rel}" has uncommitted changes; envelope updates require re-approval)`);
  }
  let logOut;
  try {
    const lg = runner('git', ['-C', root, 'log', `--since=${approvedAt}`, '--pretty=format:%H', '--', rel], { encoding: 'utf8' });
    if (lg.error || lg.status !== 0) {
      throw new Error(`[sdlc-lean] closer refused: envelope-unknown (cannot inspect envelope history for "${rel}")`);
    }
    logOut = (lg.stdout || '').trim();
  } catch (err) {
    if (String(err?.message || '').includes('closer refused')) throw err;
    throw new Error(`[sdlc-lean] closer refused: envelope-unknown (${err?.message || err})`);
  }
  if (logOut !== '') {
    throw new Error(`[sdlc-lean] closer refused: envelope-changed (envelope file "${rel}" changed since approval; envelope updates require re-approval)`);
  }
  return true;
};

const closerEnvelopePath = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return '';
  for (const k of ['envelope', 'envelopeFile', 'envelopePath', 'envelope_file']) {
    const v = input[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
};

const closerApprovedAt = (input, opts) => {
  const cands = [
    opts?.approved_at, opts?.approvedAt,
    input?.approved_at, input?.approvedAt,
    input?.gate?.approved_at, input?.valid?.approved_at,
  ];
  for (const c of cands) {
    if (typeof c === 'string' && c.trim() !== '') return c.trim();
  }
  return '';
};

const closerRootFor = (input, opts, envelopePath) => {
  if (typeof opts === 'string' && opts) return opts;
  for (const c of [opts?.root, opts?.dir, opts?.cwd, input?.root, input?.dir, input?.cwd, input?.gateRoot, input?.projectRoot]) {
    if (typeof c === 'string' && c) return c;
  }
  // Infer from an absolute envelope path: repo top-level + gate marker.
  try {
    if (typeof envelopePath === 'string' && path.isAbsolute(envelopePath)) {
      const dir = path.dirname(envelopePath);
      const top = spawnSync('git', ['-C', dir, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
      const t = (top.stdout || '').trim();
      if (!top.error && top.status === 0 && t) return t;
    }
  } catch { /* unobservable: fail open below */ }
  return '';
};

const closerOutcomesFromFile = (root, envelopePath) => {
  try {
    const abs = path.isAbsolute(envelopePath) ? envelopePath : path.resolve(root, envelopePath);
    const st = fs.lstatSync(abs);
    if (st.isSymbolicLink() || !st.isFile()) return null;
    const text = fs.readFileSync(abs, 'utf8');
    const lines = String(text).replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/);
    let inExpect = false;
    const out = [];
    for (const line of lines) {
      const h = line.match(/^##\s+(.+?)\s*$/);
      if (h) { inExpect = /expect/i.test(h[1]); continue; }
      if (!inExpect) continue;
      const m = line.match(/^\s*[-*]\s+(.+?)\s*$/);
      if (!m) continue;
      const entry = m[1].trim().replace(/^[`'"]+|[`'"]+$/g, '').trim().replace(/\s+/g, ' ');
      if (!entry || entry.startsWith('#')) continue;
      out.push(entry);
    }
    return out;
  } catch { return null; }
};

export const checkCloser = (input, opts) => {
  const roles = normalizeRunRoles(input);
  if (roles) checkSeparationOfPowers(roles);
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('[sdlc-lean] closer refused: missing evidence (mechanical presence-check: evidence + hashes + critic verdicts required, no judgment)');
  }
  const evidence = input.evidence ?? input.evidenceAbs ?? input.evidenceFile ?? input.evidencePath;
  const hashes = input.plan_sha256 ?? input.spec_sha256 ?? input.sha256 ?? input.hashes ?? input.planHash ?? input.specHash;
  const verdicts = input.verdicts ?? input.critics ?? input.criticVerdicts ?? input.critic_verdicts;
  if (!closerPresent(evidence)) {
    throw new Error('[sdlc-lean] closer refused: missing evidence (mechanical presence-check: evidence + hashes + critic verdicts required, no judgment)');
  }
  if (!closerPresent(hashes)) {
    throw new Error('[sdlc-lean] closer refused: missing hashes (mechanical presence-check: evidence + hashes + critic verdicts required, no judgment)');
  }
  if (!closerPresent(verdicts)) {
    throw new Error('[sdlc-lean] closer refused: missing critic verdicts (mechanical presence-check: evidence + hashes + critic verdicts required, no judgment)');
  }
  // Reward-hacking guard (RH-1): only when evidence rows are observable as
  // an array. A string evidence value is a file path the CLI owns, so it
  // stays out of scope here. With no new-behavior rows this passes, keeping
  // every existing caller green.
  const closerRows = Array.isArray(input.evidence) ? input.evidence
    : Array.isArray(input.rows) ? input.rows
    : Array.isArray(input.tasks) ? input.tasks : null;
  const envelopePath = closerEnvelopePath(input);
  let outcomes = input.expectedOutcomes ?? input.expected_outcomes ?? input.outcomes ?? null;
  if (envelopePath !== '') {
    let root = closerRootFor(input, opts, envelopePath);
    let approvedAt = closerApprovedAt(input, opts);
    if (root && !approvedAt) {
      try {
        const marker = JSON.parse(fs.readFileSync(path.join(root, '.sdlc', 'spec-gate.json'), 'utf8'));
        if (typeof marker?.approved_at === 'string' && marker.approved_at) approvedAt = marker.approved_at;
      } catch { /* unobservable: fail open below */ }
    }
    if (!Array.isArray(outcomes)) {
      const fromFile = root ? closerOutcomesFromFile(root, envelopePath) : null;
      if (Array.isArray(fromFile) && fromFile.length) outcomes = fromFile;
    }
    if (root && approvedAt) {
      let rel = envelopePath;
      try {
        if (path.isAbsolute(envelopePath)) {
          const r = path.relative(root, envelopePath);
          if (r && !r.startsWith('..') && !path.isAbsolute(r)) rel = r.split(path.sep).join('/');
        } else {
          rel = envelopePath.replace(/^\.\//, '').split(path.sep).join('/');
        }
      } catch { /* keep raw */ }
      checkEnvelopeClean(root, rel, approvedAt, opts);
    }
    // Unobservable git context: fail open (outcomes still enforced below).
  }
  if (closerRows) {
    checkExpectedOutcomes(closerRows, outcomes);
  }
  return true;
};

export const verifyCloser = checkCloser;
export const validateCloser = checkCloser;
export const checkCloserPresence = checkCloser;

// --- V2 `/approve` command (human-only) -------------------------------------
// The human types `/approve <plan> [sha256:<hex>]` in the TUI. The command
// reuses the CLI contract module and never touches the plan file. No tool and
// no agent-callable path exists: only this user-invoked command approves.
//
// The installed global CLI is preferred; the project copy is a fallback used
// only when no global copy exists. A fresh module URL is used per invocation so
// a re-installed CLI (or a test fake) is not served from the ESM cache.
// Global-first contract import: the installed global copy wins, the project
// copy is used only when no global exists, and two differing copies refuse
// instead of risking cli drift (mirrors register.js loadContractCli).
export const resolveApprovalCli = (root) => {
  const base = process.env.XDG_CONFIG_HOME
    ? process.env.XDG_CONFIG_HOME
    : (process.env.HOME ? path.join(process.env.HOME, '.config') : null);
  const globalCli = base ? path.join(base, 'opencode', 'scripts', 'spec-check.mjs') : null;
  const projectCli = (typeof root === 'string' && root) ? path.join(root, 'scripts', 'spec-check.mjs') : null;
  const inspectCli = (candidate) => {
    if (!candidate) return null;
    let st;
    try {
      st = fs.lstatSync(candidate);
    } catch (err) {
      if (err?.code === 'ENOENT') return null;
      throw new Error(`[sdlc-lean] cannot inspect the spec-check cli: ${err?.message || err}`);
    }
    if (st.isSymbolicLink()) throw new Error(`[sdlc-lean] spec-check cli must not be a symlink: ${candidate} (cli parity refused)`);
    if (!st.isFile()) return null;
    return candidate;
  };
  const globalFound = inspectCli(globalCli);
  const projectFound = inspectCli(projectCli);
  if (globalFound && projectFound) {
    const globalBytes = fs.readFileSync(globalFound);
    const projectBytes = fs.readFileSync(projectFound);
    if (!globalBytes.equals(projectBytes)) {
      throw new Error('[sdlc-lean] global and project spec-check copies differ (cli parity refused); make them byte-identical or remove one');
    }
  }
  return globalFound || projectFound || null;
};

const APPROVAL_USAGE = 'usage: /approve <repo-relative-or-absolute-plan.md> [sha256:<hex>]';

export const parseApprovalArg = (text) => {
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if (!trimmed) throw new Error(APPROVAL_USAGE);
  const tokens = trimmed.split(/\s+/);
  const [arg, hashToken] = tokens;
  if (arg.startsWith('-')) throw new Error(`${APPROVAL_USAGE} (flags are not accepted)`);
  if (tokens.length > 2) throw new Error(`${APPROVAL_USAGE} (exactly one plan path)`);
  let hash;
  if (hashToken !== undefined) {
    if (hashToken.startsWith('-')) throw new Error(`${APPROVAL_USAGE} (flags are not accepted)`);
    const match = /^sha256:([0-9a-fA-F]{64})$/.exec(hashToken);
    if (!match) {
      throw new Error(`${APPROVAL_USAGE} (exactly one plan path plus an optional sha256:<hex>)`);
    }
    hash = match[1].toLowerCase();
  }
  return { arg, hash };
};

let _approvalImportSeq = 0;
const importApprovalCli = (cli) => import(
  `${pathToFileURL(cli).href}?sdlc-lean-approve=${Date.now()}-${_approvalImportSeq++}`,
);

const approvePlan = async (ctx, { sessionID, prompt } = {}) => {
  const notify = async (text) => {
    try {
      await ctx.session.synthetic({ sessionID, text });
    } catch (err) {
      console.error('[sdlc-lean] approval result could not be shown:', err);
    }
  };
  try {
    // Approval is anchored to the V2 location only: never ctx.directory/cwd.
    const root = ctx.location?.directory;
    if (typeof root !== 'string' || !root) {
      throw new Error('no project directory for this session (ctx.location.directory is required)');
    }
    const { arg, hash } = parseApprovalArg(prompt?.text);
    const cli = resolveApprovalCli(root);
    if (!cli) throw new Error('scripts/spec-check.mjs not found (global config or project)');
    const mod = await importApprovalCli(cli);

    // 1. Build first, then 2. contain plan/spec with realpath, 3. hash compare.
    const rel = mod.normalizeRel(root, arg);
    let gate = null;
    let isDraftAutofill = false;
    try {
      gate = mod.buildGate(root, rel);
    } catch (err) {
      if (err?.code !== 'not-approved') throw err;
      isDraftAutofill = true;
    }

    if (!isDraftAutofill) {
      const realRoot = fs.realpathSync(root);
      for (const [label, relPath] of [['plan', gate.plan], ['spec', gate.spec]]) {
        const real = fs.realpathSync(path.resolve(realRoot, relPath));
        const inside = path.relative(realRoot, real);
        if (!inside || inside === '..' || inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside)) {
          throw new Error(`refused: ${label} escapes the project root`);
        }
      }

      if (hash && hash !== gate.plan_sha256) {
        throw new Error(`sha256 mismatch: expected ${gate.plan_sha256}, got ${hash}`);
      }

      const markerAbs = path.join(root, '.sdlc', 'spec-gate.json');
      let preexistingMarker = true;
      try {
        fs.lstatSync(markerAbs);
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
        preexistingMarker = false;
      }

      // Realpath containment for the marker home: a symlinked .sdlc would
      // redirect the write outside the project, so refuse instead of writing
      // (mirrors the popup register.js containment).
      const sdlcAbs = path.join(root, '.sdlc');
      try {
        const sdlcSt = fs.lstatSync(sdlcAbs);
        if (sdlcSt.isSymbolicLink()) throw new Error('refused: .sdlc must not be a symlink (escape refused)');
        const realSdlc = fs.realpathSync(sdlcAbs);
        if (realSdlc !== realRoot && !realSdlc.startsWith(`${realRoot}${path.sep}`)) {
          throw new Error('refused: .sdlc escapes the project root (realpath escape refused)');
        }
      } catch (err) {
        if (err?.message?.startsWith('refused:')) throw err;
        if (err?.code !== 'ENOENT') throw new Error(`refused: cannot inspect .sdlc: ${err?.message || err}`);
      }

      // Overwrite guard (mirrors the popup second confirm naming the old
      // plan and hash): the typed path cannot ask again, so a valid active
      // gate is kept and the human must close first.
      if (preexistingMarker) {
        let current = null;
        let currentValid = false;
        try {
          current = mod.readGate(root);
          mod.validateGate(root, current);
          currentValid = true;
        } catch {
          currentValid = false;
        }
        if (currentValid) {
          const oldPlan = typeof current?.plan === 'string' ? current.plan : 'unknown plan';
          const oldHash = typeof current?.plan_sha256 === 'string' ? current.plan_sha256 : 'unknown hash';
          throw new Error(`refused: active gate for ${oldPlan} (sha256 ${oldHash}) kept; run spec-check close before approving ${gate.plan}`);
        }
      }

      // 4. Write the host-user marker (plan file is never written).
      const marker = {
        ...gate,
        approved_by: os.userInfo().username,
        approved_at: new Date().toISOString(),
        approved_via: hash ? 'tui-picker' : 'tui-command',
      };
      await mod.writeGate(root, marker);

      // 5. Re-read, validate, and compare; delete only a marker this call wrote.
      try {
        const written = mod.readGate(root);
        const valid = mod.validateGate(root, written);
        for (const key of ['plan', 'spec', 'plan_sha256', 'spec_sha256']) {
          if (valid[key] !== gate[key]) throw new Error(`spec gate drift after write: ${key}`);
        }
        if (JSON.stringify(valid.files) !== JSON.stringify(gate.files)
          || JSON.stringify(valid.allow || []) !== JSON.stringify(gate.allow || [])) {
          throw new Error('spec gate drift after write: files/allow');
        }
      } catch (err) {
        if (!preexistingMarker) {
          try { fs.unlinkSync(markerAbs); } catch (cleanupErr) { /* best effort */ }
        }
        throw err;
      }

      await notify(`[sdlc-lean] spec gate active: ${marker.plan} -> ${marker.spec} (${marker.files.length} files, plan sha256 ${marker.plan_sha256.slice(0, 12)})`);
      return;
    }

    // Symmetric draft autofill: same helpers/order/restore as the popup and
    // the CLI approve (sanitizeApprovedBy -> applyApprovalFill ->
    // parsePlanText preview + spec regular-file check -> write -> buildGate
    // -> writeGate -> re-read -> validateGate). Pipe still refused: there is
    // no pipe path here; a human invoking /approve is the approval.
    // Keep fillApprovalFrontmatter in the shared-contract path (CLI reference
    // for the same order); this path uses the pure fill for restore control.
    void mod.fillApprovalFrontmatter;
    const planAbsDraft = path.resolve(root, rel);
    try {
      const st = fs.lstatSync(planAbsDraft);
      if (st.isSymbolicLink()) throw new Error('refused: plan must not be a symlink');
      if (!st.isFile()) throw new Error('refused: plan is not a regular file');
    } catch (err) {
      if (err?.message?.startsWith('refused:')) throw err;
      throw err;
    }
    const originalText = fs.readFileSync(planAbsDraft, 'utf8');
    const draftHash = crypto.createHash('sha256').update(fs.readFileSync(planAbsDraft)).digest('hex');
    if (hash && hash !== draftHash) {
      throw new Error(`sha256 mismatch: expected ${draftHash}, got ${hash}`);
    }
    const realRootDraft = fs.realpathSync(root);
    {
      const real = fs.realpathSync(planAbsDraft);
      const inside = path.relative(realRootDraft, real);
      if (!inside || inside === '..' || inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside)) {
        throw new Error('refused: plan escapes the project root');
      }
    }
    const draftUsername = os.userInfo().username;
    const by = mod.sanitizeApprovedBy(draftUsername);
    const at = new Date().toISOString();
    const next = mod.applyApprovalFill(originalText, by, at);
    const preview = mod.parsePlanText(next);
    {
      const specAbs = path.resolve(root, preview.spec);
      let sst;
      try {
        sst = fs.lstatSync(specAbs);
      } catch (err) {
        throw err;
      }
      if (sst.isSymbolicLink()) throw new Error('refused: spec must not be a symlink');
      if (!sst.isFile()) throw new Error('refused: spec is not a regular file');
      const realSpec = fs.realpathSync(specAbs);
      const inside = path.relative(realRootDraft, realSpec);
      if (!inside || inside === '..' || inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside)) {
        throw new Error('refused: spec escapes the project root');
      }
    }
    const markerAbsDraft = path.join(root, '.sdlc', 'spec-gate.json');
    let preexistingDraft = true;
    try {
      const mst = fs.lstatSync(markerAbsDraft);
      if (mst.isSymbolicLink()) throw new Error('refused: spec-gate marker must not be a symlink (escape refused)');
      if (!mst.isFile()) preexistingDraft = true;
    } catch (err) {
      if (err?.message?.startsWith('refused:')) throw err;
      if (err.code !== 'ENOENT') throw err;
      preexistingDraft = false;
    }
    // Realpath containment for the marker home: a symlinked .sdlc would
    // redirect the flip-then-gate writes outside the project, so refuse
    // before mutating either file (mirrors the popup register.js containment).
    const sdlcAbsDraft = path.join(root, '.sdlc');
    try {
      const sdlcSt = fs.lstatSync(sdlcAbsDraft);
      if (sdlcSt.isSymbolicLink()) throw new Error('refused: .sdlc must not be a symlink (escape refused)');
      const realSdlc = fs.realpathSync(sdlcAbsDraft);
      if (realSdlc !== realRootDraft && !realSdlc.startsWith(`${realRootDraft}${path.sep}`)) {
        throw new Error('refused: .sdlc escapes the project root (realpath escape refused)');
      }
    } catch (err) {
      if (err?.message?.startsWith('refused:')) throw err;
      if (err?.code !== 'ENOENT') throw new Error(`refused: cannot inspect .sdlc: ${err?.message || err}`);
    }
    // Overwrite guard (mirrors the popup second confirm naming the old
    // plan and hash): the typed path cannot ask again, so a valid active
    // gate is kept and the human must close first — before the flip.
    if (preexistingDraft) {
      let current = null;
      let currentValid = false;
      try {
        current = mod.readGate(root);
        mod.validateGate(root, current);
        currentValid = true;
      } catch {
        currentValid = false;
      }
      if (currentValid) {
        const oldPlan = typeof current?.plan === 'string' ? current.plan : 'unknown plan';
        const oldHash = typeof current?.plan_sha256 === 'string' ? current.plan_sha256 : 'unknown hash';
        throw new Error(`refused: active gate for ${oldPlan} (sha256 ${oldHash}) kept; run spec-check close before approving ${rel}`);
      }
    }
    let flipped = false;
    let wroteMarker = false;
    let writtenRawDraft = null;
    try {
      fs.writeFileSync(planAbsDraft, next);
      flipped = true;
      gate = mod.buildGate(root, rel);
      const flippedHash = crypto.createHash('sha256').update(fs.readFileSync(planAbsDraft)).digest('hex');
      if (gate.plan_sha256 !== flippedHash) throw new Error('refused: flip hash mismatch after buildGate');
      for (const [label, relPath] of [['plan', gate.plan], ['spec', gate.spec]]) {
        const real = fs.realpathSync(path.resolve(realRootDraft, relPath));
        const inside = path.relative(realRootDraft, real);
        if (!inside || inside === '..' || inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside)) {
          throw new Error(`refused: ${label} escapes the project root`);
        }
      }
      const marker = {
        ...gate,
        approved_by: by,
        approved_at: at,
        approved_via: 'tui-popup-autofill',
      };
      await mod.writeGate(root, marker);
      wroteMarker = true;
      writtenRawDraft = `${JSON.stringify(marker, null, 2)}\n`;
      try {
        const written = mod.readGate(root);
        const valid = mod.validateGate(root, written);
        for (const key of ['plan', 'spec', 'plan_sha256', 'spec_sha256']) {
          if (valid[key] !== gate[key]) throw new Error(`spec gate drift after write: ${key}`);
        }
        if (JSON.stringify(valid.files) !== JSON.stringify(gate.files)
          || JSON.stringify(valid.allow || []) !== JSON.stringify(gate.allow || [])) {
          throw new Error('spec gate drift after write: files/allow');
        }
      } catch (err) {
        if (!preexistingDraft && wroteMarker && writtenRawDraft !== null) {
          try {
            const cur = fs.readFileSync(markerAbsDraft, 'utf8');
            if (cur === writtenRawDraft) fs.unlinkSync(markerAbsDraft);
          } catch (cleanupErr) { /* best effort */ }
        } else if (!preexistingDraft) {
          try { fs.unlinkSync(markerAbsDraft); } catch (cleanupErr) { /* best effort */ }
        }
        throw err;
      }
      await notify(`[sdlc-lean] spec gate active: ${marker.plan} -> ${marker.spec} (${marker.files.length} files, plan sha256 ${marker.plan_sha256.slice(0, 12)})`);
    } catch (err) {
      if (flipped) {
        try { fs.writeFileSync(planAbsDraft, originalText); } catch (restoreErr) { /* best effort restore original */ }
      }
      if (wroteMarker && !preexistingDraft && writtenRawDraft !== null) {
        try {
          const cur = fs.readFileSync(markerAbsDraft, 'utf8');
          if (cur === writtenRawDraft) fs.unlinkSync(markerAbsDraft);
        } catch (cleanupErr) { /* best effort */ }
      }
      throw err;
    }
  } catch (err) {
    await notify(`[sdlc-lean] /approve refused: ${err?.message || err}`);
  }
};

// Shell readers that would print a secret file into the model context. A reader
// only counts at the start of a simple command (optionally after sudo/env), so
// benign prose such as `git commit -m "remove cat .env"` still passes.
const SECRET_READ_RE = new RegExp(
  `(?:^|[;&|\\n]\\s*)(?:sudo\\s+|env\\s+|command\\s+)?`
  + `(?:cat|bat|tac|head|tail|less|more|strings|xxd|od|hexdump|base64|nl)\\b[^\\n|;&]*`
  + `(?:\\.env(?:\\.(?!example\\b|sample\\b|template\\b)[\\w.-]+)?|id_rsa|id_ed25519|[\\w.-]+\\.(?:pem|key))`
  + `(?=[\\s'"]|$)`,
  'i',
);

// Colab lifecycle guards: killing the MCP bridge is not a release substitute
// (the runtime stays allocated), and /content is VM-ephemeral — unexported
// artifacts are lost with it. Literal patterns only, same style as above.
// Like SECRET_READ_RE, each pattern only counts at the start of a simple
// command (optionally after sudo/env/command), so quoted prose passes; the
// trailing `(?![\w-])` keeps suffixed processes (colab-mcp-helper) benign.
const COLAB_CMD = '(?:^|[;&|\\n]\\s*)(?:sudo\\s+|env\\s+|command\\s+)?';

const COLAB_BRIDGE_MSG = 'Refusing to kill the Colab MCP bridge process. Killing the colab-mcp server is not a release substitute — the runtime stays allocated. Release compute with `google.colab.runtime.unassign()` in an approved notebook cell, then verify per the `colab-lifecycle` skill.';

const COLAB_GUARDS = [
  {
    // `-0` is pkill/killall's liveness check: it never sends a signal
    re: new RegExp(`${COLAB_CMD}(?:pkill|killall)\\b(?![^;\\n]*\\s-0\\b)[^;\\n]*\\bcolab[_-]mcp(?![\\w-])`),
    msg: COLAB_BRIDGE_MSG,
  },
  {
    re: new RegExp(`${COLAB_CMD}kill\\b[^;\\n]*\\$\\(\\s*(?:pgrep|ps)\\b[^)\\n]*\\bcolab[_-]mcp(?![\\w-])`),
    msg: COLAB_BRIDGE_MSG,
  },
  {
    re: new RegExp(`${COLAB_CMD}rm\\s+(?:-[^;\\s]*r[^;\\s]*\\s+)['"]?\\/content(?:\\/|\\s|$|;|['"])`),
    msg: 'Refusing to delete /content. On a Colab VM /content is deleted with the runtime, so unexported artifacts are lost with it. Export artifacts to an approved destination and verify hashes/acks before deleting.',
  },
];

export const checkSafety = (tool, args = {}) => {
  if (FILE_TOOLS.has(tool)) {
    const candidates = [args.filePath, args.path];
    const body = args.patchText || args.diff || args.patch;
    if (typeof body === 'string' && body) candidates.push(...pathsFromPatch(body));
    for (const raw of candidates) {
      const p = String(raw || '');
      if (p && SENSITIVE_PATH_RE.test(p)) {
        throw new Error(
          `[sdlc-lean] Refusing to open sensitive file "${p}". Inspect keys/fingerprints via a safe command instead; never load secrets into context.`,
        );
      }
    }
  }
  if (tool === 'bash' || tool === 'shell') {
    const cmd = String(args.command || '');
    for (const re of DESTRUCTIVE_PATTERNS) {
      if (re.test(cmd)) {
        throw new Error(
          '[sdlc-lean] Refusing destructive command. Narrow the target path or ask the human operator to run it outside the agent.',
        );
      }
    }
    if (SECRET_READ_RE.test(cmd)) {
      throw new Error(
        '[sdlc-lean] Refusing to read a sensitive file into context. Inspect metadata (e.g. `ls -l`, key fingerprints) instead; secrets never enter the model context.',
      );
    }
    for (const { re, msg } of COLAB_GUARDS) {
      if (re.test(cmd)) throw new Error(`[sdlc-lean] ${msg}`);
    }
  }
};

// --- Advisory host evidence (V2 execute.after) -------------------------------
// Hash-only JSONL cross-check for plan Verify commands. Never store the raw
// command or output. Advisory only: every failure is swallowed, so evidence can
// never block a tool. Append-only, 0700/.0600, symlink-safe, capped.
export const HOST_EVIDENCE_MAX_ROWS = 500;
export const HOST_EVIDENCE_MAX_BYTES = 2 * 1024 * 1024;

export const hostEvidencePath = (root) => path.join(root, '.sdlc', 'host-evidence.jsonl');

export const normalizeCommand = (value) => String(value ?? '')
  .replace(/^\s*[!$]\s+/, '')
  .trim()
  .replace(/\s+/g, ' ');

const sha256Hex = (value) => crypto.createHash('sha256').update(value).digest('hex');

// In-process row counter seeded once per log path (cold path read); the hot
// path only stats the file, never re-reads it.
const _hostEvidenceCounts = new Map();

const countRows = (text) => text.split('\n').filter((line) => line.trim() !== '').length;

const seedHostEvidenceCount = (log) => {
  let st;
  try {
    st = fs.lstatSync(log);
  } catch (err) {
    if (err.code === 'ENOENT') return 0;
    throw err;
  }
  if (st.isSymbolicLink() || !st.isFile()) return HOST_EVIDENCE_MAX_ROWS;
  if (st.size >= HOST_EVIDENCE_MAX_BYTES) return HOST_EVIDENCE_MAX_ROWS;
  try {
    return countRows(fs.readFileSync(log, 'utf8'));
  } catch (err) {
    return HOST_EVIDENCE_MAX_ROWS;
  }
};

export const appendHostEvidence = (root, row) => {
  if (process.env.SDLC_LEAN_NO_HOST_EVIDENCE === '1') return false;
  if (typeof root !== 'string' || !root) return false;
  const log = hostEvidencePath(root);
  const dir = path.dirname(log);
  try {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const dirStat = fs.lstatSync(dir);
    if (dirStat.isSymbolicLink() || !dirStat.isDirectory()) return false;
    try { fs.chmodSync(dir, 0o700); } catch (modeErr) { /* best effort */ }

    let state = _hostEvidenceCounts.get(log);
    if (!state) {
      state = { count: seedHostEvidenceCount(log) };
      _hostEvidenceCounts.set(log, state);
    } else {
      let st = null;
      try {
        st = fs.lstatSync(log);
      } catch (err) {
        if (err.code !== 'ENOENT') return false;
      }
      if (st && (st.isSymbolicLink() || !st.isFile())) return false;
      if (st && st.size >= HOST_EVIDENCE_MAX_BYTES) return false;
    }
    if (state.count >= HOST_EVIDENCE_MAX_ROWS) return false;

    let logStat = null;
    try {
      logStat = fs.lstatSync(log);
    } catch (err) {
      if (err.code !== 'ENOENT') return false;
    }
    if (logStat && (logStat.isSymbolicLink() || !logStat.isFile())) return false;

    const fd = fs.openSync(
      log,
      fs.constants.O_APPEND | fs.constants.O_CREAT | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW,
      0o600,
    );
    try {
      const openStat = fs.fstatSync(fd);
      if (!openStat.isFile()) return false;
      fs.fchmodSync(fd, 0o600);
      fs.writeSync(fd, `${JSON.stringify(row)}\n`);
      state.count += 1;
      return true;
    } finally {
      fs.closeSync(fd);
    }
  } catch (err) {
    console.error('[sdlc-lean] host evidence write failed:', err);
    return false;
  }
};

let _specCheckModule;
const loadSpecCheckModule = async () => {
  if (_specCheckModule) return _specCheckModule;
  const cli = resolveSpecCheck();
  if (!cli) return null;
  try {
    _specCheckModule = await import(pathToFileURL(cli).href);
    return _specCheckModule;
  } catch (err) {
    return null;
  }
};

export const recordHostEvidence = async (event, root) => {
  try {
    if (!event || typeof event !== 'object') return false;
    if (typeof root !== 'string' || !root) return false;
    if (process.env.SDLC_LEAN_NO_HOST_EVIDENCE === '1') return false;
    const tool = event.tool;
    if (tool !== 'bash' && tool !== 'shell') return false;
    const input = event.input && typeof event.input === 'object' ? event.input : {};
    if (typeof input.command !== 'string' || input.command.trim() === '') return false;
    const meta = event.metadata && typeof event.metadata === 'object'
      ? event.metadata
      : (event.result?.metadata && typeof event.result.metadata === 'object' ? event.result.metadata : {});
    if (event.background === true || meta.background === true) return false;
    if (meta.status === 'running' || meta.timeout === true) return false;

    // Require an active, valid marker: no gate means no evidence.
    const mod = await loadSpecCheckModule();
    if (!mod) return false;
    let gate;
    try { gate = mod.readGate(root); } catch (err) { return false; }
    if (!gate) return false;
    let valid;
    try { valid = mod.validateGate(root, gate); } catch (err) { return false; }

    const command = normalizeCommand(input.command);
    if (!command) return false;
    const output = typeof event.output === 'string'
      ? event.output
      : (typeof event.result?.output === 'string' ? event.result.output : null);
    const rawExit = meta.exit ?? event.exit ?? event.result?.metadata?.exit;
    const exit = typeof rawExit === 'number' ? rawExit : null;
    const rawWorkdir = event.workdir ?? input.workdir;
    const workdir = typeof rawWorkdir === 'string' ? rawWorkdir : null;
    const status = typeof event.status === 'string' && event.status
      ? event.status
      : (typeof meta.status === 'string' && meta.status ? meta.status : 'completed');

    return appendHostEvidence(root, {
      at: new Date().toISOString(),
      sessionID: typeof event.sessionID === 'string' ? event.sessionID : null,
      tool,
      argv0: command.split(' ')[0],
      command_sha256: sha256Hex(command),
      plan_sha256: valid.plan_sha256,
      status,
      exit,
      output_sha256: output === null ? null : sha256Hex(output),
      output_bytes: output === null ? 0 : Buffer.byteLength(output),
      workdir,
    });
  } catch (err) {
    console.error('[sdlc-lean] host evidence failed:', err);
    return false;
  }
};

/** V1 plugin (named export, OpenCode 1.x). */
export const SdlcLeanPlugin = async ({ client, directory } = {}) => {
  return {
    config: async (config) => {
      if (Array.isArray(config.skills)) return; // V2 shape — setup() handles it
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(skillsDir)) config.skills.paths.push(skillsDir);
    },

    // First-user-message injection (superpowers pattern: avoids per-turn
    // system-message bloat and multi-system-message model breakage).
    'experimental.chat.messages.transform': async (_input, output) => {
      const bootstrap = getBootstrapContent();
      if (!bootstrap || !output.messages.length) return;
      const firstUser = output.messages.find((m) => m.info.role === 'user');
      if (!firstUser || !firstUser.parts.length) return;
      if (firstUser.parts.some((p) => p.type === 'text' && p.text.includes('EXTREMELY_IMPORTANT'))) return;
      if (client && (await isChildSession((id) => client.session.get({ path: { id } }), firstUser.info.sessionID))) return;
      const ref = firstUser.parts[0];
      firstUser.parts.unshift({ ...ref, type: 'text', text: bootstrap });
      await announceActivation(client, firstUser.info.sessionID);
    },

    // Safety net: destructive commands + sensitive files. Always on.
    // Spec gate: opt-in via .sdlc/spec-gate.json, checked after safety.
    'tool.execute.before': async (input, output) => {
      checkSafety(input.tool, output.args);
      checkSpecGate(input.tool, output.args, directory);
    },

    // Loop memory: carry durable state across compaction summaries.
    // Prefer the host-provided project directory (works for global installs);
    // fall back to the repo-root default when it is absent (V1 legacy default).
    'experimental.session.compacting': async (_input, output) => {
      try {
        const parts = compactionContext(directory || REPO_ROOT);
        if (!parts.length) return;
        if (!Array.isArray(output.context)) output.context = [];
        output.context.push(...parts);
      } catch (err) {
        console.error('[sdlc-lean] compaction hook failed:', err);
      }
    },
  };
};

/** V2 setup (default export, OpenCode 2.x). No-ops gracefully on V1 ctx. */
async function setup(ctx) {
  if (!ctx || !ctx.skill || typeof ctx.skill.transform !== 'function' || !ctx.session || typeof ctx.session.hook !== 'function') {
    return; // V1-shaped ctx — named export serves V1
  }
  try {
    const skills = listSkills();
    await ctx.skill.transform((draft) => {
      for (const s of skills) {
        try {
          draft.add(s);
        } catch (err) {
          console.error(`[sdlc-lean] skill "${s.id}" rejected by host, skipping:`, err);
        }
      }
    });
  } catch (err) {
    console.error('[sdlc-lean] skill registration failed:', err);
  }
  const root = projectRoot(ctx);

  // AC1: persisted bootstrap. Injection is decided by the persisted
  // session.context lookup (no process-local once-per-session set and no text
  // marker). A runtime throw only flags the session for the context fallback.
  try {
    await ctx.session.hook('prompt', async (event) => {
      const sessionID = event?.sessionID;
      const editable = event?.prompt;
      if (!sessionID || !editable || !editable.text || typeof editable.text !== 'string') return;
      try {
        if (typeof ctx.session.context !== 'function') return;
        let lookup;
        try {
          lookup = await ctx.session.context({ sessionID });
        } catch (err) {
          // A rejected/thrown lookup is a skip, not the runtime fallback.
          console.error('[sdlc-lean] prompt context lookup failed, skipping:', err);
          return;
        }
        const messages = lookup?.data?.messages ?? lookup?.messages;
        if (!Array.isArray(messages)) return;
        if (messages.some((m) => m?.role === 'user' || m?.info?.role === 'user')) return;
        if (typeof ctx.session.get === 'function'
          && (await isChildSession((id) => ctx.session.get({ sessionID: id }), sessionID))) return;
        const bootstrap = getBootstrapContent();
        if (!bootstrap) return;
        editable.text = `${editable.text}\n\n${bootstrap}`;
        writeStatus(sessionID);
      } catch (err) {
        console.error('[sdlc-lean] prompt hook failed, flagging context fallback:', err);
        _markPromptFallback(sessionID);
      }
    });
  } catch (err) {
    console.error('[sdlc-lean] prompt hook registration failed:', err);
  }

  // AC3: validated active-gate summary only. The bootstrap is pushed once, and
  // only for a session flagged by the prompt fallback.
  try {
    await ctx.session.hook('context', async (event) => {
      try {
        const sessionID = event?.sessionID;
        if (sessionID && _promptFallback.has(sessionID) && Array.isArray(event.system)) {
          _promptFallback.delete(sessionID);
          const bootstrap = getBootstrapContent();
          if (bootstrap) {
            event.system.push({ type: 'text', text: bootstrap });
            return;
          }
        }
        if (!root || !Array.isArray(event?.system)) return;
        const cli = resolveSpecCheck();
        if (!cli) return;
        const mod = await import(pathToFileURL(cli).href);
        let gate;
        try {
          gate = mod.readGate(root);
        } catch (err) {
          event.system.push({ type: 'text', text: 'gate invalid' });
          return;
        }
        if (!gate) return; // no marker: no injection
        let valid;
        try {
          valid = mod.validateGate(root, gate);
        } catch (err) {
          event.system.push({ type: 'text', text: 'gate invalid' });
          return;
        }
        event.system.push({
          type: 'text',
          text: `[sdlc-lean] active spec gate: plan ${valid.plan}; spec ${valid.spec}; ${valid.files.length} files.`,
        });
      } catch (err) {
        console.error('[sdlc-lean] context hook failed:', err);
      }
    });
  } catch (err) {
    console.error('[sdlc-lean] session hook registration failed:', err);
  }
  // Loop memory: inject durable state into V2 compaction summaries (fail-open).
  // v2.0.22 registers session hooks as "context" | "compaction" | "generate"
  // (verified in the runtime bundle; "experimental.session.compacting" is the
  // V1 Hooks-object name and never fires here). Built-ins append text parts to
  // event.system, so we do the same; event.context is accepted defensively.
  // The root is location-first; an unknown root yields [] (no cwd fallback).
  try {
    await ctx.session.hook('compaction', async (event) => {
      try {
        const parts = compactionContext(root);
        if (!parts.length) return;
        if (event && Array.isArray(event.system)) {
          for (const text of parts) event.system.push({ type: 'text', text });
        } else if (event && Array.isArray(event.context)) {
          event.context.push(...parts);
        }
      } catch (err) {
        console.error('[sdlc-lean] compaction hook failed:', err);
      }
    });
  } catch (err) {
    console.error('[sdlc-lean] compaction hook registration failed:', err);
  }
  // V2 safety net: V1 hooks are not bridged to V2, so register the same guards
  // through the V2 tool hook. Throwing blocks the tool call. Keep the before
  // callback synchronous: the existing host contract and tests expect a sync
  // throw. Host evidence is async, hash-only, and never blocks.
  try {
    if (ctx.tool && typeof ctx.tool.hook === 'function') {
      await ctx.tool.hook('execute.before', (event) => {
        checkSafety(event.tool, event.input || {});
        checkSpecGate(event.tool, event.input || {}, root);
      });
      await ctx.tool.hook('execute.after', async (event) => {
        await recordHostEvidence(event, root);
      });
    }
  } catch (err) {
    console.error('[sdlc-lean] tool hook registration failed:', err);
  }
  // Human-only approval: register `/approve <plan>` when the host exposes the
  // V2 command surface. No-ops on hosts without it; registration errors never
  // break setup.
  try {
    if (ctx.command && typeof ctx.command.transform === 'function') {
      await ctx.command.transform((editor) => editor.add({
        name: 'approve',
        description: 'Approve an SDLC plan and activate the spec gate (human-only)',
        execute: (invocation) => approvePlan(ctx, invocation),
      }));
    }
  } catch (err) {
    console.error('[sdlc-lean] command registration failed:', err);
  }
}

export default { id: 'sdlc-lean', server: SdlcLeanPlugin, setup };
