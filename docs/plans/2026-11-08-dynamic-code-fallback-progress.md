# Progress — Dynamic code fallback (Task 1: session-model resolver, no hardcode)

- Status: **TASK 1 DONE (implementer)**. Task 2/3 owners must update test pins (re-approval gate).
- Spec: `docs/specs/2026-11-08-dynamic-code-fallback.md` **MISSING** — deviation recorded honestly; not created (out of scope per brief).
- Plan: `docs/plans/2026-11-08-dynamic-code-fallback-progress.md` was missing before this edit; created here as the allowed progress ledger.
- Allowed files touched only: `.opencode/plugins/sdlc-lean.js`, `scripts/research/phase.mjs`, this file, `docs/plans/2026-11-08-dynamic-code-fallback-evidence.json`. Tests untouched (Task 3 owns pins). Bootstrap untouched.

## Implementer choice (spec missing → brief as contract, recorded here)

`FALLBACK`/`QUOTA_FALLBACK` was hardcoded to a named contributor model. That literal is removed (`null`). Callers now pass the session model+account explicitly at dispatch time. "Allowlisted" means: frozen `POOL` membership, OR a qualified session model whose account/prefix is allowlisted, with correct variant, and not denylisted. Denylist keeps bare IDs only (`gpt-oss-120b`): guards, not endorsements.

- Plugin exports (mirrored in phase with `QUOTA_` prefix): `POOL` (unchanged), `FALLBACK=null`, `ACCOUNTS`, `DENYLIST=['gpt-oss-120b']`, `isQualifiedModelId`, `isDeniedModel`, `isSafeModel`, `isAllowedModel` (= `isSafeModel`), `resolveFallback(sessionModel, account)` + `resolveDynamicFallback` alias.
- Phase mirrors: `QUOTA_FALLBACK=null`, `QUOTA_DENYLIST`, `isQualifiedQuotaModelId`, `isDeniedQuotaModel`, `isSafeQuotaModel`, `resolveQuotaFallback` + alias. `QUOTA_ALLOWED_MODELS` is now pool-only; `validateQuotaModel` delegates to the safe predicate so dispatch/handoff records round-trip.
- `isQualifiedModelId`: requires `provider/model` (no bare IDs like `gpt-oss-120b`), non-empty provider + model root, no whitespace/`//`. Variant where required: `console-openrouter*` must end `:free`; `opencode-go` must end `-free`/`-contributor`. Other providers fail the account allowlist.
- `isDeniedModel`: bare ID (after last `/`, before `:`) exact match, case-insensitive, against `gpt-oss-120b`.
- `resolveFallback`: unobservable session (`null`/absent/empty/non-string model) → `null` (fail-open, pass-through preserved). Observable-but-unsafe → throw (`not-allowed/unknown-model`; phase uses `invalid-ledger`). Explicit account must match prefix and be allowlisted; otherwise account is derived from prefix.
- Constraints: zero-dep (pure string checks, no new imports), V1+V2 safe (pure unwired exports, no hooks touched), mirrors kept in sync (plugin ⇄ phase).

## TDD

- RED: `node --input-type=module -e "...assert FALLBACK===null, resolveFallback/resolveQuotaFallback exist..."` → exit 1, `actual: 'opencode-go/muse-spark-1.3-contributor', expected: null` (hardcoded fallback, resolver missing). No test file created (out of scope; probe only).
- GREEN: after edits, same probe family passes (`PROBE_OK`): unobservable → `null`; pool/session safe IDs → `{model, account}`; bare/denylisted/missing-variant/mismatched-account → throw (both files).
- Checks: `node --check .opencode/plugins/sdlc-lean.js && node --check scripts/research/phase.mjs` → OK. `grep muse` in both allowed files → no hits (endorsement literal removed; denylisted bare-ID guard retained).

## Verification (honest: one expected pin failure)

- `node --test tests/opencode/test-quota-tracker.mjs` → exit 1, 13/14 pass. Sole failure: `fallback is exactly muse-spark-1.3-contributor` at line 29 (`actual null` vs pinned string). **Not edited** — Task 3 owns re-pinning behind re-approval gate. No other pin broke: pool, bare-ID, paid, circuit, probe, secret, admission assertions still hold.
- `node --test tests/scripts/research/test-quota-tracker.mjs` → exit 0, 14/14 pass (mirror sync holds: both `FALLBACK`/`QUOTA_FALLBACK` are `null`).
- `node --test tests/scripts/research/test-phase.mjs` → exit 0, 28/28 pass.
- Evidence: `docs/plans/2026-11-08-dynamic-code-fallback-evidence.json` (file + exit only, non-sensitive, no secrets).

## Task 2 (additive guard tests)
- Added `tests/opencode/test-dynamic-fallback.mjs` and `tests/scripts/research/test-dynamic-fallback.mjs`.
- Coverage: session-model resolve (allowlisted → returned; bare → throw; paid denylist → throw; unknown account → throw/fail-open), cap accounting with dynamic identity, stale/paid denial, secret redaction, fail-open unknown/undefined.
- Verify: `node --test tests/opencode/test-dynamic-fallback.mjs tests/scripts/research/test-dynamic-fallback.mjs` → exit 0, 18/18 pass.
- Non-sensitive: no secrets; secret-like values constructed at runtime only.

## Task 3 (convert exact-pin assertions to property checks, strengthening only)
- `tests/opencode/test-quota-tracker.mjs`: removed exact `EXPECTED_FALLBACK` muse pin and frozen fallback-equality; replaced with property checks: `FALLBACK===null`, resolver exists + unobservable→`null`, pool/session round-trip `resolveFallback`→`{model,account}` + `isAllowedModel`, denylist rejection (bare `opencode-go/muse-spark-1.3`/`gpt-oss-120b`, paid `openai/gpt-oss-120b`/`console-openrouter/gpt-oss-120b:free`) via `isAllowedModel`/`assertAllowedModel`/`resolveFallback`/`isDeniedModel`, no-muse-literal (no hardcoded endorsement). Pool frozen deepEqual retained (unchanged behavior). No weakening; paid/bare rejections kept/expanded.
- `tests/scripts/research/test-quota-tracker.mjs`: strengthened mirror test with `QUOTA_FALLBACK===null`, resolver + fail-open, pool round-trip + `isSafeQuotaModel`, denylist/bare/paid throws + `isDeniedQuotaModel`.
- TDD note: impl (Task 1/2) already in place; tests converted to match approved dynamic behavior (former exact pin was the known expected failure) and strengthened.
- Verify: `node --test tests/opencode/test-quota-tracker.mjs tests/scripts/research/test-quota-tracker.mjs tests/opencode/test-dynamic-fallback.mjs tests/scripts/research/test-dynamic-fallback.mjs tests/scripts/research/test-phase.mjs` → exit 0, 74/74 pass. `grep EXPECTED_FALLBACK|muse-spark-1.3-contributor` in both quota-tracker test files → no hits.
- Non-sensitive. No scope growth; only allowed files touched.

## Task 4 (verify-only, no code/test edits)
- Ran `node scripts/validate-skills.mjs` → exit 0 (40 skills, 0 failures).
- Ran `npm run verify` → exit 0 (660 pass, 0 fail; bootstrap ≤5116 enforced by existing `tests/opencode/test-plugin-loading.mjs: bootstrap stays within the 5KB budget`, covered by `npm run verify`).
- Spec draft status: `docs/specs/2026-11-08-dynamic-code-fallback.md` **MISSING** — checked, not created (out of scope per brief).
- Evidence: `docs/plans/2026-11-08-dynamic-code-fallback-evidence.json` (task4_verify rows, exit 0, at 2026-11-08T21:59:19Z, non-sensitive).
- Allowed files only touched: this file + evidence json. No code/tests edited (verify only).

## Muse audit fix — HIGH paid leak + LOW stale TTL (TDD)
- HIGH: `isDeniedModel`/`isDeniedQuotaModel` normalized before check — bare after last `/`, strip `:variant` and trailing `-free`/`-contributor`, lowercase, exact-match against `['gpt-oss-120b','muse-spark','muse-spark-1.3']`; any id containing `gpt-oss` → deny (paid family, any suffix). No `startsWith` (too broad). Only `-free`/`-contributor` stripped; `-pro`/`-flash`/… stay in base and fail closed as unknown unless allowlisted. `DENYLIST`/`QUOTA_DENYLIST` expanded mirrored. Resolver still returns identity only; paid allowed ONLY with cap+ask (cap at dispatch, not resolver).
- LOW: TTL/staleness — code comment added in both files (mirrored): free discovery cached for discovery only, bound 60s default; caller must revalidate `isFree()` (`isSafeModel`/`isSafeQuotaModel`) immediately before dispatch/`beginDispatch` — dispatch validates separately (`validateQuotaModel`) and never trusts stale discovery. No behavior change, no new imports, no hooks touched.
- Tests: added suffixed-paid + TTL-documented cases to both dynamic-fallback suites (`muse-spark-1.3-contributor`, `gpt-oss-120b-free`, `opencode-go/gpt-oss-120b-free` → denied + `isSafe*` false + resolver throws; source comment asserts `revalidate`/`beginDispatch`/`60s`/`discovery`). RED confirmed (both new tests failed pre-fix), GREEN after.
- Verify: `node --test tests/opencode/test-quota-tracker.mjs tests/scripts/research/test-quota-tracker.mjs tests/opencode/test-dynamic-fallback.mjs tests/scripts/research/test-dynamic-fallback.mjs tests/scripts/research/test-phase.mjs` → exit 0, 78/78 pass. `node --check` both impls OK. `npm run verify` → exit 0, 664/664 pass (was 660; +4 new). Non-sensitive. Allowed files only (impls + 2 dynamic tests + this file).

## Muse re-check — 2 non-blocking denylist hardenings (TDD)
- 1. `gpt-oss` containment scoped to bare model id: compute `bare` after last `/` first, then `bare.includes('gpt-oss')` (was full-id includes incl. account prefix). Both `isDeniedModel` (plugin) and `isDeniedQuotaModel` (phase) mirrored.
- 2. Loop-strip stacked suffixes: `replace(/(-(free|contributor))+$/,'')` instead of single `-(free|contributor)$` strip. Both files mirrored.
- Tests: added stacked-suffix (`muse-spark-1.3-contributor-free` → denied, incl. prefixed) + account-prefix non-interference (`gpt-oss-foo/beam-free` NOT denied; canonical `opencode-go/beam-free` stays safe) to both dynamic-fallback suites. RED confirmed (both suites: 2 new tests failed pre-fix), GREEN after.
- Verify: same 5-file suite → exit 0, 82/82 pass (was 78; +4). `node --check` both impls OK. `npm run verify` → exit 0, 668/668 pass (was 664; +4). Non-sensitive. Allowed files only.
