# P3 Task1 Spike — orchestrator split inventory (ledger only)

## Scope
- Task1 spike: inventory pins, size, split safety. **No code edits.**
- Out of scope: index edit (Task2), extract (Task3), secrets. Secrets NEVER free.

## Source
- Spec: AGENTS.md (`.opencode/agents/orchestrator.md` frontmatter + body)
- Plan: docs/plans/p3-orch-split.md (approved A index — spike feeds it; not yet authored)
- Test: tests/opencode/test-brain-judge-guarantees.mjs
- Orchestrator: `.opencode/agents/orchestrator.md` (READ only, zero edits)

## Size
- orchestrator.md: **15015 bytes** (~14.9KB), **209 lines**

## Pins — doc.includes in test file → line refs in orchestrator.md

| # | test:line | pin (exact substring) | orchestrator.md line(s) |
|---|-----------|----------------------|------------------------|
| P1 | 49 | `### Critic gate (mandatory, no exception)` | 169 |
| P2 | 53 | `Every implementer/test-writer output → code-reviewer + security-reviewer pass on the orchestrator's model BEFORE any completion claim or close — no minor/docs exception.` | 170 |
| P3 | 57 | `Reviewers run NO commands – evidence comes from implementer/test-writer only.` | 171 |
| P4 | 61 | `Unwired seams are debt, not enforced: D-015 (\`checkReviewerBash\` read-only` | 172 |
| P5 | 62 | `test allowlist) and D-019 (\`checkImplementerBash\`); no wiring promise. Reviewers` | 172 |
| P6 | 63 | `are read-only: no bash, no fixes.` | 172 |
| P7 | 67 | `Reviewers = BRAIN tier = whatever model the orchestrator session runs (never hardcode a provider model).` | 173 |
| P8 | 71 | `Skipped gates are debt: record in ledger + retro-sweep before close.` | 174 |
| P9 | 102 | `### Stop conditions` | 192 |
| P10 | 106 | `- 2 no-progress loops → strategy change.` | 194 |
| P11 | 110 | `- Failure/uncertain outcome → stop + reconcile evidence; retry only under` | 195 |
| P12 | 111 | `explicit, narrowly scoped approval.` | 59 (rules), 196 (stop conditions — intended) |
| P13 | 115 | `- At cap → block + ask for an extension; never auto-extend and never auto-spend.` | 197 |
| P14 | 119 | `- Secrets never to any free endpoint.` | 198 |
| P15 | 123 | `### Escalation ladder (hardship → brain pitches in)` | 200 |
| P16 | 127 | `- Hardship trigger: free worker reports \`requires_clarification\`, rework>1, low confidence, or 2 no-progress loops.` | 202 |
| P17 | 131 | `- Response: orchestrator re-dispatches the SAME task on its own model (BRAIN, cap-counted, secrets never free) instead of downgrading quality.` | 203 |
| P18 | 135 | `- If the BRAIN attempt is also stuck: stop + reconcile evidence + explicit human approval.` | 204 |
| P19 | 139 | `- Never silently accept degraded output to save cost.` | 205 |
| P20 | 143 | `Rule: ambiguous/complex synthesis defaults BRAIN; well-scoped execution defaults` | 133 |
| P21 | 144 | `MUSCLE in the order above with file:line anchors + verbatim cmds + 3-5 steps +` | 134 |
| P22 | 145 | `hashes. At cap: block, ask for extension, escalate — never auto-extend and never` | 135 |
| P23 | 146 | `auto-spend. Secrets never to any free endpoint.` | 136 |
| P24 | 150 | `- Ambiguous scope → researcher/explorer fan-out first; never guess.` | 190 |
| P25 | 154 | `- Rework>1 → split the task, enrich the brief, and consider BRAIN` | 188 |
| P26 | 155 | `(orchestrator's own model) for the reviewer pass.` | 189 |
| P27 | 170 | `- Same-model ceiling: delegation does not add intelligence. Orchestrator and` | 178 |
| P28 | 171 | `workers run on the same underlying model family, so quality comes from brief` | 179 |
| P29 | 172 | `quality, scope discipline, and verification — never from an extra hop.` | 180 |
| P30 | 176 | `- Free-worker limits: thin context. Every dispatch needs file:line anchors,` | 181 |
| P31 | 177 | `verbatim commands, 3-5 steps max, expected exit codes, and prior hashes where` | 182 |
| P32 | 178 | `relevant. Direct-free dispatches only for trivial docs (≤5 steps, no secrets).` | 183 |

**Total: 32 doc.includes pins (~28 logical pins; multi-line pins P4-P6, P11-P12, P20-P23, P25-P26, P27-P29, P30-P32). All located. Pins are en-dash/arrow/em-dash/backtick/curly-apostrophe sensitive — must survive byte-for-byte.**

## Split verdict — A vs B

**A (SAFE — accept):** Keep orchestrator as a single consolidated doc (or concatenate parts into one `doc` before the test reads it) so every pinned substring survives contiguous and byte-for-byte. The test reads `.opencode/agents/orchestrator.md` as one string and asserts `doc.includes(pin)`; pins straddling section boundaries (D-015/D-019 on one line 172; direction rule lines 133-136; free-worker limits lines 181-183) must not be severed across file boundaries.

**B (UNSAFE — reject):** Split orchestrator.md into separate files with **no include/concat primitive**. Pins are severed across file boundaries; `doc.includes` returns false; `test-brain-judge-guarantees.mjs` fails. No include primitive exists to reassemble. **B is unsafe.**

## Structural guarantees beyond doc.includes (must also survive any split)
- Routing table: researcher = BRAIN, explorer = MUSCLE rows (test lines 159-167)
- Same-model ceiling statement (test lines 170-173)
- Free-worker limits statement (test lines 175-179)
- D-019 debt pin: `checkReviewerBash` unwired in plugin V1 + V2 hooks (test lines 181-191) — concerns `.opencode/plugins/sdlc-lean.js`, not orchestrator

## Files touched
- `docs/plans/p3-orch-split-progress.md` — WRITE (this ledger)
- `.opencode/agents/orchestrator.md` — READ only, **ZERO edits**

## P3 Task3 gate — extract rejected
- Decision: **extract STOP** — spike B unsafe (no include/concat primitive; pins severed; `doc.includes` false → `test-brain-judge-guarantees.mjs` fails). **Keep A** (single consolidated orchestrator.md). Revert N/A — no extract attempted, nothing to revert. No test edits ever. Docs note only (this ledger).
- Model: console-openrouter/nvidia/nemotron-3.5-super-vl:free, effort=high, thinking=on.

## Evidence
- `wc -c`: 15015
- All 32 pins located with line refs (table above)
- Verdict: A safe, B unsafe

## Task2 — TOC + anchors (done)
- File: `.opencode/agents/orchestrator.md` — adds only: `## Index` TOC inserted after frontmatter + `<a id="..."></a>` anchor above each of the 13 existing headings. No existing line deleted or reworded; all 32 pins intact (verified by passing test).
- Anchors (file:line): model-routing:80, model-routing-table:115, reasoning-effort-defaults:156, delegation-quality-checklist:166, brief-carries:172, free-model-dispatch:178, self-verify-before-return:182, ask-back:186, critic-gate:193, limitations:201, when-to-slow-down:211, stop-conditions:219, escalation-ladder:228. TOC at ~23-36.
- Checks: `node --test tests/opencode/test-brain-judge-guarantees.mjs` → tests 26, pass 26, fail 0, exit 0. `node scripts/validate-skills.mjs` → checked 40 skills, 0 failures, exit 0 (5KB WARNs are pre-existing skill bodies, untouched).
- git diff (orchestrator.md vs HEAD): my hunks are insertions only (TOC block + 13 `<a id>` lines). Working tree was already dirty vs HEAD on 7 other files (incl. D-015/D-019 line wrap) — not touched by this task.
- Files touched: `.opencode/agents/orchestrator.md` (this task), `docs/plans/p3-orch-split-progress.md` (this ledger).

## P3 Task4 — full suite + ledger close (done)

| task | verify | exit |
| guarantees | `node --test tests/opencode/test-brain-judge-guarantees.mjs` → tests 26, pass 26, fail 0 | 0 |
| lint | `node scripts/validate-skills.mjs` → checked 40 skills, 0 failures | 0 |
| full suite | `node --test` → tests 714, pass 714, fail 0 | 0 |

Exact checks met: guarantees 26 pass, lint 0, full 714 pass.
Evidence: outputs + exits captured above; files touched: progress.md only.
Ledger: model=console-openrouter/nvidia/nemotron-3.5-super-vl:free account=console-openrouter2 effort=high thinking=on.
