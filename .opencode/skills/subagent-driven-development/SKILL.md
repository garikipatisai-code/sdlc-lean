---
name: subagent-driven-development
description: Use when executing an approved implementation plan with independent tasks via fresh parallel subagents, each with its own reviewer
---

# Subagent-Driven Development

Parallel executor: one fresh subagent per independent task, per-task reviewer
with an independent signal, bounded fix loop. Use when subagents are available
and tasks are independent; otherwise `executing-plans`.

## Dispatch

- Group tasks by failure domain (shared files = same stream). See
  `dispatching-parallel-agents` for the fan-out/fan-in contract.
- Each implementer gets: task brief (exact files, signatures, tests,
  `Expected:`), repo conventions, lean constraints, plus the **spec path, plan
  path, and the plan's allowed file list**. Nothing else — fresh context limits
  cross-task state, but it is not a quality guarantee.
- The brief states: edit only the listed files; a blocked edit is a deviation,
  not something to work around (no bash redirection, no generated scripts).
  Scope changes come back to you for `close` + re-approval.
- Give each stream its own worktree (`using-git-worktrees`). Record the baseline
  SHA and the test command before dispatch. The spec gate marker is per-worktree
  local state; approve the plan in the worktree before dispatch, or implementers
  will see the gate as inactive.

## Review loop (per task, max 3 rounds)

No extra per-task critic without an independent signal: a test, a measurement,
or a traced path. A second reading of the same text is not evidence.

1. Implementer finishes → the orchestrator (not the reviewer) re-runs the task's
   `Verify` exactly as written and writes the evidence row with the raw command,
   exit code, and UTC timestamp. A non-zero exit → no ACCEPT.
2. Dispatch the reviewer with the task brief, the spec requirements it covers, the
   diff, and the raw command output — never a self-report alone. The reviewer may run
   read-only tests only; no output is a defect.
3. Reviewer verdict: ACCEPT or list concrete defects. A diff touching files
   outside the plan's `files` is a defect even if the code is correct.
4. Defects → implementer fixes (same brief + defect list). After round 3
   still failing: stop, escalate to the human with all evidence.

Never weaken, skip, delete, or rewrite a test/assertion, snapshot, fixture, or lint rule to pass; a changed assertion is a behavior change requiring approval.

## Finish

Track in the progress ledger (`docs/plans/<slug>-progress.md`). After all tasks: one
whole-branch review (`requesting-code-review`) with the raw `Verify` output, full suite,
then `verification-before-completion`. `spec-check verify` must pass before the final
claim; evidence-before-close: every evidence row is written and green before
`spec-check close`. No check-ins mid-task — rulings, not stalls.
