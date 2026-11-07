---
name: using-git-worktrees
description: Use when starting feature work that needs isolation, before executing implementation plans with parallel agents or risky changes
---

# Using Git Worktrees

Hook: `git worktree add` passes by design (`checkMergeGuard` never blocks worktree commands); baseline recording stays artifact-level (agent-written) — deferred residual.
Isolate work so parallel agents and experiments never collide.

## Setup

Prefer the project's convention if one exists; otherwise:
1. `git worktree add .worktrees/<slug> -b <slug>` (keep worktrees under `.worktrees/`, gitignored).
2. Record the **baseline SHA** (`git rev-parse HEAD`) and the **test command** in the progress ledger.
3. Run project setup inside the worktree (install deps per README).
4. Verify a clean baseline: run the test command once before changing anything.
5. Check `dependency`/`port` collisions against other active worktrees (same lockfile, same dev port).

## Baseline record (per-worktree, agent-written)

Per task stream, append to that stream's progress ledger: baseline SHA + test command + per-worktree marker (`.sdlc/spec-gate.json` approved in that worktree). No hook records this — the agent writes it.

## Rules

- One worktree per independent task stream. `dispatching-parallel-agents` assigns one each.
- Never commit in two worktrees on the same branch.
- The `.sdlc/spec-gate.json` marker is `per-worktree`: the plan must be approved in that worktree, not only on main.
- On finish, follow `finishing-a-development-branch`; clean up (remove the worktree) only after `merge/PR`.
- If the repo forbids worktrees (odd CI, absolute paths), fall back to a feature branch and say so in one line.
