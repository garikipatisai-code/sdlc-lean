# Progress — Agent Suite Fix (Tasks 1-4: C1-C3 + H1-H4 + M1-M3)

## Goal

Fix the approved agent-suite audit findings. Task 1 = C1: remove the static
model pins from all 7 workers so model routing has a single source at dispatch
time.

## Baseline

- Spec (context only, draft): `docs/specs/2026-11-08-free-model-resolver.md`
- Plan: `docs/plans/agent-suite-fix-progress.md` (this file)
- Allowed files: 7 worker agents (`researcher`, `explorer`, `planner`,
  `implementer`, `test-writer`, `code-reviewer`, `security-reviewer`) + this
  ledger + `docs/plans/agent-suite-fix-evidence.json`
- Out of scope: `orchestrator.md` (Task 2), tests (never edit — graders),
  plugin/phase, all else
- Prior hashes: `1fc02a8`, `740c112`
- Baseline verify: `npm run verify` → 676/676 pass, 0 fail (UTC 2026-11-09)
- Model: `opencode-go/longcat-2.5-free`, account `opencode-go` (cost 0/0)

## Tasks

- [x] #1 C1 all-unpin model pins — DONE
  (verify: `grep -rn "^model:" .opencode/agents/ || echo NO_STATIC_PINS`
  → `NO_STATIC_PINS`, exit 0; 7/7 workers carry the UNPINNED comment)

- [x] #2 C2 orchestrator bash deny + tools allowlist — DONE
  (verify: `sed -n '1,20p' .opencode/agents/orchestrator.md` shows `bash: deny`;
  `grep -q "bash: deny"` → SCOPE_OK, exit 0;
  `node --test tests/opencode/test-model-routing.mjs` → 10/10 pass, exit 0)

- [x] #3 C3+H1-H4 docs-only guardrails — DONE
  (verify: `grep -rni "do not run commands\|no commands\|sanitiz\|V1 fallback\|ask-narrow" .opencode/agents/`
  → GUARDRAILS_OK; `node --test tests/opencode/test-model-routing.mjs` → 10/10
  pass, exit 0)

- [x] #4 M1-M3 minor cleanup (docs-only) — DONE
  (verify: `grep -rni "single source\|V1.*V2\|debt.*D-015\|D-019" .opencode/agents/ && echo MINOR_OK`
  → MINOR_OK, exit 0; `node --test tests/opencode/test-model-routing.mjs` → 10/10
  pass, exit 0)

- [x] #5 Ledger + verify (no content edits except ledger) — DONE + critics DONE (ses_e3ccb46c2ffeQwb77iot7mh7lx + ses_e3ccac972fferQ4D5HGxJNa1CF both complete, no blocking)
  (verify: `node scripts/validate-skills.mjs` → 40 skills 0 failures, exit 0;
  `npm run verify` → 676/676 pass, 0 fail, exit 0;
  `grep -rn "^model:" .opencode/agents/ || echo NO_STATIC_PINS` → NO_STATIC_PINS, exit 0;
  `grep -q "bash: deny" .opencode/agents/orchestrator.md && echo SCOPE_OK` → SCOPE_OK, exit 0;
  at 2026-11-10T02:04:46Z)

## Decision

- All-unpin rationale: single source = dispatch-time `model:` + `account:`
  from the orchestrator pool. Static worker pins contradicted the dynamic
  BRAIN/MUSCLE routing table (audit C1/I1: static vs dynamic). Removing them
  removes the contradiction.
- BRAIN workers (`researcher`, `planner`, `code-reviewer`, `security-reviewer`)
  inherit the session model (UNPINNED). MUSCLE workers (`explorer`,
  `implementer`, `test-writer`) are dispatched free-first at dispatch time.
- Each worker frontmatter now carries the comment
  `# UNPINNED – dispatched per orchestrator routing (BRAIN session / MUSCLE free-first)`
  where the pin was removed. Valid YAML comment; no `model:` key remains.

## Test pin update (human re-approved, strengthening only)

- `tests/opencode/test-agent-permissions.mjs:235-251` T2 pins replaced:
  static super-vl:free equality for all 7 workers → UNPINNED assertion.
  BRAIN workers (researcher, planner, code-reviewer, security-reviewer) and
  MUSCLE workers (explorer, implementer, test-writer) must have NO `model:`
  (top-level null) + UNPINNED marker present; `grep -rn "^model:" .opencode/agents/`
  must be empty. Paid/bare rejection, permission checks, seam checks unchanged.
- Named checks: `node --test tests/opencode/test-agent-permissions.mjs` → 10/10
  pass, exit 0; `node --test tests/opencode/test-model-routing.mjs` → 10/10
  pass, exit 0; `npm run verify` → 676/676 pass, 0 fail.

## Next step

- Task 5 ledger + verify DONE (critics pending): validate-skills 40/0, npm run verify 676/676, NO_STATIC_PINS, SCOPE_OK at 2026-11-10T02:04:46Z. Evidence recorded in fix/audit ledgers. Model opencode-go/iceman-contributor-free account opencode-go.
- Task 4 DONE (M1-M3 minor cleanup, docs-only): M1 dedup pool defs — orchestrator.md now points to the routing table / `POOL` in `sdlc-lean.js` + re-discover at dispatch, no model pins; M2 V1/V2 mix clarifying comment in the V1 worker permission blocks (test-writer V2 permissions, others V1, both enforced via tests); M3 unwired seams marked debt D-015/D-019, no enforcement implied. Zero plugin/test edits.
- Task 3 DONE (docs-only guardrails): reviewers no-commands + evidence-only (D-019 unwired), researcher web sanitization (claim|source|date + assertNoSecrets), implementer ask-narrow (network/env curl/wget/env-interp + redirect outside allowlist), test-writer V1 fallback header (edit deny/bash ask/task deny fail-closed), code/security reviewers clarified read-only/no commands/no fixes. Zero plugin edits.
- Task1 escalation cleared: T2 static-pin assertion replaced with UNPINNED assertion (test pin update, human re-approved); tests/opencode/test-agent-permissions.mjs → 10/10 pass.
- Test pin update DONE: T2 static-pin assertion replaced with UNPINNED assertion; test-agent-permissions 10/10 pass, test-model-routing 10/10 pass, npm run verify 676/676 pass.
