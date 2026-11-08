---
spec: docs/specs/2026-11-08-deep-research-upgrade.md
status: approved
approved_by: user-chat-2026-11-08-blanket-6plans
approved_at: 2026-11-08T17:20:05.000Z
files:
  - .opencode/skills/deep-research/SKILL.md
  - .opencode/skills/deep-research/references/retrieval-quality.md
  - .opencode/skills/deep-research/references/citation-check.md
  - .opencode/skills/deep-research/references/source-quality.md
  - eval/lib/research-metrics.mjs
  - tests/eval/test-research-metrics.mjs
allow:
  - docs/plans/2026-11-08-deep-research-upgrade-progress.md
  - docs/plans/2026-11-08-deep-research-upgrade-evidence.json
---

# Plan — Deep Research Upgrade

**Goal**: Cap-safe deep-research upgrade: retrieval diversity/freshness/
canonical-URL rules in a reference, 5-verdict entailment rubric with
contradiction + uncertainty handling, and pure zero-dep research metrics
(retrieval/consistency/success/efficiency/multi-attempt).

**Note**: spec file not present yet — create
`docs/specs/2026-11-08-deep-research-upgrade.md` before approving
(see progress deviations).

| # | Task | Verify |
|---|------|--------|
| 1 | retrieval quality ref + SKILL pointer (105-line cap) | `node --test tests/opencode/test-brain-skills.mjs` |
| 2 | citation-check: 5 verdicts + contradiction/uncertainty | `node --test tests/opencode/test-brain-skills.mjs` |
| 3 | `eval/lib/research-metrics.mjs` + tests (pure/deterministic) | `node --test tests/eval/test-research-metrics.mjs` |
| 4 | verify-only (full + caps + scope) | `node --test tests/opencode/test-brain-skills.mjs` |
| 5 | 5 critic nits (prefix match, rate clamp, iterables) | `node --test tests/eval/test-research-metrics.mjs` |

**Status**: draft — not approved. Non-sensitive only.
Approval scope note – covers this plan only; future work needs fresh approval (no open-ended grant).
