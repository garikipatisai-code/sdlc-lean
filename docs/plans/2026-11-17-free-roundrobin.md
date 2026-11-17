---
spec: docs/specs/2026-11-17-free-roundrobin.md
status: approved
approved_by: human (chat approvals 2026-11-17)
approved_at: 2026-11-17T14:27:35Z
files:
  - docs/AUTONOMY.md
  - .opencode/agents/orchestrator.md
  - eval/lib/free-models.mjs
  - tests/eval/free-models.mjs
allow:
  - docs/plans/2026-11-17-free-roundrobin-progress.md
  - docs/plans/2026-11-17-free-roundrobin-evidence.json
---
# Plan — Dynamic Free-First Round-Robin Fix
Goal: dynamic free-first round-robin, super-VL <-> inkling-2-small primary OR1/OR2 (both allowlisted), Flint/Particle/North + Go/OC pools, allowlist exact IDs + family-prefix stems with -free/:free suffix (No substring deny), high effort+thinking (inkling xhigh + harness dispatch-gated), paid fallback kept. See planner ses_e1649a0d6ffeWuGrjcKqA8htCN for full Goal/mermaid/Architecture/Tasks 1-5 with Verify: T1-T2 node --test tests/eval/free-models.mjs, T3 test-free-rotation-cooldown.mjs, T4 test-tiered-reasoning.mjs, T5 npm run verify.
