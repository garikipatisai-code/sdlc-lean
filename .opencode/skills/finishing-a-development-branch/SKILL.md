---
name: finishing-a-development-branch
description: Use when implementation is complete and all tests pass, to decide how to integrate the work - merge, PR, or keep the branch
---

# Finishing a Development Branch

1. Re-run the full verification (`verification-before-completion`) — green suite required.
2. Present the menu: **merge** to main, **open a PR** (with generated summary + test evidence), or **keep** the branch (state why).
3. On merge/PR: squash or stage a clean diff, confirm CI scope, then clean up — remove worktrees (`git worktree remove`), delete the branch if merged, drop scratch files.
4. Update persistent state: close plan tasks, record deferred items as `scope: <ceiling>, <upgrade path>` comments or the issue tracker — never silent TODOs.
