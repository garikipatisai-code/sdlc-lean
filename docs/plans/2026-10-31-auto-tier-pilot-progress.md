# Progress: Auto-tier pilot build

## Goal

Build the pilot machinery from `docs/design/0001-auto-tier-pilot.md` so one standing envelope authorizes long unattended Auto runs: envelope template + technical enforcement, machine-close path, separation-of-powers, audit-ledger wiring, and reward-hacking guards.

## Acceptance

- Plan approved (human fills `approved_by`/`approved_at` via approve; planner never self-approves).
- Gate active on this plan.
- Build done with evidence (one exit-0 row per task + `spec-check verify` passes).

## Decision (Y-statement)

Chose 6-task dependency-ordered build reusing gate CLI + hooks over new services to achieve envelope-authorized machine-close accepting two new CLI subpaths; losers: new-service (heavier), skills/agents (unneeded surface).

## Status

- Plan written (`docs/plans/2026-10-31-auto-tier-pilot.md`, status draft), awaiting human approve.
- No gate ops performed; no code/test edits.

## Build record 2026-10-31 — T1–T6 complete, ready for human close

- Re-approval: human re-approved after scope refresh (`approved_by appusai`,
  `approved_at 2026-10-31T13:09:57.744Z`); gate ACTIVE and GREEN —
  `spec-check verify --require-active` exit 0, plan hash
  `49467016c2f1163819347733518ec563ce1c136d02c9f0c4ef88c859db771bc0`.
- T1 envelope template + validator (`docs/auto-envelope.template.md`,
  `envelope check` in `scripts/spec-check.mjs`): fresh exit 0 ("envelope OK, 6 paths").
- T2 machine-close path (`close --machine` + refusal criteria, human close intact):
  `node --test tests/scripts/test-spec-check.mjs` — 28/28 pass, exit 0.
- T3 separation-of-powers (`.opencode/plugins/sdlc-lean.js`):
  `node --test tests/opencode/test-spec-gate.mjs` — 15/15 pass, exit 0.
- T4 audit wiring + reward-hacking guards:
  `node --test tests/scripts/test-host-evidence.mjs` — 16/16 pass, exit 0.
- T5 new regression tests (`test-auto-tier-machine-close.mjs` 5/5,
  `test-auto-tier-sop.mjs` 4/4): full `npm run verify` — 515/515 pass, exit 0.
- T6 ledger readability + full evidence: `docs/audit-ledger.md` header tightened
  (weekly sampling note, row checklist, no-runs pointer; table shape unchanged);
  `npm run verify` exit 0; evidence
  (`docs/plans/2026-10-31-auto-tier-pilot-evidence.json`, 6 rows, all exit 0,
  bound to current plan hash) validates via `validateCloseEvidence`.
- Reviewer verdicts: none recorded in-repo for build tasks T1–T5 (independent-critic
  pass is a machine-close criterion for future Auto runs under the pilot, not for
  this human-approved plan build); verification evidence is the green suites above.
- Ready for human close: human runs `node scripts/spec-check.mjs close`
  (human path, not `--machine`). T6 agent performed no approve/close.
