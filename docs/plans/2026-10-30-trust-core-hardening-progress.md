# Progress — Trust-core hardening (Wave 1)

**Plan**: [2026-10-30-trust-core-hardening.md](./2026-10-30-trust-core-hardening.md)
**Spec**: [2026-10-30-trust-core-hardening.md](../specs/2026-10-30-trust-core-hardening.md)
**Started**: 2026-10-30

## Baseline (task 1)

Measured before any test edit, `node --test tests/scripts/test-spec-check.mjs`.

| Check | Baseline | Current | State |
|---|---:|---:|---|
| `tests/scripts/test-spec-check.mjs` pass | 14 | 14 | existing parse/glob/hash/symlink/status/verify/check coverage kept |
| `tests/scripts/test-spec-check.mjs` fail | 0 | 14 | expected RED for AC1/AC2 (new contract tests) |
| New test cases | 0 | 14 | `humanApproval`, `parsePlanTasks`, `closeGate` evidence, CLI TTY/close, injected-TTY `main` |

No spec gate is active during task 1 (bootstrap): `scripts/spec-check.mjs` is owned by task 2 and was not edited.

## Task log

| # | Task | Status | Evidence |
|---|---|---|---|
| 1 | RED: spec-check TTY + evidence-close contract tests | done (RED) | 28 tests: 14 pass / 14 fail; missing `humanApproval`/`parsePlanTasks`; `closeGate` evidence refusals absent; `!` Verify exit 0 @ 2026-10-30T18:38:25Z |
| 2 | GREEN: TTY-bound approve + evidence-bound close | done | 28 tests: 28 pass / 0 fail; `node --check` clean; plan parser reads 9 rows with unescaped `\|` Verify cells; Verify exit 0 @ 2026-10-30T18:43:20Z |
| 3 | RED: permission + trust-skill structural gates | done (RED) | 16 tests: 2 pass / 14 fail; per-file messages; compaction + installer parity baselines pass; `!` Verify exits 0 @ 2026-10-30T18:50:05Z |
| 4 | GREEN: least-privilege agents and security-audit route | done | `node --test tests/opencode/test-agent-permissions.mjs` → exit 0, 4/4 pass; `test-plugin-loading` 20/20 unchanged; gate verify exit 0; Verify @ 2026-10-30T18:51:16Z |
| 5 | GREEN: evidence schema + independent verification | done | targeted trust tests 5/5; `test-brain-skills` 19/19; `writing-plans` 85 lines; gate verify exit 0; evidence row recorded @ 2026-10-30T18:54:27Z |
| 6 | GREEN: review escape removed + integrity rule + one ledger | done | targeted trust tests 10/10; `test-compaction-hook` 9/9; gate verify exit 0; evidence row recorded @ 2026-10-30T18:56:07Z |
| 7 | RED: `file-unchanged` + trust probe schema tests | done (RED) | eval contract tests authored; `! node --test tests/eval/test-assert.mjs tests/eval/test-probes.mjs` → exit 0 @ 2026-10-30T18:59:38Z (expected RED); task-8 GREEN then passed 26/26 |
| 8 | GREEN: eval trust implementation | done | 26/26 eval tests; dry lists safety hard + 4 trust (2 no-auto); zero-probe exit 1; gate verify exit 0; evidence row @ 2026-10-30T19:03:20Z |
| 9 | GREEN: full gate, evidence, human smoke, close | done | `npm run verify && node eval/run.mjs` → exit 0 @ 2026-10-30T19:07:19Z (273/273 tests, 40 skills lint clean, dry eval 23 probes); evidence rows 1–9 written; debt D-015/D-016 added; close output below |

## RED evidence (task 1)

Command: `node --test tests/scripts/test-spec-check.mjs` → exit **1**, 28 tests, **14 pass / 14 fail**. `! node --test tests/scripts/test-spec-check.mjs` → exit **0** as the plan's task-1 `Verify` expects.

Failing tests and named errors:

| Test | RED reason |
|---|---|
| `humanApproval requires stdin and stdout to be TTYs` | `TypeError: mod.humanApproval is not a function` |
| `parsePlanTasks reads task rows and their Verify commands` | `TypeError: mod.parsePlanTasks is not a function` |
| `parsePlanTasks strips one backtick pair from a wrapped Verify cell` | `TypeError: mod.parsePlanTasks is not a function` |
| `parsePlanTasks unescapes escaped pipes inside Verify` | `TypeError: mod.parsePlanTasks is not a function` |
| `parsePlanTasks rejects duplicate task numbers` | thrown `TypeError` does not match `/duplicate/i` |
| `parsePlanTasks rejects a table without a Verify header` | thrown `TypeError` does not match `/missing-task-table\|task table\|Verify/i` |
| `closeGate refuses missing or unbound evidence and keeps the marker` | `Missing expected exception` (current `closeGate` unlinks unconditionally) |
| `closeGate refuses missing, extra, or mismatched task rows and keeps the marker` | `Missing expected exception: missing row` |
| `closeGate refuses plan or spec drift and keeps the marker` | `Missing expected exception` (close ignores `validateGate`) |
| `closeGate accepts complete evidence, returns the evidence hash, and removes the marker` | returns `true`, not `{ evidence, sha256 }` (sha256 is `undefined`) |
| `CLI status/verify/check round-trip and refusal on drift` | `close` exits 0 while the spec drifted; must exit 1 and keep the marker |
| `CLI close requires evidence and reports the evidence hash` | `close` exits 0 with no evidence file; must exit 1 |
| `CLI approve refuses a piped stdin/stdout and writes no marker` | piped `approve` exits 0 and writes the marker; must exit 1 with a TTY message |
| `CLI approve checks the TTY before validating the plan` | draft plan through a pipe reports `not-approved`, not a TTY error |

Passing tests include all pre-existing `parsePlanText`, glob, `isAllowed`, `buildGate`, `validateGate`, `checkPath`, symlink CLI cases, plus `main with an injected TTY approves and prints the active gate` (a regression guard: it passes before GREEN because the current CLI has no TTY check, and must keep passing once `main` consumes injected `io`).

## GREEN evidence (task 2)

Command: `node --test tests/scripts/test-spec-check.mjs` → exit **0**, 28 tests, **28 pass / 0 fail**. `node --check scripts/spec-check.mjs` → exit **0**.

| Change | Contract |
|---|---|
| `humanApproval({ stdinTTY, stdoutTTY })` | returns `true` only when both are `true`; else `tty-required` with the terminal message |
| `main(argv, io)` | injected `io` TTY values win over `process.stdin.isTTY`/`process.stdout.isTTY`; `approve` calls `humanApproval` before the positional check and `buildGate`; no env bypass |
| `evidenceFor(plan)` | `docs/plans/plan.md` → `docs/plans/plan-evidence.json` |
| `parsePlanTasks(text)` | finds the `#`/`Task`/`Verify` table, unescapes `\|`, trims cells, strips one backtick pair; `missing-task-table` / `invalid-plan-task` / `duplicate-task` |
| `closeGate(root)` | `validateGate` first; evidence must be a regular non-symlink file binding plan + `plan_sha256`, exactly one row per plan task, exact `verify`, numeric `exit === 0`, UTC `at`; unlinks only after all checks; returns `{ evidence, sha256 }` or `null` |
| CLI `close` | prints `closed spec gate: evidence <path> sha256 <64 hex>` or `no active spec gate`; USAGE names the evidence requirement |

Manual parser check: `parsePlanTasks` on this plan returns **9 rows**; tasks 5 and 6 Verify cells show `--test-name-pattern="writing-plans|executing-plans|subagent"` and `"review|integrity|ledger|compaction"` (escaped `\|` unescaped).

Note: the negated task-1 command `! node --test tests/scripts/test-spec-check.mjs` now exits **1**, the logical inversion of a green suite; task 1's exit-0 row stays the historical RED record.

## RED evidence (task 3)

Command: `node --test tests/opencode/test-agent-permissions.mjs tests/opencode/test-trust-skills.mjs` → exit **1**, 16 tests, **2 pass / 14 fail**. `! node --test …` → exit **0** as task 3's `Verify` expects.

| Test | RED reason |
|---|---|
| `explorer.md: read-only reconnaissance (edit deny, bash ask)` | `permission.bash` is `allow`, must be `ask` |
| `orchestrator.md: dispatches workers but never edits` | no `permission.edit`, must be `deny` (dispatch map still intact) |
| `test-writer.md: V2 test-only edit scope` | V1 singular `permission:` present; must move to V2 `permissions` with `tests/**` |
| `security-audit command: routes to security-reviewer` | frontmatter `agent: plan`, must be `security-reviewer` |
| `writing-plans: evidence allow entry and row schema` | no `docs/plans/<slug>-evidence.json` allow entry |
| `executing-plans: re-runs Verify and gives the reviewer raw evidence output` | no `Verify` command named |
| `subagent: re-runs Verify and gives the reviewer raw evidence output` | no `Verify` command named |
| `review: requesting-code-review has no trivial-diff escape and a binary exception` | “self-review for trivial diffs” escape still present |
| `integrity: test-driven-development states the test-integrity rule` | exact AC6 sentence absent |
| `integrity: systematic-debugging states the test-integrity rule` | exact AC6 sentence absent |
| `integrity: executing-plans states the test-integrity rule` | exact AC6 sentence absent |
| `integrity: subagent-driven-development states the test-integrity rule` | exact AC6 sentence absent |
| `integrity: verification-before-completion states the test-integrity rule` | exact AC6 sentence absent |
| `ledger: managing-tasks names the canonical progress ledger` | names `.planning/STATE.md`, not `docs/plans/<slug>-progress.md` |

Passing baselines (must stay green through tasks 4–6): `compaction: injects the canonical progress ledger and never .planning/STATE.md` (the hook already reads the newest `docs/plans/*-progress.md` and ignores `.planning`), `parity: 12 changed content files install byte-identically` (`installGlobal` copies the current bytes).

Targeted-selection check: `--test-name-pattern="writing-plans|executing-plans|subagent"` selects 5 tests; `"review|integrity|ledger|compaction"` selects 10 (9 RED, compaction green). Both task 5/6 `Verify` commands will run them.

## GREEN evidence (task 4)

Verify: `node --test tests/opencode/test-agent-permissions.mjs` → exit **0**, 4 tests, **4 pass / 0 fail** at `2026-10-30T18:51:16Z`.

| File | Change |
|---|---|
| `.opencode/agents/explorer.md` | `permission.bash: allow → ask`; `edit: deny` kept; body names `grep`, `git`, `ls` as the only bash use |
| `.opencode/agents/orchestrator.md` | added `edit: deny`; `todowrite: allow`, full `task` map, and absence of `steps: 60` untouched; body states it dispatches and never edits |
| `.opencode/agents/test-writer.md` | V2 `permissions` list: edit `*` deny → edit `tests/**` allow → shell `*` ask; singular `permission:` and `temperature:` removed; body hands production edits to `implementer` |
| `.opencode/commands/security-audit.md` | `agent: plan → security-reviewer`; body still read-only and “Never apply fixes” |

Regression checks: `node --test tests/opencode/test-plugin-loading.mjs` → exit **0**, 20/20 (unchanged; orchestrator contract intact). `node scripts/spec-check.mjs verify --require-active` → exit **0** (plan `60c6b4282b83`, spec `2b9e46e26f27`).

## GREEN evidence (task 5)

Verify: `node --test --test-name-pattern="writing-plans|executing-plans|subagent" tests/opencode/test-trust-skills.mjs && node --test tests/opencode/test-brain-skills.mjs` → exit **0** at `2026-10-30T18:54:27Z` (5/5 selected trust tests, 19/19 brain tests). `wc -l < .opencode/skills/writing-plans/SKILL.md` → **85**. `node scripts/validate-skills.mjs` → 40 skills, 0 failures. Gate verify → exit 0.

| File | Change |
|---|---|
| `writing-plans/SKILL.md` | `docs/plans/<slug>-evidence.json` allowed; one-line schema `{ plan, plan_sha256, tasks: [{ task, verify, exit, at }] }` with per-task row, exact `Verify` cell, `exit` 0, ISO-8601Z `at`; `approve` stated to run in a terminal; gate + self-review compressed, 85-line cap kept |
| `executing-plans/SKILL.md` | step 3 runs `Verify` exactly, writes raw command/exit/UTC row, non-zero → no ACCEPT; review dispatch carries raw command output; integrity sentence added |
| `subagent-driven-development/SKILL.md` | orchestrator re-runs `Verify` and writes the row; reviewer gets raw output, read-only tests only, missing output is a defect; integrity sentence + evidence-before-close added |

Evidence row 5 written to `docs/plans/2026-10-30-trust-core-hardening-evidence.json` with the exact plan `Verify` string, exit 0, `at` as above.

## GREEN evidence (task 6)

Verify: `node --test --test-name-pattern="review|integrity|ledger|compaction" tests/opencode/test-trust-skills.mjs && node --test tests/opencode/test-compaction-hook.mjs` → exit **0** at `2026-10-30T18:56:07Z` (10/10 selected trust tests, 9/9 compaction tests). `node scripts/validate-skills.mjs` → 40 skills, 0 failures. Full `test-trust-skills` → 12/12; `test-brain-skills` → 19/19; gate verify → exit 0.

| File | Change |
|---|---|
| `requesting-code-review/SKILL.md` | heading is “4-pass review (dispatch a reviewer; no self-review escape)”; trivial-diff self-review escape removed; every change takes the review path; binary exception requires `≤20 changed lines AND no auth/IO/schema` recorded as `review-exception: ≤20 lines, no auth/IO/schema`, otherwise dispatch; raw `Verify` output passed, self-report is not evidence |
| `test-driven-development/SKILL.md` | exact test-integrity sentence added under `## Test integrity` |
| `systematic-debugging/SKILL.md` | exact integrity sentence added; the reproducing test stays |
| `verification-before-completion/SKILL.md` | exact integrity sentence added before the re-run instruction |
| `managing-tasks/SKILL.md` | `docs/plans/<slug>-progress.md` is the only task state; lifecycle and handover point at the progress ledger; research-protocol handoff paragraph kept; no `.planning/STATE.md` |

Evidence row 6 written to the evidence JSON with the exact plan `Verify` string, exit 0, `at` as above.

## GREEN evidence (task 8)

Verify: `node --test tests/eval/test-assert.mjs tests/eval/test-probes.mjs && node eval/run.mjs && node --check eval/run.mjs` → exit **0** at `2026-10-30T19:03:20Z` (26/26 eval tests; dry run lists 23 probes; `node --check` clean). Gate verify → exit 0.

| File | Change |
|---|---|
| `eval/lib/assert.mjs` | `file-unchanged` compares `observed.fileHashes.before/after` with `Object.hasOwn`; `null === null` passes (absent stayed absent); a missing observation or untracked path fails with an error; `artifact-*` unchanged; no `exit-code` |
| `eval/probes.mjs` | safety probes are hard (no `advisory`); `trust` group is exactly `approval-self-check`, `readonly-subagent`, `external-verification`, `test-integrity`; gate/permission probes set `auto: false`; fixtures are relative; every `file-unchanged` path is in `baseline`; brain stays 3 |
| `eval/run.mjs` | exports `createScratch()`; `copySuite` copies `scripts/spec-check.mjs`; `runProbe` writes fixtures, snapshots baseline SHA-256 or `null` before/after into `observed.fileHashes`, and adds `--auto` only when `probe.auto !== false`; `runLive` uses one scratch per probe in `try/finally`; zero selected probes exit 1 with `no probes selected`; dry output marks `(no auto)` |

Dry summary: `probes: 23 (activation=2, safety=2, routing=12, brain=3, trust=4)`; `approval-self-check [trust] (no auto)` and `readonly-subagent [trust] (no auto)`; no model calls. Zero-probe check: `node eval/run.mjs --run --filter __none__` → exit **1**, stderr `no probes selected`.

Evidence row 8 written to `docs/plans/2026-10-30-trust-core-hardening-evidence.json` with the exact plan `Verify` string, exit 0, `at` as above.

## Final gate (task 9)

Verify: `npm run verify && node eval/run.mjs` → exit **0**, started `2026-10-30T19:07:19Z`, finished `2026-10-30T19:07:23Z`.

| Check | Result |
|---|---|
| `node scripts/validate-skills.mjs` (lint) | 40 skills, 0 failures |
| `node --test` (full suite) | 273 tests, **273 pass / 0 fail**, 0 cancelled/skipped/todo |
| `node eval/run.mjs` (dry, no spend) | `probes: 23 (activation=2, safety=2, routing=12, brain=3, trust=4)`; trust = `approval-self-check (no auto)`, `readonly-subagent (no auto)`, `external-verification`, `test-integrity`; no model calls |

Evidence rows in `docs/plans/2026-10-30-trust-core-hardening-evidence.json`, one per plan task; each `verify` string is copied from `parsePlanTasks`:

| task | verify | exit | at |
|---:|---|---:|---|
| 1 | `! node --test tests/scripts/test-spec-check.mjs` | 0 | 2026-10-30T18:38:25Z |
| 2 | `node --test tests/scripts/test-spec-check.mjs` | 0 | 2026-10-30T18:43:20Z |
| 3 | `! node --test tests/opencode/test-agent-permissions.mjs tests/opencode/test-trust-skills.mjs` | 0 | 2026-10-30T18:50:05Z |
| 4 | `node --test tests/opencode/test-agent-permissions.mjs` | 0 | 2026-10-30T18:51:16Z |
| 5 | `node --test --test-name-pattern="writing-plans\|executing-plans\|subagent" tests/opencode/test-trust-skills.mjs && node --test tests/opencode/test-brain-skills.mjs` | 0 | 2026-10-30T18:54:27Z |
| 6 | `node --test --test-name-pattern="review\|integrity\|ledger\|compaction" tests/opencode/test-trust-skills.mjs && node --test tests/opencode/test-compaction-hook.mjs` | 0 | 2026-10-30T18:56:07Z |
| 7 | `! node --test tests/eval/test-assert.mjs tests/eval/test-probes.mjs` | 0 | 2026-10-30T18:59:38Z |
| 8 | `node --test tests/eval/test-assert.mjs tests/eval/test-probes.mjs && node eval/run.mjs && node --check eval/run.mjs` | 0 | 2026-10-30T19:03:20Z |
| 9 | `npm run verify && node eval/run.mjs` | 0 | 2026-10-30T19:07:19Z |

Note: tasks 1–3 and 7 had no `at` recorded in their original log rows; their values above are the exact session-log timestamps of those Verify runs, not estimates. Tasks 4–6 and 8 keep the times those tasks recorded. `plan_sha256` = `60c6b4282b83c26d44e86f6b0973f2fffe15d3f8b2953b98633648db36e04b3f`.

## Current state

- `tests/scripts/test-spec-check.mjs`: contract for AC1/AC2, GREEN (28/28) and unmodified by task 2.
- `scripts/spec-check.mjs`: task 2 implemented; owns `humanApproval`, `parsePlanTasks`, `evidenceFor`, evidence-bound `closeGate`, TTY-gated `approve`.
- Gate: active (human `approve` @ 2026-10-30T18:34:25Z); `node scripts/spec-check.mjs verify --require-active` → exit **0** before task 3 and again before close at `2026-10-30T19:07Z` (plan `60c6b4282b83`, spec `2b9e46e26f27`). Close result recorded below.
- `tests/opencode/test-agent-permissions.mjs`: GREEN (4/4) after task 4. `tests/opencode/test-trust-skills.mjs`: GREEN (12/12) after tasks 5–6. Neither is edited by tasks 4–6. `tests/eval/test-assert.mjs` + `test-probes.mjs`: GREEN (26/26) after task 8.
- Evidence: `docs/plans/2026-10-30-trust-core-hardening-evidence.json` has 9 rows in task order, exact `parsePlanTasks` Verify strings, exit 0, UTC `at`. Pre-close file sha256 `00f0ec68f71e6e099d56abdc815f24d7b45205d84909c406d73df046a6f7541a`; `close` prints the authoritative hash.
- Debt ledger: D-015 (V2-only `test-writer` path scope, Wave 3 plugin guard) and D-016 (no `close --abandon`; finish or supersede) recorded.
- Full suite: 273/273 pass; lint 40 skills, 0 failures; dry eval 23 probes, 0 model calls.
- Orchestrator note: `steps: 60` was already absent from the working tree before task 4 (only `edit: deny` added); the diff vs HEAD shows the earlier removal, not a task-4 change.

## Close (task 9)

Command: `node scripts/spec-check.mjs close` → exit **0** @ `2026-10-30T19:09:20Z`.

```text
closed spec gate: evidence docs/plans/2026-10-30-trust-core-hardening-evidence.json sha256 00f0ec68f71e6e099d56abdc815f24d7b45205d84909c406d73df046a6f7541a
```

Final state: `close` validated the active marker, plan/spec/CLI hashes, and all 9 evidence rows, then removed `.sdlc/spec-gate.json` (`.sdlc/` is now empty). Gate inactive; evidence JSON is the handoff record; D-015/D-016 are in the debt ledger. No edits after this entry.

