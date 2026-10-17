# Progress — Orchestration / Research Reliability Hardening

Goal: small, tested, reusable reliability enhancement learned from the completed
ByteFoundry teacher comparison. No new framework, no dependencies, no research
rerun.

Acceptance criteria:

1. Deterministic phase ledger enforces authorized continuation, absolute UTC
   deadlines, observation allowance, cumulative budgets, recovery policy, and
   delegation scope; corrupt state fails closed.
2. Durable handoff round-trips and carries the required fields without secrets.
3. Offline tests cover every listed failure mode; installer ships the new asset.
4. Skills/agent text points at the same policy (instruction layer only where no
   runtime hook exists).
5. Full `npm run verify` green; installed files byte-identical after activation.

## Tasks

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 1 | Source vs installed vs remote assessment | ✅ | HEAD `07f1ebc` = origin/main; 70/70 manifest files byte-identical; pre-existing Colab/RE work left untouched |
| 2 | `scripts/research/phase.mjs` phase ledger | ✅ | stdlib-only; validation on every entry point; 20 focused tests |
| 3 | Offline tests | ✅ | `tests/scripts/research/test-phase.mjs`: 20 scenarios (checkpoint, resume, stale report, allowance, limits, gate bypass, expiry/reopen, resume-expiry unresolved declaration, combined caps, phase-scoped actionIds, uncertain/reconcile/recovery, step-zero, forged approvals, closeout/unresolved, delegation, handoff round-trip + malformed/oversized, tamper/state, simulated workflow) |
| 4 | Installer + discovery coverage | ✅ | `test-install-global.mjs`: research count 3, byte-identical `phase.mjs`, `resolvePhaseModule` global-tier resolution |
| 5 | Skill/agent policy wiring | ✅ | `autonomous-loop` (authorized continuation, stop rules, deadlines/recovery/handoff), `research-protocol` (phase ledger section), `managing-tasks` (durable handoff), `dispatching-parallel-agents` (delegation subset + qualified retry), `orchestrator` (rules of engagement). Router unchanged (bootstrap budget) |
| 6 | Docs | ✅ | CHANGELOG, README, USAGE, verify-recipe (177 tests), debt ledger D-011/D-012 |
| 7 | Full verify + install + installed-vs-source check | ✅ | `npm run verify` 177/177, lint 39/0; `npm run eval` dry 15 probes; `install:global` → research 3, pruned 0; installed tree re-diffed 0 diffs across 71 manifest files (2026-10-17) |

## Review round 1 (code + security, 2026-10-17)

| Finding | Resolution |
|---|---|
| H1 launch gate bypassed by `beginDispatch` | shared `launchGate` used by both; test asserts rejection + state unchanged |
| H2 retry authorization lacked approval evidence | `planRetry` token carries `approved`/`approver`/`approvedAt`; `beginDispatch` validates all fields with an exact-key check; forged variants rejected; approval persisted on the attempt |
| H3 fan-in "retry once" contradiction | qualified: phase-scoped, explicit narrow approval, reconcile uncertain first |
| M1 cumulative usage tamper | `validateLedger` rejects `cumulativeUsage < Σ phase usage` |
| M2 handoff validation depth | briefs, phase history, `observationAllowanceMs`, stop status validated on read/write |
| M3 briefs lacked phase identity | briefs carry `phaseId`, `reconciledAt`, `retryOf`, `approval` |
| M4 approval not persisted | `retryOf` + `approval{approver,approvedAt}` stored and surfaced |
| M5 settlement after closeout | `closePhase` rejects unresolved work unless `allowUnresolved`; settlement requires a declared unresolved attempt; `settledAfterCloseout` recorded |
| M6/F2 secret scan false positive/negative | anchored benign usage keys (`tokens`, `inputTokens`, …); credential-shape value scan on handoff write/read |
| M7 actionId global lock | phase-scoped; test covers repeat in a new approved phase |
| M8 phase.mjs discovery | `resolvePhaseModule` (shared ladder) + installer discovery test |
| M9 stale progress ledger | this file updated with actual evidence |
| M10/M11 wording | orchestrator ask-only list includes retry; stop-rule row + qualified fix round |
| M12 enforcement tests | added: gate bypass, forged approvals, state preservation, closeout/settlement, phase-scoped ids, handoff identity, tamper, clock validation |
| Lows | clock range, empty limit keys, uncertain evidence on load, completed closeout after deadline, size-capped reads |

## Review round 2 (closure review, 2026-10-17)

| Finding | Resolution |
|---|---|
| N1 `resumePhase` auto-expiry left in-flight work permanently unsettleable | expiry now declares `closeout.unresolved`; settlement stays possible and is marked `settledAfterCloseout`; test added |
| N2 `inputTokens`/`outputTokens` rejected as secret-like | anchored benign usage-key pattern; test uses `inputTokens` |
| N3 `sk-` value pattern rejected benign text | pattern requires 20+ credential chars; benign `artifact sk-2026-10-17-run-notes` accepted in a test |
| N5 retry token had no exact-key check | token keys must match exactly; forged/extra-key variants rejected |
| N8 untested guards (brief `phaseId`, phaseHistory, size cap, duplicate attempt, delegation duplicates) | negative fixtures added for all five |
| N4 approval timestamp not anchored (`at` future-dated or pre-failure) | deferred — D-012; an explicit approval for the action still exists, so not a bypass |
| N6 `beginDispatch` skips a redundant post-write revalidation | deferred — state is valid by construction (N6 cosmetic) |
| N7 handoff accepts unknown extra fields | deferred — D-012 |
| N9 ledger is instruction-invoked, not hooked into the runtime | D-011 (unchanged, honest) |

## Deviations

| # | Planned | Actual | Reason |
|---|---------|--------|--------|
| 1 | New `scripts/research/phase.mjs` | as planned | installer already ships `scripts/research/`; no installer-source change |
| 2 | Additional-phase approval scope `{taskId, phaseId}` | `{taskId, phaseId, authorizationRef}` | binds the approval to the authorization reference it approves (review L7) |

## Decision log

| # | Decision | Basis |
|---|----------|-------|
| 1 | New `scripts/research/phase.mjs`, not a new directory | existing install path; zero installer-source change |
| 2 | Mutable ledger + injected `now` | deterministic tests; live clock is the caller default, never a report timestamp |
| 3 | Phase/action statuses in one record | reuses the existing durable JSON pattern; no parallel state store |
| 4 | Text assertions are instruction checks, not runtime enforcement | only the plugin hook and the phase module are runtime-enforced; D-011 records the gap |

## Verification (fresh, 2026-10-17)

| Check | Result |
|---|---|
| `node --test tests/scripts/research/test-phase.mjs` | 20 pass / 0 fail |
| `npm run verify` | lint 39 skills / 0 failures; 177 tests pass / 0 fail |
| `npm run eval` (dry) | 15 probes listed; no live model calls |
| `npm run install:global` | skills 39 · agents 8 · commands 7 · plugin yes · research 3 · pruned 0 |
| Installed vs source diff | 0 differences across 71 manifest files after activation |

## Remaining work

None blocking. Deferred items tracked as D-011/D-012. Commit approval pending
(see final report); no push/PR/tag.
