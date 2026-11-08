# Progress — Free Model Resolver (Tasks 1-2)

## Goal

Pure ESM lib `eval/lib/free-models.mjs` (stdlib-only, no network): dynamic
free-model resolver with frozen fallback trio and TTL-cached fetch.

## Baseline

- Plan: `docs/plans/2026-11-08-free-model-resolver-progress.md` (this file)
- Task brief: `resolveFreeModels` + `getFreeModelsCached` + `FALLBACK_TRIO`
- Allowed files: `eval/lib/free-models.mjs`, this progress file,
  `docs/plans/2026-11-08-free-model-resolver-evidence.json`
- Out of scope: docs procedure (Task 3), phase.mjs/plugin/existing pins (Task 2 tests done)

## TDD

- RED: `node --check eval/lib/free-models.mjs` → exit 1, `MODULE_NOT_FOUND`
  (file did not exist)
- GREEN: created `eval/lib/free-models.mjs` (ESM, stdlib-only, no network)
- Verify: `node --check eval/lib/free-models.mjs` → exit 0; inline smoke suite
  covering prefix/cost shapes (incl. missing & partial cost)/denylist/
  tool_call variants/secret-like ids/empty-corrupt-throw fallback copy and
  TTL memo (no refetch within ttl, refetch after expiry, throw → trio) →
  `SMOKE OK`
- REFACTOR: none needed — implementation already minimal

## Tasks

- [x] #1 Implement `eval/lib/free-models.mjs` — done
  (verify: `node --check eval/lib/free-models.mjs`, exit 0, UTC 2026-11-08)
  + behavioral smoke `SMOKE OK`
- [x] #2 Add tests/eval/free-models.mjs — done
  (verify: `node --test tests/eval/free-models.mjs`, exit 0, 19 tests pass, UTC 2026-11-08)
- [x] #3 Dispatch procedure docs (additive) — done
  (created `docs/eval/dispatch-procedure.md`; appended property asserts to
  `tests/eval/free-models.mjs` only; verify: `node --test tests/eval/free-models.mjs`,
  exit 0, 26 tests pass / 0 fail, UTC 2026-11-08)
- [x] #4 Verify-only resolver gate — done (verify only, no code/tests/docs edits)
  (verify: `node --test tests/eval/free-models.mjs` exit 0, 26/26 pass;
  `npm run verify` exit 0, 631 pass / 0 fail; zero-dep confirmed (0 imports in
  lib, no dependencies in package.json); no network in unit (injected fetchers
  only); back-compat confirmed (frozen trio exact, trio fallback asserts pass,
  existing QUOTA_POOL pins untouched); spec draft status: none — plan-based
  work, no dedicated spec file under docs/specs/; UTC 2026-11-08)
- [x] #5 Fix muse BLOCKING + P1-P3 resolver guards — done
  (RED: 4 new tests fail — paid total/value leak, TTL opts stale, empty
  fallback [], truthy tool_call leak; GREEN: paid total/value veto in
  both-numbers branch, stable resolveOpts key + ttlMs staleness bound,
  fallback [] → trio, strict v===true + drop bare 'tools' alias;
  verify: `node --test tests/eval/free-models.mjs` exit 0, 30/30 pass;
  `npm run verify` exit 0, 631 pass / 0 fail; zero-dep preserved; UTC 2026-11-08)

## Next

None in scope (phase.mjs/plugin mirror change is follow-up, out of scope).


## Residuals closed/queued

- (a) Copilot mirror = build artifact; source of truth is repo `.opencode/`. Verify: installer copies `.opencode` -> global, never reverse (manifest-pruned; user files untouched).
- (b) Windows `O_NOFOLLOW ?? 0` = Linux-only guard; where `O_NOFOLLOW` is unavailable, fail-closed to realpath containment. Documented only; no code change here.
- (c) Spec approval queue (DO NOT approve here; user signs). Draft specs:
  1. `docs/specs/2026-10-31-photoreal-capabilities.md` — plan `docs/plans/2026-10-31-photoreal-capabilities.md`
  2. `docs/specs/2026-10-31-popup-autofill.md` — plan `docs/plans/2026-10-31-popup-autofill.md`
  3. `docs/specs/2026-11-08-lean-ui-open-design.md` — plan file not present yet (create first)
  4. `docs/specs/2026-11-08-tiered-ceo-lead-workers.md` — plan file not present yet (create first)
  Approve command shape (TTY, human only): `node scripts/spec-check.mjs approve <plan.md>` (add `--root <dir>` if needed). Machine variant: `node scripts/spec-check.mjs approve <plan.md> --machine --envelope <file>`. Close an active gate first: `node scripts/spec-check.mjs close`.

## History — prior custom evidence preserved (pre-close repair)

Prior `docs/plans/2026-11-08-free-model-resolver-evidence.json` used a custom
`status` shape and is preserved here only (not in close-format evidence):

- status: `DONE`; task: `5`; plan (as filed): `docs/plans/2026-11-08-free-model-resolver-progress.md`; lib: `eval/lib/free-models.mjs`
- spec_status (as filed): No dedicated spec file for this resolver under docs/specs/ (dated specs only; no docs/specs/spec.md). Base is the plan/progress file itself: docs/plans/2026-11-08-free-model-resolver-progress.md. Honest status: plan-based, spec draft = none found (not approved-spec backed).
- checks.zero_dep: PASS: eval/lib/free-models.mjs has 0 import statements (grep -c '^import/from' = 0), no network code (no fetch/http calls; only injected-fetcher params). package.json has no dependencies field (deps grep exit 1).
- checks.no_network_unit: PASS: tests/eval/free-models.mjs imports only node:test, node:assert/strict, and ../../eval/lib/free-models.mjs; all fetchers are inline async closures. No network in unit.
- checks.back_compat: PASS: FALLBACK_TRIO frozen and exact (opencode-go/crouton-alpha-free, opencode-go/beam-free, opencode-go/iceman-contributor-free); trio fallback asserts pass (empty/corrupt/all-filtered-out/custom/throw->trio, fresh copies, notStrictEqual vs frozen). Existing QUOTA_POOL/mirror pins untouched: resolver files contain no QUOTA_POOL reference (QUOTA_POOL grep exit 1); Tasks 1-2 tests (19) intact + 7 additive Task 3 property asserts + 4 muse guard fixes = 30 total.
- checks.guards: PASS: paid total/value veto in both-numbers branch; TTL bypassed when denylist/toolCallRequired/fallback differ (stable optsKey) with ttlMs staleness bound documented; fallback [] -> trio copy (never empty); tool_call strict v===true in capabilities/tools objects and bare 'tools' alias dropped (strict allowlist toolcall/toolcalls/toolcalling).
- verify rows (as filed, exit 0, at 2026-11-08): task 4 node --test tests/eval/free-models.mjs; task 4 npm run verify; task 4 zero-dep + no-network static check (import count 0 in lib; package.json no dependencies; unit imports node:test/node:assert/strict/local only; injected fetchers only); task 4 back-compat trio check (FALLBACK_TRIO frozen exact trio imported OK; trio fallback asserts pass within 26-test suite; existing pins untouched — no QUOTA_POOL edits, 19 Task 1-2 tests intact); task 5 node --test tests/eval/free-models.mjs detail 30/30 pass, 0 fail (26 prior + 4 muse guard tests); task 5 npm run verify detail lint + node --test 631 pass 0 fail.
- notes (as filed): Task 5 muse BLOCKING + P1-P3: RED 4 new tests fail (paid total/value leak, TTL stale, fallback [], truthy tool_call). GREEN: veto non-zero total/value, stable resolveOpts key + documented ttlMs staleness bound, fallback [] -> trio, strict v===true + drop bare 'tools'. Unit: 30/30 pass. Full verify: 631 pass 0 fail, exit 0. Non-sensitive: no secrets recorded.
- tests: tests/eval/free-models.mjs; scope (as filed): Allowed files only: eval/lib/free-models.mjs, tests/eval/free-models.mjs, docs/plans/2026-11-08-free-model-resolver-progress.md, docs/plans/2026-11-08-free-model-resolver-evidence.json. Out of scope: all else (no pin edits to quota pools).

Close-format repair note: evidence rewritten to close format with fresh UTC
re-runs `node --check eval/lib/free-models.mjs`, `node --test
tests/eval/free-models.mjs`, docs-procedure file check
(docs/eval/dispatch-procedure.md exists), and `npm run verify` exit 0.
