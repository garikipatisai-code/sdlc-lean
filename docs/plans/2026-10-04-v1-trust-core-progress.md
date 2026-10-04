# Progress — sdlc-lean V1 trust core

Plan: [`2026-10-04-v1-trust-core.md`](2026-10-04-v1-trust-core.md)
Status: all tasks complete, pending review.

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 1 | Root `package.json` + `CHANGELOG.md` | ✅ | `npm run verify` exit 0; CHANGELOG links point at `github.com/garikipatisai-code/sdlc-lean` |
| 2 | CI workflow | ✅ | `.github/workflows/ci.yml` YAML-parses; matrix `20,22,24`; steps checkout/setup-node/verify. Actions run pending push |
| 3 | Debt-ledger format + wiring | ✅ | `lean-review/references/debt-ledger.md` ships; wired in `lean-review` + `commands/refactor.md`; router already names it; test passes |
| 4 | Safety: `patch`/`apply_patch` file guard | ✅ | failing-first test added; `checkSafety` handles `patch`/`apply_patch` + diff-body paths; test passes |
| 5 | Safety: bash secret reads | ✅ | failing-first test; `SECRET_READ_RE` blocks readers on `.env`/keys; `.env.example` and `grep src/` pass |
| 6 | STE-lite skill | ✅ | `simplified-technical-english` ships (26 skills); router signals `STE-lite`; `communicating-concisely` links it; test passes |
| 7 | Docs sync | ✅ | README/USAGE: 25→26, STE + debt ledger noted, `npm run verify` documented |

## Full-suite evidence

- `node scripts/validate-skills.mjs` → `checked 26 skills, 0 failures`
- `node --test` → `22 pass / 0 fail`
- `getBootstrapContent()` → `5116 / 5120` bytes (budget gate holds)

## Deviations from plan (recorded)

- **Task 2 command:** `node --test tests/opencode/` (as first written) fails on
  Node 24 with `MODULE_NOT_FOUND` — the test runner treats the dir as a module.
  Used bare `node --test` (built-in discovery, portable to Node 20).
- **Task 6 routing:** only 14 bytes of bootstrap headroom remained, so a full
  router bullet could not fit. Wired STE two leaner ways: the existing output
  line now reads `(STE-lite, 30s budget, …)` and `communicating-concisely`
  links the skill. Net bootstrap `+10` bytes (5106→5116).

## Review round (requesting-code-review)

Dispatched `code-reviewer` + `security-reviewer` in parallel. Fan-in and
disposition:

| Finding | Source | Action |
|---|---|---|
| `SECRET_READ_RE` blocked benign prose (`git commit -m "remove cat .env"`) | code-reviewer #3 | **Fixed** — reader must start a simple command; benign cases now tested |
| `pathsFromPatch` missed `*** Move to:` | code-reviewer #4 | **Fixed** — pattern added + test |
| CHANGELOG linked a non-existent `v1.0.0` tag | code-reviewer #1 | **Fixed** — headings unlinked |
| STE test didn't assert the no-copy caveat | code-reviewer #2 | **Fixed** — added assertion |
| dead `continue` test element (`/tmp/../../`) | code-reviewer #7 | **Fixed** — removed; `..` bypass logged as D-001 |
| `$HOME`/`${HOME}`/glob, grep/sed/cp readers, in-band `#nosafety`, case/basename gaps, budget headroom | security #1–7 | **Deferred** — pre-existing, out of V1 scope; logged `docs/debt-ledger.md` D-001…D-005 |

Code-reviewer confirmed the V2 `apply_patch` arg is `patchText` (task 4
"confirm, don't guess" satisfied).

## Not done (out of V1 scope, tracked)

- Automated eval harness; cost/token telemetry (spike first); lifecycle skills
  (incident/postmortem, dependency-upgrade, threat-model, adr). Selected, deferred.
