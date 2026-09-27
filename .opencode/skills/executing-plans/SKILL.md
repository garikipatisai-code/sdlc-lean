---
name: executing-plans
description: Use when executing an approved implementation plan yourself in the current session, task by task with TDD and verification checkpoints
---

# Executing Plans

Inline executor for an approved plan from `writing-plans`. Alternative:
`subagent-driven-development` for parallel subagent execution.

## Loop (per task)

1. Announce the task. Load relevant skills first (TDD always).
2. Implement via `test-driven-development`: RED → GREEN → verify → REFACTOR.
3. Run the task's verification step. Record outcome in a progress ledger
   (e.g. `docs/plans/<slug>-progress.md`): task, status, evidence (command + result).
4. If a bug appears, switch to `systematic-debugging` — no speculative fixes.
5. Max 3 fix rounds per task; on the third failure, stop and report to the human with evidence.

## Finish

Run the full suite once at the end, then `verification-before-completion`
before claiming done. Single final review via `requesting-code-review`.
Never skip the ledger — it is what survives compaction.
