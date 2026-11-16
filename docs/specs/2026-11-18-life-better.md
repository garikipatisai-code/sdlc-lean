# Life-better spec — generic MCP DI + fail-open autodetect + debt closeout

**Status**: draft  
**Related plan**: `docs/plans/2026-11-18-life-better.md` (companion, created alongside in Task 4; both stay draft — planner never self-approves)  
**Citations**: e161aed0, 582e3658 (parent-provided; not resolvable in this checkout — recorded verbatim, never fabricated)

## Goal

Make local life better for optional MCP tooling: detect optional MCP tools only through a generic registry contract (`hasCapability(name)` / `getCapability(name)`), auto-detect at activation via a best-effort existence probe, and fail open everywhere — a missing capability silent-skips to the next rung, never hardcalls a server-qualified tool name, never blocks activation. Close the three gate debts (autofill, loop length, escalation) with fresh evidence and publish the missing artifacts so the gate can close green.

Grounding: `DESIGN.md` (no global defaults — tokens stay per-project; nothing here adds UI tokens) and `AGENTS.md` (bootstrap <5KB router-only, plugin V1+V2 fail-open, spec-gate scope discipline, human-facing output under a 30s budget).

## Non-goals

- N1: Not an MCP install. No `curl`/`wget`, no package acquisition, no connection changes without explicit approval (`acquiring-capabilities` governs). Detection is statSync-only; spawn/install never happens here.
- N2: Not a gate. Fail-open stays — no active spec-gate marker means all file tools pass; this spec never blocks edits or forces `spec-check approve`.
- N3: Not a behavior change. All helpers are additive-only with no-op-off semantics; flag/registry absent means byte-identical behavior. No secrets, no credentials, free-only.

## Requirements

## REQ-1 — Generic capability registry (DI contract)

The plugin exposes `registerCapability(name, adapter)` / `hasCapability(name)` / `getCapability(name)` / `clearCapabilities()`. Absent means `false`/`null` and never throws; present returns the same object; a throwing detector is skipped fail-open (`false`/`null`, no throw); invalid register/miss input silent-skips. Skill text (e.g. the reverse-engineering connect ladder) detects optional MCP tools only through this contract — never a hardcalled server-qualified tool name. Covered by `docs/plans/2026-11-16-mcp-di.md`.

## REQ-2 — Startup auto-detect (best-effort, fail-open)

At V1+V2 activation, a best-effort `autoDetectCapabilities(binPath = DEFAULT_MCP_PATH)` runs inside try/catch: a statSync-only existence check of the portable homedir-resolved `DEFAULT_MCP_PATH` (`~/.local/bin/notebooklm-mcp`, `~/` normalized). Populated registry means ready; empty/missing means fail-open to the next rung. Never throws, never blocks activation, never spawns. Applies to V1+V2; bootstrap stays <5KB. Covered by `docs/plans/2026-11-17-mcp-autodetect.md`.

## REQ-3 — Gate-debt closeout with fresh evidence

The three prior debts close only on fresh evidence, approved Tasks 1-3: approve-autofill 9/9 (`test-approve-autofill.mjs`), autonomous-loop SKILL.md 158/160 lines with `test-skill-contracts.mjs` green, tiered-reasoning escalation 9/9 (`test-tiered-reasoning.mjs`). The reverse-engineering `Known debt` log is updated to match (accuracy fix only). No grader is edited.

## REQ-4 — Publish missing artifacts + full-gate evidence

Task 4 publishes exactly four docs-only artifacts — this spec, `docs/plans/2026-11-16-mcp-di.md` (prior 5-task design), `docs/plans/2026-11-17-mcp-autodetect.md` (prior 4-task design), `docs/plans/2026-11-18-life-better.md` (this plan) — plus the REQ-3 debt-log accuracy fix, and records full-gate evidence: `test-mcp-capabilities.mjs` 14/0, `validate-skills.mjs` 0 failures, full `tests/opencode/*.mjs` tail pasted verbatim, bootstrap size + loop length. All four docs stay draft; approval is human-only (`node scripts/spec-check.mjs approve <plan>` or machine-envelope path). `.sdlc/spec-gate.json` is never hand-edited.

## Trace

| REQ | Plan tasks | Tests / verify |
|-----|------------|----------------|
| REQ-1 registry | mcp-di T1-T5 | `test-mcp-capabilities.mjs` Task-1 + Task-4 rows (5 + V1/V2 parity), 14/14 file-green |
| REQ-2 autodetect | mcp-autodetect T1-T4 | `test-mcp-capabilities.mjs` Task-2 + auto-detect rows; `DEFAULT_MCP_PATH` homedir pin |
| REQ-3 debts | life-better T1-T3 (approved) | approve-autofill 9/9; skill-contracts green (loop 158); tiered-reasoning 9/9 |
| REQ-4 publish | life-better T4 (this task) | `ls` 4 files exist; full-suite tail pasted; bootstrap <5120B; loop ≤160; lint 0 failures |

## Test plan

Docs-only spec; no runnable tests. Verified by Task 4 of the companion plan (files exist, `## REQ-1`-`## REQ-4` headings present, trace rows match the named test files). `npm run verify` unchanged.

## Approval

Draft only. Never approve while this task is open; scope is limited to the four doc artifacts plus the debt-log accuracy fix. Human runs `node scripts/spec-check.mjs approve docs/plans/2026-11-18-life-better.md` (or the machine-envelope path) when ready — planner never self-approves.
