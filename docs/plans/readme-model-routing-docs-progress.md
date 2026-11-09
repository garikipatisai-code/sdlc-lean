# Progress — README Model Routing Docs (Task 1)

## Goal

free-usage cost reduction while maintaining quality in README.

## Status

draft

## Baseline

- Spec: `docs/specs/2026-11-08-free-model-resolver.md` (draft, context only)
- Plan: `docs/plans/readme-model-routing-docs-progress.md` (this file)
- Allowed files: this progress file,
  `docs/plans/readme-model-routing-docs-evidence.json`, `README.md` (## Model routing only, allowed for Tasks 2-3, frozen in Task 4)
- Out of scope: plugin/phase/eval/orchestrator/tests, all else.
- Prior hashes: 1fc02a8, 7b8d767; verify 676/676; README baseline SHA
  2e9a3238 lines 233.
- Ledger: model=opencode-go/beam-free account=opencode-go (cost 0/0, super-vl OPEN).

## Decisions

- Paraphrase-only (no verbatim source dumps).
- Generic model language (no hardcoded model pins).
- super-vl pair OPEN cooldown from explorer failover (cooling, not polled).

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Ledger + outline | DONE |
| 2 | README Model routing section | DONE |
| 3 | Verify + evidence closeout | DONE |
| 4 | Final closeout | DONE |

## Outline — Model routing section (README)

- [x] free-first order
- [x] dynamic discovery
- [x] denylist
- [x] cooldown/circuit
- [x] 429 event
- [x] exhaustion (covered in order 3)
- [x] escalation (covered in 429 null)
- [x] cap+ask
- [x] secrets
- [x] critic gate (mandatory BRAIN, code-reviewer + security-reviewer)
- [x] escalation ladder (hardship -> BRAIN same-task -> human approval)
- [x] admission (settled+outstanding+next<=cap, at cap ask)
- [x] secrets boundary (never free, no-train, ZDR)

## Next step

Task 4: final closeout done; critics pending (BRAIN).