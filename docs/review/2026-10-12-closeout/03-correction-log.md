# Correction log — empirical-research enhancement

## A. Design-stage review corrections (approved 2026-10-11, all adopted)

| # | Correction | Where it landed |
|---|---|---|
| 1 | Real paired-question clustering test, not seed-recording | `cluster.mjs` + `test-clustering.mjs` (12Q/6-pair fixture, cohesion 1.0) |
| 2 | Shared device-scoped locks; competing child processes | `acquireDeviceLock` + `test-lock.mjs` race (`{held,busy}`) |
| 3 | Post-final-test amendments vs scoring-corrections | `repair`/`correction`/`protocol` kinds + `markFinalResults` gate |
| 4 | Cache bound to data + model artifacts + scorer + eval settings | `digestArtifactSet`/`bindScore`/`cacheHit` (4 digests) |
| 5 | Remove HMAC; stream SHA-256 | `hashFile` streams; HMAC removed from design; release uses random token, not HMAC |
| 6 | Explicit research routing + global/local discovery | Route line in `using-sdlc-lean`; `resolveProtocolModule`; installer ships `scripts/research` |
| 7 | Repair progress ledger; archive upstream evidence | `docs/plans/empirical-research-enhancement-progress.md`; `docs/research/upstream-audits/` (6 files) |
| 8 | Line counts are hints, not contracts | Contract frozen on names/behavior, not line counts |

## B. Bootstrap-budget failure (iteration 11, systematic-debugging)

- Symptom: 4 failures in `test-plugin-loading.mjs` — bootstrap 5229 B > 5116.
- Root cause: T6 route line added ~113 B to the verbatim-injected router.
- Fix (orchestrator): compact route line (−42 B), drop abstraction parenthetical (−43 B), remove 1 overlapping red-flag row (−71 B) → 5029 B. Meaning preserved; no test depended on the row.

## C. T8 code-review fixes (all test-first, all green)

F1 `toJSON` honored in stable-stringify · F2 `hashObject(undefined)` safe · F3 `structuredClone` freeze immunity · F4 amendment-kind allowlist (TypeError) · F5 TOCTOU compare-and-delete · F6 `--hold-ms`/`--k` usage validation (exit 64) · F7 release token + 0600/0700 · F8 live pids ignore age · F9 128-char device cap + 8 MB input caps · F10 lone `pairId` → singleton · F11 realpath CLI guard · F12 installer log line · F13 new `checkEvidenceBundle` · F14 skill↔code doc alignment · F15 plan-doc staleness.
Accepted as residual: async-over-sync API, unbounded `Promise.all` (small declared sets), Windows `:` names, installer silent-overwrite, `status` display-only.

## D. T8 security-review fixes

#1 PID-only release → unguessable release token (exact match, never logged) · #2 age-reclaim of live holders removed (dead-pid reclaim retained) · #3 malformed handling tightened, then closeout C1 made it fail-closed · #4 lockRoot documented as per-user trusted dir · #5 input size caps · #6 installer containment verified (no finding).
Explicit non-findings: device-name traversal (closed), discovery→code-exec (returns path only; zero importers), symlink overwrite via `wx` (closed), no shell/SQL/HTML sinks.

## E. Closeout corrections (2026-10-12)

| # | Correction | Change |
|---|---|---|
| C1 | Malformed/unreadable locks fail closed | `isLockStale` false on unparseable/non-object/bad-pid; `LockBusyError` carries path + `unknown` pid + manual-removal hint; contender never unlinks |
| C2 | Deterministic incomplete-lock test | Owner child holds exclusively-created partial file 1200 ms; contender must fail + preserve bytes |
| C3 | Successor-lock release test | Old token vs successor file ⇒ `NotHolderError`, file byte-identical (regression guard; passed immediately) |
| C4 | Resampling vs provenance separated | `resampling:` ×2 new tests; `provenance:` rename; mapping doc §4 splits the claims |

## F. Constraints observed throughout

Zero new runtime dependencies · existing workflows compatible (default-mode skill text byte-untouched except additive sections + budget trims) · no global install run · no remote writes · no GPU workloads · no live research runs · no sudo.
