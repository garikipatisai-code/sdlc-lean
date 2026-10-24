---
spec: docs/specs/2026-10-23-spec-enforcement.md
status: approved
approved_by: appusai
approved_at: 2026-10-24T01:49:00Z
files:
  - docs/specs/2026-10-23-spec-enforcement.md
  - docs/plans/2026-10-23-spec-enforcement.md
  - scripts/spec-check.mjs
  - tests/scripts/test-spec-check.mjs
  - .opencode/plugins/sdlc-lean.js
  - tests/opencode/test-spec-gate.mjs
  - scripts/install-global.mjs
  - tests/scripts/test-install-global.mjs
  - .opencode/skills/writing-plans/SKILL.md
  - .opencode/skills/executing-plans/SKILL.md
  - .opencode/skills/subagent-driven-development/SKILL.md
  - .opencode/skills/requesting-code-review/SKILL.md
  - .opencode/skills/verification-before-completion/SKILL.md
  - .opencode/skills/autonomous-loop/SKILL.md
  - .opencode/agents/orchestrator.md
  - .opencode/agents/implementer.md
  - .opencode/agents/planner.md
  - .opencode/commands/feature.md
  - AGENTS.md
  - README.md
  - USAGE.md
  - CHANGELOG.md
  - docs/verify-recipe.md
  - .gitignore
allow:
  - docs/plans/2026-10-23-spec-enforcement-progress.md
  - docs/debt-ledger.md
---

# Plan — Spec-gate enforcement

**Goal**: make the approved plan a real execution boundary: bind spec + plan
hashes and a file scope into `.sdlc/spec-gate.json`, block out-of-scope file
edits, and make re-approval the only way to widen scope.

**Spec**: [`docs/specs/2026-10-23-spec-enforcement.md`](../specs/2026-10-23-spec-enforcement.md) (APPROVED 2026-10-24T01:49:00Z)

**Architecture**: `scripts/spec-check.mjs` owns the contract (parse, hash,
marker, scope match, CLI). The plugin reads and validates the marker, then
checks file-tool targets after the existing safety guard. Workflow text points
at the same contract; the installer ships the CLI globally. No new dependency.

**Tech stack**: Node 20+ ESM, `node --test`, repo lint (`scripts/validate-skills.mjs`).

**Global Constraints** (AGENTS.md): zero-dep plugin; V1+V2 compatible; fail
open on missing state; safety guards untouched; skill names/descriptions lint;
bootstrap bytes unchanged; docs and counts consistent; `npm run verify` green.

**Lean Constraints**: rung 2 (reuse the existing plugin hook, compaction
patterns, installer, and test stack); no new framework or dependency; the
marker is the smallest durable contract; bash-write bypass is documented, not
solved with a sandbox.

**Review Focus**: hash/approval bypasses; path traversal and symlink handling;
fail-open vs fail-closed boundaries; V1/V2 hook wiring; no false blocks in
repos without a marker; skill text does not contradict itself.

| # | Task | Files | Test | Expected | Verify |
|---|------|-------|------|----------|--------|
| 1 | Record spec + plan + progress ledger; exact file scope | `docs/specs/2026-10-23-spec-enforcement.md`, this file, `-progress.md` | links and frontmatter parse | spec/plan linked, scope complete | `test -f`, `grep` frontmatter |
| 2 | CLI core: plan parse, hashes, marker schema, path safety, glob scope | `scripts/spec-check.mjs`, `tests/scripts/test-spec-check.mjs` | RED first: valid/missing/unapproved plan, traversal, glob, tamper | pure functions pass focused tests | `node --test tests/scripts/test-spec-check.mjs` |
| 3 | CLI commands: approve/status/verify/close/check; approve this plan | same | CLI spawn + marker round-trip | marker written; verify fails on tamper; close removes | `node scripts/spec-check.mjs approve docs/plans/2026-10-23-spec-enforcement.md`, then `verify` |
| 4 | Plugin gate: `checkSpecGate` after safety; V1 + V2 hooks | `.opencode/plugins/sdlc-lean.js`, `tests/opencode/test-spec-gate.mjs` | RED first: no marker, allow, block, progress/debt, patch, hash drift, malformed, V1/V2 | out-of-scope edit throws; in-scope passes; no marker no-op | `node --test tests/opencode/test-spec-gate.mjs` |
| 5 | Workflow text: gate is an authorization boundary, not a checkpoint | 6 skills, 3 agents, `feature.md`, `AGENTS.md` | lint + contradiction grep | autonomous loop cannot skip/widen approval; briefs/reviewers get spec | `npm run lint`; grep gate language |
| 6 | Installer + docs: ship CLI, document usage and residual risks | `scripts/install-global.mjs`, installer test, `README`, `USAGE`, `CHANGELOG`, `verify-recipe`, `.gitignore`, debt ledger | installer byte-identical test | global `scripts/spec-check.mjs`; docs show approve/verify/close | `node --test tests/scripts/test-install-global.mjs`; dry install to temp |
| 7 | Full verification, critic pass, close gate | no new files | `npm run verify`, `npm run eval`, `spec-check verify`; code + security review | all green; findings fixed; gate closed after evidence | fresh command output cited |

## Execution note

Inline via `executing-plans` (one tightly-coupled contract across CLI, plugin,
tests, docs). TDD for tasks 2–4 and 6. The gate is approved after task 3 and
kept active while tasks 4–7 run; an out-of-scope file is a deviation requiring
`close` + `approve`, not a workaround.
