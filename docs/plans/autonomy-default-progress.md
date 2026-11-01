# Progress: autonomy-by-default design

## Goal

Make the envelope-authorized zero-approval loop (0001 pilot + 0002 machine-approve) the DEFAULT posture of sdlc-lean — design `docs/design/0003-autonomy-by-default.md` so every new repo/session gets autonomy out of the box (installer ships template + standing rule + ledger init; router assumes envelope-first; one chat yes at bootstrap, zero approvals after), with human plan/hash approval surviving only as fallback.

## Acceptance

- Design approved with human written findings (filled `Review findings` table in 0003).
- Zero code this round (docs-only: 0003 + threat-model section + this ledger).

## Decision (Y-statement)

Context: per-repo retrofit proven in EgWg but manual — every new repo repeats the porting work from the wrong default; chose default-shipped autonomy (installer payload + envelope-first router + one-yes bootstrap) to achieve zero-setup zero-approval for every repo, accepting installer + skill-body work; losers: manual porting (doesn't scale), shared-global envelope (wrong blast radius — envelopes must be per-repo), full removal incl. merges (surrenders the irreversible-external boundary).

## Status

- Design written (`docs/design/0003-autonomy-by-default.md`, status proposed), awaiting human written-findings approval.
- Threat section appended (`docs/threat-model.md`, `## 2026-11-01 autonomy-by-default` only; existing content untouched).
- No gate ops performed; no code/test/skill/plugin/script edits.
- 2026-11-01 prime-directive note (human directive, authoritative): sdlc-lean owns correctness end-to-end — research-first on any uncertainty (parallel fan-out, cited evidence), human-ready suggestions never framed as questions, SOTA standard by default, self-correction over human correction; human fallibility assumed, so no design depends on human technical judgment. Tenet added to 0003 (`Correctness responsibility`), consequences/leading-indicators updated, confidently-wrong-at-speed threat row added. Status STILL proposed — still awaiting human written-findings approval.

## Next

- `writing-plans` ONLY after human written-findings approval of 0003. No implementation plans, no code, until then.
