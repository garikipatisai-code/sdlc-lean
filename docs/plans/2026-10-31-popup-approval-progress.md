# Progress — popup approval (Task 1 RED)

- Plan: `docs/plans/2026-10-31-popup-approval.md`
- Spec: `docs/specs/2026-10-31-popup-approval.md`
- UTC: 2026-10-31T01:45:50Z
- Task: 1 RED only — tests first, no production edits (`register.js`, docs, scripts, server plugin untouched)

## Verify

- `node --test tests/opencode/test-tui-brain.mjs` → exit 1 (RED): 35 tests, 19 pass, 16 fail
- `! node --test tests/opencode/test-tui-brain.mjs` → exit 0 (Task 1 Verify passes — negation of expected RED)

Existing 19 tests all pass (no weakening).

## New failing tests (16)

1. `tui: approve resolves the project root per open from the TUI location`
2. `tui: approve refuses without a TUI location and never uses cwd or ctx.directory`
3. `tui: approve aborts when the session changes between select and confirm`
4. `tui: approve refuses when the global CLI differs from the project CLI`
5. `tui: approve refuses when the plan changes after details and keeps a preexisting marker`
6. `tui: approve refuses symlink escapes without writing outside the root`
7. `tui: approve refuses to overwrite an active gate with a single confirm and hints close`
8. `tui: approve overwrites only with a second confirm naming the old plan and hash`
9. `tui: approve without dialog shows the exact approve command via toast or log`
10. `tui: setup without keymap logs only and never toasts`
11. `tui: palette survives a bind parse error and approve still writes without session command`
12. `tui: two setupTui calls register sdlc.approve once`
13. `tui: success marker carries tui-popup, UTC time, and host username`
14. `tui: approve refuses when node:os is unavailable`
15. `tui: approve details cap the plan excerpt at 2000 chars with file and allow counts`
16. `tui: no approve or status path uses client.session.command or session.prompt`

All fail against the current preview-only `register.js` (shows `preview-only` toast, never writes, single session check, setup-captured root, no CLI parity, no second confirm, no `node:os` import).

## Gate note

Spec gate human-disabled for this task wave: `.sdlc/spec-gate.json` moved aside (authorized bypass for a broken enforcement path; plan bytes unchanged). Marker at `/tmp/spec-gate-popup.json`. Re-approval pending after Task 4.

## Task 2 GREEN attempt

- UTC: 2026-10-31T01:52:53Z
- Edit: `.opencode/plugins/sdlc-lean-tui/register.js` only (per-open root, session re-check, global-first CLI with byte-compare refuse, hash chain, lstat preexistence, content-matched unlink, second-confirm overwrite, validateGate re-read, fallback matrix, tui-popup + node:os + UTC, module guard, capped View, palette-only no-bind retry). Tests untouched.

## Verify

- `node --test tests/opencode/test-tui-brain.mjs` → exit 1: 35 tests, 34 pass, 1 fail
- Failing: `tui: approve refuses to overwrite an active gate with a single confirm and hints close` (marker overwritten to `docs/plans/2026-10-29-other.md` with `tui-popup`; test demands byte-identical marker)
- Passing twin: `tui: approve overwrites only with a second confirm naming the old plan and hash`

## Spec-gate block (escalation, no scope change)

- The two overwrite tests use byte-identical stimuli (`select: OTHER_REL, confirm: true`, same valid gate for `PLAN_REL`) yet demand opposite outcomes from one run: refuse + unchanged marker vs second confirm + overwritten marker. The dialog mock returns `true` for every confirm, so "a single confirm" is unobservable — deterministic code cannot satisfy both.
- Plan F10 sides with the second test (second confirm naming old plan/hash → overwrite; refuse with `close` hint only when the second confirm is denied). Implementation follows the plan; the first test as written is defective (it needs a mock that denies the second confirm, which Task 2 may not edit).
- Stopped per the test-contradiction rule. No test edits, no hacks, no scope growth. Needs human decision: fix Task 1 test vs accept overwrite-on-double-true.

## Test-mock fix (human-authorized, no spec gate active)

- UTC: 2026-10-31T01:53:33Z
- Changed: `tests/opencode/test-tui-brain.mjs` only — in `tui: approve refuses to overwrite an active gate with a single confirm and hints close`, the confirm mock now resolves `true` on the 1st call (approve intent) and `false` on the 2nd call (deny overwrite). Assertions, test name, and all other tests untouched.
- Why: both overwrite tests used byte-identical stimuli (`select: OTHER_REL`, confirm always `true`) but demanded opposite outcomes; with always-true the overwrite always proceeds so the refuse test could not pass. Denying the 2nd confirm models approve-confirmed-but-overwrite-denied, matching plan F10 (refuse + `close` hint only when the 2nd confirm is denied).
- Verify: `node --test tests/opencode/test-tui-brain.mjs` → exit 0: 35 tests, 35 pass, 0 fail.
Task 2 Verify (post mock fix): exit 0, 35 tests, 35 pass, 0 fail, 2026-10-31T01:54:20Z.

## Task 3 docs (popup primary with fallbacks and forgeable limit)

- UTC: 2026-10-31T01:55:12Z
- Edits: `README.md`, `USAGE.md`, `CHANGELOG.md` only (docs name `sdlc.approve` popup as primary with `approved_via: tui-popup`; typed `/approve` + `spec-check approve` TTY fallback stay; forgeable-label limit stated; headless/SSH uses TTY CLI; V1 loads no TUI part; no sandbox claim kept honest). No code/tests/scripts/plan/spec edits.

## Verify

- `grep -q tui-popup README.md USAGE.md CHANGELOG.md` → exit 0
- Per-file counts: README.md:1, USAGE.md:3, CHANGELOG.md:2

## Task 4 full gate (RED — regression, escalation, no scope change)

- UTC: 2026-10-31T01:55:44Z (verify start; bootstrap measured 2026-10-31T01:55:53Z)
- Command: `npm run verify && node eval/run.mjs` → exit 1 (`npm run verify` failed; `node eval/run.mjs` never ran — `&&` short-circuit, 0 probes executed this run)
- Counts: 469 tests, 468 pass, 1 fail (lint clean: 40 skills, 0 failures)
- Failing: `docs: README, USAGE, and CHANGELOG name sdlc.approve, host evidence, and preview-only` (tests/opencode/test-v2-brain.mjs:427) — asserts /preview-only/i in all three docs. Task 3 popup-primary wording removed it: `preview-only` counts README.md:0, USAGE.md:0, CHANGELOG.md:1.
- Bootstrap: 5068 bytes ≤ 5116 (budget test passed)
- Probes: dry eval not executed (short-circuit); probe-set shape tests passed inside verify (`exactly 35 probes`), but the dry-eval 0-failure bar is unconfirmed
- Evidence: `docs/plans/2026-10-31-popup-approval-evidence.json` NOT written — exit is 1, so no truthful exit-0 Task 4 row exists. Not fabricating.
- Needs human decision: Task 3 docs vs pre-existing test-v2-brain docs assertion conflict (same class as the Task 2 mock conflict). Task 4 may not edit tests or docs. Options: update the stale `preview-only` assertion (test edit, needs approval) vs reword docs to retain a `preview-only` mention.
- `close` not run (pending human re-approval of the unchanged plan per task brief).

## Task 4 full gate (GREEN — verify + ledger only, no code/test/docs/plan/spec edits)

- UTC: 2026-10-31T01:58:17Z (fresh `npm run verify && node eval/run.mjs` run; `date -u` captured at run end)
- Command: `npm run verify && node eval/run.mjs` → exit 0
- Counts: 469 tests, 469 pass, 0 fail (lint clean: 40 skills, 0 failures)
- Bootstrap: 5068 bytes ≤ 5116 (budget tests pass; no plugin edits since the 5068-byte measure, so unchanged)
- Probes: dry eval 35 probes, 0 failures (activation=2, safety=2, routing=12, brain=3, trust=4, execution=4, command=4, agent=1, router=3); run-for-real hint printed, no model calls
- Stale-test deviation (human-authorized, no spec gate active): `tests/opencode/test-v2-brain.mjs:427,436` — docs assertion `preview-only` → `tui-popup` to match Task 3 popup-primary wording; authorized at UTC 2026-10-31T01:57:15Z; test now reads `docs: README, USAGE, and CHANGELOG name sdlc.approve, host evidence, and tui-popup` and passes
- Task 2 mock-fix reference: `tests/opencode/test-tui-brain.mjs` overwrite-refuse test confirms `true` on 1st call and denies the 2nd confirm (UTC 2026-10-31T01:53:33Z); untouched in this task
- Evidence: `docs/plans/2026-10-31-popup-approval-evidence.json` written with `plan` = `docs/plans/2026-10-31-popup-approval.md`, `plan_sha256` = `e3027add2ef93504dd1b4b9e93ca5b5916b882c2cb5425ea1b4435053872633a`, exactly 4 rows, `exit: 0`, `verify` strings copied exactly from the plan table cells:
  - Task 1: `! node --test tests/opencode/test-tui-brain.mjs` at `2026-10-31T01:45:50Z`
  - Task 2: `node --test tests/opencode/test-tui-brain.mjs` at `2026-10-31T01:54:20Z`
  - Task 3: `grep -q tui-popup README.md USAGE.md CHANGELOG.md` at `2026-10-31T01:55:12Z`
  - Task 4: `npm run verify && node eval/run.mjs` at `2026-10-31T01:58:17Z`
- `close` not run (pending human re-approval of the unchanged plan per task brief).
