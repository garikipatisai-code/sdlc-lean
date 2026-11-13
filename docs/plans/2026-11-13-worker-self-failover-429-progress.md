# Progress — Worker Self-Failover 429 (Task 1–5)

## Goal

Explicit pure fail-open `onWorkerQuotaError(pool, failedId, opts) → {nextLink:string|null, cooledUntil:string|null, escalated:boolean}` in `.opencode/plugins/sdlc-lean.js`. 429/provider-error only (via classifyQuotaError); non-429 → `{nextLink:null, cooledUntil:null, escalated:false}` with no cooldown, no spend. Pool-order walk skips failedId and any denied/secret-like/cooled-down candidate (reuse resolveNextFreeLink + isSafeModel/isDeniedModel/isSecretLike defaults); exhaustion → `escalated:true` + strict-ISO `cooledUntil`. Invalid pool/predicates → null fail-open, never throws. No hooks, plain named export, zero-dep, V1+V2 identical.

Task 2 (cooldown store reuse, no new store): phase.mjs `advanceQuotaOn429` + `validateCooldownNote` (strict UTC cooldown_until, circuit OPEN) + `resolveQuotaFallback` (null for absent/empty session model) + `isSafeQuotaModel` revalidate all exist and are reused as-is; cooldown persists as a checkpoint JSONL note in the existing phase ledger — no new persistent store. Plugin `onWorkerQuotaError` accepts the caller-injected `isCoolingDown` (reads `cooldown_until`; unreadable → not cooling, fail-open), default 5m cooldown, `PAID_PROBE_ALLOWED=false` so the `completion max_tokens:1` probe is never paid, HALF-OPEN free-only; `isSafeModel` is the stale free-pool revalidation gate (pool entries are allowlisted, so the helper path needs no extra code). No code was missing — verified by grep + regression tests; record reuse, no-op honestly.

## Basis

- Spec: `docs/design/0004-quota-aware-routing.md` (accepted; routing + UI tracks to implementation plans; plugin runtime routing is a non-goal — no model-selection hook exists).
- Plan: `docs/plans/2026-11-13-worker-self-failover-429-progress.md` (this file).
- Allowed files ONLY: `scripts/research/phase.mjs`, `.opencode/plugins/sdlc-lean.js`, this progress file,
  `docs/plans/2026-11-13-worker-self-failover-429-evidence.json`.
- Out of scope: tests (Task 4), all else. No hook wiring, no new store.

## Decision

Explicit helper over a hook/watchdog: per 0004, session/tool hooks carry no model or worker identity (the event carries tool/input only), so a hook cannot know which worker failed or which pool link to hand back. An explicit orchestrator-called helper (same convention as `resolveNextFreeLink`/`transitionCircuit`) preserves identity; hooks stay unwired.

Task 2 decision: reuse the existing cooldown seam — `advanceQuotaOn429` writes the cooldown as a checkpoint JSONL note (validated by `validateCooldownNote`, strict UTC `cooldown_until`, circuit `OPEN`) into the existing phase ledger; no new persistent store. `onWorkerQuotaError` reuses `resolveNextFreeLink` with caller-injected `isCoolingDown` (default not-cooling → fail-open when `cooldown_until` is unreadable), `DEFAULT_COOLDOWN_MS` 5m, `PAID_PROBE_ALLOWED=false` (probe `completion max_tokens:1` never paid, HALF-OPEN free-only), and `isSafeModel`/`isSafeQuotaModel` as the stale free-pool revalidation gate. No code was missing — verified by grep + regression tests; record reuse, no-op.

## TDD

- RED: `require('./.opencode/plugins/sdlc-lean.js').onWorkerQuotaError` → `undefined` (helper missing).
- GREEN: added pure `onWorkerQuotaError` to the plugin next to `resolveNextFreeLink`. Behavior pinned:
  - 429 `pool[0]` → `pool[1]`; second 429 (pool[0]+pool[1] cooling) → `pool[2]`; walk to exhaustion → `{nextLink:null, escalated:true, cooledUntil:<strict-ISO>}`.
  - non-429 → `{nextLink:null, cooledUntil:null, escalated:false}` (no cooldown, no spend).
  - invalid pool / non-object opts / throwing predicates → fail-open shape, never throws.
  - candidates validated via defaults (`isDeniedModel`/`isSecretLike`); paid/denied/secret skipped.
- Verify: `node -e "const p=require('./.opencode/plugins/sdlc-lean.js');console.log(typeof p.onWorkerQuotaError)"` → `function` (UTC 2026-11-13T19:21:00Z).
- Verify: `node --test tests/opencode/test-quota-failover.mjs` → 4 pass, 0 fail, exit 0 (existing regression, graders untouched).
- Verify: `npm run verify` → `npm run lint && npm run test` → ℹ tests 676 / ℹ pass 676 / ℹ fail 0, exit 0 (UTC 2026-11-13T19:21:00Z).
- REFACTOR: none needed — ~30 lines, pure, additive named export, no hook changes.
- Task 2 RED/GREEN: no implementation gap — `advanceQuotaOn429`/`validateCooldownNote`/`resolveQuotaFallback`/`isSafeQuotaModel` (phase.mjs) and `onWorkerQuotaError` + `isSafeModel`/`PAID_PROBE_ALLOWED=false`/`DEFAULT_COOLDOWN_MS` 5m (plugin) all present; cooldown is a checkpoint note (existing ledger, no new store). RED (gap) = none; GREEN = existing regression tests pass.
- Verify Task 2: `grep -q "advanceQuotaOn429" scripts/research/phase.mjs` → REUSE_OK; `node --test tests/scripts/research/test-phase-failover.mjs` → 4 pass; `node --test tests/opencode/test-quota-failover.mjs` → 4 pass; evidence JSON valid; `npm run verify` → lint + tests pass, exit 0.

## Tasks

- [x] #1 Worker self-failover helper `onWorkerQuotaError` (no hook wiring)
  (verify: typeof check → `function`; `node --test tests/opencode/test-quota-failover.mjs` → 4 pass; `npm run verify` → 676 pass / 0 fail, exit 0, UTC 2026-11-13T19:21:00Z)
- [x] #2 Cooldown store reuse, no new store (Task 2)
  (verify: `grep -q "advanceQuotaOn429" scripts/research/phase.mjs` → REUSE_OK; phase.mjs `advanceQuotaOn429`+`validateCooldownNote`+`resolveQuotaFallback`+`isSafeQuotaModel` reused as-is, no new persistent store; plugin `onWorkerQuotaError` accepts injected `isCoolingDown` (unreadable `cooldown_until` → not cooling, fail-open), default 5m, `PAID_PROBE_ALLOWED=false` (max_tokens:1 probe never paid, HALF-OPEN free-only), `isSafeModel` revalidation gate present; `node --test tests/scripts/research/test-phase-failover.mjs` → 4 pass; evidence JSON valid; `npm run verify` → pass, exit 0)

- [x] #3 429-only trigger scope (Task 3)
   (verify: `grep -q "classifyQuotaError" .opencode/plugins/sdlc-lean.js` → SCOPE_OK; classifyQuotaError status 429 / provider-error sole trigger; non-429 → onWorkerQuotaError {nextLink:null, cooledUntil:null, escalated:false} (no cooldown, no spend); billing codes never trigger; paid fallback only via resolveFallback explicit session model (QUOTA_FALLBACK/FALLBACK null); exhaustion → stop+escalate zero paid; `node --test tests/opencode/test-quota-failover.mjs` → 4 pass; `npm run verify` → pass, exit 0)

- [x] #4 Worker self-failover 429 tests (Task 4, stubbed dispatch, no live network) — DONE (fix round: stale-pool revalidation gate)
  (verify: `node --test tests/opencode/test-worker-self-failover-429.mjs` → tests 3, pass 3, fail 0, exit 0; `node --test tests/opencode/test-quota-failover.mjs tests/scripts/research/test-phase-failover.mjs` → tests 8, pass 8, fail 0, exit 0; `npm run verify` → lint pass, tests 679 pass / 0 fail, exit 0 (UTC 2026-11-13T19:32:34Z). Fix: `resolveNextFreeLink` (+ `onWorkerQuotaError` via delegation) in `.opencode/plugins/sdlc-lean.js` and mirror in `scripts/research/phase.mjs` now skip candidates failing `isSafeModel`/`isSafeQuotaModel` (stale-pool revalidation); fail-open null on exhaustion, never throws. Graders untouched. Free-only; no secrets.)

- [x] #5 Self-failover finalize docs + confirm verify (no source edits) — DONE clean (critics DONE)
  (verify: `npm run verify` → ℹ tests 679 / ℹ pass 679 / ℹ fail 0, exit 0; `node --test tests/opencode/test-worker-self-failover-429.mjs` → tests 3, pass 3, fail 0, exit 0; `node --test tests/opencode/test-quota-failover.mjs tests/scripts/research/test-phase-failover.mjs` → tests 8, pass 8, fail 0, exit 0; `grep -rn "^model:" .opencode/agents/` → NO_STATIC_PINS; GATE_OK UTC 2026-11-13T19:33:24Z. No source edits; allowed files only progress + evidence; hashes 9cbe885,99f84f1; no secrets; free-only; ledger model=opencode-go/beam-free account=opencode-go. Critics: code ses_e29991f19 no blocking (3 minor nits: provider-error wording, Date.now clamp, evidence require→import); security ses_e29991f14 clean (F1 paid leak no path, F2 secret no path, F3 cap low-info admits unwired pure selector free-only escalated, F4 hook N/A; prior F1/F2 remain closed).)

## Critics (re-critic closeout)

- Code `ses_e29991f19`: no blocking; 3 minor nits — provider-error wording, `Date.now` clamp, evidence `require`→`import`. (non-blocking)
- Security `ses_e29991f14`: clean — F1 paid leak no path, F2 secret no path, F3 cap low-info (admits unwired but pure selector free-only escalated), F4 hook N/A. Prior F1/F2 remain closed.
- Verify basis: 679/679, 3/3, 8/8, NO_STATIC_PINS, GATE_OK 19:33:24Z.
- Phase ready to close/push.

## Next:

- Ready to close/push (no further code).

## Residuals

- No cooldown store exists here; cooldown is a checkpoint JSONL note in the existing phase ledger (`advanceQuotaOn429` + `validateCooldownNote`, circuit `OPEN`, strict UTC `cooldown_until`) — no new persistent store. The caller injects `isCoolingDown` (reads `cooldown_until`; unreadable → not cooling, fail-open). `cooledUntil` is a strict-ISO future timestamp on escalation only.
- Free-only: no paid fallback, no spend, no auto-dispatch. `PAID_PROBE_ALLOWED=false`; probe `completion max_tokens:1` is free-only; `isSafeModel`/`isSafeQuotaModel` revalidate before any reuse.

## Terminal note — superseded session (ledger only; no source edits)

- ses_e29eee2f1ffemtbtlp5n44obOt (longcat Task 4 verify) terminal: state error, "Rate limit exceeded. Please try again later." Superseded by ses_e29e50418 beam PASS (single Task 4 row 18:11:15Z). No retry (work complete via failover). No duplicate evidence rows. Longcat cooldown OPEN.
- Verify basis unchanged: 679/679, 3/3, 8/8, NO_STATIC_PINS, GATE_OK 19:33:24Z. Critics clean.
- Ledger: model=opencode-go/beam-free account=opencode-go. Free-only; no secrets.
