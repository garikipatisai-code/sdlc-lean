---
name: ui-review
description: Use when asked to review UI, check accessibility, audit design, review UX, or check site against best practices - terse file-line findings plus React performance rules
---

# UI Review

Adapter of `vercel-labs/agent-skills` (`web-design-guidelines` + `react-best-practices`, MIT). See `references/ATTRIBUTION.md`.

## Procedure

1. Fetch pinned guidelines per run: `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/e3d624baaf29dc1fc645aff3e38f03e564d2d6b1/command.md` via WebFetch (re-pin in `references/ATTRIBUTION.md` to update). Never review from memory.
2. Read target files (arg `<file-or-pattern>` or ask which files).
3. Apply all fetched rules + React perf rules (waterfalls, bundle, server/client fetching, re-renders — 40+ rules, impact-ordered).
4. Output terse `file:line` findings only. No prose walls. Group: design / a11y / UX / perf.

## Quality floor

Semantic HTML first, visible focus, keyboard + focus-trap, 4.5:1 / 3:1 contrast, skip-links + live-regions, `prefers-reduced-motion`, 200% zoom. Tools catch ~30-40% — manual keyboard + screen-reader check still required.
