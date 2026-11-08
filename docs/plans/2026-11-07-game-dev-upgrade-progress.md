# Progress — game-dev upgrade (photoreal capabilities)

- Spec: `docs/specs/2026-10-31-photoreal-capabilities.md`
- Plan: `docs/plans/2026-11-07-game-dev-upgrade-progress.md` (this file)
- Evidence: `docs/plans/2026-11-07-game-dev-upgrade-evidence.json`
- Scope of this task: docs only. Out-of-scope: `SKILL.md`, plugin, phase.mjs, all code/tests/workflows/refs.
- Status: **CLOSED** (full-close 2026-11-08; residuals: Low TOCTOU local-only + manifestDir fallback accepted; see Residuals).

## Goal

Give the `web-game-development` skill photoreal 3D guidance: four focused
Babylon.js references (rendering, world streaming, traffic + crowds, budgets),
routed from `SKILL.md`, backed by a test skeleton that pins the routes and the
line budget (spec Goal, quoted). This ledger records the approved game-dev
upgrade task states, review outcomes, routing, and decisions.

## Tasks (6, non-sensitive only)

| # | Task | Status | Check / reported output |
|---|------|--------|--------------------------|
| 1 | Starter sim | Done | starter sim hash `e161aed0` (verified) |
| 2 | Replay | Done | replay `582e3658` `4/4 pass` |
| 3 | Perf-gate | Done (green) | perf-gate `p95 10.8ms`; expected split `PASS@16.67ms` / `FAIL@1ms` (green) |
| 4 | References | Done (resolved) | `3 web-* refs` (multiplayer/rigor/asset-pipeline game-dev scope) + `4 babylon refs` pre-exist (Oct30) satisfy photoreal spec |
| 5 | Audit | Done | audit self-test `pass` |
| 6 | Full tests | Done | `572 tests` (pre-tracker baseline; current post-tracker count `587`) |

Notes:

- Task 3: expected split clarified — `PASS@16.67ms` / `FAIL@1ms` (green).
  The retained `PASS/FAIL` text is the expected split, not an ambiguity.
- Task 4: spec 3-vs-4 resolved — `4 babylon refs` pre-exist (Oct30) satisfy
  the photoreal spec; the `3 web-* refs` (`web-asset-pipeline.md`,
  `web-multiplayer.md`, `web-rigor-tiers.md`) are separate game-dev scope
  (multiplayer/rigor/asset-pipeline), not photoreal refs.
- Drift: `568` vs `572` vs `587` — `587` is the current post-tracker count
  (tracker Task4 added docs); game-dev `572` was the pre-tracker baseline.
- Resolved date: 2026-11-07 (full-close 2026-11-08).
- Correction (2026-11-08): full-close verified — symlink/containment fix landed
  (asset-audit self-test 8/8+ exit 0; perf-gate PASS@16.67 exit 0 / FAIL@1 exit 1 /
  symlink exit 2 / missing-seed exit 2; quota 8/8). Residuals now: Low TOCTOU
  local-only (concurrent writer, not blocking in CI) + manifestDir fallback
  question (accepted).

## Fresh explorer evidence (non-sensitive)

- Starter sim: `e161aed0` (deterministic, `games/starter/sim.js`).
- Replay: `4/4 pass` (`582e3658`).
- Perf-gate: `p95 10.8ms`; `PASS@16.67ms`; `FAIL@1ms`.
- References: `3` present (`web-asset-pipeline.md`, `web-multiplayer.md`,
  `web-rigor-tiers.md`); `4` babylon refs pre-exist.
- Audit self-test: `pass`.

## Reviews summary

- Security: `sec 2 Low local-only` — 2 Low findings, local-only impact.
  No sensitive material recorded here.
- Code: `BLOCKING missing ledger + spec mismatch` → resolved
  - `missing ledger`: addressed by this file (this ledger was missing).
  - `spec mismatch`: resolved — 4 babylon refs pre-exist (Oct30) satisfy the
    photoreal spec; the 3 web-* refs are separate game-dev scope
    (multiplayer/rigor/asset-pipeline). Close + re-approval not required.

## Routing

- Free duo first — `crouton+beam` — then `muse-spark-1.3` with `$2 cap`.
  Short form: `free duo crouton+beam then muse-spark-1.3 $2 cap`.
- No spend beyond the `$2 cap` for the `muse-spark-1.3` step. Non-sensitive
  identifiers only.

## Decisions

- Babylon-stay (Y-statement): stay with Babylon.js 9 as the photoreal
  default and achieve PBR/IBL/streaming/crowd guidance inside its
  WebGPU/WebGL-parity renderer, accepting less custom-pipeline control,
  because the skill already pins Babylon.js 9 as the 3D-engine default.
  (Spec Decisions, summarized.)
- Docs-only ledger for this task: create only the two allowed files
  (this progress file + evidence JSON); no `SKILL.md`, plugin, or other
  code edits. TDD not needed per brief; verification is `test -s`.
- Record reported values verbatim where ambiguous (`PASS/FAIL`, `3 refs`),
  rather than resolving them silently.
- Resolved date: 2026-11-07.

## Residuals (explicit)

1. Refs `NO_ROUTE` (intentional): the 3 `web-*` refs
   (`web-asset-pipeline.md`, `web-multiplayer.md`, `web-rigor-tiers.md`)
   are not in the SKILL.md route table to preserve the SKILL 154/155 cap;
   discoverable via `references/` on-demand, no route needed. The 4 babylon
   refs are routed.
2. Test-count drift `568` vs `572` vs `587`: `587` is the current
   post-tracker count (tracker Task4 added docs); game-dev `572` was the
   pre-tracker baseline.
3. Symlink/containment fix landed (2026-11-08 full-close verified):
   - `scripts/asset-audit.mjs:124-159` realpath containment (lstat/readlink/realpath);
   - `scripts/perf-gate.mjs:66-90` realpath containment; `PASS@16.67ms` exit 0,
     `FAIL@1ms` exit 1, symlink exit 2, missing-seed exit 2.
   - Quota tracker: `8/8` pass.
   - Remaining accepted residual (Low, local-only): TOCTOU concurrent writer
     (not blocking in CI) + `manifestDir` fallback question.

## Muse BLOCKING fixes (2026-11-08, ses_e44f197f)

- `sim.js`: `export const TICK = 1/60`; CLI main-detection compares
  `path.resolve(argv[1])` to `fileURLToPath(import.meta.url)` via lazy
  `node:path`/`node:url` imports (fail-closed, browser ESM import intact).
- `render.js`: single canvas (`querySelector('canvas') ?? create`, append
  only if new, `typeof document` guard), exports `frame`/`draw`/
  `snapshotState`; `snapshotState` copies full state
  (`x`/`y`/`dir`/`tick`/`entities[]`); render is presentation-only —
  canonical remains replay seed+input → hash.
- `game-replay.mjs`: same CLI path fix; `readInputLog` fails closed on
  malformed `{tick, actions}` (throws, no silent drop).
- Starter sim `--ticks 600 --seed 7`: `stateHash:e161aed0` (stable ×3,
  absolute + relative) — unchanged after `TICK` export (export does not
  alter sim behavior). Replay self-test: `582e3658`, all checks passed —
  unchanged.
- Checks: `node --check` (4 files) pass;
  `node --test tests/opencode/test-game-replay.mjs` 10/10 exit 0.

## Muse BLOCKING set 1 (2026-11-08)

- TOCTOU tests restored/kept in `tests/opencode/test-quota-tracker.mjs`
  (asset-audit symlink exit 1, perf-gate symlink exit 2, identical asserts).
- Plugin comment fixed: `Fail-closed unknowns -> OPEN` (matches `return 'OPEN'`).
- `game-replay.mjs` + `sim.js`: NonNegativeInt ticks/seed enforced (fail-closed,
  throw, no hash); duplicate tick rejected; empty replay fails closed
  (no hash, non-zero exit).
- Hash pin: `sim --ticks 600 --seed 7` = `e161aed0`, replay self-test =
  `582e3658` (unchanged, pinned in `test-game-replay.mjs`).

## Evidence

- Machine-readable check outputs (non-sensitive only) are in
  `docs/plans/2026-11-07-game-dev-upgrade-evidence.json`.
- Verification for this ledger task: `test -s` on both allowed files.

## Residuals closed/queued

- (a) Copilot mirror = build artifact; source of truth is repo `.opencode/`. Verify: installer copies `.opencode` -> global, never reverse (manifest-pruned; user files untouched).
- (b) Windows `O_NOFOLLOW ?? 0` = Linux-only guard; where `O_NOFOLLOW` is unavailable, fail-closed to realpath containment. Documented only; no code change here.
- (c) Spec approval queue (DO NOT approve here; user signs). Draft specs:
  1. `docs/specs/2026-10-31-photoreal-capabilities.md` — plan `docs/plans/2026-10-31-photoreal-capabilities.md`
  2. `docs/specs/2026-10-31-popup-autofill.md` — plan `docs/plans/2026-10-31-popup-autofill.md`
  3. `docs/specs/2026-11-08-lean-ui-open-design.md` — plan file not present yet (create first)
  4. `docs/specs/2026-11-08-tiered-ceo-lead-workers.md` — plan file not present yet (create first)
  Approve command shape (TTY, human only): `node scripts/spec-check.mjs approve <plan.md>` (add `--root <dir>` if needed). Machine variant: `node scripts/spec-check.mjs approve <plan.md> --machine --envelope <file>`. Close an active gate first: `node scripts/spec-check.mjs close`.
