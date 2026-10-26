---
description: End-to-end web-game pipeline - design, plan, build, perf/a11y gate, ship
agent: build
---

Web game end-to-end for: $ARGUMENTS.

Follow the pipeline, invoking each skill in order. Do not skip steps:

1. **Route** — load `web-game-development`; classify new/existing, pinned engine, 2D/3D, multiplayer, target portals/devices. Read the engine matrix before choosing.
2. **Design** — `brainstorming` (core loop, kill criteria, engine choice) is a HARD GATE. Refuse to plan content before the verb is fun.
3. **Plan** — `writing-plans` with tasks for deterministic sim, render, input, perf budgets, netcode (if any), accessibility, saves, and ship. After human approval: `node scripts/spec-check.mjs approve docs/plans/<slug>.md` (installed copy if the repo lacks it). Do not implement before it succeeds.
4. **Build** — `executing-plans` inline, or `subagent-driven-development` for independent tasks. TDD the sim/content logic; greybox before art.
5. **Review** — `requesting-code-review` (correctness, security, performance, maintainability) + `lean-review` on the diff. Address via `receiving-code-review`.
6. **Verify** — `verification-before-completion` with fresh evidence: replay determinism, p95 frame time on mid-tier hardware, bundle/asset/GPU budgets, input latency, a11y checklist, portal build.
7. **Ship** — run the launch checklist in `references/web-shipping.md`; analytics, save migration, rollback artifact ready.
