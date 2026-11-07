---
spec: docs/debt-ledger.md
status: approved
files:
  - scripts/research/phase.mjs
  - .opencode/plugins/sdlc-lean.js
  - .opencode/agents/test-writer.md
  - .opencode/agents/code-reviewer.md
  - .opencode/skills/finishing-a-development-branch/SKILL.md
  - .opencode/skills/using-git-worktrees/SKILL.md
allow:
  - docs/plans/2026-11-07-phase-c-perms-progress.md
  - docs/plans/2026-11-07-phase-c-perms-evidence.json
approved_by: appusai
approved_at: 2026-11-07T03:00:59.923Z
---

# Plan: Phase C — permissions / orchestration

## Goal

Close the runtime-enforcement gap between instruction-level policy and hook-level
enforcement for permissions and orchestration: phase-ledger strictness (D-012),
phase invocation gate (D-011), agent path guards (D-015/D-019), uxStatus caller +
read-only tool surface (D-026/D-033), and merge/worktree guard (D-018) — with
coverage mapping and test integrity (no task edits its own grader).

## Tasks

| # | Task | Debt | Files | Test | Expected | Verify |
|---|------|------|-------|------|----------|--------|
| 1 | Phase strictness | D-012 | `scripts/research/phase.mjs` | extend `tests/scripts/research/test-phase.mjs` (RED first) | approval `at` anchored (no future-dating, no pre-failure); handoff rejects unknown extras; post-write revalidation on `beginDispatch` | `node --test tests/scripts/research/test-phase.mjs` |
| 2 | Invocation gate | D-011 | `scripts/research/phase.mjs`, `.opencode/plugins/sdlc-lean.js` | phase suite + plugin suite stay green | model path cannot bypass ledger: session hook/command wrapper loads ledger before dispatch | `node --test tests/scripts/research/test-phase.mjs` |
| 3 | Agent path guards | D-015/D-019 | `.opencode/agents/test-writer.md`, `.opencode/agents/code-reviewer.md`, `.opencode/plugins/sdlc-lean.js` | plugin path-guard tests (RED first) | V1-host parity: test-writer test-only edit boundary enforced in plugin; reviewer gains read-only test allowlist (`node --test`/read-only) | `node --test tests/scripts/research/test-phase.mjs` + plugin suite |
| 4 | uxStatus caller + read-only tool | D-026/D-033 | `.opencode/plugins/sdlc-lean.js` | new caller/tool tests (RED first) | one `uxStatus` caller writes `docs/audit-ledger.md` rows; one read-only plan/status tool; no write surface | `node --test tests/scripts/research/test-phase.mjs` + plugin suite |
| 5 | Merge/worktree guard | D-018 | `.opencode/skills/finishing-a-development-branch/SKILL.md`, `.opencode/skills/using-git-worktrees/SKILL.md`, `.opencode/plugins/sdlc-lean.js` | execution-probe fixtures stay green | `git merge`/`git worktree` intercepted at runtime: explicit human approval + final SHA + `spec-check verify`/`close`; per-worktree baseline marker | `node --test tests/scripts/research/test-phase.mjs` + full `npm run verify` |

## Coverage

| Debt | Task | How proven |
|------|------|------------|
| D-012 | 1 | anchored-`at` + strict-handoff + revalidation assertions in phase suite |
| D-011 | 2 | ledger-load gate on dispatch path; bypass attempt refused |
| D-015/D-019 | 3 | plugin path-guard tests; reviewer read-only allowlist |
| D-026/D-033 | 4 | uxStatus caller test + read-only tool test; no write capability |
| D-018 | 5 | merge/worktree hook tests; skill text + artifact assertions |

## Test integrity

- No task edits its own grader: task 1 extends the phase suite RED-first, then
  implements; tasks 2–5 add new assertions before code and never weaken existing
  suites.
- `node --test tests/scripts/research/test-phase.mjs` stays green throughout.
