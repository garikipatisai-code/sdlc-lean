// Phase ledger for orchestration and research execution: authorized
// continuation, absolute UTC deadlines, cumulative limits, explicit recovery
// authorization, delegation scope, and durable handoff. Stdlib only.
//
// Time is injected: `now` defaults to the live wall clock, and persisted
// deadlines are absolute UTC instants. Report/handoff timestamps are
// historical records, never evidence of the current time.
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const LEDGER_SCHEMA = 'sdlc-lean/phase-ledger@1';
export const HANDOFF_SCHEMA = 'sdlc-lean/handoff@1';
export const MAX_STATE_BYTES = 8 * 1024 * 1024;

export const PHASE_STATUSES = Object.freeze(['active', 'closed', 'expired']);
export const DISPATCH_STATUSES = Object.freeze([
  'in-flight', 'completed', 'failed', 'launch-failed', 'uncertain',
]);

const UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
// Key-name heuristic: credential-shaped names are refused, while usage
// counters that merely contain "token" stay usable.
const SECRET_KEY_RE = /(secret|token|password|passwd|api[-_]?key|credential|passphrase|private[-_]?key)/i;
const BENIGN_USAGE_KEY_RE = /^(?:(?:input|output|prompt|completion|total|cached|max|min|num|used)?tokens?|tokenizers?)$/i;
const isSecretKey = (key) => SECRET_KEY_RE.test(key)
  && !BENIGN_USAGE_KEY_RE.test(key.trim());
// Value heuristic for common credential shapes; a leak can also hide in free
// text, so this is documented as best-effort, not a guarantee.
const SECRET_VALUE_RES = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bsk-(?:proj-)?[A-Za-z0-9]{20,}(?![A-Za-z0-9_-])/,
  /\bghp_[A-Za-z0-9]{20,}/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
  /\bBearer\s+[A-Za-z0-9._-]{20,}/,
];

/** Thrown when persisted state is malformed, ambiguous, or a transition is denied. */
export class WorkflowStateError extends Error {
  /**
   * @param {string} reason - stable machine-readable reason
   * @param {string} [detail] - human-readable detail
   */
  constructor(reason, detail) {
    super(`workflow state rejected: ${reason}${detail ? ` — ${detail}` : ''}`);
    this.name = 'WorkflowStateError';
    this.reason = reason;
  }
}

const reject = (reason, detail) => {
  throw new WorkflowStateError(reason, detail);
};

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const requireString = (value, field) => {
  if (typeof value !== 'string' || value.trim() === '') {
    reject('invalid-ledger', `${field} must be a non-empty string`);
  }
  return value;
};

const requireNonNegativeNumber = (value, field) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    reject('invalid-ledger', `${field} must be a finite number >= 0`);
  }
  return value;
};

const requireNonNegativeInt = (value, field) => {
  if (!Number.isInteger(value) || value < 0) {
    reject('invalid-ledger', `${field} must be an integer >= 0`);
  }
  return value;
};

const validateStringArray = (value, field) => {
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string' || v.trim() === '')) {
    reject('invalid-ledger', `${field} must be an array of non-empty strings`);
  }
  return value;
};

/** Resolve an injected clock; Date or finite epoch ms only (no ambiguous strings). */
const resolveNow = (now) => {
  const ms = now === undefined ? Date.now() : now instanceof Date ? now.getTime() : now;
  if (typeof ms !== 'number' || !Number.isFinite(ms) || Math.abs(ms) > 8.64e15) {
    reject('invalid-clock', 'now must be a Date or finite epoch milliseconds in range');
  }
  return { ms, iso: new Date(ms).toISOString() };
};

/** Parse a strict absolute UTC timestamp; round-trip rejects impossible dates. */
const parseUtc = (value, field) => {
  if (typeof value !== 'string' || !UTC_RE.test(value)) {
    reject('invalid-deadline', `${field} must be an absolute UTC timestamp (YYYY-MM-DDTHH:mm:ss.sssZ)`);
  }
  const ms = Date.parse(value);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== value) {
    reject('invalid-deadline', `${field} is not a real UTC instant`);
  }
  return ms;
};

const validateUsage = (usage, field) => {
  if (!isObject(usage)) reject('invalid-ledger', `${field} must be an object`);
  for (const [key, value] of Object.entries(usage)) {
    if (key.trim() === '') reject('invalid-ledger', `${field} must not contain empty keys`);
    if (isSecretKey(key)) reject('invalid-ledger', `${field} must not contain secret-like keys`);
    requireNonNegativeNumber(value, `${field}.${key}`);
  }
  return usage;
};

const addUsage = (target, delta) => {
  if (delta === undefined || delta === null) return target;
  validateUsage(delta, 'usage delta');
  for (const [key, value] of Object.entries(delta)) {
    target[key] = (target[key] ?? 0) + value;
  }
  return target;
};

const exceededLimit = (usage, limits) => {
  if (!isObject(limits)) return null;
  for (const [key, limit] of Object.entries(limits)) {
    if ((usage[key] ?? 0) >= limit) return key;
  }
  return null;
};

const validateDispatch = (dispatch, phaseId) => {
  if (!isObject(dispatch)) reject('invalid-ledger', `dispatch in ${phaseId} must be an object`);
  requireString(dispatch.attemptId, 'dispatch.attemptId');
  requireString(dispatch.actionId, 'dispatch.actionId');
  requireString(dispatch.description, 'dispatch.description');
  if (!DISPATCH_STATUSES.includes(dispatch.status)) {
    reject('invalid-ledger', `dispatch ${dispatch.attemptId} has an unknown status`);
  }
  parseUtc(dispatch.startedAt, 'dispatch.startedAt');
  if (dispatch.status !== 'in-flight') {
    parseUtc(dispatch.settledAt, 'dispatch.settledAt');
    if (!Array.isArray(dispatch.evidence) || dispatch.evidence.some((e) => typeof e !== 'string')) {
      reject('invalid-ledger', `dispatch ${dispatch.attemptId} evidence must be strings`);
    }
    if (dispatch.status === 'uncertain' && dispatch.evidence.length === 0) {
      reject('invalid-ledger', `uncertain dispatch ${dispatch.attemptId} must preserve evidence`);
    }
  }
  if (dispatch.reconciledAt !== undefined) parseUtc(dispatch.reconciledAt, 'dispatch.reconciledAt');
  if (dispatch.settledAfterCloseout !== undefined && typeof dispatch.settledAfterCloseout !== 'boolean') {
    reject('invalid-ledger', 'settledAfterCloseout must be a boolean');
  }
  if (dispatch.retryOf !== undefined) {
    requireString(dispatch.retryOf, 'dispatch.retryOf');
    if (!isObject(dispatch.approval)
      || typeof dispatch.approval.approver !== 'string' || dispatch.approval.approver.trim() === '') {
      reject('invalid-ledger', `retry ${dispatch.attemptId} must record its approval`);
    }
    parseUtc(dispatch.approval.approvedAt, 'dispatch.approval.approvedAt');
  }
  if (['failed', 'launch-failed'].includes(dispatch.status)) {
    if (!isObject(dispatch.failure) || typeof dispatch.failure.message !== 'string' || dispatch.failure.message.trim() === '') {
      reject('invalid-ledger', `dispatch ${dispatch.attemptId} needs failure.message`);
    }
  }
  return dispatch;
};

const validatePhase = (phase) => {
  if (!isObject(phase)) reject('invalid-ledger', 'phase must be an object');
  requireString(phase.phaseId, 'phase.phaseId');
  requireString(phase.authorizationRef, 'phase.authorizationRef');
  if (!PHASE_STATUSES.includes(phase.status)) reject('invalid-ledger', `phase ${phase.phaseId} has an unknown status`);
  parseUtc(phase.openedAt, 'phase.openedAt');
  parseUtc(phase.deadlineUtc, 'phase.deadlineUtc');
  requireNonNegativeInt(phase.observationAllowanceMs, 'phase.observationAllowanceMs');
  validateUsage(phase.usage, `${phase.phaseId}.usage`);
  if (phase.limits !== undefined && phase.limits !== null) validateUsage(phase.limits, `${phase.phaseId}.limits`);
  if (!Array.isArray(phase.checkpoints)) reject('invalid-ledger', `phase ${phase.phaseId} checkpoints must be an array`);
  for (const checkpoint of phase.checkpoints) {
    if (!isObject(checkpoint)) reject('invalid-ledger', 'checkpoint must be an object');
    parseUtc(checkpoint.at, 'checkpoint.at');
    requireString(checkpoint.note, 'checkpoint.note');
  }
  if (!Array.isArray(phase.dispatches)) reject('invalid-ledger', `phase ${phase.phaseId} dispatches must be an array`);
  for (const dispatch of phase.dispatches) validateDispatch(dispatch, phase.phaseId);

  if (phase.status === 'active') {
    if (phase.closeout !== null && phase.closeout !== undefined) {
      reject('invalid-ledger', `active phase ${phase.phaseId} must not have a closeout`);
    }
  } else {
    if (!isObject(phase.closeout)) reject('invalid-ledger', `phase ${phase.phaseId} is missing a closeout`);
    const closeout = phase.closeout;
    if (!['completed', 'aborted', 'expired'].includes(closeout.status)) {
      reject('invalid-ledger', `phase ${phase.phaseId} has an unknown closeout status`);
    }
    requireString(closeout.reason, 'closeout.reason');
    parseUtc(closeout.at, 'closeout.at');
    validateStringArray(closeout.evidence, 'closeout.evidence');
    if (closeout.unresolved !== undefined) validateStringArray(closeout.unresolved, 'closeout.unresolved');
    if (phase.status === 'expired' && closeout.status !== 'expired') {
      reject('invalid-ledger', `expired phase ${phase.phaseId} needs an expired closeout`);
    }
    if (phase.status === 'closed' && closeout.status === 'expired') {
      reject('invalid-ledger', `closed phase ${phase.phaseId} cannot have an expired closeout`);
    }
  }
  return phase;
};

const allDispatches = (ledger) => ledger.phases.flatMap((phase) => phase.dispatches);

const activePhaseOf = (ledger) => ledger.phases.find((phase) => phase.status === 'active') ?? null;

const locateDispatch = (ledger, attemptId) => {
  for (const phase of ledger.phases) {
    const record = phase.dispatches.find((dispatch) => dispatch.attemptId === attemptId);
    if (record) return { phase, record };
  }
  return null;
};

/**
 * Validate a ledger fail-closed. Every public entry point calls this before
 * reading or mutating persisted state.
 * @param {object} ledger
 * @returns {object} the same ledger
 * @throws {WorkflowStateError} on any malformed, ambiguous, or inconsistent state
 */
export function validateLedger(ledger) {
  if (!isObject(ledger)) reject('invalid-ledger', 'ledger must be an object');
  if (ledger.schema !== LEDGER_SCHEMA) reject('invalid-ledger', `schema must be ${LEDGER_SCHEMA}`);
  requireString(ledger.taskId, 'taskId');
  requireString(ledger.authorizationRef, 'authorizationRef');
  parseUtc(ledger.createdAt, 'createdAt');
  validateUsage(ledger.cumulativeUsage, 'cumulativeUsage');
  if (ledger.cumulativeLimits !== undefined && ledger.cumulativeLimits !== null) {
    validateUsage(ledger.cumulativeLimits, 'cumulativeLimits');
  }
  if (!Array.isArray(ledger.phases)) reject('invalid-ledger', 'phases must be an array');

  const phaseIds = new Set();
  let activeCount = 0;
  for (const phase of ledger.phases) {
    validatePhase(phase);
    if (phaseIds.has(phase.phaseId)) reject('invalid-ledger', `duplicate phaseId ${phase.phaseId}`);
    phaseIds.add(phase.phaseId);
    if (phase.status === 'active') activeCount += 1;
  }
  if (activeCount > 1) reject('invalid-ledger', 'at most one phase may be active');

  const active = activePhaseOf(ledger);
  if (active) {
    if (ledger.activePhaseId !== active.phaseId) {
      reject('invalid-ledger', 'activePhaseId does not match the active phase');
    }
  } else if (ledger.activePhaseId !== null && ledger.activePhaseId !== undefined) {
    reject('invalid-ledger', 'activePhaseId is set but no phase is active');
  }

  const attemptIds = new Set();
  for (const dispatch of allDispatches(ledger)) {
    if (attemptIds.has(dispatch.attemptId)) reject('invalid-ledger', `duplicate attemptId ${dispatch.attemptId}`);
    attemptIds.add(dispatch.attemptId);
  }

  // Cumulative accounting may exceed the sum (reservations/holds), never lag it.
  const phaseUsageTotals = {};
  for (const phase of ledger.phases) {
    for (const [key, value] of Object.entries(phase.usage)) {
      phaseUsageTotals[key] = (phaseUsageTotals[key] ?? 0) + value;
    }
  }
  for (const [key, total] of Object.entries(phaseUsageTotals)) {
    if ((ledger.cumulativeUsage[key] ?? 0) < total) {
      reject('invalid-ledger', `cumulativeUsage.${key} is below the sum of phase usage (${total})`);
    }
  }
  return ledger;
}

/**
 * Create an empty ledger for one task/authorization.
 * @param {{taskId: string, authorizationRef: string, cumulativeLimits?: object, now?: Date|number}} input
 * @returns {object} validated ledger
 */
export function createLedger({ taskId, authorizationRef, cumulativeLimits, now } = {}) {
  const clock = resolveNow(now);
  const ledger = {
    schema: LEDGER_SCHEMA,
    taskId: requireString(taskId, 'taskId'),
    authorizationRef: requireString(authorizationRef, 'authorizationRef'),
    createdAt: clock.iso,
    activePhaseId: null,
    cumulativeUsage: {},
    phases: [],
  };
  if (cumulativeLimits !== undefined && cumulativeLimits !== null) {
    validateUsage(cumulativeLimits, 'cumulativeLimits');
    ledger.cumulativeLimits = { ...cumulativeLimits };
  }
  return validateLedger(ledger);
}

/** Whether an approval record is explicit and scoped exactly to `scope`. */
const approvalMatches = (approval, scope) => {
  if (!isObject(approval) || approval.approved !== true) return false;
  if (typeof approval.approver !== 'string' || approval.approver.trim() === '') return false;
  try {
    parseUtc(approval.at, 'approval.at');
  } catch (err) {
    if (err instanceof WorkflowStateError) return false;
    throw err;
  }
  const actual = approval.scope;
  if (!isObject(actual)) return false;
  const expectedKeys = Object.keys(scope);
  const actualKeys = Object.keys(actual);
  if (actualKeys.length !== expectedKeys.length) return false;
  return expectedKeys.every((key) => actualKeys.includes(key) && actual[key] === scope[key]);
};

/**
 * A retry authorization is the token `planRetry` issues: it must carry the
 * approval evidence and match exactly one task/phase/action/attempt.
 */
const retryAuthorizationMatches = (authorization, {
  taskId, phaseId, actionId, attemptId,
}) => {
  if (!isObject(authorization) || authorization.approved !== true) return false;
  const expectedKeys = ['approved', 'taskId', 'phaseId', 'actionId', 'forAttemptId', 'approver', 'approvedAt'];
  const keys = Object.keys(authorization);
  if (keys.length !== expectedKeys.length || expectedKeys.some((key) => !keys.includes(key))) return false;
  if (typeof authorization.approver !== 'string' || authorization.approver.trim() === '') return false;
  if (authorization.taskId !== taskId) return false;
  if (authorization.phaseId !== phaseId) return false;
  if (authorization.actionId !== actionId) return false;
  if (authorization.forAttemptId !== attemptId) return false;
  try {
    parseUtc(authorization.approvedAt, 'authorization.approvedAt');
  } catch (err) {
    if (err instanceof WorkflowStateError) return false;
    throw err;
  }
  return true;
};

/**
 * Open a phase. The first phase carries its own authorization; every later
 * phase needs a separate explicit approval record scoped to that phase.
 * @param {object} ledger
 * @param {{phaseId: string, authorizationRef: string, deadlineUtc: string,
 *   observationAllowanceMs: number, limits?: object, approval?: object, now?: Date|number}} input
 * @returns {object} the same ledger
 */
export function openPhase(ledger, {
  phaseId, authorizationRef, deadlineUtc, observationAllowanceMs, limits, approval, now,
} = {}) {
  validateLedger(ledger);
  const clock = resolveNow(now);
  requireString(phaseId, 'phaseId');
  requireString(authorizationRef, 'authorizationRef');
  const deadline = parseUtc(deadlineUtc, 'deadlineUtc');
  if (deadline <= clock.ms) reject('deadline-expired', 'a phase cannot open at or after its deadline');
  requireNonNegativeInt(observationAllowanceMs, 'observationAllowanceMs');
  if (limits !== undefined && limits !== null) validateUsage(limits, 'limits');
  if (ledger.activePhaseId != null) reject('phase-active', 'close or expire the active phase first');
  if (ledger.phases.some((phase) => phase.phaseId === phaseId)) reject('duplicate-phase', phaseId);

  if (ledger.phases.length > 0) {
    const scope = { taskId: ledger.taskId, phaseId, authorizationRef };
    if (!approvalMatches(approval, scope)) {
      reject('approval-required', 'an additional phase needs a separate approval bound to this phase and authorization');
    }
  }

  const phase = {
    phaseId,
    authorizationRef,
    status: 'active',
    openedAt: clock.iso,
    deadlineUtc,
    observationAllowanceMs,
    usage: {},
    checkpoints: [],
    dispatches: [],
    closeout: null,
  };
  if (limits !== undefined && limits !== null) phase.limits = { ...limits };
  ledger.phases.push(phase);
  ledger.activePhaseId = phaseId;
  return validateLedger(ledger);
}

/**
 * Internal launch gate shared by `evaluateLaunch` and `beginDispatch` so the
 * two can never disagree.
 */
const launchGate = (ledger, phase, clock, observationMs) => {
  const deadline = parseUtc(phase.deadlineUtc, 'deadlineUtc');
  const remainingMs = deadline - clock.ms;
  if (remainingMs <= 0) {
    return {
      allowed: false, reason: 'deadline-expired', phaseId: phase.phaseId, deadlineUtc: phase.deadlineUtc, remainingMs: 0,
    };
  }

  let requiredMs = phase.observationAllowanceMs;
  if (observationMs !== undefined && observationMs !== null) {
    requireNonNegativeInt(observationMs, 'observationMs');
    requiredMs = Math.max(requiredMs, observationMs);
  }
  if (remainingMs < requiredMs) {
    return {
      allowed: false,
      reason: 'insufficient-observation-window',
      phaseId: phase.phaseId,
      deadlineUtc: phase.deadlineUtc,
      requiredMs,
      remainingMs,
    };
  }

  const exceeded = exceededLimit(phase.usage, phase.limits)
    ?? exceededLimit(ledger.cumulativeUsage, ledger.cumulativeLimits);
  if (exceeded !== null) {
    return {
      allowed: false, reason: 'limit-exceeded', phaseId: phase.phaseId, limit: exceeded,
    };
  }

  return {
    allowed: true, reason: 'allowed', phaseId: phase.phaseId, deadlineUtc: phase.deadlineUtc, requiredMs, remainingMs,
  };
};

/**
 * Live-clock launch gate. Derives eligibility from the remaining wall clock
 * and the required observation allowance; never trusts a report timestamp.
 * @param {object} ledger
 * @param {{now?: Date|number, observationMs?: number}} [input]
 * @returns {{allowed: boolean, reason: string}} decision (blocked decisions do not throw)
 */
export function evaluateLaunch(ledger, { now, observationMs } = {}) {
  validateLedger(ledger);
  const clock = resolveNow(now);
  const phase = activePhaseOf(ledger);
  if (!phase) return { allowed: false, reason: 'no-active-phase' };
  return launchGate(ledger, phase, clock, observationMs);
}

/**
 * Record an informational checkpoint. It never renews or requests approval;
 * the phase stays active until a stop condition.
 * @param {object} ledger
 * @param {{now?: Date|number, note: string, usage?: object}} input
 * @returns {object} the same ledger
 */
export function recordCheckpoint(ledger, { now, note, usage } = {}) {
  validateLedger(ledger);
  const clock = resolveNow(now);
  const phase = activePhaseOf(ledger);
  if (!phase) reject('no-active-phase', 'checkpoint needs an active phase');
  if (clock.ms >= parseUtc(phase.deadlineUtc, 'deadlineUtc')) {
    reject('deadline-expired', 'checkpoint not recorded; close or resume the expired phase');
  }
  requireString(note, 'checkpoint.note');
  if (usage !== undefined && usage !== null) validateUsage(usage, 'usage delta');
  addUsage(phase.usage, usage);
  addUsage(ledger.cumulativeUsage, usage);
  phase.checkpoints.push({ at: clock.iso, note });
  return validateLedger(ledger);
}

/**
 * Resume an approved phase on the live clock. Never resets the deadline or
 * cumulative usage. An expired phase is closed and stays closed.
 * @param {object} ledger
 * @param {{now?: Date|number}} [input]
 * @returns {{resumed: boolean, reason: string}} snapshot or blocked decision
 */
export function resumePhase(ledger, { now } = {}) {
  validateLedger(ledger);
  const clock = resolveNow(now);
  const phase = activePhaseOf(ledger);
  if (!phase) return { resumed: false, reason: 'no-active-phase' };

  const deadline = parseUtc(phase.deadlineUtc, 'deadlineUtc');
  if (clock.ms >= deadline) {
    const unresolved = phase.dispatches
      .filter((dispatch) => dispatch.status === 'in-flight' || dispatch.status === 'uncertain')
      .map((dispatch) => dispatch.attemptId);
    phase.status = 'expired';
    phase.closeout = {
      status: 'expired', reason: 'deadline-expired', at: clock.iso, evidence: [],
    };
    if (unresolved.length > 0) phase.closeout.unresolved = unresolved;
    ledger.activePhaseId = null;
    return {
      resumed: false,
      reason: 'deadline-expired',
      phaseId: phase.phaseId,
      deadlineUtc: phase.deadlineUtc,
      usage: structuredClone(phase.usage),
      cumulativeUsage: structuredClone(ledger.cumulativeUsage),
    };
  }

  return {
    resumed: true,
    reason: 'resumed',
    phaseId: phase.phaseId,
    authorizationRef: phase.authorizationRef,
    deadlineUtc: phase.deadlineUtc,
    observationAllowanceMs: phase.observationAllowanceMs,
    limits: phase.limits ? structuredClone(phase.limits) : null,
    usage: structuredClone(phase.usage),
    cumulativeUsage: structuredClone(ledger.cumulativeUsage),
    checkpoints: structuredClone(phase.checkpoints),
  };
}

/**
 * Close the active phase with a preserved stop reason and evidence. Unresolved
 * in-flight/uncertain attempts must be declared (`allowUnresolved`) so a later
 * settlement stays explicit.
 * @param {object} ledger
 * @param {{now?: Date|number, status?: 'completed'|'expired'|'aborted',
 *   reason: string, evidence?: string[], allowUnresolved?: boolean}} input
 * @returns {object} the same ledger
 */
export function closePhase(ledger, {
  now, status = 'completed', reason, evidence = [], allowUnresolved = false,
} = {}) {
  validateLedger(ledger);
  const clock = resolveNow(now);
  const phase = activePhaseOf(ledger);
  if (!phase) reject('no-active-phase', 'closeout needs an active phase');
  if (!['completed', 'expired', 'aborted'].includes(status)) reject('invalid-close-status', status);
  requireString(reason, 'closeout reason');
  validateStringArray(evidence, 'closeout evidence');
  if (status === 'completed' && clock.ms >= parseUtc(phase.deadlineUtc, 'deadlineUtc')) {
    reject('deadline-expired', 'a completed closeout must precede the deadline; use status expired');
  }
  const unresolved = phase.dispatches
    .filter((dispatch) => dispatch.status === 'in-flight' || dispatch.status === 'uncertain');
  if (unresolved.length > 0 && allowUnresolved !== true) {
    reject('unresolved-work', `${unresolved.length} attempt(s) are still in flight or uncertain`);
  }

  phase.status = status === 'expired' ? 'expired' : 'closed';
  phase.closeout = {
    status, reason, at: clock.iso, evidence: [...evidence],
  };
  if (unresolved.length > 0) phase.closeout.unresolved = unresolved.map((dispatch) => dispatch.attemptId);
  ledger.activePhaseId = null;
  return validateLedger(ledger);
}

/**
 * Begin a dispatch under the active phase. The same live-clock launch gate as
 * `evaluateLaunch` is enforced (deadline, observation allowance, limits).
 * A repeated actionId within the phase is blocked while in flight, uncertain,
 * or completed; a failed attempt needs an explicit retry authorization from
 * `planRetry`, with approval evidence, and the approval is persisted.
 * @param {object} ledger
 * @param {{actionId: string, description: string, attemptId?: string,
 *   authorization?: object, now?: Date|number}} input
 * @returns {{attemptId: string, actionId: string, phaseId: string, retryOf: string|null}}
 */
export function beginDispatch(ledger, {
  actionId, description, attemptId, authorization, now,
} = {}) {
  validateLedger(ledger);
  const clock = resolveNow(now);
  const phase = activePhaseOf(ledger);
  if (!phase) reject('no-active-phase', 'dispatch needs an active phase');
  requireString(actionId, 'actionId');
  requireString(description, 'description');

  const gate = launchGate(ledger, phase, clock, undefined);
  if (!gate.allowed) reject(gate.reason, `dispatch not started (${gate.reason})`);

  const prior = phase.dispatches.filter((dispatch) => dispatch.actionId === actionId);
  let retryOf = null;
  let retryApproval = null;
  if (prior.length > 0) {
    if (prior.some((dispatch) => dispatch.status === 'in-flight')) reject('dispatch-in-flight', actionId);
    if (prior.some((dispatch) => dispatch.status === 'uncertain')) reject('reconcile-required', actionId);
    if (prior.some((dispatch) => dispatch.status === 'completed')) reject('already-completed', actionId);

    const failed = prior
      .filter((dispatch) => ['failed', 'launch-failed'].includes(dispatch.status))
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
      .at(-1);
    if (!failed) reject('invalid-ledger', `no retryable attempt for ${actionId}`);
    const valid = retryAuthorizationMatches(authorization, {
      taskId: ledger.taskId,
      phaseId: phase.phaseId,
      actionId,
      attemptId: failed.attemptId,
    });
    if (!valid) reject('recovery-not-authorized', `${actionId} needs an explicit, narrowly scoped retry approval`);
    retryOf = failed.attemptId;
    retryApproval = { approver: authorization.approver, approvedAt: authorization.approvedAt };
  } else if (authorization !== undefined && authorization !== null) {
    reject('invalid-authorization', 'retry authorization supplied without a failed attempt');
  }

  const id = attemptId === undefined ? randomUUID() : requireString(attemptId, 'attemptId');
  if (allDispatches(ledger).some((dispatch) => dispatch.attemptId === id)) reject('duplicate-attempt', id);
  const record = {
    attemptId: id, actionId, description, status: 'in-flight', startedAt: clock.iso,
  };
  if (retryOf !== null) {
    record.retryOf = retryOf;
    record.approval = retryApproval;
  }
  phase.dispatches.push(record);
  return {
    attemptId: id, actionId, phaseId: phase.phaseId, retryOf,
  };
}

const validateSettlement = ({ status, evidence, failure }) => {
  if (!['completed', 'failed', 'launch-failed', 'uncertain'].includes(status)) {
    reject('invalid-dispatch-status', status);
  }
  validateStringArray(evidence, 'evidence');
  if (status === 'uncertain' && evidence.length === 0) {
    reject('evidence-required', 'an uncertain outcome must preserve evidence');
  }
  if (['failed', 'launch-failed'].includes(status)) {
    if (!isObject(failure) || typeof failure.message !== 'string' || failure.message.trim() === '') {
      reject('invalid-failure', 'failure.message is required');
    }
    if (failure.stage !== undefined && typeof failure.stage !== 'string') {
      reject('invalid-failure', 'failure.stage must be a string');
    }
  } else if (failure !== undefined && failure !== null) {
    reject('invalid-failure', 'failure is only valid for failed statuses');
  }
};

/** Settlement is allowed on the active phase, or after a closeout that listed the attempt as unresolved. */
const settlementAfterCloseout = (phase, attemptId) => {
  if (phase.status === 'active') return false;
  const unresolved = phase.closeout?.unresolved ?? [];
  if (!unresolved.includes(attemptId)) {
    reject('phase-not-active', 'settle before closeout, or close with the attempt recorded as unresolved');
  }
  return true;
};

/**
 * Settle an in-flight dispatch. `uncertain` records an unresolved external
 * action and blocks re-dispatch until reconciled.
 * @param {object} ledger
 * @param {{attemptId: string, status: 'completed'|'failed'|'launch-failed'|'uncertain',
 *   evidence?: string[], failure?: object, now?: Date|number}} input
 * @returns {object} the recorded dispatch
 */
export function settleDispatch(ledger, {
  attemptId, status, evidence = [], failure, now,
} = {}) {
  validateLedger(ledger);
  const clock = resolveNow(now);
  const found = locateDispatch(ledger, attemptId);
  if (!found) reject('unknown-attempt', String(attemptId));
  const { phase, record } = found;
  if (record.status !== 'in-flight') reject('dispatch-not-in-flight', attemptId);
  validateSettlement({ status, evidence, failure });
  const afterCloseout = settlementAfterCloseout(phase, attemptId);

  record.status = status;
  record.settledAt = clock.iso;
  record.evidence = [...evidence];
  if (failure !== undefined && failure !== null) record.failure = { ...failure };
  if (afterCloseout) record.settledAfterCloseout = true;
  return { ...structuredClone(record), phaseId: phase.phaseId };
}

/**
 * Resolve an uncertain dispatch from observed evidence before any recovery.
 * @param {object} ledger
 * @param {{attemptId: string, status: 'completed'|'failed'|'launch-failed',
 *   evidence: string[], failure?: object, now?: Date|number}} input
 * @returns {object} the recorded dispatch
 */
export function reconcileDispatch(ledger, {
  attemptId, status, evidence = [], failure, now,
} = {}) {
  validateLedger(ledger);
  const clock = resolveNow(now);
  const found = locateDispatch(ledger, attemptId);
  if (!found) reject('unknown-attempt', String(attemptId));
  const { phase, record } = found;
  if (record.status !== 'uncertain') reject('not-uncertain', attemptId);
  if (!['completed', 'failed', 'launch-failed'].includes(status)) reject('invalid-dispatch-status', status);
  validateSettlement({ status, evidence, failure });
  if (evidence.length === 0) reject('evidence-required', 'reconciliation requires evidence');
  const afterCloseout = settlementAfterCloseout(phase, attemptId);

  record.status = status;
  record.reconciledAt = clock.iso;
  record.evidence = [...evidence];
  if (failure !== undefined && failure !== null) record.failure = { ...failure };
  if (afterCloseout) record.settledAfterCloseout = true;
  return { ...structuredClone(record), phaseId: phase.phaseId };
}

/**
 * Decide whether a failed attempt may be retried. Default is no; a retry
 * needs an explicit approval scoped to exactly this task, phase, and action.
 * A step-zero failure is never self-authorizing.
 * @param {object} ledger
 * @param {{attemptId: string, approval?: object, now?: Date|number}} input
 * @returns {{allowed: boolean, reason: string, stepZero?: boolean, authorization?: object}}
 */
export function planRetry(ledger, { attemptId, approval, now } = {}) {
  validateLedger(ledger);
  const clock = resolveNow(now);
  const found = locateDispatch(ledger, attemptId);
  if (!found) reject('unknown-attempt', String(attemptId));
  const { phase, record } = found;
  const active = activePhaseOf(ledger);
  if (!active) return { allowed: false, reason: 'no-active-phase' };
  if (active.phaseId !== phase.phaseId) return { allowed: false, reason: 'phase-not-active' };
  if (clock.ms >= parseUtc(active.deadlineUtc, 'deadlineUtc')) {
    return { allowed: false, reason: 'deadline-expired' };
  }

  if (record.status === 'in-flight') return { allowed: false, reason: 'dispatch-in-flight' };
  if (record.status === 'uncertain') return { allowed: false, reason: 'reconcile-required' };
  if (record.status === 'completed') return { allowed: false, reason: 'already-completed' };
  if (!['failed', 'launch-failed'].includes(record.status)) return { allowed: false, reason: 'invalid-state' };

  const scope = { taskId: ledger.taskId, phaseId: phase.phaseId, actionId: record.actionId };
  if (!approvalMatches(approval, scope)) {
    return {
      allowed: false,
      reason: 'recovery-not-authorized',
      stepZero: record.failure?.stage === 'step-0',
    };
  }
  return {
    allowed: true,
    reason: 'authorized',
    authorization: {
      approved: true,
      taskId: ledger.taskId,
      phaseId: phase.phaseId,
      actionId: record.actionId,
      forAttemptId: record.attemptId,
      approver: approval.approver,
      approvedAt: approval.at,
    },
  };
}

/**
 * Delegation may narrow scope, never expand it. Only the coordinator opens
 * phases and grants approvals; this guards the mechanical subset rule.
 * @param {{taskId: string, phaseId: string, actions: string[]}} parent
 * @param {{taskId: string, phaseId: string, actions: string[]}} child
 * @returns {boolean} true when the child scope is a subset
 * @throws {WorkflowStateError} when the child expands task, phase, or actions
 */
export function assertDelegationWithin(parent, child) {
  const normalized = (scope, field) => {
    if (!isObject(scope)) reject('invalid-delegation', `${field} scope must be an object`);
    requireString(scope.taskId, `${field}.taskId`);
    requireString(scope.phaseId, `${field}.phaseId`);
    const actions = validateStringArray(scope.actions, `${field}.actions`);
    if (new Set(actions).size !== actions.length) reject('invalid-delegation', `${field}.actions must be unique`);
    return scope;
  };
  const p = normalized(parent, 'parent');
  const c = normalized(child, 'child');
  if (c.taskId !== p.taskId) reject('delegation-expanded', 'taskId outside parent scope');
  if (c.phaseId !== p.phaseId) reject('delegation-expanded', 'phaseId outside parent scope');
  const allowed = new Set(p.actions);
  const extra = c.actions.filter((action) => !allowed.has(action));
  if (extra.length > 0) reject('delegation-expanded', `actions outside parent scope: ${extra.join(', ')}`);
  return true;
}

/**
 * Dispatch counts by status: failed launches stay separate from completed work.
 * @param {object} ledger
 * @returns {{inFlight: number, completed: number, failed: number, launchFailed: number, uncertain: number}}
 */
export function summarizeDispatches(ledger) {
  validateLedger(ledger);
  const counts = {
    inFlight: 0, completed: 0, failed: 0, launchFailed: 0, uncertain: 0,
  };
  for (const dispatch of allDispatches(ledger)) {
    if (dispatch.status === 'in-flight') counts.inFlight += 1;
    else if (dispatch.status === 'completed') counts.completed += 1;
    else if (dispatch.status === 'failed') counts.failed += 1;
    else if (dispatch.status === 'launch-failed') counts.launchFailed += 1;
    else if (dispatch.status === 'uncertain') counts.uncertain += 1;
  }
  return counts;
}

const assertNoSecrets = (value, trail = 'handoff') => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecrets(item, `${trail}[${index}]`));
    return;
  }
  if (typeof value === 'string') {
    if (SECRET_VALUE_RES.some((re) => re.test(value))) {
      reject('secret-in-handoff', `${trail} looks like a credential value`);
    }
    return;
  }
  if (!isObject(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    if (isSecretKey(key)) reject('secret-in-handoff', `${trail}.${key} must not carry secrets`);
    assertNoSecrets(nested, `${trail}.${key}`);
  }
};

const validateBrief = (brief, field) => {
  if (!isObject(brief)) reject('invalid-handoff', `${field} entries must be objects`);
  requireString(brief.attemptId, `${field}.attemptId`);
  requireString(brief.actionId, `${field}.actionId`);
  requireString(brief.phaseId, `${field}.phaseId`);
  if (!DISPATCH_STATUSES.includes(brief.status)) reject('invalid-handoff', `${field}.status is unknown`);
  parseUtc(brief.startedAt, `${field}.startedAt`);
  if (brief.settledAt !== null && brief.settledAt !== undefined) parseUtc(brief.settledAt, `${field}.settledAt`);
  if (brief.reconciledAt !== null && brief.reconciledAt !== undefined) {
    parseUtc(brief.reconciledAt, `${field}.reconciledAt`);
  }
  if (!Array.isArray(brief.evidence) || brief.evidence.some((e) => typeof e !== 'string')) {
    reject('invalid-handoff', `${field}.evidence must be strings`);
  }
  return brief;
};

const validateHandoff = (handoff) => {
  if (!isObject(handoff)) reject('invalid-handoff', 'handoff must be an object');
  if (handoff.schema !== HANDOFF_SCHEMA) reject('invalid-handoff', `schema must be ${HANDOFF_SCHEMA}`);
  requireString(handoff.taskId, 'handoff.taskId');
  requireString(handoff.authorizationRef, 'handoff.authorizationRef');
  requireString(handoff.phaseId, 'handoff.phaseId');
  requireString(handoff.nextAction, 'handoff.nextAction');
  parseUtc(handoff.generatedAt, 'handoff.generatedAt');
  parseUtc(handoff.deadlineUtc, 'handoff.deadlineUtc');
  requireNonNegativeInt(handoff.observationAllowanceMs, 'handoff.observationAllowanceMs');
  if (!PHASE_STATUSES.includes(handoff.phaseStatus)) reject('invalid-handoff', 'unknown phaseStatus');
  if (handoff.stopReason !== null && handoff.stopReason !== undefined) {
    requireString(handoff.stopReason, 'handoff.stopReason');
  }
  if (handoff.stopStatus !== null && handoff.stopStatus !== undefined) {
    if (!['completed', 'aborted', 'expired'].includes(handoff.stopStatus)) {
      reject('invalid-handoff', 'unknown stopStatus');
    }
  }
  validateUsage(handoff.usage, 'handoff.usage');
  validateUsage(handoff.cumulativeUsage, 'handoff.cumulativeUsage');
  if (handoff.limits !== null && handoff.limits !== undefined) validateUsage(handoff.limits, 'handoff.limits');
  if (handoff.cumulativeLimits !== null && handoff.cumulativeLimits !== undefined) {
    validateUsage(handoff.cumulativeLimits, 'handoff.cumulativeLimits');
  }
  for (const field of ['completed', 'inFlight', 'uncertain', 'failed']) {
    if (!Array.isArray(handoff[field])) reject('invalid-handoff', `${field} must be an array`);
    handoff[field].forEach((brief) => validateBrief(brief, field));
  }
  if (!Array.isArray(handoff.phaseHistory)) reject('invalid-handoff', 'phaseHistory must be an array');
  for (const entry of handoff.phaseHistory) {
    if (!isObject(entry)) reject('invalid-handoff', 'phaseHistory entries must be objects');
    requireString(entry.phaseId, 'phaseHistory.phaseId');
    requireString(entry.authorizationRef, 'phaseHistory.authorizationRef');
    if (!PHASE_STATUSES.includes(entry.status)) reject('invalid-handoff', 'phaseHistory.status is unknown');
    parseUtc(entry.openedAt, 'phaseHistory.openedAt');
    parseUtc(entry.deadlineUtc, 'phaseHistory.deadlineUtc');
    validateUsage(entry.usage, 'phaseHistory.usage');
    if (entry.closeout !== null && entry.closeout !== undefined) {
      if (!isObject(entry.closeout)) reject('invalid-handoff', 'phaseHistory.closeout must be an object');
      requireString(entry.closeout.reason, 'phaseHistory.closeout.reason');
      parseUtc(entry.closeout.at, 'phaseHistory.closeout.at');
    }
  }
  validateStringArray(handoff.allowedActions, 'handoff.allowedActions');
  validateStringArray(handoff.forbiddenActions, 'handoff.forbiddenActions');
  validateStringArray(handoff.reservations, 'handoff.reservations');
  if (!Array.isArray(handoff.deviations)) reject('invalid-handoff', 'deviations must be an array');
  if (!isObject(handoff.sourceIdentities)) reject('invalid-handoff', 'sourceIdentities must be an object');
  return handoff;
};

/**
 * Build a durable handoff. A summary is never a substitute for ledger
 * reconciliation; this record carries the authoritative identities and limits.
 * @param {object} ledger
 * @param {{nextAction: string, allowedActions?: string[], forbiddenActions?: string[],
 *   deviations?: unknown[], reservations?: string[], sourceIdentities?: object,
 *   now?: Date|number}} input
 * @returns {object} validated handoff record
 */
export function buildHandoff(ledger, {
  nextAction, allowedActions = [], forbiddenActions = [], deviations = [],
  reservations = [], sourceIdentities = {}, now,
} = {}) {
  validateLedger(ledger);
  const clock = resolveNow(now);
  requireString(nextAction, 'nextAction');
  validateStringArray(allowedActions, 'allowedActions');
  validateStringArray(forbiddenActions, 'forbiddenActions');
  validateStringArray(reservations, 'reservations');
  if (!Array.isArray(deviations)) reject('invalid-handoff', 'deviations must be an array');
  if (!isObject(sourceIdentities)) reject('invalid-handoff', 'sourceIdentities must be an object');

  const phase = activePhaseOf(ledger) ?? ledger.phases.at(-1);
  if (!phase) reject('no-phase', 'nothing to hand off');
  const brief = (dispatch, phaseId) => ({
    phaseId,
    attemptId: dispatch.attemptId,
    actionId: dispatch.actionId,
    description: dispatch.description,
    status: dispatch.status,
    startedAt: dispatch.startedAt,
    settledAt: dispatch.settledAt ?? null,
    reconciledAt: dispatch.reconciledAt ?? null,
    evidence: [...(dispatch.evidence ?? [])],
    failure: dispatch.failure ? structuredClone(dispatch.failure) : null,
    retryOf: dispatch.retryOf ?? null,
    approval: dispatch.approval ? structuredClone(dispatch.approval) : null,
  });
  const entries = ledger.phases.flatMap((p) => p.dispatches.map((d) => brief(d, p.phaseId)));

  const handoff = {
    schema: HANDOFF_SCHEMA,
    generatedAt: clock.iso,
    taskId: ledger.taskId,
    authorizationRef: ledger.authorizationRef,
    phaseId: phase.phaseId,
    phaseStatus: phase.status,
    deadlineUtc: phase.deadlineUtc,
    observationAllowanceMs: phase.observationAllowanceMs,
    limits: phase.limits ? { ...phase.limits } : null,
    usage: { ...phase.usage },
    cumulativeLimits: ledger.cumulativeLimits ? { ...ledger.cumulativeLimits } : null,
    cumulativeUsage: { ...ledger.cumulativeUsage },
    completed: entries.filter((d) => d.status === 'completed'),
    inFlight: entries.filter((d) => d.status === 'in-flight'),
    uncertain: entries.filter((d) => d.status === 'uncertain'),
    failed: entries.filter((d) => ['failed', 'launch-failed'].includes(d.status)),
    reservations: [...reservations],
    nextAction,
    allowedActions: [...allowedActions],
    forbiddenActions: [...forbiddenActions],
    deviations: structuredClone(deviations),
    stopReason: phase.closeout?.reason ?? null,
    stopStatus: phase.closeout?.status ?? null,
    phaseHistory: ledger.phases.map((p) => ({
      phaseId: p.phaseId,
      authorizationRef: p.authorizationRef,
      status: p.status,
      openedAt: p.openedAt,
      deadlineUtc: p.deadlineUtc,
      usage: { ...p.usage },
      closeout: p.closeout ? structuredClone(p.closeout) : null,
    })),
    sourceIdentities: structuredClone(sourceIdentities),
  };
  assertNoSecrets(handoff);
  return validateHandoff(handoff);
}

const atomicWrite = async (file, content) => {
  const directory = path.dirname(file);
  await mkdir(directory, { recursive: true });
  const temp = `${file}.tmp-${process.pid}-${randomUUID()}`;
  await writeFile(temp, content);
  await rename(temp, file);
};

/** Read a JSON state file with a size cap; missing/unparsable state fails closed. */
const readJsonState = async (file, { unreadable, invalid }) => {
  let info;
  try {
    info = await stat(file);
  } catch (err) {
    reject(unreadable, err.message);
  }
  if (info.size > MAX_STATE_BYTES) reject(invalid, `state file exceeds ${MAX_STATE_BYTES} bytes`);
  let raw;
  try {
    raw = await readFile(file, 'utf8');
  } catch (err) {
    reject(unreadable, err.message);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    reject(invalid, 'not valid JSON');
  }
};

/**
 * Atomically persist a validated ledger.
 * @param {string} file
 * @param {object} ledger
 * @returns {Promise<object>} the ledger
 */
export async function saveLedger(file, ledger) {
  validateLedger(ledger);
  await atomicWrite(file, `${JSON.stringify(ledger, null, 2)}\n`);
  return ledger;
}

/**
 * Load and validate a ledger. Missing, unparsable, oversized, or malformed
 * state fails closed instead of silently starting fresh.
 * @param {string} file
 * @returns {Promise<object>} validated ledger
 */
export async function loadLedger(file) {
  const parsed = await readJsonState(file, { unreadable: 'ledger-unreadable', invalid: 'invalid-ledger' });
  return validateLedger(parsed);
}

/**
 * Atomically persist a validated handoff.
 * @param {string} file
 * @param {object} handoff
 * @returns {Promise<object>} the handoff
 */
export async function writeHandoff(file, handoff) {
  validateHandoff(handoff);
  assertNoSecrets(handoff);
  await atomicWrite(file, `${JSON.stringify(handoff, null, 2)}\n`);
  return handoff;
}

/**
 * Load and validate a handoff record. Missing, unparsable, oversized, or
 * malformed state fails closed.
 * @param {string} file
 * @returns {Promise<object>} validated handoff
 */
export async function readHandoff(file) {
  const parsed = await readJsonState(file, { unreadable: 'handoff-unreadable', invalid: 'invalid-handoff' });
  assertNoSecrets(parsed);
  return validateHandoff(parsed);
}
