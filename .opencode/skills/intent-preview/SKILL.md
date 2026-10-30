---
name: intent-preview
description: Use when starting agentic work that needs approval - read-only research, preview plan, wait for accept before implementation
---

# Intent Preview

Reimplemented from SOTA plan-approval pattern (Claude plan mode, Cursor Projects coordinator). No upstream code copied.

## Procedure

1. Research read-only: map touched code, no edits.
2. Present the preview: goal + plan steps + files + risk + runnable check. Skip preview only if the diff is describable in one sentence.
3. Wait for accept or an edited plan. Never self-approve: the human decides, and silence or elapsed time is not consent.
4. On accept: execute via `executing-plans` with TDD; on edit: revise the preview, re-present once.

## Approval

- Approval on V2 is `/approve <plan>` in the TUI: the human runs `/approve docs/plans/<slug>.md`.
  The `spec-check approve` (`node scripts/spec-check.mjs approve <plan>`) `TTY` fallback remains.
- Non-interactive approval (a pipe, a redirect, or an agent-owned terminal) is denied. Stop and report; never substitute your own approval.
