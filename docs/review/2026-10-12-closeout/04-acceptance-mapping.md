# Acceptance mapping — 7 scenarios → executable tests

All tests run under `node --test` (hermetic: temp dirs only, no network, no API keys, no GPU). Suite: 137 pass / 0 fail (`05-verify-output.txt`).

## Multi-seed cohesion vs provenance (explicitly separated)

These are different claims, tested by different tests. Freezing a seed proves nothing about clustering quality.

| Claim family | What it proves | Tests |
|---|---|---|
| **Multi-seed pair-cohesion checks (assignment, not statistical resampling)** | Deterministic assignment + pair-unit cohesion across seeds; proves nothing about sampling variability | `multi-seed cohesion: pairs co-cluster for seeds 1..10 (assignment check, not statistical resampling)` · `subsample cohesion: pairs co-cluster after dropping 2 pairs` · `Paired co-clustering (k=3, seed 7): cohesion 1.0` · `Determinism incl. hostile Math.random` · `Seed sensitivity 7 vs 8` (`test-clustering.mjs`) |
| **Seed/protocol provenance** | Seeds frozen in the lock; seed recorded in the run log; mutation detected | `createProtocol hash differs when any frozen field changes, including nested seed values` · `verifyProtocol is false after any frozen-field mutation` (`test-protocol.mjs`) · `provenance: frozen seed recorded in run log via stampClustering` (`test-clustering.mjs`) · `F3 createProtocol immune to caller mutation` (`test-t8-fixes.mjs`) |

## Scenario → test table

| # | Acceptance scenario | Executable test(s) | File |
|---|---|---|---|
| 1 | Reject final analysis scored on development data | `cacheHit is true…false otherwise` (split-B digest ⇒ miss) · `F13 checkEvidenceBundle validates four fields` (missing `leakageCheck` ⇒ bundle incomplete ⇒ no completion) | test-digest.mjs, test-t8-fixes.mjs |
| 2 | Reject stale cache from a different checkpoint or split | `digestArtifactSet changes when any file content changes` · `cacheHit…false otherwise` (dataset/model/scorer/protocol each verified) · `F9`-adjacent scorer/settings change ⇒ miss | test-digest.mjs |
| 3 | Preserve question clustering across repeated training seeds | Cohesion rows above (seeds 1..10, subsample, hostile-RNG determinism) + provenance rows above | test-clustering.mjs, test-protocol.mjs |
| 4 | Accept an audited null result as completed research | `classifyOutcome: null result is completed, not failed` · `negative result is completed` · `errored…stays errored+inconclusive` (null ≠ error) | test-outcome.mjs |
| 5 | Prevent unapproved changes after viewing final-test results | `recordAmendment rejects a post-results protocol amendment and records nothing` · `correction` accepted post-results (amendment-gate tests) · `F4 bogus kind throws` | test-amendments.mjs, test-t8-fixes.mjs |
| 6 | Block or queue a second GPU job | `two competing child processes race for gpu:0` → exactly `{held,busy}` ×3 rounds ×2 runs · CLI contender exits 7 · `contender never deletes or acquires an exclusively-created but metadata-incomplete lock` · `old owner release token never deletes a successor lock` · malformed/unreadable ⇒ fail-closed `LockBusyError`, file preserved | test-lock.mjs, test-cli.mjs |
| 7 | Distinguish code-test success from scientific evidence | `F13 checkEvidenceBundle` (single observation ⇒ missing; empty estimand ⇒ missing) + skill rule "Code-test green ≠ evidence" (instruction-level) | test-t8-fixes.mjs, research-protocol SKILL.md |

## Honestly instruction-level (not executable)

- Claim-scope ⊆ protocol-scope: checklist item, reviewer-enforced (no string-subset heuristic — deliberately not faked in code).
- `status` CLI output: display-only, never a gate.
- Statistical review quality (leakage analysis itself): the bundle requires the check to exist, not that it is correct.
