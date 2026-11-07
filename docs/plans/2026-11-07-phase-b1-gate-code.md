---
spec: docs/debt-ledger.md
status: approved
approved_by: appusai
approved_at: 2026-11-07T02:51:49.631Z
files:
  - scripts/spec-check.mjs
  - docs/threat-model.md
allow:
  - docs/plans/2026-11-07-phase-b1-gate-code-progress.md
  - docs/plans/2026-11-07-phase-b1-gate-code-evidence.json
---

# Phase B1 — Gate code (corrected scope)

## Goal

Close the gap-batch residuals shippable under gate: CLI hardening + threat-model residual docs. Ledger prose deferred to follow-up.

Background: Phase B plan `docs/plans/2026-11-07-phase-b-gate.md` was approved with `docs/debt-ledger.md` in `files`, but the spec is immutable under an active gate, so T4 + ledger halves were unexecutable. This B1 plan corrects scope: NO spec file in `files`. Debt-ledger prose updates move to the post-close follow-up (recorded in progress ledger).

## Architecture

- CLI: `writeGate` / `validateGate` / `validateCloseEvidence` / `validateCriticsSessions` in `scripts/spec-check.mjs`.
- TM: `docs/threat-model.md` sections 132–141 extended (skipDrift residual + T3 broker-attested residual + drift-guard/advisory rows).

## Tech stack

- node, zero-dep.
- Test commands:
  - `node --check scripts/spec-check.mjs && node --test tests/scripts/test-spec-check.mjs`
  - `node --test tests/opencode/test-spec-gate.mjs && node --test tests/scripts/test-spec-check.mjs`
  - `node --test tests/opencode/test-host-evidence.mjs && node --test tests/scripts/test-host-evidence.mjs && node --test tests/scripts/test-auto-tier-machine-close.mjs`

## Spec

- `docs/debt-ledger.md`: D-032 / D-013 / D-016 / D-031 / skipDrift / broker (read-only reference; NOT in `files`, NOT editable under this gate).
- `docs/threat-model.md` 132–141: skipDrift residual + T3 broker-attested residual (editable; in `files`).

## Constraints

- Spec immutable — ledger edits forbidden under gate. `docs/debt-ledger.md` is the spec and is NOT in `files`/`allow`; any ledger prose moves to the post-close follow-up.
- Reuse containment patterns (plugin `lstat`/`realpath` checks as the reference for CLI parity).
- Fail-open preserved (gate/drift/evidence controls stay drift-guard and advisory where they are today; no new hard sandbox).

## Review Focus

- CLI parity with plugin `lstat`/`realpath` checks.
- Docs honesty, no sandbox promise (drift guard, not sandbox; advisory-by-default host evidence).
- No broker code (broker-attested identity documented as out of scope, not implemented).

## Tasks

| # | Task | Debt | File | Verify |
|---|---|---|---|---|
| 1 | CLI .sdlc symlink hardening (D-032): writeGate/approve mirror plugin lstat+realpath containment, refuse symlinked .sdlc before marker write | D-032 | scripts/spec-check.mjs | `node --check scripts/spec-check.mjs && node --test tests/scripts/test-spec-check.mjs` |
| 2 | Threat-model drift-guard + skipDrift order (D-013/D-016): document accepted drift-guard-not-sandbox, no-abandon (superseding plan only), close-before-humanApproval order, approve/verify/check keep full drift | D-013, D-016, skipDrift | docs/threat-model.md | `node --test tests/opencode/test-spec-gate.mjs && node --test tests/scripts/test-spec-check.mjs` |
| 3 | Threat-model advisory + broker residuals (D-031/T3): advisory-by-default + --require-host opt-in + forgeable-via-bash note; validateCriticsSessions duplicate/required-only, broker-attested out of scope, no broker code | D-031, broker | docs/threat-model.md | `node --test tests/opencode/test-host-evidence.mjs && node --test tests/scripts/test-host-evidence.mjs && node --test tests/scripts/test-auto-tier-machine-close.mjs` |

## Coverage checklist

- [ ] D-032 — CLI symlink hardening (task 1)
- [ ] D-013 — drift-guard-not-sandbox documented (task 2)
- [ ] D-016 — no-abandon / superseding-plan-only documented (task 2)
- [ ] skipDrift — close-before-humanApproval order documented (task 2)
- [ ] D-031 — advisory-by-default + --require-host opt-in + forgeable-via-bash documented (task 3)
- [ ] broker/T3 — validateCriticsSessions duplicate/required-only + broker-attested out of scope, no broker code (task 3)
- [ ] Ledger prose — explicitly DEFERRED to post-close follow-up, not in this gate

## Test integrity

Never edit graders. Grader/test files are assertion sources only; implementation and docs change to satisfy them, never the reverse.
