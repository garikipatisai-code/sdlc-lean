# Progress — Tiered CEO/lead/workers build

## Goal

Add the `lead` subagent: mental-lifting layer between the CEO (orchestrator)
and the free worker pool (implementer/test-writer). Lead expands CEO briefs into
worker-ready briefs, fans out free workers, merges diffs, runs first-pass review,
and synthesizes evidence.

Spec: `docs/specs/2026-11-08-tiered-ceo-lead-workers.md` (missing at start; not
created per brief, noted honestly).

## Task 1 RED->GREEN

- Created `.opencode/agents/lead.md` (`mode: subagent`, no `model:` line, inherit;
  orchestrator passes `opencode-go/muse-spark-1.3-contributor` at dispatch for
  Lead, free pool for workers).
- Permissions: `edit: deny`; `task` allows ONLY `implementer` and `test-writer`
  (narrow-only); all others denied.
- Body: mental lifting (goal+spec/plan+allowed-only+out-of-scope+diff+exact
  check+evidence+TDD, 3-5 steps, file:line, hashes), fan-out free workers,
  merge diffs, first-pass review, synthesized evidence, secrets NEVER to free,
  cap + ask-to-extend, free-first pool IDs.
- Verify: `node --test tests/opencode/test-agent-permissions.mjs` → exit 0.
- Non-sensitive only.

## Task 2 RED->GREEN (orchestrator tiered dispatch)

- Edited `.opencode/agents/orchestrator.md` dispatch map: added `"lead": allow`,
  kept `"*": deny` and all existing worker allows (narrow-only, no scope spread).
- Body text: default = orchestrator direct with thick briefs; Lead = explicit
  escalation only when fan-out>3 parallel workers OR rework>1 per track OR merge
  conflicts. Direct-free workers only for trivial docs (≤5 steps, no secrets).
  Delegation Quality checklist kept intact. No model hardcoded.
- Verify: `node --test tests/opencode/test-agent-permissions.mjs` → exit 0.
- Non-sensitive only. Spec `docs/specs/2026-11-08-tiered-ceo-lead-workers.md`
  missing (not in allowed files); noted, not created.

## Task 3 verify-only

- `npm run verify` → exit 0 (591 tests pass, lint passes).
- Bootstrap: 5075 bytes < 5120 budget. AGENTS.md: 2139 bytes.
- Agents: HEAD 8 → now 9 (+1, `lead.md` only).
- No code/agent/skill edits in this task (verify only).
- Non-sensitive measurements only.

## Task table (spec-check parsePlanTasks)

| # | Task | Verify |
|---|---|---|
| 1 | lead agent | `node --test tests/opencode/test-agent-permissions.mjs` |
| 2 | orchestrator tiered dispatch | `node --test tests/opencode/test-agent-permissions.mjs` |
| 3 | verify-only: npm run verify, bootstrap <5120, agents +1 | `npm run verify` |
| 6 | encode brain-muscle model split in orchestrator | `node --test tests/opencode/test-agent-permissions.mjs` |
| 7 | docs-only: fix MUSCLE pool order (add omitted super-vl) | `node --test tests/opencode/test-agent-permissions.mjs` |
| 8 | docs-only: unpin BRAIN to orchestrator session model (remove muse fixation) | `node --test tests/opencode/test-agent-permissions.mjs` |
| 9 | docs-only: unpin MUSCLE to dynamic free discovery (not frozen trio) | `node --test tests/opencode/test-agent-permissions.mjs` |
| 10 | global routing guardrail: brain tasks never dispatch on muscle models | `node --test tests/opencode/test-model-routing.mjs` |
| 11 | docs-only: autonomy routing frozen-trio → dynamic free + brain-muscle | `grep -R "crouton-alpha-free" docs/AUTONOMY.md docs/verify-recipe.md .opencode/skills/autonomy-dial/SKILL.md` |
| 12 | docs-only: append bounded Ask-Back contract to orchestrator Delegation Quality | `node --test tests/opencode/test-agent-permissions.mjs` |
| 13 | docs-only: enforce critic gate + de-fixate reviewer model | `node --test tests/opencode/test-agent-permissions.mjs` |
| 14 | docs-only: add brain pitch-in escalation ladder to orchestrator | `node --test tests/opencode/test-agent-permissions.mjs` |## Task 4 RED->GREEN (bash write-target gate)

- Added `parseBashWriteTargets` + `checkImplementerBash` seam in `.opencode/plugins/sdlc-lean.js`.
- Extended `checkSpecGate` to parse bash redirect/tee/sed -i writes and validate scope.
- Fail-open on unparseable/observability missing; hooks remain unwired.
- Verify: `node --test tests/opencode/test-bash-gate.mjs tests/opencode/test-ux-hooks.mjs tests/opencode/test-plugin-loading.mjs` → exit 0.
- Non-sensitive only.

## Task 5 RED->GREEN (remove lead tier, harden orchestrator)

- Deleted `.opencode/agents/lead.md` (`rm`).
- Edited `.opencode/agents/orchestrator.md`: removed `"lead": allow` (kept
  `"*": deny` + worker allows), removed lead routing/subagent bullet, added
  Limitations (quality-max) — same-model ceiling, free-worker limits
  (file:line anchors + verbatim cmds + 3-5 steps + hashes) — when-to-slow-down
  (fan-out>3 → sequential batches; rework>1 → split + enrich + consider muse
  for reviewer; ambiguous → researcher/explorer fan-out first, never guess)
  and stop conditions (2 no-progress loops → strategy change; failure/
  uncertain → stop + reconcile + explicit approval; cap → block + ask, never
  auto-extend/spend; secrets never free).
- README/USAGE/copilot: 9→8 agents, lead row/mention removed.
- Verify: `ls .opencode/agents/*.md` = 8, no `lead.md`; grep confirms no lead
  refs in the allowed files. Full `npm run verify` NOT run (tests still pin
  lead; separate task — excluded by brief).
- Non-sensitive measurements only.

## Task 6 RED->GREEN (encode brain-muscle model split in orchestrator)

- Edited `.opencode/agents/orchestrator.md`: added "Model routing table (brain-muscle
  split)" section mapping BRAIN (muse-spark-1.3-contributor; cap + ask-to-extend;
  secrets never free) roles (orchestrator self, researcher synthesis, planner,
  brainstorming facilitation, code-reviewer, security-reviewer) and MUSCLE (free
  trio crouton/beam/iceman; thick briefs required) roles (explorer maps,
  implementer + test-writer execution). Rule: ambiguous/complex synthesis defaults
  BRAIN; well-scoped execution defaults MUSCLE with file:line anchors + verbatim
  cmds + 3-5 steps + hashes. Kept `*:deny`, Delegation Quality + Limitations intact.
  No hardcoded spend; cap ask-to-extend stated.
- Verify: `node --test tests/opencode/test-agent-permissions.mjs` → exit 0.
- Non-sensitive only.

## Task 7 RED->GREEN (docs-only: fix MUSCLE pool order, super-vl omitted in Task 6)

- Edited `.opencode/agents/orchestrator.md` MUSCLE only (BRAIN unchanged;
  `*:deny`, Delegation Quality, Limitations intact; no `model:` frontmatter pin
  added): 1) `console-openrouter/nvidia/nemotron-3.5-super-vl:free` on
  `console-openrouter` + `console-openrouter2` (round-robin, ledger-tracked,
  `429` → other account first, blind no polling), 2) on rate-limit both →
  `opencode-go` free trio (`crouton-alpha-free`/`beam-free`/
  `iceman-contributor-free`) with thick briefs, 3) all free exhausted →
  `muse-spark-1.3-contributor` fallback only with cap + ask-to-extend; secrets
  NEVER to any free endpoint; North break-glass outage-only.
- Table rows for explorer/implementer/test-writer updated to the same order.
- Verify: `node --test tests/opencode/test-agent-permissions.mjs` → exit 0.
- Non-sensitive only.

## Task 8 RED->GREEN (docs-only: remove muse fixation, BRAIN = orchestrator session model)

- Edited `.opencode/agents/orchestrator.md` model-routing docs only (no
  `model:` frontmatter pin; `*:deny`, Delegation Quality, Limitations kept):
  1) BRAIN = orchestrator session model (UNPINNED, inherits session —
  currently `muse-spark-1.3-contributor` in this session as an example,
  not frozen; whatever the orchestrator runs); 2) MUSCLE = free-first
  (`super-vl x2` → Go trio, thick briefs); 3) fallback = orchestrator's
  own model when free exhausted (cap + ask-to-extend, secrets never free).
  Kept contributor-only as current-session example, kept paid
  `gpt-oss-120b` rejection; table BRAIN rows + frozen-pool fallback +
  Limitations reviewer bullet unified to BRAIN (orchestrator's own model).
- Verify: `node --test tests/opencode/test-agent-permissions.mjs` → exit 0.
- Non-sensitive only.

## Task 9 RED->GREEN (docs-only: unpin MUSCLE free list, dynamic not frozen trio)

- Edited `.opencode/agents/orchestrator.md` model-routing docs only (no
  `model:` frontmatter pin; `*:deny`, Delegation Quality, Limitations kept):
  1) `super-vl:free` on both accounts (round-robin, ledger-tracked, `429` →
  other account first, blind no polling), 2) then `opencode-go` free models
  discovered as cost `0/0` via models API at dispatch time (denylist
  excluded: `poolside/laguna`, `inkling`, `liquid/lfm`, no-tools safety;
  thick briefs required; frozen trio `crouton/beam/iceman` kept as
  known-good fallback examples, NOT frozen requirement), 3) all free
  exhausted → orchestrator's own model (cap + ask-to-extend, secrets never
  free). Free list may change anytime — always re-discover, never hardcode
  dispatch to trio. Table MUSCLE rows + Free-model dispatch heading unified
  to dynamic discovery.
- Verify: `node --test tests/opencode/test-agent-permissions.mjs` → exit 0.
- Non-sensitive only.

## Task 10 RED->GREEN (global routing guardrail)

- Added `tests/opencode/test-model-routing.mjs` asserting role→tier contract from
  orchestrator.md Model routing table: BRAIN roles (orchestrator self, researcher
  synthesis, planner, brainstorming, code-reviewer, security-reviewer) dispatch
  on orchestrator session model (UNPINNED, never free pool); MUSCLE roles
  (explorer maps, implementer, test-writer execution) dispatch free-first
  (super-vl x2 → Go cost-0 → orchestrator fallback with cap). Fails on
  researcher/planner/reviewer on crouton/beam/iceman/super-vl-free and
  implementer on paid without cap record.
- Edited `.opencode/agents/orchestrator.md`: appended Pre-dispatch verify line
  to Delegation Quality checklist (check role→tier table before every dispatch;
  mismatch → stop + correct model, record ledger row (model+account)).
  Added "never free pool" to BRAIN tier note. No model pin in frontmatter.
- Verify: `node --test tests/opencode/test-model-routing.mjs` → exit 0.
- Non-sensitive only.

## Task 11 RED->GREEN (docs-only: autonomy routing frozen→dynamic)

- Edited `docs/AUTONOMY.md`, `docs/verify-recipe.md`,
  `.opencode/skills/autonomy-dial/SKILL.md`: replaced frozen 5-ID pool with
  dynamic rule (super-vl:free x2 round-robin → opencode-go cost-0/0
  re-discovered at dispatch, denylist excluded, trio = fallback examples →
  orchestrator session model fallback, cap + ask-to-extend, secrets never free).
  Kept 429/provider-error trigger, circuit CLOSED/OPEN/HALF-OPEN + cheap probe,
  admission settled+outstanding+next<=cap, per-dispatch ledger row, narrow
  delegation, cooldown_until JSONL shape. Noted resolver `eval/lib/free-models.mjs`.
- Verify: `node scripts/validate-skills.mjs` → exit 0; `wc -l` skill within cap.
- Non-sensitive only.

## Task 12 RED->GREEN (docs-only: bounded Ask-Back contract)
- Edited `.opencode/agents/orchestrator.md`: appended `### Ask-back (bounded, return-loop only)` to
  Delegation Quality checklist (workers STOP + return `requires_clarification` JSON instead of
  guessing; Orchestrator (parent) answers within 1 follow-up on same `sessionID` or enriched re-brief; answers
  count against cap; options if enumerable (else free text) + example shape; 2nd ask unclear → Stop conditions; secrets never in questions; needs-info rate tracked).
- Verify: `node --test tests/opencode/test-agent-permissions.mjs` → exit 0.
- Non-sensitive only.

## Task 13 RED->GREEN (docs-only: enforce critic gate + de-fixate reviewer model)
- Edited `.opencode/agents/orchestrator.md`: appended `### Critic gate (mandatory, no exception)` to
  Delegation Quality checklist (every implementer/test-writer output → code-reviewer + security-reviewer
  pass on the orchestrator's model BEFORE any completion claim or close, no minor/docs exception;
  reviewers = BRAIN tier = whatever model the orchestrator session runs, example only, never hardcoded;
  skipped gates are debt: record in ledger + retro-sweep before close). Perms intact (`edit: deny`, `*: deny`).
- Verify: `node --test tests/opencode/test-agent-permissions.mjs` → exit 0.
- Non-sensitive only.

## Task 14 RED->GREEN (docs-only: brain pitch-in escalation ladder)
- Edited `.opencode/agents/orchestrator.md`: appended `### Escalation ladder (hardship → brain pitches in)` under Stop conditions — free worker hardship (`requires_clarification`, rework>1, low confidence, 2 no-progress loops) → orchestrator re-dispatches SAME task on its own model (BRAIN, cap-counted, secrets never free) instead of downgrading quality; BRAIN attempt also stuck → stop + reconcile + explicit human approval; never silently accept degraded output to save cost. Perms intact (`edit: deny`, `*: deny`).
- Verify: `node --test tests/opencode/test-agent-permissions.mjs` → exit 0; `node --test tests/opencode/test-model-routing.mjs` → exit 0.
- Non-sensitive only.

## Evidence
`docs/plans/tiered-lead-flow-evidence.json` (file + exit only, non-sensitive).

## Residuals closed/queued

- (a) Copilot mirror = build artifact; source of truth is repo `.opencode/`. Verify: installer copies `.opencode` -> global, never reverse (manifest-pruned; user files untouched).
- (b) Windows `O_NOFOLLOW ?? 0` = Linux-only guard; where `O_NOFOLLOW` is unavailable, fail-closed to realpath containment. Documented only; no code change here.
- (c) Spec approval queue (DO NOT approve here; user signs). Draft specs:
  1. `docs/specs/2026-10-31-photoreal-capabilities.md` — plan `docs/plans/2026-10-31-photoreal-capabilities.md`
  2. `docs/specs/2026-10-31-popup-autofill.md` — plan `docs/plans/2026-10-31-popup-autofill.md`
  3. `docs/specs/2026-11-08-lean-ui-open-design.md` — plan file not present yet (create first)
  4. `docs/specs/2026-11-08-tiered-ceo-lead-workers.md` — plan file not present yet (create first)
  Approve command shape (TTY, human only): `node scripts/spec-check.mjs approve <plan.md>` (add `--root <dir>` if needed). Machine variant: `node scripts/spec-check.mjs approve <plan.md> --machine --envelope <file>`. Close an active gate first: `node scripts/spec-check.mjs close`.
