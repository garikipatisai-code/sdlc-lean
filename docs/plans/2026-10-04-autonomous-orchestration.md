# Plan — Autonomous Orchestration + Research-First Option Selection

**Goal**: Add SOTA autonomous-loop capability to sdlc-lean: an orchestrator
agent that takes a goal with acceptance criteria and loops (route → research →
pick best option → plan → execute → verify → self-correct) until criteria are
met or an honest budget stop; option-selection forces research-first
compare-then-commit decisions at every fork.

**Spec**: [`docs/spikes/2026-10-04-autonomous-orchestration.md`](../spikes/2026-10-04-autonomous-orchestration.md)

**Tech stack**: markdown skills/agents (no deps), zero-dep plugin (JS), node --test.
Verify: `npm run verify` (= `node scripts/validate-skills.mjs` + `node --test`).

```mermaid
flowchart LR
  A[option-selection skill] --> B[autonomous-loop skill]
  B --> C[orchestrator agent]
  C --> D[verify recipe + sibling links]
  D --> E[compaction hook]
  E --> F[shipping tests + eval probes]
  F --> G[docs sync]
```

**Global Constraints** (AGENTS.md): descriptions are `Use when…` triggers only;
bootstrap <5KB — router edits must be byte-neutral (current 5116 B, D-005);
plugin fails open, guards grow only by exact-known patterns (with tests);
human output follows communicating-concisely; skill count must match docs.

**Lean Constraints**: rung 4 (OpenCode native: agent frontmatter, `steps`,
`doom_loop`, `subagent_depth`, compaction hook) + rung 2 (reuse
deep-research/adr/dispatching-parallel-agents/verification-before-completion).
No new dependencies, no plugin control loop, no new abstractions.

**Review Focus**: byte budget on router edit; fail-open compaction hook;
option-selection not turning into a heavyweight decision framework; probe
expectations structural (not model-lottery).

## Tasks

| # | Task | Files | Test | Expected | Verify |
|---|------|-------|------|----------|--------|
| 1 | `option-selection` skill: trigger (`Use when` comparing/choosing/best-way), research-first protocol (effort scaled to impact, fan-out via researcher subagents), options matrix (≥2 options × criteria × tradeoffs), pick + Y-statement rationale, ADR handoff for architectural, citation of fetched sources | `.opencode/skills/option-selection/SKILL.md` | lint: valid name/desc | skill lints; no deps; ≤1024-char description | `node scripts/validate-skills.mjs` |
| 2 | `autonomous-loop` skill: goal+acceptance-criteria contract, loop protocol (route → research → decide → plan → execute w/ TDD → verify fresh evidence → self-correct via systematic-debugging → critic pass via code-review/security-review), budgets (default 3 iterations, per-goal override), stop rules (criteria met / 2 no-progress loops / budget out → give-up-honestly report with evidence + remaining work) | `.opencode/skills/autonomous-loop/SKILL.md` | lint: valid name/desc | skill lints; references existing skills by name | `node scripts/validate-skills.mjs` |
| 3 | `orchestrator` agent (mode primary; `permission.task` allowlist: researcher/explorer/implementer/test-writer/code-reviewer/security-reviewer; `steps` cap; `subagent_depth: 2`; `todowrite: true`; body = thin wrapper pointing at the two skills) + byte-neutral router mention in `using-sdlc-lean/SKILL.md` (reword an existing line to name orchestrator; bootstrap must stay ≤5116 B) | `.opencode/agents/orchestrator.md`, `.opencode/skills/using-sdlc-lean/SKILL.md` | existing bootstrap-budget tests | agent ships with required frontmatter; router names orchestrator; bytes ≤5116 | `node --test` |
| 4 | Verify-recipe memory: `verification-before-completion` gains a write-once-reuse `docs/verify-recipe.md` step (project verify commands recorded on first run, reused on later loops) + sibling links: `deep-research` → option-selection (comparisons end in a decision), `acquiring-capabilities` → option-selection (tier choices) | `.opencode/skills/verification-before-completion/SKILL.md`, `.opencode/skills/deep-research/SKILL.md`, `.opencode/skills/acquiring-capabilities/SKILL.md` | lint + existing suite green | recipe step present; links present; no bootstrap growth | `npm run verify` |
| 5 | Compaction-state hook (TDD, failing test first): `experimental.session.compacting` hook injects pointers to `docs/debt-ledger.md` + newest `docs/plans/*-progress.md` into compaction summaries; fail-open when files missing or hook absent | `.opencode/plugins/sdlc-lean.js`, `tests/opencode/test-compaction-hook.mjs` | new test: hook registered on V2 setup; injects file contents/pointers; missing files → no throw | long loops keep state across compaction | `node --test` |
| 6 | Shipping assertions + eval probes: extend `tests/opencode/test-plugin-loading.mjs` (both skills ship, `Use when` triggers, orchestrator agent file exists, verify-recipe text linked, bootstrap still ≤5116) + 3 probes in `eval/probes.mjs` (goal-driven request → autonomous-loop; comparison request → option-selection; "best way" → option-selection) | `tests/opencode/test-plugin-loading.mjs`, `eval/probes.mjs` | schema tests for probes + shipping tests; dry eval lists 11 probes | skills/agent wired and probeable | `node --test tests/eval/test-probes.mjs` + `npm run eval` |
| 7 | Docs sync: README/USAGE skill tables 30→32 + orchestrator agent row + loop usage example; CHANGELOG entry; AGENTS.md structure note if needed | `README.md`, `USAGE.md`, `CHANGELOG.md`, `AGENTS.md` | full suite green | counts match disk; verify passes | `npm run verify` |

## Notes / edge cases

- **Router byte budget (D-005)**: task 3 must end byte-neutral or negative.
  If a clean reword is impossible, skip the router edit and rely on skill
  description self-trigger + agent selection (record the choice).
- **Task 5**: hook must not throw when `.opencode` docs are absent (fresh
  projects) — fail-open is a hard rule; test both paths.
- **Task 6**: probes are structural (`skill`/`contains` kinds) — no model-lottery
  expectations; keep the existing advisory convention for anything behavioral.
- **Node 24 note** (prior deviation): `node --test tests/opencode/` (dir arg)
  fails; `npm run verify` already uses bare `node --test` — do not reintroduce
  dir args.
