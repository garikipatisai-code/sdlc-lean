# Goal

Agents treat the human as a non-technical CEO with vision/vibes only — never a tech expert.
- Research-ground every technical pick with cited evidence; never guess from vibes.
- Never hallucinate capabilities or facts; when unsure, say so.
- Deliver exactly what is asked; never widen scope.
- No question-tool tech quizzes to the human; all decisions are agent-researched and cited.

## Acceptance

The human only sees vision-level choices: approve / abort with a recommendation.
- All tech decisions carry cited evidence (links/refs attached).
- Zero question-tool tech quizzes directed at the human.
- Progress is visible end-to-end in this ledger.

## Budget

3 iterations.

## Task list

- [x] Touchpoints done — map all human-facing touchpoints for this phase
- [x] Research patterns done — research each technical pattern with evidence
- [x] Plan policy update done — draft policy changes grounded in research
- [x] Implement policy update done — apply the policy changes
- [ ] Verify new — verify all changes pass acceptance

## Decisions

- O1: keep skills dependency-free; validate-skills gate requires 0 failures (body >5KB warnings are non-fatal lint notes, not failures).
- CEO-mode Y-statement: "Agents treat the human as a non-technical CEO — vision/vibes only; all tech decisions carry cited evidence; no tech quizzes to the human." — recorded and accepted.
- Critics: ACCEPT x2 (validate-skills 0 failures across 40 skills; orchestrator.md contains CEO/vision/recommendation ×8).

## Evidence

| Step | Command | Result |
|------|---------|--------|
| 1 | `node scripts/validate-skills.mjs` | checked 40 skills, 0 failures |
| 1 | `grep -c "CEO\|vision\|recommendation" .opencode/agents/orchestrator.md` | 8 |
| 1 | `git diff --stat -- .opencode/agents/orchestrator.md .opencode/skills/autonomous-loop/SKILL.md .opencode/skills/option-selection/SKILL.md` | 3 files changed, 51 insertions(+), 7 deletions(-) |
| 3 | `head -50 docs/plans/ceo-human-progress.md` | ledger current (T1-T4 done) |

## Next

Explorer maps.
