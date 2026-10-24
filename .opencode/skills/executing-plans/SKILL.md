---
name: executing-plans
description: Use when executing an approved implementation plan yourself in the current session, task by task with TDD and verification checkpoints
---

# Executing Plans

Inline executor for an approved plan from `writing-plans`. Alternative:
`subagent-driven-development` for parallel subagent execution.

## Before the first task

Confirm the gate is active and clean:

```sh
node scripts/spec-check.mjs verify --require-active   # installed copy if no repo-local script
```

The approved plan's `files` list is the edit boundary, not a suggestion. If the
plan is not approved, stop and get approval — do not activate the gate yourself.

## Loop (per task)

1. Announce the task. Load relevant skills first (TDD always).
2. Implement via `test-driven-development`: RED → GREEN → verify → REFACTOR.
3. Run the task's verification step. Record outcome in the progress ledger
   (e.g. `docs/plans/<slug>-progress.md`): task, status, evidence (command + result).
   The ledger, `docs/debt-ledger.md`, and the plan's `allow` entries stay writable.
4. If a bug appears, switch to `systematic-debugging` — no speculative fixes.
5. Max 3 fix rounds per task; on the third failure, stop and report to the human with evidence.
6. A blocked edit means the work is out of scope. Stop, record a deviation in
   the ledger, and ask for `close` + re-approval. Never route around the gate
   with bash, shell redirection, or a generated script.

Do not edit the approved plan or spec while the gate is active. They are
immutable by contract; changing them requires `close` + a new approval.

## Finish

Run the full suite once at the end, then `verification-before-completion`
before claiming done. Single final review via `requesting-code-review`.
`spec-check verify` must still pass, then `spec-check close` once the evidence
is recorded. Never skip the ledger — it is what survives compaction.
