---
spec: docs/design/0002-machine-approve.md
status: approved
approved_by: appusai
approved_at: 2026-11-01T05:25:29.623Z
files:
  - scripts/spec-check.mjs
  - tests/scripts/test-machine-approve.mjs
  - docs/verify-recipe.md
allow:
  - docs/plans/2026-10-31-machine-approve-progress.md
  - docs/plans/2026-10-31-machine-approve-evidence.json
---

# Plan: envelope-authorized machine-approve (`approve --machine`)

## Goal

Add `approve --machine` to `scripts/spec-check.mjs` mirroring `close --machine` rigor, so the agent opens the next gate inside a standing envelope with zero keystrokes while envelope authorization and irreversible-external acts stay human.

```mermaid
flowchart LR
  ENV[standing envelope:\nhuman chat-accept in ledger +\nfile committed] --> REF[agent reference plan:\nreferences envelope]
  REF -- approve --machine --> C1{active gate?\nrefuse double-gate}
  C1 --> C2{plan files/allow ⊆\nenvelope paths?}
  C2 --> C3{envelope clean since\nauth record?}
  C3 --> GATE[write gate +\ndistinct activation row]
  GATE --> LOOP[agent run → close --machine]
  C1 -.->|refuse| ESC[escalate:\nstop + report, no retry]
  C2 -.->|refuse| ESC
  C3 -.->|refuse| ESC
```

## Architecture

- Touched: `scripts/spec-check.mjs` (new `approveMachineGate()` + `approve --machine` CLI branch + `USAGE` text); new `tests/scripts/test-machine-approve.mjs`; pointer line in `docs/verify-recipe.md`.
- Consumed: `readGate`, `buildGate`/`writeGate`, `checkEnvelopeFile`, `checkEnvelopeClean`, `matchPattern`, `AUDIT_LEDGER_REL` row shape; existing suites `test-spec-check.mjs`, `test-auto-tier-machine-close.mjs`, `npm run verify`.
- Produced: `node scripts/spec-check.mjs approve <plan.md> --machine --envelope <file>`; distinct activation audit row; 5 regression tests.
- Untouched: `.opencode/plugins/sdlc-lean.js` (no envelope refs per pilot constraint — gate hooks already refuse out-of-scope), `docs/design/0002-machine-approve.md` + `docs/threat-model.md` (spec, immutable), human `approve` path (byte-identical).

## Tech Stack

- Node.js, zero dependencies (CLI stays dep-free per repo rules).
- Test commands: `node --test <file>`, `npm run lint` (`node scripts/validate-skills.mjs`), `npm run verify` (= lint + `node --test`).

## Spec

- `docs/design/0002-machine-approve.md` (accepted by human in chat 2026-10-31) + threat section `## 2026-10-31 machine-approve` in `docs/threat-model.md`.

## Global Constraints

- Plugin stays V1+V2 compatible and fail-open — untouched by this plan (no plugin edit in scope).
- Safety guards grow only by exact-known destructive patterns; benign must pass.
- While this plan's gate is active: edits only inside frontmatter `files`; plan/spec immutable; `close` + re-approve to change scope — never bypass with bash.
- Bootstrap budget <5KB; human-facing output follows `communicating-concisely`.

## Lean Constraints

- Reuse-first: extend `spec-check.mjs` (`approveMachineGate` mirrors `closeMachineGate`; reuse `checkEnvelopeClean`, `matchPattern`, `buildGate`/`writeGate`); no new service/skill/agent/dependency.
- Lowest rung: one flag-mode (`approve --machine`, required `--envelope`) + one test file + one docs pointer line. No new subcommand, no plugin hook, no ledger rewrite.

## Review Focus

- Activation grants write scope (stronger than close): scrutinize ceiling subset logic (glob plan patterns fail closed), auth-anchor timestamp source (ledger auth line, not gate clock), double-gate check placement (before any mutation), activation-row distinctness (tier/result/5th-col vs run rows).
- Human `approve` path diff must be empty outside the `--machine` branch; every refusal throws before marker/ledger mutation; no grader-path logic weakened.

## Tasks

| # | Task | Spec req | Files | Test | Expected | Verify |
|---|------|----------|-------|------|----------|--------|
| 1 | `approveMachineGate` core: no-double-gate + envelope ceiling + reference check + gate write | MA-1, MA-2, MA-4 | `scripts/spec-check.mjs` | Existing contract suite stays green | Active gate → `double-gate` refuse; out-of-envelope plan → `envelope-ceiling` refuse; plan not referencing envelope → `reference-missing` refuse; all before any marker/ledger mutation | `node --test tests/scripts/test-spec-check.mjs` |
| 2 | Envelope-auth anchoring + activation audit row | MA-3, MA-5, MA-7 | `scripts/spec-check.mjs` | Existing machine-close envelope suite stays green | Dirty/changed-since-auth envelope → refuse; happy path appends exactly one activation row distinguishable from run rows | `node --test tests/scripts/test-auto-tier-machine-close.mjs` |
| 3 | CLI wiring `approve --machine` + USAGE; human path byte-identical | MA-6, MA-8, MA-9 | `scripts/spec-check.mjs` | Human-approve TTY refusal + contract suites stay green | `approve <plan>` without `--machine` behaves exactly as before; `approve <plan> --machine` without `--envelope` refuses `missing-envelope`; `--help` names the flag | `node scripts/spec-check.mjs --help` |
| 4 | New regression tests (5 cases) | MA-1, MA-2, MA-3, MA-5, MA-8 | `tests/scripts/test-machine-approve.mjs` | New suite green in isolation | ceiling violation refused; dirty envelope refused; double-gate refused; happy path activates + writes distinct audit row; human approve unchanged | `node --test tests/scripts/test-machine-approve.mjs` |
| 5 | Docs pointer update | MA-9 | `docs/verify-recipe.md` | Lint passes | Discovery-aid line names `approve --machine` criteria + design link 0002 | `npm run lint` |
| 6 | Full gate regression + evidence binding | MA-10 | — (writes control state `docs/plans/2026-10-31-machine-approve-evidence.json` via `allow`) | Full suite green | `npm run verify` exits 0; evidence JSON holds one exit-0 row per task with the exact `Verify` command and UTC `at` | `npm run verify` |

Verify read-only after writing: `git status --porcelain` shows only the 2 new files. Report + next step (human approve).
