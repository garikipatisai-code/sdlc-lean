---
name: finishing-a-development-branch
description: Use when implementation is complete and all tests pass, to decide how to integrate the work - merge, PR, or keep the branch
---

# Finishing a Development Branch

Hook: agent `git merge` is refused at runtime (`checkMergeGuard` in `.opencode/plugins/sdlc-lean.js`); safe abort (`git merge --abort`/`--quit`) still passes — merging stays ALWAYS-human.

1. Full verification green **on the final SHA** (`verification-before-completion`); record the SHA.
2. **Explicit human approval** before merge/PR. Present merge, PR (summary + test evidence), or keep; if no reply, wait — no approval, no merge/PR.
3. CI green **on the final SHA**; "confirm CI scope" is not a green build.
4. `spec-check verify` passes **before cleanup**; run `spec-check close` **after evidence** rows are written.
5. Cleanup only after merge/PR: remove worktrees (`git worktree remove`), delete the merged branch, drop scratch files.
