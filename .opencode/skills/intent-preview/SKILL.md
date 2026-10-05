---
name: intent-preview
description: Use when starting agentic work that needs approval - preview plan, accept or edit before implementation, read-only research first
---

# Intent Preview

Reimplemented from SOTA plan-approval pattern (Claude plan mode, Cursor Projects coordinator). No upstream code copied.

## Procedure

1. Research read-only: map touched code, no edits.
2. Present preview: goal + plan steps + files + risk + runnable check. Skip preview only if diff describable in one sentence.
3. Wait for accept or edited plan. Track accept rate (target >85%).
4. On accept: execute via `executing-plans` with TDD; on edit: revise preview, re-present once.
