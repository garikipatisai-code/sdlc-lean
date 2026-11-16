---
spec: docs/specs/2026-11-16-free-rotation-cooldown.md
status: draft
approved_by:
approved_at:
files:
  - .opencode/agents/orchestrator.md
allow:
  - docs/plans/2026-11-16-free-rotation-cooldown-progress.md
  - docs/plans/2026-11-16-free-rotation-cooldown-evidence.json
---

# Plan — Free Rotation Cooldown

**Goal**: Quota-aware free-first rotation with cooldown ledger across the 20-pin
free pool (OR both accounts → Go → OC → BRAIN fallback). Automatic
cooldown + ledger append on 429/provider-error, fail-open, never auto-paid.

**Gates**: open. **Order**: 1 → 5. Task 1 (this decision record) first.

| # | Task | Verify |
|---|------|--------|
| 1 | Decision record (docs only, this file + spec): lock writer seam, base role, orchestrator path, pin IDs | `node scripts/validate-skills.mjs` + `git status --porcelain` shows only the 2 new docs |
| 2 | Pin files: one file per provider-model (20), implementer base body via prompt injection | validate-skills + pin count = 20 |
| 3 | Orchestrator routing table update in `.opencode/agents/orchestrator.md` (Model routing + table sections) | validate-skills + table cites pool order |
| 4 | Cooldown writer: V2 `execute.after` hook path + V1 orchestrator-file fallback, 0600/0700, 500-row/2MB cap | hook regression test green |
| 5 | Close-out: ledger rows per dispatch, denylist + never-secrets checks, retro-sweep | full verify green |

## T1 decision record (locked 2026-11-16)

- Seam: plugin V2 `ctx.tool.hook('execute.after')` (`.opencode/plugins/sdlc-lean.js:3017`, fail-open advisory); V1 fallback = orchestrator-maintained file via existing write tools, fail-open read. Caps: 0600/0700, 500 rows / 2MB, symlink-safe, hash-only.
- Base role: implementer (edit+bash allow = permission superset; one file per provider-model serves all muscle roles; researcher stays BRAIN).
- Pins: 20 (OR 7 incl. router, Go 4, OC 9); exclusions lfm/inkling/expired/jev/no-tools with reasons in spec; -a/-b = console-openrouter vs console-openrouter2; router carries nondeterministic-selection caveat + never-secrets.
- Orchestrator path: `.opencode/agents/orchestrator.md`.

**Status**: draft — not approved.
Approval scope note – covers this plan only; future work needs fresh approval (no open-ended grant).
