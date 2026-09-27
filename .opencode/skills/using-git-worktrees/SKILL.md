---
name: using-git-worktrees
description: Use when starting feature work that needs isolation, before executing implementation plans with parallel agents or risky changes
---

# Using Git Worktrees

Isolate work so parallel agents and experiments never collide.

## Setup

Prefer the project's convention if one exists; otherwise:

1. `git worktree add .worktrees/<slug> -b <slug>` (keep worktrees under `.worktrees/`, gitignored).
2. Run project setup inside the worktree (install deps per README).
3. Verify a clean baseline: run the test suite once before changing anything.

## Rules

- One worktree per independent task stream. `dispatching-parallel-agents` assigns one each.
- Never commit in two worktrees on the same branch.
- On finish, follow `finishing-a-development-branch`, then `git worktree remove .worktrees/<slug>`.
- If the repo forbids worktrees (odd CI, absolute paths), fall back to a feature branch and say so in one line.
