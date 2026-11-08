---
spec: docs/specs/2026-11-08-free-model-resolver.md
status: approved
approved_by: user-chat-2026-11-08-blanket-6plans
approved_at: 2026-11-08T17:20:05.000Z
files:
  - eval/lib/free-models.mjs
  - tests/eval/free-models.mjs
  - docs/eval/dispatch-procedure.md
allow:
  - docs/plans/2026-11-08-free-model-resolver-progress.md
  - docs/plans/2026-11-08-free-model-resolver-evidence.json
---

# Plan — Free Model Resolver

**Goal**: Pure stdlib-only ESM lib `eval/lib/free-models.mjs` (no network):
dynamic free-model resolver via `resolveFreeModels` + `getFreeModelsCached`
(TTL memo) with frozen fallback trio; dispatch-procedure docs; zero-dep,
back-compat with existing pins.

**Note**: spec file not present yet — create
`docs/specs/2026-11-08-free-model-resolver.md` before approving
(plan-based work; see progress `spec_status`).

| # | Task | Verify |
|---|------|--------|
| 1 | implement `eval/lib/free-models.mjs` (stdlib-only, no network) | `node --check eval/lib/free-models.mjs` |
| 2 | add `tests/eval/free-models.mjs` | `node --test tests/eval/free-models.mjs` |
| 3 | dispatch procedure docs (additive) | `node --test tests/eval/free-models.mjs` |
| 4 | verify-only resolver gate | `node --test tests/eval/free-models.mjs` |
| 5 | muse BLOCKING + P1–P3 resolver guards | `node --test tests/eval/free-models.mjs` |

**Status**: draft — not approved. Non-sensitive only.
Approval scope note – covers this plan only; future work needs fresh approval (no open-ended grant).
