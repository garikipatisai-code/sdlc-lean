# Plan — sdlc-lean V1 trust core

Date: 2026-10-04 · Status: awaiting approval

## Goal

Make the suite trustworthy and installable: verify every change in CI, give it
a version and changelog, turn the dangling "debt ledger" reference into a real
format, close the safety-guard holes (V2 `patch` tool + secret reads via bash),
and add STE-lite to improve human-facing readability.

```mermaid
flowchart TD
    subgraph V1[V1 trust core]
      CI[.github/workflows/ci.yml] --> LINT[validate-skills.mjs]
      CI --> TESTS[node --test "tests/opencode/*.mjs"]
      PKG[root package.json v1.0.0] --> CH[CHANGELOG.md]
      LED[debt-ledger reference + template] --> LR[lean-review] & RF[refactor command]
      SG[checkSafety: +patch/apply_patch, +bash secret reads]
    end
    STE[simplified-technical-english skill] --> CC[communicating-concisely] --> OUT[human output + docs]
```

## Architecture

Components touched: the zero-dep plugin (`.opencode/plugins/sdlc-lean.js`),
skill tree (`.opencode/skills/`), commands, root build config, CI.

Interfaces consumed: OpenCode V1 `tool.execute.before` / V2
`ctx.tool.hook("execute.before")` (both already registered). Interfaces
produced: `checkSafety(tool, args)` gains tool names + patterns; a new
`debt-ledger` reference format; an STE skill.

## Tech stack

Node ESM (no dependencies). Tests: `node --test`. Lint:
`node scripts/validate-skills.mjs`. Detected from `AGENTS.md` and `tests/`.

## Spec

Approved brainstorming design (this session) + cited research report:
[`eval/research/2026-10-04-asd-ste100.md`](../../eval/research/2026-10-04-asd-ste100.md).

## Global Constraints (from AGENTS.md)

- Plugin stays zero-dependency and V1+V2 compatible; every new guard fails open.
- Safety guards grow **only** by exact-known destructive patterns; benign must
  pass (add a test for each new guard).
- Bootstrap stays <5KB (enforced by `tests/opencode/test-plugin-loading.mjs`).
- `validate-skills.mjs` must pass on every skill change.
- Human-facing output follows `communicating-concisely`.
- Do **not** copy or redistribute the ASD-STE100 dictionary (© ASD).

## Lean Constraints

- Rung 4 (native/platform) throughout; the only new artifact is one skill.
- Reuse `checkSafety`'s existing pattern array and the existing shipping-test
  style; do not add a new test framework or linter dependency.
- STE is skill-only (no new script) in V1.

## Review Focus

- Safety: false positives on plain dev commands (`cp .env.example`, `grep env`).
- Copyright: no ASD rule/dictionary text reproduced verbatim.
- V1/V2: the `patch` arg field name differs per flavor — confirm, don't guess.
- Budget: router edits may push the bootstrap past 5KB.

## Tasks

| # | Task | Files | Test | Expected | Verify |
|---|------|-------|------|----------|--------|
| 1 | Root `package.json` (name `sdlc-lean`, version `1.0.0`, scripts `lint`/`test`/`verify`) + `CHANGELOG.md` (Keep a Changelog, backfilled from git log) | `package.json`, `CHANGELOG.md` | `npm run verify` exits 0 | one source of version; one verify command | `npm run verify` |
| 2 | CI workflow: push/PR to main; Node 20/22/24; checkout + setup-node + `npm run verify` | `.github/workflows/ci.yml`, README.md:115-120, USAGE.md:181-186 | workflow runs green on the PR | lint + tests gate every change | push branch; check Actions |
| 3 | Debt ledger: add `references/debt-ledger.md` (format + fill-in template: id·date·area·finding·trigger·est-savings·status) to `lean-review`; link it from `lean-review/SKILL.md:25`, `commands/refactor.md:11`, `using-sdlc-lean/SKILL.md:30` | `.opencode/skills/lean-review/references/debt-ledger.md`, `lean-review/SKILL.md`, `commands/refactor.md`, `using-sdlc-lean/SKILL.md` | new plugin-loading assertion: reference ships and router text names it | no dangling "debt ledger" references | `node --test "tests/opencode/*.mjs"` |
| 4 | Safety — file ops: extend the sensitive-file branch to `patch` and `apply_patch` (in addition to `read`/`edit`/`write`); confirm the arg field per flavor | `.opencode/plugins/sdlc-lean.js:227-235`, `tests/opencode/test-safety-guards.mjs` | failing-first: `checkSafety('patch', {filePath:'.env'})` throws; benign `patch` of `src/x.ts` passes | V2 edits can't read secrets | `node --test "tests/opencode/*.mjs"` |
| 5 | Safety — bash reads: add exact patterns blocking display of secrets (`cat`/`head`/`tail`/`less`/`more`/`strings`/`xxd`/`base64`/`od`/`hexdump` on `.env` or key files); exclude `.env.example|sample|template` | `sdlc-lean.js:219-247`, `test-safety-guards.mjs` | failing-first: `cat .env` / `strings id_rsa` throw; `cat src/x.ts`, `cat .env.example`, `grep -rn env src/` pass | closes the `cat .env` bypass | `node --test "tests/opencode/*.mjs"` |
| 6 | STE-lite skill: `simplified-technical-english/SKILL.md` — the ~20 curated rules, explicit "preserve conditions/modality/facts", "STE-informed, not compliant", structure-before-STE; wire from router + `communicating-concisely`; no dictionary copy | `.opencode/skills/simplified-technical-english/SKILL.md`, `using-sdlc-lean/SKILL.md`, `communicating-concisely/SKILL.md` | new plugin-loading assertion: skill ships, router references it, content includes the no-copy caveat | readable output guidance without a legal claim | `node --test "tests/opencode/*.mjs"` |
| 7 | Docs sync: skill count 25→26, add STE + debt-ledger to README/USAGE tables, update verify command, note V1 scope | README.md, USAGE.md | lint + tests still pass; counts match disk | docs match reality | `npm run verify` |

## Notes / edge cases

- **Task 1**: keep root `package.json` dependency-free; `"type": "module"` is
  not required (no root JS is imported), but harmless — decide at implement
  time and keep `npm run verify` working.
- **Task 2**: `node --test "tests/opencode/*.mjs"` (quoted glob) fails on Node
  20; use `node --test "tests/opencode/*.mjs"` in the script and docs.
- **Task 4/5**: pattern must be exact-known; add the benign counterparts to the
  same test so a future edit cannot regress fail-open.
- **Task 6**: rules are independently worded from the standard's *principles*;
  cite ASD-STE100 Issue 9 by name only.

## Self-review

- Coverage: design parts CI (§2), packaging (§1), ledger (§3), safety (§4),
  STE (§5) all map to tasks. ✅
- Consistency: no task contradicts another; safety tasks share one test file. ✅
- Leanness: no new dependency, no new test framework, one new skill. The only
  arguable addition is `CHANGELOG.md` — kept because packaging was approved. ✅

## Execution

Next: `executing-plans` (inline, sequential) or `subagent-driven-development`
(tasks 4/5 share a file → not independent; run those inline).
