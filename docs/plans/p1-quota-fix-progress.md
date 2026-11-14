# P1 quota fix — progress / evidence

## Scope (allowed files only)
- `.opencode/plugins/sdlc-lean.js` (docs only)
- `scripts/research/phase.mjs` (docs only)
- `docs/plans/p1-quota-fix-progress.md` (this file)
No tests/**, eval/**, or grader edits. No new test file added (existing graders cover the exports).

## Task
Document `resolveFallback` fail-open null passthrough explicitly + caller cap-check note; verify quota export coverage (POOL, isSafeModel, resolveFallback, admits) via existing tests without editing graders.

## RED (gap found)
- `resolveFallback` null passthrough (fail-open) documented only in the function-header comment, not explicitly at the `return null` statement: sdlc-lean.js:1927, phase.mjs:1046.
- No caller cap-check note beside `admits` (sdlc-lean.js:1949): callers must gate dispatch on `admits({settled,outstanding,next,cap})`; the resolver never enforces cap.
- Export coverage: existing `tests/opencode/test-quota-tracker.mjs` asserts POOL (L25-27), isSafeModel via `isAllowedModel` alias (L36-40), resolveFallback (L29-57), admits (L59-91). `test-quota-failover.mjs` asserts `resolveFallback(null) === null` (L70-71). No `test-quota-dynamic-fallback.mjs` exists.

## GREEN (comment-only docs)
- sdlc-lean.js:1927 — added fail-open pass-through comment before `return null`.
- sdlc-lean.js:1949 — added caller cap-check note before `admits`.
- scripts/research/phase.mjs:1046 — added mirroring fail-open pass-through comment before `return null`.
Zero logic changes; no new exports; no secrets touched.

## Verification
- `node scripts/validate-skills.mjs` → EXIT 0 (checked 40 skills, 0 failures). WARN lines are pre-existing skill-body-size notes, not failures.
- `node --test tests/opencode/test-quota-tracker.mjs tests/opencode/test-quota-failover.mjs` → EXIT 0, 18 tests, 18 pass, 0 fail.

## Files touched
- `.opencode/plugins/sdlc-lean.js` (+2 comment blocks)
- `scripts/research/phase.mjs` (+1 comment block)
- `docs/plans/p1-quota-fix-progress.md` (created)

## Diff (relevant hunks)
sdlc-lean.js:
```
// Fail-open pass-through: unobservable/absent/empty session model yields
// null — the caller decides what to dispatch; no fallback model is endorsed.
  if (typeof model !== 'string' || model.trim() === '') return null;
```
// Caller cap-check: the orchestrator/dispatcher must gate on
// admits({ settled, outstanding, next, cap }) before sending; resolveFallback
// never enforces the cap — it only fails open (null pass-through) or closed
// (throw on unsafe model / account mismatch / unknown account).
export const admits = (input) => {
```
phase.mjs: same fail-open comment before `if (typeof model !== 'string' || model.trim() === '') return null;`

## Status
DONE — docs in place, lint 0, quota tests 18/18 pass.
