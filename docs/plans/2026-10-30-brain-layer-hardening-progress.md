# Progress — Brain-layer hardening

**Plan**: [2026-10-30-brain-layer-hardening.md](./2026-10-30-brain-layer-hardening.md)
**Spec**: [2026-10-30-brain-layer-hardening.md](../specs/2026-10-30-brain-layer-hardening.md)
**Started**: 2026-10-30

## Baseline (task 1)

Measured before any content edit, `wc -l` semantics.

| File | Baseline lines | Cap | Headroom |
|---|---:|---:|---:|
| `.opencode/skills/brainstorming/SKILL.md` | 39 | 60 | +21 |
| `.opencode/skills/writing-plans/SKILL.md` | 75 | 85 | +10 |
| `.opencode/skills/deep-research/SKILL.md` | 101 | 105 | +4 |
| `.opencode/skills/option-selection/SKILL.md` | 34 | 45 | +11 |
| `.opencode/agents/planner.md` | 18 | 22 | +4 |

Structural gate `tests/opencode/test-brain-skills.mjs` added at baseline: cap tests pass; 10 of 19 tests fail as expected (5 required-string, 3 reference, 1 forbidden, 1 installer parity) → RED.

## Task log

| # | Task | Status | Evidence |
|---|---|---|---|
| 1 | Structural gate (RED) + baseline | done | `test-brain-skills.mjs` 19 tests: 9 pass / 10 fail (expected RED); baseline 39/75/101/34/18 |
| 2 | Brainstorming artifact contract | done | 59 lines (cap 60); filtered tests 4/4; `references/design-review.md` created; 1 ref link |
| 3 | Writing plans task shape | done | 85 lines (cap 85); filtered tests 4/4; `references/plan-rubric.md` created; 1 ref link |
| 4 | Deep research loop + entailment | done | 104 lines (cap 105); filtered tests 4/4; `references/citation-check.md` created; plugin contracts pass |
| 5 | Option selection + planner | done | option 36 lines (cap 45), planner 22 (cap 22); filtered 4/4 + 2/2; fixed a line-wrap that broke `record the decision` |
| 6 | Artifact assertions | done | `test-assert.mjs` 10/10; `artifact-contains` + `artifact-matches`; missing/empty/invalid-regex covered |
| 7 | Brain probes + plumbing | done | `test-probes.mjs` 5/5; `node --check eval/run.mjs` ok; dry run lists 3 brain probes |
| 8 | Full verify | done | `npm run verify`: 232/232 pass, lint 40 skills / 0 failures; spec gate OK; bootstrap ≤5116 |
| 8b | Live brain smoke (approved) | done | First run 0/3: harness inherited `PWD`, so artifacts landed in repo root. Fixed `eval/run.mjs` (`env: { ...process.env, PWD: scratch }`) and made the research probe require a file. Re-run: **3/3 PASS**, cost $0.0221, no stray artifacts. |

**Transient**: task 4's plugin-test run saw `option-selection missing: record the decision` while task 5 was mid-edit; re-run after task 5 (and a one-line wrap fix) is 20/20.

**Outside scope**: `.opencode/agents/orchestrator.md` has a pre-existing uncommitted change (removed `steps: 60`) from before the gate; not touched by this plan.

**Live smoke evidence**: `eval/results/2026-10-30-brain-eval.{json,md}` (3/3); the failed first run is preserved at `/tmp/opencode/brain-eval-artifacts/2026-10-30-brain-eval-0of3.*`. The first run's design/plan artifacts (correct fields) are in `/tmp/opencode/brain-eval-artifacts/`.
