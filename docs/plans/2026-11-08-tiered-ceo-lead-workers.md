---
spec: docs/specs/2026-11-08-tiered-ceo-lead-workers.md
status: approved
approved_by: user-chat-2026-11-08-blanket-6plans
approved_at: 2026-11-08T17:20:05.000Z
files:
  - .opencode/agents/lead.md
  - .opencode/agents/orchestrator.md
allow:
  - docs/plans/tiered-lead-flow-progress.md
  - docs/plans/tiered-lead-flow-evidence.json
---

# Plan — Tiered CEO → Lead → Workers

**Goal**: Introduce the tiered delegation flow (spec AC-1–AC-6): a `lead`
subagent performs mental lifting (CEO brief → worker-ready briefs, fan-out,
merge, first-pass review, synthesized evidence); the orchestrator dispatches
tiered (default direct with thick briefs, Lead on explicit escalation); gates
stay green, secrets never free, cap + ask-to-extend.

**Spec**: [`docs/specs/2026-11-08-tiered-ceo-lead-workers.md`](../specs/2026-11-08-tiered-ceo-lead-workers.md)

| # | Task | Verify |
|---|------|--------|
| 1 | lead agent (mode: subagent, narrow dispatch to implementer/test-writer) | `node --test tests/opencode/test-agent-permissions.mjs` |
| 2 | orchestrator tiered dispatch (default direct, Lead escalation only) | `node --test tests/opencode/test-agent-permissions.mjs` |
| 3 | verify-only (npm run verify, bootstrap <5120, agents +1) | `npm run verify` |
| 6 | brain-muscle model split in orchestrator | `node --test tests/opencode/test-agent-permissions.mjs` |
| 7 | docs-only: fix MUSCLE pool order (add omitted super-vl) | `node --test tests/opencode/test-agent-permissions.mjs` |
| 8 | docs-only: unpin BRAIN to orchestrator session model | `node --test tests/opencode/test-agent-permissions.mjs` |
| 9 | docs-only: unpin MUSCLE to dynamic free discovery | `node --test tests/opencode/test-agent-permissions.mjs` |
| 10 | global routing guardrail (brain tasks never on muscle models) | `node --test tests/opencode/test-model-routing.mjs` |

**Status**: draft — not approved. Non-sensitive only.
Approval scope note – covers this plan only; future work needs fresh approval (no open-ended grant).
