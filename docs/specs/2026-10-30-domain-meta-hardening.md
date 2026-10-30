# Spec — Domain/meta hardening (Wave 4)

**Status**: APPROVED
**Approved by**: appusai (chat: "Approve")
**Approved at**: 2026-10-30T21:40:56Z
**AC16 amendment**: approved 2026-10-30 (chat); AC7/AC8 cite the audit Wave 4 row, AC10-security cites the audit P1 Safety/meta group, AC14 cites D-023–D-025.
**Date**: 2026-10-30
**Program**: `docs/research/2026-10-30-suite-portfolio-audit.md` (Waves 1–4)
**Depends on**: Wave 1 trust core (`00f0ec68…`), Wave 2 execution (`c49a75aa…`), Wave 3 measurement (`65402b18…`)
**Citations**: unprefixed [n] refer to `docs/research/2026-10-30-brain-layer-evidence.md`; [A n] to the audit report.

## Goal

Close the remaining P1 findings and the five `pending: Wave 4` contracts: route
`threat-model` and `diagnosing-sdlc`, remove unmeasured autonomy/preview/STE
claims, make ADR, incident, dependency, schema, security, UI, and game skills
evidence-bound, add a read-only `/release` command and probe, and recalibrate the
three unstable execution probes. No new agents, dependencies, or sandbox claim.

## Non-goals

- No new runtime enforcement or OS sandbox.
- No full rewrite of the 40 skills; targeted rule changes only.
- No new agent; `/release` is a command over the existing skills/agents.
- No live spend in `npm run verify`; the 3-probe recalibration is separately
  approved and capped.
- No change to the Wave 1 trust core or the Wave 3 coverage/assertion engines
  beyond the counts and pending removals named below.

## Decision record

| Decision | Verdict | Evidence |
|---|---|---|
| Wire `autonomy-dial` to runtime `uxStatus` | **No** — manual ledger + named check; remove unmeasured claims | `uxStatus` has no caller; a runtime claim needs a caller and tests |
| Route `threat-model` via the router | **No** — one line in `brainstorming`/`reviewing-security` | Bootstrap budget ≤5116; description routing is weaker than an inbound handoff |
| Add `/release` | **Yes** — read-only command + probe | `writing-release-notes` has no route/probe; 9th command |
| Harden the 3 unstable probes blindly | **No** — fix the prompt to require the exact artifact phrases, then 3 runs | Wave 3 failures were missing phrases, not missing capability |

## Acceptance criteria

1. `threat-model` has an inbound handoff from `brainstorming` (one line, body
   ≤60 lines) and `reviewing-security`; its artifact requires entry points,
   trust boundaries, assets, attacker paths, a **binary** risk table (high/low,
   no ordinal 1–10 likelihood), and a residual-risk owner. Cap ≤40.
2. `autonomy-dial` removes `<5%` and self-confidence claims; requires a named
   check command per Auto run and one `docs/audit-ledger.md` row (date, tier,
   check, result, reversal); no unmeasured success rate. Cap ≤30. No runtime
   change; `uxStatus` wiring is a debt row.
3. `intent-preview` bans self-approval, requires the human to run
   `spec-check approve` in a TTY, and removes the `>85%` claim. Cap ≤25.
4. `adr` allows only the Status line to change after acceptance and links a
   superseding ADR; no contradiction between “never edit” and `superseded by`.
   Cap ≤30.
5. `simplified-technical-english` removes the “~80%” and compliance claims,
   applies rules 1–20, and cites the in-repo ASD-STE100 research. Cap ≤80.
6. `incident-postmortem` requires action items with owner, date, and a
   recurrence-prevention verification; items live in the postmortem or debt
   ledger. Cap ≤35.
7. `dependency-upgrade` requires the project’s audit command, the advisory ID,
   a one-package lockfile diff assertion, a runtime smoke, and a rollback path.
   Cap ≤35.
8. `evolving-schemas` gates the contract phase on a named zero-old-shape-read
   metric, requires an idempotent backfill, and names a rollback. Cap ≤35.
9. `diagnosing-sdlc` requires two identical diagnoses → stop and escalate, and
   has an inbound handoff from `systematic-debugging` (two-strike) or the
   router within the bootstrap budget. Cap ≤25.
10. `reviewing-security` requires a fixed finding template: attacker input →
    sink → `path:line` → severity; no finding without a traced path. Cap ≤35.
    `ui-review` fails closed when the guideline fetch fails and never reviews
    from memory. Cap ≤25.
11. `web-game-development` requires an S-tier evidence table (engine, perf,
    accessibility, replay, shipping) before any S-tier claim. Cap ≤155.
12. `/release` exists: read-only diff → version/changelog draft; no publish
    without explicit human approval; `command-release` probe; `eval/coverage.mjs`
    maps `release` and `writing-release-notes`; command count 9.
13. All five `pending: Wave 4` rules in `eval/coverage.mjs` become hard
    contracts: `threat-model` (3), `autonomy-dial` (3), `intent-preview` (2),
    `web-game-development` (1), `ui-review` (1). No `pending: Wave 4` remains.
14. The three unstable probes (`review-disposition`, `merge-gate`,
    `worktree-baseline`) get prompts that require the exact artifact phrases;
    3 live runs each; 3/3 → hard, else advisory + debt. Separately approved;
    cap recorded.
15. `npm run verify` is green; no new dependency/agent; bootstrap ≤5116;
    Wave 1–3 tests stay green except the deliberate updates: command count 8→9
    and `command` group 3→4, pending→hard contracts, and calibration statuses.
16. Evidence mapping: each AC cites its audit P1; every live calibration records
    model/version/date; no structural check is described as runtime enforcement. Where the audit has no matching P1 sentence, cite the nearest audit program row or Wave 3 debt record and name it.

## Design

```mermaid
flowchart LR
  P[P1 findings + 5 pending rules] --> S[11 skill edits]
  S --> R[/release command + probe]
  R --> C[coverage 9 commands · pending removed]
  C --> K[3 unstable probe prompts fixed]
  K --> L[3 live runs each]
  L -->|3/3| H[Hard]
  L -->|else| A[Advisory + debt]
  H --> V[npm run verify + evidence/close]
  A --> V
```

### Step 1 — Contracts and routes

- `threat-model`: inbound handoff + binary risk artifact.
- `diagnosing-sdlc`: two-strike stop + inbound handoff.
- `autonomy-dial`: manual check + ledger; remove claims.
- `intent-preview`: TTY approval; remove claims.
- `adr`: Status-only edit; superseded link.
- `STE`: remove percentage/compliance.

### Step 2 — Evidence-bound domain skills

- `incident-postmortem`: owner/date/recurrence check.
- `dependency-upgrade`: audit/advisory/lockfile/smoke/rollback.
- `evolving-schemas`: zero-read metric/backfill/rollback.
- `reviewing-security`: fixed finding template.
- `ui-review`: fail-closed fetch.
- `web-game`: S-tier evidence table.

### Step 3 — Release command and coverage

- `.opencode/commands/release.md`: read-only, draft version/changelog, human
  approval before publish.
- `eval/probes.mjs`: `command-release`; `command` group 4.
- `eval/coverage.mjs`: `release` command; `writing-release-notes` mapped to
  `command-release`; remove all pending rules; hard contracts.
- `tests/opencode/test-eval-coverage.mjs`: 9 commands.
- `tests/opencode/test-skill-contracts.mjs`: hard pending rules; release tests.

### Step 4 — Recalibration

- Fix `review-disposition`, `merge-gate`, `worktree-baseline` prompts to require
  the exact phrases the probes check.
- Run 3× each with an explicit model; record model/version/cost; stable → hard,
  else advisory + debt.
- Live spend is separately approved; no `--run` in `npm run verify`.

## Verification

| Check | Command | Pass condition |
|---|---|---|
| Lint + tests | `npm run verify` | 0 failures; only permitted test updates |
| Contracts | `node --test tests/opencode/test-skill-contracts.mjs` | no pending rules; 11 skills + release |
| Coverage | `node --test tests/opencode/test-eval-coverage.mjs` | 40 skills, 9 commands, no pending |
| Probes | `node --test tests/eval/test-probes.mjs` | command group 4; 35 probes |
| Eval dry | `node eval/run.mjs` | lists `command-release`; no spend |
| Calibration | 3× each unstable probe | 3/3 hard, else advisory + debt |
| Bootstrap | plugin test | ≤5116 bytes |

## Risks

- **Cap pressure**: `brainstorming` at 59/60 and `web-game` at 141/155; add
  one-line handoffs and compress prose.
- **Command count churn**: 8→9 is a deliberate schema change; only the coverage
  and probe tests update.
- **Recalibration flakiness**: prompts may still be model-sensitive; 3 runs and
  debt is the honest gate.
- **Scope creep**: no runtime wiring for autonomy; no new agent for release.

## Open questions

1. Should `/release` publish, or only draft? Proposed: draft only; publish is a
   human action.
2. Should `diagnosing-sdlc` route via the router or `systematic-debugging`?
   Proposed: `systematic-debugging` two-strike line; router only if budget allows.
3. Recalibration budget/model for the 3 unstable probes.
