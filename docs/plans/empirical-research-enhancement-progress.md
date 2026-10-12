# Progress Ledger — Empirical AI Research Enhancement (SDLC-Lean)

## Goal
Add research-mode semantics to SDLC-Lean (protocol lock, null-result completion,
cache identity, evidence review, resource lock, provenance) by adapting audited
upstream mechanisms. Stage 1 (audit + design) approved 2026-10-11. Stage 2
(implementation) executing under the approved design + 8 review corrections.

## Acceptance criteria (implementation stage)
1. Real paired-question clustering test (seed-frozen, ambient-RNG independent).
2. Shared device-scoped locks; competing child processes tested.
3. Post-final-test amendments vs scoring-corrections resolved and tested.
4. Caches bound to data, model artifacts, scorer, and eval settings.
5. No HMAC; streamed SHA-256.
6. Research route in auto-routing; global/local executable discovery.
7. Progress ledger repaired; upstream evidence archived.
8. Zero new runtime dependencies; existing workflows compatible.
9. Independent code + research-validity reviews run; findings addressed.
10. Stop with changes, actual test results, remaining limitations. No global
    install, remote writes, GPU workloads, or live research runs.

## Budget
3 loop iterations. No paid services, no GPU, no sudo. Clones read-only under
/tmp/opencode/upstream.

## Stage plan
- [x] Stage 1: audit 5 upstreams, gap map, design doc, design gate — APPROVED (with corrections).
- [x] Stage 2 plan written: docs/plans/2026-10-11-research-protocol-implementation.md.
- [ ] T1 ledger repair + evidence archive (orchestrator).
- [ ] T2 digests/cache binding → T3 protocol/outcome/amendments → T4 device lock → T5 clustering (implementers, sequential stream).
- [ ] T6 skills, T7 installer+discovery.
- [ ] T8 critic pass (code, security, research-validity) + fixes.
- [ ] Final verify + completion report with limitations.

## Upstream evidence (pinned)
| Repo | Commit | License | Verdict |
|---|---|---|---|
| UKGovernmentBEIS/inspect_ai | a1dbea8 | MIT | adapt patterns |
| microsoft/RD-Agent | 484776c | MIT | adapt patterns |
| mlflow/mlflow | 074c0fc | Apache-2.0 | reference-only |
| SamuelSchmidgall/AgentLaboratory | d9017d9 | MIT | reject dependency |
| SakanaAI/AI-Scientist-v2 | 96bd516 | LicenseRef (RAIL) | reference-only, extraction blocked |

Audit archives: `docs/research/upstream-audits/`.

## Decisions log
| # | Decision | Basis |
|---|---|---|
| 1 | Design-only stage first | Task mandate |
| 2 | Fan out 7 workers (5 audits + identity + gap map) | dispatching-parallel-agents |
| 3 | Adapt Inspect+RD patterns; reference MLflow; reject AL; block AS2 extraction | License + evidence (design doc §3) |
| 4 | Approval corrections 1–8 adopted | User review 2026-10-11 |
| 5 | One module `scripts/research/protocol.mjs` + clustering in `cluster.mjs`; no plugin change | Zero-dep; avoid plugin V1/V2 risk |
| 6 | Discovery precedence: env > project > repo > global; installer gains `scripts/research` source | Correction 6 |

## Iteration log
| Iter | What | Result | Evidence |
|---|---|---|---|
| 1 | Stage-1 fan-out (7 workers) | Done; schemas validated; no conflicts | Worker reports; 5 spot-checks vs clones |
| 2 | Design doc | Approved with corrections | docs/plans/2026-10-11-empirical-research-enhancement.md |
| 3 | Implementation plan | Written; executing | docs/plans/2026-10-11-research-protocol-implementation.md |
| 4 | T1 ledger repair + evidence archive (orchestrator) | 7 files: ledger rewrite + 6 audit archives | docs/research/upstream-audits/ |
| 5 | T2 digests + cache binding | 15 tests pass | node --test |
| 6 | T3 protocol/outcome/amendments | 35 research tests pass | node --test |
| 7 | T4 device locks + child races | 44 research tests; race {held,busy} ×3 rounds ×2 runs | test-lock.mjs |
| 8 | T5 clustering (real pairs) | 50/50; cohesion 1; hostile-RNG determinism; seeds 7v8 | test-clustering.mjs |
| 9 | CLI + discovery | 59/59 research; 65/65 scripts | test-cli.mjs, test-discover.mjs |
| 10 | T6 skills + T7 installer (parallel) | Both landed; T6 flagged concurrent router edits (mine, iter 11) | ses_ed25699c1ffe4Qvc67STZKB6nE, ses_ed25699c0ffeuVlpJXT7sKhxOO |
| 11 | Bootstrap-budget failure (systematic-debugging) | Root cause: T6 route line +113B → 5229 > 5116. Fix: compact route line, drop paren examples, remove 1 overlapping red-flag row → 5029 | Failing tests reproduced; byte counts measured; full suite back to green |
| 12 | T8 critic pass (code + security + research-validity) + 15 fixes | code-reviewer 12 findings + 5 Qs; security-reviewer 6 findings; research-validity: 7/7 scenarios executable (added checkEvidenceBundle). Fresh verify: lint 37/0, tests 132/0 | Review reports; test-t8-fixes.mjs 13/13; npm run verify exit 0 |
| 13 | Closeout C1–C4 (fail-closed locks, incomplete/successor tests, resampling split) | 137/0; verify output preserved; review bundle assembled at docs/review/2026-10-12-closeout/ | test-lock.mjs + test-clustering.mjs; 05-verify-output.txt exit 0 |
| 14 | Commit gate: bundle test-copies broke discovery (214/1) | Root cause: `node --test` ran `bundle-new/**/test-*.mjs` from wrong cwd. Fix: `.copy` suffix on bundle test files → 137/0. Secret scan: one grep hit = false positive (`task-identity`) | verify exit 0; commit + push |
| 15 | Forward corrections atop afa33ee (no rewrite): SOTA file untracked-preserved; no auto-reclaim; honest stats; PID validation; lock lifetime | Verify exit 0: lint 37/0, tests 140/0. 9 files changed, uncommitted, ready for review | iteration log; 06-revision pattern |

## Decisions log (appended stage 2)
| # | Decision | Basis |
|---|---|---|
| 7 | Bootstrap fix owned by orchestrator (concurrent with T6); row removal justified by overlap | systematic-debugging; no test depended on the row |
| 8 | Review triage: fix 15, accept 5 as residual (async API, Promise.all fan-out, Windows names, installer overwrite, malformed→reclaim) | Severity + exploitability; documented below |
| 9 | Added checkEvidenceBundle (pure) — bundle enforcement was skill-text-only | Research-validity review: scenario 7 needed an executable |
| 10 | Dropped age-reclaim for live pids; release token + 0600/0700; lone pairId → singleton | Security review #1/#2; code review #12 |

## Stage status: CLOSEOUT COMPLETE. Verify exit 0 (lint 37/0, tests 137/0). Review bundle: docs/review/2026-10-12-closeout/. STOPPED — no global install, remote writes, GPU jobs, or further enhancements.
