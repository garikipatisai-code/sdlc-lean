# Phase B1 — progress ledger

## Goal

Close gap-batch residuals shippable under gate: CLI hardening (D-032) + threat-model residual docs (D-013/D-016/skipDrift, D-031/broker). Ledger prose deferred to post-close follow-up.

## Baseline

- `git rev-parse HEAD`: `3cccaa50790e3e28299e2c425955b822edc8434c`
- No active gate at plan draft (`.sdlc/spec-gate.json` absent; operator-voided marker confirmed).
- Corrected scope vs Phase B (`docs/plans/2026-11-07-phase-b-gate.md`): spec `docs/debt-ledger.md` NOT in `files`; ledger edits forbidden under gate.

## Test commands

- Task 1: `node --check scripts/spec-check.mjs && node --test tests/scripts/test-spec-check.mjs`
- Task 2: `node --test tests/opencode/test-spec-gate.mjs && node --test tests/scripts/test-spec-check.mjs`
- Task 3: `node --test tests/opencode/test-host-evidence.mjs && node --test tests/scripts/test-host-evidence.mjs && node --test tests/scripts/test-auto-tier-machine-close.mjs`

## Follow-up (post-close, recorded)

- Debt-ledger prose updates (D-032/D-013/D-016/D-031/skipDrift/broker statuses) move to the post-close follow-up after this gate closes. Not executable under this gate (spec immutable).

## Progress

- [x] Task 1 (D-032, `scripts/spec-check.mjs`): `assertSdlcContained` added — `lstat` refuses symlinked `.sdlc` (`symlink`), `realpathSync` must stay under root (`unsafe-path`); enforced in `writeGate` + `approveMachineGate` before any marker write. Verify `node --check scripts/spec-check.mjs && node --test tests/scripts/test-spec-check.mjs`: exit 0, 28/28 pass, 2026-11-07T02:52:55.306Z. RED shown first (symlinked `.sdlc` wrote outside pre-fix); GREEN refuses, normal dir still writes.
- [x] Task 2 (D-013/D-016/skipDrift, `docs/threat-model.md`): 2026-11-07 B1 Task 2 section appended — drift-guard-not-sandbox, no-abandon (superseding plan only), skipDrift close-before-humanApproval order; CLI symlinked-.sdlc refusal (Task 1) referenced. Verify `node --test tests/opencode/test-spec-gate.mjs && node --test tests/scripts/test-spec-check.mjs`: exit 0, 15 + 28 pass, 2026-11-07T02:55:46.005Z. Wording-only, no code.
- [x] Task 3 (D-031/broker, `docs/threat-model.md`): 2026-11-07 B1 Task 3 section appended — advisory-by-default hash-only host evidence + --require-host opt-in + forgeable-via-bash (D-013) note; validateCriticsSessions duplicate/required-only, broker-attested out of scope, no broker code. Verify `node --test tests/opencode/test-host-evidence.mjs && node --test tests/scripts/test-host-evidence.mjs && node --test tests/scripts/test-auto-tier-machine-close.mjs`: exit 0, 10 + 16 + 5 pass, 2026-11-07T02:56:35.278Z. Wording-only, no code.

## Next

Task 1 done. EXPECTED: `cli_sha256` changed → gate verify now reports cli-drift until close + re-approve (orchestrator owns re-approval).
