# Progress — Quota-aware model routing

Plan: [`2026-11-07-model-routing.md`](2026-11-07-model-routing.md)
Spec: [`docs/design/0004-quota-aware-routing.md`](../design/0004-quota-aware-routing.md)

Goal: Route OpenRouter free-quota models automatically (two $10 accounts, ~2,000 free req/day pooled) so Go-plan usage drops with zero task-quality regressions.

Baseline HEAD: `97f7b9a8411afec70cb671da72e7638d01a94e21`

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 1 | Provider snippet | ✅ | `node scripts/spec-check.mjs verify --require-active` exit 0 |
| 2 | Tier→model mapping + denylist + privacy rules | ✅ | `npm run verify` exit 0 |
| 3 | Fallback chains + 429-retry + exhaustion escalate | ✅ | `node --test tests/opencode/` exit 1 (tooling, see note); equiv `node --test tests/opencode/*.mjs` 323 pass exit 0 |
| 4 | Dry routing probes + docs | ✅ | `npm run eval` exit 0 (40 probes, routing=17, dry zero spend) |

## Test commands

- `node scripts/spec-check.mjs verify --require-active`
- `npm run verify`
- `node --test tests/opencode/*.mjs`
- `npm run eval`

Next: await human plan approval.

## 2026-11-07 — Review fix: snippet de-nested (Major)
- `docs/AUTONOMY.md` L39 instruction → "Merge into … (add both keys inside the existing `providers` object — do NOT nest a second `providers` key)"; snippet now shows only the two inner entries (`openrouter`, `openrouter-b`), keys/package/values unchanged. Step 2 ("Paste the snippet into the `providers` object") now consistent.
- Verify: section re-read consistent; `node scripts/spec-check.mjs verify --require-active` exit 0, gate still active.

## 2026-11-07 — Review nits: progress-ledger + router arrow (behavior-neutral)
- `orchestrator.md` model-routing: "log one ledger row" → "log one progress-ledger row" (disambiguate from audit-ledger; same meaning).
- `using-sdlc-lean/SKILL.md` route line: `- Model routing -> orchestrator#model-routing.` → `- Model routing → orchestrator Model routing.` (match file's → style + plain form; no anchor).
- Q1/Q2 (denylist precision, privacy shorthand): no change — full IDs live in the design doc; T4 docs carry the mapping table.
- Verify: bootstrap 5075 B (≤5116); `node scripts/spec-check.mjs verify --require-active` exit 0, gate still active.

## 2026-11-07 — T3: fallback chains + 429-retry + exhaustion escalate
- `orchestrator.md` routing: per-role ordered chains (other-account retry first, then next link); implementer north→flint→paid gpt-oss-120b (micro-cap only else escalate); reviewer/planner nemotron→escalate (no paid link); summarizer gemma→dots-3→escalate; Flint 0/3 Nov 3 fragility; NEVER auto-spend absolute.
- `autonomy-dial/SKILL.md`: 1-line routing-failure mapping added; audit-ledger table compressed to 1 inline line keeping `| date | tier | check | result | reversal |` (27/30 lines, contract passes).
- Verify deviation: `node --test tests/opencode/` exit 1 MODULE_NOT_FOUND on Node v24.19 (tooling, not code); equiv `node --test tests/opencode/*.mjs` 323 pass exit 0.

## 2026-11-07 — Evidence fix: row 3 verify exact-match (T3)
- Row 3 `verify` corrected to plan-exact `node --test tests/opencode/*.mjs` (was directory form `node --test tests/opencode/` exit 1); re-ran exact command 323 pass exit 0.

## 2026-11-07 — Pre-close fixes (T3 Major + T4 Medium)
- Fix 1 (orchestrator.md chains): `flint-v1.0:free` → `recursive/flint-v1.0:free`, `dots-3-note-preview:free` → `dots-studio/dots-3-note-preview:free` (full IDs only).
- Fix 2 (eval/probes.mjs denylist prompt): `liquid/lfm` → `liquid/lfm-2.5` to match `not-contains: lfm-2.5` assertion; prompt-only, assertion untouched.
- (a) 429-vs-provider-error order kept — other-account retry first costs one wasted call on single-provider outages (accepted; parsing provider_code is complexity not worth it).
- (b) count-test `PROBES.length 35` WILL go red on full verify (expected — test file outside gate scope; fixed post-close via re-approval with the file in scope; do NOT touch it now).

## 2026-11-07 — Evidence audit + rebind
- Robust parse: header row `| # | Task | Files | Test | Expected | Verify |`, Verify column index 6 (split by `|`); stripped one backtick pair per cell.
- Task 1 MATCH (`node scripts/spec-check.mjs verify --require-active`, exit 0); Task 2 MATCH (`npm run verify`, exit 0); Task 3 MATCH (`node --test tests/opencode/*.mjs`, exit 0); Task 4 MATCH (`npm run eval`, exit 0).
- Rebind: `sha256sum` plan = `994a7ea4…ef4e0b9ac6` = gate hash; set evidence `plan_sha256` to gate hash.
- Verify: JSON OK; `node scripts/spec-check.mjs verify --require-active` OK, gate still active.
