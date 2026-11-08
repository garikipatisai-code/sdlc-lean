# Progress — Free-first tracker

- Status: **CLOSED** (full-close 2026-11-08; residuals: Low TOCTOU local-only + manifestDir fallback accepted). Hardening pass 2026-11-08 (tracker residuals).

## Goal

Free-first quota-aware routing tracker per [`docs/design/0004-quota-aware-routing.md`](../../design/0004-quota-aware-routing.md).

## Task 1 RED (done)

- Spec: `docs/design/0004-quota-aware-routing.md`
- Test: `tests/opencode/test-quota-tracker.mjs`
- Gate: `node scripts/spec-check.mjs verify` → `no active spec gate` (exit 0)
- Allowed scope only: test + this progress file + `docs/plans/2026-11-08-free-first-tracker-evidence.json`; plugin, `phase.mjs`, other docs, existing tests untouched.
- Frozen vocabulary pinned in test:
  - pool exactly `console-openrouter/nvidia/nemotron-3.5-super-vl:free`, `console-openrouter2/nvidia/nemotron-3.5-super-vl:free`, `opencode-go/crouton-alpha-free`, `opencode-go/beam-free`, `opencode-go/iceman-contributor-free`
  - fallback exactly `opencode-go/muse-spark-1.3-contributor` (reject `opencode-go/muse-spark-1.3`, reject paid `openai/gpt-oss-120b`)
  - admission `settled+outstanding+next<=cap`
  - `429`/`provider-error` only (billing codes never trigger)
  - circuit `CLOSED`/`OPEN`/`HALF-OPEN`
  - `cooldown_until` strict `YYYY-MM-DDTHH:mm:ss.sssZ`
  - probe cheap `GET /api/v1/models` then tiny completion `max_tokens:1`, never paid probe
  - secret-like refused
- Helper under test (missing, expected RED): `scripts/quota-tracker.mjs` — does not exist; test imports it via `pathToFileURL`.
- RED verify: `node --test tests/opencode/test-quota-tracker.mjs` → exit 1 at `2026-11-08T01:48:03.750Z`
  - Output: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/appusai/Documents/Projects/sdlc-lean/scripts/quota-tracker.mjs' imported from /home/appusai/Documents/Projects/sdlc-lean/tests/opencode/test-quota-tracker.mjs`
  - Summary: `tests 1, pass 0, fail 1`
- Evidence: `docs/plans/2026-11-08-free-first-tracker-evidence.json` (file + exit only, non-sensitive)
- Next: GREEN implements `scripts/quota-tracker.mjs` to the test contracts above (separate task, out of scope here).

## Task 2 GREEN (done)

- Implementation: pure unwired exports added to `.opencode/plugins/sdlc-lean.js` (POOL, FALLBACK, isAllowedModel, assertAllowedModel, admits, classifyQuotaError/shouldTriggerFallback, CIRCUIT_STATES, isValidCooldownUntil/assertValidCooldownUntil, PROBE_STEPS, PAID_PROBE_ALLOWED, isSecretLike/assertNotSecretLike, transitionCircuit aliases, checkQuotaTrackerGate aliases).
- Test import updated to plugin module (allowed file).
- No hooks call helpers; bootstrap bytes unchanged.
- GREEN verify: `node --test tests/opencode/test-quota-tracker.mjs` → exit 0 (8/8).
- Gate: `node --test tests/opencode/test-ux-hooks.mjs tests/opencode/test-plugin-loading.mjs` → exit 0 (23/23).

## Task 3 ledger integration (done)

- Scope (allowed files only): `scripts/research/phase.mjs`, `tests/scripts/research/test-quota-tracker.mjs`, this progress file, evidence JSON. Plugin/docs/hooks/schema top-level fields unchanged.
- `phase.mjs`: quota allowlists (pool+fallback models, accounts, circuit states) added; `recordCheckpoint` reuses `isSecretKey`/usage validation, blocks secrets in notes, validates cooldown checkpoint-note JSONL (`{"type":"cooldown","model","account","cooldown_until","circuit":"OPEN"}` strict ISO8601). `launchGate`/`exceededLimit` remain sole gate (`limit-exceeded` at cap, no auto-extend). `beginDispatch` accepts optional `model`/`account` (allowlisted strings, strict when present, additive), records/returns them. `validateDispatch`/`BRIEF_KEYS`/`validateBrief`/`buildHandoff` accept and carry `model`/`account` additively and strictly. `assertDelegationWithin` unchanged (narrow-only). `assertNoSecrets` blocks secret-like values on free-model record paths.
- Verify (RED→GREEN): `node --test tests/scripts/research/test-quota-tracker.mjs` → exit 0 (7/7); `node --test tests/scripts/research/test-phase.mjs` → exit 0 (28/28). Required check: `node --test tests/scripts/research/test-quota-tracker.mjs && node --test tests/scripts/research/test-phase.mjs` → exit 0.

## Task 4 docs (done)

- Scope (allowed files only): `.opencode/agents/orchestrator.md`, `docs/AUTONOMY.md`, `docs/verify-recipe.md`, `.opencode/skills/autonomy-dial/SKILL.md`, this progress file, evidence JSON. Out-of-scope untouched: `using-sdlc-lean/SKILL.md`, other agents, plugin, `phase.mjs`, `eval/*`.
- RED: frozen pool / contributor fallback / admission / cooldown / probe / `HALF-OPEN` / narrow-only strings absent in all 4 docs (grep missing).
- GREEN: frozen 5-ID pool + fallback exactly `opencode-go/muse-spark-1.3-contributor` (reject `opencode-go/muse-spark-1.3`, paid `openai/gpt-oss-120b`); `429`/`provider-error` only; circuit `CLOSED`/`OPEN`/`HALF-OPEN` + cheap probe `GET /api/v1/models` then `max_tokens:1` (never paid); admission `settled+outstanding+next<=cap` with onCap block + ask user for extension + escalate (never auto-extend/spend); `cooldown_until` JSONL strict `YYYY-MM-DDTHH:mm:ss.sssZ`; per-dispatch ledger row; delegation narrow-only; secrets NEVER to free. Prior north/gemma pins retired.
- Constraints: `autonomy-dial` kept <=30 lines (27), bootstrap untouched (<5120B, verify via `npm run verify`).
- Verify: `npm run verify` → exit 0 (skill lint + `node --test`).

## Task 5 close + evidence (done)

- No active spec gate: `node scripts/spec-check.mjs verify --require-active` → exit 2 (inactive); recorded honestly; verification run without flag → exit 0.
- Evidence: `docs/plans/2026-11-08-free-first-tracker-evidence.json` updated to `{plan, plan_sha256, tasks:[{task, verify, exit:0, at}]}`.
- Allowed files only: this progress file + evidence JSON. No code/docs/tests/gate edits.

## Task table (spec-check parsePlanTasks)

| # | Task | Verify |
|---|---|---|
| 1 | RED | `node --test tests/opencode/test-quota-tracker.mjs` |
| 2 | GREEN | `node --test tests/opencode/test-quota-tracker.mjs && node --test tests/opencode/test-ux-hooks.mjs tests/opencode/test-plugin-loading.mjs` |
| 3 | ledger integration | `node --test tests/scripts/research/test-quota-tracker.mjs && node --test tests/scripts/research/test-phase.mjs` |
| 4 | docs | `npm run verify` |
| 5 | close + evidence | `node scripts/spec-check.mjs verify` |

## Full-close (2026-11-08)

- Drift note: `587` is the current post-tracker count (tracker Task4 added docs);
  game-dev `572` was the pre-tracker baseline.
- Spec 3-vs-4: 4 babylon refs pre-exist (Oct30) satisfy the photoreal spec; the
  3 `web-*` refs are separate game-dev scope (multiplayer/rigor/asset-pipeline).
- Refs `NO_ROUTE`: intentional to preserve the SKILL 154/155 cap; discoverable
  via `references/` on-demand; no route needed.
- Task 3: `PASS@16.67ms` / `FAIL@1ms` expected split (green).
- Residuals: symlink/containment fix landed 2026-11-08 (asset-audit self-test 8/8 exit 0; perf-gate PASS@16.67 exit 0 / FAIL@1 exit 1 / symlink exit 2; quota 8/8). Remaining accepted residual (Low, local-only): TOCTOU concurrent writer (not blocking in CI) + manifestDir fallback question. Otherwise none.

## Hardening pass (tracker residuals, 2026-11-08)

- admits() NaN fail-closed: non-finite settled/outstanding/next/cap (and non-object
  input) now return false instead of coercing to 0; string numbers still convert
  via Number(); NaN results rejected. File: .opencode/plugins/sdlc-lean.js (admits).
- asset-audit manifestDir realpath fallback (scripts/asset-audit.mjs:149-154):
  decision = ACCEPTED / intentional for portability. On realpath failure of
  manifestDir, falls back to the lexical manifestDir so audits still run in
  environments where realpath is unavailable; per-asset realpath + traversal check
  (lines 142-158) remains strict fail-closed. TOCTOU accepted Low (local-only,
  non-blocking in CI). No FS logic changed here (out of scope).
- TOCTOU concurrent writer: accepted Low, local-only, non-blocking in CI. No
  change.
- Secret-pattern scope: plugin `isSecretLike` is a token-shape heuristic only
  (.opencode/plugins/sdlc-lean.js, SECRET_PATTERNS); phase.mjs uses the stricter
  SECRET_VALUE_RES + isSecretKey key-name guard. Patterns intentionally differ
  (best-effort, not a guarantee); no pattern changes to avoid breakage.
- Vocab duplication: intentionally retained (POOL/FALLBACK/CIRCUIT_STATES in
  plugin vs QUOTA_POOL/QUOTA_FALLBACK/QUOTA_CIRCUIT_STATES in phase.mjs) to avoid
  shared-module coupling across V1/V2; both files now carry a VOCAB MIRROR
  comment; tests pin both copies (tests/opencode/test-quota-tracker.mjs and
  tests/scripts/research/test-quota-tracker.mjs). No refactor to shared module.

## Muse Medium fix (spend/secret/ledger, 2026-11-08)

- Spend accrual (phase.mjs): `beginDispatch`/`settleDispatch`/`reconcileDispatch` accept optional `usage` delta (validated, applied to phase+cumulative usage); `assertNoSecrets` on dispatch `description` at begin and on `evidence`/`failure` at settle/reconcile. `launchGate`/`exceededLimit` remain the sole gate; usage accrual makes it effective (N dispatches with `usage` trip `limit-exceeded` without checkpoint). `admits()` stays unwired (D-011). Files: `scripts/research/phase.mjs`.
- Secrets (plugin): `SECRET_PATTERNS` aligned additively with phase `SECRET_VALUE_RES` shapes — added `Bearer` token, `-----BEGIN [A-Z ]*PRIVATE KEY-----`, `github_pat_`. File: `.opencode/plugins/sdlc-lean.js`.
- Ledger IO containment (phase.mjs): `readJsonState`/`atomicWrite` use lstat symlink refusal, `O_NOFOLLOW`+`fstat` (regular-file verified) and realpath resolution (copy perf-gate hardening pattern; cwd containment best-effort for library paths). Symlink paths rejected.
- Circuit (plugin): `transitionCircuit` returns `OPEN` for unknown states (EVIL → not `CLOSED`); aliases unchanged.
- Verify (TDD RED→GREEN): `node --test tests/scripts/research/test-quota-tracker.mjs` → exit 0 (12/12). `node --test tests/opencode/test-quota-tracker.mjs` → exit 0 (13/13). Regression: `node --test tests/scripts/research/test-phase.mjs` → exit 0 (28/28). Allowed files only; zero-dep, fail-open on unobservable paths preserved, narrow delegation unchanged.
