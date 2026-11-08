# Open-design vendor guards — progress

Plan path note: `docs/plans/open-design-vendor-guards-progress.md` was missing at start (no spec-gate file present); created as the task progress log per brief. Allowed files only; no vendored code yet.

## Task 1 (fetch, pin, license-verify + pin test) — RED→GREEN

- Fetched via webfetch: upstream `nexu-io/open-design` main HEAD commit `87a4f91c308170a8270458fc40fc66a86ed69aac` (2026-11-06) and upstream `LICENSE` → Apache-2.0 (Apache License Version 2.0, January 2004; Copyright 2026 Open Design contributors).
- Created:
  - `.opencode/skills/frontend-design/references/vendor/open-design/PIN.json` (repo + 40-hex SHA + Apache-2.0 + fetched date; refs-only note)
  - `.opencode/skills/frontend-design/references/vendor/open-design/ATTRIBUTION.md` (upstream + Apache-2.0 + SHA, refs-only note)
  - `.opencode/skills/frontend-design/references/vendor/open-design/SHA256SUMS` (entries for the two Task 1 files above; Task 2/3 append their files — every line must recompute)
  - `tests/opencode/vendor-open-design-pin.mjs` (SHA 40-hex, SUMS recompute, ATTRIBUTION names upstream + Apache-2.0 + SHA)
- RED: `node --test tests/opencode/vendor-open-design-pin.mjs` → 3 fail (PIN.json/SHA256SUMS/ATTRIBUTION.md missing).
- GREEN: `node --test tests/opencode/vendor-open-design-pin.mjs` → 3/3 pass. `sha256sum -c SHA256SUMS` in vendor dir → OK (exit 0). `node scripts/validate-skills.mjs` → 40 skills, 0 failures.
- Non-sensitive; no secrets.

## Task 2 (vendor schema + fixture-sync checker) — RED→GREEN

- Fetched raw at pinned SHA `87a4f91c308170a8270458fc40fc66a86ed69aac`:
  - `packages/contracts/src/design-systems/token-schema.ts` (287 LOC, zero imports) → vendored as `token-schema.ts`
  - `scripts/check-tokens-fixture-sync.ts` (506 LOC, node builtins + relative schema import) → vendored as `check-tokens-fixture-sync.ts`
- Vendored byte-identical (no adaptación, no wrappers); verified via `cmp`.
- `SHA256SUMS` appended with entries for both files; `sha256sum -c` → OK (exit 0) for all 4 entries.
- Checks:
  - grep zero-import schema → no import/require/export-from lines (exit 1 = none found).
  - node-only checker → imports only `node:fs/promises`, `node:path`, `node:url`, plus relative `../design-systems/_schema/tokens.schema.ts`.
  - tsc: `npx tsc` unavailable in this repo (no local typescript); noted. Validated with node --check (pass) and an external tsc (Games' toolchain) against a temp upstream-shaped tree (schema at design-systems/_schema/tokens.schema.ts) → exit 0.
  - `node --test tests/opencode/vendor-open-design-pin.mjs` → 3/3 pass.
- Non-sensitive; no secrets.

## Task 3b (widened scope: vendor extractor dep + derived contract) — RED→GREEN

- Scope widened to allow `contracts/components-manifest.ts`; extractor imports only `node:fs/promises`, `node:path`, `node:url` + the one vendored dep (no further local imports → no STOP).
- Fetched raw at pinned SHA `87a4f91c308170a8270458fc40fc66a86ed69aac`:
  - `packages/contracts/src/design-systems/components-manifest.ts` (15130 bytes, zero imports) → vendored as `contracts/components-manifest.ts`, byte-identical (`cmp` vs upstream raw OK).
  - `scripts/extract-components-manifest.ts` → vendored as `extract-components-manifest.ts` with ONE minimal adaptation: line 9 import `../packages/contracts/src/design-systems/components-manifest.ts` → `./contracts/components-manifest.ts` (mirrored upstream path not in allowed list; byte-identical broken by necessity, only this line changed — verified by `diff`).
  - No upstream `components-manifest.contract.json` exists at pinned SHA (Task 3 finding still holds) → derived `contracts/components-manifest.contract.json` from the TS type structure: all 10 `ComponentsManifest` top-level required fields + nested `source`/`fixture`/`tokens`/`groups`/`literals` (incl. 9-value `id` enum, literal `schemaVersion: 1`, `componentsHtml`/`tokensCss` literals), plus extractor `ManifestCollection` and `ExtractComponentsManifestInput`; marked `derived: true`, `derivedDate: 2026-11-08`, no guessed values.
- `SHA256SUMS` appended with the 3 new files; `sha256sum -c` → OK (exit 0) for all 7 entries.
- Checks:
  - `node --check` both TS → pass.
  - `node --test tests/opencode/vendor-open-design-pin.mjs` → 4/4 pass (new Task 3b test: dep/extractor exist, adapted import present, upstream import gone, contract derived+dated and covers all 10 fields).
- RED → `node --test ...` → 3 pass / 1 fail (new test, dep missing) → GREEN after vendoring.
- Non-sensitive; no secrets.


## Task 4 (vendor docs + full verify) — RED→GREEN

- SKILL.md lines: 62 (pre-edit) → 74 (post-edit), ≤160 satisfied.
- Documented opt-in usage in `.opencode/skills/frontend-design/SKILL.md` (new "Vendor tooling (opt-in, dev-only)" section): `npx tsx <vendor-path>` for both scripts, never auto-run, dev-only; noted extractor one-line import adaptation and derived contract honestly; noted scripts expect upstream-shaped `design-systems/` tree.
- Extractor adaptation (honest): `extract-components-manifest.ts` line 9 import changed `../packages/contracts/src/design-systems/components-manifest.ts` → `./contracts/components-manifest.ts` (1 line only; byte-identical otherwise).
- Derived contract (honest): `contracts/components-manifest.contract.json` is `derived: true`, `derivedDate: 2026-11-08`; no upstream `components-manifest.contract.json` at pinned SHA; covers all 10 `ComponentsManifest` top-level fields (`schemaVersion`, `brandId`, `source`, `fixture`, `tokens`, `selectors`, `classes`, `elements`, `groups`, `literals`) plus nested `source`/`fixture`/`tokens`/`groups`/`literals` (incl. 9-value `id` enum, literal `schemaVersion: 1`, `componentsHtml`/`tokensCss` literals), `ManifestCollection`, `ExtractComponentsManifestInput`; no guessed values.
- Verify:
  - `node scripts/validate-skills.mjs` → "checked 40 skills, 0 failures" (exit 0).
  - `npm run verify` → lint "checked 40 skills, 0 failures"; tests 641 pass, 0 fail (exit 0).
- Non-sensitive; no secrets.

## Follow-up — BLOCKING dangling import fix (checker adaptation #2) — RED→GREEN

- Honest correction: Task 2 claimed `check-tokens-fixture-sync.ts` vendored byte-identical. That was true at Task 2 time but left a dangling import (`../design-systems/_schema/tokens.schema.ts` points outside `vendor/open-design/` and does not resolve in the vendored tree).
- RED: extended `tests/opencode/vendor-open-design-pin.mjs` with new test asserting no `../` import remains in `vendor/open-design/*.ts` and adapted `./token-schema.ts` is present → 4 pass / 1 fail (dangling `../design-systems/...` flagged).
- GREEN (adaptation #2 — checker): `check-tokens-fixture-sync.ts` line 63 import re-pointed `../design-systems/_schema/tokens.schema.ts` → `./token-schema.ts` (vendored `token-schema.ts` sits in same directory; 1 line only). Checker is no longer byte-identical to upstream — honest deviation, mirroring extractor adaptation #1.
- SKILL note: task instruction said record in SKILL if allowed — SKILL file is NOT in allowed list for this follow-up, so no SKILL edit made; recorded here only.
- `SHA256SUMS`: entry for `check-tokens-fixture-sync.ts` regenerated (`b9ace24a…1216c82`); `sha256sum -c` in vendor dir → 7/7 OK (exit 0).
- Verify:
  - `node --check check-tokens-fixture-sync.ts` → exit 0.
  - `node --test tests/opencode/vendor-open-design-pin.mjs` → 5/5 pass (exit 0).
  - `npm run verify` → 641 pass, 0 fail (exit 0).
- Non-sensitive; no secrets.

## Close-evidence repair (2026-11-08) — docs-only

- Rewrote `docs/plans/open-design-vendor-guards-evidence.json` to close format bound to `docs/plans/open-design-vendor-guards.md` sha `74e589662b4ed1258777743c73b020fdfd730cb36735547754ccfcb2fb9ebdba` (5 rows matching the plan task table Verify strings, each `exit: 0` with a fresh UTC `at`).
- Upstream clearance: user-stated assertion dated `2026-11-08` (their assertion, per parent session: human-approved close, upstream cleared). Not independently re-verified here beyond the recorded pin/license evidence; recorded as user assertion only.
- Documented adaptations (honest, as recorded above):
  1. Checker import: `check-tokens-fixture-sync.ts` line 63 `../design-systems/_schema/tokens.schema.ts` → `./token-schema.ts` (1 line; checker no longer byte-identical to upstream).
  2. Derived contract: `contracts/components-manifest.contract.json` is `derived: true`, `derivedDate: 2026-11-08`; no upstream contract JSON at pinned SHA `87a4f91c308170a8270458fc40fc66a86ed69aac`; covers all 10 `ComponentsManifest` top-level fields, no guessed values.
- Fresh re-run (2026-11-08):
  - `sha256sum -c SHA256SUMS` (vendor/open-design) → 7/7 OK (exit 0).
  - `node --test tests/opencode/vendor-open-design-pin.mjs` → 5/5 pass (exit 0; re-run per task).
  - `node --check` token-schema, check-tokens-fixture-sync, extract-components-manifest, contracts/components-manifest → exit 0.
  - `node scripts/validate-skills.mjs` → 40 skills, 0 failures (exit 0).
  - `npm run verify` → 642 pass, 0 fail (exit 0).
- Non-sensitive; no secrets. Spec gate not closed here (report only).
