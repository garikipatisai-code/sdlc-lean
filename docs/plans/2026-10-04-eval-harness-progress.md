# Progress — live eval harness + telemetry

Plan: [`2026-10-04-eval-harness.md`](2026-10-04-eval-harness.md)
Status: all tasks complete, pending review.

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 1 | Probe schema + seeds | ✅ | `eval/probes.mjs` (8 probes: 2 activation, 2 safety, 4 routing); schema tests pass |
| 2 | Tolerant event parser | ✅ | `eval/lib/parse.mjs`; validated against a real `--format json` stream |
| 3 | Assertion engine | ✅ | `eval/lib/assert.mjs`; 6 kinds incl. skill/activated/blocked |
| 4 | Planner + runner (dry default) | ✅ | `npm run eval` prints the 8-probe plan, no spend |
| 5 | Live path + telemetry + report | ✅ | `--run` yields JSON+MD; `activation-status` 1/1, `routing-bugfix` 1/1; `stats` attached |
| 6 | Docs + wiring | ✅ | README/USAGE/CHANGELOG/AGENTS + `npm run eval`; `npm run verify` green |

## Full-suite evidence

- `node scripts/validate-skills.mjs` → `checked 26 skills, 0 failures`
- `node --test` → `38 pass / 0 fail`
- `npm run eval` (dry) → `probes: 8 (activation=2, safety=2, routing=4)`
- Live: `node eval/run.mjs --run --filter activation-status --max-probes 1` → 1/1
- Live: `node eval/run.mjs --run --filter routing-bugfix --max-probes 1` → 1/1
  (skill captured; totals input 13970 / output 805 / cache-read 72320)

## Deviations from plan (recorded)

- **`node --test tests/eval/`** (dir arg) fails on Node 24 (`MODULE_NOT_FOUND`) —
  same issue as the V1 plan. Used the shell glob / bare `node --test`.
- **Real event shape differed from the assumed fixture.** `opencode run
  --format json` emits `{type, part}` lines; a skill call is
  `part.type:"tool"`, `part.tool:"skill"`, `part.state.input.id`. The parser
  was rewritten and the unit fixture corrected to the real shape (the plan's
  "confirm, don't guess" step).
- **Telemetry defect found and fixed.** `opencode stats --project .` returned
  all zeros because a `--standalone` run is invisible to the shared-service
  stats store. Switched to summing `step-finish` `cost`/`tokens` from the run's
  own `--format json` stream — no second process, works with `--standalone`,
  and enables per-probe attribution later.
- **Two live probes run** instead of one, to validate skill capture after the
  parser fix. Both under `--max-probes 1`.

## Review round (requesting-code-review)

`code-reviewer` (no shell; read-only) findings and disposition:

| Finding | Severity | Action |
|---|---|---|
| `activated` used run-level start → later probes false-positive | major | **Fixed** — per-probe `probeStart` |
| `--max-probes` non-numeric → NaN → 0 probes | minor | **Fixed** — validate integer ≥ 0 |
| stale `activation-status` artifact with old zero stats | minor | **Removed** |
| committed transcript leaked absolute home path | minor | **Fixed** — `redact()` + existing artifact redacted |
| `--project` parsed but unused | nit | **Removed** |
| dead `tools.includes('skill:…')` branch | nit | **Removed** |
| `--json` no-op in dry, undocumented | nit | **Removed** |
| parser returned unused `events` | question | **Removed** from return |
| `--out` resolved against cwd | nit | **Fixed** — resolved against repo root |
| non-zero exit gave no diagnostic | question | **Fixed** — captures `stderr`/exit |

All findings resolved in-review. `npm run verify` re-run after fixes: 38/38.

## Not done (tracked)

- Per-probe token attribution (v1 telemetry is run-level).
- LLM-judge scoring (deferred by design).
- Lifecycle skills: incident/postmortem, dependency-upgrade, threat-model, adr.
