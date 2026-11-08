---
spec: docs/specs/2026-11-08-lean-ui-open-design.md
status: approved
approved_by: user-chat-2026-11-08-blanket-6plans
approved_at: 2026-11-08T17:20:05.000Z
files:
  - .opencode/skills/frontend-design/SKILL.md
  - .opencode/skills/frontend-design/references/design-tokens.md
  - .opencode/skills/ui-review/SKILL.md
  - .opencode/skills/web-game-development/SKILL.md
allow:
  - docs/plans/2026-11-08-lean-ui-open-design-progress.md
  - docs/plans/2026-11-08-lean-ui-open-design-evidence.json
---

# Plan — Lean UI Open Design (refs-only)

**Goal**: Deliver the lean UI upgrade (spec AC-1–AC-16): refs-only design
tokens (4-layer taxonomy, 200ms/140ms motion, token-first bans, dark-mode
override), token-first ui-review checks with fail-closed fetch, and the
web-game budget gate — all caps held, verify green.

**Spec**: [`docs/specs/2026-11-08-lean-ui-open-design.md`](../specs/2026-11-08-lean-ui-open-design.md)

| # | Task | Verify |
|---|------|--------|
| 1 | design-tokens ref (refs-only, Apache-2.0 attribution) | `node scripts/validate-skills.mjs` |
| 3 | ui-review token-first + motion checks (≤25 lines) | `node --test tests/opencode/test-skill-contracts.mjs` |
| 5 | full verify (lint + tests) | `npm run verify` |
| 6 | line-budget check (160/25/155) | `node -e 'const fs=require("fs");const c=p=>fs.readFileSync(p,"utf8").split("\n").length-1;const a=[[".opencode/skills/frontend-design/SKILL.md",160],[".opencode/skills/ui-review/SKILL.md",25],[".opencode/skills/web-game-development/SKILL.md",155]];process.exit(a.every(([p,n])=>c(p)<=n)?0:1)'` |

**Status**: draft — not approved. Non-sensitive only.
Approval scope note – covers this plan only; future work needs fresh approval (no open-ended grant).
