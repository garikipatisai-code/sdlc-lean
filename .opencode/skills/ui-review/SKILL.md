---
name: ui-review
description: Use when asked to review UI, check accessibility, audit design, review UX, or check site against best practices - terse file-line findings plus React performance rules
---

# UI Review

Adapter of `vercel-labs/agent-skills` (`web-design-guidelines` + `react-best-practices`, MIT). See `references/ATTRIBUTION.md`.

## Procedure

1. Fetch pinned guidelines per run: `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/e3d624baaf29dc1fc645aff3e38f03e564d2d6b1/command.md` via WebFetch (re-pin in `references/ATTRIBUTION.md` to update). If the fetch fails, stop: report and review nothing; fails closed (fail-closed). Never review from memory.
2. Read target files (arg `<file-or-pattern>` or ask).
3. Apply fetched rules + React perf rules (waterfalls, bundle, server/client fetching, re-renders, impact-ordered).
4. Output terse `file:line` findings only. Group: design / a11y / UX / perf.

## Gates

- **Token-first:** flag default Tailwind palette and unregistered hardcoded colors; require design tokens.
- **AA:** contrast 4.5:1/3:1, focus-visible, 24px targets, keyboard + landmarks (APG/Radix), semantic HTML, skip-links, live-regions, `prefers-reduced-motion`, 200% zoom.
- **Motion + slop:** no gratuitous motion; honor reduced-motion; flag custom controls, happy-path-only, broken primitive contract.
- **Manual Axe DevTools Extension run pointer:** free automated + guided testing, manual browser workflow – Deque axe powers it, 5B+ downloads.
- Manual keyboard + screen-reader check required (tools catch ~30-40%).
