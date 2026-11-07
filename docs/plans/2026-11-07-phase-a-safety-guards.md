---
spec: docs/debt-ledger.md
status: approved
approved_by: appusai
approved_at: 2026-11-07T01:35:34.138Z
files:
  - .opencode/plugins/sdlc-lean.js
allow:
  - docs/plans/phase-a-safety-guards-progress.md
  - docs/plans/phase-a-safety-guards-evidence.json
---

# Plan: Phase A safety guards hardening

## Goal

Harden safety guards D-001/D-002/D-004/D-009 in `.opencode/plugins/sdlc-lean.js` so exact-known destructive patterns are refused and benign commands pass (fail-open). D-028 deferred: keep hard throws, register no permission hook.

## Architecture

- Components touched: `.opencode/plugins/sdlc-lean.js` only (`checkSafety`, `DESTRUCTIVE_PATTERNS`, shell secret-exfiltration guard, `SENSITIVE_PATH_RE`, Colab bridge/content guards).
- Interfaces consumed: `checkSafety(tool, args)` pre-execution hook for `bash`/`shell`/`read`/`edit`/`write`/`patch`/`apply_patch`.
- Interfaces produced: same hook with stricter refusals; no new service, agent, skill, or dependency.
- Untouched: router/bootstrap, spec gate, installer, skills, docs outside `allow`.

## Tech Stack

- Node.js, zero dependencies. Test command: `node --test tests/opencode/test-safety-guards.mjs`.

## Spec

- `docs/debt-ledger.md`: D-001 (destructive-rm literal-only), D-002 (secret-read allowlist bypass via grep/sed/awk/cp/tee/redirection), D-004 (sensitive-path case/basename + `.env` regen), D-009 (Colab literal-only equivalents), D-028 (native `ask` deferred — no change this phase).

## Global Constraints

- Plugin stays V1+V2 compatible and fail-open; benign must pass.
- Safety guards grow only by exact-known destructive patterns (add a test per new refusal).
- No active spec gate (fail-open); this plan is docs-only until approved — no code changes in this step.
- Bootstrap budget <5KB.

## Lean Constraints

- Reuse-first: normalize/extend existing regexes and command-position parsing in place — no new module or dependency.
- Lowest rung: regex/normalization fixes + test additions only.

## Review Focus

- Normalization over- vs under-matching: `rm` flag/case/path forms refused, benign `rm` (e.g. `.worktrees/stale-branch`, `/tmp/content`, `./content`) still passes.
- Secret exfiltration: `grep`/`sed`/`awk`/`cp`/`tee`/redirection on sensitive paths refused, benign readers (`cat src/index.ts`, `.env.example`, prose mentions) still pass.
- Sensitive paths: case-insensitive, basename-aware matching; legitimate `.env` regeneration path defined.
- Colab: inner-command (`sh -c`), uppercase/split flags, `--`/`//` forms, numeric `kill`, `xargs kill`, `find -delete` refused; liveness checks (`pkill -0`), suffix processes, prose mentions still pass.

## Tasks

| # | Task | Spec req | Files | Test | Expected | Verify |
|---|------|----------|-------|------|----------|--------|
| 1 | Harden destructive-rm normalization (D-001/D-009) | D-001, D-009 rm class | `.opencode/plugins/sdlc-lean.js` | Extend `tests/opencode/test-safety-guards.mjs` | `rm -rf $HOME`, `${HOME}`, `/*`, `/tmp/../../`, `-R` uppercase, split `-r -f`, `--`, `//content`, `find /content -delete` refused; benign rm passes | `node --test tests/opencode/test-safety-guards.mjs` |
| 2 | Expand shell secret-exfiltration guard (D-002) | D-002 | `.opencode/plugins/sdlc-lean.js` | Extend `tests/opencode/test-safety-guards.mjs` | `grep`/`sed`/`awk`/`cp`/`tee`/redirection on `.env`/keys refused; benign readers pass | `node --test tests/opencode/test-safety-guards.mjs` |
| 3 | Fix sensitive-path matching + `.env` regen (D-004) | D-004 | `.opencode/plugins/sdlc-lean.js` | Extend `tests/opencode/test-safety-guards.mjs` | Case-insensitive + basename (`config.env`) refused; legitimate `.env` regeneration path defined and tested | `node --test tests/opencode/test-safety-guards.mjs` |
| 4 | Harden Colab bridge/content guards + lock deferred ask (D-009/D-028) | D-009, D-028 deferred | `.opencode/plugins/sdlc-lean.js` | Extend `tests/opencode/test-safety-guards.mjs` | `sh -c 'pkill … colab-mcp'` inner, numeric `kill`, `xargs kill` refused; D-028 stays hard-throw, no permission hook | `node --test tests/opencode/test-safety-guards.mjs` |

## Requirement Coverage

| Debt | Task |
|------|------|
| D-001 destructive-rm literal-only | Task 1 |
| D-002 secret-read bypass | Task 2 |
| D-004 sensitive-path case/basename + regen | Task 3 |
| D-009 Colab equivalents | Tasks 1, 4 |
| D-028 native ask deferred | Task 4 (lock: no hook, hard throws stay) |

## Test Integrity

- Grader: `tests/opencode/test-safety-guards.mjs` (read-only during Tasks 1–4; assertions extended only to cover new refusals + benign passes).
- No task edits its own grader logic to force green; each new refusal ships with a benign-pass counterpart.
- Verify per task: `node --test tests/opencode/test-safety-guards.mjs`. Full regression before close: `npm run verify`.
