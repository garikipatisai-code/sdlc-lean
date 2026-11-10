# Progress — Agent Suite Audit (Task 0 setup)

## Goal

Thorough agent-suite audit — all 8 agents (code-reviewer, explorer,
implementer, orchestrator, planner, researcher, security-reviewer,
test-writer). Map each agent, deep-check behavior, fix only if approved,
then verify + critics.

## Baseline

- Spec (context only, draft): `docs/specs/2026-11-08-free-model-resolver.md`
- Plan: `docs/plans/agent-suite-audit-progress.md` (this file)
- Allowed files: `docs/plans/agent-suite-audit-progress.md`,
  `docs/plans/agent-suite-audit-evidence.json`
- Out of scope: all else (no code/docs edits in this setup step)
- Baseline commits: `1fc02a8`, `740c112`
- Baseline verify: `npm run verify` → 676/676 pass, 0 fail (UTC 2026-11-09)
- Model: `opencode-go/beam-free`, account `opencode-go` (free-pool re-discovered
  cost 0/0 2026-11-09: longcat-2.5-free, iceman-contributor-free, beam-free)

## Acceptance

- All 8 agents mapped (role, model, perms, tool scope).
- Issues recorded as `file:line`.
- `npm run verify` green (676/676) after any approved fixes.
- Critics clean (validate-skills, code-reviewer, security-reviewer).

## Budget

3 iterations (autonomous-loop). Stop + escalate on 3rd failure or scope drift.

## Tasks

- [x] #1 Map all 8 agents (DONE/TODO tracker) — DONE
  (verify: agent inventory table below; explorer mapped 8/8, exit 0)
- [x] #2 Deep checks (per agent: model pin, perms, tool scope, guard coverage) — DONE
  (verify: issues list with `file:line`; critics clean)
- [x] #3 Fixes if approved (only after explicit approval; scope-gated) — DONE (per fix ledger Tasks 1-5)
  (verify: `npm run verify` green; targeted tests pass)
- [~] #4 Verify + critics (validate-skills, code-reviewer, security-reviewer) — VERIFY DONE, critics pending
  (verify: `node scripts/validate-skills.mjs` → 40 skills 0 failures, exit 0; `npm run verify` → 676/676, exit 0;
  `grep -rn "^model:" .opencode/agents/ || echo NO_STATIC_PINS` → NO_STATIC_PINS, exit 0;
  `grep -q "bash: deny" .opencode/agents/orchestrator.md && echo SCOPE_OK` → SCOPE_OK, exit 0; at 2026-11-10T02:04:46Z)

## Map results — Task #1 (explorer `ses_e3d652f4bffe8M99Bg14V6shFd`, exit 0)

Prior hashes `1fc02a8`, `740c112`; verify 676/676 (read-only, not re-run).
All 8 agents mapped (read-only reconnaissance; no edits).

| Agent | Mode | Model | Perms (V1/V2) | Tool scope |
|---|---|---|---|---|
| orchestrator | primary | UNPINNED (BRAIN = session model) | V2 nested `permission` | edit deny, todowrite allow, task narrow allow 7 workers (`orchestrator.md:3-16`) |
| researcher | subagent | super-vl:free (static) | V1 scalars | edit deny, bash deny, `"*": deny` (`researcher.md:4,7-10`) |
| planner | subagent | super-vl:free (static) | V1 scalars | edit deny, bash deny, `"*": deny` (`planner.md:4,7-10`) |
| explorer | subagent | super-vl:free (static) | V1 scalars | edit deny, `"*": deny`; no explicit bash entry (`explorer.md:4,7-10`) |
| implementer | subagent | super-vl:free (static) | V1 scalars | edit allow, bash allow, `"*": deny` — broad (`implementer.md:4,7-10`) |
| test-writer | subagent | super-vl:free (static) | V2 `effect:` entries | mixed deny/allow/deny (`test-writer.md:4-19`) |
| code-reviewer | subagent | super-vl:free (static) | V1 scalars | edit deny, bash deny, `"*": deny` (`code-reviewer.md:4-13`) |
| security-reviewer | subagent | super-vl:free (static) | V1 scalars | edit deny, bash deny, `"*": deny` (`security-reviewer.md:4-10`) |

### Issues found (explorer map)

- **I1** Static pins vs dynamic BRAIN/MUSCLE: all 7 workers pin
  `console-openrouter/nvidia/nemotron-3.5-super-vl:free` (line 4 each), while
  orchestrator routing says BRAIN = session model and MUSCLE = dynamic
  free-first pool re-discovered at dispatch (`orchestrator.md:102-134`).
- **I2** V1 vs V2 perms mixed: workers use V1 scalars (`edit: deny`/`bash: deny`)
  except test-writer V2 `effect:` (`test-writer.md:5-19`); orchestrator V2 nested
  (`orchestrator.md:5-16`).
- **I3** Reviewer bash deny vs unwired allowlist: `code-reviewer.md:7-13` comment
  says read-only test allowlist lives in runtime seam `checkReviewerBash`, but
  perms are `bash: deny` + `"*": deny` — allowlist not wired.
- **I4** Implementer broad perms contract-only: `implementer.md:7-10` grants
  `edit: allow` + `bash: allow`, bounded only by the brief's file list contract.
- **I5** Tools missing: orchestrator permission block has no explicit `tools:`
  scope and no `bash` deny (`orchestrator.md:5-16`); tool surface unspecified.
- **D1** Duplicate pool defs: pool defined twice — `orchestrator.md:62-64` and
  `orchestrator.md:111-119`.

## Decisions

- Setup only: no code/docs edits beyond allowed ledger files.
- Free-only model; no paid fallback; no secrets in ledger.
- Fixes require explicit approval + spec-gate scope update before edits.

## Next step

- #4 Verify DONE, critics pending (code-reviewer, security-reviewer) at 2026-11-10T02:04:46Z.
  validate-skills 40/0, npm run verify 676/676, NO_STATIC_PINS, SCOPE_OK. Evidence in audit/fix ledgers.
- #3 fixes recorded as DONE in fix ledger (Tasks 1-5); audit tracks verification/critics status. Model opencode-go/iceman-contributor-free account opencode-go.

## Deep-check results — Task #2 (deep-checker `ses_e3d61dacbffercTG4VL0Zj8iT4`, exit 0)

Read-only plugin/seam audit; no edits.

| Seam | Status | Notes |
|---|---|---|
| D-015 checkReviewerBash | unwired by design | agent perms `bash: deny` + `"*": deny` (`code-reviewer.md:7-13`); seam unused but deny-safe |
| D-019 checkImplementerBash | unwired by design | implementer grants `bash: allow` (`implementer.md:7-10`); seam not wired |
| Bootstrap budget | 5075B / 5120B | headroom 45B; under cap (`plugin/sdlc-lean.js` + bootstrap) |
| Dependencies | zero-dep | no third-party runtime deps |
| Fail-open | yes | activation never breaks on guard error |
| Secrets patterns | differ by design | plugin vs agent-side patterns intentionally distinct |
| Blockers in scope | none | no blocker preventing audit close |

Findings (file:line):
- `plugins/sdlc-lean.js` bootstrap size 5075B (headroom 45B).
- `code-reviewer.md:7-13` perms deny + unwired D-015 seam.
- `implementer.md:7-10` broad edit+bash allow + unwired D-019 seam.
- `orchestrator.md:5-16` no explicit `tools:` / bash deny.

## Critics results — Task #3 (code-reviewer `ses_e3d6171e9ffe3meYPEXlVCWwST`, security `ses_e3d60029bffeN8px48723okKth`, exit 0)

### Code-reviewer findings

| ID | Severity | Finding | Location |
|---|---|---|---|
| C1 | blocking | static super-vl pins vs dynamic BRAIN/MUSCLE | worker `*.md:4` vs `orchestrator.md:102-134` |
| C2 | blocking | orchestrator missing bash/tools scope | `orchestrator.md:5-16` |
| C3 | blocking | reviewer bash allowlist unwired | `code-reviewer.md:7-13` (D-015) |
| C4 | non-blocking | implementer broad perms (contract-only) | `implementer.md:7-10` |
| C5 | non-blocking | V1/V2 parity gap across workers | `test-writer.md:5-19` vs scalars |
| M1 | minor | duplicate pool definitions | `orchestrator.md:62-64` vs `111-119` |
| M2 | minor | V1/V2 mix in permission blocks | `*.md:4-19` |
| M3 | minor | stale comments re: unwired seams | `code-reviewer.md:7-13` |

### Security findings

| ID | Severity | Finding | Location |
|---|---|---|---|
| H1 | high | implementer RCE via unwired checkImplementerBash | `implementer.md:7-10` (D-019) |
| H2 | high | secret exfil web->implementer | `implementer.md:7-10` broad bash |
| H3 | high | orchestrator implicit bash injection via compactionContext | `orchestrator.md:5-16` |
| H4 | high | V1 test-writer escape | `test-writer.md:5-19` |
| L5 | low | paid-leak cap policy-only (no enforcement) | policy docs |
| Clean | — | delegation narrowness | orchestrator task allowlist |
| Clean | — | model validation | worker pins parse |
| Clean | — | reviewer deny-safe | `code-reviewer.md:7-13` |

### Verdict

- Deep-check: no blockers in scope (seams unwired by design).
- Critics: 3 blocking (C1-C3) + 4 high (H1-H4) require human approval before fix phase.
- Next step: await human approval; no fixes applied (audit-only).
