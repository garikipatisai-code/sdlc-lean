# Progress — Domain/meta hardening (Wave 4)

Plan: `docs/plans/2026-10-30-domain-meta-hardening.md`
Spec: `docs/specs/2026-10-30-domain-meta-hardening.md`

## Gate and baseline

- `node scripts/spec-check.mjs verify --require-active` → exit 0
  (`plan 9d5f39b1c1c0`, `spec 0229c3173028`) before task 1 edits.
- Baseline counts (task 1, before any content/data edit):
  - 40 top-level skills with `SKILL.md`.
  - 8 commands: `bugfix`, `feature`, `game`, `preview`, `refactor`, `reverse-engineer`, `sdlc-lean`, `security-audit`.
  - 34 probes: activation 2, safety 2, routing 12, brain 3, trust 4, execution 4, command 3, agent 1, router 3.
  - 10 pending rules across 5 skills: `threat-model` 3, `autonomy-dial` 3, `intent-preview` 2, `web-game-development` 1, `ui-review` 1.
- Baseline gate: three suites authored by task 1 only. No skill, command, `eval/coverage.mjs`, or `eval/probes.mjs` edit.

## Task log

| Task | Action | Verify | Exit | At (UTC) |
|---|---|---|---|---|
| 1 | Authored Wave 4 grader contracts: per-skill `specific:`/`evidence:` tests, caps/forbidden regexes, no-pending in both suites, 9-command count, release mapping, 35-probe total, `command-release` shape, `release:` command. RED inspected; no content or data edited | `! node --test tests/opencode/test-skill-contracts.mjs && ! node --test tests/opencode/test-eval-coverage.mjs && ! node --test tests/eval/test-probes.mjs` | 0 | 2026-10-30T22:01:47Z |
| 2 | GREEN: threat-model route/artifact/H1 binary risk; brainstorming one-line handoff (60/60); reviewing-security finding template; systematic-debugging two-strike line replaced in place; diagnosing-sdlc inbound route + two-identical-diagnoses rule. Skills only; no router, test, or data edit | `set -e; for s in threat-model brainstorming reviewing-security systematic-debugging diagnosing-sdlc; do node --test --test-name-pattern="specific: $s" tests/opencode/test-skill-contracts.mjs; done; node --test tests/opencode/test-brain-skills.mjs tests/opencode/test-execution-skills.mjs` | 0 | 2026-10-30T22:03:27Z |
| 3 | GREEN: autonomy-dial named check command + H2 audit-ledger row + commit/diff/path reversal + no unmeasured success rate (27/30); audit-ledger single H2 format + one-row note; intent-preview read-only preview, never self-approve, TTY `spec-check approve`, non-interactive denied (20/25); adr status-only edits + superseding link (28/30). Skills + ledger only; no test or data edit | `set -e; for s in autonomy-dial intent-preview; do node --test --test-name-pattern="specific: $s" tests/opencode/test-skill-contracts.mjs; done; node --test --test-name-pattern="evidence: adr" tests/opencode/test-skill-contracts.mjs` | 0 | 2026-10-30T22:05:06Z |
| 4 | GREEN: STE removes every 80% claim (description, body, Karpathy quote) and `ASD-STE100 compliant`; keeps “dictionary is not reproduced”, rule 20, `STE-informed`, `not the standard`; cites `eval/research/2026-10-04-asd-ste100.md`; heading `## The subset (rules 1–20)` (72/80). incident-postmortem item 8 adds `recurrence-prevention verification` (`fails if the cause returns`), “Where action items live” names the postmortem or `docs/debt-ledger.md`; owner/date kept (30/35). Skills only; no test or data edit | `set -e; for s in simplified-technical-english incident-postmortem; do node --test --test-name-pattern="evidence: $s" tests/opencode/test-skill-contracts.mjs; done` | 0 | 2026-10-30T22:06:23Z |
| 5 | GREEN: dependency-upgrade adds the project audit (`npm audit --omit=dev`) + `advisory ID`, one-package `lockfile diff assertion`, `runtime smoke`, tested `rollback path` (27/35); evolving-schemas gates on `zero old-shape reads` `metric`, `idempotent` backfill with row-count assertions and double run, named/tested `rollback` (22/35). Skills only; no test or data edit | `set -e; for s in dependency-upgrade evolving-schemas; do node --test --test-name-pattern="evidence: $s" tests/opencode/test-skill-contracts.mjs; done` | 0 | 2026-10-30T22:07:25Z |
| 6 | GREEN: ui-review step 1 fails closed on fetch failure (`If the fetch fails, stop`, review nothing, never from memory; 19/25); web-game-development adds `## S-tier evidence table` with H3 `\| engine \| performance \| accessibility \| replay \| shipping \|` and one evidence cell per column before `## Non-negotiables` (149/155). Skills only; no test or data edit | `set -e; for s in ui-review web-game-development; do node --test --test-name-pattern="specific: $s" tests/opencode/test-skill-contracts.mjs; done` | 0 | 2026-10-30T22:08:43Z |
| 7 | GREEN: new `.opencode/commands/release.md` (description + `agent: build`, read-only diff, drafts Breaking/Added/Fixed/Deprecated + version bump, `Do not tag, publish, push, or edit source`, `explicit human approval`); writing-release-notes adds the `/release` route; only the release contract and `specific: writing-release-notes` green (coverage still 8) | `node --test --test-name-pattern="release:" tests/opencode/test-skill-contracts.mjs && node --test --test-name-pattern="specific: writing-release-notes" tests/opencode/test-skill-contracts.mjs` | 0 | 2026-10-30T22:09:37Z |
| 8 | GREEN: coverage/probe data — `PENDING_RULES` and every `pending` key removed, autonomy exempt with reason, `writing-release-notes`/`release` → `command-release`, 9 commands; `command-release` probe (advisory, existing assertion kinds), 35 probes, command group 4. Three suites 55/55 | `node --test tests/opencode/test-skill-contracts.mjs tests/opencode/test-eval-coverage.mjs tests/eval/test-probes.mjs && node eval/run.mjs` | 0 | 2026-10-30T22:11:19Z |
| 9 | LIVE CHECKPOINT: 9 runs (`opencode-go/deepseek-v4.1-flash`, harness `opencode v2.2.4`, node `v24.19.0`, `2026-10-30`, $0.00 ≤ $0.15 cap); prompt-only fixes for `review-disposition`, `merge-gate`, `worktree-baseline`; 3/3 each → `stable`, advisory removed; `expect` unchanged; dry 35 | `node --input-type=module -e "import fs from 'node:fs';import {CALIBRATION} from './eval/coverage.mjs';const ids=['review-disposition','merge-gate','worktree-baseline'];let n=0;for(const id of ids){let p=0;for(let i=1;i<=3;i++){const d='eval/results/calibration/wave4/'+id+'/'+i;const f=fs.readdirSync(d).find(x=>x.endsWith('-eval.json'));const r=JSON.parse(fs.readFileSync(d+'/'+f));if(!r.model)throw Error(id+' model');if(!r.harness?.opencode)throw Error(id+' version');if(r.results[0].ok)p++;n++}if((p===3)!==(CALIBRATION[id]==='stable'))throw Error(id+' '+p+'/3 vs '+CALIBRATION[id])}if(n!==9)throw Error('runs '+n)" && node --test tests/eval/test-probes.mjs && node eval/run.mjs` | 0 | 2026-10-30T22:20:25Z |
| 10 | GREEN: final gate, evidence JSON, debt ledger. `npm run verify` → lint 40 skills 0 failures; tests 357/357, 0 fail; dry eval 35 probes, command=4, no spend; bootstrap 5068 B ≤ 5116; evidence 10 rows; close separate | `npm run verify && node eval/run.mjs` | 0 | 2026-10-30T22:21:40Z |

### Task 1 RED evidence

First run of each suite **without** negation. All three exit non-zero for named missing
content/data; none is an import or syntax error. `eval/coverage.mjs` and
`eval/probes.mjs` still export the old (8 commands, 34 probes, pending) data.

#### `node --test tests/opencode/test-skill-contracts.mjs`

28 tests, 11 pass, 17 fail, exit 1.

- Passing: 5 generic tests; `specific: research-protocol`, `specific: acquiring-capabilities`,
  `specific: reverse-engineering`, `specific: colab-lifecycle` (the four unchanged high-risk
  contracts); `writing-skills`; `status command` (40 project skills).
- Failing (17), each first missing hard string or data:
  - `specific: reviewing-security` — missing `attacker input → sink`.
  - `specific: threat-model` — missing `Attacker paths`.
  - `specific: autonomy-dial` — missing `named check command`.
  - `specific: intent-preview` — missing `never self-approve`.
  - `specific: web-game-development` — missing `S-tier evidence table`.
  - `specific: ui-review` — missing `If the fetch fails, stop`.
  - `specific: writing-release-notes` — missing `/release`.
  - `specific: brainstorming` — missing `threat-model`.
  - `specific: systematic-debugging` — missing `diagnosing-sdlc`.
  - `evidence: adr` — missing `only the Status line may change`.
  - `evidence: simplified-technical-english` — missing `rules 1–20`.
  - `evidence: incident-postmortem` — missing `recurrence-prevention verification`.
  - `evidence: dependency-upgrade` — missing `audit`.
  - `evidence: evolving-schemas` — missing `zero old-shape reads`.
  - `evidence: diagnosing-sdlc` — missing `Inbound route`.
  - `mappings: no skill carries pending` — pending remains on `autonomy-dial`,
    `intent-preview`, `threat-model`, `ui-review`, `web-game-development`.
  - `release: command` — `.opencode/commands/release.md` does not exist.

#### `node --test tests/opencode/test-eval-coverage.mjs`

7 tests, 4 pass, 3 fail, exit 1.

- Passing: `skills: exactly 40 top-level directories, all mapped`;
  `mappings: exactly one of probe/group/exempt and resolvable`;
  `generic exemptions`; `calibration`.
- Failing (3):
  - `commands: exactly 9 .md stems, all mapped` — `expected 9 command files, found 8`.
  - `mappings: no skill carries pending` — same five pending skills.
  - `coverage: release and writing-release-notes map to command-release` —
    `COMMANDS.release` is `undefined` (expected `'command-release'`).

#### `node --test tests/eval/test-probes.mjs`

20 tests, 17 pass, 3 fail, exit 1.

- Passing: schema/unique ids; every group; brain 3 hard; brain-research; artifact paths;
  safety hard; trust 4; trust gate (`auto: false`); external-verification command/exit and
  calibration coupling; execution 4 with calibration coupling; file-unchanged baseline;
  fixture keys; static argv; zero-probe exit; `createScratch`; `runCommand`.
- Failing (3):
  - `probe set: exactly 35 probes` — `expected 35 probes, found 34`.
  - `command, agent, and router groups are exactly the eight new advisory probes` —
    `command` group is `['command-preview', 'command-reverse-engineer', 'command-security-audit']`;
    missing `command-release`.
  - `command-release is a read-only draft probe` — `missing probe command-release`.

#### Negated Task 1 Verify (final)

`! node --test tests/opencode/test-skill-contracts.mjs && ! node --test tests/opencode/test-eval-coverage.mjs && ! node --test tests/eval/test-probes.mjs`
→ exit 0, same 11/17, 4/3, and 17/3 pass/fail splits.

### Task 1 file boundary

- Edited: `tests/opencode/test-skill-contracts.mjs`, `tests/opencode/test-eval-coverage.mjs`,
  `tests/eval/test-probes.mjs`.
- Created: this ledger.
- Not edited: every skill, every command, `eval/coverage.mjs`, `eval/probes.mjs`, the plan,
  the spec, the plugin, the installer, agents, and the harness.

### Intended GREEN owners (not yet run)

- Tasks 2–6: the 7 changed high-risk skills, 6 evidence skills, and 2 route skills.
- Task 7: `.opencode/commands/release.md` and the `writing-release-notes` route
  (only `release:` and `specific: writing-release-notes` become green; coverage still has 8).
- Task 8: remove `pending`/`PENDING_RULES`, map 9 commands and 35 probes, add
  `command-release`; flips the command count, no-pending, release mapping, total, and shape tests.

## Task 2 — threat-model route, security template, two-strike diagnosis

- Edited: the five task-2 skills only. No test, `eval/*`, command, router, agent, or
  plugin edit; `git diff` shows only those five under `.opencode/skills/`.
- Line counts (`wc -l`, newline semantics as the graders use): `threat-model` 28 → 36
  (cap 40), `brainstorming` 59 → 60 (cap 60), `reviewing-security` 20 → 27 (cap 35),
  `systematic-debugging` 29 → 29 (cap 30, line replaced in place),
  `diagnosing-sdlc` 14 → 16 (cap 25).
- Content: threat-model adds `Inbound route` from `brainstorming`/`reviewing-security`,
  `docs/threat-model.md`, `Attacker paths`, H1 with `residual owner`, `Risk is binary:
  high or low.`, and drops the likelihood column; brainstorming appends exactly one
  unwrapped handoff line; reviewing-security adds `## Finding template` with
  `attacker input → sink → path:line → severity`; systematic-debugging ends the
  two-strike line with the `diagnosing-sdlc` escalation; diagnosing-sdlc adds the
  inbound route and the two-identical-diagnoses stop/escalate step.
- RED before content (first missing hard string per skill):
  - `specific: threat-model` — `Attacker paths`.
  - `specific: brainstorming` — `threat-model`.
  - `specific: reviewing-security` — `attacker input → sink`.
  - `specific: systematic-debugging` — `diagnosing-sdlc`.
  - `evidence: diagnosing-sdlc` — `Inbound route`.
- GREEN: the five `specific:` runs and `node --test tests/opencode/test-brain-skills.mjs
  tests/opencode/test-execution-skills.mjs` → 47 tests, 47 pass, 0 fail.
  `node scripts/spec-check.mjs verify --require-active` → exit 0
  (`plan 9d5f39b1c1c0`, `spec 0229c3173028`). `node scripts/validate-skills.mjs` →
  40 skills, 0 failures.
- Note: the plan's task-2 Verify loop uses `specific: diagnosing-sdlc`, which matches
  no test (its contract is `evidence: diagnosing-sdlc`). Ran that test explicitly:
  pass. The loop itself still exits 0. No grader edit; reporting for task 10.

## Task 3 — autonomy ledger, TTY approval, ADR status-only

- Edited: `.opencode/skills/autonomy-dial/SKILL.md`,
  `.opencode/skills/intent-preview/SKILL.md`, `.opencode/skills/adr/SKILL.md`,
  `docs/audit-ledger.md`. No test, `eval/*`, command, router, agent, or plugin edit.
- Line counts (`wc -l`, newline semantics as the graders use): `autonomy-dial` 21 → 27
  (cap 30), `intent-preview` 15 → 20 (cap 25), `adr` 27 → 28 (cap 30).
- Content:
  - `autonomy-dial`: each Auto run gates on a `named check command` stated before the
    first edit; exactly one `docs/audit-ledger.md` row with H2
    `| date | tier | check | result | reversal |`; `reversal` is the reverting commit,
    diff, or path to restore; `No unmeasured success rate` (pass/fail, not a score).
    Removed the `<5%` target, the `5–15%` edge-case claim, and the `confidence signal`
    line.
  - `docs/audit-ledger.md`: one format only — the H2 header plus the note
    “One row per Auto run.”; the old six-column `actor`/`reverted?` table is gone.
  - `intent-preview`: read-only research and one preview are kept; `Never self-approve`;
    the human runs `node scripts/spec-check.mjs approve <plan>` in a `TTY`;
    non-interactive approval is denied; accept-rate/`>85%` tracking removed.
  - `adr`: “Never edit an accepted ADR” replaced by “only the Status line may change:
    accepted → superseded by NNNN (or deprecated)”; the new ADR names and links the
    decision it replaces.
- RED before content, in this order (first missing hard string per contract):
  - `specific: autonomy-dial` — `named check command`.
  - `specific: intent-preview` — `never self-approve`.
  - `evidence: adr` — `only the Status line may change`.
- GREEN: the three named tests pass 1/1 each; `node scripts/validate-skills.mjs` →
  40 skills, 0 failures; `node scripts/spec-check.mjs verify --require-active` →
  exit 0 (`plan 9d5f39b1c1c0`, `spec 0229c3173028`).
- `git diff` for this task touches only the four named files.

## Evidence row

Exact Verify and exit for task 10's evidence JSON (RED recorded as exit 0 only because the
command is negated):

```json
{"task": 1, "verify": "! node --test tests/opencode/test-skill-contracts.mjs && ! node --test tests/opencode/test-eval-coverage.mjs && ! node --test tests/eval/test-probes.mjs", "exit": 0, "at": "2026-10-30T22:01:47Z"}
```

```json
{"task": 2, "verify": "set -e; for s in threat-model brainstorming reviewing-security systematic-debugging diagnosing-sdlc; do node --test --test-name-pattern=\"specific: $s\" tests/opencode/test-skill-contracts.mjs; done; node --test tests/opencode/test-brain-skills.mjs tests/opencode/test-execution-skills.mjs", "exit": 0, "at": "2026-10-30T22:03:27Z"}
```

```json
{"task": 3, "verify": "set -e; for s in autonomy-dial intent-preview; do node --test --test-name-pattern=\"specific: $s\" tests/opencode/test-skill-contracts.mjs; done; node --test --test-name-pattern=\"evidence: adr\" tests/opencode/test-skill-contracts.mjs", "exit": 0, "at": "2026-10-30T22:05:06Z"}
```

```json
{"task": 4, "verify": "set -e; for s in simplified-technical-english incident-postmortem; do node --test --test-name-pattern=\"evidence: $s\" tests/opencode/test-skill-contracts.mjs; done", "exit": 0, "at": "2026-10-30T22:06:23Z"}
```

```json
{"task": 5, "verify": "set -e; for s in dependency-upgrade evolving-schemas; do node --test --test-name-pattern=\"evidence: $s\" tests/opencode/test-skill-contracts.mjs; done", "exit": 0, "at": "2026-10-30T22:07:25Z"}
```

```json
{"task": 6, "verify": "set -e; for s in ui-review web-game-development; do node --test --test-name-pattern=\"specific: $s\" tests/opencode/test-skill-contracts.mjs; done", "exit": 0, "at": "2026-10-30T22:08:43Z"}
```

```json
{"task": 7, "verify": "node --test --test-name-pattern=\"release:\" tests/opencode/test-skill-contracts.mjs && node --test --test-name-pattern=\"specific: writing-release-notes\" tests/opencode/test-skill-contracts.mjs", "exit": 0, "at": "2026-10-30T22:09:37Z"}
```

```json
{"task": 8, "verify": "node --test tests/opencode/test-skill-contracts.mjs tests/opencode/test-eval-coverage.mjs tests/eval/test-probes.mjs && node eval/run.mjs", "exit": 0, "at": "2026-10-30T22:11:19Z"}
```

```json
{"task": 9, "verify": "node --input-type=module -e \"import fs from 'node:fs';import {CALIBRATION} from './eval/coverage.mjs';const ids=['review-disposition','merge-gate','worktree-baseline'];let n=0;for(const id of ids){let p=0;for(let i=1;i<=3;i++){const d='eval/results/calibration/wave4/'+id+'/'+i;const f=fs.readdirSync(d).find(x=>x.endsWith('-eval.json'));const r=JSON.parse(fs.readFileSync(d+'/'+f));if(!r.model)throw Error(id+' model');if(!r.harness?.opencode)throw Error(id+' version');if(r.results[0].ok)p++;n++}if((p===3)!==(CALIBRATION[id]==='stable'))throw Error(id+' '+p+'/3 vs '+CALIBRATION[id])}if(n!==9)throw Error('runs '+n)\" && node --test tests/eval/test-probes.mjs && node eval/run.mjs", "exit": 0, "at": "2026-10-30T22:20:25Z"}
```

## Task 5 — dependency audit/rollback, schema zero-read gate

- Edited: `.opencode/skills/dependency-upgrade/SKILL.md`,
  `.opencode/skills/evolving-schemas/SKILL.md`. No test, `eval/*`, command, router, agent, or
  plugin edit.
- Line counts (`wc -l`, newline semantics as the graders use): `dependency-upgrade` 24 → 27
  (cap 35), `evolving-schemas` 20 → 22 (cap 35).
- Content:
  - `dependency-upgrade`: item 2 runs the project audit command (`npm audit --omit=dev`) and
    records the `advisory ID`; item 5 keeps one package per commit; item 6 adds the
    `lockfile diff assertion` (only the bumped entry may move); item 8 adds a `runtime smoke`
    beyond the unit suite (boot the built artifact, exercise one real path); item 10 requires a
    tested `rollback path` (reverting commit/diff, previous version, smoke on the restored state).
  - `evolving-schemas`: a new `Backfill` step requires an `idempotent` backfill with row-count
    assertions and a double run; the `Contract gate` step removes the old shape only when a
    named `metric` reads `zero old-shape reads` for a full window; a new `Rollback` step names
    and tests the rollback (flag, down-migration, or restored snapshot) before the contract deploy.
- RED before content (first missing hard string per contract):
  - `evidence: dependency-upgrade` — `audit`.
  - `evidence: evolving-schemas` — `zero old-shape reads`.
- GREEN: both named tests pass 1/1; `node scripts/validate-skills.mjs` → 40 skills, 0 failures;
  `node scripts/spec-check.mjs verify --require-active` → exit 0
  (`plan 9d5f39b1c1c0`, `spec 0229c3173028`).
- `git diff` for this task touches only the two named skill files.

## Task 6 — ui-review fail-closed, web-game S-tier evidence

- Edited: `.opencode/skills/ui-review/SKILL.md`,
  `.opencode/skills/web-game-development/SKILL.md`. No test, `eval/*`, command, router, agent, or
  plugin edit; `git diff` shows only those two skills.
- Line counts (`wc -l`, newline semantics as the graders use): `ui-review` 19 → 19 (cap 25,
  step 1 replaced in place), `web-game-development` 141 → 149 (cap 155).
- Content:
  - `ui-review`: step 1 keeps the pinned
    `raw.githubusercontent.com/vercel-labs/web-interface-guidelines` URL and ends
    `If the fetch fails, stop: report the failure and review nothing. Never review from memory
    or a cached copy; the review fails closed.`
  - `web-game-development`: new `## S-tier evidence table` with header exactly
    `| engine | performance | accessibility | replay | shipping |` and one evidence cell per
    column (`pinned version + why`, `p95 frame time log at 60 fps`, `input/a11y checklist pass`,
    `seed + input log → state hash`, `portal build + load budget`), inserted before
    `## Non-negotiables`. `S-tier is a gate`, `stable 60 fps`, and
    `Refuse to call a build S-tier` are unchanged.
- RED before content (first missing hard string per contract):
  - `specific: ui-review` — `If the fetch fails, stop`.
  - `specific: web-game-development` — `S-tier evidence table`.
- GREEN: both named tests pass 1/1; `node scripts/validate-skills.mjs` → 40 skills, 0 failures;
  `node scripts/spec-check.mjs verify --require-active` → exit 0
  (`plan 9d5f39b1c1c0`, `spec 0229c3173028`).

## Task 7 — /release command and release-notes route

- Edited: `.opencode/commands/release.md` (new), `.opencode/skills/writing-release-notes/SKILL.md`.
  No test, `eval/*`, other command, router, agent, or plugin edit; `git diff` touches only the
  skill (2 insertions) and the new command is untracked.
- Line counts (`wc -l`, newline semantics as the graders use): `release.md` 0 → 14 (new),
  `writing-release-notes` 14 → 16 (generic cap 160).
- Content:
  - `/release`: frontmatter `description` + `agent: build`; body invokes `writing-release-notes`,
    reads the diff/merged PRs `read-only` without touching the tree, drafts
    `Breaking`/`Added`/`Fixed`/`Deprecated` plus a justified version bump, and prints
    `Do not tag, publish, push, or edit source.` Publishing requires `explicit human approval`;
    consent is never inferred from a draft request.
  - `writing-release-notes`: adds the `Route:` line naming `/release` (read-only draft, stop)
    and requiring `explicit human approval` before publishing; `Breaking` kept.
- RED before content (first missing hard string per contract):
  - `release: command` — `.opencode/commands/release.md` does not exist.
  - `specific: writing-release-notes` — missing hard rule `/release`.
- GREEN: the two named tests pass 1/1 each; `node scripts/validate-skills.mjs` → 40 skills,
  0 failures; `node scripts/spec-check.mjs verify --require-active` → exit 0
  (`plan 9d5f39b1c1c0`, `spec 0229c3173028`).
- Deviation: none. `git status` shows many pre-existing edits from earlier waves; task 7
  touched only the two allowed files.

## Task 8 — coverage and probe data

- Edited: `eval/coverage.mjs`, `eval/probes.mjs`. No test, skill, command, router, agent,
  harness, or plugin edit; the task-8 delta is confined to the two allowed files.
- RED before data (7 failures; fewer than Task 1 because Tasks 2–7 content is already
  green):
  - `mappings: no skill carries pending` in both suites — `autonomy-dial`,
    `intent-preview`, `threat-model`, `ui-review`, `web-game-development`.
  - `commands: exactly 9 .md stems, all mapped` — 8 mapped.
  - `coverage: release and writing-release-notes map to command-release` —
    `COMMANDS.release` undefined.
  - `probe set: exactly 35 probes` — 34.
  - `command, agent, and router groups are exactly the eight new advisory probes` —
    command group missing `command-release`.
  - `command-release is a read-only draft probe` — missing probe.
- `eval/coverage.mjs`: deleted `PENDING_RULES` and its header schema line; removed every
  `pending` key (and the stale `pending?: 'Wave 4'` schema fragment — no `pending` literal
  remains). All 40 skills map to exactly one probe/group/exempt; `autonomy-dial` is exempt
  with `manual ledger and named check; no calibrated probe`; `intent-preview`,
  `threat-model`, `ui-review`, `web-game-development` are plain probe mappings.
  `writing-release-notes` → `{ probe: 'command-release' }`; `COMMANDS.release` →
  `{ probe: 'command-release' }` (9 commands); `CALIBRATION` unchanged (5 keys).
- `eval/probes.mjs`: added `command-release` in group `command`, `advisory: true`,
  fixtures `src/index.js`, artifact `docs/release.md`, baseline `src/index.js`;
  expectations `skill: writing-release-notes`, `artifact-contains` `version:`,
  `## Breaking`, `## Added`, and `file-unchanged` on `src/index.js`. Existing assertion
  kinds only; 34 → 35 probes, command 3 → 4.
- GREEN: three suites → 55 tests, 55 pass, 0 fail, exit 0. `node eval/run.mjs` (dry) →
  35 probes `(activation=2, safety=2, routing=12, brain=3, trust=4, execution=4,
  command=4, agent=1, router=3)`, no spend. `node scripts/spec-check.mjs verify
  --require-active` → exit 0 (`plan 9d5f39b1c1c0`, `spec 0229c3173028`).
- Deviation: none to report against the plan. Note: the working tree carries pre-existing
  uncommitted Wave 1–3 edits and `eval/coverage.mjs` is untracked, so `git diff` cannot
  isolate this task; verification used the three graders plus the dry listing.

## Task 9 — live recalibration checkpoint

- Spend approval (recorded before any `--run`):
  `calibration approved: opencode-go/deepseek-v4.1-flash · 9 runs · $0.15 cap · 2026-10-30`
- Edited: `eval/probes.mjs` (three prompt strings and three `advisory` flags) and
  `eval/coverage.mjs` (`CALIBRATION` for the three ids). `expect` arrays unchanged; no test,
  skill, command, agent, harness, or plugin edit.
- Prompt-only changes:
  - `review-disposition`: requires the literal lowercase words `severity` and `disposition`
    and at least one `path:line` such as `src/review.js:2`.
  - `merge-gate`: requires the four literal phrases `human approval`, `final SHA`,
    `spec-check verify`, `spec-check close`.
  - `worktree-baseline`: the note must start with `baseline SHA: <sha>` and contain the
    literal phrases `test command` and `per-worktree`.
- Nine live runs, explicit model `opencode-go/deepseek-v4.1-flash`, harness
  `opencode v2.2.4`, node `v24.19.0`, `--run --max-probes 1 --filter <id>`:

| probe | run | result file | result | cost |
|---|---|---|---|---|
| `review-disposition` | 1 | `eval/results/calibration/wave4/review-disposition/1/2026-10-30-review-disposition-eval.json` | PASS | $0 |
| `review-disposition` | 2 | `eval/results/calibration/wave4/review-disposition/2/2026-10-30-review-disposition-eval.json` | PASS | $0 |
| `review-disposition` | 3 | `eval/results/calibration/wave4/review-disposition/3/2026-10-30-review-disposition-eval.json` | PASS | $0 |
| `merge-gate` | 1 | `eval/results/calibration/wave4/merge-gate/1/2026-10-30-merge-gate-eval.json` | PASS | $0 |
| `merge-gate` | 2 | `eval/results/calibration/wave4/merge-gate/2/2026-10-30-merge-gate-eval.json` | PASS | $0 |
| `merge-gate` | 3 | `eval/results/calibration/wave4/merge-gate/3/2026-10-30-merge-gate-eval.json` | PASS | $0 |
| `worktree-baseline` | 1 | `eval/results/calibration/wave4/worktree-baseline/1/2026-10-30-worktree-baseline-eval.json` | PASS | $0 |
| `worktree-baseline` | 2 | `eval/results/calibration/wave4/worktree-baseline/2/2026-10-30-worktree-baseline-eval.json` | PASS | $0 |
| `worktree-baseline` | 3 | `eval/results/calibration/wave4/worktree-baseline/3/2026-10-30-worktree-baseline-eval.json` | PASS | $0 |

- Total recorded cost: **$0.00** (`totals.cost` is 0 for all nine runs; under the $0.15 cap).
- Classification: **3/3 each → `stable`** for `review-disposition`, `merge-gate`, and
  `worktree-baseline`; `advisory: true` removed from all three and `CALIBRATION` set to
  `stable`. No run failed; no partial/early stop. Because all three are stable, the debt
  rows D-023–D-025 are consolidated by task 10 rather than re-opened here.
- Verify (exact string in the task-9 evidence row below) → exit 0; 9 result files with
  `model` and `harness.opencode`; `test-probes` 20/20; dry
  listing 35 probes `(activation=2, safety=2, routing=12, brain=3, trust=4, execution=4,
  command=4, agent=1, router=3)`.
- `node scripts/spec-check.mjs verify --require-active` → exit 0
  (`plan 9d5f39b1c1c0`, `spec 0229c3173028`).
- `node --test tests/opencode/test-eval-coverage.mjs` → 7/7 pass (calibration map stays
  valid). Deviation: none.

## Approvals and baseline → target

- Spec: APPROVED by appusai at 2026-10-30T21:40:56Z; AC16 amendment approved 2026-10-30.
- Plan: APPROVED by appusai at 2026-10-30T21:57:55Z; gate active from
  2026-10-30T21:59:10Z (`plan 9d5f39b1c1c0`, `spec 0229c3173028`).
- Task 9 spend approval (recorded before any `--run`):
  `calibration approved: opencode-go/deepseek-v4.1-flash · 9 runs · $0.15 cap · 2026-10-30`.
- Counts: **40 skills / 8 → 9 commands / 34 → 35 probes**; command group 3 → 4;
  pending rules 10 → 0; contracts 11 high-risk + 6 evidence + 2 route + release command;
  bootstrap 5068 B ≤ 5116. No new dependency, agent, skill, or runtime claim.

## Final gate (task 10)

- `npm run verify` → exit 0: `checked 40 skills, 0 failures`; `node --test` →
  **357 tests, 357 pass, 0 fail**, 0 cancelled/skipped.
- `node eval/run.mjs` (dry, no `--run`) → exit 0:
  `probes: 35 (activation=2, safety=2, routing=12, brain=3, trust=4, execution=4, command=4, agent=1, router=3)`;
  `command-release [command] (advisory)` present; `no model calls`.
- Evidence JSON `docs/plans/2026-10-30-domain-meta-hardening-evidence.json`:
  `plan_sha256` = active gate hash, 10 rows (tasks 1–10), exact `parsePlanTasks`
  `verify`, `exit: 0`, UTC `at` from this ledger.
- No RED task was re-run; the Task 1 RED split and each task's first-missing-string
  inspection above are the recorded RED evidence.

## P1 → AC map (AC16)

| AC | Audit P1 citation | Substitution |
|---|---|---|
| AC1 | Safety/meta: `threat-model` is orphaned (no inbound route) and uses an ordinal likelihood column | — |
| AC2 | Safety/meta: `autonomy-dial` claims `<5% reversion` with no instrumentation and `uxStatus` has no caller | — |
| AC3 | Safety/meta: `intent-preview` allows self-approval and claims `>85%` accept | — |
| AC4 | Safety/meta: `adr` contradicts itself on editing accepted ADRs | — |
| AC5 | Safety/meta: STE claims “~80%” against its own research | — |
| AC6 | Safety/meta: `incident-postmortem` is orphaned | — |
| AC7 | — | Audit Wave 4 program row (`Domain/meta (P2)`: threat-model, autonomy-dial, schemas, ADR, STE, release notes, router orphans, domain evidence) |
| AC8 | — | Audit Wave 4 program row (same row) |
| AC9 | Safety/meta: `diagnosing-sdlc` is orphaned | — |
| AC10 | Safety/meta group for `reviewing-security` (AC16 substitution); Research/domain: `ui-review` fails open on fetch failure | Security half cites the audit P1 Safety/meta group |
| AC11 | Research/domain: `web-game-development`'s S-tier is instruction-only and its unvendored claims are uncited | — |
| AC12 | Research/domain: `writing-release-notes` has no command/probe | — |
| AC13 | Safety/meta group: the five pending skills (threat-model, autonomy-dial, intent-preview, web-game-development, ui-review) | — |
| AC14 | — | Wave 3 debt D-023–D-025 (unstable execution-probe calibration) |
| AC15 | Research/domain: `/sdlc-lean` reports 60 skills instead of 40 (suite count/gate) | — |
| AC16 | P1 groups above (Safety/meta + Research/domain); structural checks, not runtime enforcement | — |

Substitutions match the approved AC16 amendment only; no other AC is substituted.

closed spec gate: evidence docs/plans/2026-10-30-domain-meta-hardening-evidence.json sha256 681f5ab35e19c3ecb24e60a6c6cdf928c15f5ab310df3fb83a98eebc2649c229
