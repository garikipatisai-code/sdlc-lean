# Progress: machine-approve design

## Goal

Design envelope-authorized MACHINE-APPROVE (`docs/design/0002-machine-approve.md`) so the agent opens its own gate via `approve --machine` inside an unchanged standing envelope — removing ALL forced-terminal approvals (active-gate overwrite on the typed path, drift `close && approve`, parity reinstall) and completing the zero-terminal loop that 0001 started.

## Acceptance

- Design approved with human written findings (filled `Review findings` table in 0002).
- Zero code this round (docs-only: 0002 + threat-model section + this ledger).

## Decision (Y-statement)

Context: forced-terminal approvals on every re-approval/drift/parity case; chose envelope-authorized machine-approve to achieve the zero-terminal loop, accepting agent-held activation power bounded by envelope ceiling + immutability + no-double-gate + activation audit; losers: human /close pair (keeps per-step click), typed-confirm (no channel + still human), status quo (directive rejects).

## Status

- Design written (`docs/design/0002-machine-approve.md`, status proposed), awaiting human written-findings approval.
- Threat section appended (`docs/threat-model.md`, `## 2026-10-31 machine-approve` only; existing content untouched).
- No gate ops performed; no code/test/skill/plugin/script edits.

## Next

- `writing-plans` ONLY after human written-findings approval of 0002. No implementation plans, no code, until then.
