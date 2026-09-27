---
name: dispatching-parallel-agents
description: Use when facing 2 or more independent tasks that can proceed without shared state or sequential dependencies
---

# Dispatching Parallel Agents

One agent per independent failure domain. Independence test: tasks share no
files AND neither task's design depends on the other's outcome. Shared files
or ordering → same stream, sequential.

- Dispatch in parallel with tight briefs (task, files, tests, `Expected:`).
- Give each stream its own worktree (`using-git-worktrees`).
- Workers stay dumb: no re-planning, no scope growth, escalate on surprise.
- Collect: each worker reports evidence; parent runs the final whole-branch review.
