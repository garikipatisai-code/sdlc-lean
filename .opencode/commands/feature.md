---
description: End-to-end feature pipeline - explore, plan, implement, review, verify
agent: build
---

New feature end-to-end for: $ARGUMENTS.

Follow the pipeline, invoking each skill in order. Do not skip steps:

1. **Explore** — use the `explorer` subagent (or `exploring-codebase` when available) to map touched code.
2. **Plan** — `brainstorming` (design + approval HARD GATE), then `writing-plans` (present plan, wait for approval). Approval is an authorization boundary, never a checkpoint.
3. **Gate** — after the human approves the plan: `node scripts/spec-check.mjs approve docs/plans/<slug>.md` (installed copy if the repo lacks it). Do not implement before it succeeds.
4. **Implement** — `executing-plans` inline, or `subagent-driven-development` if tasks are independent. TDD throughout. A blocked edit is a deviation: `close` + re-approval, never a bash bypass.
5. **Review** — `requesting-code-review` (4 passes) + `lean-review` on the diff. Address via `receiving-code-review`.
6. **Verify** — `verification-before-completion` with fresh evidence including `spec-check verify`, then `finishing-a-development-branch`. `close` the gate only after evidence is recorded.
