# Progress — autonomous orchestration + option selection

Plan: [`2026-10-04-autonomous-orchestration.md`](2026-10-04-autonomous-orchestration.md)
Spec: [`../spikes/2026-10-04-autonomous-orchestration.md`](../spikes/2026-10-04-autonomous-orchestration.md)

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 1 | option-selection skill | ✅ | 31 skills, lint clean |
| 2 | autonomous-loop skill | ✅ | 32 skills, lint clean |
| 3 | orchestrator agent + router | ✅ | bootstrap 5116→5050 B; `node --test` 0 fail |
| 4 | verify recipe + sibling links | ✅ | `npm run verify` 39/39 |
| 5 | compaction-state hook (TDD) | ✅ | 6/6 new tests; RED→GREEN |
| 6 | shipping assertions + eval probes | ✅ | 46/46; 11 probes in dry eval |
| 7 | docs sync | ✅ | README/USAGE/CHANGELOG/AGENTS updated; `npm run verify` green |

## Full-suite evidence (final)

- `node scripts/validate-skills.mjs` → `checked 32 skills, 0 failures`
- `node --test` → `49 pass / 0 fail` (46 prior + 3 compaction-guard tests)
- `npm run eval` (dry) → `probes: 11 (activation=2, safety=2, routing=7)`
- Bootstrap → `5050 B` (budget ≤5116; was 5116 — net shrink)
- Diff self-review → no strays, no secrets; 186 insertions across 15 files

## Deviations from plan (recorded, per code review)

- **`subagent_depth` dropped from the agent file** — verified against
  opencode.ai/docs/agents: it is a top-level `opencode.json` option (default 1),
  not an agent-frontmatter key. Default depth 1 covers orchestrator→workers.
- **`planner` added to the orchestrator allowlist** (plan listed 6 workers) —
  intentional: delegated planning for large goals; the loop itself plans via
  the `writing-plans` skill.
- **Compaction hook inlines content, not pointers** (≤1500 chars/file, symlink-
  guarded, project-directory aware) — pointers alone would give the compaction
  summary nothing to carry forward.
- **Harness bug found and fixed**: `parseArgs` defaulted `maxProbes: 10`,
  silently cutting probe 11 from the dry plan. Default is now unset — the dry
  plan lists every seed probe; `--max-probes` still caps.

## Review round (requesting-code-review)

`code-reviewer` findings and disposition:

| Finding | Sev | Action |
|---|---|---|
| `subagent_depth` in agent file is unsupported | minor | Deviation recorded; not a frontmatter key |
| Compaction injects 2×4000 chars | minor | **Fixed** — cap 1500/file |
| Symlink follows into secret files (traced path) | minor | **Fixed** — `lstat` reject symlink/non-file + test |
| Global install no-ops (root = ~/.config) | minor | **Fixed** — thread host `directory`/`ctx.directory` + test |
| `routing-research` probe overlaps option-selection triggers | minor | **Fixed** — probe reworded to a pure research prompt |
| Progress task 7 marked ⬜ | minor | **Fixed** |
| Quick-probes table lacks autonomy rows | nit | **Fixed** |
| autonomous-loop redefines ledger convention | nit | **Fixed** — references `managing-tasks`; mermaid now shows the budget branch |
| D-005 debt entry stale (5116/5120) | nit | **Fixed** — entry closed with measured 5050 B |
| Lexicographic sort implicit | nit | **Fixed** — comment added |
| verify-recipe hardcodes test counts | nit | **Fixed** — "as of 2026-10-04" |

Open question RESOLVED (2026-10-04, installed OpenCode v2.0.22): the runtime
bundle registers session hooks as `session.hook("context" | "compaction" |
"generate" | "title", cb)` — `"experimental.session.compacting"` is the V1
Hooks-object name and never fires in V2. The V2 registration was corrected to
`"compaction"` and now appends `{type:"text"}` parts to `event.system`, exactly
as the runtime's own built-in plugins do. Static verification: grep of
`~/.opencode/bin/opencode`; unit tests updated to the v2.0.22 contract.

## Live probe evidence (opt-in, 2026-10-04, OpenCode v2.0.22)

- `routing-autonomous` → 1/1 structural (skill `autonomous-loop` captured)
- `routing-option` → 1/1 structural (skill `option-selection` captured)
- `routing-best-way` → 1/1 structural (skill `option-selection` captured)
- Artifacts: `eval/results/2026-10-04-routing-{autonomous,option,best-way}-eval.{json,md}`
  (redacted, with per-run token usage; e.g. autonomous: in 31572 / out 405 /
  cache-read 9728).
