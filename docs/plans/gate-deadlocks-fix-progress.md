# Goal

Fix 9 gate deadlocks in scripts/spec-check.mjs and plugin hooks via TDD (failing-first per deadlock):
plan-drift allow-list, task-table self-heal/amend, supersede re-approve, honest RED close,
machine approve path, --plan flag, evidence tasks key, .venv verify, audited abandon.

## Acceptance Criteria

- [x] plan-drift allow-list fixed
- [x] task-table self-heal/amend fixed
- [x] supersede re-approve fixed
- [x] honest RED close fixed
- [x] machine approve path fixed
- [x] --plan flag fixed
- [x] evidence tasks key fixed
- [x] .venv verify fixed
- [x] audited abandon fixed
- [x] `node scripts/spec-check.mjs --help` prints usage (exit 0)
- [x] repro fixed for each deadlock
- [x] `node --test` green

## Budget

3 iterations max — consumed (fix-round complete).

## Task list

| # | Deadlock | Status | Plan | Progress |
|---|----------|--------|------|----------|
| 1 | plan-drift allow-list | done | failing test → fix → verify | verified exit 0 |
| 2 | task-table self-heal/amend | done | failing test → fix → verify | verified exit 0 |
| 3 | supersede re-approve | done | failing test → fix → verify | verified exit 0 |
| 4 | honest RED close | done | failing test → fix → verify | verified exit 0 |
| 5 | machine approve path | done | failing test → fix → verify | verified exit 0 |
| 6 | --plan flag | done | failing test → fix → verify | verified exit 0 |
| 7 | evidence tasks key | done | failing test → fix → verify | verified exit 0 |
| 8 | .venv verify | done | failing test → fix → verify | verified exit 0 |
| 9 | audited abandon | done | failing test → fix → verify | verified exit 0 |

## Fix round

- [x] fix-round done (no further code fixes; all verifies green)

## Verification steps (T1–T5)

- [x] T1 verbatim repros + spec-check --help — all exit 0
- [x] T2 `node --test tests/scripts/test-spec-check.mjs` — 28 pass, exit 0; `git diff --stat` — scripts/spec-check.mjs only
- [x] T3 progress ledger updated (this file)
- [x] T4 `head -60` read-back
- [x] T5 self-verify: all outputs pasted below

## Critics

- [x] ACCEPT (code + security re-review)

## Fresh verification evidence

| Command | Exit | Outcome |
|---------|------|---------|
| `node scripts/spec-check.mjs --help` | 0 | usage printed |
| `node /tmp/opencode/repro-drift.mjs` | 0 | control-state writable; drift never exempt; restored |
| `node /tmp/opencode/repro-table.mjs` | 0 | REPRO: ALL PASS |
| `node /tmp/opencode/repro-supersede.mjs` | 0 | REPRO OK |
| `node /tmp/opencode/repro-red.mjs` | 0 | REPRO-RED: GREEN (all pass) |
| `node /tmp/opencode/repro-machine.mjs` | 0 | REPRO: ALL PASS |
| `node /tmp/opencode/repro-rh1.mjs` | 0 | REPRO-RH1: GREEN (refuses missing-expected-outcomes) |
| `node --test tests/scripts/test-spec-check.mjs` | 0 | pass 28, fail 0 |
| `git diff --stat` | 0 | scripts/spec-check.mjs only |

## Next step

None — verification bundle complete, gate-deadlocks fix closed out.
