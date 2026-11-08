# Deep-research upgrade — progress

- Spec: `docs/specs/2026-11-08-deep-research-upgrade.md` — missing at start; not created per brief. This file is the progress log.
- Plan: `docs/plans/2026-11-08-deep-research-upgrade-progress.md` (this file)
- Evidence: `docs/plans/2026-11-08-deep-research-upgrade-evidence.json`
- Scope of this task: Task 1 research upgrade (cap-safe) only.
- Allowed: `SKILL.md`, `source-quality.md`, `retrieval-quality.md`, this file + evidence JSON. No other files, no backend, no test edits.

## Task 1 RED->GREEN (cap-safe)

- RED (baseline gate): `node --test tests/opencode/test-brain-skills.mjs` → 19/19 pass at 104 lines; `node scripts/validate-skills.mjs` → 40 skills, 0 failures. A naive multi-line addition would exceed the 105 cap; detail must move out.
- GREEN:
  - Created `.opencode/skills/deep-research/references/retrieval-quality.md`: diversity (independent domains/types, syndication as one source, ~one-third domain cap with named exception), freshness (date-check, ≤12mo for fast-moving, vintage note for slow-moving, undated = leads only), canonical-URL dedup stdlib `new URL` rules (no deps): lowercase scheme/host, drop default ports, strip fragment + tracking params (`utm_*`, `fbclid`, `gclid`, `msclkid`, `mc_*`, `_ga`), sort remaining params, strip trailing `/` except root, `url.href` as key, earliest citation wins.
  - Edited `.opencode/skills/deep-research/SKILL.md` (+1 net line, 104→105): new Search bullet — diversity + freshness + canonical URL (stdlib URL rules, no deps) → `references/retrieval-quality.md`; §4 line amended `Dedupe by URL` → `Dedupe by canonical URL` (no line change).
  - `source-quality.md` untouched (lean minimum; freshness red-flag already there, retrieval detail lives in the new file).
- Verify: `node --test tests/opencode/test-brain-skills.mjs` → 19/19 pass; `node scripts/validate-skills.mjs` → 40 skills, 0 failures; `wc -l SKILL.md` → 105 (cap 105); `citation-check.md` count → 1; `retrieval-quality.md` count in SKILL → 1.
- Required strings retained in SKILL: `Close the loop`, `entailment`, `one writer`, `BrowseComp`, `personas are optional`. Forbidden `/required personas?/i` absent.
- REFACTOR: none needed — SKILL stays at 105/105 (zero slack; no further SKILL lines without moving detail out). Non-sensitive only.

## Task 4 Verify-only (full + caps + scope)

- Scope: verify-only research upgrade. No code/skill edits. Allowed files only this file + evidence JSON.
- Verify:
  - `node scripts/validate-skills.mjs` -> `checked 40 skills, 0 failures`.
  - `node --test` (full) -> 613/613 pass, 0 fail, 0 skipped.
  - `node --test tests/opencode/test-brain-skills.mjs` -> 19/19 pass (SKILL cap 105 enforced).
  - `node --test tests/opencode/test-plugin-loading.mjs` -> 20/20 pass (bootstrap <5120B enforced by existing tests).
  - `wc -l .opencode/skills/deep-research/SKILL.md` -> 105 (cap 105).
  - `stat -c%s SKILL.md` -> 5508B.
  - Spec `docs/specs/2026-11-08-deep-research-upgrade.md` checked -> missing (Not Found). Noted honestly; verify executed from brief + plan. No spec-gate block occurred (no active gate claimed).
  - Grading: no edits to any grading/probe/test file in this task; full suite green confirms no regression.
  - Files scope: prior Tasks 1-3 + this Task 4 (progress + evidence only). No scope widened.
- REFACTOR: none (verify-only). Non-sensitive only.
- Deviation: spec missing (see above). Working tree has pre-existing unrelated modifications from other streams; Task 4 changed only allowed files.

## Deviation

- Spec/plan paths in brief did not exist; executed from brief text only (allowed files, cap, required strings, stdlib/no-deps, retrieval detail out). No spec-gate block occurred; no scope widened.

## Task 2 RED->GREEN (cap-safe)

- Scope: contradiction detection + uncertainty/confidence handling + verdict/action rules (supported/partial/unsupported/contested/unverified; keep/qualify/cut); entailment kept strict. Allowed files only: citation-check.md + this file + evidence JSON. SKILL.md untouched (105 cap).
- RED (baseline gate): `node --test tests/opencode/test-brain-skills.mjs` -> 19/19 pass; `node scripts/validate-skills.mjs` -> 40 skills, 0 failures. citation-check.md baseline had 3 verdicts (supported/partial/unsupported) and no contradiction/uncertainty sections.
- GREEN:
  - Rewrote `.opencode/skills/deep-research/references/citation-check.md`: entailment rubric now lists 5 verdicts (supported, partial, unsupported, contested, unverified) with actions (keep, qualify, cut); added §4 Contradiction detection (cross-page incompatible facts, resolution via source-quality, contested verdict, never average); added §5 Uncertainty and confidence handling (per-claim confidence, single-source -> unverified, estimate/opinion labeling, staleness, propagation, insufficient-data); accuracy count now lists partial/unsupported/contested/unverified; conflicts section retained.
  - SKILL.md untouched (still 105/105); citation-check.md link count in SKILL remains 1.
- Verify: `node --test tests/opencode/test-brain-skills.mjs` -> 19/19 pass; `node scripts/validate-skills.mjs` -> 40 skills, 0 failures.
- Non-sensitive only.

## Task 3 RED->GREEN (zero-dep deterministic)

- Scope: pure research metrics in `eval/lib/research-metrics.mjs` with tests in `tests/eval/test-research-metrics.mjs`. Out-of-scope: eval/probes.mjs, tests/eval/test-probes.mjs, calibration, all else. Allowed files only.
- RED: `node --test tests/eval/test-research-metrics.mjs` -> module-not-found (ERR_MODULE_NOT_FOUND for `eval/lib/research-metrics.mjs`).
- GREEN: created `eval/lib/research-metrics.mjs` (ESM, no deps/network/fs, pure/deterministic) exporting `retrievalPrecision`, `retrievalRecall`, `retrievalF1` (set-based; empty/zero-div guards), `factualConsistency({supported,total})`, `taskSuccess({succeeded,total})`, `tokenEfficiency({output,cost})` (0..1 with guards/clamping), and `multiAttemptResolution(attempts)` returning `{resolvedAfterRetry,total,rate}` for resolved-after-retry/total (accepts `{resolved,attempt}` objects or boolean arrays where index+1 is attempt).
- Tests (`tests/eval/test-research-metrics.mjs`): normal/edge coverage - empty, zero-div, perfect/partial/none, duplicate handling, clamping, multi-attempt (retry, all-first, all-failed, empty/invalid, boolean form).
- Verify: `node --test tests/eval/test-research-metrics.mjs` -> 13/13 pass, exit 0.
- REFACTOR: none needed (small pure helpers). Non-sensitive only.
- Deviation: spec `docs/specs/2026-11-08-deep-research-upgrade.md` missing at start; executed from brief. No spec-gate block; no scope widened.

## Task 5 RED->GREEN (5 critic nits)

- Scope: 5 non-blocking nits only. Allowed files only. SKILL.md untouched (105 cap).
- RED: `node --test tests/eval/test-research-metrics.mjs` -> 14/15 pass, 1 fail (iterable `retrieval accepts iterables (Set)`; 0≠1 confirms `toSet` non-array guard); baseline before 13/13 green.
- GREEN:
  - `retrieval-quality.md` (51-53): `mc_cid`/`mc_eid` → `mc_*` prefix match incl. examples.
  - `citation-check.md` (32): unsupported split — page contradicts/absent → Cut; unverified (cannot check) stays mark-unverified.
  - `citation-check.md` (85): trailing newline added.
  - `eval/lib/research-metrics.mjs:4`: `toSet` accepts iterables via `Array.from` with `Symbol.iterator` guard (deterministic).
  - `eval/lib/research-metrics.mjs:68`: `rate` wrapped in `clamp01`.
  - `tests/eval/test-research-metrics.mjs`: +2 tests (iterable Set with non-iterable guard; rate clamped [0,1]).
- Verify: `node --test tests/eval/test-research-metrics.mjs` -> 15/15 pass, exit 0; `node scripts/validate-skills.mjs` -> 40 skills, 0 failures.
- REFACTOR: none. Non-sensitive only.

## Close-evidence repair (docs-only, human-approved close)

- RED: prior `docs/plans/2026-11-08-deep-research-upgrade-evidence.json` was not close format (`{task, spec, files, files_scope, checks, sensitive}`; no `plan`/`plan_sha256`/`tasks`), so `spec-check close` evidence validation would fail with `evidence-plan-mismatch`.
- GREEN: rewrote evidence to close format `{"plan":"docs/plans/2026-11-08-deep-research-upgrade.md","plan_sha256":"2e6cf762018cd44bd254123bdc3297dc7a9f9896d9ec3f441830e1d216cdacd4","tasks":[{task,verify,exit,at}...]}` with one row per plan task and exact plan-table Verify strings. Re-ran each Verify fresh now (exit 0, real UTC at): task 1 `node --test tests/opencode/test-brain-skills.mjs` 19/19 @2026-11-08T20:45:13Z, task 2 same @2026-11-08T20:45:17Z, task 3 `node --test tests/eval/test-research-metrics.mjs` 15/15 @2026-11-08T20:45:20Z, task 4 brain-skills 19/19 @2026-11-08T20:45:22Z, task 5 research-metrics 15/15 @2026-11-08T20:45:24Z. Check: `node scripts/spec-check.mjs verify` report only (no `close` run). Non-sensitive only.
- REFACTOR: none. Old evidence preserved below (history note only; superseded).
- History — old evidence JSON verbatim:
```json
{
  "task": "Task 4 verify-only research upgrade",
  "spec": "docs/specs/2026-11-08-deep-research-upgrade.md (missing; Not Found at verify time; executed from brief+plan)",
  "files": [
    "docs/plans/2026-11-08-deep-research-upgrade-progress.md",
    "docs/plans/2026-11-08-deep-research-upgrade-evidence.json"
  ],
  "files_scope": "Tasks 1-3 (SKILL.md, retrieval-quality.md, citation-check.md, research-metrics.mjs + test) + Task 4 (progress + evidence only). No code/skill edits in Task 4. No grading edits.",
  "checks": {
    "skill_lines": 105,
    "skill_cap": 105,
    "skill_bytes": 5508,
    "validate_skills": "checked 40 skills, 0 failures",
    "full_tests": "node --test -> 613 pass, 0 fail",
    "brain_skills": "node --test tests/opencode/test-brain-skills.mjs -> 19/19 pass",
    "plugin_loading_bootstrap": "node --test tests/opencode/test-plugin-loading.mjs -> 20/20 pass (bootstrap <5120B enforced)",
    "grading_edits": "none in Task 4; verify-only",
    "spec_gate_block": false
  },
  "sensitive": false
}
```
