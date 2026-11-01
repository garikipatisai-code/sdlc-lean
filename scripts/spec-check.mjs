#!/usr/bin/env node
// Spec-gate contract for sdlc-lean (zero dependencies).
//
// An approved plan binds a spec (SHA-256), a file scope, and an approval
// record in .sdlc/spec-gate.json. The plugin reads that marker and blocks
// file-tool edits outside the scope. This module owns the contract and the
// approve/verify/close/check CLI.
//
// Trust model: local drift guard, not a sandbox. A writer with file access can
// edit the marker; bash redirection is out of scope by design.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'url';

export const GATE_VERSION = 1;
export const GATE_REL = path.join('.sdlc', 'spec-gate.json');
const MARKER_REL = GATE_REL.split(path.sep).join('/');
const CLI_FILE = fileURLToPath(import.meta.url);
const HASH_RE = /^[0-9a-f]{64}$/;
const UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

// The debt ledger is control state: recording a deferred shortcut must never be
// blocked by the plan scope.
const IMPLICIT_ALLOW = ['docs/debt-ledger.md'];

export class SpecCheckError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SpecCheckError';
    this.code = code;
  }
}

const fail = (code, message) => { throw new SpecCheckError(code, message); };

/**
 * Approval is a human act: both streams must be TTYs. There is no env-var or
 * flag bypass; a human running the command in a terminal is the only approval.
 */
export const humanApproval = ({ stdinTTY, stdoutTTY } = {}) => {
  if (stdinTTY !== true || stdoutTTY !== true) {
    fail('tty-required', 'approval requires an interactive terminal: run this command yourself in a terminal (stdin and stdout must be TTYs); non-interactive approval is denied');
  }
  return true;
};

export const gatePath = (root = process.cwd()) => path.join(path.resolve(root), GATE_REL);

export const hashFile = (file) => crypto.createHash('sha256')
  .update(fs.readFileSync(file))
  .digest('hex');

const stripQuotes = (value) => value.replace(/^(["'])([\s\S]*)\1$/, '$2');

const assertUtc = (value, label) => {
  if (typeof value !== 'string' || !UTC_RE.test(value) || Number.isNaN(Date.parse(value))) {
    fail('invalid-time', `${label} must be an ISO-8601 UTC timestamp (…Z)`);
  }
  return value;
};

const assertText = (value, label) => {
  if (typeof value !== 'string' || value.trim() === '') {
    fail('invalid-field', `${label} must be a non-empty string`);
  }
  return value.trim();
};

/**
 * Normalize a plan/spec/allow pattern. Relative only; no absolute paths, no
 * `..` escapes, no backslashes. Globs (`*`, `**`, `?`) are allowed here.
 */
export const assertSafePattern = (value, label = 'path') => {
  if (typeof value !== 'string' || value.trim() === '') {
    fail('unsafe-path', `${label} must be a non-empty relative path`);
  }
  if (/[\\\0\r\n]/.test(value)) {
    fail('unsafe-path', `${label} must use forward slashes and contain no control characters`);
  }
  let p = value.trim().replace(/^\.\//, '');
  if (p.startsWith('/') || /^[A-Za-z]:/.test(p)) {
    fail('unsafe-path', `${label} must be relative, got "${value}"`);
  }
  const parts = p.split('/');
  if (parts.some((part) => part === '' || part === '.' || part === '..')) {
    fail('unsafe-path', `${label} escapes or has an empty segment: "${value}"`);
  }
  return p;
};

/** Exact path: same rules, but glob characters are refused. */
export const assertSafeRel = (value, label = 'path') => {
  const p = assertSafePattern(value, label);
  if (/[*?]/.test(p)) fail('unsafe-path', `${label} must be an exact path, got "${value}"`);
  return p;
};

export const normalizeRel = (root, target) => {
  const rootAbs = path.resolve(root);
  const abs = path.isAbsolute(target) ? path.resolve(target) : path.resolve(rootAbs, target);
  const rel = path.relative(rootAbs, abs);
  if (rel === '' || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    fail('unsafe-path', `path escapes the repo root: "${target}"`);
  }
  return rel.split(path.sep).join('/');
};

const assertRegularFile = (root, rel, label) => {
  const abs = path.resolve(root, rel);
  let st;
  try {
    st = fs.lstatSync(abs);
  } catch (err) {
    if (err.code === 'ENOENT') fail(`missing-${label}`, `${label} not found: ${rel}`);
    fail(`invalid-${label}`, `${label} is not readable: ${rel}`);
  }
  if (st.isSymbolicLink()) fail('symlink', `${label} must not be a symlink: ${rel}`);
  if (!st.isFile()) fail(`invalid-${label}`, `${label} is not a regular file: ${rel}`);
  return abs;
};

const parseList = (raw, key) => {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) fail('invalid-field', `${key} must be a block list`);
  return raw.map((item) => assertSafePattern(item, key));
};

/**
 * Parse the plan's YAML frontmatter. Only the spec-gate keys are interpreted;
 * unknown keys are ignored. Lists use block style (`key:` then `  - item`).
 */
export const parsePlanText = (text) => {
  if (typeof text !== 'string') fail('missing-frontmatter', 'plan must be text');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!m) fail('missing-frontmatter', 'plan must start with YAML frontmatter');

  const raw = {};
  const seen = new Set();
  let currentList = null;
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item) {
      if (!currentList) fail('invalid-frontmatter', `list item without a key: ${line.trim()}`);
      raw[currentList].push(stripQuotes(item[1].trim()));
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) fail('invalid-frontmatter', `unsupported frontmatter line: ${line.trim()}`);
    const [, key, value] = kv;
    if (seen.has(key)) fail('duplicate-field', `duplicate frontmatter key: ${key}`);
    seen.add(key);
    if (value === '') {
      raw[key] = [];
      currentList = key;
    } else {
      raw[key] = stripQuotes(value.trim());
      currentList = null;
    }
  }

  const spec = assertSafeRel(assertText(raw.spec, 'spec'), 'spec');
  const status = assertText(raw.status, 'status');
  if (status !== 'approved') fail('not-approved', `plan status is "${status}", expected "approved"`);
  const approvedBy = assertText(raw.approved_by, 'approved_by');
  const approvedAt = assertUtc(raw.approved_at, 'approved_at');
  const files = parseList(raw.files, 'files');
  if (files.length === 0) fail('missing-files', 'plan must list at least one file or glob in files');
  const allow = parseList(raw.allow, 'allow');

  return { spec, status, approved_by: approvedBy, approved_at: approvedAt, files, allow };
};

/** Derive the progress ledger for a plan: foo.md -> foo-progress.md. */
export const progressFor = (plan) => (plan.endsWith('.md')
  ? `${plan.slice(0, -3)}-progress.md`
  : `${plan}-progress.md`);

/** Derive the evidence file for a plan: foo.md -> foo-evidence.json. */
export const evidenceFor = (plan) => plan.replace(/\.md$/, '') + '-evidence.json';

/**
 * Sanitize an approval name: trim, collapse CR/LF runs to a space, cap at 64
 * chars, then reject empty or any remaining CR/LF/colon/hash (invalid-field).
 * The pre-collapse check rejects multiline/YAML-comment injection (`\n`, `:`,
 * `#`); the post-check is belt-and-braces on the value written to the file.
 */
export const sanitizeApprovedBy = (value) => {
  const candidate = (typeof value === 'string' && value.trim())
    || process.env.USER || process.env.USERNAME || 'human';
  const trimmed = String(candidate).trim();
  if (trimmed === '' || /[\r\n:#]/.test(trimmed)) {
    fail('invalid-field', 'approved_by must be a non-empty string without newlines, colons, or hashes');
  }
  const by = trimmed.replace(/[\r\n]+/g, ' ').slice(0, 64).trim();
  if (by === '' || /[\r\n:#]/.test(by)) {
    fail('invalid-field', 'approved_by must be a non-empty string without newlines, colons, or hashes');
  }
  return by;
};

/** Pure fill: return the plan text with approval frontmatter applied (no I/O). */
export const applyApprovalFill = (text, by, at) => {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!m) fail('missing-frontmatter', 'plan must start with YAML frontmatter');
  const updated = [];
  const seen = new Set();
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv && (kv[1] === 'status' || kv[1] === 'approved_by' || kv[1] === 'approved_at')) {
      if (seen.has(kv[1])) continue;
      seen.add(kv[1]);
      updated.push(kv[1] === 'status' ? 'status: approved'
        : kv[1] === 'approved_by' ? `approved_by: ${by}`
        : `approved_at: ${at}`);
      continue;
    }
    updated.push(line);
  }
  if (!seen.has('status')) updated.push('status: approved');
  if (!seen.has('approved_by')) updated.push(`approved_by: ${by}`);
  if (!seen.has('approved_at')) updated.push(`approved_at: ${at}`);
  return `---\n${updated.join('\n')}\n---\n${text.slice(m[0].length)}`;
};

// Divergence note: V2 /approve (plugin:490 approvePlan) still refuses draft
// plans (buildGate before write, no autofill); CLI `approve` autofill here is
// an intentional divergence pending V2 align. Do not change the plugin path.
/**
 * Auto-fill the plan's approval frontmatter after interactive human approval.
 * Validates (autofilling status/approved_by/approved_at after TTY check):
 * sanitizes approved_by, previews the filled text via parsePlanText (plus a
 * spec regular-file check when root is known) BEFORE mutating, then writes.
 * Every other key and the body are kept.
 */
export const fillApprovalFrontmatter = (planFile, approvedBy, root) => {
  const abs = path.resolve(planFile);
  if (root !== undefined && root !== null) {
    assertContainedReal(root, abs, planFile);
  }
  let st;
  try {
    st = fs.lstatSync(abs);
  } catch (err) {
    if (err.code === 'ENOENT') fail('missing-plan', `plan not found: ${planFile}`);
    fail('invalid-plan', `plan is not readable: ${planFile}`);
  }
  if (st.isSymbolicLink()) fail('symlink', `plan must not be a symlink: ${planFile}`);
  if (!st.isFile()) fail('invalid-plan', `plan is not a regular file: ${planFile}`);
  const text = fs.readFileSync(abs, 'utf8');
  const by = sanitizeApprovedBy(approvedBy);
  const at = new Date().toISOString();
  const next = applyApprovalFill(text, by, at);
  // Validate from memory before mutating so an invalid plan never lands dirty-approved.
  const preview = parsePlanText(next);
  if (root !== undefined && root !== null) {
    assertRegularFile(root, preview.spec, 'spec');
  }
  fs.writeFileSync(abs, next);
  return { approved_by: by, approved_at: at };
};

// Split a Markdown table row on unescaped pipes: `\|` is a literal `|`.
const splitRow = (line) => {
  const cells = [];
  let cell = '';
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '\\' && line[i + 1] === '|') {
      cell += '|';
      i++;
    } else if (line[i] === '|') {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += line[i];
    }
  }
  cells.push(cell.trim());
  if (cells.length && cells[0] === '') cells.shift();
  if (cells.length && cells[cells.length - 1] === '') cells.pop();
  return cells;
};

const isTaskHeader = (cells) => cells.includes('#') && cells.includes('Task') && cells.includes('Verify');
const isSeparator = (cells) => cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));

/**
 * Parse the plan's `# | Task | … | Verify` table. Returns `[{ task, verify }]`
 * with the Verify cell normalized (trimmed, one backtick pair removed).
 */
export const parsePlanTasks = (text) => {
  if (typeof text !== 'string') fail('missing-task-table', 'plan must be text with a task table');
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().startsWith('|') && isTaskHeader(splitRow(line.trim())));
  if (start === -1) {
    fail('missing-task-table', 'plan has no task table with #, Task, and Verify columns');
  }

  const header = splitRow(lines[start].trim());
  const taskCol = header.indexOf('#');
  const verifyCol = header.indexOf('Verify');
  const tasks = [];
  const seen = new Set();
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) break;
    const cells = splitRow(line);
    if (isSeparator(cells)) continue;
    if (cells.length !== header.length) {
      fail('invalid-plan-task', `task row must have ${header.length} cells, got ${cells.length}`);
    }
    const rawN = cells[taskCol];
    if (!/^[1-9]\d*$/.test(rawN)) {
      fail('invalid-plan-task', `task row has an invalid task number: "${rawN}"`);
    }
    const n = Number(rawN);
    if (seen.has(n)) fail('duplicate-task', `duplicate task number: ${n}`);
    seen.add(n);
    let verify = cells[verifyCol];
    if (verify.startsWith('`') && verify.endsWith('`') && verify.length >= 2) {
      verify = verify.slice(1, -1).trim();
    }
    if (!verify) fail('invalid-plan-task', `task ${n} has an empty Verify command`);
    tasks.push({ task: n, verify });
  }
  if (tasks.length === 0) fail('missing-task-table', 'task table has no task rows');
  return tasks;
};

/** Glob match: `*` = one segment, `**` = zero or more segments, `?` = one char. */
export const matchPattern = (pattern, target) => {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        i++;
        if (pattern[i + 1] === '/') {
          i++;
          re += '(?:.*/)?';
        } else {
          re += '.*';
        }
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if ('\\^$+?.()|{}[]'.includes(c)) {
      re += `\\${c}`;
    } else {
      re += c;
    }
  }
  return new RegExp(`^${re}$`).test(target);
};

export const isAllowed = (gate, rel) => {
  // The approved plan, the spec, and the gate marker are immutable while the
  // gate is active. Listing them in `files` must not make them editable.
  if (rel === gate.plan || rel === gate.spec || rel === MARKER_REL) return false;
  const patterns = [progressFor(gate.plan), ...IMPLICIT_ALLOW, ...(gate.allow || []), ...(gate.files || [])];
  return patterns.some((pattern) => matchPattern(pattern, rel));
};

// --- Envelope (auto-tier standing pre-approval) ------------------------------
// Template: docs/auto-envelope.template.md. Sections: Paths, Reversibility,
// No external effects, Budgets. Machine-readable bullets, human-readable risk.

const stripEnvelopeComments = (text) => String(text).replace(/<!--[\s\S]*?-->/g, '');

const splitEnvelopeSections = (text) => {
  const clean = stripEnvelopeComments(String(text));
  const lines = clean.split(/\r?\n/);
  const sections = [];
  let current = null;
  for (const line of lines) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      current = { heading: h[1].trim(), body: [] };
      sections.push(current);
      continue;
    }
    if (current) current.body.push(line);
  }
  return sections;
};

const envelopeSectionBody = (sections, key) => {
  const found = sections.find((s) => s.heading.toLowerCase().includes(key));
  return found ? found.body.join('\n') : null;
};

const envelopeContentLines = (body) => body.split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line !== '' && !line.startsWith('>'));

const EXTERNAL_KEY_RE = '(publish|release|spend|money|cost|network|prod|provision|merge|\\bpr\\b|grader|red.?close)';

/**
 * Parse and validate an auto-tier envelope template (pure, no I/O).
 * Rejects absolute paths, `..` escapes, glob escapes outside the root,
 * an empty reversibility section, any affirmative external-effect
 * declaration, and missing/invalid budgets. Returns the machine fields.
 */
export const parseEnvelopeText = (text) => {
  if (typeof text !== 'string' || text.trim() === '') {
    fail('invalid-envelope', 'envelope file is empty');
  }
  const clean = stripEnvelopeComments(text);
  const sections = splitEnvelopeSections(text);

  const pathsBody = envelopeSectionBody(sections, 'path');
  if (pathsBody === null) fail('invalid-envelope', 'envelope is missing the "Paths" section');
  const reversBody = envelopeSectionBody(sections, 'revers');
  if (reversBody === null) fail('invalid-envelope', 'envelope is missing the "Reversibility" section');
  const externalBody = envelopeSectionBody(sections, 'external');
  if (externalBody === null) fail('invalid-envelope', 'envelope is missing the "No external effects" section');
  // Envelope hash (blob auth) and session requirements
  let envelopeHash = null;
  const hashBody = envelopeSectionBody(sections, 'hash');
  if (hashBody !== null) {
    for (const line of hashBody.split('\n')) {
      const match = line.match(/^[-*]\s+([0-9a-f]{64})$/i);
      if (match) { envelopeHash = match[1].toLowerCase(); break; }
    }
  }
  let requiredSessions = [];
  const sessionsBody = envelopeSectionBody(sections, 'sessions');
  if (sessionsBody !== null) {
    for (const line of sessionsBody.split('\n')) {
      const trim = line.trim();
      if (trim.startsWith('##')) {
        const m = trim.match(/^##\s+Required\s+sessions:\s*(.+)$/i);
        if (m) {
          for (const sess of m[1].split(',')) {
            const sessTrim = sess.trim();
            if (sessTrim) requiredSessions.push(sessTrim);
          }
        }
      }
    }
  }
    const budgetsBody = envelopeSectionBody(sections, 'budget');
  if (budgetsBody === null) fail('invalid-envelope', 'envelope is missing the "Budgets" section');

  // Any affirmative external-effect declaration, anywhere in the file
  // (comments already stripped), fails the envelope. Separators accept
  // `:` or `=` (pilot constraint, Budgets-parser consistency:
  // `publish=yes`, `publish = yes` refuse like `publish: yes`); a bare
  // space form (`publish yes`) refuses via bareAffirmative; `allow`
  // lines accept any of space/`:`/`=` before the key
  // (`allow publish`, `allow:publish`, `allow=publish` all refuse).
  const affirmative = new RegExp(`${EXTERNAL_KEY_RE}\\s*[:=]\\s*(yes|y|true|allow|allowed|permitted|enable[d]?)\\b`, 'i');
  const bareAffirmative = new RegExp(`${EXTERNAL_KEY_RE}\\s+(yes|y|true|allow|allowed|permitted|enable[d]?)\\b`, 'i');
  const allowLine = new RegExp(`^\\s*[-*]?\\s*allow\\s*[:=\\s]+${EXTERNAL_KEY_RE}`, 'i');
  for (const line of clean.split(/\r?\n/)) {
    const t = line.trim();
    if (t === '' || t.startsWith('>') || t.startsWith('#')) continue;
    if (affirmative.test(t)) fail('external-effect', `envelope declares an external effect: "${t}" (must stay "no")`);
    if (bareAffirmative.test(t)) fail('external-effect', `envelope declares an external effect: "${t}" (must stay "no")`);
    if (allowLine.test(t)) fail('external-effect', `envelope declares an external effect: "${t}" (must stay "no")`);
  }

  // Paths: one bare path per `- ` bullet; validated like plan scope patterns.
  const paths = [];
  for (const line of pathsBody.split(/\r?\n/)) {
    const bullet = line.match(/^\s*[-*]\s+(.+?)\s*$/);
    if (!bullet) continue;
    let entry = bullet[1].trim().replace(/^[`'"]+|[`'"]+$/g, '').trim();
    if (entry === '') continue;
    // Allow a trailing human note after the path ("— reason", "# note", "(note)").
    const token = entry.split(/\s+/)[0].replace(/[`'"]+$/g, '').replace(/[,;]+$/g, '');
    paths.push(assertSafePattern(token, 'paths'));
  }
  if (paths.length === 0) fail('invalid-envelope', 'envelope "Paths" section lists no paths');

  // Reversibility: must be present, non-empty, and name the reversal SHA.
  const reversLines = envelopeContentLines(reversBody).filter((l) => !l.startsWith('#'));
  if (reversLines.length === 0) {
    fail('invalid-envelope', 'envelope "Reversibility" section is empty: declare the reversal commit SHA recorded per run');
  }
  const reversText = reversLines.join('\n');
  if (!/reversal/i.test(reversText) || !/\bsha\b|commit/i.test(reversText)) {
    fail('invalid-envelope', 'envelope "Reversibility" section must declare the reversal commit SHA recorded per run');
  }

  // No external effects: non-empty denials only (affirmatives rejected above).
  const externalLines = envelopeContentLines(externalBody).filter((l) => !l.startsWith('#'));
  if (externalLines.length === 0) {
    fail('invalid-envelope', 'envelope "No external effects" section is empty: declare publish/spend/network-prod as "no"');
  }
  const externalText = externalLines.join('\n');
  if (!/(\bno\b|never|\bnone\b|prohibited|forbidden|human-only|human only|not permitted|denied)/i.test(externalText)) {
    fail('invalid-envelope', 'envelope "No external effects" section must deny external effects (publish/spend/network-prod: no)');
  }

  // Budgets: max iterations (positive int) + named check command.
  const budgetsLines = envelopeContentLines(budgetsBody).filter((l) => !l.startsWith('#'));
  if (budgetsLines.length === 0) {
    fail('invalid-envelope', 'envelope "Budgets" section is empty: declare max-iterations and check');
  }
  const budgetsText = budgetsLines.join('\n');
  const budgetMatch = budgetsText.match(/max.?iterations?\s*[:=]\s*(-?\d+(?:\.\d+)?)/i);
  if (!budgetMatch) fail('invalid-envelope', 'envelope "Budgets" section must declare max-iterations (e.g. `max-iterations: 3`)');
  const maxIterations = Number(budgetMatch[1]);
  if (!Number.isInteger(maxIterations) || maxIterations < 1 || maxIterations > 100) {
    fail('invalid-envelope', `envelope max-iterations is "${budgetMatch[1]}", expected an integer 1-100`);
  }
  const checkMatch = budgetsText.match(/check\s*[:=]\s*(\S[^\n]*)/i);
  if (!checkMatch || !checkMatch[1].trim()) {
    fail('invalid-envelope', 'envelope "Budgets" section must name the check command (e.g. `check: npm run verify`)');
  }

  // Expected outcomes (optional, RH-1 reward-hacking guard): one `- ` bullet
  // per pre-declared outcome, passed through verbatim (trimmed,
  // whitespace-collapsed). An absent section means []. Never fails: an
  // empty section or unknown keys are accepted and ignored.
  const expectBody = envelopeSectionBody(sections, 'expect');
  const expectedOutcomes = [];
  if (expectBody !== null) {
    for (const line of expectBody.split(/\r?\n/)) {
      const bullet = line.match(/^\s*[-*]\s+(.+?)\s*$/);
      if (!bullet) continue;
      const entry = bullet[1].trim().replace(/^[`'"]+|[`'"]+$/g, '').trim().replace(/\s+/g, ' ');
      if (entry === '' || entry.startsWith('#')) continue;
      expectedOutcomes.push(entry);
    }
  }

  return {
    paths,
    reversibility: reversText.trim(),
    noExternalEffects: externalText.trim(),
    maxIterations,
    check: checkMatch[1].trim(),
    expectedOutcomes,
    envelopeHash,
    requiredSessions,
  };
};

/** Read an envelope file under root, validate it, return `{ rel, ...parsed }`. */
export const checkEnvelopeFile = (root = process.cwd(), file) => {
  if (typeof file !== 'string' || file.trim() === '') {
    fail('invalid-args', 'envelope check needs a file');
  }
  const rel = normalizeRel(root, file);
  const abs = assertRegularFile(root, rel, 'envelope');
  assertContainedReal(root, abs, file);
  const parsed = parseEnvelopeText(fs.readFileSync(abs, 'utf8'));
  // Non-glob entries must resolve inside the root (lexical escapes already
  // rejected by assertSafePattern; this pins down `./` and case tricks).
  for (const p of parsed.paths) {
    if (!/[*?]/.test(p)) normalizeRel(root, p);
  }
  return { rel, ...parsed };
};

export const readGate = (root = process.cwd()) => {
  const p = gatePath(root);
  let st;
  try {
    st = fs.lstatSync(p);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    fail('invalid-marker', `cannot stat ${GATE_REL}: ${err.message}`);
  }
  if (st.isSymbolicLink()) fail('invalid-marker', `${GATE_REL} must not be a symlink`);
  if (!st.isFile()) fail('invalid-marker', `${GATE_REL} must be a regular file`);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    fail('invalid-marker', `${GATE_REL} is not valid JSON: ${err.message}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    fail('invalid-marker', `${GATE_REL} must contain a JSON object`);
  }
  return parsed;
};

export const validateGate = (root, gate, opts = {}) => {
  if (!gate || typeof gate !== 'object' || Array.isArray(gate)) {
    fail('invalid-gate', 'gate must be an object');
  }
  if (gate.version !== GATE_VERSION) {
    fail('invalid-gate', `gate version is ${gate.version}, expected ${GATE_VERSION}`);
  }
  const plan = assertSafeRel(assertText(gate.plan, 'plan'), 'plan');
  const spec = assertSafeRel(assertText(gate.spec, 'spec'), 'spec');
  if (!plan.endsWith('.md')) fail('invalid-gate', 'plan must be a Markdown file');
  const approvedBy = assertText(gate.approved_by, 'approved_by');
  const approvedAt = assertUtc(gate.approved_at, 'approved_at');
  if (!HASH_RE.test(gate.plan_sha256)) fail('invalid-gate', 'plan_sha256 must be 64 hex chars');
  if (!HASH_RE.test(gate.spec_sha256)) fail('invalid-gate', 'spec_sha256 must be 64 hex chars');
  if (!HASH_RE.test(gate.cli_sha256 || '')) fail('invalid-gate', 'cli_sha256 must be 64 hex chars');
  if (!Array.isArray(gate.files) || gate.files.length === 0) {
    fail('invalid-gate', 'files must be a non-empty array');
  }
  gate.files.forEach((p) => assertSafePattern(p, 'files'));
  if (gate.allow !== undefined && !Array.isArray(gate.allow)) {
    fail('invalid-gate', 'allow must be an array');
  }
  (gate.allow || []).forEach((p) => assertSafePattern(p, 'allow'));
  if (gate.created_at !== undefined) assertUtc(gate.created_at, 'created_at');

  const planAbs = assertRegularFile(root, plan, 'plan');
  const specAbs = assertRegularFile(root, spec, 'spec');
  if (!opts.skipDrift) {
    if (hashFile(planAbs) !== gate.plan_sha256) {
      fail('plan-drift', `plan drift: ${plan} changed since approval. Run spec-check close && approve.`);
    }
    if (hashFile(specAbs) !== gate.spec_sha256) {
      fail('spec-drift', `spec drift: ${spec} changed since approval. Run spec-check close && approve.`);
    }
    if (hashFile(CLI_FILE) !== gate.cli_sha256) {
      fail('cli-drift', `spec-check CLI changed since approval. Run spec-check close && approve.`);
    }
  }
  return { ...gate, approved_by: approvedBy, approved_at: approvedAt, plan, spec };
};

export const buildGate = (root = process.cwd(), planPath) => {
  const plan = assertSafeRel(normalizeRel(root, planPath), 'plan');
  if (!plan.endsWith('.md')) fail('invalid-plan', 'plan must be a Markdown file');
  const planAbs = assertRegularFile(root, plan, 'plan');
  const parsed = parsePlanText(fs.readFileSync(planAbs, 'utf8'));
  const specAbs = assertRegularFile(root, parsed.spec, 'spec');
  return {
    version: GATE_VERSION,
    plan,
    plan_sha256: hashFile(planAbs),
    spec: parsed.spec,
    spec_sha256: hashFile(specAbs),
    cli_sha256: hashFile(CLI_FILE),
    approved_by: parsed.approved_by,
    approved_at: parsed.approved_at,
    files: parsed.files,
    allow: parsed.allow,
    created_at: new Date().toISOString(),
  };
};

export const writeGate = (root, gate) => {
  validateGate(root, gate);
  const p = gatePath(root);
  const dir = path.dirname(p);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try { fs.chmodSync(dir, 0o700); } catch (err) { /* best effort: pre-existing dir may be owned elsewhere */ }
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(tmp, `${JSON.stringify(gate, null, 2)}\n`, { mode: 0o600 });
    fs.renameSync(tmp, p);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch (cleanupErr) { /* best effort */ }
    throw err;
  }
  return p;
};

/**
 * Close only with complete, hash-bound evidence. Every refusal throws before
 * the marker is unlinked, so a failed close leaves the gate active.
 * Returns null when no gate is active, else `{ valid, evidence, evidenceAbs,
 * sha256 }` without mutating. Both close paths share this validator.
 */
export const validateCloseEvidence = (root = process.cwd(), opts = {}) => {
  const gate = readGate(root);
  if (!gate) return null;
  const valid = validateGate(root, gate, { skipDrift: Boolean(opts.skipDrift) });

  const evidence = evidenceFor(valid.plan);
  const evidenceAbs = assertRegularFile(root, evidence, 'evidence');
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(evidenceAbs, 'utf8'));
  } catch (err) {
    fail('invalid-evidence', `${evidence} is not valid JSON: ${err.message}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    fail('invalid-evidence', `${evidence} must contain a JSON object`);
  }
  if (parsed.plan !== valid.plan) {
    fail('evidence-plan-mismatch', `${evidence} plan is "${parsed.plan}", expected "${valid.plan}"`);
  }
  if (parsed.plan_sha256 !== valid.plan_sha256) {
    fail('evidence-hash-mismatch', `${evidence} plan_sha256 does not match the active gate; re-run the tasks and rewrite the evidence`);
  }
  if (!Array.isArray(parsed.tasks)) {
    fail('invalid-evidence', `${evidence} tasks must be an array`);
  }

  const planTasks = parsePlanTasks(fs.readFileSync(path.resolve(root, valid.plan), 'utf8'));
  const byTask = new Map();
  for (const row of parsed.tasks) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      fail('invalid-evidence', `${evidence} tasks must contain objects`);
    }
    if (!Number.isInteger(row.task) || row.task < 1) {
      fail('invalid-evidence', `${evidence} task numbers must be positive integers`);
    }
    if (byTask.has(row.task)) {
      fail('duplicate-evidence-row', `${evidence} has more than one row for task ${row.task}`);
    }
    byTask.set(row.task, row);
  }
  for (const task of planTasks) {
    const row = byTask.get(task.task);
    if (!row) fail('missing-evidence-row', `${evidence} is missing a row for task ${task.task}`);
    if (typeof row.verify !== 'string' || row.verify.trim() !== task.verify) {
      fail('verify-mismatch', `${evidence} task ${task.task} verify is not the plan's Verify command; expected "${task.verify}"`);
    }
    if (typeof row.exit !== 'number' || row.exit !== 0) {
      fail('task-failed', `${evidence} task ${task.task} exit is ${row.exit}, expected 0`);
    }
    assertUtc(row.at, `evidence task ${task.task} at`);
  }
  const planNumbers = new Set(planTasks.map((t) => t.task));
  for (const n of byTask.keys()) {
    if (!planNumbers.has(n)) fail('extra-evidence-row', `${evidence} has an extra row for task ${n} not in the plan`);
  }

  const sha256 = hashFile(evidenceAbs);
  return { valid, evidence, evidenceAbs, sha256 };
};

export const closeGate = (root = process.cwd(), opts = {}) => {
  const ready = validateCloseEvidence(root, opts);
  if (!ready) return null;
  fs.unlinkSync(gatePath(root));
  return { evidence: ready.evidence, sha256: ready.sha256 };
};

// --- Machine-close (auto-tier) ------------------------------------------------
// `close --machine` closes on machine authority alone: named check green +
// independent critic pass + green evidence rows + reversal commit present +
// one audit-ledger row. Every refusal throws before any mutation (ledger
// append and marker unlink happen only when ALL criteria hold).

export const AUDIT_LEDGER_REL = 'docs/audit-ledger.md';

// --- Reward-hacking guards: grader immutability (RH-1) ------------------------
// Exact rule (documented): machine-close refuses (`grader-changed`) when ANY
// file under `tests/`, exactly `scripts/validate-skills.mjs`, or under
// `eval/`:
//   (a) differs between the reversal commit and the working tree (committed
//       or dirty) or appears in `git status --porcelain` (covers untracked
//       and renamed files) — both sources unioned and filtered by
//       isGraderPath; PLUS
//   (b) is touched by the reversal commit itself
//       (`git show --name-only --pretty=format: <reversal>` filtered); PLUS
//   (c) is touched by ANY commit newer than the gate `approved_at`
//       (`git log --since=<approved_at> --name-only --pretty=format: --
//       tests scripts/validate-skills.mjs eval` filtered).
// (b)+(c) close the attacker-chosen-reversal bypass: grading edits committed
// and then named as `--reversal` still refuse, because the grader touch is
// anchored on approval time, not on the attacker-chosen SHA. Legit runs
// (source-only commits after approval) pass: the log filter only matches
// grader paths.
// A git failure (not a repo, unreadable workdir) refuses closed
// (`grader-unknown`) so a missing baseline can never silently pass.
// Residual (conceded, pilot constraint): clock/commit-date spoofing needs
// file-writer privilege — a writer who can forge commit dates already has
// the file-write the guard concedes; envelope updates require re-approval,
// consistent with plan-immutability.
// Human `close` never calls this.
export const GRADER_GLOBS = ['tests/**', 'scripts/validate-skills.mjs', 'eval/**'];

export const isGraderPath = (value) => {
  if (typeof value !== 'string') return false;
  const p = value.trim().replace(/^\.\//, '').replace(/\\/g, '/');
  if (p === 'scripts/validate-skills.mjs') return true;
  return p === 'tests' || p.startsWith('tests/')
    || p === 'eval' || p.startsWith('eval/');
};

const porcelainNames = (text) => {
  const out = [];
  for (const line of String(text).split('\n')) {
    if (!line.trim()) continue;
    const m = line.match(/^.{2}\s+(.*)$/);
    const rest = (m ? m[1] : line).trim();
    // Rename/copy entries name both sides (`old -> new`): check each side.
    for (const side of rest.split(' -> ')) {
      const name = side.trim().replace(/^["']+|["']+$/g, '').trim();
      if (name) out.push(name);
    }
  }
  return out;
};

/**
 * List grader-path changes for a machine-close run (pure filter over two
 * git sources). `runner` defaults to spawnSync and is injectable for tests.
 * Throws `grader-unknown` when git cannot answer.
 */
export const listGraderChanges = (root, reversal, runner = spawnSync) => {
  let statusOut;
  try {
    const st = runner('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8' });
    if (st.error || st.status !== 0) {
      fail('grader-unknown', 'machine-close refused: cannot inspect the working tree for grader changes (git status failed; grader-immutability criterion needs a readable baseline)');
    }
    statusOut = st.stdout || '';
  } catch (err) {
    if (err instanceof SpecCheckError) throw err;
    fail('grader-unknown', `machine-close refused: cannot inspect the working tree for grader changes (${err.message}; grader-immutability criterion needs a readable baseline)`);
  }
  let diffOut;
  try {
    const df = runner('git', ['-C', root, 'diff', '--name-only', reversal, '--'], { encoding: 'utf8' });
    if (df.error || df.status !== 0) {
      fail('grader-unknown', `machine-close refused: cannot diff the working tree against reversal "${reversal}" for grader changes (grader-immutability criterion needs a readable baseline)`);
    }
    diffOut = df.stdout || '';
  } catch (err) {
    if (err instanceof SpecCheckError) throw err;
    fail('grader-unknown', `machine-close refused: cannot diff the working tree against reversal "${reversal}" for grader changes (${err.message}; grader-immutability criterion needs a readable baseline)`);
  }
  const names = [
    ...porcelainNames(statusOut),
    ...String(diffOut).split('\n').map((s) => s.trim()).filter(Boolean),
  ];
  return [...new Set(names.filter(isGraderPath))].sort();
};

/**
 * List grader paths touched by the reversal commit itself
 * (`git show --name-only`). Catches grader-edit-then-commit-as-reversal even
 * when the working tree is clean. Throws `grader-unknown` on git failure.
 */
export const listReversalGraderFiles = (root, reversal, runner = spawnSync) => {
  let out;
  try {
    const res = runner('git', ['-C', root, 'show', '--name-only', '--pretty=format:', reversal, '--'], { encoding: 'utf8' });
    if (res.error || res.status !== 0) {
      fail('grader-unknown', `machine-close refused: cannot inspect reversal "${reversal}" for grader changes (grader-immutability criterion needs a readable baseline)`);
    }
    out = res.stdout || '';
  } catch (err) {
    if (err instanceof SpecCheckError) throw err;
    fail('grader-unknown', `machine-close refused: cannot inspect reversal "${reversal}" for grader changes (${err.message}; grader-immutability criterion needs a readable baseline)`);
  }
  const names = String(out).split('\n').map((s) => s.trim()).filter(Boolean);
  return [...new Set(names.filter(isGraderPath))].sort();
};

/**
 * List grader paths touched by ANY commit newer than `approvedAt`
 * (`git log --since=<approvedAt> --name-only`). Anchors the guard on
 * approval time so an attacker-chosen `--reversal` cannot hide a grader
 * edit. Legit source-only commits pass (filter is grader-paths only).
 * Throws `grader-unknown` on git failure or invalid `approvedAt`.
 */
export const listGraderCommitsSince = (root, approvedAt, runner = spawnSync) => {
  assertUtc(approvedAt, 'approved_at');
  let out;
  try {
    const res = runner('git', ['-C', root, 'log', `--since=${approvedAt}`, '--name-only', '--pretty=format:', '--', 'tests', 'scripts/validate-skills.mjs', 'eval'], { encoding: 'utf8' });
    if (res.error || res.status !== 0) {
      fail('grader-unknown', 'machine-close refused: cannot inspect commits since approval for grader changes (git log failed; grader-immutability criterion needs a readable baseline)');
    }
    out = res.stdout || '';
  } catch (err) {
    if (err instanceof SpecCheckError) throw err;
    fail('grader-unknown', `machine-close refused: cannot inspect commits since approval for grader changes (${err.message}; grader-immutability criterion needs a readable baseline)`);
  }
  const names = String(out).split('\n').map((s) => s.trim()).filter(Boolean);
  return [...new Set(names.filter(isGraderPath))].sort();
};

/**
 * Exact 5th-column ledger match: `| at | tier | check | result | reversal |`.
 * Split on unescaped pipes (`\\|` inside the check field is escaped), then
 * compare cells[5] exactly. Substring `includes` is NOT used: a check
 * command containing the SHA must not false-positive, and only an exact
 * reversal-cell match counts as duplicate. Fail-closed: malformed lines
 * never match (they cannot prove a duplicate).
 */
export const ledgerHasReversal = (ledgerText, reversal) => {
  for (const line of String(ledgerText).split('\n')) {
    const t = line.trim();
    if (!t || !t.includes('|')) continue;
    const tmp = t.replace(/\\\|/g, '\u0000');
    const cells = tmp.split('|').map((s) => s.replace(/\u0000/g, '|').trim());
    if (cells.length >= 7 && cells[5] === reversal) return true;
  }
  return false;
};

// --- Envelope immutability (pilot constraint) --------------------------------
// The envelope is the standing pre-approval: it must be git-clean AND
// unchanged since the gate `approved_at`
// (`git log --since=<approved_at> -- <envelope>` empty + `git status
// --porcelain -- <envelope>` clean), else `envelope-changed` refuses.
// Envelope updates require re-approval — consistent with plan-immutability
// (the plan/spec/marker are immutable while the gate is active).
// Residual (conceded): clock/commit-date spoofing needs file-writer
// privilege — a writer who can forge dates already holds the file-write
// this pilot concedes; sampling + re-approval own the remainder.
export const checkEnvelopeClean = (root, envelopeRel, approvedAt, runner = spawnSync) => {
  assertUtc(approvedAt, 'approved_at');
  const rel = String(envelopeRel || '').trim().replace(/^\.\//, '');
  if (!rel) fail('invalid-args', 'envelope check needs a file');
  let statusOut;
  try {
    const st = runner('git', ['-C', root, 'status', '--porcelain', '--', rel], { encoding: 'utf8' });
    if (st.error || st.status !== 0) {
      fail('envelope-unknown', `machine-close refused: cannot inspect the envelope working tree for changes (git status failed for "${rel}"; envelope-immutability criterion needs a readable baseline)`);
    }
    statusOut = (st.stdout || '').trim();
  } catch (err) {
    if (err instanceof SpecCheckError) throw err;
    fail('envelope-unknown', `machine-close refused: cannot inspect the envelope working tree for changes (${err.message}; envelope-immutability criterion needs a readable baseline)`);
  }
  if (statusOut !== '') {
    fail('envelope-changed', `machine-close refused: envelope file "${rel}" has uncommitted changes (envelope-immutability criterion: envelope updates require re-approval; restore it and re-approve)`);
  }
  let logOut;
  try {
    const lg = runner('git', ['-C', root, 'log', `--since=${approvedAt}`, '--pretty=format:%H', '--', rel], { encoding: 'utf8' });
    if (lg.error || lg.status !== 0) {
      fail('envelope-unknown', `machine-close refused: cannot inspect envelope history since approval (git log failed for "${rel}"; envelope-immutability criterion needs a readable baseline)`);
    }
    logOut = (lg.stdout || '').trim();
  } catch (err) {
    if (err instanceof SpecCheckError) throw err;
    fail('envelope-unknown', `machine-close refused: cannot inspect envelope history since approval (${err.message}; envelope-immutability criterion needs a readable baseline)`);
  }
  if (logOut !== '') {
    fail('envelope-changed', `machine-close refused: envelope file "${rel}" changed since approval (envelope-immutability criterion: envelope updates require re-approval; restore it and re-approve)`);
  }
  return true;
};

// --- Envelope authorization record (MA-3, machine-approve) -------------------
// The envelope authorization record is (a) the envelope file tracked+committed
// with a blob at HEAD AND (b) a ledger line (docs/audit-ledger.md) containing
// the envelope rel with a UTC timestamp, present in the COMMITTED ledger blob
// (`git show HEAD:<ledger>`). The working-tree ledger is untrusted (a writer
// can forge a future-dated row), so only the committed blob authorizes. The
// anchor is the AUTHORIZATION MOMENT: the committer date of the newest commit
// whose ledger diff introduced the row (`git log -S <rel> -- <ledger>`),
// never the row text timestamp. The envelope must be unchanged since that
// commit (`git log <authCommit>..HEAD -- <env>` empty) AND git-clean now, so
// post-auth envelope edits refuse even under a forged re-anchor row.
// Every git failure fails closed (`envelope-unknown`).
export const resolveEnvelopeAuthAt = (root, envelopeRel, runner = spawnSync) => {
  const rel = String(envelopeRel || '').trim().replace(/^\.\//, '');
  if (!rel) fail('envelope-unknown', 'machine-approve refused: envelope authorization needs a file (fail-closed: no authorization record, no activation)');
  let tracked;
  try {
    tracked = runner('git', ['-C', root, 'ls-files', '--error-unmatch', '--', rel], { encoding: 'utf8' });
  } catch (err) {
    fail('envelope-unknown', `machine-approve refused: cannot verify envelope "${rel}" is tracked+committed (${err.message}; fail-closed: no authorization record, no activation)`);
  }
  if (tracked.error || tracked.status !== 0) {
    fail('envelope-unknown', `machine-approve refused: envelope file "${rel}" is not tracked+committed (envelope-authorization criterion: human chat-accept recorded in the ledger + envelope file committed; fail-closed)`);
  }
  // Bind the envelope content: the blob must exist at HEAD.
  let blob;
  try {
    blob = runner('git', ['-C', root, 'rev-parse', `HEAD:${rel}`], { encoding: 'utf8' });
  } catch (err) {
    fail('envelope-unknown', `machine-approve refused: cannot bind the committed envelope blob for "${rel}" (${err.message}; fail-closed: no authorization record, no activation)`);
  }
  if (blob.error || blob.status !== 0 || !/^[0-9a-f]{40}$/i.test(String(blob.stdout || '').trim())) {
    fail('envelope-unknown', `machine-approve refused: envelope file "${rel}" has no committed blob at HEAD (envelope-authorization criterion: envelope file committed; fail-closed)`);
  }
  const envelopeBlob = String(blob.stdout).trim();
  // Authorization row must be present in the COMMITTED ledger blob; a
  // working-tree-only row (forgeable timestamp) never authorizes.
  let committed;
  try {
    committed = runner('git', ['-C', root, 'show', `HEAD:${AUDIT_LEDGER_REL}`], { encoding: 'utf8' });
  } catch (err) {
    fail('envelope-unknown', `machine-approve refused: cannot read the committed envelope authorization record in ${AUDIT_LEDGER_REL} (${err.message}; fail-closed: no authorization record, no activation)`);
  }
  if (committed.error || committed.status !== 0) {
    fail('envelope-unknown', `machine-approve refused: no committed envelope authorization record in ${AUDIT_LEDGER_REL} (envelope-authorization criterion: human chat-accept recorded in the ledger + envelope file committed; fail-closed: commit the ledger authorization row first)`);
  }
  const committedLedgerText = committed.stdout || '';
  const tsRe = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z/g;
  const rowIn = (text) => {
    for (const line of String(text).split('\n')) {
      if (!line.includes(rel)) continue;
      const found = line.match(tsRe);
      if (!found) continue;
      for (const t of found) {
        if (!Number.isNaN(Date.parse(t))) return true;
      }
    }
    return false;
  };
  if (!rowIn(committedLedgerText)) {
    fail('envelope-unknown', `machine-approve refused: no envelope authorization record for "${rel}" in the committed ${AUDIT_LEDGER_REL} (envelope-authorization criterion: human chat-accept recorded in the ledger + envelope file committed; fail-closed: working-tree rows do not authorize)`);
  }
  // Anchor = committer date of the newest commit that introduced the row
  // (pickaxe over the ledger), never the forgeable row text timestamp.
  let pick;
  try {
    pick = runner('git', ['-C', root, 'log', '--format=%H', '-S', rel, '--', AUDIT_LEDGER_REL], { encoding: 'utf8' });
  } catch (err) {
    fail('envelope-unknown', `machine-approve refused: cannot locate the envelope authorization commit for "${rel}" (${err.message}; fail-closed: no authorization record, no activation)`);
  }
  if (pick.error || pick.status !== 0) {
    fail('envelope-unknown', `machine-approve refused: cannot locate the envelope authorization commit for "${rel}" (fail-closed: no authorization record, no activation)`);
  }
  const candidates = String(pick.stdout || '').split('\n').map((s) => s.trim()).filter(Boolean);
  let authCommit = null;
  for (const c of candidates) {
    let blobText;
    try {
      const sh = runner('git', ['-C', root, 'show', `${c}:${AUDIT_LEDGER_REL}`], { encoding: 'utf8' });
      if (sh.error || sh.status !== 0) continue;
      blobText = sh.stdout || '';
    } catch (err) {
      continue;
    }
    if (rowIn(blobText)) { authCommit = c; break; }
  }
  if (!authCommit) {
    fail('envelope-unknown', `machine-approve refused: cannot locate the envelope authorization commit for "${rel}" in ${AUDIT_LEDGER_REL} history (fail-closed: no authorization record, no activation)`);
  }
  let stamp;
  try {
    stamp = runner('git', ['-C', root, 'log', '-1', '--format=%cI', authCommit], { encoding: 'utf8' });
  } catch (err) {
    fail('envelope-unknown', `machine-approve refused: cannot read the envelope authorization time for "${rel}" (${err.message}; fail-closed: no authorization record, no activation)`);
  }
  if (stamp.error || stamp.status !== 0) {
    fail('envelope-unknown', `machine-approve refused: cannot read the envelope authorization time for "${rel}" (fail-closed: no authorization record, no activation)`);
  }
  const anchorRaw = String(stamp.stdout || '').trim();
  const anchorMs = Date.parse(anchorRaw);
  if (!anchorRaw || Number.isNaN(anchorMs)) {
    fail('envelope-unknown', `machine-approve refused: envelope authorization commit has an unreadable timestamp for "${rel}" (fail-closed: no authorization record, no activation)`);
  }
  const at = new Date(anchorMs).toISOString();
  assertUtc(at, 'envelope authorization timestamp');
  // Envelope must be unchanged since the authorization commit (range excludes
  // the auth commit itself, so a same-commit envelope+ledger flow authorizes)
  // AND git-clean now: post-auth edits refuse as `envelope-changed`.
  let since;
  try {
    since = runner('git', ['-C', root, 'log', `${authCommit}..HEAD`, '--pretty=format:%H', '--', rel], { encoding: 'utf8' });
  } catch (err) {
    fail('envelope-unknown', `machine-approve refused: cannot inspect envelope history since authorization (${err.message}; fail-closed: no authorization record, no activation)`);
  }
  if (since.error || since.status !== 0) {
    fail('envelope-unknown', `machine-approve refused: cannot inspect envelope history since authorization (fail-closed: no authorization record, no activation)`);
  }
  if (String(since.stdout || '').trim() !== '') {
    fail('envelope-changed', `machine-approve refused: envelope file "${rel}" changed since its authorization (envelope-immutability criterion: envelope updates require re-approval; restore it and re-approve)`);
  }
  let wt;
  try {
    wt = runner('git', ['-C', root, 'status', '--porcelain', '--', rel], { encoding: 'utf8' });
  } catch (err) {
    fail('envelope-unknown', `machine-approve refused: cannot inspect the envelope working tree for changes (${err.message}; fail-closed: no authorization record, no activation)`);
  }
  if (wt.error || wt.status !== 0) {
    fail('envelope-unknown', `machine-approve refused: cannot inspect the envelope working tree for changes (fail-closed: no authorization record, no activation)`);
  }
  if (String(wt.stdout || '').trim() !== '') {
    fail('envelope-changed', `machine-approve refused: envelope file "${rel}" has uncommitted changes (envelope-immutability criterion: envelope updates require re-approval; restore it and re-approve)`);
  }
  // Working-tree ledger text is returned only for the activation-row prefix;
  // authorization itself comes from the committed blob above.
  const ledgerAbs = path.resolve(root, AUDIT_LEDGER_REL);
  let ledgerText;
  try {
    const st = fs.lstatSync(ledgerAbs);
    if (st.isSymbolicLink()) fail('envelope-unknown', `machine-approve refused: audit ledger must not be a symlink: ${AUDIT_LEDGER_REL} (fail-closed: no authorization record, no activation)`);
    if (!st.isFile()) fail('envelope-unknown', `machine-approve refused: audit ledger is not a regular file: ${AUDIT_LEDGER_REL} (fail-closed)`);
    ledgerText = fs.readFileSync(ledgerAbs, 'utf8');
  } catch (err) {
    if (err instanceof SpecCheckError) throw err;
    fail('envelope-unknown', `machine-approve refused: cannot read the envelope authorization record in ${AUDIT_LEDGER_REL} (${err.message}; fail-closed: no authorization record, no activation)`);
  }
  return { at, ledgerAbs, ledgerText, authCommit, envelopeBlob };
};

// --- Reward-hacking guards: pre-declared expected outcomes (RH-1) -------------
// Evidence rows may mark new behavior with `newBehavior: true` (or
// `new_behavior: true`) and/or declare `expected` / `expectedOutcome` /
// `expected_outcome` / `outcome`. Machine-close refuses when a new-behavior
// row lacks a declaration or its declaration is not in the envelope
// `## Expected outcomes` list. Rows without markers pass (backward
// compatible); human `close` never calls this.
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
 * Enforce the pre-declared-outcome rule (pure). Returns the count of
 * new-behavior rows. Throws `missing-expected-outcomes` when new behavior
 * exists but no outcome list was supplied, or `expected-outcome-mismatch`
 * when a row declares an outcome outside the list.
 */
export const checkExpectedOutcomes = (rows, expectedOutcomes) => {
  const list = Array.isArray(rows) ? rows : [];
  const fresh = list.filter(isNewBehaviorRow);
  if (fresh.length === 0) return 0;
  const declared = Array.isArray(expectedOutcomes)
    ? expectedOutcomes.filter((s) => typeof s === 'string' && s.trim() !== '').map(normalizeOutcome)
    : null;
  if (!declared || declared.length === 0) {
    fail('missing-expected-outcomes', `machine-close refused: ${fresh.length} new-behavior evidence row(s) but no pre-declared expected outcomes (reward-hacking guard: declare each new behavior in the envelope "Expected outcomes" section before implementation)`);
  }
  const set = new Set(declared);
  for (const row of fresh) {
    const want = expectedOfRow(row);
    if (want === null) {
      fail('expected-outcome-mismatch', `machine-close refused: evidence task ${row.task} marks new behavior but declares no expected outcome (reward-hacking guard: each new-behavior row must match a pre-declared expected outcome)`);
    }
    if (!set.has(want)) {
      fail('expected-outcome-mismatch', `machine-close refused: evidence task ${row.task} declares "${want}" which matches no pre-declared expected outcome (reward-hacking guard: declare it in the envelope before implementation)`);
    }
  }
  return fresh.length;
};

/**
 * Collect critic verdict strings from a parsed verdicts file (pure).
 * Accepts a JSON array of verdicts (strings or `{ verdict }` objects) or an
 * object with a `verdicts`/`critics` array. Requires at least one verdict.
 */
export const collectMachineVerdicts = (doc) => {
  let items;
  if (Array.isArray(doc)) {
    items = doc;
  } else if (doc && typeof doc === 'object') {
    if (Array.isArray(doc.verdicts)) items = doc.verdicts;
    else if (Array.isArray(doc.critics)) items = doc.critics;
    else if (typeof doc.verdict === 'string') items = [doc.verdict];
    else fail('invalid-critics', 'machine-close refused: critics file must be a JSON array of verdicts or an object with a "verdicts" array (independent-critic criterion: every verdict must be ACCEPT)');
  } else {
    fail('invalid-critics', 'machine-close refused: critics file must be a JSON array of verdicts or an object with a "verdicts" array (independent-critic criterion: every verdict must be ACCEPT)');
  }
  const verdicts = items.map((item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item.verdict === 'string') return item.verdict;
    fail('invalid-critics', 'machine-close refused: every critic entry must be a verdict string or {"verdict": "..."} (independent-critic criterion: every verdict must be ACCEPT)');
  });
  if (verdicts.length === 0) {
    fail('missing-critics', 'machine-close refused: critics file lists no verdicts (independent-critic criterion: at least one ACCEPT required)');
  }
  return verdicts;
};

/**
 * Machine-close the gate. `opts` needs `{ check, critics, reversal }`:
 * named-check command (run here, must exit 0), path to the critic verdicts
 * file (every verdict ACCEPT), and the reversal commit SHA (must resolve in
 * `git log`). Reward-hacking guards: refuses (`grader-changed`) when any
 * grader path (`tests/**`, `scripts/validate-skills.mjs`, `eval/**`)
 * (a) differs between the reversal commit and the working tree, (b) is
 * touched by the reversal commit itself (`git show`), or (c) is touched by
 * ANY commit newer than the gate `approved_at` (`git log --since`);
 * requires every new-behavior evidence row to match a pre-declared expected
 * outcome from `opts.expectedOutcomes` (array) or `opts.envelope`
 * (envelope file path); when `opts.envelope` is given the file must also be
 * git-clean AND unchanged since `approved_at` (`envelope-changed`), since
 * envelope updates require re-approval. Appends exactly one audit-ledger
 * row (exact 5th-column duplicate check), then unlinks the marker.
 */
export const validateCriticsSessions = (verdicts, requiredSessions) => {
  const sessionIds = verdicts
    .map((v) => (v && typeof v === 'object' && v.session) ? String(v.session).trim() : '')
    .filter((x) => x !== '');
  const unique = new Set(sessionIds);
  if (sessionIds.length > 0 && unique.size !== sessionIds.length) {
    throw new Error('machine-close refused: duplicate session IDs in critics (no self-review)');
  }
  for (const req of (requiredSessions || [])) {
    if (req.trim() !== '' && !sessionIds.includes(req.trim())) {
      throw new Error(`machine-close refused: required session "${req.trim()}" not found in critics`);
    }
  }
};

export const closeMachineGate = (root = process.cwd(), opts = {}) => {
  const check = typeof opts.check === 'string' ? opts.check.trim() : '';
  if (!check) {
    fail('missing-check', 'machine-close refused: missing --check "<command>" (named-check criterion: state the exact command and require exit 0)');
  }
  const criticsFile = typeof opts.critics === 'string' ? opts.critics.trim() : '';
  if (!criticsFile) {
    fail('missing-critics', 'machine-close refused: missing --critics <verdicts-file> (independent-critic criterion: every verdict must be ACCEPT)');
  }
  const reversal = typeof opts.reversal === 'string' ? opts.reversal.trim() : '';
  if (!reversal) {
    fail('missing-reversal', 'machine-close refused: missing --reversal <sha> (reversibility criterion: commit must exist in git log)');
  }

  const criticsAbs = path.isAbsolute(criticsFile) ? criticsFile : path.resolve(root, criticsFile);
  let criticsStat;
  try {
    criticsStat = fs.lstatSync(criticsAbs);
  } catch (err) {
    if (err.code === 'ENOENT') fail('missing-critics', `machine-close refused: critics file not found: ${criticsFile} (independent-critic criterion: every verdict must be ACCEPT)`);
    fail('invalid-critics', `machine-close refused: critics file is not readable: ${criticsFile} (independent-critic criterion)`);
  }
  if (criticsStat.isSymbolicLink()) fail('symlink', `machine-close refused: critics file must not be a symlink: ${criticsFile}`);
  if (!criticsStat.isFile()) fail('invalid-critics', `machine-close refused: critics file is not a regular file: ${criticsFile} (independent-critic criterion)`);
  let criticsDoc;
  try {
    criticsDoc = JSON.parse(fs.readFileSync(criticsAbs, 'utf8'));
  } catch (err) {
    fail('invalid-critics', `machine-close refused: critics file is not valid JSON: ${err.message} (independent-critic criterion)`);
  }
  const verdicts = collectMachineVerdicts(criticsDoc);
  // Enforce session independence
  const sessionRequirements = (criticsDoc && typeof criticsDoc === "object") ? (criticsDoc.requiredSessions || []) : [];
  validateCriticsSessions(verdicts, sessionRequirements);
  const rejected = verdicts.find((v) => v.trim().toUpperCase() !== 'ACCEPT');
  if (rejected !== undefined) {
    fail('critic-reject', `machine-close refused: critic verdict is "${String(rejected).trim()}" (independent-critic criterion: every verdict must be ACCEPT)`);
  }

  if (!/^[0-9a-fA-F]{7,64}$/.test(reversal)) {
    fail('invalid-reversal', `machine-close refused: reversal "${reversal}" is not a commit SHA (reversibility criterion: commit must exist in git log)`);
  }
  const gitRes = spawnSync('git', ['-C', root, 'cat-file', '-e', `${reversal}^{commit}`], { encoding: 'utf8' });
  if (gitRes.error || gitRes.status !== 0) {
    fail('unknown-reversal', `machine-close refused: reversal SHA "${reversal}" not found in git log (reversibility criterion: commit must exist)`);
  }

  const graderChanged = listGraderChanges(root, reversal);
  if (graderChanged.length > 0) {
    fail('grader-changed', `machine-close refused: grader file(s) changed in-run: ${graderChanged.join(', ')} (grader-immutability criterion: tests/**, scripts/validate-skills.mjs, eval/** are ALWAYS-human; restore them and re-run)`);
  }

  const reversalGrader = listReversalGraderFiles(root, reversal);
  if (reversalGrader.length > 0) {
    fail('grader-changed', `machine-close refused: reversal commit touches grader file(s): ${reversalGrader.join(', ')} (grader-immutability criterion: tests/**, scripts/validate-skills.mjs, eval/** are ALWAYS-human; choose a clean reversal and re-run)`);
  }

  // Approval-anchored: ANY grader commit newer than approved_at refuses,
  // even when named as --reversal. Legit source-only commits pass.
  const gateForTime = readGate(root);
  const approvedAtForGrader = gateForTime?.approved_at;
  if (typeof approvedAtForGrader === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(approvedAtForGrader) && !Number.isNaN(Date.parse(approvedAtForGrader))) {
    const sinceChanged = listGraderCommitsSince(root, approvedAtForGrader);
    if (sinceChanged.length > 0) {
      fail('grader-changed', `machine-close refused: grader file(s) committed since approval: ${sinceChanged.join(', ')} (grader-immutability criterion: tests/**, scripts/validate-skills.mjs, eval/** are ALWAYS-human; restore them and re-approve)`);
    }
  }

  const ledgerAbs = path.resolve(root, AUDIT_LEDGER_REL);
  let ledgerStat;
  try {
    ledgerStat = fs.lstatSync(ledgerAbs);
  } catch (err) {
    if (err.code === 'ENOENT') fail('missing-ledger', `machine-close refused: audit ledger not found: ${AUDIT_LEDGER_REL} (audit criterion: exactly one row per run)`);
    fail('invalid-ledger', `machine-close refused: audit ledger is not readable: ${AUDIT_LEDGER_REL} (audit criterion)`);
  }
  if (ledgerStat.isSymbolicLink()) fail('symlink', `machine-close refused: audit ledger must not be a symlink: ${AUDIT_LEDGER_REL}`);
  if (!ledgerStat.isFile()) fail('invalid-ledger', `machine-close refused: audit ledger is not a regular file: ${AUDIT_LEDGER_REL} (audit criterion)`);
  const ledgerText = fs.readFileSync(ledgerAbs, 'utf8');
  // Crash-recovery (HIGH-atomicity): a prior attempt may have appended the
  // row and recorded marker intent before crashing between append and unlink.
  // That state (row + intent for the same reversal) skips the second append
  // and converges by unlinking after all validations re-pass. A pre-seeded
  // row WITHOUT intent still refuses duplicate-reversal (exactly one row per
  // run; every refusal throws before any mutation).
  let skipAppend = false;
  if (ledgerHasReversal(ledgerText, reversal)) {
    let intentMatch = false;
    try {
      const markerDoc = JSON.parse(fs.readFileSync(gatePath(root), 'utf8'));
      if (markerDoc && markerDoc.closing && markerDoc.closing.reversal === reversal) intentMatch = true;
    } catch { /* no intent -> refuse below */ }
    if (!intentMatch) {
      fail('duplicate-reversal', `machine-close refused: reversal SHA "${reversal}" already recorded in ${AUDIT_LEDGER_REL} (audit criterion: exactly one row per run)`);
    }
    skipAppend = true;
  }

  const ready = validateCloseEvidence(root, { skipDrift: true });
  if (!ready) {
    fail('inactive', 'machine-close refused: no active spec gate (evidence criterion: green rows bound to the active plan)');
  }

  let evidenceRows = [];
  try {
    const evidenceDoc = JSON.parse(fs.readFileSync(ready.evidenceAbs, 'utf8'));
    if (Array.isArray(evidenceDoc.tasks)) evidenceRows = evidenceDoc.tasks;
  } catch (err) {
    fail('invalid-evidence', `${ready.evidence} tasks must be an array`);
  }
  let expectedOutcomes = null;
  const envelopeOpt = typeof opts.envelope === 'string' ? opts.envelope.trim() : '';
  if (Array.isArray(opts.expectedOutcomes)) {
    expectedOutcomes = opts.expectedOutcomes;
  } else if (Array.isArray(opts.expected_outcomes)) {
    expectedOutcomes = opts.expected_outcomes;
  }
  if (envelopeOpt !== '') {
    const env = checkEnvelopeFile(root, envelopeOpt);
    if (check !== env.check) {
      fail('check-mismatch', `machine-close refused: --check "${check}" does not exactly match the envelope check "${env.check}" (named-check criterion: when an envelope is given the check must equal the envelope check:)`);
    }
    if (expectedOutcomes === null) expectedOutcomes = env.expectedOutcomes;
    checkEnvelopeClean(root, env.rel, ready.valid.approved_at);
  }
  checkExpectedOutcomes(evidenceRows, expectedOutcomes);

  const checkRes = spawnSync(check, { cwd: root, shell: true, encoding: 'utf8' });
  if (checkRes.error) {
    fail('check-failed', `machine-close refused: named check "${check}" could not run: ${checkRes.error.message} (named-check criterion: must exit 0)`);
  }
  if (checkRes.status !== 0) {
    fail('check-failed', `machine-close refused: named check "${check}" exited ${checkRes.status} (named-check criterion: must be green)`);
  }

  const at = new Date().toISOString();
  const safeCheck = check.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
  if (!skipAppend) {
    // Ledger-first commit: record intent in the marker BEFORE appending, so a
    // crash between append and unlink leaves (intent + row) which retry
    // completes without a second append. Intent write runs only after ALL
    // refusals pass (no refusal mutates).
    const markerP = gatePath(root);
    const markerDoc = JSON.parse(fs.readFileSync(markerP, 'utf8'));
    markerDoc.closing = { reversal, at };
    const tmp = `${markerP}.tmp-${process.pid}-${Date.now()}`;
    try {
      fs.writeFileSync(tmp, `${JSON.stringify(markerDoc, null, 2)}\n`, { mode: 0o600 });
      fs.renameSync(tmp, markerP);
    } catch (err) {
      try { fs.unlinkSync(tmp); } catch { /* best effort */ }
      throw err;
    }
    // TOCTOU: another closer may have appended the same reversal first.
    const freshLedger = fs.readFileSync(ledgerAbs, 'utf8');
    if (!ledgerHasReversal(freshLedger, reversal)) {
      const row = `| ${at} | Auto | ${safeCheck} | pass | ${reversal} |`;
      const prefix = freshLedger === '' || freshLedger.endsWith('\n') ? '' : '\n';
      fs.appendFileSync(ledgerAbs, `${prefix}${row}\n`);
    }
  }
  // Recovery path (skipAppend): row already present from the crashed attempt;
  // validations above re-passed, so complete the close without a second append.

  fs.unlinkSync(gatePath(root));
  return { evidence: ready.evidence, sha256: ready.sha256, check, checkExit: 0, critics: verdicts.length, reversal, at };
};

// --- Machine-approve (auto-tier) ------------------------------------------------
// `approve --machine` opens the next gate on machine authority alone: no
// active gate (prior gate machine-closed first) + every plan `files`/`allow`
// entry inside the envelope ceiling + plan text references the envelope +
// gate write via buildGate/writeGate only after ALL checks pass. Every
// refusal throws before any marker/ledger mutation.

/**
 * Machine-approve a reference plan inside a standing envelope.
 * `opts` needs `{ plan, envelope }`: plan path and envelope file path.
 * Refuses `double-gate` while any gate is active, `envelope-ceiling` when a
 * plan scope entry escapes the envelope, and `reference-missing` when the
 * plan text does not reference the envelope file.
 */
export const approveMachineGate = (root = process.cwd(), opts = {}) => {
  const active = readGate(root);
  // Crash-recovery (HIGH-atomicity): a prior attempt may have created the
  // marker but crashed before the activation row. That state (marker without
  // its activation row, same plan) completes by appending the missing row
  // after all validations re-pass. A marker WITH its row still refuses
  // double-gate (no second row, no rewrite). Every refusal throws before any
  // marker/ledger mutation.
  let recoverMarker = null;
  if (active) {
    let planRelProbe = null;
    let envRelProbe = null;
    try {
      const planOptProbe = typeof opts.plan === 'string' ? opts.plan.trim() : '';
      const envelopeOptProbe = typeof opts.envelope === 'string' ? opts.envelope.trim() : '';
      if (planOptProbe && envelopeOptProbe) {
        planRelProbe = assertSafeRel(normalizeRel(root, planOptProbe), 'plan');
        envRelProbe = checkEnvelopeFile(root, envelopeOptProbe).rel;
      }
    } catch { /* invalid args while gated -> double-gate below */ }
    let recoverable = false;
    if (planRelProbe && envRelProbe && active.plan === planRelProbe) {
      try {
        const probeAbs = path.resolve(root, AUDIT_LEDGER_REL);
        const probeStat = fs.lstatSync(probeAbs);
        if (!probeStat.isSymbolicLink() && probeStat.isFile()) {
          const probeText = fs.readFileSync(probeAbs, 'utf8');
          const hasActivation = probeText.split('\n').some((line) =>
            line.includes('Auto-activate') && line.includes(planRelProbe) && line.includes(envRelProbe));
          if (!hasActivation) recoverable = true;
        }
      } catch { /* ledger unreadable -> refuse double-gate */ }
    }
    if (!recoverable) {
      fail('double-gate', 'machine-approve refused: a spec gate is already active (prior gate must machine-close first; no double-gate)');
    }
    recoverMarker = active;
  }

  const planOpt = typeof opts.plan === 'string' ? opts.plan.trim() : '';
  if (!planOpt) {
    fail('missing-plan', 'machine-approve refused: missing plan path (reference plan criterion: the agent-authored plan must reference the envelope)');
  }
  const envelopeOpt = typeof opts.envelope === 'string' ? opts.envelope.trim() : '';
  if (!envelopeOpt) {
    fail('missing-envelope', 'machine-approve refused: missing --envelope <file> (envelope-ceiling criterion: every plan files/allow entry must be inside the envelope paths)');
  }

  const planRel = assertSafeRel(normalizeRel(root, planOpt), 'plan');
  if (!planRel.endsWith('.md')) fail('invalid-plan', 'plan must be a Markdown file');
  const planAbs = assertRegularFile(root, planRel, 'plan');
  assertContainedReal(root, planAbs, planOpt);
  const planText = fs.readFileSync(planAbs, 'utf8');
  const parsed = parsePlanText(planText);

  const env = checkEnvelopeFile(root, envelopeOpt);

  // Envelope ceiling: every plan files/allow entry must sit inside the
  // envelope paths. Exact entries match via matchPattern against some
  // envelope pattern; glob entries fail closed unless the IDENTICAL pattern
  // is listed in the envelope (a glob must never silently widen).
  const scopeEntries = [...(parsed.files || []), ...(parsed.allow || [])];
  for (const entry of scopeEntries) {
    if (/[*?]/.test(entry)) {
      if (!env.paths.includes(entry)) {
        fail('envelope-ceiling', `machine-approve refused: plan scope pattern "${entry}" is not listed in the envelope (envelope-ceiling criterion: glob plan patterns require an identical envelope pattern; out-of-envelope plan content escalates, no retry)`);
      }
      continue;
    }
    const inside = env.paths.some((pattern) => matchPattern(pattern, entry));
    if (!inside) {
      fail('envelope-ceiling', `machine-approve refused: plan scope "${entry}" is outside the envelope paths (envelope-ceiling criterion: plan files/allow must be inside the envelope; out-of-envelope plan content escalates, no retry)`);
    }
  }

  // Reference check: the agent-authored plan must reference the envelope file.
  if (!planText.includes(env.rel)) {
    fail('reference-missing', `machine-approve refused: plan does not reference the envelope file "${env.rel}" (reference criterion: the plan must be authored from the envelope as a reference doc)`);
  }

  // Envelope-auth anchor (MA-3): the authorization record (tracked+committed
  // envelope file with a blob at HEAD + ledger row present in the COMMITTED
  // ledger blob) anchors immutability to the authorization commit's committer
  // date — never to the forgeable row text timestamp. resolveEnvelopeAuthAt
  // refuses `envelope-changed` when the envelope moved since that commit and
  // fails closed (`envelope-unknown`) on any git failure. Missing or
  // working-tree-only authorization fails closed.
  const auth = resolveEnvelopeAuthAt(root, env.rel);

  const gate = buildGate(root, planRel);
  if (recoverMarker) {
    // Recovery commit: the marker already exists from the crashed attempt.
    // Re-validate it (drift fails before any append), then append the missing
    // activation row exactly once. TOCTOU re-check prevents a concurrent
    // winner's row from becoming a duplicate (refuse double-gate instead).
    validateGate(root, recoverMarker);
    if (recoverMarker.plan !== planRel) {
      fail('double-gate', 'machine-approve refused: a spec gate is already active (prior gate must machine-close first; no double-gate)');
    }
    const freshLedger = fs.readFileSync(auth.ledgerAbs, 'utf8');
    const already = freshLedger.split('\n').some((line) =>
      line.includes('Auto-activate') && line.includes(planRel) && line.includes(env.rel));
    if (already) {
      fail('double-gate', 'machine-approve refused: a spec gate is already active (prior gate must machine-close first; no double-gate)');
    }
    const at = new Date().toISOString();
    const safePlan = planRel.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
    const safeEnv = env.rel.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
    const row = `| ${at} | Auto-activate | ${safePlan} | active | ${safeEnv} |`;
    const prefix = freshLedger === '' || freshLedger.endsWith('\n') ? '' : '\n';
    fs.appendFileSync(auth.ledgerAbs, `${prefix}${row}\n`);
    return { plan: planRel, envelope: env.rel, gate: recoverMarker, at };
  }
  // Pre-write re-check (TOCTOU): refuse `double-gate` if a gate appeared
  // after the entry check. Exclusive marker create (approve-local, MA-1):
  // `wx` makes the create itself the atomic gate — a concurrent writer that
  // passed the same re-check gets EEXIST and refuses `double-gate` instead
  // of last-wins rename. writeGate semantics stay shared/unchanged for
  // other callers; this exclusive write is approve-local and sits
  // immediately before the ledger append so the check-to-create window is
  // minimal.
  const late = readGate(root);
  if (late) {
    fail('double-gate', 'machine-approve refused: a spec gate is already active (prior gate must machine-close first; no double-gate)');
  }
  validateGate(root, gate);
  const markerPath = gatePath(root);
  const markerDir = path.dirname(markerPath);
  fs.mkdirSync(markerDir, { recursive: true, mode: 0o700 });
  try { fs.chmodSync(markerDir, 0o700); } catch (err) { /* best effort: pre-existing dir may be owned elsewhere */ }
  try {
    fs.writeFileSync(markerPath, `${JSON.stringify(gate, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  } catch (err) {
    if (err && err.code === 'EEXIST') {
      fail('double-gate', 'machine-approve refused: a spec gate is already active (prior gate must machine-close first; no double-gate)');
    }
    throw err;
  }

  // Activation audit row (MA-5) on success ONLY: tier/result/5th-col distinct
  // from run rows; pipe-escaped like closeMachineGate. No row on any refusal
  // (every refusal above throws before this append).
  const at = new Date().toISOString();
  const safePlan = planRel.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
  const safeEnv = env.rel.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
  const row = `| ${at} | Auto-activate | ${safePlan} | active | ${safeEnv} |`;
  const prefix = auth.ledgerText === '' || auth.ledgerText.endsWith('\n') ? '' : '\n';
  fs.appendFileSync(auth.ledgerAbs, `${prefix}${row}\n`);
  return { plan: planRel, envelope: env.rel, gate, at };
};

// Reject lexical escapes (handled by normalizeRel) and symlink escapes. The
// nearest existing ancestor is resolved: a new file under a symlinked directory
// must not land outside the repo.
const assertContainedReal = (root, abs, target) => {
  const realRoot = fs.realpathSync(path.resolve(root));
  let probe = abs;
  for (;;) {
    try {
      fs.lstatSync(probe);
      break;
    } catch (err) {
      if (err.code !== 'ENOENT') fail('unsafe-path', `cannot inspect "${target}": ${err.message}`);
      const parent = path.dirname(probe);
      if (parent === probe) fail('unsafe-path', `cannot resolve "${target}"`);
      probe = parent;
    }
  }
  let real;
  try {
    real = fs.realpathSync(probe);
  } catch (err) {
    fail('unsafe-path', `cannot resolve "${target}" (broken symlink?): ${err.message}`);
  }
  if (real !== realRoot && !real.startsWith(realRoot + path.sep)) {
    fail('unsafe-path', `path escapes the repo root through a symlink: "${target}"`);
  }
  return real;
};

export const checkPath = (root, target) => {
  const gate = readGate(root);
  if (!gate) return { active: false, allowed: true };
  validateGate(root, gate);
  const rel = normalizeRel(root, target);
  const realTarget = assertContainedReal(root, path.resolve(root, rel), target);

  // Plan/spec are immutable; compare real paths so a symlinked directory or a
  // case-insensitive filesystem cannot alias them.
  for (const protectedRel of [gate.plan, gate.spec]) {
    if (!protectedRel) continue;
    if (rel === protectedRel) return { active: true, allowed: false, rel, gate };
    try {
      if (fs.realpathSync(path.resolve(root, protectedRel)) === realTarget) {
        return { active: true, allowed: false, rel, gate };
      }
    } catch (err) {
      // validateGate already proved the file exists; a race is caught next call
    }
  }
  return { active: true, allowed: isAllowed(gate, rel), rel, gate };
};

// --- CLI ---------------------------------------------------------------------
const USAGE = `Usage: node scripts/spec-check.mjs <command> [options]

Commands:
  approve <plan.md>   Validate (autofilling status/approved_by/approved_at after TTY check) and write .sdlc/spec-gate.json
  approve <plan.md> --machine --envelope <file>
                      Machine-approve: requires no active gate +
                      every plan files/allow entry inside the envelope paths +
                      plan references the envelope + activation audit row appended
  status              Show the active gate (or "none")
  verify [--require-active]   Re-hash plan/spec/CLI; exit 1 on drift, 2 if no gate when required
  close               Validate <plan>-evidence.json and remove the active gate
  close --machine --check "<command>" --critics <verdicts-file> --reversal <sha> [--envelope <file>]
                      Machine-close: requires ALL of named check exit 0 +
                      every critic verdict ACCEPT + green evidence rows +
                      reversal SHA in git log + no grader-path changes +
                      each new-behavior evidence row matches a pre-declared
                      expected outcome + one audit-ledger row appended
  check <path...>     Exit 0 if every path is in scope, 1 if any is blocked
  envelope check <file>  Validate an auto-tier envelope template (relative paths, reversal, no external effects, budgets)

Evidence for close: docs/plans/<slug>-evidence.json must bind the plan hash and
list one row per plan task with the exact Verify command, exit 0, and a UTC at.

Options:
  --root <dir>        Repo root (default: cwd)
  --require-active    verify fails (exit 2) when no gate is active
  --envelope <file>   machine-approve: required; machine-close: envelope file carrying the pre-declared
                      "Expected outcomes" list (required when evidence has
                      new-behavior rows)
  -h, --help          Show this help
`;

export const main = (argv = process.argv.slice(2), io = {}) => {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') {
      if (!argv[i + 1]) {
        console.error('[spec-check] invalid-args: --root needs a directory');
        return 1;
      }
      args.root = argv[++i];
    } else if (argv[i] === '--require-active') {
      args.requireActive = true;
    } else if (argv[i] === '--machine') {
      args.machine = true;
    } else if (argv[i] === '--check') {
      if (!argv[i + 1]) {
        console.error('[spec-check] invalid-args: --check needs a command');
        return 1;
      }
      args.check = argv[++i];
    } else if (argv[i] === '--critics') {
      if (!argv[i + 1]) {
        console.error('[spec-check] invalid-args: --critics needs a verdicts file');
        return 1;
      }
      args.critics = argv[++i];
    } else if (argv[i] === '--reversal') {
      if (!argv[i + 1]) {
        console.error('[spec-check] invalid-args: --reversal needs a commit SHA');
        return 1;
      }
      args.reversal = argv[++i];
    } else if (argv[i] === '--envelope') {
      if (!argv[i + 1]) {
        console.error('[spec-check] invalid-args: --envelope needs an envelope file');
        return 1;
      }
      args.envelope = argv[++i];
    } else if (argv[i] === '-h' || argv[i] === '--help') {
      args.help = true;
    } else {
      args._.push(argv[i]);
    }
  }
  if (args.help || args._.length === 0) {
    console.log(USAGE.trimEnd());
    return 0;
  }

  const root = path.resolve(args.root || process.cwd());
  const [command, positional] = args._;
  // Resolve the TTY state once: injected io wins (tests), else the real streams.
  const stdinTTY = io.stdinTTY !== undefined ? io.stdinTTY : process.stdin.isTTY;
  const stdoutTTY = io.stdoutTTY !== undefined ? io.stdoutTTY : process.stdout.isTTY;

  try {
    if (command === 'approve') {
      if (args.machine) {
        if (!positional) fail('invalid-args', 'approve needs a plan path');
        const approved = approveMachineGate(root, { plan: positional, envelope: args.envelope });
        console.log(`active spec gate (machine): ${approved.plan} -> ${approved.gate.spec} (${approved.gate.files.length} files, sha256 ${approved.gate.plan_sha256.slice(0, 12)})`);
        return 0;
      }
      humanApproval({ stdinTTY, stdoutTTY });
      if (!positional) fail('invalid-args', 'approve needs a plan path');
      // Pre-write active-gate guard (mirrors the plugin double-gate): a valid
      // active gate is kept and the human must close first — before any plan
      // or marker write. An invalid/stale marker falls through (overwrite),
      // mirroring the plugin's valid-only refusal.
      let existing = null;
      try {
        existing = readGate(root);
      } catch {
        existing = null;
      }
      if (existing) {
        try {
          validateGate(root, existing);
          const oldPlan = typeof existing.plan === 'string' ? existing.plan : 'unknown plan';
          const oldHash = typeof existing.plan_sha256 === 'string' ? existing.plan_sha256 : 'unknown hash';
          fail('double-gate', `approve refused: active gate for ${oldPlan} (sha256 ${oldHash}) kept; run spec-check close before approving ${positional} (no double-gate: prior gate must close first)`);
        } catch (err) {
          if (err instanceof SpecCheckError && err.code === 'double-gate') throw err;
        }
      }
      const planRel = assertSafeRel(normalizeRel(root, positional), 'plan');
      if (!planRel.endsWith('.md')) fail('invalid-plan', 'plan must be a Markdown file');
      const planAbs = path.resolve(root, planRel);
      let original = null;
      try { original = fs.readFileSync(planAbs, 'utf8'); } catch { /* fillApprovalFrontmatter reports */ }
      try {
        // Validate from memory before mutating: a failed approve must not
        // leave the plan dirty-approved.
        if (original !== null) {
          const previewText = applyApprovalFill(original, sanitizeApprovedBy(undefined), new Date().toISOString());
          const preview = parsePlanText(previewText);
          assertRegularFile(root, preview.spec, 'spec');
        }
        fillApprovalFrontmatter(planAbs, undefined, root);
        const gate = buildGate(root, positional);
        writeGate(root, gate);
        console.log(`active spec gate: ${gate.plan} -> ${gate.spec} (${gate.files.length} files, sha256 ${gate.plan_sha256.slice(0, 12)})`);
        return 0;
      } catch (err) {
        if (original !== null) { try { fs.writeFileSync(planAbs, original); } catch { /* best effort restore */ } }
        throw err;
      }
    }
    if (command === 'status') {
      const gate = readGate(root);
      if (!gate) {
        console.log('no active spec gate');
        return 0;
      }
      const valid = validateGate(root, gate);
      console.log(`active spec gate: ${valid.plan} -> ${valid.spec}`);
      console.log(`  files ${valid.files.length} · allow ${(valid.allow || []).length} · approved_by ${valid.approved_by} @ ${valid.approved_at}`);
      console.log(`  plan ${valid.plan_sha256.slice(0, 12)} · spec ${valid.spec_sha256.slice(0, 12)}`);
      return 0;
    }
    if (command === 'verify') {
      const gate = readGate(root);
      if (!gate) {
        if (args.requireActive) {
          console.error('[spec-check] inactive: no active spec gate');
          return 2;
        }
        console.log('no active spec gate');
        return 0;
      }
      const valid = validateGate(root, gate);
      console.log(`spec gate OK: ${valid.plan} -> ${valid.spec} (plan ${valid.plan_sha256.slice(0, 12)}, spec ${valid.spec_sha256.slice(0, 12)})`);
      return 0;
    }
    if (command === 'close') {
      if (args.machine) {
        const closed = closeMachineGate(root, { check: args.check, critics: args.critics, reversal: args.reversal, envelope: args.envelope });
        console.log(`closed spec gate (machine): evidence ${closed.evidence} sha256 ${closed.sha256} | check "${closed.check}" exit 0 | critics ${closed.critics} ACCEPT | reversal ${closed.reversal}`);
        return 0;
      }
      // drift + evidence validation first (reads only, no mutation) — surfaces
      // drift/evidence errors before the TTY gate, and keeps the marker on refusal.
      const ready = validateCloseEvidence(root, { skipDrift: true });
      if (!ready) {
        console.log('no active spec gate');
        return 0;
      }
      humanApproval({ stdinTTY, stdoutTTY });
      const closed = closeGate(root, { skipDrift: true });
      console.log(`closed spec gate: evidence ${closed.evidence} sha256 ${closed.sha256}`);
      return 0;
    }
    if (command === 'check') {
      const targets = args._.slice(1);
      if (targets.length === 0) fail('invalid-args', 'check needs at least one path');
      let blocked = 0;
      for (const target of targets) {
        const result = checkPath(root, target);
        if (!result.active) {
          console.log(`no active spec gate (allowed: ${target})`);
          return 0;
        }
        if (result.allowed) {
          console.log(`allowed: ${result.rel}`);
          continue;
        }
        blocked++;
        console.error(`[spec-check] blocked: ${result.rel} is outside the approved plan scope (${result.gate.plan}). Run spec-check close && approve to widen.`);
      }
      return blocked ? 1 : 0;
    }
    if (command === 'envelope') {
      const [sub, target, ...rest] = args._.slice(1);
      if (sub !== 'check') fail('invalid-args', `unknown envelope subcommand "${sub || ''}" (expected "check")`);
      if (!target) fail('invalid-args', 'envelope check needs a file');
      if (rest.length > 0) fail('invalid-args', 'envelope check takes exactly one file');
      const result = checkEnvelopeFile(root, target);
      console.log(`envelope OK: ${result.rel} (${result.paths.length} paths)`);
      return 0;
    }
    fail('invalid-args', `unknown command "${command}"`);
  } catch (err) {
    if (err instanceof SpecCheckError) {
      console.error(`[spec-check] ${err.code}: ${err.message}`);
      return 1;
    }
    console.error(`[spec-check] ${err.message}`);
    return 1;
  }
};

const isMain = process.argv[1] && (() => {
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(CLI_FILE);
  } catch (err) {
    return false;
  }
})();
if (isMain) process.exit(main());
