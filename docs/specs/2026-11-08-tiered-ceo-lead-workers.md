# Tiered CEO → Lead → Workers (SDLC flow)

- **Date:** 2026-11-08
- **Status:** draft
- **Approved by:** <!-- empty; do not self-approve -->
- **Approved at:** <!-- empty -->
- **Plan:** `docs/plans/tiered-lead-flow-progress.md`

## Goal

Introduce a tiered delegation flow: **CEO → Lead → Workers**. The CEO (orchestrator, primary) sets goals and boundaries; the **Lead** subagent performs mental lifting (expands CEO briefs into worker-ready briefs, fans out free workers, merges diffs, runs first-pass review, synthesizes evidence); **Workers** (implementer, test-writer — free pool) execute narrow, TDD-driven tasks within allowed scope. Complex work defaults via Lead; trivial docs-only work (small, no secrets) may go direct to free workers as defined by the orchestrator.

## Scope

In-scope artifacts (as delivered/expected for this flow):

- `.opencode/agents/lead.md` — Lead subagent definition
- `.opencode/agents/orchestrator.md` — tiered dispatch (allow `lead`, narrow worker allows retained)
- `docs/plans/tiered-lead-flow-progress.md` — progress/evidence log
- `docs/specs/2026-11-08-tiered-ceo-lead-workers.md` — this spec (draft)

Out of scope: approval actions (`spec-check approve`, setting `approved_by`/`approved_at`), model pinning inside repo files (model selection remains a dispatch/runtime concern), scope widening without an authorized step.

## Acceptance Criteria

- **AC-1 (Lead definition):** A `lead` subagent exists (`mode: subagent`) that performs mental lifting: expands CEO brief into worker-ready briefs (goal + spec/plan refs + allowed files only + explicit out-of-scope + expected diff shape + exact check commands + evidence + TDD; 3–5 steps; file:line anchors; hashes where applicable), fans out free workers, merges diffs, performs first-pass review, and synthesizes evidence.
- **AC-2 (Delegation narrow):** Lead may dispatch **only** to `implementer` and `test-writer` (narrow allowlist; all other subagents denied). Orchestrator tiered dispatch keeps `* : deny` and existing worker allows; adding `lead` must not spread scope.
- **AC-3 (Gates green):** Required verification gates pass for the delivered state (agent permission tests; full `npm run verify` green as recorded in progress/evidence).
- **AC-4 (No model pin in file):** No `model:` line is hardcoded in the `lead`/orchestrator agent files in-repo; model choice (e.g., Lead vs free pool IDs) is supplied at dispatch/runtime, not pinned in repo config.
- **AC-5 (Cap, ask-to-extend):** Work respects a defined cap/budget; when the cap is reached or scope must grow, **ask to extend** (or escalate) — do not silently exceed the cap or widen scope.
- **AC-6 (Secrets never free):** Secrets, credentials, and sensitive material are **never** sent to free workers. Lead/redacts and handles sensitive context; workers receive only non-sensitive, scope-limited briefs.

## Notes

- This document is a **draft** (docs-only port/spec capture). It is **not approved**: leave `approved_by` and `approved_at` empty; do not run `spec-check approve`.
- Non-sensitive only. Evidence/progress: `docs/plans/tiered-lead-flow-progress.md` and `docs/plans/tiered-lead-flow-evidence.json` (as present).
- Implementation notes in the progress log reflect work done under the tiered flow; this spec records the intended contract and ACs for that flow.