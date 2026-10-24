# Progress — Spec-gate enforcement

Plan: [`2026-10-23-spec-enforcement.md`](2026-10-23-spec-enforcement.md)
Spec: [`../specs/2026-10-23-spec-enforcement.md`](../specs/2026-10-23-spec-enforcement.md)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 1 | Spec + plan + progress ledger | ✅ | spec/plan written; frontmatter scope recorded |
| 2 | CLI core | ✅ | `node --test tests/scripts/test-spec-check.mjs` — 11/11 pass |
| 3 | CLI commands + approve this plan | ✅ | `approve` wrote marker; `verify` OK (plan e7a98418d3fe, spec aeda6bda66d0) |
| 4 | Plugin gate | ✅ | `node --test tests/opencode/test-spec-gate.mjs` — 10/10 pass; focused pair 21/21 |
| 5 | Workflow docs | ✅ | `npm run lint` — 39 skills, 0 failures; gate language in 6 skills, 3 agents, `feature.md`, `AGENTS.md` |
| 6 | Installer + top-level docs | ✅ | `node --test tests/scripts/test-install-global.mjs` — 11/11; CLI byte-identical; README/USAGE/CHANGELOG/verify-recipe/debt ledger updated |
| 7 | Full verify + review + close | ⏳ | `npm run verify` 199/199 (pre-review); focused pair 26/26 after review fixes; critics returned CHANGES REQUIRED; fixes applied (CLI hash, symlink containment, unified-diff delete/rename, `--require-active`, duplicate keys, marker immutability) |

## Deviations

| # | Planned | Actual | Reason |
|---|---------|--------|--------|
| 1 | Marker binds spec + plan hashes | Also binds `cli_sha256` of `scripts/spec-check.mjs` | Security review: the CLI is in the edit scope, so a model could weaken `check`; the plugin now refuses a marker whose CLI hash does not match |
| 2 | `verify` exits 0 with no marker (AC2) | Same, plus `verify --require-active` exits 2 when no marker | AC2 says both "fails on a missing marker" and "exits 0 with no active marker"; `--require-active` is the explicit expectation signal, used by workflow docs |

## Decision log

| # | Decision | Basis |
|---|----------|-------|
| 1 | Marker is the enforcement point, plan is human-readable | Plan edits invalidate `plan_sha256`; no widening by editing the plan |
| 2 | Plugin delegates scope checks to the CLI; the plugin only pre-checks marker presence and CLI hash | Single contract implementation without shelling out to a duplicate parser; marker schema stays the shared contract |
| 3 | Bash writes out of scope | A shell sandbox is heavier and false-positive-prone; documented residual risk |
| 4 | A fault after a resolved CLI + active marker fails closed | Timeout/exec errors must not skip remaining patch targets; only a missing marker or an uninstalled CLI fails open |
| 5 | `docs/debt-ledger.md` is implicitly writable | AC4; a plan without the `allow` entry would otherwise block debt recording |
| 6 | Reject symlinked targets and protected-file aliases | Realpath containment closes the `src/link -> outside` escape and case/symlink aliases of the plan/spec |
