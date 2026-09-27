---
name: subagent-driven-development
description: Use when executing an approved implementation plan with independent tasks via fresh parallel subagents, each with its own reviewer
---

# Subagent-Driven Development

Parallel executor: one fresh subagent per independent task, reviewer per task,
bounded fix loop. Use when subagents are available and tasks are independent;
otherwise `executing-plans`.

## Dispatch

- Group tasks by failure domain (shared files = same stream). See
  `dispatching-parallel-agents` for the fan-out/fan-in contract.
- Each implementer gets: task brief (exact files, signatures, tests,
  `Expected:`), repo conventions, lean constraints. Nothing else — fresh
  context per agent avoids cross-task contamination.
- Give each stream its own worktree (`using-git-worktrees`).

## Review loop (per task, max 3 rounds)

1. Implementer finishes → dispatch a reviewer with the task brief + diff.
2. Reviewer verdict: ACCEPT or list concrete defects.
3. Defects → implementer fixes (same brief + defect list). After round 3
   still failing: stop, escalate to the human with all evidence.

## Finish

Track in the progress ledger (`docs/plans/<slug>-progress.md`). After all
tasks: one whole-branch review (`requesting-code-review`), full suite, then
`verification-before-completion`. No check-ins mid-task — rulings, not stalls.
