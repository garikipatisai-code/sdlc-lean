# Progress — Execution-quality hardening (Wave 2)

Plan: `docs/plans/2026-10-30-execution-quality-hardening.md`
Spec: `docs/specs/2026-10-30-execution-quality-hardening.md`

## Baseline (before any skill edit, task 1)

`wc -l` on the nine skill files under `.opencode/skills/<name>/SKILL.md`:

| Skill | Lines | Cap | Headroom |
|---|---:|---:|---:|
| test-driven-development | 33 | 40 | 7 |
| systematic-debugging | 23 | 30 | 7 |
| executing-plans | 47 | 55 | 8 |
| subagent-driven-development | 48 | 55 | 7 |
| requesting-code-review | 31 | 40 | 9 |
| receiving-code-review | 16 | 25 | 9 |
| lean-review | 25 | 35 | 10 |
| finishing-a-development-branch | 11 | 20 | 9 |
| using-git-worktrees | 23 | 30 | 7 |

## Task log

| Task | Action | Verify | Exit | At (UTC) |
|---|---|---|---|---|
| 1 | Structural execution gate authored; RED inspected; no skill edited | `! node --test tests/opencode/test-execution-skills.mjs` | 0 | 2026-10-30T19:38:14Z |
| 2 | TDD/debugging contracts: external-signal framing, fail-before-fix; repro command `node --test --test-name-pattern="test-driven-development\|systematic-debugging" tests/opencode/test-execution-skills.mjs` | `node --test --test-name-pattern="test-driven-development\|systematic-debugging" tests/opencode/test-execution-skills.mjs && node --test --test-name-pattern="integrity" tests/opencode/test-trust-skills.mjs` | 0 | 2026-10-30T19:39:30Z |
| 3 | Execution/subagent contracts: no-reviewer escalation + review dispositions; fresh-context limit, independent signal, baseline SHA/test command | `node --test --test-name-pattern="executing-plans\|subagent" tests/opencode/test-execution-skills.mjs && node --test --test-name-pattern="executing-plans\|subagent" tests/opencode/test-trust-skills.mjs` | 0 | 2026-10-30T19:41:31Z |
| 4 | Review evidence/dispositions: 4 passes bound to evidence sources, `no finding` rule, persisted `path:line`/severity/disposition; receiving re-run + ledger dispositions | `node --test --test-name-pattern="requesting-code-review\|receiving-code-review" tests/opencode/test-execution-skills.mjs && node --test --test-name-pattern="requesting-code-review" tests/opencode/test-trust-skills.mjs` | 0 | 2026-10-30T19:42:46Z |
| 5 | Lean/merge/worktree contracts: advisory `net: -N` with severity + reason and protected deletions; five-rule human/final-SHA/spec-check merge gate; worktree baseline SHA/test command, per-worktree marker, collisions | `node --test tests/opencode/test-execution-skills.mjs` | 0 | 2026-10-30T19:44:25Z |
| 6 | Eval schema RED: `execution` added to `GROUPS` + one group/ids/advisory/artifacts test; trust/brain/safety/artifact-path/file-unchanged/fixture/zero-probe/createScratch tests untouched; no probe added | `! node --test tests/eval/test-probes.mjs` | 0 | 2026-10-30T19:44:59Z |
| 7 | Four advisory `execution` probes added (`debug-repro`, `review-disposition`, `merge-gate`, `worktree-baseline`); header lists `execution`; no harness/grader edit; dry run 27 (`execution=4`), no spend | `node --test tests/eval/test-probes.mjs && node eval/run.mjs && node --check eval/probes.mjs` | 0 | 2026-10-30T19:47:18Z |
| 8 | Final gate: full suite + dry eval; eight evidence rows written; debt D-017–D-019 added; close run separately after the rows | `npm run verify && node eval/run.mjs` | 0 | 2026-10-30T19:48:14Z |

### Task 1 RED evidence

First run without negation: `node --test tests/opencode/test-execution-skills.mjs`

- 28 tests, 17 pass, 11 fail, exit 1. No import/syntax error.
- Caps: 9/9 pass. Parity `parity: 9 execution skills install byte-identically`: pass.
- Required-string failures (all 9):
  - `test-driven-development` (AC1): missing "test-first generates the external signal", "does not by itself guarantee quality or productivity", "regression".
  - `systematic-debugging` (AC2): missing "fail-before-fix", "temporarily revert", "repro test fails again", "repro command", "evidence row".
  - `executing-plans` (AC3): missing "no reviewer", "stop and escalate", "no self-review fallback", "review dispositions".
  - `subagent-driven-development` (AC4): missing "not a quality guarantee", "independent signal", "baseline SHA", "test command".
  - `requesting-code-review` (AC5): missing "traced attacker path", "no finding", "disposition".
  - `receiving-code-review` (AC6): missing "re-run", "full suite", "progress ledger".
  - `lean-review` (AC7): missing "advisory", "never a gate", "one-line reason", "severity", "tests", "safety guards", "error handling".
  - `finishing-a-development-branch` (AC8): missing "explicit human approval", "final SHA", "before cleanup", "after evidence", "spec-check verify", "spec-check close", "not a green build".
  - `using-git-worktrees` (AC9): missing "baseline SHA", "test command", "per-worktree", "dependency", "port", "merge/PR", "spec-gate".
- Forbidden failures (2):
  - `test-driven-development` (AC1): `/Iron Law/i` still present.
  - `finishing-a-development-branch` (AC8): `/confirm CI scope,? then clean up/i` still present.
- Other 7 forbidden tests pass at baseline (patterns absent); they guard reintroduction.

Task Verify (negated) run after authoring and again as the final check: exit 0 both times, same 17/11 split.

### Task 2 GREEN evidence

- RED before edits (exit 1, named failures only, no import/syntax error):
  - `test-driven-development: strings` — missing "test-first generates the external signal", "does not by itself guarantee quality or productivity", "regression".
  - `test-driven-development: forbidden` — `/Iron Law/i` present.
  - `systematic-debugging: strings` — missing "fail-before-fix", "temporarily revert", "repro test fails again", "repro command", "evidence row".
- GREEN after edits: focused gate 6/6 pass; `integrity` 5/5 pass; `spec-check verify --require-active` exit 0.
- Caps (`wc -l`): test-driven-development 30 ≤ 40; systematic-debugging 29 ≤ 30.
- Fail-before-fix: the focused gate is the repro command — it failed (exit 1) on the pre-edit text and passes (exit 0) after. Task 2 is a documentation edit with no debug cycle, so no production change was reverted post-green; the debugging skill now mandates that cycle (temporarily revert, confirm red, reapply) for every real fix.
- Repro command: `node --test --test-name-pattern="test-driven-development\|systematic-debugging" tests/opencode/test-execution-skills.mjs` (the pre-edit failing gate); no separate bug repro exists for this task.

Evidence row for task 8 (exact Verify, unescaped; optional `repro` key):

```json
{"task": 2, "verify": "node --test --test-name-pattern=\"test-driven-development|systematic-debugging\" tests/opencode/test-execution-skills.mjs && node --test --test-name-pattern=\"integrity\" tests/opencode/test-trust-skills.mjs", "exit": 0, "at": "2026-10-30T19:39:30Z", "repro": "node --test --test-name-pattern=\"test-driven-development|systematic-debugging\" tests/opencode/test-execution-skills.mjs"}
```

### Task 3 GREEN evidence

- RED before edits (exit 1, named failures only, no import/syntax error):
  - `executing-plans (AC3): missing required strings: "no reviewer", "stop and escalate", "no self-review fallback", "review dispositions"`.
  - `subagent-driven-development (AC4): missing required strings: "not a quality guarantee", "independent signal", "baseline SHA", "test command"`.
- GREEN after edits: focused execution gate 6/6; focused trust gate 4/4 (raw output + integrity); `spec-check verify --require-active` exit 0.
- Caps (`wc -l`): executing-plans 50 ≤ 55; subagent-driven-development 52 ≤ 55.
- Wave 1 integrity sentence unchanged in both; no grader edited.

Evidence row for task 8 (exact Verify, unescaped):

```json
{"task": 3, "verify": "node --test --test-name-pattern=\"executing-plans|subagent\" tests/opencode/test-execution-skills.mjs && node --test --test-name-pattern=\"executing-plans|subagent\" tests/opencode/test-trust-skills.mjs", "exit": 0, "at": "2026-10-30T19:41:31Z"}
```

### Task 4 GREEN evidence

- RED before edits (exit 1, named failures only, no import/syntax error):
  - `requesting-code-review (AC5): missing required strings: "traced attacker path", "no finding", "disposition"`.
  - `receiving-code-review (AC6): missing required strings: "re-run", "full suite", "progress ledger"`.
- GREEN after edits: focused execution gate 6/6; focused trust review test 1/1 (review-exception still binary and recorded); `spec-check verify --require-active` exit 0; `validate-skills` 40/40.
- Caps (`wc -l`): requesting-code-review 36 ≤ 40; receiving-code-review 17 ≤ 25.
- Passes now name their evidence source: correctness → `spec`/plan requirement; security → `traced attacker path`; performance → `measurement`; maintainability/leanness → `diff` + `lean-review` list. A pass with no evidence says `no finding`; every finding persists `path:line`, `severity`, and `disposition` (`fixed`/`rejected`/`needs-human`) in the review note and progress ledger.
- Wave 1 strings `≤20 changed lines`, `auth/IO/schema`, `review-exception` unchanged; no grader edited.

Evidence row for task 8 (exact Verify, unescaped):

```json
{"task": 4, "verify": "node --test --test-name-pattern=\"requesting-code-review|receiving-code-review\" tests/opencode/test-execution-skills.mjs && node --test --test-name-pattern=\"requesting-code-review\" tests/opencode/test-trust-skills.mjs", "exit": 0, "at": "2026-10-30T19:42:46Z"}
```

### Task 5 GREEN evidence

- RED before edits (exit 1, named failures only, no import/syntax error):
  - `lean-review (AC7): missing required strings: "advisory", "never a gate", "one-line reason", "severity", "tests", "safety guards", "error handling"`.
  - `finishing-a-development-branch (AC8): missing required strings: "explicit human approval", "final SHA", "before cleanup", "after evidence", "spec-check verify", "spec-check close", "not a green build"`; forbidden `/confirm CI scope,? then clean up/i` still present.
  - `using-git-worktrees (AC9): missing required strings: "baseline SHA", "test command", "per-worktree", "dependency", "port", "merge/PR", "spec-gate"`.
  - Gate totals: 28 tests, 24 pass, 4 fail.
- GREEN after edits: full execution gate 28/28 pass; `validate-skills` 40/40; `spec-check verify --require-active` exit 0.
- Caps (`wc -l`): lean-review 29 ≤ 35; finishing-a-development-branch 12 ≤ 20; using-git-worktrees 26 ≤ 30.
- `lean-review`: `<severity>` + one-line reason in the item format; tags stay binary; `net: -N` is advisory, never a gate; tests/safety guards/error handling are protected from deletion-for-net.
- `finishing-a-development-branch` rewritten to five rules (final-SHA verification, explicit human approval with wait-on-no-reply, final-SHA CI and "confirm CI scope" is not a green build, `spec-check verify` before cleanup and `spec-check close` after evidence, cleanup only after merge/PR).
- `using-git-worktrees`: baseline SHA (`git rev-parse HEAD`) + test command recorded; `.sdlc/spec-gate.json` is per-worktree; dependency/port collision check; cleanup only after `merge/PR`.
- No grader edited; parity subtest 9/9.

Evidence row for task 8 (exact Verify, unescaped):

```json
{"task": 5, "verify": "node --test tests/opencode/test-execution-skills.mjs", "exit": 0, "at": "2026-10-30T19:44:25Z"}
```

### Task 6 RED evidence

- Baseline before edit (no schema addition yet): `node --test tests/eval/test-probes.mjs` → 11/11 pass, exit 0.
- After adding `'execution'` to `GROUPS` and the one new schema test, run without negation: 12 tests, 10 pass, 2 fail, exit 1. No import/syntax error; `eval/probes.mjs` untouched.
  - `every group is represented` — `missing group execution`.
  - `execution group is exactly the four execution probes` — actual `[]`, expected `['debug-repro', 'merge-gate', 'review-disposition', 'worktree-baseline']`.
- The other 10 tests pass, including trust exactly 4, brain exactly 3, safety hard, artifact-path declaration, `file-unchanged` baseline, fixture keys, zero-probe, and `createScratch`.
- The advisory/artifacts/artifact-expectation assertions sit behind the id `deepEqual` and will be exercised by task 7's probes.
- Task Verify (negated) after authoring: `! node --test tests/eval/test-probes.mjs` → exit 0 (expected RED).
- No grader owned by another task edited; no skill or probe changed.

Evidence row for task 8 (exact Verify, unescaped; expected RED recorded as exit 0 because the command is negated):

```json
{"task": 6, "verify": "! node --test tests/eval/test-probes.mjs", "exit": 0, "at": "2026-10-30T19:44:59Z"}
```

### Task 7 GREEN evidence

- RED before edit: `node --test tests/eval/test-probes.mjs` → 12 tests, 10 pass, 2 expected failures (`every group is represented` missing `execution`; execution ids actual `[]`), exit 1. No import/syntax error.
- GREEN after adding exactly four advisory probes: 12/12 pass; `node --check eval/probes.mjs` exit 0.
- Dry run: 27 probes `(activation=2, safety=2, routing=12, brain=3, trust=4, execution=4)`, all four execution probes `(advisory)`, no model calls.
- Only existing kinds used: `skill`, `artifact-contains`, `artifact-matches`, `file-unchanged`. Every artifact path relative and declared; every `file-unchanged` path in `baseline`; fixtures relative with no `..`. `eval/run.mjs`, `eval/lib/assert.mjs`, and `tests/eval/test-probes.mjs` untouched.
- `node scripts/spec-check.mjs verify --require-active` exit 0.

Evidence row for task 8 (exact Verify, unescaped):

```json
{"task": 7, "verify": "node --test tests/eval/test-probes.mjs && node eval/run.mjs && node --check eval/probes.mjs", "exit": 0, "at": "2026-10-30T19:47:18Z"}
```

### Task 8 GREEN evidence

- `npm run verify` exit 0: lint `checked 40 skills, 0 failures`; `node --test` 302 tests, 302 pass, 0 fail.
- `node eval/run.mjs` (dry, no model calls) exit 0: 27 probes `(activation=2, safety=2, routing=12, brain=3, trust=4, execution=4)`; four `execution` probes listed `(advisory)`.
- Raw combined run `npm run verify && node eval/run.mjs` exit 0 at 2026-10-30T19:48:14Z (started 2026-10-30T19:48:11Z).
- Evidence file `docs/plans/2026-10-30-execution-quality-hardening-evidence.json`: eight rows, tasks 1–8 in order, exact plan `Verify`, `exit: 0`, UTC `at`; task 2 keeps its optional `repro` key.
- Debt rows D-017 (execution probes advisory until calibrated), D-018 (merge gate/worktree baseline instruction/artifact-level), D-019 (`code-reviewer` has no read-only test allowlist) added.
- `node scripts/spec-check.mjs close` is run as a separate action after the eight rows; its output is recorded below.

Evidence row for task 8 (exact Verify, unescaped):

```json
{"task": 8, "verify": "npm run verify && node eval/run.mjs", "exit": 0, "at": "2026-10-30T19:48:14Z"}
```

## Review dispositions

| Task | Finding | Disposition | Note |
|---|---|---|---|
| 1 | None (RED gate only; no skill content) | — | Grader authored by task 1; tasks 2–5 must not edit it |
| 2 | None (documentation edit; focused gate 6/6, integrity 5/5) | — | No grader edited |
| 3 | None (documentation edit; focused execution 6/6, trust 4/4) | — | No grader edited |
| 4 | None (documentation edit; focused execution 6/6, trust review 1/1, lint 40/40) | — | No grader edited; review-exception test unchanged |
| 5 | None (documentation edit; full execution gate 28/28, lint 40/40) | — | No grader edited; first full green of the nine-skill gate |
| 6 | None (RED schema authoring; 10/12 pass, 2 expected failures) | — | Schema authored by task 6; task 7 must not edit it. No probe or skill edited |
| 7 | None (probe authoring; schema 12/12, dry 27 with execution=4) | — | Four advisory probes added; no harness/grader/skill edited |
| 8 | None (final gate; verify 302/302, 0 fail; dry eval 27 with execution=4) | — | Allow files only; close run separately after the eight evidence rows |

## Audit P1 → AC map (AC11)

| Audit P1 finding (execution/verification paragraph) | AC | Task |
|---|---|---|
| TDD "Iron Law" overclaims quality | AC1 | 2 |
| debugging lacks fail-before-fix/repro retention | AC2 | 2 |
| executing evidence self-reported; self-review fallback | AC3 | 3 |
| subagent review text-only; fresh context overclaimed | AC4 | 3 |
| review passes as personas; findings not persisted | AC5, AC6 | 4 |
| lean `net: -N` can reward harmful deletion | AC7 | 5 |
| finishing lacks human merge gate/final-SHA CI | AC8 | 5 |
| worktrees lack baseline SHA/gate-marker warning | AC9 | 5 |
| no execution structural gate; eval cannot see execution quality | AC10, AC11 | 1, 6–8 |

## Close output

closed spec gate: evidence docs/plans/2026-10-30-execution-quality-hardening-evidence.json sha256 c49a75aa3a08918aa2a22c5888eaa30b8e56f06db94264335506ba3c05cd9481
