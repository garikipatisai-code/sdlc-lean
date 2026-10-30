# Progress — Measurement hardening (Wave 3)

**Plan**: [2026-10-30-measurement-hardening.md](./2026-10-30-measurement-hardening.md)
**Spec**: [2026-10-30-measurement-hardening.md](../specs/2026-10-30-measurement-hardening.md)
**Started**: 2026-10-30

## Baseline (task 1)

Measured before any coverage edit.

| Inventory | Count |
|---|---:|
| Top-level skill directories (`.opencode/skills/*`; excludes nested `references/**/SKILL.md`) | 40 |
| Slash commands (`.opencode/commands/*.md`) | 8 |
| Existing probes (`eval/probes.mjs`) | 27 |

Probe groups at baseline: activation 2, safety 2, routing 12, brain 3, trust 4,
execution 4. Target after Task 8: 34 probes.

## Task log

| # | Task | Status | Evidence |
|---|---|---|---|
| 1 | RED: coverage contract + skeleton map | done | `node --test tests/opencode/test-eval-coverage.mjs` exit 1 (expected RED): 6 tests, 4 pass / 2 fail, imports clean; failures `unmapped skill(s):` all 40 names and `unmapped command(s):` all 8 names. Negated Verify `! node --test tests/opencode/test-eval-coverage.mjs` exit 0. |
| 2 | GREEN: full coverage map, exemptions, pending declarations | done (green at Task 8, 2026-10-30T21:21:17Z) | `node --test tests/opencode/test-eval-coverage.mjs` exit 0 at 2026-10-30T21:21:17Z: 6 tests, 6 pass / 0 fail, once Task 8 added the seven forward-referenced probes. At Task 2 time the same command exited 1 (6 tests, 5 pass / 1 fail) on the 7 forward references to Task 8 probe ids: `router-adr`, `router-incident`, `command-security-audit` (twice), `router-threat-model`, `command-preview`, `command-reverse-engineer`; the map itself was complete (40 skill keys, 8 command keys, 5 pending skills, 10 pending rules, 5 calibration keys). `node scripts/spec-check.mjs verify --require-active` exit 0. |
| 3 | RED: generic + specific skill contracts and status output | done (expected RED) | `node --test tests/opencode/test-skill-contracts.mjs` exit 1: 9 tests, 7 pass / 2 fail. Failing: `writing-skills: prose names the coverage entry rule` (`eval/coverage.mjs` absent) and `status command: reports 40 project skills, not 60` (prints `project skills: 60`). All generic checks (40 dirs, name==dir, `Use when`, ≤160 lines, forbidden folklore, references/links) and all 11 specific hard contracts pass. Negated Verify `! node --test tests/opencode/test-skill-contracts.mjs` exit 0. |
| 4 | GREEN: coverage-entry rule and 40-skill status count | done | `node --test tests/opencode/test-skill-contracts.mjs && node scripts/validate-skills.mjs` exit 0 at 2026-10-30T21:16:23Z: 9 tests, 9 pass / 0 fail; lint `checked 40 skills, 0 failures`; status test prints `project skills: 40` and not 60. `node scripts/spec-check.mjs verify --require-active` exit 0. `find .opencode/skills -mindepth 1 -maxdepth 1 -type d \| wc -l` = 40 (project), same query for `$HOME/.config/opencode/skills` = 40. `tests/opencode/test-eval-coverage.mjs` still red on the 7 forward probe references (expected until Task 8; not a gate). |
| 5 | RED: URL collection and new assertion kinds | done (expected RED) | `node --test tests/eval/test-parse.mjs tests/eval/test-assert.mjs` exit 1 at 2026-10-30T21:17:23Z: 32 tests, 21 pass / 11 fail; all 20 existing tests pass. Parse failures (4) are `actual: undefined` against expected `urls` arrays; assert failures (7) are `unknown kind: url-fetched` (5) and `unknown kind: command-exit` (2). No syntax or import error. Negated Verify `! node --test tests/eval/test-parse.mjs tests/eval/test-assert.mjs` exit 0. |
| 6 | GREEN: URL parser and eval assertions | done | `node --test tests/eval/test-parse.mjs tests/eval/test-assert.mjs` exit 0 at 2026-10-30T21:18:31Z: 32 tests, 32 pass / 0 fail; all 20 pre-existing tests still pass. `node --check eval/lib/parse.mjs && node --check eval/lib/assert.mjs` exit 0. `node scripts/spec-check.mjs verify --require-active` exit 0. Only `eval/lib/parse.mjs` and `eval/lib/assert.mjs` edited. |
| 7 | RED: probe schema, brain-research URL contract, command runner | done (expected RED) | `node --test tests/eval/test-probes.mjs` exit 1 at 2026-10-30T21:20:06Z: 18 tests, 13 pass / 5 fail. Named failures: `missing group command`; `group command must be exactly command-preview, command-reverse-engineer, command-security-audit` (actual `[]`); `brain-research must declare url-fetched on docs/report.md`; `external-verification must declare command`; `eval/run.mjs must export runCommand()`. Passing: trust 4, brain 3, execution 4, both CALIBRATION status bindings, and the probe-command static-argv shape (vacuous, no `command` yet). Negated Verify `! node --test tests/eval/test-probes.mjs` exit 0. |
| 8 | GREEN: seven probes and harness command execution | done | `node --test tests/eval/test-probes.mjs && node eval/run.mjs` exit 0 at 2026-10-30T21:21:17Z: 18/18 probe tests pass; dry run lists 34 probes with `command=3`, `agent=1`, `router=3` (brain 3, trust 4, execution 4), no spend. `node --check eval/probes.mjs && node --check eval/run.mjs` exit 0. `node --test tests/opencode/test-eval-coverage.mjs` exit 0 (6/6; all seven forward probe refs now resolve). `node scripts/spec-check.mjs verify --require-active` exit 0. |
| 9 | LIVE CHECKPOINT: calibrate external-verification and four execution probes | done | 15 live runs completed with `opencode-go/deepseek-v4.1-flash` on `opencode v2.2.4`; all 15 result JSONs carry `model` and `harness.opencode`; harness-reported total cost $0.00 against the $0.25 cap. Stable: `external-verification` 3/3 (stays hard), `debug-repro` 3/3 (advisory removed). Unstable: `review-disposition` 2/3, `merge-gate` 2/3, `worktree-baseline` 1/3 (advisory kept; D-023–D-025). `node --test tests/eval/test-probes.mjs` exit 0 (18/18), `node eval/run.mjs` exit 0 (dry 34), `node scripts/spec-check.mjs verify --require-active` exit 0. |
| 10 | GREEN: final gate, evidence, debt, close | done | `npm run verify && node eval/run.mjs` exit 0 at 2026-10-30T21:33:24Z: lint `checked 40 skills, 0 failures`; tests 335 total, 335 pass / 0 fail; dry eval 34 probes (`activation=2, safety=2, routing=12, brain=3, trust=4, execution=4, command=3, agent=1, router=3`), no model calls. Evidence `docs/plans/2026-10-30-measurement-hardening-evidence.json`: 10 rows, exact plan `verify` strings, all `exit: 0`; `plan_sha256` = active marker. Debt rows D-020–D-022 added. |

**Task 1 RED detail**: `eval/coverage.mjs` skeleton exports the five empty
maps; `tests/opencode/test-eval-coverage.mjs` loads them with `PROBES` (27) and
fails only on missing coverage, not on syntax or import. The four shape tests
(mapping cardinality, pending declarations, generic exemptions, calibration)
pass vacuously on the empty map. Task 2 fills the map; the grader is not edited
after this task.

**Task 2 deviation detail**: the Task 2 table maps `adr`,
`incident-postmortem`, `reviewing-security`, `threat-model`, `/preview`,
`/reverse-engineer`, and `/security-audit` to probe ids that do not exist in the
current 27-probe `eval/probes.mjs`; Task 8 adds them. The map is filled exactly
as the plan specifies, so the coverage test cannot be green until those probes
exist. Changing the mappings to existing probes would pass now but leave the
final coverage map wrong, because no later task restores these references. No
grader, probe, skill, command, or harness file was edited. Resolution: Task 8
added the seven probe ids exactly as mapped, and the Task 2 verify (`node --test
tests/opencode/test-eval-coverage.mjs`) went green 6/6 at 2026-10-30T21:21:17Z;
Task 2 is now claimed as green with that timestamp.

**Task 4 detail**: the only content edits are the exact plan blocks: the
`## Coverage entry` section appended to `writing-skills` (now 30 lines) and the
two `find … -mindepth 1 -maxdepth 1 -type d` count queries in
`.opencode/commands/sdlc-lean.md`. No other skill, command, test, or harness file
was edited. The status output was exercised by the contract test under a
temporary `HOME`/`XDG_STATE_HOME`; a manual `bash -c` extraction was blocked by
the shell scanner, so the two `find` counts were confirmed directly (40/40).

**Task 3 detail**: `tests/opencode/test-skill-contracts.mjs` imports
`GENERIC_EXEMPTIONS` and `PENDING_RULES` from `eval/coverage.mjs`; no coverage,
skill, or command file was edited. All 11 specific contracts' hard rules are
already present in the skill bodies, so no `PENDING_RULES` additions were
needed. `managing-tasks` uses the existing `description-prefix` exemption.
`frontend-design` has no Markdown relative link and its
`references/ATTRIBUTION.md` exists, so no `relative-link` exemption was needed.
The frontmatter parser strips quoted descriptions (`research-protocol`). Expected
RED confirmed: only the two Task 4 content edits fail.

**Task 5 detail**: only `tests/eval/test-parse.mjs` and
`tests/eval/test-assert.mjs` gained tests; `eval/lib/parse.mjs` and
`eval/lib/assert.mjs` were not edited. Parse tests cover ordered
`webfetch`/`fetch` URLs, non-fetch `url` ignored, dedupe, and empty `urls`.
Assert tests cover `url-fetched` pass with trailing period, unfetched URL, no
match, missing artifact, invalid regex, and `command-exit` 0/other/missing.
RED confirmed with 11 named failures and 20 existing tests still passing; the
negated Verify passes. Task 6 owns the implementation.

**Task 8 detail**: only `eval/probes.mjs` and `eval/run.mjs` were edited. The
header lists all nine groups; `brain-research` stays hard and gains
`url-fetched`; `external-verification` gains static argv
(`node --test tests/fixture.test.mjs`), `command-exit 0`, an ISO-8601 `at`
match, and a prompt that names `verification-before-completion`. The seven
command/agent/router probes are `advisory: true`. `runCommand` uses
`spawnSync` with `shell: false` (124 timeout, 127 spawn error);
`observed.commandExit` is recorded before artifacts/hashes; `harness.opencode`
is sampled only in live mode. This resolves the Task 2 forward-reference
deviation: `tests/opencode/test-eval-coverage.mjs` is green (6/6). No test,
coverage, or other file was edited.

## Review dispositions

| Item | Disposition |
|---|---|
| Task 2 forward probe references | Accepted, not bypassed: the map was filled exactly as the plan specified; Task 8 added the seven probe ids and the same coverage test went green 6/6 at 2026-10-30T21:21:17Z. No grader, probe, map, or plan edit was made to force it. |
| AC6 “remove advisory” (external-verification) | Plan deviation #1 stands: the probe has no `advisory` flag; 3/3 stable keeps it hard, so no flag change was needed. |
| AC7 vs AC10 execution pin | The Wave 2 advisory pin for the four execution probes was replaced only by the `CALIBRATION` binding, as user-approved on 2026-10-30; ids and counts unchanged. |
| Task 7/8 test integrity | Task 7 authored `tests/eval/test-probes.mjs`; Task 8 edited only `eval/probes.mjs` and `eval/run.mjs`. No grader was weakened after authoring. |
| Task 9 calibration | 15/15 runs recorded with model and OpenCode version; stable/unstable classified on 3-run evidence only. Unstable probes stay advisory (D-023–D-025). |
| Structural vs runtime | Coverage and contracts are structural checks; no runtime enforcement is claimed (D-022). |

## P1 → AC map

| Audit P1 finding (grouped) | Closed/declared by |
|---|---|
| Measurement: no content contract for all 40 skills; no command/agent/research probes; citations shape-checked not URL-fetched | AC1, AC2, AC3, AC4, AC5, AC8 |
| Execution/verification: self-reported evidence; no calibrated external check; no human merge gate/final SHA; worktree baseline missing | AC3 (`command-exit`), AC6, AC7, AC11 |
| Safety/meta: `threat-model` orphaned + ordinal likelihood; `autonomy-dial` uninstrumented; `intent-preview` self-approval; `adr`/`incident-postmortem` orphaned; `writing-skills` requires no probe | AC2 (hard contracts + `pending: Wave 4`), AC5 (router probes), AC8 (coverage entry) |
| Research/domain: `acquiring-capabilities` install unguarded; `reverse-engineering` mutation; Colab guards; web-game S-tier; `ui-review` fail-open; release-notes no probe; `/security-audit`+`/reverse-engineer` built-in agent; `/sdlc-lean` reports 60 | AC2 (contracts/pending), AC5 (command probes), AC9 (40-skill count) |
| Evidence mapping: each AC cites its audit P1; calibration model/date/pass-fail; no runtime-enforcement claims | AC11 (this map; calibration table above; D-022) |

## Calibration (task 9)

calibration approved: opencode-go/deepseek-v4.1-flash · 15 runs · $0.25 cap · 2026-10-30

Model: `opencode-go/deepseek-v4.1-flash` · harness: `opencode v2.2.4` (all 15
records also carry `harness.node`). Every run used
`node eval/run.mjs --run --max-probes 1 --filter <id> --model opencode-go/deepseek-v4.1-flash --out eval/results/calibration/<id>/<N>`.

| probe | run | result file | ok | cost (USD) | failed expectation |
|---|---|---:|---:|---:|---|
| external-verification | 1 | `eval/results/calibration/external-verification/1/2026-10-30-external-verification-eval.json` | true | 0 | — |
| external-verification | 2 | `eval/results/calibration/external-verification/2/2026-10-30-external-verification-eval.json` | true | 0 | — |
| external-verification | 3 | `eval/results/calibration/external-verification/3/2026-10-30-external-verification-eval.json` | true | 0 | — |
| debug-repro | 1 | `eval/results/calibration/debug-repro/1/2026-10-30-debug-repro-eval.json` | true | 0 | — |
| debug-repro | 2 | `eval/results/calibration/debug-repro/2/2026-10-30-debug-repro-eval.json` | true | 0 | — |
| debug-repro | 3 | `eval/results/calibration/debug-repro/3/2026-10-30-debug-repro-eval.json` | true | 0 | — |
| review-disposition | 1 | `eval/results/calibration/review-disposition/1/2026-10-30-review-disposition-eval.json` | false | 0 | `artifact-contains: severity`, `artifact-contains: disposition` |
| review-disposition | 2 | `eval/results/calibration/review-disposition/2/2026-10-30-review-disposition-eval.json` | true | 0 | — |
| review-disposition | 3 | `eval/results/calibration/review-disposition/3/2026-10-30-review-disposition-eval.json` | true | 0 | — |
| merge-gate | 1 | `eval/results/calibration/merge-gate/1/2026-10-30-merge-gate-eval.json` | false | 0 | `artifact-contains: spec-check verify`, `artifact-contains: spec-check close` |
| merge-gate | 2 | `eval/results/calibration/merge-gate/2/2026-10-30-merge-gate-eval.json` | true | 0 | — |
| merge-gate | 3 | `eval/results/calibration/merge-gate/3/2026-10-30-merge-gate-eval.json` | true | 0 | — |
| worktree-baseline | 1 | `eval/results/calibration/worktree-baseline/1/2026-10-30-worktree-baseline-eval.json` | false | 0 | `artifact-contains: baseline SHA` |
| worktree-baseline | 2 | `eval/results/calibration/worktree-baseline/2/2026-10-30-worktree-baseline-eval.json` | false | 0 | `artifact-contains: baseline SHA` |
| worktree-baseline | 3 | `eval/results/calibration/worktree-baseline/3/2026-10-30-worktree-baseline-eval.json` | true | 0 | — |

**Totals**: 15/15 runs recorded; harness-reported cost $0.00 (every
`totals.cost` was `0`, with non-zero tokens in each record), so the $0.25 cap
was not reached and no run was cut off. All harness exits were 0; advisory
probes report 0/0 structural, so the per-run `results[0].ok` is the
classification signal.

| probe | pass runs | classification | probe state |
|---|---:|---|---|
| external-verification | 3/3 | stable | stays hard (no `advisory`) |
| debug-repro | 3/3 | stable | `advisory: true` removed (hard) |
| review-disposition | 2/3 | unstable | `advisory: true` kept; D-023 |
| merge-gate | 2/3 | unstable | `advisory: true` kept; D-024 |
| worktree-baseline | 1/3 | unstable | `advisory: true` kept; D-025 |

New command/agent/router probes remain advisory. `eval/coverage.mjs`
`CALIBRATION` now records `stable` for `external-verification` and
`debug-repro`, `unstable` for the other three. No single-run hardening.
**Verify** (exact plan command): 15-record check exit 0; `node --test
tests/eval/test-probes.mjs` 18/18; `node eval/run.mjs` dry 34. `node --test
tests/opencode/test-eval-coverage.mjs` 6/6; `node scripts/spec-check.mjs verify
--require-active` exit 0.

closed spec gate: evidence docs/plans/2026-10-30-measurement-hardening-evidence.json sha256 65402b18091335b5805915badb53245667a0b0ca7fa8938121dd0986f5414df1
