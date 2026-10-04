---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing, before committing, merging, or creating PRs. Fresh evidence required
---

# Verification Before Completion

**NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.** Stale results
(from before your last edit) do not count.

## Checklist (run now, cite results)

1. Focused tests for the change: command + pass result.
2. Full suite (or the repo's agreed scope): command + pass result.
3. Linters/type checks the repo uses: clean.
4. Spec/plan mapping: every requirement traces to a task with evidence.
5. Diff self-review: `git diff` read end to end — no strays, no secrets, no debug leftovers.

If any item fails, fix and re-run from step 1. Report evidence inline
(command + outcome), never "should be passing" or "tests pass" without the run.

## Verify recipe (write once, reuse every loop)

If `docs/verify-recipe.md` exists, run its commands and cite results. If it
does not, write it now from steps 1–3: the exact commands that must pass
before any completion claim. Autonomous loops reuse it — never re-derive
verification commands each round.
