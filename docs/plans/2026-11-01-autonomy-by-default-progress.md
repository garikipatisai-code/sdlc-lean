# Progress: autonomy by default (installer ships it, router assumes it)

## Goal

Make the envelope-authorized zero-approval loop the shipped default: installer ships envelope template + `AUTONOMY.md` + ledger init additively, router runs envelope-first with one chat yes at bootstrap, human `/approve`+hash survives only as fallback and irreversible-external acts stay ALWAYS-human.

## Acceptance

- [ ] Plan approved (human approve on `docs/plans/2026-11-01-autonomy-by-default.md`)
- [ ] Gate active
- [ ] Build green (`npm run verify` exits 0)
- [ ] Evidence bound (`docs/plans/2026-11-01-autonomy-by-default-evidence.json` holds one exit-0 row per task with exact `Verify` command and UTC `at`)
- [ ] Close (`close --machine` with evidence)

## Y-statement

Chose prose + installer-default over behavior-code changes to achieve shipped autonomy, accepting skill-line-cap constraints.

Losers:
- New services/agents (unneeded surface)
- Plugin/CLI changes (pilot constraint + already built)
- Per-repo manual porting (doesn't scale)

## Status

- Plan written (`docs/plans/2026-11-01-autonomy-by-default.md`, status draft), awaiting human approve.
- No gate active; no approve/close run by agent (human approves next).

## Task 5 run (2026-11-01, RED — do NOT close)

- T1 `node --test tests/scripts/test-install-global.mjs`: exit 0 (15 pass).
- T2 `node --test tests/opencode/test-skill-contracts.mjs tests/opencode/test-brain-skills.mjs tests/opencode/test-trust-skills.mjs`: exit 0 (59 pass).
- T3 `node --test tests/opencode/test-execution-skills.mjs tests/opencode/test-brain-skills.mjs`: exit 0 (47 pass).
- T4 `node --test tests/scripts/test-install-autonomy-default.mjs tests/opencode/test-autonomy-default-posture.mjs`: exit 0 (13 pass).
- T5 `npm run verify`: exit 1 — 535 tests, 531 pass, 4 fail, all in `tests/opencode/test-plugin-loading.mjs` (`bootstrap stays within the 5KB budget` + 3 budget-routing tests: `router bootstrap must stay within 5KB budget`). Prior tasks' router prose pushed bootstrap over budget.
- `node scripts/spec-check.mjs verify --require-active`: exit 0 (gate intact, plan b97daf9cb7bb).
- Evidence JSON NOT written (no exit-0 T5 row to bind — writing one would be fabrication).
- Verdict: RED. Escalated to human: needs re-plan (`close` + re-approve) to either trim router prose back within budget or adjust the budget test before T5 can go green.

## Task 5 run (2026-11-01, GREEN — ready for close)

- Fresh re-run of each plan-table Verify cell, all exit 0:
  - T1 `node --test tests/scripts/test-install-global.mjs`: exit 0 (15 pass).
  - T2 `node --test tests/opencode/test-skill-contracts.mjs tests/opencode/test-brain-skills.mjs tests/opencode/test-trust-skills.mjs`: exit 0 (59 pass).
  - T3 `node --test tests/opencode/test-execution-skills.mjs tests/opencode/test-brain-skills.mjs`: exit 0 (47 pass).
  - T4 `node --test tests/scripts/test-install-autonomy-default.mjs tests/opencode/test-autonomy-default-posture.mjs`: exit 0 (13 pass).
  - T5 `npm run verify`: exit 0 (535 pass, 0 fail).
- `node scripts/spec-check.mjs verify --require-active`: exit 0 (gate intact, plan b97daf9cb7bb, no cli-drift).
- Budget-fix episode: prior RED run failed 4 budget tests in `tests/opencode/test-plugin-loading.mjs` (bootstrap 5424 bytes over the 5KB cap); router prose was trimmed back within budget (5099 bytes), restoring `npm run verify` to 535/0.
- Evidence JSON written (`docs/plans/2026-11-01-autonomy-by-default-evidence.json`): plan + full plan_sha256 `b97daf9c…03b8eb5` from `.sdlc/spec-gate.json`, 5 rows with exact Verify strings, exit 0, UTC at 2026-11-01T14:45:36Z.
- Verdict: GREEN. Ready for human close (`close --machine` with evidence). No approve/close run by agent.
