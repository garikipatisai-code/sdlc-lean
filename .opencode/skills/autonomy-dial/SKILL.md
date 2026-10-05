---
name: autonomy-dial
description: Use when running agentic loops with adjustable autonomy - Observe to Auto tiers, audit trail, undo path, escalation on low confidence
---

# Autonomy Dial

Reimplemented from SOTA autonomy patterns (Cursor /goal + /loop, Copilot steer, verification-gated autonomy). No upstream code copied.

## Tiers

- Observe: preview every step, confirm tool calls.
- Assist: auto read-only, ask before edits.
- Auto: iterate until runnable check passes, stop on budget.

## Rules

- Gate every Auto run on a runnable check (tests, build, lint, or screenshot). Iterate until pass or honest stop.
- Steer without interrupting: follow-ups queue for next tool call; long-lived `/goal` holds objective until complete.
- Confidence signal: state confidence + rationale; escalate on low confidence or 5–15% edge cases.
- Audit every action to `docs/audit-ledger.md`; undo via session diff; target <5% reversion.
