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
3. Run the task's `Verify` command exactly as written in the plan. Write the evidence
   row in `docs/plans/<slug>-evidence.json` with the raw command, exit code, and UTC
   timestamp; a non-zero exit means do NOT ACCEPT. Record status in the progress ledger;
   the ledger, `docs/debt-ledger.md`, and the plan's `allow` entries stay writable.
4. If a bug appears, switch to `systematic-debugging` — no speculative fixes.
5. Max 3 fix rounds per task; on the third failure, stop and report to the human with evidence.
6. Dispatch `requesting-code-review` with the raw command output. If no reviewer is
   available, stop and escalate — there is no self-review fallback. Record review
   dispositions (`fixed`/`rejected`/`needs-human`) in the progress ledger.
7. A blocked edit means the work is out of scope. Stop, record a deviation in
   the ledger, and ask for `close` + re-approval. Never route around the gate
   with bash, shell redirection, or a generated script.

Do not edit the approved plan or spec while the gate is active. They are
immutable by contract; changing them requires `close` + a new approval.

Never weaken, skip, delete, or rewrite a test/assertion, snapshot, fixture, or lint rule to pass; a changed assertion is a behavior change requiring approval.

## Finish

Run the full suite once at the end, then `verification-before-completion`
before claiming done. Single final review via `requesting-code-review`: dispatch a
reviewer with the raw command output, never a self-report alone.
`spec-check verify` must still pass, then `spec-check close` once the evidence
rows are recorded. Never skip the ledger — it is what survives compaction.
