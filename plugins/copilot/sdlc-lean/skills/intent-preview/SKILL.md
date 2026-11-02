---
name: intent-preview
description: Use when starting agentic work that needs approval - read-only research, preview plan, wait for accept before implementation
---

# Intent Preview

Reimplemented from SOTA plan-approval pattern (Claude plan mode, Cursor Projects coordinator). No upstream code copied.

## Procedure

1. Research read-only: map touched code, no edits.
2. Present the preview: goal + envelope draft + plan steps + files + risk + runnable check. Default envelope-first: goal → draft → one chat yes → commit + auth ledger line → machine-approve → loop alone → machine-close; the goal confirmed once in chat authorizes the envelope.
3. Wait for accept of the goal/envelope, or an edited plan. Never self-approve: the human decides, and silence or elapsed time is not consent.
4. On accept: execute via `executing-plans` with TDD; on edit: revise the preview, re-present once. Widening the envelope is its own committed+authorized step, never silent.

## Approval

- Machine-approve opens the gate by default under a valid unchanged envelope; human `/approve <plan>`+hash is fallback-only (no envelope, or envelope refused/changed). On V2 the human runs `/approve docs/plans/<slug>.md` in the TUI.
  The `spec-check approve` (`node scripts/spec-check.mjs approve <plan>`) `TTY` fallback remains.
- Non-interactive approval (a pipe, a redirect, or an agent-owned terminal) is denied. Stop and report; never substitute your own approval.
