# Progress: envelope-authorized machine-approve (`approve --machine`)

## Goal

Add `approve --machine` to `scripts/spec-check.mjs` mirroring `close --machine` rigor, so the agent opens the next gate inside a standing envelope with zero keystrokes while envelope authorization and irreversible-external acts stay human.

## Acceptance

- [ ] Plan approved (human `approve` on `docs/plans/2026-10-31-machine-approve.md`)
- [ ] Gate active
- [ ] Build green (`npm run verify` exits 0)
- [ ] Evidence bound (`docs/plans/2026-10-31-machine-approve-evidence.json` holds one exit-0 row per task with exact `Verify` command and UTC `at`)
- [ ] Close (`close --machine` with evidence)

## Y-statement

Chose single-file mirror of `closeMachineGate` + one test file + one docs line to achieve agent-opened gates with zero keystrokes, accepting new activation power bounded by envelope ceiling.

Losers:
- New service (heavier — reuse-first forbids)
- Plugin hooks (pilot constraint forbids envelope refs in plugin)
- Separate activator (unneeded surface — one flag-mode suffices)

## Status

- Plan written (`docs/plans/2026-10-31-machine-approve.md`, status draft), awaiting human approve.
- Gate FRESHLY RE-APPROVED by appusai at 2026-11-01T05:25:29.623Z (plan_sha256 `9b324c5a…19405b`); `verify --require-active` exits 0. No approve/close run by agent.

## Ledger (fresh re-run 2026-11-01T05:26:42Z, all exit 0)

- T1 `node --test tests/scripts/test-spec-check.mjs` → exit 0 (28/0). Verdict: `approveMachineGate` core green — double-gate / envelope-ceiling / reference-missing refuse before mutation.
- T2 `node --test tests/scripts/test-auto-tier-machine-close.mjs` → exit 0 (5/0). Verdict: envelope-auth anchoring + activation audit row green.
- T3 `node scripts/spec-check.mjs --help` → exit 0. Verdict: CLI wiring green — `--help` names `approve --machine`; human `approve` path byte-identical.
- T4 `node --test tests/scripts/test-machine-approve.mjs` → exit 0 (7/0). Verdict: regression suite green. Hardening 5→7 cases: added missing-envelope + race coverage. Race → wx fix (O_EXCL EEXIST, exactly-one-wins, loser double-gate).
- T5 `npm run lint` → exit 0 (40 skills, 0 failures). Verdict: docs pointer green — `approve --machine` criteria + design link 0002.
- T6 `npm run verify` → exit 0 (522/0/0). Verdict: full gate regression green. Security review HIGH+LOW → fixed → closed.
- Evidence: `docs/plans/2026-10-31-machine-approve-evidence.json` binds plan_sha256 `9b324c5a…19405b`, 6 rows exact Verify strings, exit 0, at 2026-11-01T05:26:42Z.
- Ready-for-close: T1–T6 green on fresh gate, evidence bound, no scope drift. Next: human `close --machine` with evidence.
