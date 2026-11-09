# Progress — Free Pool Failover (Task 1)

## Goal

Pure explicit selector `resolveNextFreeLink(pool, failedId,
{ isDenied, isSecretLike, isCoolingDown })` → next pool id or `null`,
mirrored in `.opencode/plugins/sdlc-lean.js` and
`scripts/research/phase.mjs`. Orchestrator-called only; no hook wiring,
no auto-dispatch, no network, zero-dep, V1+V2 safe.

## Baseline

- Spec: `docs/specs/2026-11-08-free-model-resolver.md` (draft, plan-based work)
- Plan: `docs/plans/2026-11-09-free-pool-failover-progress.md` (this file)
- Allowed files: `.opencode/plugins/sdlc-lean.js`,
  `scripts/research/phase.mjs`, this progress file,
  `docs/plans/2026-11-09-free-pool-failover-evidence.json`
- Out of scope: tests (Task 3), docs (Task 4), `eval/lib/free-models.mjs`
  (reuse read-only), hook registrations (forbidden)

## TDD

- RED: `resolveNextFreeLink` absent in both files (grep across repo:
  no matches; `node --input-type=module` import check → `undefined`/`undefined`);
  `node --check` baseline → exit 0 (files parse, helper missing)
- GREEN: added pure `resolveNextFreeLink` to plugin
  (defaults reuse `isDeniedModel` / `isSecretLike`, cooling default false)
  and mirrored to phase (defaults reuse `isDeniedQuotaModel` /
  `SECRET_VALUE_RES` guard, cooling default false); both
  `resolveNextFreeQuotaLink` alias kept in sync; pool-order scan skips
  `failedId`, denied / secret-like / cooling candidates; invalid input
  and throwing predicates fail open to `null` (never throws); unwired
- Verify: `node --check .opencode/plugins/sdlc-lean.js && node --check scripts/research/phase.mjs` → exit 0,
  `CHECK_OK`; import smoke: both `function`; failed `crouton` → `beam`;
  skip denied/secret/cooling `beam` → `iceman`; exhausted/invalid/throwing → `null`;
  default denied `muse-spark` skipped → `beam` (UTC 2026-11-09)
- REFACTOR: none needed — implementation already minimal (pure, no hooks)

## TDD (Task 3, additive failover tests)

- RED: `tests/opencode/test-quota-failover.mjs` and
  `tests/scripts/research/test-phase-failover.mjs` absent (new files only;
  existing graders untouched). Tests specify: 429→429→success picks link3
  (`opencode-go/crouton-alpha-free`, 3rd pool link) via stub dispatch fn
  injection (no live network); exhaustion → stop+escalate with zero paid
  calls and `FALLBACK`/`QUOTA_FALLBACK`/`resolve*Fallback(null)` staying
  null without explicit session-model + cap+ask; secrets-never-free pinned
  (pool clean, secret-like candidates skipped/refused); paid-gated-by-approval
  pinned (denied/paid rejected, explicit safe session resolves).
- GREEN: added both additive test files against done impl
  (`resolveNextFreeLink`/`resolveNextFreeQuotaLink`, `advanceQuotaOn429`,
  quota/fallback/secret helpers) with stub dispatch + cooling-set injection.
- Verify: `node --test tests/opencode/test-quota-failover.mjs tests/scripts/research/test-phase-failover.mjs`
  → 8 tests, 8 pass, 0 fail, exit 0 (UTC 2026-11-09). `node --check` both
  test files → OK.
- REFACTOR: none needed — tests minimal, deterministic, no network.

## TDD (Task 4, failover docs)

- RED: `resolveNextFreeLink` absent in `.opencode/agents/orchestrator.md`
  (grep: no matches); routing described a manual pool walk (`On trigger:
  same model ... then next re-discovered free model, then BRAIN fallback`).
  Code/tests already done (Tasks 1-3).
- GREEN: one terse routing line in orchestrator.md — on 429 call
  `resolveNextFreeLink(pool, failedId, { isDenied, isSecretLike,
  isCoolingDown })` explicitly (replaces manual pool walk); `null` =
  exhausted → stop + escalate with cooldown entries, never a paid
  fallback; paid fallback still explicit-approval only (untouched line);
  perms unchanged, no model pins.
- Verify: `node scripts/validate-skills.mjs && npm run verify` → `checked
  40 skills, 0 failures`; `ℹ tests 676 / ℹ pass 676 / ℹ fail 0`, exit 0
  (UTC 2026-11-09T20:21:20Z).
- REFACTOR: none needed — single-line routing change.

## Tasks

- [x] #1 Runtime failover helper (no hook wiring) — done
  (verify: `node --check` both files, exit 0, UTC 2026-11-09)
- [x] #2 advanceQuotaOn429(ledger, failedRef): cooldown JSONL checkpoint note on 429 — done
  (verify: `node --check scripts/research/phase.mjs`, exit 0, UTC 2026-11-09;
   smoke: cooldown row strict ISO, circuit OPEN, half-open/probe left to next dispatch,
   stale discovery revalidation noted; no new store/network)
- [x] #3 Failover tests (additive only, no grader edits) — done
  (verify: `node --test tests/opencode/test-quota-failover.mjs tests/scripts/research/test-phase-failover.mjs`,
   8 pass, 0 fail, exit 0, UTC 2026-11-09; stub dispatch injection, no live
   network; existing graders untouched)
- [x] #4 Failover docs: explicit `resolveNextFreeLink` + exhaustion ladder in
  orchestrator routing (no code/tests) — done
  (verify: `node scripts/validate-skills.mjs && npm run verify`,
   checked 40 skills / 676 pass / 0 fail, exit 0, UTC 2026-11-09T20:21:20Z;
   perms intact, no model pins)

## Next

- None for this plan. Hook wiring remains forbidden — helpers stay
  orchestrator-called only.

## Residuals

- No auto-dispatch: BRAIN fallback stays an explicit orchestrator step;
  exhausted pool returns `null` (stop + escalate), never a paid fallback.
- Orchestrator routing now names the explicit `resolveNextFreeLink` call;
  cooldown entries recorded per 429; paid fallback only with explicit spend
  approval + cap + ask.
