// Pure decision core for the colab-lifecycle skill. Zero-dep, no I/O, no
// clock: callers pass timestamps in; policy outcomes are returned as data
// ({ ok:false, blockers/reasons }), nothing throws.
//
// Honesty rules pinned here: a live MCP proxy, a bootstrap-only catalog, or a
// dropped bridge is never evidence of allocation or release; a unit cap is
// never enforceable without an obtainable rate/balance; teardown is always
// attempted, failures included.

export const RELEASE = {
  REQUESTED: 'REQUESTED',
  VERIFIED_RELEASED: 'VERIFIED_RELEASED',
  UNVERIFIED_POSSIBLY_ALLOCATED: 'UNVERIFIED_POSSIBLY_ALLOCATED',
};

const ALLOCATION_CAPABLE = ['run-code', 'open-browser-connection'];
const ACTION_ORDER = ['record-incident', 'notify-user', 'give-manual-cleanup', 'do-not-reconnect', 're-resolve-cells', 'export-artifacts', 'request-unassign'];
// stage ranks; failed/aborted/done are terminal (undefined rank blocks promotion)
const STAGE = { prepared: 0, connected: 1, inspected: 2, executing: 3, persisting: 4, releasing: 5 };

const has = (v) => v !== undefined && v !== null && v !== '';

export const validateEnvelope = (envelope = {}, caps = {}) => {
  const blockers = [];
  const warnings = [];
  const requiredControls = [];
  const accel = envelope.accelerator ?? {};
  for (const field of ['workload', 'notebookId', 'maxDurationMinutes', 'artifactPolicy']) {
    if (!has(envelope[field])) blockers.push(`missing-${field}`);
  }
  if (!has(accel.preferred)) blockers.push('missing-accelerator.preferred');
  if (!Array.isArray(accel.fallback)) blockers.push('missing-accelerator.fallback');
  else if (accel.fallback.length === 0) warnings.push('no-accelerator-fallback');
  for (const field of ['downloads', 'storageDestinations']) if (!Array.isArray(envelope[field])) blockers.push(`invalid-${field}`);

  let mode = 'time-only';
  if (has(envelope.cuCap)) {
    if (caps.rateAvailable === true && caps.balanceAvailable === true) mode = 'cu-capped';
    else if (envelope.approvedTimeOnlyFallback === true) {
      warnings.push('cu-cap-not-verifiable: rate/balance unavailable; approved time-only fallback in effect');
      requiredControls.push('time-only-fallback');
    } else blockers.push('cu-cap-not-verifiable');
  }
  return { ok: blockers.length === 0, blockers, warnings, accounting: { basis: 'conservative-pre-allocation', mode }, requiredControls };
};

export const deriveSessionState = (signals = {}) => {
  const { mcpServer = {}, bridge = {}, catalog = {}, notebook = {}, runtime = {}, expected = {} } = signals;
  const mismatched = [];
  if (has(mcpServer.instanceId) && has(expected.instanceId) && mcpServer.instanceId !== expected.instanceId) mismatched.push('mcp-instance');
  if (has(notebook.id) && has(expected.notebookId) && notebook.id !== expected.notebookId) mismatched.push('notebook');

  const dimensions = {
    mcpServer: { present: mcpServer.present === true, instanceId: mcpServer.instanceId ?? null, matchesExpected: !mismatched.includes('mcp-instance') },
    bridge: { connected: bridge.connected === true },
    catalog: { mode: catalog.mode ?? 'unknown' },
    notebook: { id: notebook.id ?? null, matchesExpected: !mismatched.includes('notebook') },
    runtime: { allocated: runtime.allocated ?? 'unknown', accelerator: runtime.accelerator ?? null, releaseVerified: runtime.releaseVerified === true },
  };

  // the claim derives only from runtime evidence; the other dimensions never imply it
  let computeClaim = 'unknown';
  if (runtime.releaseVerified === true) computeClaim = 'released';
  else if (runtime.allocated === true) computeClaim = 'allocated';

  const nextActions = [];
  if (mismatched.length > 0 || dimensions.catalog.mode === 'bootstrap-only'
    || (dimensions.bridge.connected === false && runtime.allocated === true)) nextActions.push('do-not-reconnect');
  return {
    dimensions,
    mismatched,
    computeClaim,
    nextActions,
  };
};

export const registerOwned = (registry = [], candidate = {}) => {
  const blockers = [];
  if (!has(candidate.sessionId) || candidate.foreign === true) blockers.push('unowned-session');
  const active = registry.filter((entry) => entry?.active === true);
  // an active entry under a different (or unknown) MCP instance belongs to another owner
  if (active.some((entry) => has(entry.instanceId) && entry.instanceId !== candidate.instanceId)) blockers.push('wrong-mcp-instance');
  if (has(candidate.notebookId) && active.some((entry) => entry.notebookId === candidate.notebookId)) blockers.push('duplicate-owned-allocation');
  if (blockers.length) return { ok: false, registry, blockers, activeOwned: active.length };

  const entry = {
    ...candidate,
    requestedAt: candidate.requestedAt ?? null,
    releasedAt: candidate.releasedAt ?? null,
    evidenceState: candidate.evidenceState ?? RELEASE.REQUESTED,
    active: true,
  };
  return { ok: true, registry: [...registry, entry], blockers: [], activeOwned: active.length + 1 };
};

export const classifyRelease = (evidence = []) => {
  const reasons = [];
  for (const ev of evidence) {
    switch (ev.type) {
      case 'user_confirmed_released':
        reasons.push({ code: 'user-confirmed-released', detail: 'user confirmed the runtime is released' }); break;
      case 'runtime_absent':
        reasons.push(ev.nonAllocating === true
          ? { code: 'runtime-absent-non-allocating', detail: 'runtime observed absent; nothing can be attributed to it' }
          : { code: 'runtime-absent-unverified', detail: 'runtime absent but not marked non-allocating; cannot prove release' }); break;
      case 'unassign_request':
        reasons.push(ev.ok === true
          ? { code: 'requested-not-verified', detail: 'unassign accepted; acceptance is not proof of release' }
          : { code: 'unassign-request-failed', detail: ev.error ?? 'unassign request failed' }); break;
      case 'bridge_disconnect':
        reasons.push(ev.expected === true
          ? { code: 'expected-bridge-disconnect', detail: 'bridge dropped as expected after teardown; not release proof' }
          : { code: 'bridge-disconnect', detail: 'bridge dropped without a verified teardown' }); break;
      case 'tool_timeout':
        reasons.push({ code: 'tool-timeout', detail: ev.detail ?? 'tool call timed out' }); break;
      case 'http_error':
        reasons.push({ code: 'http-error', detail: ev.detail ?? ev.error ?? 'http error' }); break;
      case 'mcp_exit':
        reasons.push({ code: 'mcp-exit', detail: 'mcp server exited; release not verified' }); break;
      case 'catalog_reverted':
        reasons.push({ code: 'catalog-reverted', detail: 'tool catalog reverted to bootstrap-only; release not verified' }); break;
    }
  }
  if (reasons.length === 0) reasons.push({ code: 'no-release-evidence', detail: 'no release evidence supplied; compute may still be allocated' });

  const confirmed = evidence.some((ev) => ev.type === 'user_confirmed_released'
    || (ev.type === 'runtime_absent' && ev.nonAllocating === true));
  const requested = evidence.some((ev) => ev.type === 'unassign_request' && ev.ok === true);
  const state = confirmed ? RELEASE.VERIFIED_RELEASED
    : requested ? RELEASE.REQUESTED : RELEASE.UNVERIFIED_POSSIBLY_ALLOCATED;
  const unverified = state !== RELEASE.VERIFIED_RELEASED;
  return {
    state,
    reasons,
    nextActions: unverified ? ['do-not-reconnect', 'give-manual-cleanup'] : ['do-not-reconnect'],
    notifyUser: unverified,
    manualCleanup: unverified,
  };
};

export const reconcileCells = (known = [], current = []) => {
  const currentIds = new Set(current.map((cell) => cell.id));
  const stale = known.map((cell) => cell.id).filter((id) => !currentIds.has(id));
  const reuse = current.map((cell) => cell.id).filter((id) => known.some((cell) => cell.id === id));
  return { stale, reuse, remedy: stale.length > 0 ? 're-resolve' : 'none' };
};

export const guardAction = (action = {}, session = {}) => {
  // known asymmetry: after VERIFIED_RELEASED, allocation-capable actions are allowed
  // again; a post-release run must carry a new approved envelope this core cannot check.
  const owned = session.ownedSessionIds ?? [];
  const releaseState = session.release?.state;
  if (has(action.sessionId) && !owned.includes(action.sessionId)) return { allow: false, reason: 'not-owned' };
  if (ALLOCATION_CAPABLE.includes(action.kind) && releaseState !== RELEASE.VERIFIED_RELEASED) return { allow: false, reason: 'release-unverified' };
  if (action.kind === 'export-artifacts' && releaseState === RELEASE.VERIFIED_RELEASED) return { allow: false, reason: 'already-released' };
  return { allow: true, reason: null };
};

export const foldRun = (events = []) => {
  let phase = 'prepared';
  let startedAt = null;
  let mode = 'time-only';
  let releaseRequested = false;
  let exportsVerified = true;
  let exportCount = 0;
  const exported = [];
  const hashes = {};
  const incidents = []; const evidence = []; const actions = new Set();

  for (const ev of events) {
    switch (ev.type) {
      case 'prepared': startedAt = startedAt ?? ev.at ?? null; if (has(ev.mode)) mode = ev.mode; break;
      case 'connected': if (STAGE[phase] < STAGE.connected) phase = 'connected'; break;
      case 'inspected': if (STAGE[phase] < STAGE.inspected) phase = 'inspected'; break;
      case 'cell-run':
        if (ev.ok === false) {
          incidents.push({ code: 'cell-run-failed', detail: ev.error ?? `cell run failed: ${ev.id ?? 'unknown'}` });
          if (/cell-not-found|not found|stale/i.test(String(ev.error ?? ''))) actions.add('re-resolve-cells');
          if (phase !== 'aborted' && phase !== 'done') phase = 'failed';
        } else if (STAGE[phase] < STAGE.executing) phase = 'executing';
        break;
      case 'export':
        if (ev.ok === false) incidents.push({ code: 'artifact-export-failed', detail: ev.error ?? `export failed: ${ev.path ?? 'unknown'}` });
        else {
          exportCount += 1;
          if (has(ev.path)) exported.push(ev.path);
          // "verified" = acknowledged AND hashed; a hash without a path names no file
          if (ev.ack === true && has(ev.sha256)) { if (has(ev.path)) hashes[ev.path] = ev.sha256; }
          else exportsVerified = false;
        }
        if (STAGE[phase] < STAGE.persisting) phase = 'persisting';
        break;
      case 'unassign-request':
        releaseRequested = true;
        evidence.push({ type: 'unassign_request', ok: ev.ok, error: ev.error });
        if (ev.ok === false) incidents.push({ code: 'release-request-failed', detail: ev.error ?? 'unassign request failed' });
        if (phase !== 'failed' && phase !== 'aborted') phase = 'releasing';
        break;
      case 'bridge-disconnect': evidence.push({ type: 'bridge_disconnect', expected: ev.expected }); break;
      case 'user-confirmed': evidence.push({ type: 'user_confirmed_released' }); break;
      case 'timeout':
        incidents.push({ code: 'timeout', detail: ev.detail ?? 'tool call timed out' });
        evidence.push({ type: 'tool_timeout', detail: ev.detail });
        phase = 'aborted';
        break;
      case 'abort': incidents.push({ code: 'run-aborted', detail: ev.detail ?? 'run aborted' }); phase = 'aborted'; break;
    }
  }

  const release = classifyRelease(evidence);
  if (releaseRequested && phase === 'releasing' && incidents.length === 0) phase = 'done';

  if (incidents.length > 0) actions.add('record-incident').add('notify-user');
  if (releaseRequested) {
    actions.add('do-not-reconnect');
    if (release.state !== RELEASE.VERIFIED_RELEASED) actions.add('notify-user').add('give-manual-cleanup');
  }
  if (!releaseRequested && phase !== 'prepared') actions.add('request-unassign'); // teardown still owed (try/finally)
  if (phase === 'executing') actions.add('export-artifacts');

  return {
    phase,
    artifacts: { exported, verified: exportCount > 0 && exportsVerified && !incidents.some((i) => i.code === 'artifact-export-failed'), hashes },
    release,
    incidents,
    stopNewWork: releaseRequested || incidents.length > 0,
    nextActions: ACTION_ORDER.filter((token) => actions.has(token)),
    accounting: { startedAt, basis: 'conservative-pre-allocation', mode },
  };
};
