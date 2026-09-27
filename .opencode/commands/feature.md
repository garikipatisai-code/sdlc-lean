---
description: End-to-end feature pipeline - explore, plan, implement, review, verify
agent: build
---

New feature end-to-end for: $ARGUMENTS.

Follow the pipeline, invoking each skill in order. Do not skip steps:

1. **Explore** — use the `explorer` subagent (or `exploring-codebase` when available) to map touched code.
2. **Plan** — `brainstorming` (design + approval HARD GATE), then `writing-plans` (present plan, wait for approval).
3. **Implement** — `executing-plans` inline, or `subagent-driven-development` if tasks are independent. TDD throughout.
4. **Review** — `requesting-code-review` (4 passes) + `lean-review` on the diff. Address via `receiving-code-review`.
5. **Verify** — `verification-before-completion` with fresh evidence, then `finishing-a-development-branch`.
